import Anthropic from "@anthropic-ai/sdk";
import { z } from "zod";
import { getTrip, listDays, listDestinations } from "../repo/trips";
import { listItems } from "../repo/items";
import { listReservations, listExpenses } from "../repo/misc";
import { listPackages } from "../repo/enquiries";
import { placesProvider } from "../providers/places";
import { routingProvider, weatherForecast, type LatLng } from "../providers/routing";
import { convertToBase, fxSource } from "../providers/fx";
import { optimizeDay, type OptItem } from "../optimizer";
import { changeSetSchema, type ChangeSet } from "../schemas";
import { createProposal, logToolCall, saveMessage, listMessages } from "../repo/ai";

/**
 * AI travel assistant.
 * - Provider abstraction: assistantProvider() returns Gemini when
 *   GEMINI_API_KEY is set (checked first — free tier available), else
 *   Anthropic when ANTHROPIC_API_KEY is set, else a labeled development
 *   assistant.
 * - All mutations flow through ai_change_proposals; nothing is applied
 *   without explicit user approval (commit happens in the proposal API,
 *   not inside a model-callable tool).
 */

export type AiEvent =
  | { type: "text"; delta: string }
  | { type: "tool"; name: string }
  | { type: "proposal"; proposalId: string; summary: string }
  | { type: "notice"; message: string }
  | { type: "done" }
  | { type: "error"; message: string };

export interface AssistantRun {
  tripId: string;
  conversationId: string;
  message: string;
  actorId: string;
}

/* ── Trip context ────────────────────────────────────────── */

export function buildTripContext(tripId: string) {
  const trip = getTrip(tripId);
  const days = listDays(tripId);
  const items = listItems(tripId);
  const destinations = listDestinations(tripId);
  const reservations = listReservations(tripId);
  const spentBase = listExpenses(tripId).filter((e) => !e.planned).reduce((s, e) => s + (e.baseAmount ?? e.amount), 0);
  return {
    trip: {
      name: trip.name, origin: trip.origin, startDate: trip.startDate, endDate: trip.endDate, adults: trip.adults,
      children: trip.children, partyType: trip.partyType, currency: trip.currency, budgetTotal: trip.budgetTotal,
      pace: trip.pace, interests: trip.interests, dietary: trip.dietary, accessibility: trip.accessibility,
      dayStart: trip.dayStart, dayEnd: trip.dayEnd, notes: trip.notes,
    },
    destinations: destinations.map((d) => ({ name: d.name, lat: d.lat, lng: d.lng })),
    days: days.map((d) => ({
      dayIndex: d.dayIndex, date: d.date,
      destination: destinations.find((x) => x.id === d.destinationId)?.name ?? null,
      items: items.filter((i) => i.dayId === d.id).sort((a, b) => a.sortOrder - b.sortOrder).map((i) => ({
        itemId: i.id, name: i.name, category: i.category, startTime: i.startTime, durationMin: i.durationMin,
        locked: i.locked, priority: i.priority, cost: i.cost, currency: i.currency, lat: i.lat, lng: i.lng,
      })),
    })),
    unscheduled: items.filter((i) => !i.dayId).map((i) => ({ itemId: i.id, name: i.name, category: i.category })),
    reservations: reservations.map((r) => ({ type: r.type, startAt: r.startAt, location: r.location, status: r.status })),
    spentSoFarBaseCurrency: Math.round(spentBase * 100) / 100,
  };
}

/* ── Tools (strict Zod IO) ───────────────────────────────── */

const toolSchemas = {
  read_trip_context: z.object({}),
  search_places: z.object({
    query: z.string().max(120).optional(),
    category: z.string().max(40).optional(),
    destination: z.string().max(120).optional(),
    nearLat: z.number().optional(),
    nearLng: z.number().optional(),
    familyFriendly: z.boolean().optional(),
    minRating: z.number().min(0).max(5).optional(),
  }),
  get_place_details: z.object({ placeId: z.string().max(200) }),
  get_route_matrix: z.object({
    points: z.array(z.object({ lat: z.number(), lng: z.number(), label: z.string().max(80).optional() })).min(2).max(12),
    mode: z.enum(["walk", "car", "taxi", "public", "coach"]).default("car"),
  }),
  get_weather_forecast: z.object({ lat: z.number(), lng: z.number(), dates: z.array(z.string()).min(1).max(14) }),
  get_exchange_rate: z.object({ amount: z.number(), from: z.string().length(3), to: z.string().length(3) }),
  search_company_packages: z.object({ category: z.string().max(40).optional() }),
  estimate_trip_budget: z.object({}),
  validate_itinerary: z.object({ dayIndex: z.number().int().min(0).max(60) }),
  optimize_itinerary: z.object({ dayIndex: z.number().int().min(0).max(60) }),
  create_itinerary_change_preview: z.object({
    summary: z.string().min(5).max(300),
    changes: changeSetSchema,
  }),
} as const;

