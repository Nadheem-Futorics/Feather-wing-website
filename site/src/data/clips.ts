/**
 * CLIP REGISTRY — maps every scene / service chapter to its
 * Seedance 2.0 clip base name. File layout per clip:
 *   /videos/<base>.mp4            desktop, keyframe-dense (scrub-safe)
 *   /videos/<base>.webm           VP9
 *   /videos/mobile/<base>.mp4     480p mobile
 *   /media/posters/<base>.jpg     poster / reduced-motion still
 *   /frames/<base>/f_%03d.webp    15fps frame sequence (hero canvas)
 *
 * Frame counts & availability are generated into media.generated.json
 * by  scripts/build-media-manifest.mjs  — rerun it after adding clips.
 */

export const heroClips: Record<string, string> = {
  "seq-logo": "FW_HERO_01_LogoReveal",
  "seq-transform": "FW_HERO_02_LogoTransform",
  "seq-flight": "FW_HERO_03_FirstFlight",

  alula: "FW_DEST_01_AlUla",
  hegra: "FW_DEST_02_Hegra",
  "alula-canyons": "FW_DEST_03_AlUlaCanyons",
  farasan: "FW_DEST_04_Farasan",
  "red-sea": "FW_DEST_05_RedSea",
  diriyah: "FW_DEST_06_Diriyah",
  riyadh: "FW_DEST_07_Riyadh",
  jeddah: "FW_DEST_08_Jeddah",
  asir: "FW_DEST_09_Asir",
  "elephant-rock": "FW_DEST_10_ElephantRock",
  madinah: "FW_DEST_11_Madinah",
  "empty-quarter": "FW_DEST_12_EmptyQuarter",
  "rijal-almaa": "FW_DEST_13_RijalAlmaa",
  "dammam-khobar": "FW_DEST_14_DammamKhobar",
  "to-the-world": "FW_DEST_15_ToTheWorld",

  // the "beyond borders" divider rides on the globe clip
  "seq-divider": "FW_DEST_15_ToTheWorld",

  london: "FW_INTL_01_London",
  paris: "FW_INTL_02_Paris",
  dubai: "FW_INTL_03_Dubai",
  istanbul: "FW_INTL_04_Istanbul",
  maldives: "FW_INTL_05_Maldives",
  switzerland: "FW_INTL_06_Switzerland",
  newyork: "FW_INTL_07_NewYork",
  japan: "FW_INTL_08_Japan",

  finale: "FW_HERO_31_GoldenHorizon",
};

export const serviceClips: Record<string, string> = {
  "ticket-booking": "FW_SERVICE_01_TicketBooking",
  "visa-services": "FW_SERVICE_02_VisaServices",
  "car-trips": "FW_SERVICE_03_CarTrips",
  "desert-camping": "FW_SERVICE_04_DesertCamping",
  "scheduled-trips": "FW_SERVICE_05_ScheduledTrips",
  "umrah-services": "FW_SERVICE_06_UmrahServices",
  "islamic-travel": "FW_SERVICE_07_IslamicTravel",
  "gathering-programs": "FW_SERVICE_08_GatheringPrograms",
  "corporate-events": "FW_SERVICE_09_CorporateEvents",
  "employee-wellbeing": "FW_SERVICE_10_EmployeeWellbeing",
};

export const clipPaths = (base: string) => ({
  mp4: `/videos/${base}.mp4`,
  webm: `/videos/${base}.webm`,
  mobile: `/videos/mobile/${base}.mp4`,
  poster: `/media/posters/${base}.jpg`,
  frameDir: `/frames/${base}`,
});

export const framePath = (base: string, i: number) =>
  `/frames/${base}/f_${String(i + 1).padStart(3, "0")}.webp`;
