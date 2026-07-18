import { z } from "zod";

/** Shared field primitives */
const isoDate = z.string().regex(/^\d{4}-\d{2}-\d{2}$/, "Expected YYYY-MM-DD");
const hhmm = z.string().regex(/^([01]\d|2[0-3]):[0-5]\d$/, "Expected HH:MM");
const currency = z.string().length(3).toUpperCase();
export const idSchema = z.string().uuid().or(z.string().min(6).max(64));

export const interestValues = [
  "culture", "history", "food", "shopping", "nature", "adventure", "beaches", "nightlife",
  "family", "luxury", "wellness", "photography", "hidden-gems",
] as const;

export const categoryValues = [
  "attraction", "restaurant", "cafe", "hotel", "shopping", "museum", "park", "beach", "nature",
  "entertainment", "family", "religious", "package", "custom", "activity", "transport",
] as const;

export const tripCreateSchema = z.object({
  name: z.string().trim().min(2).max(120),
  origin: z.string().trim().max(120).optional(),
  destinations: z
    .array(z.object({ name: z.string().trim().min(2).max(120), country: z.string().max(80).optional(), lat: z.number().optional(), lng: z.number().optional(), nights: z.number().int().min(0).max(60).optional() }))
    .min(1)
    .max(10),
  startDate: isoDate.optional(),
  endDate: isoDate.optional(),
  adults: z.number().int().min(1).max(50).default(2),
  children: z.number().int().min(0).max(30).default(0),
  childAges: z.array(z.number().int().min(0).max(17)).max(30).optional(),
  partyType: z.enum(["solo", "couple", "family", "friends", "corporate", "group"]).default("family"),
  currency: currency.default("SAR"),
  budgetTotal: z.number().positive().max(10_000_000).optional(),
  budgetPerPerson: z.boolean().default(false),
  accommodationLevel: z.enum(["budget", "comfort", "premium", "luxury"]).optional(),
  pace: z.enum(["relaxed", "balanced", "packed"]).default("balanced"),
  interests: z.array(z.enum(interestValues)).max(13).default([]),
  transportPrefs: z.array(z.enum(["walk", "car", "taxi", "public", "coach"])).max(5).default([]),
  dietary: z.string().max(200).optional(),
  accessibility: z.string().max(300).optional(),
  dayStart: hhmm.default("09:00"),
  dayEnd: hhmm.default("21:00"),
  notes: z.string().max(2000).optional(),
}).refine((v) => !(v.startDate && v.endDate) || v.startDate <= v.endDate, {
  message: "End date must be after start date",
  path: ["endDate"],
});
export type TripCreateInput = z.infer<typeof tripCreateSchema>;

export const tripPatchSchema = z.object({
  name: z.string().trim().min(2).max(120).optional(),
  startDate: isoDate.nullable().optional(),
  endDate: isoDate.nullable().optional(),
  budgetTotal: z.number().positive().nullable().optional(),
  pace: z.enum(["relaxed", "balanced", "packed"]).optional(),
  dayStart: hhmm.optional(),
  dayEnd: hhmm.optional(),
  notes: z.string().max(2000).nullable().optional(),
  status: z.enum(["planning", "booked", "travelling", "done"]).optional(),
  version: z.number().int().optional(), // optimistic-concurrency check
});

export const itemCreateSchema = z.object({
  dayId: idSchema.nullable().optional(),
  placeId: z.string().max(200).nullable().optional(),
  name: z.string().trim().min(1).max(160),
  category: z.enum(categoryValues).default("activity"),
  address: z.string().max(300).nullable().optional(),
  lat: z.number().min(-90).max(90).nullable().optional(),
  lng: z.number().min(-180).max(180).nullable().optional(),
  startTime: hhmm.nullable().optional(),
  endTime: hhmm.nullable().optional(),
  durationMin: z.number().int().min(5).max(24 * 60).nullable().optional(),
  cost: z.number().min(0).max(1_000_000).nullable().optional(),
  currency: currency.nullable().optional(),
  notes: z.string().max(2000).nullable().optional(),
  slot: z.enum(["morning", "afternoon", "evening"]).nullable().optional(),
  priority: z.enum(["must", "normal", "low"]).default("normal"),
  locked: z.boolean().default(false),
  source: z.enum(["manual", "ai", "package", "discovery"]).default("manual"),
  packageId: z.string().max(64).nullable().optional(),
});
export type ItemCreateInput = z.infer<typeof itemCreateSchema>;

