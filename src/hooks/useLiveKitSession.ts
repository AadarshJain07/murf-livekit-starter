import { useCallback, useEffect, useRef, useState } from "react";

type Status = "idle" | "connecting" | "connected" | "error";

export type Turn = { id: string; role: "user" | "agent"; text: string };

/**
 * Live voice session against the PrepPilot AI LiveKit agent.
 * Mints a token from /api/livekit-token, joins the room, publishes the mic,
 * plays the agent's audio and surfaces live transcriptions.
 */
export function useLiveKitSession() {
  const [status, setStatus] = useState<Status>("idle");
  const [error, setError] = useState<string | null>(null);
  const [level, setLevel] = useState(0);
  const [agentSpeaking, setAgentSpeaking] = useState(false);
  const [turns, setTurns] = useState<Turn[]>([]);
  const [micEnabled, setMicEnabled] = useState(true);

  const roomRef = useRef<import("livekit-client").Room | null>(null);
  const rafRef = useRef<number | null>(null);
  const audioCtxRef = useRef<AudioContext | null>(null);

  const disconnect = useCallback(async () => {
    if (rafRef.current) cancelAnimationFrame(rafRef.current);
    rafRef.current = null;
    await audioCtxRef.current?.close().catch(() => {});
    audioCtxRef.current = null;
    await roomRef.current?.disconnect();
    roomRef.current = null;
    setLevel(0);
    setAgentSpeaking(false);
    setMicEnabled(true);
    setStatus("idle");
  }, []);

  const connect = useCallback(async () => {
    if (status === "connecting" || status === "connected") return;
    setError(null);
    setStatus("connecting");
    try {
      const res = await fetch("/api/livekit-token", { method: "POST" });
      const data = (await res.json()) as {
        serverUrl?: string;
        participantToken?: string;
        error?: string;
      };
      if (!res.ok || !data.serverUrl || !data.participantToken) {
        throw new Error(data.error ?? "Could not start the voice session.");
      }

      const { Room, RoomEvent, Track } = await import("livekit-client");
      const room = new Room({ adaptiveStream: true, dynacast: true });
      roomRef.current = room;

      room.on(RoomEvent.TrackSubscribed, (track) => {
        if (track.kind === Track.Kind.Audio) {
          const el = track.attach();
          el.autoplay = true;
          document.body.appendChild(el);
        }
      });
      room.on(RoomEvent.ActiveSpeakersChanged, (speakers) => {
        setAgentSpeaking(speakers.some((s) => s.identity !== room.localParticipant.identity));
      });
      room.on(RoomEvent.TranscriptionReceived, (segments, participant) => {
        const role: Turn["role"] =
          participant && participant.identity !== room.localParticipant.identity
            ? "agent"
            : "user";
        setTurns((prev) => {
          const next = [...prev];
          for (const seg of segments) {
            const idx = next.findIndex((t) => t.id === seg.id);
            const turn: Turn = { id: seg.id, role, text: seg.text };
            if (idx >= 0) next[idx] = turn;
            else next.push(turn);
          }
          return next.slice(-30);
        });
      });
      room.on(RoomEvent.Disconnected, () => {
        setStatus("idle");
        setLevel(0);
      });

      await room.connect(data.serverUrl, data.participantToken);
      await room.localParticipant.setMicrophoneEnabled(true);
      setStatus("connected");

      // Mic level for the orb.
      const micTrack = room.localParticipant.getTrackPublication(
        Track.Source.Microphone,
      )?.track?.mediaStreamTrack;
      if (micTrack) {
        const ctx = new AudioContext();
        audioCtxRef.current = ctx;
        const analyser = ctx.createAnalyser();
        analyser.fftSize = 512;
        ctx.createMediaStreamSource(new MediaStream([micTrack])).connect(analyser);
        const buf = new Uint8Array(analyser.frequencyBinCount);
        const tick = () => {
          analyser.getByteTimeDomainData(buf);
          let sum = 0;
          for (let i = 0; i < buf.length; i++) {
            const v = (buf[i]! - 128) / 128;
            sum += v * v;
          }
          const rms = Math.sqrt(sum / buf.length);
          setLevel((p) => p * 0.75 + Math.min(1, rms * 4) * 0.25);
          rafRef.current = requestAnimationFrame(tick);
        };
        rafRef.current = requestAnimationFrame(tick);
      }
    } catch (e) {
      setStatus("error");
      setError(e instanceof Error ? e.message : "Could not start the voice session.");
      await disconnect();
    }
  }, [status, disconnect]);

  /** Send a typed message (suggested prompt cards) to the agent. */
  const sendText = useCallback(async (text: string) => {
    const room = roomRef.current;
    if (!room) return false;
    await room.localParticipant.sendText(text, { topic: "lk.chat" });
    setTurns((prev) => [...prev, { id: `local-${Date.now()}`, role: "user", text }]);
    return true;
  }, []);

  /** Mute / unmute the local mic without leaving the room. */
  const toggleMic = useCallback(async () => {
    const room = roomRef.current;
    if (!room) return;
    const next = !room.localParticipant.isMicrophoneEnabled;
    await room.localParticipant.setMicrophoneEnabled(next);
    setMicEnabled(next);
  }, []);

  const toggle = useCallback(() => {
    if (status === "connected" || status === "connecting") void disconnect();
    else void connect();
  }, [status, connect, disconnect]);

  useEffect(() => {
    return () => {
      void disconnect();
    };
  }, [disconnect]);

  return {
    status,
    error,
    level,
    agentSpeaking,
    turns,
    connect,
    disconnect,
    toggle,
    sendText,
    micEnabled,
    toggleMic,
    active: status === "connected",
  };
}
