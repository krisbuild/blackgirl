import { YouCamError } from "@/lib/youcam/client";
import { analyzeSkin } from "@/lib/youcam/skinAnalysis";

export const maxDuration = 60; // seconds; polling is capped below this in the client

const MAX_BYTES = 10 * 1024 * 1024; // YouCam limit: < 10 MB
const TYPES = new Set(["image/jpeg", "image/png"]);

/** Plain-language messages for the error codes in the YouCam docs. */
const FRIENDLY: Record<string, { status: number; message: string }> = {
  error_no_face: { status: 422, message: "We couldn't find a face. Face the camera straight on, in good light." },
  error_large_face_angle: { status: 422, message: "Your face is turned too far. Look straight at the camera." },
  error_src_face_too_small: { status: 422, message: "Your face looks a little far away. Move closer so your face fills most of the frame, then try again." },
  error_multiple_people: { status: 422, message: "Only one person should be in the photo." },
  error_face_parsing: { status: 422, message: "The photo wasn't clear enough to read. Try brighter, even light." },
  exceed_max_filesize: { status: 413, message: "That photo is too large. Please use one under 10 MB." },
  InvalidParameters: { status: 400, message: "The photo didn't meet the size requirements (shortest side at least 480 px)." },
  unauthorized: { status: 502, message: "The skin analysis service rejected our credentials." },
  InvalidApiKey: { status: 502, message: "The skin analysis service rejected our credentials." },
  no_api_key: { status: 503, message: "Live analysis isn't configured on this server." },
  network_error: { status: 502, message: "Our server couldn't reach the skin analysis service. Please try again in a moment." },
  bad_api_key: { status: 503, message: "The skin analysis service isn't set up correctly on this server." },
  timeout: { status: 504, message: "The analysis is taking too long. Please try again in a moment." },
};

export async function POST(req: Request) {
  let form: FormData;
  try {
    form = await req.formData();
  } catch {
    return Response.json({ error: "Send the photo as multipart form field 'image'." }, { status: 400 });
  }
  const file = form.get("image");
  if (!(file instanceof File)) {
    return Response.json({ error: "Missing 'image' file." }, { status: 400 });
  }
  const type = file.type === "image/jpg" ? "image/jpeg" : file.type;
  if (!TYPES.has(type)) {
    return Response.json({ error: "Please upload a JPG or PNG photo." }, { status: 415 });
  }
  if (file.size > MAX_BYTES) {
    return Response.json({ error: FRIENDLY.exceed_max_filesize.message }, { status: 413 });
  }

  try {
    const bytes = new Uint8Array(await file.arrayBuffer());
    const result = await analyzeSkin(bytes, type as "image/jpeg" | "image/png");
    // The photo is not stored anywhere; only scores are returned.
    return Response.json(result);
  } catch (err) {
    if (err instanceof YouCamError) {
      console.error("[analyze]", err.code, err.message);
      const f = FRIENDLY[err.code] ?? (err.code.startsWith("network_error") ? FRIENDLY.network_error : undefined);
      return Response.json(
        { error: f?.message ?? "Something went wrong analysing your photo. Please try again.", code: err.code },
        { status: f?.status ?? 502 },
      );
    }
    console.error("[analyze] unexpected", err);
    return Response.json({ error: "Unexpected server error." }, { status: 500 });
  }
}
