# ClassMeet

Production-oriented classroom meeting stack built **in phases**. Implemented so far: **Phase 1** (auth, rooms, chat, presence), **mesh WebRTC** (multi-participant camera/mic), **Socket.io signaling** (offer / answer / ICE), **Google STUN**, **screen sharing**, **chat file attachments** (multer-backed with unguessable URLs), **profile editing + avatar upload**, and **client-side screen recording** (WebM download, optional mic mix). Later phases can add SFU/TURN and moderation.

## Prerequisites

- Node.js 18+
- MongoDB 6+ (local or Atlas)

## Quick start

### 1. MongoDB

Local example:

```bash
docker run --name meet-mongo -p 27017:27017 -d mongo:7
```

### 2. Backend

```bash
cd backend
copy .env.example .env   # Windows — use cp on macOS/Linux
npm install
npm run dev
```

Required variables are documented in `backend/.env.example`. For production, set a strong `JWT_SECRET` and restrict `CLIENT_ORIGIN`.

### 3. Frontend

```bash
cd frontend
copy .env.example .env
npm install
npm run dev
```

Set `VITE_API_URL` to your API origin (defaults to `http://localhost:5000`).

### 4. Try it

1. Open `http://localhost:5173`, register **teacher** and **student** accounts (two browsers or incognito).
2. As teacher: **Create meeting**, share the generated room ID.
3. As student: **Join with code** — confirm **video grid**, **chat**, **participant list**, and optional **Share screen**.

Use **HTTPS** or `localhost` for camera/screen capture; browsers block `getUserMedia` / `getDisplayMedia` on insecure non-localhost origins.

## Architecture notes

- **REST**: Registration/login (`/api/auth`), profile (`PUT /api/auth/me`, `POST/DELETE /api/auth/avatar`), meetings (`/api/meetings`), chat history (`/api/meetings/:roomId/messages`), chat uploads (`POST /api/meetings/:roomId/attachments`).
- **Sockets**: JWT on connect. Chat + presence: `join_room`, `leave_room`, `chat_message` (optional `attachment` payload matching the upload response); events `room_state`, `user_joined`, `user_left`, `chat_message`.
- **WebRTC signaling** (relay only): `webrtc_offer`, `webrtc_answer`, `webrtc_ice_candidate` — forwarded between sockets verified to share the same room (`backend/src/sockets/index.js`). SDP is opaque to the server (SFU-ready).
- **Clients**: Mesh topology (`useMeetingWebRtc`), default STUN in `frontend/src/webrtc/iceServers.js`; optional extra ICE JSON via `VITE_EXTRA_ICE_SERVERS`.
- **Room state**: In-memory registry capped by `MAX_PARTICIPANTS_PER_ROOM`; swap for SFU session mapping later without changing JWT/room checks.
- **Uploads**: Multer disk storage under `backend/uploads/{attachments,avatars}`, served read-only at `/uploads/*`. Filenames are `timestamp-nanoid.ext` (unguessable); attachments capped at 25 MB, avatars at 3 MB and image-only.
- **Recording**: Fully client-side via `MediaRecorder` + `getDisplayMedia` (see `frontend/src/hooks/useScreenRecorder.js`). Output is a WebM file the user downloads locally — nothing is uploaded.
- **Security**: Password hashing (`bcryptjs`), JWT bearer auth, Helmet + CORS, chat sanitized server-side (`sanitize-html`). Only attachment metadata whose `url` starts with `/uploads/attachments/` is accepted by the socket handler.

## Deployment

Frontend → **Netlify**, backend → **Render / Railway / Fly.io**, database → **MongoDB Atlas**. Step-by-step in [`DEPLOYMENT.md`](./DEPLOYMENT.md).

## Roadmap

| Phase | Scope                                         | Status        |
| ----- | --------------------------------------------- | ------------- |
| 1     | Auth, rooms, chat, presence                   | Implemented   |
| 2–4   | Signaling + mesh video + screen share         | Implemented   |
| 5     | Chat file uploads, profile + avatar, local screen recording | Implemented |
| 6+    | Cloud storage, moderation, UX polish, TURN/SFU | Planned      |
