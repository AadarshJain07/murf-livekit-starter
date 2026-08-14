# Run the backend locally with the frontend

The frontend and Python voice agent + analytics API can run seamlessly on your local development machine or via remote tunnels.

## 1. Start the backend

```bash
cd murf-livekit-starter/backend
python -m venv .venv
source .venv/bin/activate  # or .venv\Scripts\activate on Windows
pip install -e .
python src/agent.py dev        # voice agent (terminal 1)
python src/api_server.py       # analytics API on :8082 (terminal 2)
```

Health check: <http://localhost:8082/health>

## 2. Expose it over HTTPS (if using remote tunnel)

```bash
cloudflared tunnel --url http://localhost:8082
# or
ngrok http 8082
```

## 3. Local development

In the project root, configure `.env`:

```
VITE_BACKEND_URL=http://localhost:8082
```

Start the frontend:

```bash
npm run dev
```