export const itemPatchSchema = itemCreateSchema.partial().extend({
  reservationStatus: z.enum(["none", "required", "requested", "booked", "paid"]).optional(),
  confirmationNumber: z.string().max(80).nullable().optional(),
  completed: z.boolean().optional(),
});

export const reorderSchema = z.object({
  dayId: idSchema.nullable(),
  orderedItemIds: z.array(idSchema).max(200),
});

export const expenseCreateSchema = z.object({
  title: z.string().trim().min(1).max(160),
  category: z.enum(["flights", "accommodation", "transportation", "food", "activities", "shopping", "visa", "insurance", "packages", "other"]).default("other"),
  amount: z.number().positive().max(10_000_000),
  currency: currency,
  paidBy: idSchema.nullable().optional(),
  spentAt: isoDate.optional(),
  planned: z.boolean().default(false),
  notes: z.string().max(500).optional(),
  splits: z.array(z.object({ profileId: idSchema, share: z.number().positive() })).max(50).optional(),
  splitEqualAmong: z.array(idSchema).max(50).optional(),
});

export const reservationCreateSchema = z.object({
  type: z.enum(["flight", "hotel", "train", "bus", "car", "transfer", "restaurant", "activity", "package", "other"]),
  provider: z.string().max(120).optional(),
  confirmationNumber: z.string().max(80).optional(),
  startAt: z.string().max(30).optional(),
  endAt: z.string().max(30).optional(),
  location: z.string().max(200).optional(),
  travelerNames: z.array(z.string().max(80)).max(50).optional(),
  price: z.number().min(0).optional(),
  currency: currency.optional(),
  status: z.enum(["pending", "confirmed", "cancelled"]).default("confirmed"),
  notes: z.string().max(1000).optional(),
});

export const checklistCreateSchema = z.object({
  name: z.string().trim().min(1).max(120),
  kind: z.enum(["packing", "before-departure", "documents", "shopping", "medication", "family", "work", "custom"]).default("custom"),
});

export const checklistItemSchema = z.object({
  text: z.string().trim().min(1).max(300),
  assignee: z.string().max(80).nullable().optional(),
  dueDate: isoDate.nullable().optional(),
});

export const inviteCreateSchema = z.object({
  role: z.enum(["editor", "viewer"]).default("editor"),
  email: z.string().email().max(200).optional(),
});

export const quoteCreateSchema = z.object({
  customerName: z.string().trim().min(2).max(120),
  email: z.string().email().max(200),
  phone: z.string().regex(/^[+\d][\d\s\-()]{6,18}$/).optional(),
  whatsapp: z.string().regex(/^[+\d][\d\s\-()]{6,18}$/).optional(),
  contactMethod: z.enum(["phone", "whatsapp", "email"]).default("whatsapp"),
  nationality: z.string().max(80).optional(),
  departureCity: z.string().max(120).optional(),
  travelers: z.number().int().min(1).max(100).optional(),
  datesFlexible: z.boolean().default(false),
  budget: z.number().positive().optional(),
  currency: currency.optional(),
  accommodation: z.string().max(120).optional(),
  needsFlights: z.boolean().default(false),
  needsVisa: z.boolean().default(false),
  needsInsurance: z.boolean().default(false),
  needsTransfer: z.boolean().default(false),
  notes: z.string().max(2000).optional(),
});

export const placeSearchSchema = z.object({
  q: z.string().max(120).optional(),
  category: z.enum(categoryValues).optional(),
  nearLat: z.coerce.number().min(-90).max(90).optional(),
  nearLng: z.coerce.number().min(-180).max(180).optional(),
  destination: z.string().max(120).optional(),
  openNow: z.coerce.boolean().optional(),
  minRating: z.coerce.number().min(0).max(5).optional(),
  maxPrice: z.coerce.number().int().min(0).max(4).optional(),
  familyFriendly: z.coerce.boolean().optional(),
});

export const aiChatSchema = z.object({
  conversationId: idSchema.optional(),
  message: z.string().trim().min(1).max(4000),
});

/** Public-site concierge chat — stateless, client resends history each turn. */
export const conciergeChatSchema = z.object({
  messages: z
    .array(
      z.object({
        role: z.enum(["user", "assistant"]),
        content: z.string().trim().min(1).max(2000),
      })
    )
    .min(1)
    .max(20),
  lang: z.enum(["en", "ar"]).default("en"),
});

/* ── Homepage content (admin-managed) ── */

const sceneEnum = z.enum([
  "canyon", "dunes", "serene-city", "istanbul", "maldives", "mountains", "skyline", "sea",
  "hegra", "island", "heritage", "coast-city", "elephant-rock", "globe", "london", "paris",
  "dubai", "switzerland", "newyork", "japan",
]);
const hueEnum = z.enum(["gold", "sand", "aqua", "navy", "green", "violet", "rose"]);

