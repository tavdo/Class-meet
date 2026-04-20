const Meeting = require('../models/Meeting');
const Message = require('../models/Message');
const { verifyToken } = require('../utils/token');
const { sanitizeChatText } = require('../utils/sanitizeChat');
const config = require('../config');
const { RoomRegistry } = require('./roomRegistry');

const registry = new RoomRegistry();

/**
 * Socket.IO:
 * - Auth + room membership (same JWT as REST).
 * - Chat + room presence (Phase 1).
 * - WebRTC signaling relay (mesh): offer / answer / ICE are forwarded only between sockets
 *   that share a room — server does not parse SDP (prepare for SFU swap later).
 */
function initSocket(io) {
  io.use((socket, next) => {
    try {
      const token = socket.handshake.auth?.token;
      if (!token || typeof token !== 'string') {
        return next(new Error('AUTH_REQUIRED'));
      }
      const payload = verifyToken(token);
      socket.user = {
        userId: payload.sub,
        email: payload.email,
        role: payload.role,
        displayName: payload.displayName,
      };
      return next();
    } catch {
      return next(new Error('AUTH_INVALID'));
    }
  });

  io.on('connection', (socket) => {
    /** @type {string | null} */
    let currentRoomId = null;

    socket.on('join_room', async (payload, cb) => {
      const respond = typeof cb === 'function' ? cb : () => {};
      try {
        const roomId =
          typeof payload?.roomId === 'string' ? payload.roomId.trim() : '';
        if (!roomId) {
          respond({ ok: false, error: 'ROOM_ID_REQUIRED' });
          return;
        }
        const meeting = await Meeting.findOne({ roomId }).select('_id roomId');
        if (!meeting) {
          respond({ ok: false, error: 'MEETING_NOT_FOUND' });
          return;
        }

        if (registry.participantCount(roomId) >= config.maxParticipantsPerRoom) {
          respond({ ok: false, error: 'ROOM_FULL' });
          return;
        }

        if (currentRoomId && currentRoomId !== roomId) {
          await leaveRoom(socket, currentRoomId);
        }

        currentRoomId = roomId;
        socket.join(roomChannel(roomId));

        registry.addParticipant(roomId, {
          socketId: socket.id,
          userId: socket.user.userId,
          displayName: socket.user.displayName,
          role: socket.user.role,
        });

        const participants = registry.listParticipants(roomId);

        socket.to(roomChannel(roomId)).emit('user_joined', {
          participant: participantPublic(
            registry.getRoomMap(roomId).get(socket.id)
          ),
        });

        io.to(roomChannel(roomId)).emit('room_state', { participants });

        respond({
          ok: true,
          roomId,
          participants,
        });
      } catch (e) {
        respond({ ok: false, error: 'JOIN_FAILED' });
      }
    });

    socket.on('leave_room', async (payload, cb) => {
      const respond = typeof cb === 'function' ? cb : () => {};
      const roomId =
        typeof payload?.roomId === 'string' ? payload.roomId.trim() : currentRoomId;
      if (!roomId) {
        respond({ ok: false });
        return;
      }
      await leaveRoom(socket, roomId);
      if (currentRoomId === roomId) currentRoomId = null;
      respond({ ok: true });
    });

    /**
     * WebRTC signaling (mesh): relay SDP + ICE to a single peer by socket id.
     * Client passes targetSocketId; server verifies both peers are in currentRoomId.
     */
    socket.on('webrtc_offer', (payload, cb) => {
      const respond = typeof cb === 'function' ? cb : () => {};
      if (!currentRoomId) {
        respond({ ok: false, error: 'NOT_IN_ROOM' });
        return;
      }
      const targetSocketId =
        typeof payload?.targetSocketId === 'string' ? payload.targetSocketId.trim() : '';
      const sdp = payload?.sdp;
      if (!targetSocketId || !sdp || typeof sdp !== 'object') {
        respond({ ok: false, error: 'INVALID_PAYLOAD' });
        return;
      }
      if (
        !registry.arePeersInRoom(currentRoomId, socket.id, targetSocketId)
      ) {
        respond({ ok: false, error: 'PEER_NOT_IN_ROOM' });
        return;
      }
      socket.to(targetSocketId).emit('webrtc_offer', {
        fromSocketId: socket.id,
        sdp,
      });
      respond({ ok: true });
    });

    socket.on('webrtc_answer', (payload, cb) => {
      const respond = typeof cb === 'function' ? cb : () => {};
      if (!currentRoomId) {
        respond({ ok: false, error: 'NOT_IN_ROOM' });
        return;
      }
      const targetSocketId =
        typeof payload?.targetSocketId === 'string' ? payload.targetSocketId.trim() : '';
      const sdp = payload?.sdp;
      if (!targetSocketId || !sdp || typeof sdp !== 'object') {
        respond({ ok: false, error: 'INVALID_PAYLOAD' });
        return;
      }
      if (
        !registry.arePeersInRoom(currentRoomId, socket.id, targetSocketId)
      ) {
        respond({ ok: false, error: 'PEER_NOT_IN_ROOM' });
        return;
      }
      socket.to(targetSocketId).emit('webrtc_answer', {
        fromSocketId: socket.id,
        sdp,
      });
      respond({ ok: true });
    });

    socket.on('webrtc_ice_candidate', (payload, cb) => {
      const respond = typeof cb === 'function' ? cb : () => {};
      if (!currentRoomId) {
        respond({ ok: false, error: 'NOT_IN_ROOM' });
        return;
      }
      const targetSocketId =
        typeof payload?.targetSocketId === 'string' ? payload.targetSocketId.trim() : '';
      const candidate = payload?.candidate;
      if (!targetSocketId || candidate === undefined || candidate === null) {
        respond({ ok: false, error: 'INVALID_PAYLOAD' });
        return;
      }
      if (
        !registry.arePeersInRoom(currentRoomId, socket.id, targetSocketId)
      ) {
        respond({ ok: false, error: 'PEER_NOT_IN_ROOM' });
        return;
      }
      socket.to(targetSocketId).emit('webrtc_ice_candidate', {
        fromSocketId: socket.id,
        candidate,
      });
      respond({ ok: true });
    });

    socket.on('chat_message', async (payload, cb) => {
      const respond = typeof cb === 'function' ? cb : () => {};
      if (!currentRoomId) {
        respond({ ok: false, error: 'NOT_IN_ROOM' });
        return;
      }
      const raw =
        typeof payload?.text === 'string' ? payload.text : '';
      const body = sanitizeChatText(raw);
      const attachment = normalizeAttachment(payload?.attachment);

      if (!body && !attachment) {
        respond({ ok: false, error: 'EMPTY_MESSAGE' });
        return;
      }

      try {
        const doc = await Message.create({
          roomId: currentRoomId,
          senderId: socket.user.userId,
          senderName: socket.user.displayName,
          senderRole: socket.user.role,
          body,
          attachment,
        });

        const message = {
          id: doc._id,
          roomId: currentRoomId,
          body: doc.body,
          senderId: socket.user.userId,
          senderName: socket.user.displayName,
          senderRole: socket.user.role,
          attachment: doc.attachment || null,
          createdAt: doc.createdAt,
        };

        io.to(roomChannel(currentRoomId)).emit('chat_message', { message });
        respond({ ok: true, message });
      } catch {
        respond({ ok: false, error: 'SEND_FAILED' });
      }
    });

    socket.on('disconnect', async () => {
      if (currentRoomId) {
        await leaveRoom(socket, currentRoomId);
      } else {
        registry.removeSocketEverywhere(socket.id);
      }
    });
  });
}

