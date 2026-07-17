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
 * - Provider abstraction: assistantProvider() returns Anthropic when
 *   ANTHROPIC_API_KEY is set, otherwise a labeled development assistant.
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
    yield { type: "notice", message: "Development assistant — ANTHROPIC_API_KEY is not configured. Responses use sample data." };
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
        reply = `I prepared a draft plan for ${dest} using development sample places (${changes.adds.length} activities across ${Math.min(ctx.days.length, 3)} day(s)). Review the preview panel and apply it if it looks right — nothing changes until you approve. Configure ANTHROPIC_API_KEY for the full assistant.`;
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
  const key = process.env.ANTHROPIC_API_KEY;
  return key ? new AnthropicAssistant(key) : new DevAssistant();
}