type ToolName = keyof typeof toolSchemas;

function zodToInputSchema(name: ToolName): Record<string, unknown> {
  // Hand-rolled JSON-schema equivalents (kept in sync with toolSchemas).
  const schemas: Record<ToolName, Record<string, unknown>> = {
    read_trip_context: { type: "object", properties: {} },
    search_places: {
      type: "object",
      properties: {
        query: { type: "string" }, category: { type: "string", description: "attraction|restaurant|cafe|hotel|shopping|museum|park|beach|nature|entertainment|family|religious" },
        destination: { type: "string" }, nearLat: { type: "number" }, nearLng: { type: "number" },
        familyFriendly: { type: "boolean" }, minRating: { type: "number" },
      },
    },
    get_place_details: { type: "object", properties: { placeId: { type: "string" } }, required: ["placeId"] },
    get_route_matrix: {
      type: "object",
      properties: {
        points: { type: "array", items: { type: "object", properties: { lat: { type: "number" }, lng: { type: "number" }, label: { type: "string" } }, required: ["lat", "lng"] } },
        mode: { type: "string", enum: ["walk", "car", "taxi", "public", "coach"] },
      },
      required: ["points"],
    },
    get_weather_forecast: { type: "object", properties: { lat: { type: "number" }, lng: { type: "number" }, dates: { type: "array", items: { type: "string" } } }, required: ["lat", "lng", "dates"] },
    get_exchange_rate: { type: "object", properties: { amount: { type: "number" }, from: { type: "string" }, to: { type: "string" } }, required: ["amount", "from", "to"] },
    search_company_packages: { type: "object", properties: { category: { type: "string" } } },
    estimate_trip_budget: { type: "object", properties: {} },
    validate_itinerary: { type: "object", properties: { dayIndex: { type: "integer" } }, required: ["dayIndex"] },
    optimize_itinerary: { type: "object", properties: { dayIndex: { type: "integer" } }, required: ["dayIndex"] },
    create_itinerary_change_preview: {
      type: "object",
      properties: {
        summary: { type: "string", description: "One-sentence description of the proposed change." },
        changes: {
          type: "object",
          description: "Structured change set. Day references use dayIndex (0-based). Never remove locked items.",
          properties: {
            adds: { type: "array", items: { type: "object", properties: {
              dayIndex: { type: "integer" }, name: { type: "string" }, category: { type: "string" },
              address: { type: "string" }, lat: { type: "number" }, lng: { type: "number" },
              startTime: { type: "string", description: "HH:MM" }, durationMin: { type: "integer" },
              cost: { type: "number" }, currency: { type: "string" }, notes: { type: "string" },
              slot: { type: "string", enum: ["morning", "afternoon", "evening"] },
              placeId: { type: "string" }, packageId: { type: "string" }, priority: { type: "string", enum: ["must", "normal", "low"] },
            }, required: ["name"] } },
            removes: { type: "array", items: { type: "object", properties: { itemId: { type: "string" }, reason: { type: "string" } }, required: ["itemId"] } },
            moves: { type: "array", items: { type: "object", properties: { itemId: { type: "string" }, toDayIndex: { type: "integer" }, toSlot: { type: "string" } }, required: ["itemId", "toDayIndex"] } },
            updates: { type: "array", items: { type: "object", properties: { itemId: { type: "string" }, patch: { type: "object" } }, required: ["itemId", "patch"] } },
          },
        },
      },
      required: ["summary", "changes"],
    },
  };
  return schemas[name];
}

