# Shine: demo guide

Everything needed to record the 1–3 minute Devpost video. All numbers below come from **real YouCam API
calls** made on 2026-11-02 against a team member's own selfie (shared with consent; the photo itself is
kept out of this public repo).

---

## The story in one line

> Dark marks are the #1 skin concern for melanin-rich skin, and a whole-face score hides them. Shine counts
> every mark on YouCam's own detection map, so Black women can actually watch them fade.

## Devpost video checklist

- [ ] Say which YouCam APIs are used: **AI Skin Analysis (V2, SD and HD)** and the **JS Camera Kit**.
- [ ] Show the app running **on a phone** (the target device). Open the Vercel URL on the phone.
- [ ] Keep it between 1 and 3 minutes. Aim for ~2:00.
- [ ] No unlicensed music, logos or trademarks. Use silence, your voice, or royalty-free audio.
- [ ] Upload to YouTube (public or unlisted) and paste the link into Devpost.

## Script (~2 minutes)

| Time | On screen | Say |
|---|---|---|
| 0:00 | **01-welcome** | "Hello, sunshine. Dark marks after acne are the number one skin concern for Black women, and most skin apps weren't built for our skin. This is Shine." |
| 0:12 | **02-preview-scan** | "Shine reads dark marks, acne, texture, dark undereyes and sunburn with YouCam's AI Skin Analysis." |
| 0:20 | **03-guided-camera-tips** (live on phone) | "YouCam's JS Camera Kit checks light, angle and distance live and takes the photo itself. The tips are written for deep skin and textured hair, like blotting shine, because glare hides marks." |
| 0:35 | **05-analysing** | "The photo goes to YouCam's skin analysis on our server. The API key never touches the phone." |
| 0:42 | **06-results-dark-marks-ringed** | "Here's the problem we found. YouCam scored my dark marks 86.6 out of 100, 'clear'. But YouCam's own detection map marked 44 of them. So Shine counts every mark on the map and rings it." |
| 1:00 | **07-zoom-forehead**, **08-zoom-cheek** | "Tap to zoom. 25 on my forehead, 9 on my left cheek, 7 on my right." |
| 1:10 | **09-acne-ringed**, **11-mirror-check-acne** | "Acne: YouCam found 9. I have more than that, so I tell Shine, and my plan adjusts. AI can miss spots on deep skin, so the user gets the last word." |
| 1:25 | **12-mark-age** | "A photo can't date a mark, so Shine asks how long they've been there, and the journal counts from today." |
| 1:35 | **13-dark-mark-plan**, **13b-plan-products** | "Then a plan: calm the breakouts, fade with azelaic acid and niacinamide, renew with adapalene, and sunscreen with no white cast every day, with real products for each step, including Black-owned brands." |
| 1:45 | **19-product-check-avoid**, **20-product-check-great** (live on phone) | "Already have a product? Snap the ingredient list. This 'toning' cream has a steroid and hydroquinone: avoid. This niacinamide serum: a great match for my skin." |
| 1:52 | **16-journal** | "Every scan is private to me, and my journal tracks the count, so I can see 44 become 30 become 20." |
| 2:02 | **10-counts-vs-score** | "Honest about accuracy: on every deep-skin photo we tested, redness read a perfect 100, so Shine labels it unreliable. Shine. Because you shine like the sun." |

**Tip:** record the phone screen itself (iOS Screen Recording / Android screen recorder) for the live camera
part, and use the screenshots in `demo-kit` for close-ups.

## Shot list (screenshots in the demo kit)

| File | Shows |
|---|---|
| 01-welcome | "Hello, sunshine. You shine like the sun." |
| 02-preview-scan | Face-mesh scan preview with Dark marks / Acne / Texture / Dark undereyes / Sunburn |
| 03-guided-camera-tips | Live checks (Good light, Facing forward, Right distance) and deep-skin capture tips |
| 04-photo-check | Photo preview: Retake / Use this photo |
| 05-analysing | "YouCam AI is reading your skin" progress |
| 06-results-dark-marks-ringed | 44 dark marks ringed on YouCam's map, counts vs score |
| 07-zoom-forehead | Zoom: forehead cluster |
| 08-zoom-cheek | Zoom: cheek marks |
| 09-acne-ringed | 9 acne spots ringed |
| 10-counts-vs-score | "YouCam's detection map shows 44 dark marks…", why the score is high |
| 11-mirror-check-acne | "Does this match your mirror?" → "I have more" |
| 12-mark-age | How long have these marks been there? |
| 13-dark-mark-plan | Calm & protect → Fade → Renew |
| 14-ground-rules-dermatologist | Ground rules, dermatologist pointers, laser caution |
| 15-results-full-page | Whole results page |
| 16-journal | Weeks tracked, mark age, counts, history |
| 13b-plan-products | Named products under each plan step (Black-owned tagged) |
| 13c-check-a-product-cta | "Already have a product?" → Check a product |
| 17-youcam-dark-mark-map / 18-youcam-acne-map | YouCam's raw masks with Shine's rings |
| 19-product-check-avoid | Label photo → steroid + hydroquinone → **Avoid** |
| 20-product-check-great | Label photo → niacinamide + zinc PCA → **Great match** |

## Real results: full 16-concern YouCam scan of the team member's selfie

YouCam AI Skin Analysis V2, SD, all 16 concerns, one call (16 credits). Raw score: 1–100, higher = clearer.

| Concern | Raw score | YouCam "UI" score | Shine counted on the mask | Notes |
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
- **YouCam detection masks**: Shine downloads the dark-mark, acne, moisture and dark-circle maps, counts
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
