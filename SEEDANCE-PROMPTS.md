# Seedance 2.0 — Video Generation Playbook

The website is fully wired for cinematic footage: every scene checks the media
manifest (`site/src/data/media.ts`) and automatically upgrades from its
procedural backdrop to a video the moment a file appears in
`site/public/videos/`.

**Status (2026-07-15): ✅ ALL 38 CLIPS GENERATED** at 720p std, 5–6 s each
(~880 credits on the Plus plan; 1080p at 9 cr/s would have covered only ~18 of
the 38 scenes, so full coverage at 720p was chosen — regenerate marquee clips
at 1080p/4k later by rerunning the same prompts with `resolution: "1080p"`).
Masters live in `site/public/videos/src`; the site serves scrub-optimized
encodes + frame sequences produced by the ffmpeg pipeline.

## Global settings (every clip)

- Model: **Seedance 2.0** (`seedance_2_0` on Higgsfield)
- Standard mode, **1080p**, **16:9**, **no audio**, **6–8 s**
- Reference image: `site/public/media/bird-master.png` — pass as `image`
  media so the bird stays identical in every clip
- Style directives to append to every prompt:
  > Cinematic 3D realism, premium travel-commercial quality, smooth
  > loop-compatible camera movement, realistic atmospheric depth. No captions,
  > no logos, no watermarks, no readable text.

## Workflow per clip

1. `media_import_url` (or media id `87e46821-5b9c-4722-81a1-eea3de72f103` — the
   master bird job) → pass in `medias: [{ role: "image", value: <id> }]`
2. `generate_video` with the prompt below
3. Download the mp4 → `site/public/videos/<id>.mp4`
4. Grab a representative frame → `site/public/media/<id>.jpg`
5. Set `video` (and `poster`) for that id in `site/src/data/media.ts`

## Hero sequence prompts

| id | prompt |
|----|--------|
| `seq-logo` | Slow camera push-in through near-black midnight darkness toward a soft glowing point of purple and gold light, gentle atmospheric haze, subtle floating gold particles, premium cinematic depth. |
| `seq-transform` | The purple-and-gold bird from the reference image forms out of streams of purple and gold light: individual glowing feather elements drift together and assemble into the bird mid-air in a dark midnight environment, graceful, luxurious, physically believable, no abrupt morphing. |
| `seq-flight` | The reference bird spreads its wings and flies out of darkness into an expansive sunrise sky above volumetric clouds; camera follows behind, warm sunrise light, purple cloud shadows, gold highlights, realistic wind interaction, subtle lens bloom. |

## Saudi journey prompts (append global style line to each)

| id | prompt |
|----|--------|
| `alula` | The reference bird in a wide cinematic flight through monumental AlUla sandstone formations at golden hour, camera tracking alongside. |
| `hegra` | The reference bird passes the ancient carved façades of Hegra at realistic scale, desert wind, drifting sand, warm sunset light. |
| `alula-canyons` | Dynamic flight with the reference bird weaving through narrow sandstone canyons and dramatic natural valleys, camera following. |
| `farasan` | Transition from desert gold to clear turquoise water: the reference bird glides over Farasan Island reefs and pristine coastal scenery. |
| `red-sea` | The reference bird glides above crystal-blue Red Sea water, coral islands, luxury coastal landscapes and white beaches. |
| `diriyah` | Aerial reveal with the reference bird over traditional Najdi architecture of Diriyah: historic streets, courtyards, warm earth-toned buildings at dusk. |
| `riyadh` | The reference bird flies toward the modern Riyadh skyline at sunset, premium city atmosphere, contemporary towers. |
| `jeddah` | The reference bird flies above Jeddah's waterfront and Red Sea coastline with a modern urban skyline at golden hour. |
| `asir` | Sweeping flight with the reference bird through green Asir mountains, misty valleys, elevated roads, layered ranges. |
| `elephant-rock` | The reference bird flies past AlUla's Elephant Rock during a dramatic desert sunset, camera arcs slowly around the rock. |
| `madinah` | Respectful, serene wide aerial atmosphere inspired by Madinah at dusk: distant peaceful skyline, soft light, the reference bird high and distant, never close to or over sacred areas. |
| `empty-quarter` | The reference bird crosses enormous rolling dunes of the Empty Quarter at sunset — scale, silence, freedom, untouched desert. |
| `rijal-almaa` | Reveal of the traditional stone village of Rijal Almaa and its mountain landscape, the reference bird gliding overhead. |
| `dammam-khobar` | The reference bird over the Eastern Province: modern coastline, towers, roads, business districts, waterfront development at dusk. |
| `to-the-world` | The reference bird rises above the Arabian Peninsula; the scene becomes a cinematic globe at night with delicate gold travel routes extending outward from Saudi Arabia. |

## International journey prompts

| id | prompt |
|----|--------|
| `london` | The reference bird over Big Ben, Westminster and the Thames in refined golden-hour light. |
| `paris` | The reference bird past the Eiffel Tower and elegant Parisian rooftops at sunset. |
| `dubai` | The reference bird through the futuristic Dubai skyline, premium towers, luxury urban atmosphere at dusk. |
| `istanbul` | The reference bird over Istanbul: historic mosques, the Bosphorus, layered architecture, warm evening light. |
| `maldives` | The reference bird over Maldives tropical islands, turquoise lagoons, overwater villas, white beaches. |
| `switzerland` | The reference bird over alpine lakes, green valleys, snow-covered mountains and peaceful Swiss villages. |
| `newyork` | The reference bird over Manhattan and the Statue of Liberty, city skyline at golden hour. |
| `japan` | The reference bird past Mount Fuji, a traditional pagoda and cherry blossoms — tradition and modern harmony. |
| `finale` | The reference bird flying slowly over a dark mountain landscape toward a golden sunrise, seamless ambient loop. |

## Service chapter prompts

| id | prompt |
|----|--------|
| `svc-ticket-booking` | A passenger by an aircraft window at sunset booking a flight on a mobile device; premium abstract glowing interface, no readable UI text. |
| `svc-visa-services` | Premium macro composition: passport, travel documents, subtle generic approval stamp, elegant office lighting; generic non-readable documentation only. |
| `svc-car-trips` | Convoy of modern SUVs on a scenic mountain road at sunrise, smooth aerial tracking, safe spacing, cinematic landscapes. |
| `svc-desert-camping` | Modern 4x4s crossing Saudi dunes, then a peaceful evening campsite under stars: tents, warm camp lighting, controlled campfire, organized premium setup. |
| `svc-scheduled-trips` | A premium coach in deep navy and gold livery travelling a scenic coastal highway at golden hour (no lettering on the vehicle). |
| `svc-umrah-services` | Respectful, dignified wide representation of pilgrims performing Umrah; culturally accurate, serene, no intrusive angles. |
| `svc-islamic-travel` | Cinematic journey through historic Islamic destinations: mosques, heritage architecture, peaceful city atmospheres, respectful framing. |
| `svc-gathering-programs` | Elegant outdoor evening gathering: premium seating, warm string lighting, stage area, catering details, organized guest zones. |
| `svc-corporate-events` | Modern corporate conference: stage, large presentation screen with abstract visuals, professional lighting, speakers and guests. |
| `svc-employee-wellbeing` | A professional team in a positive outdoor team-building activity, authentic teamwork, inclusive participation, premium corporate-retreat atmosphere. |

**Estimated budget:** 37 clips × 36 credits ≈ **1,330 credits** at current
pricing. Prioritize if topping up gradually: `seq-transform`, `seq-flight`,
`alula`, `empty-quarter`, `finale`, then services 01/04/06.