async function execTool(name: ToolName, rawInput: unknown, ctx: AssistantRun): Promise<unknown> {
  const parsed = toolSchemas[name].safeParse(rawInput ?? {});
  if (!parsed.success) return { error: "invalid_input", issues: parsed.error.issues.slice(0, 3) };
  const input = parsed.data as Record<string, unknown>;
  const places = placesProvider();
  const routing = routingProvider();

  switch (name) {
    case "read_trip_context":
      return buildTripContext(ctx.tripId);
    case "search_places": {
      const res = await places.search(input as never);
      return { liveData: places.liveData, source: places.liveData ? "Google Places" : "Development data", results: res.slice(0, 10) };
    }
    case "get_place_details": {
      const res = await places.details(String(input.placeId));
      return res ? { liveData: places.liveData, place: res } : { error: "not_found" };
    }
    case "get_route_matrix": {
      const pts = input.points as LatLng[];
      const legs: { from: number; to: number; minutes: number }[] = [];
      for (let i = 0; i < pts.length - 1; i++) {
        const l = await routing.leg(pts[i], pts[i + 1], (input.mode as never) ?? "car");
        legs.push({ from: i, to: i + 1, minutes: l.durationMin });
      }
      return { liveData: routing.id === "google", source: routing.id === "google" ? "Google Routes" : "Distance estimate", legs };
    }
    case "get_weather_forecast": {
      const res = await weatherForecast(Number(input.lat), Number(input.lng), input.dates as string[]);
      return { liveData: res[0]?.live ?? false, source: res[0]?.live ? "Weather provider" : "Development data — not a real forecast", days: res };
    }
    case "get_exchange_rate": {
      const r = convertToBase(Number(input.amount), String(input.from), String(input.to));
      return { ...r, ...fxSource() };
    }
    case "search_company_packages":
      return { packages: listPackages(input.category as string | undefined).map((p) => ({ packageId: p.id, title: p.title.en, place: p.place.en, duration: p.duration.en, priceDisplay: p.priceDisplay, inclusions: p.inclusions })) };
    case "estimate_trip_budget": {
      const c = buildTripContext(ctx.tripId);
      const plannedCosts = c.days.flatMap((d) => d.items).reduce((s, i) => s + (i.cost ?? 0), 0);
      return { currency: c.trip.currency, plannedActivityCosts: plannedCosts, spentSoFar: c.spentSoFarBaseCurrency, budgetTotal: c.trip.budgetTotal, note: "Only includes costs recorded on itinerary items and expenses." };
    }
    case "validate_itinerary":
    case "optimize_itinerary": {
      const c = buildTripContext(ctx.tripId);
      const trip = getTrip(ctx.tripId);
      const day = c.days.find((d) => d.dayIndex === Number(input.dayIndex));
      if (!day) return { error: "day_not_found" };
      const optItems: OptItem[] = day.items.map((i) => ({
        id: i.itemId, name: i.name, category: i.category, lat: i.lat, lng: i.lng,
        durationMin: i.durationMin, startTime: i.startTime, locked: i.locked, priority: i.priority,
      }));
      const result = optimizeDay(optItems, {
        dayStart: trip.dayStart, dayEnd: trip.dayEnd, pace: trip.pace, mode: "car", origin: null,
        legMinutes: (a, b) => Math.max(2, Math.round((haversineApprox(a, b) * 1.35 / 30) * 60)),
      });
      return { dayIndex: input.dayIndex, ...result };
    }
    case "create_itinerary_change_preview": {
      const changes = input.changes as ChangeSet;
      const guard = guardChangeSet(ctx.tripId, changes);
      if (guard) return { error: guard };
      const impact = summarizeImpact(changes);
      const proposalId = createProposal(ctx.tripId, ctx.conversationId, String(input.summary), changes, impact, ctx.actorId);
      return { proposalId, status: "pending_user_approval", impact, note: "Ask the user to review and apply the preview. Do not claim the change is applied." };
    }
  }
}

/** Anthropic-style JSON schema (lowercase types) → Gemini's Schema proto (uppercase type enum). */
function toGeminiSchema(schema: Record<string, unknown>): Record<string, unknown> {
  const out: Record<string, unknown> = {};
  if (typeof schema.type === "string") out.type = schema.type.toUpperCase();
  if (schema.description) out.description = schema.description;
  if (Array.isArray(schema.enum)) out.enum = schema.enum;
  if (Array.isArray(schema.required)) out.required = schema.required;
  if (schema.properties && typeof schema.properties === "object") {
    out.properties = Object.fromEntries(
      Object.entries(schema.properties as Record<string, unknown>).map(([k, v]) => [k, toGeminiSchema(v as Record<string, unknown>)])
    );
  }
  if (schema.items && typeof schema.items === "object") {
    out.items = toGeminiSchema(schema.items as Record<string, unknown>);
  }
  return out;
}

