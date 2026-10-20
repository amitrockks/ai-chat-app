import { GoogleGenAI } from "@google/genai";
import { z } from "zod";
import { auth } from "@/auth";
import { prisma } from "@/lib/prisma";
import { rateLimit } from "@/lib/rate-limit";

export const runtime = "nodejs";
export const maxDuration = 60;

const ai = new GoogleGenAI({}); // reads GEMINI_API_KEY from the environment

const MODEL = process.env.GEMINI_MODEL ?? "gemini-3.8-flash";
const DAILY_LIMIT = Number(process.env.DAILY_MESSAGE_LIMIT ?? 50);
const HISTORY_LIMIT = 20; // how many recent messages are sent as context

const SYSTEM_PROMPT =
    "You are a helpful, concise assistant inside a web app. " +
    "Answer clearly and honestly. If you are unsure, say so.";

const bodySchema = z.object({
  message: z.string().trim().min(1).max(4000),
  conversationId: z.string().optional(),
});

export async function POST(req: Request) {
  const session = await auth();
  const userId = session?.user?.id;
  if (!userId) return Response.json({ error: "Unauthorized" }, { status: 401 });

  // Burst limit: 10 messages per minute per user
  if (!rateLimit(`chat:${userId}`, 10, 60 * 1000)) {
    return Response.json({ error: "Slow down a little and try again." }, { status: 429 });
  }

  const parsed = bodySchema.safeParse(await req.json().catch(() => null));
  if (!parsed.success) {
    return Response.json({ error: "Message must be 1-4000 characters." }, { status: 400 });
  }
  const { message, conversationId } = parsed.data;

  // Daily quota (counts the user's messages in the last 24 hours)
  const since = new Date(Date.now() - 24 * 60 * 60 * 1000);
  const usedToday = await prisma.message.count({
    where: { role: "user", createdAt: { gte: since }, conversation: { userId } },
  });
  if (usedToday >= DAILY_LIMIT) {
    return Response.json({ error: "Daily message limit reached." }, { status: 429 });
  }

  // Find or create the conversation (always scoped to the signed-in user)
  let conversation;
  if (conversationId) {
    conversation = await prisma.conversation.findFirst({ where: { id: conversationId, userId } });
    if (!conversation) return Response.json({ error: "Conversation not found" }, { status: 404 });
  } else {
    conversation = await prisma.conversation.create({
      data: { userId, title: message.slice(0, 60) },
    });
  }

  await prisma.message.create({
    data: { conversationId: conversation.id, role: "user", content: message },
  });

  const recent = await prisma.message.findMany({
    where: { conversationId: conversation.id },
    orderBy: { createdAt: "desc" },
    take: HISTORY_LIMIT,
  });
  // Gemini calls the assistant role "model"
  const contents = recent.reverse().map((m: { role: string; content: string }) => ({
    role: m.role === "assistant" ? "model" : "user",
    parts: [{ text: m.content }],
  }));
  while (contents[0]?.role === "model") contents.shift(); // history must start with a user turn
  const convId = conversation.id;
  const encoder = new TextEncoder();
  let fullReply = "";

  const stream = new ReadableStream({
    async start(controller) {
      try {
        const aiStream = await ai.models.generateContentStream({
          model: MODEL,
          contents,
          config: { systemInstruction: SYSTEM_PROMPT, maxOutputTokens: 1024 },
        });

        for await (const chunk of aiStream) {
          const text = chunk.text;
          if (text) {
            fullReply += text;
            controller.enqueue(encoder.encode(text));
          }
        }

        if (fullReply) {
          await prisma.message.create({
            data: { conversationId: convId, role: "assistant", content: fullReply },
          });
          await prisma.conversation.update({ where: { id: convId }, data: {} });
        }
      } catch (err) {
        console.error("Chat error:", err);
        controller.enqueue(encoder.encode("\n\n[Sorry, something went wrong. Please try again.]"));
      } finally {
        controller.close();
      }
    },
  });

  return new Response(stream, {
    headers: {
      "Content-Type": "text/plain; charset=utf-8",
      "Cache-Control": "no-store",
      "X-Conversation-Id": convId,
    },
  });
}
