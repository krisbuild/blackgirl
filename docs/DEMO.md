# Seen: demo guide

Everything needed to record the 1–3 minute Devpost video. All numbers below come from **real YouCam API
calls** made on 2026-11-02 against a team member's own selfie (shared with consent; the photo itself is
kept out of this public repo).

---

## The story in one line

> Dark marks are the #1 skin concern for melanin-rich skin, and a whole-face score hides them. Seen counts
> every mark on YouCam's own detection map, so Black women can actually watch them fade.

## Devpost video checklist

- [ ] Say which YouCam APIs are used: **AI Skin Analysis (V2, SD and HD)** and the **JS Camera Kit**.
- [ ] Show the app running **on a phone** (the target device). Open the Vercel URL on the phone.
- [ ] Keep it between 1 and 3 minutes. Aim for ~2:00.
- [ ] No unlicensed music, logos or trademarks. Use silence, your voice, or royalty-free audio.
- [ ] Upload to YouTube (public or unlisted) and paste the link into Devpost.

## Script (~2 minutes)

Record on your phone (iOS: Control Centre → Screen Recording; Android: Quick Settings → Screen record) with the
live app open at <https://blackgirl-zeta.vercel.app>. Screenshots for close-ups are in `docs/screenshots/`.

> Your live numbers may differ from the ones below; say what your screen shows.

| Time | On screen | Say |
|---|---|---|
| 0:00 | Welcome | "Hello, sunshine. Dark marks after acne are the number one skin concern for Black women, and most skin apps weren't built for our skin. This is Seen." |
| 0:10 | Tap **How accurate is this on deep skin?** | "Seen is honest about accuracy. We tested YouCam on deep skin and show what it catches and misses." |
| 0:18 | Scan preview → **Start my scan** | "Seen uses two YouCam APIs: the JS Camera Kit for guided capture, and AI Skin Analysis." |
| 0:25 | Guided camera (live) | "The Camera Kit checks my distance, angle and light live and takes the photo itself. You can also upload a photo." |
| 0:35 | Analysing | "The photo goes to YouCam's skin analysis on our server, in HD. The API key never touches the phone." |
| 0:42 | Results, rings on the face | "YouCam scored my dark marks 87 out of 100, 'clear'. But its own detection map marked 61 of them. So Seen counts every mark and rings it. Tap to zoom." |
| 1:00 | Mirror check → **I have more** | "AI can miss spots on deep skin, so I get the last word. I see more acne than 8, so my plan gets stronger." |
| 1:08 | Reading confidence card | "It tells me how much to trust this photo." |
| 1:13 | Mark age + plan | "A photo can't date a mark, so Seen asks. Then a plan: calm the breakouts, fade with azelaic acid and niacinamide, sunscreen with no white cast every day." |
| 1:25 | **Why these** + budget chips | "Every product is real and checked against its full ingredient list. It tells me why: niacinamide helps fade dark marks. Anything that doesn't suit my skin is left out, with the reason." |
| 1:38 | Product check (paste or photo) | "Already have a cream? This one has a steroid, mercury and hydroquinone, which can damage deep skin. Avoid." |
| 1:48 | My routine → rating | "Or check my whole routine. 8.5 out of 10, and one thing to change." |
| 1:55 | Journal | "Every scan is private. The journal tracks the count week by week. This chart is clearly marked as demo data until my second scan." |
| 2:05 | Back to welcome | "Cosmetic guidance, not a diagnosis. Seen. Because you shine like the sun." |

## Screenshots (`docs/screenshots/`)

| File | Shows |
|---|---|
| 01-welcome | "Hello, sunshine." |
| 02-how-accurate | The small "How accurate is this?" card |
| 03-scan-preview | Scan preview: dark marks, acne, texture, undereyes, sunburn |
| 04-photo-check | Photo preview: Retake / Use this photo |
| 05-analysing | "YouCam AI is reading your skin" |
| 06-results-dark-marks | Marks ringed on YouCam's detection map |
| 07-counts-and-mirror-check | Counts first, score second, "Does this match your mirror?" |
| 08-reading-confidence | Reading confidence and mark age |
| 09-what-we-measured | Every measurement with its method |
| 10-dark-mark-plan | Calm & protect → Fade → Renew, budget chips |
| 11-why-these-products | "Why these" and "Left out for your skin" |
| 12-product-check-avoid | Mercury, steroid and hydroquinone flagged |
| 13-routine-rating | Routine rated 8.5 / 10 |
| 14-journal-with-demo-trend | Journal with the labelled demo trend |