function haversineApprox(a: LatLng, b: LatLng): number {
  const dx = (a.lat - b.lat) * 111;
  const dy = (a.lng - b.lng) * 111 * Math.cos((a.lat * Math.PI) / 180);
  return Math.sqrt(dx * dx + dy * dy);
}

/** Refuse change sets that touch locked items destructively. */
function guardChangeSet(tripId: string, changes: ChangeSet): string | null {
  const items = listItems(tripId);
  const locked = new Set(items.filter((i) => i.locked).map((i) => i.id));
  for (const r of changes.removes) if (locked.has(r.itemId)) return `Item ${r.itemId} is locked and cannot be removed.`;
  for (const m of changes.moves) if (locked.has(m.itemId)) return `Item ${m.itemId} is locked and cannot be moved.`;
  return null;
}

function summarizeImpact(changes: ChangeSet) {
  const addedCost = changes.adds.reduce((s, a) => s + (a.cost ?? 0), 0);
  return {
    adds: changes.adds.length, removes: changes.removes.length, moves: changes.moves.length, updates: changes.updates.length,
    estimatedAddedCost: addedCost || undefined,
  };
}

/* ── System prompt ───────────────────────────────────────── */

function systemPrompt(ctxJson: string): string {
  return `You are the Feather Wing Tours travel-planning assistant, embedded in the customer's trip workspace.

Grounding rules (strict):
- Never state current prices, availability, operating hours, weather, travel durations, flight status or visa requirements unless a tool call in THIS conversation returned that information. If a tool reports non-live/development data, say so.
- Be explicit about uncertainty. Do not fabricate. Do not give visa or safety guarantees — suggest the customer confirms with Feather Wing Tours' travel experts.
- Respect the trip's constraints: budget, pace, party type, dietary and accessibility notes, daily start/end times.
- Locked itinerary items must never be moved or removed.
- Never modify the itinerary directly. To change anything, call create_itinerary_change_preview with a structured change set, then tell the user a preview is ready for their approval. Never claim a change has been applied.
- Use optimize_itinerary / validate_itinerary for ordering and feasibility questions instead of guessing routes.
- When relevant, suggest matching Feather Wing Tours packages (search_company_packages) and clearly mark them as company products. For quotes, point the user to the trip's "Request a Custom Quote" page.
- Keep answers concise, use original wording, and reply in the user's language (English or Arabic).

Current trip context (JSON):
${ctxJson}`;
}

/* ── Providers ───────────────────────────────────────────── */

export interface AssistantProvider {
  readonly id: string;
  run(input: AssistantRun): AsyncGenerator<AiEvent>;
}

const MAX_ROUNDS = 6;

class AnthropicAssistant implements AssistantProvider {
  readonly id = "anthropic";
  private client: Anthropic;
  private model: string;
  constructor(apiKey: string) {
    this.client = new Anthropic({ apiKey });
    this.model = process.env.ANTHROPIC_MODEL ?? "claude-sonnet-5";
  }

