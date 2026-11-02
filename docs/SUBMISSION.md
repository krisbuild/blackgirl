# Devpost submission: Shine

Copy each section into the matching Devpost field.

---

## Project name
Shine

## Tagline (elevator pitch)
A dark-mark and acne tracker for Black women that counts every mark on YouCam's AI Skin Analysis map, so you can watch them fade.

## Links
- **Live app:** https://blackgirl-zeta.vercel.app (built for phones)
- **Code:** https://github.com/krisbuild/blackgirl (MIT licence, setup in the README)
- **Video:** *(paste your YouTube link)*

---

## Inspiration
Dark marks left behind by acne (post-inflammatory hyperpigmentation) are the number one skin concern for Black women. They can take months to fade, and most skin apps are built and tested on lighter skin. We wanted a tracker made for melanin-rich skin that is honest about what AI can and can't see.

## What it does
- **Guided capture:** the YouCam JS Camera Kit checks distance, angle and light live and takes the photo. Tips are written for deep skin and textured hair (face a window, pull hair back, blot shine). You can also upload a photo.
- **Counts, not just scores:** YouCam AI Skin Analysis runs on our server, in HD when the photo allows. Shine counts every dark mark and acne spot on YouCam's own detection maps, shows where they are (forehead, cheeks, chin) and rings each one on the photo.
- **You get the last word:** "Does this match your mirror?" If you see more, the plan gets stronger. A reading-confidence card says when a photo was too small or soft.
- **A plan with reasons:** Calm & protect → Fade → Renew, adjusted for how long the marks have been there, pregnancy (no retinoids), sensitive skin and warning signs (dermatologist first). Every step lists real products at three price bands, says **why** (for example, "niacinamide helps fade dark marks"), and shows which products were left out for your skin and why.
- **Product check and routine rating:** photograph or paste an ingredient list. Shine flags mercury, steroids such as clobetasol, and hydroquinone, which are common in skin-bleaching creams, and rates your whole routine out of 10.
- **Daily reminders:** "Apply sunscreen" every morning and "Drink water" every few hours, added to the phone's calendar with alerts so they ring even when the app is closed.
- **Private journal:** every scan is saved to an anonymous, private account with a trend chart, a then-and-now slider and delete. Until there's a second scan, an example chart is clearly labelled "Demo data".

## How we built it
- **Next.js 16** (App Router), TypeScript and Tailwind, deployed on **Vercel**.
- **YouCam AI Skin Analysis (V2):** a server-only client registers the file, uploads it to the presigned URL, creates the task and polls every 1–3 s with a hard cap (the docs say an unpolled task is dropped but still billed). HD actions are used automatically from 1080 px. Results are cached by image hash so the same photo never spends credits twice. We use the honest `raw_score`, not the inflated `ui_score`.
- **Mark counting:** we decode YouCam's RGBA detection masks, subtract the background layer, find connected blobs, and use the moisture map as the face area and the dark-circle map as the eye line to place marks by zone.
- **YouCam JS Camera Kit** in skincare mode for live face-quality checks and automatic capture.
- **Supabase:** anonymous sign-in, row-level security and a private photo bucket.
- **Ingredient data:** each recommended product's full ingredient list was fetched from INCIDecoder and checked by the same rules as Product check. **Tesseract.js** reads ingredient photos on the phone.
- 47 unit tests (parser, mark counting, ingredient rules, plan, routine rating, banned medical wording).

## Challenges we ran into
- **Scores hid the marks.** On a real deep-skin selfie, the dark-mark score read 87/100, "clear", while YouCam's own map marked 61 spots. We switched to counting the marks on the map.
- **HD masks counted as one giant mark,** because HD masks carry a dark background layer by default. We turned it off and subtract the background alpha.
- **"Face too small" on phones:** YouCam needs the face to fill most of the photo. The camera now says "come closer", and if a photo is still too far, Shine crops to the face and retries once.
- **A pasted API key with hidden characters** made every live call fail. We added a health check (`/api/health`) that reports whether the key is well formed without revealing it.

## Accomplishments that we're proud of
- An honest accuracy section, in the app and the README, built from real calls on deep skin.
- Turning "clear, 87/100" into "61 dark marks, mostly on your forehead", something people can actually track.
- Product picks that are real, checked against full ingredient lists, with the reason shown, and a scanner that flags bleaching ingredients.

## What we learned
- On deep skin, whole-face scores can hide exactly what users care about; the detection maps hold the real signal.
- HD matters: the same selfie found 61 dark marks at HD and 44 at standard resolution.
- Redness read a perfect 100 on every deep-skin photo we tried, so we label it unreliable instead of rating it.

## What's next for Shine
- Test on more deep-skin photos in different lighting and publish the results.
- Add YouCam's Skin Tone and Fitzpatrick analysis to adjust confidence by skin tone automatically.
- Hair and scalp care for edges and traction alopecia.
- Weekly reminders and shareable progress cards.

## Built with
nextjs, react, typescript, tailwindcss, vercel, supabase, youcam-ai-skin-analysis-api, youcam-js-camera-kit, tesseract.js, incidecoder, vitest

## Accuracy statement (paste into the description if there's room)
Tested on deep skin (Fitzpatrick V–VI) with real YouCam calls: an HD selfie found 61 dark marks and 8 acne spots; the same selfie at standard resolution found 44 and 9; a portrait with visible cheek marks found 14 and 3. Small, flat or glare-covered spots can be missed, so every result asks "Does this match your mirror?". Cosmetic guidance, not a diagnosis. See a dermatologist for persistent or severe concerns.
