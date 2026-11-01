# Project brief: dark-mark and scar tracker for black women (YouCam API hackathon)

Read this whole file before writing any code. It carries the context from planning in another chat.

## The hackathon
- **Event:** YouCam API Skin AI & eCommerce VTO Hackathon (Perfect Corp, on Devpost): https://youcam-api-skin-ai-ecommerce.devpost.com/
- **Deadline:** Nov 2, 2026, 11:45 AM EST, which is **5:45 PM Lagos time (UTC+1)**. Time is very tight, so prioritize one polished end-to-end flow over extra features.
- **Track:** Skin AI, meaning "help users understand their skin and decide what to do next."
- **Requirements:** a working web or mobile prototype that integrates at least one YouCam API meaningfully. Simple API wrappers won't meet the bar.
- **Judging:** technological implementation (depth of the API integration, working code), design (a complete, coherent experience), potential impact (a real problem for a real audience), and quality of idea (a creative, non-obvious use of the API).
- **Submission:** a repository with a license and setup instructions, a text description, screenshots, and a 1–3 minute demo video on YouTube that explains which YouCam API is used and shows the app running on its target device, with no unlicensed music or trademarks.
- **API credits:** 1,000 free units per participant. Don't waste them: cache results and keep a mock mode.

## The product
A skin tracker for **black women with post-acne dark marks (post-inflammatory hyperpigmentation) and acne scars**. Dark marks are the #1 skin concern for melanin-rich skin, and generic skin apps ignore it.

### Core flow (build this first, end to end)
1. **Guided capture:** a selfie with on-screen guidance for consistent lighting, distance and framing, so photos can be compared week to week. Ask for consent before the camera opens.
2. **Analysis:** send the photo to the YouCam AI Skin Analysis API on the server, using the async flow (upload → create task → poll for the result).
3. **Explanation:** translate the scores into plain, warm language focused on dark marks, acne, texture and evenness, using cosmetic wording only.
4. **History and comparison:** store each scan and show an interactive before/after comparison plus trend charts over time.
5. **Next steps:** suggest evidence-based ingredients for dark marks (niacinamide, azelaic acid, vitamin C, daily sunscreen without a white cast) and set realistic expectations, since dark marks fade over months.

### Second feature (only after the core flow works)
**Product safety scanner:** the user photographs a product's ingredient list. An AI vision model reads it, and the app flags dangerous or bleaching ingredients (mercury, clobetasol and other steroids, unregulated hydroquinone). It then says whether the product suits the user's skin concerns. It must **not** claim to detect counterfeit products.

### Extra YouCam APIs worth checking (deeper integration scores higher)
Check the docs for Skin Tone Analysis, Fitzpatrick Skin Type Analysis and the Facial Color Tones Analyzer. Last edition's winners used several YouCam APIs together.

## Lessons from the previous edition's winners
Gallery: https://youcam-api.devpost.com/project-gallery
- **1st, Aloud:** a beauty assistant for blind shoppers. It blocked medical language, stated its own uncertainty, lowered confidence when lighting or skin tone could reduce accuracy, and kept the API key server-side.
- **2nd, ShadeSpan, and CASTING (3rd–5th):** both checked how clothes look across skin tones. The judges reward skin-tone inclusivity.
- **KeepMe (3rd–5th):** strong engineering, with bounded polling, credit-aware retries, clear error states and tests.
- **Skin Journey did NOT place.** It was a generic scan → track → compare skin tracker, so the specific angle (dark marks on deep skin tones) is what has to set this project apart.

What they had in common: a narrow, underserved audience; multiple YouCam APIs integrated properly; honesty as a feature (stated limits, labeled demo data); cosmetic-only language; real test numbers; a live deployment; and a clear write-up.

## Non-negotiable rules
- The YouCam API key stays **server-side only** (environment variables, server routes). Never put it in client code.
- **No medical claims or diagnoses.** Don't use words like "treat," "cure" or "diagnose." Point users to a dermatologist for medical concerns. Don't use "flaws" or "fix your skin."
- **Be honest about accuracy.** Test how well the API reads deep skin tones (Fitzpatrick V–VI), report the results in the app and README, and show lower-confidence messaging when capture quality is poor.
- Keep a **mock or demo mode** with clearly labeled sample data, so the app can be shown without spending API credits.
- Cache API results, cap retries and handle errors and loading states gracefully.
- Treat photos privately: don't keep them longer than needed, and offer a delete option.

## Suggested stack
Next.js (App Router), TypeScript and Tailwind, deployed on Vercel. Use server route handlers for the YouCam calls and simple storage (SQLite or local storage for the prototype). No logins.

## Build plan
1. Read the YouCam Skin Analysis API docs and confirm exactly which concerns it returns (dark spots, acne, texture, and so on), plus the request and response format.
2. Make one real API call work through a server route, test it on 3–5 deep-skin-tone selfies and record how accurate it is. If dark marks aren't detected well, adjust the angle before building more.
3. Build the core flow: capture → analyze → explain → save → compare.
4. Polish the design, add the mock mode and deploy to Vercel.
5. Add the ingredient safety scanner if there's time.
6. Write the README with setup instructions and accuracy findings, take screenshots and record the demo video. Submit well before 5:45 PM Lagos time on Nov 2.

## First task for Claude Code
Confirm the plan, then help me get the YouCam API key and docs set up and make the first working Skin Analysis call through a server route. Ask me for anything you need, such as the API key (put it in `.env.local`) or doc excerpts.

## API notes (from the docs, verified 2026-11-01)
- V2 API, base https://yce-api-01.makeupar.com, header `Authorization: Bearer <key>`.
- Skin Analysis returns `age_spot` (pigmentation/spots), our proxy for dark marks. Use `raw_score`, because `ui_score` is inflated on purpose.
- A task must be polled at least every ~10 s or it is dropped and still billed.
- Also available: `skin-tone-analysis` (returns face_quality lighting/angle + skin_color hex) and `fitzpatrick-scale-analyzer` (pre-process, then a task with version "1.0").

@AGENTS.md