  async *run(input: AssistantRun): AsyncGenerator<AiEvent> {
    const history = listMessages(input.conversationId).map((m) => ({
      role: m.role,
      content: typeof m.content === "string" ? m.content : (m.content as Anthropic.ContentBlockParam[]),
    })) as Anthropic.MessageParam[];
    saveMessage(input.conversationId, "user", input.message);
    const messages: Anthropic.MessageParam[] = [...history, { role: "user", content: input.message }];

    const tools: Anthropic.Tool[] = (Object.keys(toolSchemas) as ToolName[]).map((name) => ({
      name,
      description: toolDescription(name),
      input_schema: zodToInputSchema(name) as Anthropic.Tool.InputSchema,
    }));

    const system = systemPrompt(JSON.stringify(buildTripContext(input.tripId)));

    for (let round = 0; round < MAX_ROUNDS; round++) {
      const stream = this.client.messages.stream({ model: this.model, max_tokens: 2000, system, messages, tools });
      let assistantText = "";
      for await (const ev of stream) {
        if (ev.type === "content_block_delta" && ev.delta.type === "text_delta") {
          assistantText += ev.delta.text;
          yield { type: "text", delta: ev.delta.text };
        }
        if (ev.type === "content_block_start" && ev.content_block.type === "tool_use") {
          yield { type: "tool", name: ev.content_block.name };
        }
      }
      const final = await stream.finalMessage();
      messages.push({ role: "assistant", content: final.content });

      const toolUses = final.content.filter((c): c is Anthropic.ToolUseBlock => c.type === "tool_use");
      if (!toolUses.length || final.stop_reason !== "tool_use") {
        saveMessage(input.conversationId, "assistant", assistantText || "(tool interaction)");
        yield { type: "done" };
        return;
      }
      const results: Anthropic.ToolResultBlockParam[] = [];
      for (const tu of toolUses) {
        let output: unknown;
        let ok = true;
        try {
          output = await execTool(tu.name as ToolName, tu.input, input);
        } catch (e) {
          ok = false;
          output = { error: "tool_failed", message: e instanceof Error ? e.message : "unknown" };
        }
        logToolCall(input.conversationId, tu.name, tu.input, output, ok);
        const o = output as { proposalId?: string } | undefined;
        if (tu.name === "create_itinerary_change_preview" && o?.proposalId) {
          yield { type: "proposal", proposalId: o.proposalId, summary: (tu.input as { summary?: string })?.summary ?? "Itinerary change" };
        }
        results.push({ type: "tool_result", tool_use_id: tu.id, content: JSON.stringify(output).slice(0, 12000) });
      }
      messages.push({ role: "user", content: results });
    }
    yield { type: "notice", message: "Stopped after several tool rounds — ask a follow-up to continue." };
    yield { type: "done" };
  }
}

/* ── Gemini (free-tier alternative) ──────────────────────── */

interface GeminiPart {
  text?: string;
  functionCall?: { name: string; args: Record<string, unknown> };
  functionResponse?: { name: string; response: unknown };
  // Opaque blob Gemini's "thinking" models (e.g. gemini-3.5-flash, aliased
  // as gemini-flash-latest) attach to functionCall parts. It MUST be echoed
  // back verbatim on that same part in the next turn's request, or the API
  // rejects the call with a 400 "missing thought_signature" error — see
  // https://ai.google.dev/gemini-api/docs/thought-signatures
  thoughtSignature?: string;
}
interface GeminiContent {
  role: "user" | "model" | "function";
  parts: GeminiPart[];
}

type GeminiStreamEvent =
  | { type: "text"; text: string }
  | { type: "functionCall"; name: string; args: Record<string, unknown>; thoughtSignature?: string };

/** Parses a Gemini streamGenerateContent SSE body, yielding text and functionCall parts as they arrive. */
async function* parseGeminiStream(body: ReadableStream<Uint8Array>): AsyncGenerator<GeminiStreamEvent> {
  const reader = body.getReader();
  const decoder = new TextDecoder();
  let buffer = "";
  for (;;) {
    const { value, done } = await reader.read();
    if (done) break;
    buffer += decoder.decode(value, { stream: true });
    const lines = buffer.split("\n");
    buffer = lines.pop() ?? "";
    for (const line of lines) {
      const trimmed = line.trim();
      if (!trimmed.startsWith("data:")) continue;
      const payload = trimmed.slice(5).trim();
      if (!payload) continue;
      try {
        const json = JSON.parse(payload);
        const parts: GeminiPart[] = json?.candidates?.[0]?.content?.parts ?? [];
        for (const p of parts) {
          if (typeof p.text === "string" && p.text) yield { type: "text", text: p.text };
          if (p.functionCall)
            yield { type: "functionCall", name: p.functionCall.name, args: p.functionCall.args ?? {}, thoughtSignature: p.thoughtSignature };
        }
      } catch {
        // partial/non-JSON keepalive line — ignore
      }
    }
  }
}

/**
 * Google Gemini — free-tier-friendly alternative to Anthropic, same
 * tool-calling contract (execTool, proposals, MAX_ROUNDS). Uses the plain
 * REST API via fetch, no @google/genai dependency — see GEMINI_API_KEY in
 * .env.example. Conversation history is stored in Gemini's own `parts`
 * shape (see saveMessage calls below), mirroring how AnthropicAssistant
 * stores Anthropic content blocks; the two aren't cross-compatible mid
 * conversation, which only matters if you switch providers without
 * starting a new chat.
 */
