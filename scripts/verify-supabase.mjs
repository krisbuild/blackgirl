// End-to-end check of the Supabase schema and row-level security.
// Creates two anonymous users, has user A save a scan + photo, and confirms
// user B can see neither. Cleans up A's rows and files afterwards.
// Usage: node --env-file=.env.local scripts/verify-supabase.mjs
import { createClient } from "@supabase/supabase-js";

const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
const key = process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY;
if (!url || !key) throw new Error("Set NEXT_PUBLIC_SUPABASE_URL and NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY");

const mk = () => createClient(url, key, { auth: { persistSession: false, autoRefreshToken: false } });
let failures = 0;
const check = (name, ok, detail = "") => {
  console.log(`${ok ? "PASS" : "FAIL"}  ${name}${detail ? `  (${detail})` : ""}`);
  if (!ok) failures++;
};

// 1x1 JPEG
const jpeg = Buffer.from(
  "/9j/4AAQSkZJRgABAQEASABIAAD/2wBDAP//////////////////////////////////////////////////////////////////////////////////////wgALCAABAAEBAREA/8QAFBABAAAAAAAAAAAAAAAAAAAAAP/aAAgBAQABPxA=",
  "base64",
);

const anon = mk();
const { error: anonReadErr, data: anonRows } = await anon.from("scans").select("id");
check("signed-out visitor sees no scans", !anonReadErr ? anonRows.length === 0 : true, anonReadErr?.message ?? `${anonRows.length} rows`);

const A = mk(), B = mk();
const { data: sa, error: ea } = await A.auth.signInAnonymously();
const { data: sb, error: eb } = await B.auth.signInAnonymously();
check("anonymous sign-in (user A)", !ea && !!sa.user, ea?.message);
check("anonymous sign-in (user B)", !eb && !!sb.user, eb?.message);
if (ea || eb) process.exit(1);
const aId = sa.user.id, bId = sb.user.id;

const { data: scan, error: insErr } = await A.from("scans")
  .insert({ concerns: [{ concern: "age_spot", rawScore: 86.5, uiScore: 78 }], overall: 77.47, skin_age: 25, skin_type: { whole: "Oily" } })
  .select()
  .single();
check("A can save a scan", !insErr && scan?.user_id === aId, insErr?.message);

const { data: aRows } = await A.from("scans").select("id");
check("A can read own scan", aRows?.some((r) => r.id === scan?.id));

const { data: bRows } = await B.from("scans").select("id");
check("B cannot see A's scan", (bRows ?? []).length === 0, `${bRows?.length} rows`);

const { error: spoofErr } = await B.from("scans").insert({ user_id: aId, concerns: [] });
check("B cannot insert a scan as A", !!spoofErr, spoofErr?.message);

const { data: bDel } = await B.from("scans").delete().eq("id", scan?.id).select();
check("B cannot delete A's scan", (bDel ?? []).length === 0);

const path = `${aId}/${scan?.id}.jpg`;
const { error: upErr } = await A.storage.from("scan-photos").upload(path, jpeg, { contentType: "image/jpeg" });
check("A can upload photo to own folder", !upErr, upErr?.message);

const { error: upOther } = await A.storage.from("scan-photos").upload(`${bId}/x.jpg`, jpeg, { contentType: "image/jpeg" });
check("A cannot upload into B's folder", !!upOther, upOther?.message);

const { data: aSigned, error: aSignErr } = await A.storage.from("scan-photos").createSignedUrl(path, 60);
check("A can get a signed URL for own photo", !aSignErr && !!aSigned?.signedUrl, aSignErr?.message);

const { error: bDl } = await B.storage.from("scan-photos").download(path);
check("B cannot download A's photo", !!bDl, bDl?.message);

const pub = await fetch(`${url}/storage/v1/object/public/scan-photos/${path}`);
check("photo is not publicly reachable", pub.status >= 400, `HTTP ${pub.status}`);

const { error: rmErr } = await A.storage.from("scan-photos").remove([path]);
const { error: delErr } = await A.from("scans").delete().eq("id", scan?.id);
check("A can delete own photo and scan", !rmErr && !delErr, rmErr?.message ?? delErr?.message);

console.log(failures ? `\n${failures} check(s) failed` : "\nAll checks passed");
process.exit(failures ? 1 : 0);
