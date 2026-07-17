import { siteUrl } from "./site";

/**
 * SEO METADATA — EDITABLE
 * Single-page site today; each entry maps to a section anchor and is
 * ready to become a standalone route (e.g. /services/ticket-booking)
 * without content changes.
 */

export interface SeoEntry {
  path: string;
  title: { en: string; ar: string };
  description: { en: string; ar: string };
}

export const seoPages: SeoEntry[] = [
  {
    path: "/",
    title: {
      en: "Feather Wing Tours — Your Journey. Our Passion.",
      ar: "فذر وينغ تورز — رحلتك. شغفنا.",
    },
    description: {
      en: "Premium travel, tourism, Umrah, transportation and event management. One Wing. Endless Destinations — from AlUla and the Red Sea to London, Paris and beyond.",
      ar: "سفر وسياحة وعمرة ونقل وإدارة فعاليات بمستوى راقٍ. جناح واحد. وجهات بلا حدود — من العُلا والبحر الأحمر إلى لندن وباريس وما بعدها.",
    },
  },
  { path: "/#svc-ticket-booking", title: { en: "Ticket Booking | Feather Wing Tours", ar: "حجز التذاكر | فذر وينغ تورز" }, description: { en: "Flight tickets worldwide with competitive options and dependable support.", ar: "تذاكر طيران حول العالم بخيارات تنافسية ودعم موثوق." } },
  { path: "/#svc-visa-services", title: { en: "Visa Services | Feather Wing Tours", ar: "خدمات التأشيرات | فذر وينغ تورز" }, description: { en: "Tourist and business visa assistance, guided at every stage.", ar: "مساعدة في التأشيرات السياحية وتأشيرات الأعمال في كل مرحلة." } },
  { path: "/#svc-car-trips", title: { en: "Car Trips | Feather Wing Tours", ar: "رحلات السيارات | فذر وينغ تورز" }, description: { en: "Organized road journeys — join with your own vehicle.", ar: "رحلات برية منظمة — انضم بسيارتك الخاصة." } },
  { path: "/#svc-desert-camping", title: { en: "Desert Drive & Camping | Feather Wing Tours", ar: "التخييم الصحراوي | فذر وينغ تورز" }, description: { en: "Thrilling desert drives and peaceful camps under the stars.", ar: "قيادة صحراوية مثيرة ومخيمات هادئة تحت النجوم." } },
  { path: "/#svc-scheduled-trips", title: { en: "Scheduled Trips | Feather Wing Tours", ar: "الرحلات المجدولة | فذر وينغ تورز" }, description: { en: "Carefully planned group journeys on fixed dates.", ar: "رحلات جماعية مخططة بعناية في مواعيد ثابتة." } },
  { path: "/#svc-umrah-services", title: { en: "Umrah Services | Feather Wing Tours", ar: "خدمات العمرة | فذر وينغ تورز" }, description: { en: "Complete Umrah packages with comfort, guidance and care.", ar: "باقات عمرة متكاملة براحة وإرشاد وعناية." } },
  { path: "/#svc-islamic-travel", title: { en: "Islamic Destination Travel | Feather Wing Tours", ar: "السياحة في الوجهات الإسلامية | فذر وينغ تورز" }, description: { en: "Meaningful journeys to significant Islamic destinations.", ar: "رحلات ذات معنى إلى أبرز الوجهات الإسلامية." } },
  { path: "/#svc-corporate-events", title: { en: "Corporate Event Management | Feather Wing Tours", ar: "إدارة فعاليات الشركات | فذر وينغ تورز" }, description: { en: "Professional corporate events that reflect your brand and vision.", ar: "فعاليات شركات احترافية تعكس علامتك ورؤيتك." } },
  { path: "/#svc-employee-wellbeing", title: { en: "Employee Wellbeing Programs | Feather Wing Tours", ar: "برامج رفاهية الموظفين | فذر وينغ تورز" }, description: { en: "Team programs that inspire, motivate and strengthen culture.", ar: "برامج للفرق تُلهم وتحفّز وتقوّي ثقافة العمل." } },
  { path: "/#destinations", title: { en: "Destinations | Feather Wing Tours", ar: "الوجهات | فذر وينغ تورز" }, description: { en: "AlUla, Hegra, the Red Sea, Riyadh, Madinah, the Empty Quarter — and the world beyond.", ar: "العُلا والحِجر والبحر الأحمر والرياض والمدينة والربع الخالي — والعالم أبعد." } },
  { path: "/#trips", title: { en: "Featured Trips | Feather Wing Tours", ar: "رحلات مختارة | فذر وينغ تورز" }, description: { en: "Curated Saudi adventures, international holidays and Islamic journeys.", ar: "مغامرات سعودية وعطلات دولية ورحلات إيمانية مختارة." } },
  { path: "/#contact", title: { en: "Contact | Feather Wing Tours", ar: "تواصل معنا | فذر وينغ تورز" }, description: { en: "Plan your journey with Feather Wing Tours.", ar: "خطط لرحلتك مع فذر وينغ تورز." } },
];

/** FAQ used for structured data + footer link target (EDITABLE). */
export const faq = [
  {
    q: { en: "How do I book a trip with Feather Wing Tours?", ar: "كيف أحجز رحلة مع فذر وينغ تورز؟" },
    a: {
      en: "Submit the Plan Your Journey form with your preferred service and destination, and our team will contact you to confirm details, availability and pricing.",
      ar: "أرسل نموذج «خطط لرحلتك» مع الخدمة والوجهة المفضلتين وسيتواصل معك فريقنا لتأكيد التفاصيل والتوفر والأسعار.",
    },
  },
  {
    q: { en: "Do you arrange visas as well as tickets?", ar: "هل توفرون التأشيرات إضافة إلى التذاكر؟" },
    a: {
      en: "Yes — we support tourist and business visa applications alongside worldwide flight ticketing.",
      ar: "نعم — ندعم طلبات التأشيرات السياحية وتأشيرات الأعمال إلى جانب حجز تذاكر الطيران حول العالم.",
    },
  },
  {
    q: { en: "Can I join a trip with my own car?", ar: "هل يمكنني الانضمام إلى رحلة بسيارتي الخاصة؟" },
    a: {
      en: "Our organized Car Trips are designed exactly for that — travel in convoy with like-minded explorers on planned scenic routes.",
      ar: "رحلات السيارات المنظمة لدينا مصممة لذلك تحديدًا — سافر ضمن قافلة مع مستكشفين يشاركونك الشغف على مسارات مخططة.",
    },
  },
  {
    q: { en: "Do you organize corporate events and team programs?", ar: "هل تنظمون فعاليات الشركات وبرامج الفرق؟" },
    a: {
      en: "Yes — from full corporate event management to employee wellbeing and team-building programs.",
      ar: "نعم — من إدارة فعاليات الشركات المتكاملة إلى برامج رفاهية الموظفين وبناء الفرق.",
    },
  },
];

export { siteUrl };