function roomChannel(roomId) {
  return `room:${roomId}`;
}

/**
 * Accept only safe, server-shaped attachment metadata. Clients must first
 * upload via `/api/meetings/:roomId/attachments` which returns this shape.
 */
function normalizeAttachment(raw) {
  if (!raw || typeof raw !== 'object') return null;
  const url = typeof raw.url === 'string' ? raw.url : '';
  const name = typeof raw.name === 'string' ? raw.name : '';
  const mime = typeof raw.mime === 'string' ? raw.mime : '';
  const size = Number(raw.size);
  if (!url.startsWith('/uploads/attachments/')) return null;
  if (!name || !mime || !Number.isFinite(size) || size <= 0) return null;
  return {
    url,
    name: name.slice(0, 255),
    mime: mime.slice(0, 120),
    size,
  };
}

function participantPublic(p) {
  if (!p) return null;
  return {
    userId: p.userId,
    displayName: p.displayName,
    role: p.role,
    socketId: p.socketId,
  };
}

async function leaveRoom(socket, roomId) {
  const existed = registry.removeBySocketId(roomId, socket.id);
  socket.leave(roomChannel(roomId));
  if (existed) {
    socket.to(roomChannel(roomId)).emit('user_left', {
      socketId: socket.id,
      userId: socket.user.userId,
    });
    const participants = registry.listParticipants(roomId);
    socket.nsp.to(roomChannel(roomId)).emit('room_state', { participants });
  }
}

module.exports = { initSocket };
