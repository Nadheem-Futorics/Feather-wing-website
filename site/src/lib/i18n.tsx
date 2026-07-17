"use client";

import React, { createContext, useContext, useEffect, useState, useCallback } from "react";

export type Lang = "en" | "ar";
export type L<T = string> = { en: T; ar: T };

/** UI dictionary — all interface strings in English and Arabic. */
export const dict = {
  nav: {
    home: { en: "Home", ar: "الرئيسية" },
    planner: { en: "Trip Planner", ar: "مخطط الرحلات" },
    destinations: { en: "Destinations", ar: "الوجهات" },
    services: { en: "Services", ar: "الخدمات" },
    trips: { en: "Featured Trips", ar: "رحلات مختارة" },
    about: { en: "About", ar: "من نحن" },
    contact: { en: "Contact", ar: "تواصل معنا" },
    plan: { en: "Plan Your Journey", ar: "خطط لرحلتك" },
    menu: { en: "Menu", ar: "القائمة" },
    close: { en: "Close", ar: "إغلاق" },
    langLabel: { en: "العربية", ar: "English" },
  },
  hero: {
    tagline: { en: "Your Journey. Our Passion.", ar: "رحلتك. شغفنا." },
    beginWing: { en: "Every journey begins with a single wing.", ar: "كل رحلة تبدأ بجناح واحد." },
    flight: [
      { en: "Travel beyond.", ar: "سافر أبعد." },
      { en: "Experience more.", ar: "عِش أكثر." },
      { en: "Create memories.", ar: "اصنع الذكريات." },
      { en: "Explore with us.", ar: "استكشف معنا." },
    ],
    beyondBorders: { en: "The journey continues… beyond borders", ar: "الرحلة مستمرة… إلى ما وراء الحدود" },
    oneWing: { en: "One Wing.", ar: "جناح واحد." },
    endless: { en: "Endless Destinations.", ar: "وجهات بلا حدود." },
    exploreServices: { en: "Explore Our Services", ar: "اكتشف خدماتنا" },
    planJourney: { en: "Plan Your Journey", ar: "خطط لرحلتك" },
    scroll: { en: "Scroll to begin the journey", ar: "مرر لتبدأ الرحلة" },
    loading: { en: "Preparing your journey…", ar: "نجهّز رحلتك…" },
  },
  about: {
    kicker: { en: "About Us", ar: "من نحن" },
    title: {
      en: "Travel that stays with you for a lifetime.",
      ar: "سفرٌ يبقى معك مدى الحياة.",
    },
    lede: {
      en: "We believe that travel should be more than simply visiting a destination — it should be a memorable experience that stays with you for a lifetime.",
      ar: "نؤمن بأن السفر يجب أن يكون أكثر من مجرد زيارة وجهة — بل تجربة لا تُنسى ترافقك مدى الحياة.",
    },
    p1: {
      en: "Every traveler is different. That is why we do not offer fixed or one-size-fits-all travel packages. We begin with a personal consultation to understand your interests, expectations, budget, travel style, and purpose of travel. Based on this, we create a customized journey designed especially for you.",
      ar: "كل مسافر مختلف عن غيره، لذلك لا نقدّم باقات سفر جاهزة أو موحّدة للجميع. نبدأ باستشارة شخصية لفهم اهتماماتك وتوقعاتك وميزانيتك وأسلوب سفرك وهدف رحلتك، وبناءً عليها نصمم لك رحلة مخصصة صُنعت خصيصًا من أجلك.",
    },
    p2: {
      en: "People travel to relax, explore, reconnect, and experience a sense of peace. However, poor planning, complicated bookings, and unexpected challenges can often make a trip stressful and hectic. We are here to change that.",
      ar: "يسافر الناس للاسترخاء والاستكشاف واستعادة التواصل والشعور بالسكينة، غير أن سوء التخطيط وتعقيدات الحجوزات والمفاجآت غير المتوقعة كثيرًا ما تجعل الرحلة مرهقة ومضطربة. نحن هنا لنغيّر ذلك.",
    },
    p3: {
      en: "From the first consultation until you return home, our team takes care of every detail. We provide thoughtful planning, reliable support, and carefully selected experiences so that you can travel with confidence, comfort, and complete peace of mind.",
      ar: "من الاستشارة الأولى وحتى عودتك إلى المنزل، يعتني فريقنا بكل التفاصيل؛ تخطيط مدروس، ودعم موثوق، وتجارب مختارة بعناية، لتسافر بثقة وراحة واطمئنان تام.",
    },
    goal: {
      en: "Our goal is simple: to create seamless journeys and unforgettable moments that our customers will cherish forever.",
      ar: "هدفنا بسيط: أن نصنع رحلات سلسة ولحظات لا تُنسى يحتفظ بها عملاؤنا إلى الأبد.",
    },
    visionTitle: { en: "Our Vision", ar: "رؤيتنا" },
    vision: {
      en: "To establish a trusted global network of travel branches and become a leading international travel company known for personalized service, exceptional experiences, and customer satisfaction.",
      ar: "أن نُرسي شبكة عالمية موثوقة من فروع السفر، وأن نصبح شركة سفر دولية رائدة تُعرف بخدمتها الشخصية وتجاربها الاستثنائية ورضا عملائها.",
    },
    missionTitle: { en: "Our Mission", ar: "رسالتنا" },
    mission1: {
      en: "Our mission is to promote Saudi Arabia as a world-class tourism destination by showcasing its culture, heritage, natural beauty, and modern attractions to travelers from around the world.",
      ar: "رسالتنا هي الترويج للمملكة العربية السعودية كوجهة سياحية عالمية المستوى، عبر إبراز ثقافتها وتراثها وجمالها الطبيعي ومعالمها الحديثة للمسافرين من مختلف أنحاء العالم.",
    },
    mission2: {
      en: "We also aim to provide Saudi travelers with carefully planned international journeys that are comfortable, personalized, and unforgettable. Through professional consultation and dedicated support, we strive to make every journey smooth, meaningful, and stress-free.",
      ar: "كما نسعى إلى تقديم رحلات دولية مخططة بعناية للمسافرين السعوديين، تجمع بين الراحة والطابع الشخصي ولا تُنسى. ومن خلال الاستشارة الاحترافية والدعم المتفاني، نعمل على أن تكون كل رحلة سلسة وذات معنى وخالية من التوتر.",
    },
  },
  services: {
    kicker: { en: "Our Services", ar: "خدماتنا" },
    title: { en: "Ten ways to travel beyond.", ar: "عشر طرق لتسافر أبعد." },
  },
  trips: {
    kicker: { en: "Featured Trips", ar: "رحلات مختارة" },
    title: { en: "Where will your wings take you?", ar: "إلى أين ستأخذك أجنحتك؟" },
    demo: { en: "Demo content — editable via CMS", ar: "محتوى تجريبي — قابل للتعديل" },
    from: { en: "From", ar: "ابتداءً من" },
    seats: { en: "seats left", ar: "مقعدًا متاحًا" },
    view: { en: "View Details", ar: "عرض التفاصيل" },
  },
  why: {
    kicker: { en: "Why Travel With Feather Wing", ar: "لماذا تسافر مع فذر وينغ" },
    title: { en: "Care in every detail.", ar: "عناية في كل تفصيل." },
    points: [
      {
        title: { en: "Carefully Planned", ar: "تخطيط دقيق" },
        copy: { en: "Every stage is organized around a clear itinerary.", ar: "كل مرحلة منظمة وفق برنامج واضح." },
      },
      {
        title: { en: "Trusted Support", ar: "دعم موثوق" },
        copy: { en: "Guidance before, during, and after the journey.", ar: "إرشاد قبل الرحلة وأثناءها وبعدها." },
      },
      {
        title: { en: "Comfort and Safety", ar: "راحة وأمان" },
        copy: { en: "Travel experiences selected with customer wellbeing in mind.", ar: "تجارب سفر مختارة براحة عملائنا أولًا." },
      },
      {
        title: { en: "Meaningful Experiences", ar: "تجارب ذات معنى" },
        copy: { en: "Journeys designed to create lasting memories.", ar: "رحلات مصممة لتصنع ذكريات تدوم." },
      },
      {
        title: { en: "Flexible Solutions", ar: "حلول مرنة" },
        copy: { en: "Support for individuals, families, groups, and companies.", ar: "دعم للأفراد والعائلات والمجموعات والشركات." },
      },
    ],
  },
  testimonials: {
    kicker: { en: "Testimonials", ar: "آراء عملائنا" },
    title: { en: "Stories from the journey.", ar: "قصص من الرحلة." },
    note: { en: "Placeholder reviews — replace with authentic customer feedback.", ar: "مراجعات تجريبية — تُستبدل بآراء حقيقية." },
  },
  offer: {
    kicker: { en: "Special Offer", ar: "عرض خاص" },
    from: { en: "From", ar: "ابتداءً من" },
    valid: { en: "Valid", ar: "صالح" },
    defaultCta: { en: "Enquire now", ar: "استفسر الآن" },
  },
  form: {
    kicker: { en: "Booking & Enquiry", ar: "الحجز والاستفسار" },
    title: { en: "Plan Your Journey", ar: "خطط لرحلتك" },
    name: { en: "Full Name", ar: "الاسم الكامل" },
    mobile: { en: "Mobile Number", ar: "رقم الجوال" },
    email: { en: "Email Address", ar: "البريد الإلكتروني" },
    service: { en: "Service Required", ar: "الخدمة المطلوبة" },
    destination: { en: "Preferred Destination", ar: "الوجهة المفضلة" },
    departure: { en: "Departure City", ar: "مدينة المغادرة" },
    date: { en: "Expected Travel Date", ar: "تاريخ السفر المتوقع" },
    travellers: { en: "Number of Travellers", ar: "عدد المسافرين" },
    contactMethod: { en: "Preferred Contact Method", ar: "طريقة التواصل المفضلة" },
    methods: {
      phone: { en: "Phone Call", ar: "اتصال هاتفي" },
      whatsapp: { en: "WhatsApp", ar: "واتساب" },
      email: { en: "Email", ar: "البريد الإلكتروني" },
    },
    notes: { en: "Additional Requirements", ar: "متطلبات إضافية" },
    optionOther: { en: "Other", ar: "أخرى" },
    choose: { en: "Select…", ar: "اختر…" },
    submit: { en: "Submit Enquiry", ar: "أرسل الاستفسار" },
    submitting: { en: "Sending…", ar: "جارٍ الإرسال…" },
    call: { en: "Call Us", ar: "اتصل بنا" },
    whatsappBtn: { en: "WhatsApp", ar: "واتساب" },
    success: {
      en: "Thank you — your enquiry has been received. Our team will contact you shortly.",
      ar: "شكرًا لك — تم استلام استفسارك وسيتواصل معك فريقنا قريبًا.",
    },
    error: { en: "Something went wrong. Please try again or contact us directly.", ar: "حدث خطأ. حاول مرة أخرى أو تواصل معنا مباشرة." },
    required: { en: "This field is required", ar: "هذا الحقل مطلوب" },
    invalidEmail: { en: "Please enter a valid email address", ar: "يرجى إدخال بريد إلكتروني صحيح" },
    invalidPhone: { en: "Please enter a valid mobile number", ar: "يرجى إدخال رقم جوال صحيح" },
  },
  finalCta: {
    start: { en: "Start Your Journey", ar: "ابدأ رحلتك" },
    contact: { en: "Contact Feather Wing Tours", ar: "تواصل مع فذر وينغ تورز" },
  },
  footer: {
    company: { en: "Company", ar: "الشركة" },
    aboutUs: { en: "About Us", ar: "من نحن" },
    whyUs: { en: "Why Feather Wing", ar: "لماذا فذر وينغ" },
    contact: { en: "Contact", ar: "تواصل معنا" },
    travel: { en: "Travel Services", ar: "خدمات السفر" },
    programs: { en: "Specialized Programs", ar: "برامج متخصصة" },
    support: { en: "Support", ar: "الدعم" },
    faq: { en: "Frequently Asked Questions", ar: "الأسئلة الشائعة" },
    privacy: { en: "Privacy Policy", ar: "سياسة الخصوصية" },
    terms: { en: "Terms and Conditions", ar: "الشروط والأحكام" },
    cancellation: { en: "Cancellation Policy", ar: "سياسة الإلغاء" },
    phone: { en: "Phone", ar: "الهاتف" },
    email: { en: "Email", ar: "البريد" },
    address: { en: "Address", ar: "العنوان" },
    rights: { en: "All rights reserved.", ar: "جميع الحقوق محفوظة." },
    editable: { en: "Contact details are editable placeholders.", ar: "بيانات التواصل نماذج قابلة للتعديل." },
  },
  cursor: {
    explore: { en: "Explore", ar: "استكشف" },
    viewTrip: { en: "View Trip", ar: "عرض الرحلة" },
    book: { en: "Book", ar: "احجز" },
    discover: { en: "Discover", ar: "اكتشف" },
  },
  concierge: {
    launcherLabel: { en: "Chat with Sarah", ar: "تحدث مع سارة" },
    title: { en: "Sarah — Feather Wing Concierge", ar: "سارة — مساعدة فذر وينغ" },
    subtitle: { en: "Ask about destinations, services, or your trip.", ar: "اسأل عن الوجهات أو الخدمات أو رحلتك." },
    greeting: {
      en: "Hello! I'm Sarah, your Feather Wing Tours concierge. Ask me about our destinations, services, or packages.",
      ar: "مرحبًا! أنا سارة، مساعدتك في فذر وينغ تورز. اسألني عن وجهاتنا أو خدماتنا أو باقاتنا.",
    },
    placeholder: { en: "Type your question…", ar: "اكتب سؤالك…" },
    send: { en: "Send", ar: "إرسال" },
    close: { en: "Close chat", ar: "إغلاق المحادثة" },
    devNotice: { en: "Development mode — sample answers, not a live AI.", ar: "وضع تجريبي — إجابات نموذجية وليست ذكاءً اصطناعيًا فعليًا." },
    error: { en: "Something went wrong. Please try again or use the enquiry form below.", ar: "حدث خطأ. حاول مرة أخرى أو استخدم نموذج الاستفسار بالأسفل." },
    quoteCta: { en: "Request a Custom Quote", ar: "اطلب عرض سعر مخصص" },
    whatsappCta: { en: "WhatsApp Us", ar: "راسلنا عبر واتساب" },
    voiceOn: { en: "Voice replies on", ar: "الرد الصوتي مفعّل" },
    voiceOff: { en: "Voice replies off", ar: "الرد الصوتي متوقف" },
    micStart: { en: "Speak your question", ar: "تحدث بسؤالك" },
    micStop: { en: "Stop listening", ar: "إيقاف الاستماع" },
    listening: { en: "Listening…", ar: "أستمع…" },
  },
} as const;