## Real results: full 16-concern YouCam scan of the team member's selfie

YouCam AI Skin Analysis V2, SD, all 16 concerns, one call (16 credits). Raw score: 1–100, higher = clearer.

| Concern | Raw score | YouCam "UI" score | Seen counted on the mask | Notes |
|---|---|---|---|---|
| **Dark marks** (age_spot) | 86.6 | 78 | **44 marks**: 25 forehead · 9 left cheek · 7 right cheek · 2 nose/mouth · 1 jaw; 1.1% of face | Score says "clear", the map disagrees |
| **Acne** | 78.4 | 80 | **9 spots**: 7 forehead · 1 cheek · 1 jaw | User reports more; photo is 543×800 with cheek glare |
| Texture & scars | 84.6 | 83 | | |
| **Dark undereyes** (dark_circle_v2) | 65.8 | 71 | | "Some" |
| Tear trough | 47.4 | 66 | | Most visible under-eye concern |
| Eye bags | 74.8 | 78 | | |
| Droopy lower eyelid | 69.4 | 76 | | |
| Droopy upper eyelid | 82.4 | 82 | | |
| **Sunburn / redness** | **100** | 99 | | Reads 100 on every deep-skin photo we tried, so it's flagged as unreliable |
| Glow (radiance) | 67.7 | 75 | | |
| Hydration (moisture) | 50.4 | 70 | | Could use more hydration |
| Oil balance (oiliness) | 54.9 | 70 | | |
| Pores | 57.8 | 71 | | |
| Wrinkles | 88.6 | 79 | | |
| Firmness | 81.0 | 81 | | |
| Skin type | Oily (whole face, T-zone, U-zone) | | | |
| Overall | 77.3 | | | |
| Skin age (YouCam estimate) | 26 | | | |

**Repeatability:** the 10 concerns in the app's normal scan returned **identical** scores in two separate calls
on the same photo.

## Other real scans

| Photo | Dark-mark score | Counted | Acne score | Counted | Redness |
|---|---|---|---|---|---|
| AI-generated portrait with cheek marks | 93.8 "clear" | 14 | 94.8 | 3 | 100 |
| Team member's earlier selfie | 86.5 | n/a | 87.2 | n/a | 100 |

## YouCam integration at a glance

- **AI Skin Analysis V2** (`/s2s/v2.0/file` → `/task` → bounded polling): 10 concerns per scan, SD (14 credits)
  or **HD automatically** when the photo's short side ≥ 1080 px (20 credits). Results are cached by image hash,
  so a photo is never paid for twice.
- **YouCam detection masks**: Seen downloads the dark-mark, acne, moisture and dark-circle maps, counts
  connected blobs, measures coverage of the face and places each mark by zone (`src/lib/youcam/marks.ts`).
- **JS Camera Kit** (skincare mode): live face, lighting, angle and distance checks with auto-capture.
- **Product check:** on-device label reading (Tesseract.js, served from the app) plus transparent ingredient
  rules: bleaching agents (mercury, steroids such as clobetasol, hydroquinone) → Avoid; pore-cloggers for oily or
  acne-prone skin; irritants; ingredients that help dark marks and acne, matched to the user's latest scan.
  It reads the label only and does not claim to detect counterfeits.
- The API key stays server-side; photos and scans are private per user via Supabase row-level security.

## Credits used

1,040 at start → 982 after all testing (one SD scan of the AI portrait, one in-app SD scan, one SD scan and one
16-concern scan of the selfie). Rejected tasks (face too small) were not charged.

## Talking points for judges

1. **Narrow, underserved audience:** dark marks on melanin-rich skin.
2. **Non-obvious use of the API:** counting on YouCam's own masks instead of trusting a diluted score.
3. **Honesty as a feature:** redness flagged as unreliable on deep skin; "Does this match your mirror?";
   cosmetic language only (a test fails the build on words like "treat", "cure" or "diagnose").
4. **Real engineering:** server-side key, bounded polling, caching, HD auto-switch, row-level security,
   24 tests, including tests on real YouCam masks.
