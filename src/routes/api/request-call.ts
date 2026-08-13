import { createFileRoute } from "@tanstack/react-router";
import fs from "node:fs";
import path from "node:path";

function generateRefId(): string {
  const chars = "ABCDEFGHJKLMNPQRSTUVWXYZ23456789";
  let id = "REV-";
  for (let i = 0; i < 5; i++) {
    id += chars.charAt(Math.floor(Math.random() * chars.length));
  }
  return id;
}

function getJsonFilePath(): string {
  const candidatePaths = [
    path.resolve(process.cwd(), "murf-livekit-starter", "backend", "escalations.json"),
    path.resolve(process.cwd(), "backend", "escalations.json"),
    path.resolve(process.cwd(), "src", "backend", "escalations.json"),
  ];

  for (const p of candidatePaths) {
    if (fs.existsSync(p)) return p;
  }
  return candidatePaths[0]!;
}

function getUrgencyLabel(urgency: string): string {
  if (urgency === "high") return "🔴 IMMEDIATE";
  if (urgency === "medium") return "🟡 WITHIN 1 HR";
  return "🟢 TODAY";
}

function getEmbedColor(urgency: string): number {
  if (urgency === "high") return 0xEF4444;   // Red
  if (urgency === "medium") return 0xF59E0B; // Amber
  return 0x10B981;                            // Emerald
}

async function sendDiscordNotification(record: any) {
  const webhookUrl = process.env["DISCORD_TEACHER_WEBHOOK_URL"];
  if (!webhookUrl) return;

  const now = new Date();
  const unixTime = Math.floor(now.getTime() / 1000);
  const sipAddress = record.phone_number || "";
  const isLinphone = sipAddress.toLowerCase().includes("sip:") || sipAddress.toLowerCase().includes("linphone");
  const color = getEmbedColor(record.urgency || "high");

  const payload = {
    username: "Revora Teacher Dispatch",
    avatar_url: "https://www.linphone.org/favicon.ico",
    content: record.urgency === "high" ? "@here 🚨 Urgent student call request!" : undefined,
    embeds: [
      {
        title: `📲 LINPHONE CALL REQUEST — ${getUrgencyLabel(record.urgency || "high")}`,
        description:
          "**A student has requested a direct teacher call via Linphone.**\n" +
          "Please open Linphone and call the SIP address below as soon as possible.",
        color,
        fields: [
          {
            name: "🆔 Reference ID",
            value: `\`${record.reference_id}\``,
            inline: true,
          },
          {
            name: "👤 Student Name",
            value: `**${record.student || "Student"}**`,
            inline: true,
          },
          {
            name: "⚡ Urgency",
            value: getUrgencyLabel(record.urgency || "high"),
            inline: true,
          },
          {
            name: "📡 Linphone SIP Address",
            value: sipAddress
              ? `\`\`\`${sipAddress}\`\`\``
              : "_Not provided_",
            inline: false,
          },
          {
            name: "📋 How to Call",
            value:
              "1. Open **Linphone** on your device\n" +
              `2. Dial: \`${sipAddress || "SIP address above"}\`\n` +
              "3. Or paste into Linphone's dial pad",
            inline: false,
          },
          {
            name: "🌐 Language Preference",
            value: record.language_preference || "Hinglish",
            inline: true,
          },
          {
            name: "⏰ Requested At",
            value: `<t:${unixTime}:F> (<t:${unixTime}:R>)`,
            inline: true,
          },
          {
            name: "📚 Topic / Subject",
            value: `\`\`\`${record.topic || "General Study Doubt"}\`\`\``,
            inline: false,
          },
          {
            name: "❓ Student's Doubt / Note",
            value: record.reason || "Student requested a Linphone call from a teacher.",
            inline: false,
          },
        ],
        footer: {
          text: "Revora AI • Linphone Teacher Callback System",
        },
        timestamp: now.toISOString(),
      },
    ],
  };

  try {
    await fetch(webhookUrl, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(payload),
    });
  } catch (error) {
    console.error("Failed to post Linphone call request to Discord:", error);
  }
}

export const Route = createFileRoute("/api/request-call")({
  server: {
    handlers: {
      POST: async ({ request }: { request: Request }) => {
        try {
          const body = await request.json();
          const {
            student = "Student",
            phone_number = "",
            reason = "Requested a Linphone call from a teacher",
            topic = "General Doubt",
            urgency = "high",
            language_preference = "Hinglish",
            follow_up_method = "linphone call",
          } = body;

          const record = {
            reference_id: generateRefId(),
            student: (student || "Student").slice(0, 100),
            reason: (reason || "Requested Linphone teacher call").slice(0, 400),
            topic: (topic || "General").slice(0, 160),
            tried: "Submitted via Revora Web UI — Linphone Call Request",
            urgency: urgency || "high",
            language_preference: language_preference || "Hinglish",
            follow_up_method: (follow_up_method || "linphone call").slice(0, 80),
            phone_number: (phone_number || "").slice(0, 80), // SIP address stored here
            status: "open",
            created_at: new Date().toISOString(),
          };

          // Save to JSON file
          const filePath = getJsonFilePath();
          let existingData: { generated_at?: string; escalations: any[] } = { escalations: [] };

          if (fs.existsSync(filePath)) {
            try {
              const raw = fs.readFileSync(filePath, "utf-8");
              if (raw.trim()) {
                existingData = JSON.parse(raw);
                if (!Array.isArray(existingData.escalations)) {
                  existingData.escalations = [];
                }
              }
            } catch (e) {
              console.error("Error reading JSON file for append:", e);
            }
          }

          existingData.escalations.unshift(record);
          existingData.generated_at = new Date().toISOString();

          // Ensure directory exists
          const dir = path.dirname(filePath);
          if (!fs.existsSync(dir)) {
            fs.mkdirSync(dir, { recursive: true });
          }

          fs.writeFileSync(filePath, JSON.stringify(existingData, null, 2), "utf-8");

          // Post alert to Discord
          await sendDiscordNotification(record);

          return Response.json({
            success: true,
            reference_id: record.reference_id,
            record,
          });
        } catch (error: any) {
          console.error("Failed to handle request-call API:", error);
          return Response.json(
            { error: "Internal server error processing call request." },
            { status: 500 }
          );
        }
      },
    },
  },
} as any);
