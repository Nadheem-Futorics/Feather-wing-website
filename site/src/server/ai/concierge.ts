import Anthropic from "@anthropic-ai/sdk";
import { listPackages } from "../repo/enquiries";
import { listKbArticles } from "../repo/content";
import { services } from "@/data/services";
import { saudiDestinations, internationalDestinations } from "@/data/destinations";
import { contact, brand } from "@/data/site";

/**
 * Customer-facing concierge — a public-website chat widget distinct from
 * the trip planner's trip-scoped assistant (src/server/ai/assistant.ts).
 * It answers visitor questions about services, destinations, and packages
 * using only real site data, and cannot mutate anything.
 * Provider abstraction: Anthropic when ANTHROPIC_API_KEY is set, otherwise
 * a labeled development fallback grounded in the same data.
 */

export type ConciergeMessage = { role: "user" | "assistant"; content: string };

export type AiEvent =
  | { type: "text"; delta: string }
  | { type: "notice"; message: string }
  | { type: "done" }
  | { type: "error"; message: string };

export interface ConciergeRun {
  messages: ConciergeMessage[];
  lang: "en" | "ar";
}

const allDestinations = [...saudiDestinations, ...internationalDestinations];

function isPlaceholder(s: string): boolean {
  return /X{4,}|example\.com/.test(s);
}

function buildSiteContext() {
  const packages = listPackages();
  const kb = listKbArticles();
  return {
    brand: { name: brand.name, tagline: brand.tagline, campaign: brand.campaign },
    contact: {
      phone: isPlaceholder(contact.phone) ? null : contact.phone,
      whatsapp: isPlaceholder(contact.whatsapp) ? null : contact.whatsapp,
      email: isPlaceholder(contact.email) ? null : contact.email,
      city: contact.city,
    },
    services: services.map((s) => ({ title: s.title, short: s.short, copy: s.copy, highlight: s.highlight })),
    destinations: {
      saudi: saudiDestinations.map((d) => ({ title: d.title, line: d.line })),
      international: internationalDestinations.map((d) => ({ title: d.title, line: d.line })),
    },
    companyPackages: packages.map((p) => ({
      title: p.title, place: p.place, duration: p.duration, priceDisplay: p.priceDisplay, category: p.category,
    })),
    knowledgeBase: kb.map((a) => ({ category: a.category, title: a.title, content: a.content })),
  };
}

/* ── System prompt ───────────────────────────────────────── */

function systemPrompt(ctxJson: string, lang: "en" | "ar"): string {
  return `You are Sarah, the Feather Wing Tours virtual concierge, embedded as a chat widget on the public marketing website (this is NOT a logged-in trip workspace). Introduce yourself as Sarah only if asked who you are — don't repeat your name in every reply.

Grounding rules (strict):
- Only describe services, destinations, packages, and policies that appear in the JSON context below. Never invent tour packages, prices, dates, seats, or availability that aren't there.
- The "knowledgeBase" array holds admin-written answers (FAQs, policies, procedures) — prefer it over your own guesses whenever a visitor's question matches one of its entries, and quote it faithfully rather than paraphrasing away specifics.
- If contact.phone, contact.whatsapp, or contact.email are null, real contact details are not yet configured — direct the visitor to the on-site "Request a Custom Quote" / enquiry form instead of inventing a phone number or email address.
- Feather Wing Tours does not sell fixed packages by default — most trips are custom-designed after a personal consultation (see the company's "About" copy). Only quote a firm price if a companyPackage entry has priceDisplay set.
- Never give visa, medical, or safety guarantees. Suggest the visitor confirm specifics with the Feather Wing Tours team.
- You cannot check real-time availability, book anything, or access any booking system. For bookings or a personalized itinerary, direct visitors to the enquiry form on this page, or the Trip Planner (/trips) if they want to build their own day-by-day plan.
- Keep replies concise (a few sentences), warm, and professional.
- Reply in the visitor's language: ${lang === "ar" ? "Arabic" : "English"}.

Site data (JSON):
${ctxJson}`;
}

/* ── Providers ───────────────────────────────────────────── */

export interface ConciergeProvider {
  readonly id: string;
  run(input: ConciergeRun): AsyncGenerator<AiEvent>;
}

class AnthropicConcierge implements ConciergeProvider {
  readonly id = "anthropic";
  private client: Anthropic;
  private model: string;
  constructor(apiKey: string) {
    this.client = new Anthropic({ apiKey });
    this.model = process.env.ANTHROPIC_MODEL ?? "claude-sonnet-5";
  }