class GeminiAssistant implements AssistantProvider {
  readonly id = "gemini";
  private apiKey: string;
  private model: string;
  constructor(apiKey: string) {
    this.apiKey = apiKey;
    // "-latest" alias so newly-created (lower-tier) API keys keep working as
    // Google rotates model availability — a pinned dated model (e.g.
    // gemini-2.5-flash) can 404 with "no longer available to new users"
    // on fresh keys even though it's still listed in models.list.
    this.model = process.env.GEMINI_MODEL ?? "gemini-flash-latest";
  }

  async *run(input: AssistantRun): AsyncGenerator<AiEvent> {
    const history = listMessages(input.conversationId).map((m) => ({
      role: m.role === "assistant" ? "model" : "user",
      parts: typeof m.content === "string" ? [{ text: m.content }] : (m.content as GeminiPart[]),
    })) as GeminiContent[];
    saveMessage(input.conversationId, "user", input.message);
    const contents: GeminiContent[] = [...history, { role: "user", parts: [{ text: input.message }] }];

    const functionDeclarations = (Object.keys(toolSchemas) as ToolName[]).map((name) => ({
      name,
      description: toolDescription(name),
      parameters: toGeminiSchema(zodToInputSchema(name)),
    }));

    const system = systemPrompt(JSON.stringify(buildTripContext(input.tripId)));
    const url = `https://generativelanguage.googleapis.com/v1beta/models/${this.model}:streamGenerateContent?alt=sse&key=${encodeURIComponent(this.apiKey)}`;

    try {
      for (let round = 0; round < MAX_ROUNDS; round++) {
        const res = await fetch(url, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            contents,
            systemInstruction: { parts: [{ text: system }] },
            tools: [{ functionDeclarations }],
            generationConfig: { maxOutputTokens: 2000 },
          }),
        });
        if (!res.ok || !res.body) {
          throw new Error(`Gemini request failed: ${res.status} ${await res.text().catch(() => "")}`);
        }

        let assistantText = "";
        const calls: { name: string; args: Record<string, unknown>; thoughtSignature?: string }[] = [];
        for await (const ev of parseGeminiStream(res.body)) {
          if (ev.type === "text") {
            assistantText += ev.text;
            yield { type: "text", delta: ev.text };
          } else {
            calls.push({ name: ev.name, args: ev.args, thoughtSignature: ev.thoughtSignature });
            yield { type: "tool", name: ev.name };
          }
        }

        const modelParts: GeminiPart[] = [];
        if (assistantText) modelParts.push({ text: assistantText });
        for (const c of calls) modelParts.push({ functionCall: { name: c.name, args: c.args }, thoughtSignature: c.thoughtSignature });
        contents.push({ role: "model", parts: modelParts });

        if (!calls.length) {
          saveMessage(input.conversationId, "assistant", modelParts);
          yield { type: "done" };
          return;
        }

        const responseParts: GeminiPart[] = [];
        for (const call of calls) {
          const name = call.name as ToolName;
          let output: unknown;
          let ok = true;
          try {
            output = await execTool(name, call.args, input);
          } catch (e) {
            ok = false;
            output = { error: "tool_failed", message: e instanceof Error ? e.message : "unknown" };
          }
          logToolCall(input.conversationId, call.name, call.args, output, ok);
          const o = output as { proposalId?: string } | undefined;
          if (call.name === "create_itinerary_change_preview" && o?.proposalId) {
            yield { type: "proposal", proposalId: o.proposalId, summary: (call.args as { summary?: string })?.summary ?? "Itinerary change" };
          }
          responseParts.push({ functionResponse: { name: call.name, response: { content: JSON.stringify(output).slice(0, 12000) } } });
        }
        contents.push({ role: "function", parts: responseParts });
      }
      yield { type: "notice", message: "Stopped after several tool rounds — ask a follow-up to continue." };
      yield { type: "done" };
    } catch (e) {
      console.error("[assistant:gemini]", e instanceof Error ? e.message : e);
      yield { type: "error", message: "The assistant is temporarily unavailable. Please try again." };
    }
  }
}

