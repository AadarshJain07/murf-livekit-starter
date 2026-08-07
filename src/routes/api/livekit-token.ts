import { createFileRoute } from "@tanstack/react-router";
import { AccessToken } from "livekit-server-sdk";

/**
 * Mints a short-lived LiveKit access token so the browser can join a room
 * where the PrepPilot AI agent worker is dispatched.
 */
export const Route = createFileRoute("/api/livekit-token")({
  server: {
    handlers: {
      POST: async () => {
        const url = process.env["LIVEKIT_URL"];
        const apiKey = process.env["LIVEKIT_API_KEY"];
        const apiSecret = process.env["LIVEKIT_API_SECRET"];
        const agentName = process.env["AGENT_NAME"];

        if (!url || !apiKey || !apiSecret) {
          return Response.json(
            {
              error:
                "Voice backend is not configured yet. Add LIVEKIT_URL, LIVEKIT_API_KEY and LIVEKIT_API_SECRET.",
            },
            { status: 503 },
          );
        }

        const identity = `preppilot_user_${Math.floor(Math.random() * 100000)}`;
        const roomName = `preppilot_room_${Math.floor(Math.random() * 100000)}`;

        const at = new AccessToken(apiKey, apiSecret, {
          identity,
          name: "student",
          ttl: "15m",
        });
        at.addGrant({
          room: roomName,
          roomJoin: true,
          canPublish: true,
          canSubscribe: true,
          canPublishData: true,
        });
        if (agentName) {
          at.roomConfig = { agents: [{ agentName }] } as never;
        }

        return Response.json({
          serverUrl: url,
          roomName,
          participantName: identity,
          participantToken: await at.toJwt(),
        });
      },
    },
  },
} as any);