interface LangCtx {
  lang: Lang;
  dir: "ltr" | "rtl";
  setLang: (l: Lang) => void;
  t: <T>(pair: L<T>) => T;
}

const Ctx = createContext<LangCtx>({
  lang: "en",
  dir: "ltr",
  setLang: () => {},
  t: (p) => p.en,
});

export function LanguageProvider({ children }: { children: React.ReactNode }) {
  const [lang, setLangState] = useState<Lang>("en");

  useEffect(() => {
    if (typeof window === "undefined") return;
    // ?lang= takes priority so the hreflang-declared URL (see
    // src/app/layout.tsx metadata.alternates and sitemap.ts) actually
    // renders in that language instead of silently falling back to
    // whatever was last saved, or English.
    const fromQuery = new URLSearchParams(window.location.search).get("lang");
    const resolved = fromQuery === "ar" || fromQuery === "en" ? fromQuery : (localStorage.getItem("fwt-lang") as Lang | null);
    if (resolved === "ar" || resolved === "en") {
      queueMicrotask(() => setLangState(resolved));
      if (fromQuery === resolved) {
        try {
          localStorage.setItem("fwt-lang", resolved);
        } catch {}
      }
    }
  }, []);

  useEffect(() => {
    const dir = lang === "ar" ? "rtl" : "ltr";
    document.documentElement.lang = lang;
    document.documentElement.dir = dir;
  }, [lang]);

  const setLang = useCallback((l: Lang) => {
    setLangState(l);
    try {
      localStorage.setItem("fwt-lang", l);
    } catch {}
  }, []);

  const t = useCallback(function t<T>(pair: L<T>): T {
    return pair[lang];
  }, [lang]);

  return (
    <Ctx.Provider value={{ lang, dir: lang === "ar" ? "rtl" : "ltr", setLang, t }}>
      {children}
    </Ctx.Provider>
  );
}

export const useLang = () => useContext(Ctx);