function toolDescription(name: ToolName): string {
  const d: Record<ToolName, string> = {
    read_trip_context: "Re-read the latest trip, days, items, reservations and budget context.",
    search_places: "Search attractions, restaurants, cafes, hotels and activities near a destination or coordinates.",
    get_place_details: "Fetch details for one place by placeId.",
    get_route_matrix: "Estimate travel minutes along an ordered list of coordinates for a travel mode.",
    get_weather_forecast: "Get a forecast for coordinates and dates. Check the liveData flag before citing it.",
    get_exchange_rate: "Convert an amount between currencies. Check the live flag before citing rates as current.",
    search_company_packages: "List Feather Wing Tours' own tour packages, optionally by category.",
    estimate_trip_budget: "Summarize planned itinerary costs and recorded spending against the trip budget.",
    validate_itinerary: "Check one day (by dayIndex) for time-window conflicts and overload without changing it.",
    optimize_itinerary: "Compute an optimized order and schedule for one day (by dayIndex). Returns a plan you can turn into a change preview.",
    create_itinerary_change_preview: "Create a change preview (adds/removes/moves/updates) that the USER must approve. The only way to modify the itinerary.",
  };
  return d[name];
}

/* ── Development assistant (no API key) ──────────────────── */

class DevAssistant implements AssistantProvider {
  readonly id = "dev";
  async *run(input: AssistantRun): AsyncGenerator<AiEvent> {
    saveMessage(input.conversationId, "user", input.message);
    yield { type: "notice", message: "Development assistant — no GEMINI_API_KEY or ANTHROPIC_API_KEY is configured. Responses use sample data." };
    const ctx = buildTripContext(input.tripId);
    const msg = input.message.toLowerCase();
    let reply: string;

    if (/(itinerary|plan|يوم|خطة|اقترح|suggest|create|fill)/.test(msg)) {
      const dest = ctx.destinations[0]?.name ?? "Istanbul";
      const found = await placesProvider().search({ destination: dest });
      const perDay = 3;
      const changes: ChangeSet = { adds: [], removes: [], moves: [], updates: [] };
      ctx.days.slice(0, Math.min(ctx.days.length, 3)).forEach((day, di) => {
        found.slice(di * perDay, di * perDay + perDay).forEach((p, i) => {
          changes.adds.push({
            dayIndex: day.dayIndex, name: p.name, category: (p.category as never) ?? "attraction", address: p.address,
            lat: p.lat, lng: p.lng, durationMin: 90, slot: (["morning", "afternoon", "evening"] as const)[i % 3],
            placeId: p.placeId, priority: "normal", locked: false, source: "ai",
          } as never);
        });
      });
      if (changes.adds.length) {
        const pid = createProposal(input.tripId, input.conversationId, `Draft ${Math.min(ctx.days.length, 3)}-day plan for ${dest} (sample data)`, changes, summarizeImpact(changes), input.actorId);
        yield { type: "proposal", proposalId: pid, summary: `Draft plan for ${dest}` };
        reply = `I prepared a draft plan for ${dest} using development sample places (${changes.adds.length} activities across ${Math.min(ctx.days.length, 3)} day(s)). Review the preview panel and apply it if it looks right — nothing changes until you approve. Configure GEMINI_API_KEY (free tier) or ANTHROPIC_API_KEY for the full assistant.`;
      } else {
        reply = "I could not find sample places for this destination in development mode. Try Istanbul, Riyadh, Jeddah or London, or configure the live providers.";
      }
    } else if (/(budget|ميزانية|cost|price)/.test(msg)) {
      const planned = ctx.days.flatMap((d) => d.items).reduce((s, i) => s + (i.cost ?? 0), 0);
      reply = `Recorded activity costs total ${planned} ${ctx.trip.currency}; recorded spending is ${ctx.spentSoFarBaseCurrency} ${ctx.trip.currency}. I can only cite figures stored in your trip — live pricing needs the full assistant.`;
    } else {
      reply = `This workspace is running the development assistant (no AI key configured). I can draft a sample itinerary ("plan my days"), or you can browse Explore and add places manually. Your trip: ${ctx.trip.name}, ${ctx.days.length} day(s), pace ${ctx.trip.pace}.`;
    }
    for (const chunk of reply.match(/.{1,60}/g) ?? [reply]) {
      yield { type: "text", delta: chunk };
      await new Promise((r) => setTimeout(r, 15));
    }
    saveMessage(input.conversationId, "assistant", reply);
    yield { type: "done" };
  }
}

export function assistantProvider(): AssistantProvider {
  const geminiKey = process.env.GEMINI_API_KEY;
  if (geminiKey) return new GeminiAssistant(geminiKey);
  const anthropicKey = process.env.ANTHROPIC_API_KEY;
  if (anthropicKey) return new AnthropicAssistant(anthropicKey);
  return new DevAssistant();
}
