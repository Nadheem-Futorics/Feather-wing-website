import { requireSessionProfile } from "@/server/session";
import { apiError, readJson } from "@/server/api-util";
import { requireRole, rateLimit } from "@/server/authz";
import { aiChatSchema } from "@/server/schemas";
import { assistantProvider } from "@/server/ai/assistant";
import { getOrCreateConversation, listMessages, latestConversation } from "@/server/repo/ai";
import { ok } from "@/server/api-util";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";
export const maxDuration = 120;

type Ctx = { params: Promise<{ tripId: string }> };

/** Conversation history for the panel. */
export async function GET(_req: Request, ctx: Ctx) {
  try {
    const { tripId } = await ctx.params;
    const me = await requireSessionProfile();
    requireRole(tripId, me.id, "viewer");
    const conversationId = latestConversation(tripId);
    return ok({
      conversationId,
      messages: conversationId ? listMessages(conversationId, 50).filter((m) => typeof m.content === "string") : [],
      provider: assistantProvider().id,
    });
  } catch (e) {
    return apiError(e);
  }
}

/** Streaming chat (SSE-style newline-delimited JSON events). */
export async function POST(req: Request, ctx: Ctx) {
  try {
    const { tripId } = await ctx.params;
    const me = await requireSessionProfile();
    requireRole(tripId, me.id, "editor");
    rateLimit(`ai:${me.id}`, 40, 3600);
    const input = aiChatSchema.parse(await readJson(req));
    const conversationId = getOrCreateConversation(tripId, input.conversationId, me.id);
    const provider = assistantProvider();

    const encoder = new TextEncoder();
    const stream = new ReadableStream<Uint8Array>({
      async start(controller) {
        const send = (obj: unknown) => controller.enqueue(encoder.encode(JSON.stringify(obj) + "\n"));
        send({ type: "meta", conversationId, provider: provider.id });
        try {
          for await (const ev of provider.run({ tripId, conversationId, message: input.message, actorId: me.id })) {
            send(ev);
          }
        } catch (e) {
          console.error("[tp-ai]", e instanceof Error ? e.message : e);
          send({ type: "error", message: "The assistant is temporarily unavailable. Please try again." });
        } finally {
          controller.close();
        }
      },
    });
    return new Response(stream, {
      headers: { "Content-Type": "application/x-ndjson; charset=utf-8", "Cache-Control": "no-store", "X-Accel-Buffering": "no" },
    });
  } catch (e) {
    return apiError(e);
  }
}
