/**
 * TESTIMONIALS — PLACEHOLDERS ONLY / EDITABLE VIA CMS
 * ⚠ No real customer identities are used. Replace each entry
 * with authentic, permission-granted reviews before launch.
 */

export interface Testimonial {
  id: string;
  name: { en: string; ar: string };
  type: { en: string; ar: string };
  service: { en: string; ar: string };
  quote: { en: string; ar: string };
  rating: number; // 1–5
}

export const testimonials: Testimonial[] = [
  {
    id: "t1",
    name: { en: "Customer Name — placeholder", ar: "اسم العميل — نموذج" },
    type: { en: "Family traveller", ar: "مسافر مع العائلة" },
    service: { en: "AlUla Discovery Trip", ar: "رحلة اكتشاف العُلا" },
    quote: {
      en: "Placeholder review — replace with an authentic customer testimonial about their AlUla journey.",
      ar: "مراجعة تجريبية — استبدلها بشهادة حقيقية من عميل عن رحلته إلى العُلا.",
    },
    rating: 5,
  },
  {
    id: "t2",
    name: { en: "Customer Name — placeholder", ar: "اسم العميل — نموذج" },
    type: { en: "Umrah pilgrim", ar: "معتمر" },
    service: { en: "Umrah Services", ar: "خدمات العمرة" },
    quote: {
      en: "Placeholder review — replace with an authentic testimonial about the Umrah package experience.",
      ar: "مراجعة تجريبية — استبدلها بشهادة حقيقية عن تجربة باقة العمرة.",
    },
    rating: 5,
  },
  {
    id: "t3",
    name: { en: "Customer Name — placeholder", ar: "اسم العميل — نموذج" },
    type: { en: "Corporate client", ar: "عميل شركات" },
    service: { en: "Corporate Event Management", ar: "إدارة فعاليات الشركات" },
    quote: {
      en: "Placeholder review — replace with an authentic testimonial from a corporate events client.",
      ar: "مراجعة تجريبية — استبدلها بشهادة حقيقية من عميل فعاليات شركات.",
    },
    rating: 5,
  },
  {
    id: "t4",
    name: { en: "Customer Name — placeholder", ar: "اسم العميل — نموذج" },
    type: { en: "Adventure traveller", ar: "مسافر مغامر" },
    service: { en: "Desert Drive & Camping", ar: "التخييم الصحراوي" },
    quote: {
      en: "Placeholder review — replace with an authentic testimonial about the desert camping experience.",
      ar: "مراجعة تجريبية — استبدلها بشهادة حقيقية عن تجربة التخييم الصحراوي.",
    },
    rating: 5,
  },
];
