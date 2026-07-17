/**
 * DESTINATION JOURNEY DATA — EDITABLE / CMS-READY
 * Order of this array = order of the hero scroll journey.
 * `scene` selects the procedural backdrop drawn while (or until)
 * a video clip exists. Drop a Seedance clip at /videos/<id>.mp4
 * (+ poster at /media/<id>.jpg) and it is picked up automatically.
 */

export type SceneKind =
  | "logo"
  | "transform"
  | "clouds"
  | "canyon"
  | "hegra"
  | "island"
  | "sea"
  | "heritage"
  | "skyline"
  | "coast-city"
  | "mountains"
  | "elephant-rock"
  | "serene-city"
  | "dunes"
  | "village"
  | "modern-coast"
  | "globe"
  | "london"
  | "paris"
  | "dubai"
  | "istanbul"
  | "maldives"
  | "switzerland"
  | "newyork"
  | "japan"
  | "finale";

export interface Destination {
  id: string;
  scene: SceneKind;
  title: { en: string; ar: string };
  line: { en: string; ar: string };
  /** dominant palette for the procedural backdrop */
  hue: "gold" | "sand" | "aqua" | "navy" | "green" | "violet" | "rose";
}

export const saudiDestinations: Destination[] = [
  {
    id: "alula",
    scene: "canyon",
    title: { en: "AlUla", ar: "العُلا" },
    line: { en: "History carved in stone. Timeless beauty.", ar: "تاريخ منحوت في الصخر. جمال خالد." },
    hue: "sand",
  },
  {
    id: "hegra",
    scene: "hegra",
    title: { en: "Hegra", ar: "الحِجر" },
    line: { en: "Ancient stories come alive.", ar: "قصص عريقة تنبض بالحياة." },
    hue: "sand",
  },
  {
    id: "alula-canyons",
    scene: "canyon",
    title: { en: "AlUla’s Canyons", ar: "أخاديد العُلا" },
    line: { en: "Nature’s masterpiece.", ar: "تحفة الطبيعة." },
    hue: "gold",
  },
  {
    id: "farasan",
    scene: "island",
    title: { en: "Farasan Island", ar: "جزر فرسان" },
    line: { en: "A hidden paradise in the Red Sea.", ar: "جنة خفية في البحر الأحمر." },
    hue: "aqua",
  },
  {
    id: "red-sea",
    scene: "sea",
    title: { en: "The Red Sea", ar: "البحر الأحمر" },
    line: { en: "Crystal waters. Endless wonders.", ar: "مياه صافية. عجائب لا تنتهي." },
    hue: "aqua",
  },
  {
    id: "diriyah",
    scene: "heritage",
    title: { en: "Diriyah", ar: "الدرعية" },
    line: { en: "The heart of heritage and tradition.", ar: "قلب التراث والأصالة." },
    hue: "sand",
  },
  {
    id: "asir",
    scene: "mountains",
    title: { en: "Asir Mountains", ar: "جبال عسير" },
    line: { en: "Nature in its purest form.", ar: "الطبيعة في أنقى صورها." },
    hue: "green",
  },
  {
    id: "elephant-rock",
    scene: "elephant-rock",
    title: { en: "Elephant Rock", ar: "صخرة الفيل" },
    line: { en: "A wonder of nature.", ar: "أعجوبة من عجائب الطبيعة." },
    hue: "gold",
  },
  {
    id: "rijal-almaa",
    scene: "village",
    title: { en: "Rijal Almaa", ar: "رجال ألمع" },
    line: { en: "Heritage that stands tall.", ar: "تراث شامخ." },
    hue: "green",
  },
];

export const internationalDestinations: Destination[] = [
  {
    id: "london",
    scene: "london",
    title: { en: "London", ar: "لندن" },
    line: { en: "Timeless elegance.", ar: "أناقة خالدة." },
    hue: "navy",
  },
  {
    id: "paris",
    scene: "paris",
    title: { en: "Paris", ar: "باريس" },
    line: { en: "The city of romance.", ar: "مدينة الرومانسية." },
    hue: "rose",
  },
  {
    id: "dubai",
    scene: "dubai",
    title: { en: "Dubai", ar: "دبي" },
    line: { en: "Futuristic luxury.", ar: "فخامة المستقبل." },
    hue: "violet",
  },
  {
    id: "istanbul",
    scene: "istanbul",
    title: { en: "Istanbul", ar: "إسطنبول" },
    line: { en: "Where continents meet.", ar: "حيث تلتقي القارات." },
    hue: "rose",
  },
  {
    id: "maldives",
    scene: "maldives",
    title: { en: "Maldives", ar: "المالديف" },
    line: { en: "Tropical serenity.", ar: "صفاء استوائي." },
    hue: "aqua",
  },
  {
    id: "switzerland",
    scene: "switzerland",
    title: { en: "Switzerland", ar: "سويسرا" },
    line: { en: "Pure nature. Pure peace.", ar: "طبيعة نقية. سلام خالص." },
    hue: "green",
  },
  {
    id: "newyork",
    scene: "newyork",
    title: { en: "New York", ar: "نيويورك" },
    line: { en: "The city that never sleeps.", ar: "المدينة التي لا تنام." },
    hue: "navy",
  },
  {
    id: "japan",
    scene: "japan",
    title: { en: "Japan", ar: "اليابان" },
    line: { en: "Tradition. Innovation. Harmony.", ar: "تقاليد. ابتكار. انسجام." },
    hue: "rose",
  },
];
