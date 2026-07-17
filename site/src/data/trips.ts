/**
 * FEATURED TRIPS — DEMO CONTENT / EDITABLE VIA CMS
 * ⚠ All trips below are clearly-marked demo placeholders.
 * Replace dates, prices, and seat counts with real inventory.
 */

export type TripCategory =
  | "saudi"
  | "international"
  | "islamic"
  | "desert"
  | "group"
  | "corporate";

export const tripCategories: { id: TripCategory | "all"; en: string; ar: string }[] = [
  { id: "all", en: "All Trips", ar: "كل الرحلات" },
  { id: "saudi", en: "Saudi Adventures", ar: "مغامرات سعودية" },
  { id: "international", en: "International Holidays", ar: "عطلات دولية" },
  { id: "islamic", en: "Islamic Journeys", ar: "رحلات إيمانية" },
  { id: "desert", en: "Desert Experiences", ar: "تجارب صحراوية" },
  { id: "group", en: "Group Trips", ar: "رحلات جماعية" },
  { id: "corporate", en: "Corporate Retreats", ar: "خلوات الشركات" },
];

export interface Trip {
  id: string;
  scene: string; // procedural backdrop key (matches destination scenes)
  hue: "gold" | "sand" | "aqua" | "navy" | "green" | "violet" | "rose";
  title: { en: string; ar: string };
  place: { en: string; ar: string };
  dates: { en: string; ar: string }; // DEMO — editable
  duration: { en: string; ar: string };
  price: string; // DEMO — editable, displayed as "from"
  seats: number; // DEMO — editable
  category: TripCategory;
}

export const trips: Trip[] = [
  {
    id: "trip-alula",
    scene: "canyon",
    hue: "sand",
    title: { en: "AlUla & Hegra Discovery", ar: "اكتشاف العُلا والحِجر" },
    place: { en: "AlUla, Saudi Arabia", ar: "العُلا، السعودية" },
    dates: { en: "Demo dates — e.g. 12–15 Oct", ar: "تواريخ تجريبية — مثال: ١٢–١٥ أكتوبر" },
    duration: { en: "4 days", ar: "٤ أيام" },
    price: "SAR —",
    seats: 18,
    category: "saudi",
  },
  {
    id: "trip-empty-quarter",
    scene: "dunes",
    hue: "gold",
    title: { en: "Empty Quarter Expedition", ar: "بعثة الربع الخالي" },
    place: { en: "Rub' al Khali, Saudi Arabia", ar: "الربع الخالي، السعودية" },
    dates: { en: "Demo dates — e.g. 20–22 Nov", ar: "تواريخ تجريبية — مثال: ٢٠–٢٢ نوفمبر" },
    duration: { en: "3 days", ar: "٣ أيام" },
    price: "SAR —",
    seats: 12,
    category: "desert",
  },
  {
    id: "trip-umrah",
    scene: "serene-city",
    hue: "navy",
    title: { en: "Umrah Comfort Package", ar: "باقة العمرة الميسّرة" },
    place: { en: "Makkah & Madinah", ar: "مكة والمدينة" },
    dates: { en: "Demo dates — monthly departures", ar: "تواريخ تجريبية — مغادرات شهرية" },
    duration: { en: "7 days", ar: "٧ أيام" },
    price: "SAR —",
    seats: 30,
    category: "islamic",
  },
  {
    id: "trip-istanbul",
    scene: "istanbul",
    hue: "rose",
    title: { en: "Istanbul Heritage Escape", ar: "إطلالة على تراث إسطنبول" },
    place: { en: "Istanbul, Türkiye", ar: "إسطنبول، تركيا" },
    dates: { en: "Demo dates — e.g. 5–11 Dec", ar: "تواريخ تجريبية — مثال: ٥–١١ ديسمبر" },
    duration: { en: "6 days", ar: "٦ أيام" },
    price: "SAR —",
    seats: 20,
    category: "international",
  },
  {
    id: "trip-maldives",
    scene: "maldives",
    hue: "aqua",
    title: { en: "Maldives Serenity Week", ar: "أسبوع الصفاء في المالديف" },
    place: { en: "Maldives", ar: "المالديف" },
    dates: { en: "Demo dates — e.g. 8–14 Jan", ar: "تواريخ تجريبية — مثال: ٨–١٤ يناير" },
    duration: { en: "7 days", ar: "٧ أيام" },
    price: "SAR —",
    seats: 14,
    category: "international",
  },
  {
    id: "trip-asir",
    scene: "mountains",
    hue: "green",
    title: { en: "Asir Mountains Convoy", ar: "قافلة جبال عسير" },
    place: { en: "Abha & Rijal Almaa", ar: "أبها ورجال ألمع" },
    dates: { en: "Demo dates — e.g. 2–5 Sep", ar: "تواريخ تجريبية — مثال: ٢–٥ سبتمبر" },
    duration: { en: "4 days", ar: "٤ أيام" },
    price: "SAR —",
    seats: 16,
    category: "group",
  },
  {
    id: "trip-riyadh-retreat",
    scene: "skyline",
    hue: "violet",
    title: { en: "Executive Team Retreat", ar: "خلوة الفرق التنفيذية" },
    place: { en: "Riyadh, Saudi Arabia", ar: "الرياض، السعودية" },
    dates: { en: "Demo dates — on request", ar: "تواريخ تجريبية — عند الطلب" },
    duration: { en: "2–3 days", ar: "يومان–٣ أيام" },
    price: "SAR —",
    seats: 40,
    category: "corporate",
  },
  {
    id: "trip-red-sea",
    scene: "sea",
    hue: "aqua",
    title: { en: "Red Sea Coastal Escape", ar: "إطلالة على ساحل البحر الأحمر" },
    place: { en: "Red Sea Coast, Saudi Arabia", ar: "ساحل البحر الأحمر، السعودية" },
    dates: { en: "Demo dates — e.g. 18–21 Oct", ar: "تواريخ تجريبية — مثال: ١٨–٢١ أكتوبر" },
    duration: { en: "4 days", ar: "٤ أيام" },
    price: "SAR —",
    seats: 22,
    category: "saudi",
  },
];