export const featuredTripSchema = z.object({
  scene: sceneEnum.default("canyon"),
  hue: hueEnum.default("sand"),
  titleEn: z.string().trim().min(2).max(120),
  titleAr: z.string().trim().min(1).max(120),
  placeEn: z.string().trim().min(1).max(120),
  placeAr: z.string().trim().min(1).max(120),
  datesEn: z.string().max(120).optional(),
  datesAr: z.string().max(120).optional(),
  durationEn: z.string().max(60).optional(),
  durationAr: z.string().max(60).optional(),
  price: z.string().max(60).optional(),
  seats: z.number().int().min(0).max(9999).default(0),
  category: z.enum(["saudi", "international", "islamic", "desert", "group", "corporate"]).default("saudi"),
});

export const kbCategoryValues = ["general", "services", "destinations", "booking", "visa", "umrah", "corporate", "policies"] as const;

export const kbArticleSchema = z.object({
  category: z.enum(kbCategoryValues).default("general"),
  titleEn: z.string().trim().min(2).max(160),
  titleAr: z.string().trim().min(1).max(160),
  contentEn: z.string().trim().min(2).max(4000),
  contentAr: z.string().trim().min(1).max(4000),
});

/* ── Meetings (admin-scheduled, optionally synced to Google Calendar) ── */

export const meetingCreateSchema = z.object({
  title: z.string().trim().min(2).max(160).default("Consultation Call"),
  customerName: z.string().trim().min(2).max(120),
  email: z.string().email().max(200).optional(),
  phone: z.string().max(40).optional(),
  notes: z.string().max(1000).optional(),
  startAt: z.string().min(10).max(40),
  durationMin: z.number().int().min(15).max(480).default(30),
});

export const meetingPatchSchema = z.object({
  status: z.enum(["scheduled", "cancelled", "completed"]).optional(),
  startAt: z.string().min(10).max(40).optional(),
  durationMin: z.number().int().min(15).max(480).optional(),
  notes: z.string().max(1000).optional(),
});

/* ── CRM (general homepage enquiries — the lead inbox) ── */

export const generalEnquiryStatusEnum = z.enum(["new", "contacted", "qualified", "converted", "lost"]);

export const generalEnquiryCreateSchema = z.object({
  name: z.string().trim().min(1).max(120),
  email: z.string().email().max(200),
  mobile: z.string().trim().min(6).max(20),
  service: z.string().trim().min(1).max(120),
  destination: z.string().max(200).optional(),
  departure: z.string().max(200).optional(),
  travelDate: z.string().max(40).optional(),
  travellers: z.string().max(40).optional(),
  contactMethod: z.string().max(40).optional(),
  notes: z.string().max(2000).optional(),
});

export const crmPatchSchema = z.object({
  id: z.string().min(6),
  status: generalEnquiryStatusEnum,
  adminNotes: z.string().max(2000).optional(),
});

export const offerSchema = z.object({
  scene: sceneEnum.default("dunes"),
  titleEn: z.string().trim().min(2).max(120),
  titleAr: z.string().trim().min(1).max(120),
  subtitleEn: z.string().max(160).optional(),
  subtitleAr: z.string().max(160).optional(),
  descriptionEn: z.string().max(600).optional(),
  descriptionAr: z.string().max(600).optional(),
  badgeEn: z.string().max(40).optional(),
  badgeAr: z.string().max(40).optional(),
  priceFrom: z.string().max(60).optional(),
  ctaEn: z.string().max(60).optional(),
  ctaAr: z.string().max(60).optional(),
  ctaHref: z.string().max(200).default("#enquiry"),
  validUntil: z.string().max(120).optional(),
});

/** Structured itinerary change set — the only way AI mutates a trip. */
export const changeSetSchema = z.object({
  adds: z
    .array(
      itemCreateSchema.extend({
        dayIndex: z.number().int().min(0).max(60).optional(),
      })
    )
    .default([]),
  removes: z.array(z.object({ itemId: idSchema, reason: z.string().max(300).optional() })).default([]),
  moves: z
    .array(z.object({ itemId: idSchema, toDayIndex: z.number().int().min(0).max(60), toSlot: z.enum(["morning", "afternoon", "evening"]).optional() }))
    .default([]),
  updates: z.array(z.object({ itemId: idSchema, patch: itemPatchSchema })).default([]),
});
export type ChangeSet = z.infer<typeof changeSetSchema>;