  async *run(input: ConciergeRun): AsyncGenerator<AiEvent> {
    const system = systemPrompt(JSON.stringify(buildSiteContext()), input.lang);
    const messages: Anthropic.MessageParam[] = input.messages.map((m) => ({ role: m.role, content: m.content }));
    try {
      const stream = this.client.messages.stream({ model: this.model, max_tokens: 700, system, messages });
      for await (const ev of stream) {
        if (ev.type === "content_block_delta" && ev.delta.type === "text_delta") {
          yield { type: "text", delta: ev.delta.text };
        }
      }
      await stream.finalMessage();
      yield { type: "done" };
    } catch (e) {
      console.error("[concierge]", e instanceof Error ? e.message : e);
      yield { type: "error", message: "The concierge is temporarily unavailable. Please try again or use the enquiry form." };
    }
  }
}

/* ── Development concierge (no API key) ──────────────────── */

class DevConcierge implements ConciergeProvider {
  readonly id = "dev";
  async *run(input: ConciergeRun): AsyncGenerator<AiEvent> {
    yield {
      type: "notice",
      message: "Development concierge — ANTHROPIC_API_KEY is not configured. Responses use keyword matching over the site's own data.",
    };
    const ar = input.lang === "ar";
    const last = input.messages[input.messages.length - 1]?.content ?? "";
    const msg = last.toLowerCase();
    const ctx = buildSiteContext();

    const kbHit = ctx.knowledgeBase.find(
      (a) => msg.includes(a.title.en.toLowerCase()) || (ar && msg.includes(a.title.ar))
    );
    const destHit = allDestinations.find(
      (d) => msg.includes(d.id) || msg.includes(d.title.en.toLowerCase()) || (ar && msg.includes(d.title.ar))
    );
    const svcHit = services.find(
      (s) => msg.includes(s.title.en.toLowerCase()) || (ar && msg.includes(s.title.ar))
    );

    let reply: string;
    if (kbHit) {
      reply = ar ? kbHit.content.ar : kbHit.content.en;
    } else if (destHit) {
      reply = ar
        ? `${destHit.title.ar} — ${destHit.line.ar} نصمم رحلات مخصصة إلى هناك بعد استشارة قصيرة. املأ نموذج "طلب عرض سعر مخصص" في الموقع وسيتواصل معك فريقنا بخطة مناسبة.`
        : `${destHit.title.en} — ${destHit.line.en} We design custom trips there after a short consultation. Fill out the "Request a Custom Quote" form on this page and our team will follow up with a tailored plan.`;
    } else if (svcHit) {
      reply = ar ? `${svcHit.title.ar}: ${svcHit.copy.ar}` : `${svcHit.title.en}: ${svcHit.copy.en}`;
    } else if (/(contact|phone|email|whatsapp|call|تواصل|هاتف|بريد|واتساب)/.test(msg)) {
      reply = ctx.contact.phone || ctx.contact.email
        ? (ar
            ? `يمكنك التواصل معنا عبر ${ctx.contact.phone ?? ""} ${ctx.contact.email ?? ""}`.trim()
            : `You can reach us at ${ctx.contact.phone ?? ""} ${ctx.contact.email ?? ""}`.trim())
        : ar
          ? "أفضل طريقة للتواصل معنا حالياً هي نموذج \"طلب عرض سعر مخصص\" في الموقع — سيتواصل معك فريقنا مباشرة."
          : 'The best way to reach us right now is the "Request a Custom Quote" form on this page — our team will contact you directly.';
    } else if (/(package|price|cost|باقة|سعر|تكلفة)/.test(msg) && ctx.companyPackages.length) {
      const p = ctx.companyPackages[0];
      reply = ar
        ? `لدينا باقات مثل "${p.title.ar}" (${p.place.ar}). املأ نموذج طلب عرض السعر لتفاصيل مخصصة.`
        : `We have packages such as "${p.title.en}" (${p.place.en}). Fill out the quote request form for personalized pricing.`;
    } else {
      reply = ar
        ? "مرحبًا، أنا سارة من فذر وينغ تورز! يمكنني إخبارك عن خدماتنا (حجز التذاكر، التأشيرات، رحلات السيارات، التخييم الصحراوي، العمرة، وغيرها) أو وجهاتنا. جرّب أن تسأل عن وجهة أو خدمة معينة."
        : "Hi, I'm Sarah from Feather Wing Tours! I can tell you about our services (ticket booking, visas, car trips, desert camping, Umrah, and more) or our destinations. Try asking about a specific place or service.";
    }

    for (const chunk of reply.match(/.{1,60}/g) ?? [reply]) {
      yield { type: "text", delta: chunk };
      await new Promise((r) => setTimeout(r, 12));
    }
    yield { type: "done" };
  }
}

export function conciergeProvider(): ConciergeProvider {
  const key = process.env.ANTHROPIC_API_KEY;
  return key ? new AnthropicConcierge(key) : new DevConcierge();
}
