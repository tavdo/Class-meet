/**
 * In-memory registry of who is connected per meeting room.
 * Phase 1 uses this for participant lists and limits; later phases can add SFU/session mapping here.
 */

class RoomRegistry {
  constructor() {
    /** @type {Map<string, Map<string, { userId: string, displayName: string, role: string, socketId: string }>>} */
    this.rooms = new Map();
  }

  /**
   * @param {string} roomId
   */
  getRoomMap(roomId) {
    if (!this.rooms.has(roomId)) {
      this.rooms.set(roomId, new Map());
    }
    return this.rooms.get(roomId);
  }

  participantCount(roomId) {
    return this.getRoomMap(roomId).size;
  }

  listParticipants(roomId) {
    const map = this.getRoomMap(roomId);
    return Array.from(map.values()).map((p) => ({
      userId: p.userId,
      displayName: p.displayName,
      role: p.role,
      socketId: p.socketId,
    }));
  }

  addParticipant(roomId, participant) {
    const map = this.getRoomMap(roomId);
    map.set(participant.socketId, participant);
  }

  removeBySocketId(roomId, socketId) {
    const map = this.getRoomMap(roomId);
    const existed = map.delete(socketId);
    if (map.size === 0) {
      this.rooms.delete(roomId);
    }
    return existed;
  }

  removeSocketEverywhere(socketId) {
    for (const [roomId, map] of this.rooms.entries()) {
      if (map.delete(socketId) && map.size === 0) {
        this.rooms.delete(roomId);
      }
    }
  }

  /** Returns true if both sockets are active participants in the same room. */
  arePeersInRoom(roomId, aSocketId, bSocketId) {
    const map = this.rooms.get(roomId);
    if (!map) return false;
    return map.has(aSocketId) && map.has(bSocketId);
  }
}

module.exports = { RoomRegistry };
