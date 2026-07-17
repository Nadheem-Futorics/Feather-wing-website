/**
 * SERVICES DATA — EDITABLE / CMS-READY
 * 10 immersive service chapters. `scene` picks the procedural
 * environment; drop a Seedance clip at /videos/svc-<id>.mp4 to
 * upgrade a chapter to full video automatically.
 */

export type ServiceScene =
  | "booking"
  | "visa"
  | "cartrip"
  | "desert-camp"
  | "coach"
  | "umrah"
  | "islamic"
  | "gathering"
  | "corporate"
  | "wellbeing";

export interface Service {
  id: string;
  num: string;
  scene: ServiceScene;
  icon: "ticket" | "passport" | "car" | "tent" | "bus" | "kaaba" | "mosque" | "lights" | "stage" | "hearts";
  title: { en: string; ar: string };
  short: { en: string; ar: string };
  copy: { en: string; ar: string };
  highlight: { en: string; ar: string };
  cta: { en: string; ar: string };
  hue: "gold" | "sand" | "aqua" | "navy" | "green" | "violet" | "rose";
}

export const services: Service[] = [
  {
    id: "ticket-booking",
    num: "01",
    scene: "booking",
    icon: "ticket",
    title: { en: "Ticket Booking", ar: "حجز التذاكر" },
    short: { en: "Ticket Booking", ar: "حجز التذاكر" },
    copy: {
      en: "Flight tickets worldwide with competitive options, dependable support, and a simple booking experience.",
      ar: "تذاكر طيران حول العالم بخيارات تنافسية ودعم موثوق وتجربة حجز سهلة.",
    },
    highlight: { en: "Simple. Fast. Stress-free.", ar: "بسيط. سريع. دون عناء." },
    cta: { en: "Book a Flight", ar: "احجز رحلتك" },
    hue: "violet",
  },
  {
    id: "visa-services",
    num: "02",
    scene: "visa",
    icon: "passport",
    title: { en: "Visa Services", ar: "خدمات التأشيرات" },
    short: { en: "Visa Services", ar: "التأشيرات" },
    copy: {
      en: "From tourist visas to business travel support, we guide you through every stage with care.",
      ar: "من التأشيرات السياحية إلى دعم سفر الأعمال، نرافقك في كل خطوة بعناية.",
    },
    highlight: { en: "Clear guidance for your travel needs.", ar: "إرشاد واضح لاحتياجات سفرك." },
    cta: { en: "Request Visa Assistance", ar: "اطلب مساعدة التأشيرة" },
    hue: "navy",
  },
  {
    id: "car-trips",
    num: "03",
    scene: "cartrip",
    icon: "car",
    title: { en: "Car Trips", ar: "رحلات السيارات" },
    short: { en: "Car Trips", ar: "رحلات السيارات" },
    copy: {
      en: "Join organized road journeys with your own vehicle and travel alongside like-minded explorers.",
      ar: "انضم إلى رحلات برية منظمة بسيارتك الخاصة وسافر برفقة مستكشفين يشاركونك الشغف.",
    },
    highlight: { en: "Bring your car. Become part of the adventure.", ar: "أحضر سيارتك. وكن جزءًا من المغامرة." },
    cta: { en: "View Upcoming Car Trips", ar: "استعرض الرحلات القادمة" },
    hue: "green",
  },
  {
    id: "desert-camping",
    num: "04",
    scene: "desert-camp",
    icon: "tent",
    title: { en: "Desert Drive & Camping", ar: "التخييم والقيادة الصحراوية" },
    short: { en: "Desert Drive & Camping", ar: "التخييم الصحراوي" },
    copy: {
      en: "Thrilling desert drives, peaceful camps, and unforgettable memories beneath the open sky.",
      ar: "قيادة صحراوية مثيرة ومخيمات هادئة وذكريات لا تُنسى تحت السماء المفتوحة.",
    },
    highlight: { en: "Adventure by day. Serenity by night.", ar: "مغامرة في النهار. سكينة في الليل." },
    cta: { en: "Explore Desert Experiences", ar: "اكتشف التجارب الصحراوية" },
    hue: "gold",
  },
  {
    id: "scheduled-trips",
    num: "05",
    scene: "coach",
    icon: "bus",
    title: { en: "Scheduled Trips", ar: "الرحلات المجدولة" },
    short: { en: "Scheduled Trips", ar: "الرحلات المجدولة" },
    copy: {
      en: "Carefully planned group journeys on fixed dates. Pack your essentials and enjoy the experience.",
      ar: "رحلات جماعية مخططة بعناية في مواعيد ثابتة. احزم أساسياتك واستمتع بالتجربة.",
    },
    highlight: { en: "Planned for comfort, safety, and enjoyment.", ar: "مخططة للراحة والأمان والمتعة." },
    cta: { en: "View Scheduled Trips", ar: "استعرض الرحلات المجدولة" },
    hue: "violet",
  },
  {
    id: "umrah-services",
    num: "06",
    scene: "umrah",
    icon: "kaaba",
    title: { en: "Umrah Services", ar: "خدمات العمرة" },
    short: { en: "Umrah Services", ar: "خدمات العمرة" },
    copy: {
      en: "Complete Umrah packages designed around comfort, guidance, organization, and peace of mind.",
      ar: "باقات عمرة متكاملة مصممة حول الراحة والإرشاد والتنظيم وراحة البال.",
    },
    highlight: { en: "A meaningful journey, handled with care.", ar: "رحلة إيمانية نرعاها بكل عناية." },
    cta: { en: "View Umrah Packages", ar: "استعرض باقات العمرة" },
    hue: "navy",
  },
  {
    id: "islamic-travel",
    num: "07",
    scene: "islamic",
    icon: "mosque",
    title: { en: "Islamic Destination Travel", ar: "السياحة في الوجهات الإسلامية" },
    short: { en: "Islamic Destination Travel", ar: "الوجهات الإسلامية" },
    copy: {
      en: "Visit meaningful Islamic destinations with knowledge, serenity, and carefully planned support.",
      ar: "زر أبرز الوجهات الإسلامية بمعرفة وسكينة ودعم مخطط بعناية.",
    },
    highlight: { en: "Travel deeper. Connect meaningfully.", ar: "سافر أعمق. وتواصل بمعنى أصدق." },
    cta: { en: "Explore Islamic Destinations", ar: "اكتشف الوجهات الإسلامية" },
    hue: "sand",
  },
  {
    id: "gathering-programs",
    num: "08",
    scene: "gathering",
    icon: "lights",
    title: { en: "Gathering Programs Management", ar: "إدارة برامج التجمعات" },
    short: { en: "Gathering Programs", ar: "برامج التجمعات" },
    copy: {
      en: "From family gatherings to community occasions, we coordinate memorable programs with precision.",
      ar: "من التجمعات العائلية إلى المناسبات المجتمعية، ننسق برامج لا تُنسى بدقة.",
    },
    highlight: { en: "Memorable gatherings, beautifully organized.", ar: "تجمعات لا تُنسى، بتنظيم بديع." },
    cta: { en: "Plan a Gathering", ar: "خطط لتجمعك" },
    hue: "gold",
  },
  {
    id: "corporate-events",
    num: "09",
    scene: "corporate",
    icon: "stage",
    title: { en: "Corporate Event Management", ar: "إدارة فعاليات الشركات" },
    short: { en: "Corporate Events", ar: "فعاليات الشركات" },
    copy: {
      en: "Professional corporate events created to reflect your brand, objectives, and vision.",
      ar: "فعاليات شركات احترافية تعكس علامتك وأهدافك ورؤيتك.",
    },
    highlight: { en: "Events that leave a lasting impact.", ar: "فعاليات تترك أثرًا يدوم." },
    cta: { en: "Plan a Corporate Event", ar: "خطط لفعالية شركتك" },
    hue: "navy",
  },
  {
    id: "employee-wellbeing",
    num: "10",
    scene: "wellbeing",
    icon: "hearts",
    title: { en: "Employee Wellbeing Programs", ar: "برامج رفاهية الموظفين" },
    short: { en: "Employee Wellbeing", ar: "رفاهية الموظفين" },
    copy: {
      en: "Programs that inspire, motivate, strengthen teams, and support a healthier workplace culture.",
      ar: "برامج تُلهم وتحفّز وتقوّي الفرق وتدعم ثقافة عمل أكثر صحة.",
    },
    highlight: { en: "Stronger teams. Happier people. Better futures.", ar: "فرق أقوى. أشخاص أسعد. مستقبل أفضل." },
    cta: { en: "Design a Team Program", ar: "صمم برنامج فريقك" },
    hue: "green",
  },
];
