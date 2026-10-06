# Blind Guides

Blind Guides: the blind lead the blind in this cooperative card game, inspired by the card game Hanabi. You know your teammates' cards but not your own, so give clues to help your teammates play the right cards without stumbling.

<!-- ![Screenshot of a game in progress](docs/screenshot.png) -->
<!-- TODO: add a screenshot of a game in progress -->

## Features

- Highly customizable suit rules and presets
- 2-10 players
- Invite-code joining with an optional host password (no accounts)
- Full-state turn-history replay
- Casual undo
- Export/import of paused games
- Docker deployment

## Tech stack

- TypeScript monorepo (npm workspaces)
- React + Vite client
- Hono REST + WebSocket server
- A pure, deterministic game engine
- Vitest tests

## Packages

- `@blind-guides/shared` — Types, rule schemas, and default configurations
- `@blind-guides/game-engine` — Pure, deterministic game logic

## Requirements

- Node.js 20+ (includes npm)

## Development

```bash
npm install
npm run build
npm test
```

Copy `.env.example` to `.env` and adjust as needed. For local dev you can leave `HOST_PASSWORD` empty so anyone can create games on your machine.

Run locally (server + web):

```bash
npm run dev
```

Then open http://localhost:5173 in two browser tabs to play:

1. Tab 1: **Create game** — copy the invite code
2. Tab 2: **Join** with that code and a different name
3. Tab 1: **Start game** when both players are in the lobby

Sessions are stored in `sessionStorage`, so refreshing a tab reconnects you.

## Host password (who can create games)

Set `HOST_PASSWORD` on the server to restrict **game creation** to people who know the password. **Joining** with an invite code works exactly as before — friends never need the password.

| `HOST_PASSWORD` | Create game | Join with invite |
|-----------------|-------------|------------------|
| unset (dev)     | anyone      | anyone           |
| set (production)| password    | anyone           |

The home screen shows a password field only when the server requires it.

## Production deployment

The production server serves the built React app and the API/WebSocket on one port (default `3001`), so you deploy a single process.

### Build and run locally (production mode)

```bash
npm install
npm run build
HOST_PASSWORD=your-secret-password NODE_ENV=production npm start
```

Open http://localhost:3001

### Docker

```bash
# Create .env with HOST_PASSWORD=your-secret-password
docker compose up --build -d
```

The app listens on port 3001. Game data is stored in a Docker volume (`blind-guides-data`).

### Hosted platforms (Render, Railway, Fly.io, etc.)

1. Connect your GitHub repository.
2. **Build command:** `npm install && npm run build`
3. **Start command:** `npm start` (runs from `apps/server`)
4. **Environment variables:**
   - `NODE_ENV=production`
   - `HOST_PASSWORD` — your private host password
   - `PORT` — usually provided by the platform
5. **Persistent disk:** mount a volume at `apps/server/data` (or the server working directory) so saved games survive restarts.

Because the web UI and API share the same origin in production, you typically do not need `CORS_ORIGINS`.

### Health check

`GET /api/health` returns `{ "ok": true }`.

## Play online with friends (dev tunnel)

For development, you can run the Vite dev server and tunnel separately:

### 1. Start the app

In one terminal:

```bash
npm run dev
```

Wait until both the server (port 3001) and web app (port 5173) are running.

### 2. Start a tunnel

In a **second** terminal, from the project root:

```bash
npm run tunnel
```

This runs [Cloudflare Quick Tunnel](https://developers.cloudflare.com/cloudflare-one/connections/connect-networks/do-more-with-tunnels/trycloudflare/) via `cloudflared`.

Look for the boxed line near the top of the output:

```text
Your quick Tunnel has been created! Visit it at:
https://something-random.trycloudflare.com
```

**Do not** open `api.cloudflare.com` — that line is only a connectivity health check, not your game URL.

Alternatively, with [ngrok](https://ngrok.com/):

```bash
ngrok http 5173
```

Use the `https://your-subdomain.ngrok-free.app` URL ngrok prints.

**Important:** tunnel **port 5173** (the Vite dev server). It proxies `/api` and `/ws` to the game server automatically.

### 3. Host a game

1. Open the tunnel URL in your browser (not `localhost`).
2. Create a game and enter your name.
3. In the lobby, click **Copy invite link** and send it to friends (Discord, text, etc.).
4. When everyone has joined, click **Start game**.

Friends open the invite link, enter their name, and click **Join game**. The link pre-fills the invite code.

### Tunnel notes

- Keep both terminals running (`npm run dev` and the tunnel) for the whole session.
- Tunnel URLs change each time you restart the tunnel (unless you configure a named Cloudflare tunnel).
- In dev, the server accepts CORS from common tunnel hostnames (`trycloudflare.com`, `ngrok`, etc.).
- To allow extra origins: `CORS_ORIGINS=https://your-url.example` (comma-separated).
- To disable tunnel CORS in dev: `CORS_ALLOW_TUNNELS=false`.

## Project layout

```
packages/
  shared/       # Types, defaults, rule hashing, wire protocol
  game-engine/  # Pure game logic (no I/O)
apps/
  server/       # Hono REST + WebSocket game server
  web/          # Vite + React client
```

## License

MIT — see [LICENSE](LICENSE).
