# Run the backend locally, use the hosted frontend

The frontend (this Lovable app) is hosted. The Python voice agent + analytics API run on **your** machine.

## 1. Start the backend

```bash
cd murf-livekit-starter/backend
uv sync
uv run python src/agent.py dev        # voice agent (terminal 1)
uv run python src/api_server.py       # analytics API on :8082 (terminal 2)
```

Check it: <http://localhost:8082/health>

## 2. Expose it over HTTPS

The hosted frontend is served over HTTPS, so browsers block plain `http://localhost` calls.
Put a tunnel in front of the analytics API:

```bash
# any one of these
cloudflared tunnel --url http://localhost:8082
ngrok http 8082
```

Copy the `https://....trycloudflare.com` (or ngrok) URL.

## 3. Point the frontend at it

Open the app with the URL as a query param — it is saved in `localStorage`, so you only do this once:

```
https://metricscalls.lovable.app/quest?backend=https://your-tunnel-url
```

To clear it, run `localStorage.removeItem("revora_backend_url")` in the browser console.

## Precedence

`?backend=` query param → `localStorage` → `VITE_BACKEND_URL` env var → built-in `/api/*` fallback
(which reads `backend/quest_state.json` from the repo).

## Local-only development

If you also run the frontend locally (`pnpm dev`), just create `.env`:

```
VITE_BACKEND_URL=http://localhost:8082
```

No tunnel needed in that case.
