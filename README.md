# blackgirl: dark-mark & scar tracker for melanin-rich skin

A skin tracker for Black women dealing with post-acne dark marks (post-inflammatory
hyperpigmentation) and acne scarring. It uses the **YouCam AI Skin Analysis API** (Perfect Corp).
Built for the YouCam API Skin AI & eCommerce VTO Hackathon.

> Cosmetic guidance only. This app does not diagnose or treat any condition. See a
> dermatologist for medical concerns.

## Status

- [x] Server-side YouCam V2 client: upload → pre-signed PUT → create task → bounded polling
- [x] `POST /api/analyze`: Skin Analysis (SD) with a result cache and friendly errors
- [ ] Guided capture UI, plain-language explanation, history & compare, next steps
- [ ] Skin Tone / Fitzpatrick analysis for confidence messaging
- [ ] Deep-skin-tone accuracy findings (Fitzpatrick V–VI)

## Setup

```bash
npm install
cp .env.example .env.local   # then add YOUCAM_API_KEY
npm run dev
```

Get an API key at <https://yce.makeupar.com/api-console/en/api-keys/>. The key is read only
on the server (`process.env.YOUCAM_API_KEY`). Never give it a `NEXT_PUBLIC_` prefix.

Without a key, `/api/analyze` responds `503` ("live analysis isn't configured"). Every result
is a real YouCam analysis.

### Database (Supabase)

1. Create a Supabase project and copy the URL and publishable key into `.env.local`.
2. Turn on **Authentication → Sign In / Providers → Allow anonymous sign-ins**. Each visitor
   gets a private history without creating an account.
3. Open the **SQL Editor**, paste `supabase/migrations/001_init.sql` and run it. This creates the
   `scans` table, the private `scan-photos` bucket and row-level security, so users only see their own data.

4. Run `npm run verify:db`. It creates two anonymous users and checks that each one can only
   see and delete their own scans and photos (14 checks).

### Try the API route

```bash
npm run smoke -- ./path/to/selfie.jpg
```

The response's `source` is `live` or `cache` (same photo seen before, no units spent).

## How the YouCam integration works

`src/lib/youcam/client.ts` follows the V2 docs (<https://yce.perfectcorp.com/document/index.html>):

1. `POST /s2s/v2.0/file/skin-analysis`: register the file, which returns a `file_id` and a pre-signed URL
2. `PUT` the image bytes to that URL
3. `POST /s2s/v2.0/task/skin-analysis` with `src_file_id`, `dst_actions` and `format: "json"`
4. `GET /s2s/v2.0/task/skin-analysis/{task_id}` every 1–3 s until `success` or `error`
   (the docs say a task that isn't polled for about 10 s is dropped but still billed), with a hard 120 s cap

Concerns requested (SD, needs a short side ≥ 480 px): `age_spot` (YouCam's pigmentation /
spots detector, our proxy for dark marks), `acne`, `texture`, `redness`, `radiance`, `pore`,
`oiliness`, `moisture` and `skin_type`.

We show `raw_score` as the main number. The docs say `ui_score` is deliberately adjusted
upward "as a psychological motivator", which isn't honest enough for tracking progress.

Results are cached by a SHA-256 of the image bytes (`.cache/youcam/`, scores only). Photos are
never written to disk by the server.

### Running inside a sandbox with an HTTPS proxy

Node's built-in `fetch` ignores `HTTPS_PROXY` unless told otherwise:

```bash
NODE_USE_ENV_PROXY=1 NODE_EXTRA_CA_CERTS=/path/to/ca.crt npm run dev
```

You don't need this on Vercel or a normal machine.

## License

MIT, see [LICENSE](./LICENSE).
