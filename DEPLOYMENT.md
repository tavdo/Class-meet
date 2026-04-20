# Deploying ClassMeet

ClassMeet has two moving pieces that need separate hosts:

| Layer | Hosting target | Why |
| --- | --- | --- |
| **Frontend** (`frontend/`) | **Netlify** (static CDN) | Pure Vite/React build, no runtime. |
| **Backend** (`backend/`) | **Render / Railway / Fly.io / DigitalOcean App Platform** | Needs Node, WebSockets (Socket.IO), and writable disk for uploads. |
| **Database** | **MongoDB Atlas** (free M0 works) | Any MongoDB 6+. |
| **Uploaded files** | Backend host's persistent disk (recommended) or S3/R2/Cloudinary | Serverless filesystems are ephemeral. |

> Netlify alone cannot run Socket.IO signaling or keep a MongoDB connection
> alive, so deploying only to Netlify will break rooms, chat, and uploads.

---

## 1. Database — MongoDB Atlas

1. Create a free cluster at <https://cloud.mongodb.com>.
2. **Network access → Add IP → 0.0.0.0/0** (or your backend host's IP range).
3. **Database access → Add user**, copy the connection string:
   `mongodb+srv://<user>:<pass>@<cluster>.mongodb.net/meet?retryWrites=true&w=majority`.
4. Keep it — you'll paste it as `MONGODB_URI` on the backend host.

---

## 2. Backend — Render example (Railway/Fly.io are similar)

1. Push this repo to GitHub.
2. <https://dashboard.render.com> → **New → Web Service** → connect the repo.
3. Settings:
   - **Root Directory**: `backend`
   - **Build Command**: `npm install`
   - **Start Command**: `npm start`
   - **Environment**: `Node`
4. **Environment variables** (Render UI → Environment):

   ```
   NODE_ENV=production
   PORT=5000
   MONGODB_URI=<your Atlas URI>
   JWT_SECRET=<long random string, ≥ 32 chars>
   JWT_EXPIRES_IN=7d
   CLIENT_ORIGIN=https://<your-netlify-subdomain>.netlify.app
   APP_URL=https://<your-netlify-subdomain>.netlify.app
   MAX_PARTICIPANTS_PER_ROOM=50
   PASSWORD_RESET_TTL_MINUTES=30
   # Optional SMTP — if unset, reset links only appear in server logs.
   SMTP_HOST=
   SMTP_PORT=587
   SMTP_SECURE=false
   SMTP_USER=
   SMTP_PASS=
   MAIL_FROM=ClassMeet <no-reply@yourdomain.com>
   ```

5. **Disks** (Render → Disks → Create disk): mount a small disk (1 GB) at
   `/opt/render/project/src/backend/uploads` so avatars and chat attachments
   survive redeploys. Skip this and your uploads will disappear on every deploy.
6. Deploy. Note the HTTPS URL Render assigns, e.g.
   `https://classmeet-api.onrender.com`.
7. Smoke test: open `https://classmeet-api.onrender.com/health` — should return
   `{"ok":true}`.

### Alternatives

- **Railway**: `railway init` in `backend/`, add a volume mounted at
  `/app/uploads`, set the same env vars.
- **Fly.io**: `fly launch` in `backend/`, create a volume with
  `fly volumes create uploads --size 1`, mount it at `/app/uploads` in
  `fly.toml`.
- **DigitalOcean App Platform**: add a "Web Service" component with build
  command `npm install` and run command `npm start`, attach a 1 GB volume.

If you would rather not run a persistent disk, swap the multer disk storage in
`backend/src/middlewares/upload.js` for an S3 / Cloudflare R2 / Cloudinary
driver — the rest of the server doesn't care where the files physically live.

---

## 3. Frontend — Netlify

### One-time config in the repo

- `frontend/netlify.toml` tells Netlify to build from `frontend/`, publish
  `dist/`, use Node 20, and fall back to `index.html` for client-side routes.
- `frontend/public/_redirects` duplicates the SPA fallback for direct
  `netlify deploy` uploads of the `dist` folder.

### Deploy via the Netlify dashboard (recommended)

1. <https://app.netlify.com> → **Add new site → Import from Git** → pick the
   repo.
2. Netlify reads `frontend/netlify.toml`; confirm:
   - **Base directory**: `frontend`
   - **Build command**: `npm run build`
   - **Publish directory**: `frontend/dist`
3. **Site settings → Environment variables**:

   ```
   VITE_API_URL=https://classmeet-api.onrender.com
   ```

   Use the backend URL you got in step 2. No trailing slash.

4. **Deploy site**. First deploy takes ~1–2 minutes.
5. After it's live, go back to your backend host and update `CLIENT_ORIGIN`
   and `APP_URL` to the new Netlify URL (e.g.
   `https://classmeet.netlify.app`), then redeploy / restart the backend so
   CORS and the password-reset emails line up.

### Deploy via CLI (optional)

```bash
cd frontend
npm install
npm install -g netlify-cli
netlify login
netlify init         # first time only — links this folder to a site
netlify deploy --build --prod
```

The CLI uses the same `netlify.toml`, so `VITE_API_URL` must already be set in
the Netlify environment (or export it in your shell before running
`netlify deploy --build`).

---

## 4. Post-deploy checklist

- [ ] `https://<netlify-url>/` renders the home page.
- [ ] Registering, logging in, and logging out works against the backend.
- [ ] Opening the browser devtools Network tab shows API calls going to
      `https://<backend-url>/api/...` (no CORS errors).
- [ ] Creating a meeting and joining it from a second browser shows video +
      chat + presence.
- [ ] Uploading a chat attachment survives a backend restart (proves the
      persistent disk is mounted).
- [ ] `POST /api/auth/forgot-password` delivers a working link — with SMTP
      configured, it lands in the inbox; without SMTP, the link only appears
      in the backend logs (production won't return `devResetUrl`).

## 5. Notes on HTTPS + WebRTC

Browsers only expose `getUserMedia` and `getDisplayMedia` on **HTTPS** or
**localhost**. Netlify and Render/Railway/Fly all serve HTTPS by default, so
camera, mic, screen-share, and screen-recording work out of the box in
production. The only place this bites is self-hosting on a plain HTTP VM —
put a reverse proxy (Caddy, nginx + Let's Encrypt, Cloudflare) in front.

## 6. Scaling beyond a single backend instance

The current room registry lives in-memory (`backend/src/sockets/roomRegistry.js`),
so horizontal scaling needs a Redis-backed Socket.IO adapter and a shared
cache. Until you add that, keep the backend pinned to a single instance
(most free tiers do this automatically).
