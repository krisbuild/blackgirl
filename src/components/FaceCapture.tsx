"use client";

import { useCallback, useEffect, useLayoutEffect, useRef, useState } from "react";
import { SimpleCamera } from "./SimpleCamera";
import { cameraKitMount, loadCameraKit, parkCameraKitMount, toBlob, type CapturedResult, type FaceQuality, type YMKApi } from "@/lib/cameraKit";

type Status = "loading" | "live" | "failed";

/** Prep tips written for deep skin tones and textured hair. */
const TIPS = [
  {
    icon: "☀",
    title: "Face your light",
    body: "Stand facing a window or a soft lamp. Overhead or back light throws shadows that can look like dark marks on deep skin.",
  },
  {
    icon: "✿",
    title: "Clear your face",
    body: "Pull braids, locs, twists or edges back off your forehead and cheeks. A bonnet or headwrap is fine if your hairline shows.",
  },
  {
    icon: "◍",
    title: "Blot the shine",
    body: "Press a tissue on your forehead, nose and cheeks. Glare from oily skin can hide marks and spots from the scan.",
  },
  {
    icon: "◌",
    title: "Bare skin",
    body: "Skip foundation and tinted sunscreen for this photo, so we read your real skin.",
  },
  {
    icon: "↻",
    title: "Same spot, same time",
    body: "Scan in the same place each week. Steady photos make your progress easier to trust.",
  },
];

function checks(q: FaceQuality | null) {
  const face = !!q?.hasFace;
  return [
    {
      label: "Face found",
      ok: face,
      hint: face ? "We can see you" : "Bring your face into the oval",
    },
    {
      label: "Distance",
      ok: face && q?.position === "good",
      hint:
        q?.position === "toosmall"
          ? "Come a little closer"
          : q?.position === "outofboundary"
            ? "Center your face in the oval"
            : q?.position === "good"
              ? "Perfect distance"
              : "Hold the phone at arm's length",
    },
    {
      label: "Facing forward",
      ok: face && q?.frontal === "good",
      hint: q?.frontal === "good" ? "Lovely, straight on" : "Look straight at the camera, chin level",
    },
    {
      label: "Light",
      ok: face && (q?.lighting === "good" || q?.lighting === "ok"),
      hint:
        q?.lighting === "good"
          ? "Beautiful, even light"
          : q?.lighting === "ok"
            ? "Good enough. Brighter is even better"
            : "Turn toward a window or brighter light",
    },
  ];
}

export function FaceCapture({
  onCaptured,
  onBack,
}: {
  onCaptured: (photo: Blob) => void;
  onBack: () => void;
}) {
  const [status, setStatus] = useState<Status>("loading");
  const [simple, setSimple] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [quality, setQuality] = useState<FaceQuality | null>(null);
  const [photo, setPhoto] = useState<{ blob: Blob; url: string } | null>(null);
  const ymkRef = useRef<YMKApi | null>(null);
  const fileRef = useRef<HTMLInputElement>(null);

  const listenersRef = useRef<number[]>([]);

  const openRef = useRef(false);
  const startTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
  useEffect(() => () => void (startTimer.current && clearTimeout(startTimer.current)), []);
  const slotRef = useRef<HTMLDivElement>(null);

  // Move the kit's permanent mount node into this screen, and park it again on the way out.
  useLayoutEffect(() => {
    const el = cameraKitMount();
    el.className = "absolute inset-0";
    slotRef.current?.appendChild(el);
    return () => parkCameraKitMount(el);
  }, []);

  /**
   * Close the kit while its mount node still exists. The kit's close() finishes asynchronously
   * and touches #YMK-module, so we wait briefly before the screen unmounts.
   */
  const closeKit = useCallback(async () => {
    const YMK = ymkRef.current;
    if (!YMK || !openRef.current) return;
    openRef.current = false;
    try {
      YMK.close();
    } catch {
      /* already closed */
    }
    await new Promise((r) => setTimeout(r, 450));
  }, []);

  /** Wire events and open the camera once the kit has loaded. */
  const openKit = useCallback((YMK: YMKApi) => {
    ymkRef.current = YMK;
    listenersRef.current.forEach((id) => YMK.removeEventListener(id));
    listenersRef.current = [
      YMK.addEventListener("faceQualityChanged", (q) => setQuality(q as FaceQuality)),
      YMK.addEventListener("cameraOpened", () => setStatus("live")),
      YMK.addEventListener("loaded", () => setStatus("live")),
      YMK.addEventListener("cameraFailed", (code) => {
        setStatus("failed");
        setError(
          code === "error_permission_denied"
            ? "Camera access was blocked. Allow it in your browser settings, or upload a photo instead."
            : code === "error_resolution_unsupported"
              ? "This camera's resolution is too low for skin analysis. Try your phone, or upload a photo."
              : "We couldn't open your camera. You can upload a photo instead.",
        );
      }),
      YMK.addEventListener("faceDetectionCaptured", async (r) => {
        const img = (r as CapturedResult).images?.[0]?.image;
        if (!img) return;
        const blob = await toBlob(img);
        openRef.current = false;
        YMK.close();
        setPhoto({ blob, url: URL.createObjectURL(blob) });
      }),
    ];
    const frame = document.getElementById("capture-frame")?.clientWidth ?? 360;
    const width = Math.round(Math.min(480, Math.max(300, frame)));
    YMK.init({
      faceDetectionMode: "skincare",
      imageFormat: "base64",
      language: "enu",
      width,
      height: Math.round((width * 4) / 3),
    });
    openRef.current = true;
    // openCameraKit may reject (e.g. "error.no.camera") without firing cameraFailed.
    const opened = YMK.openCameraKit() as unknown;
    if (opened && typeof (opened as Promise<unknown>).catch === "function") {
      (opened as Promise<unknown>).catch(() => {
        setStatus("failed");
        setError("We couldn't find a camera on this device. You can upload a photo instead.");
      });
    }
    // The kit doesn't always restart after being closed (e.g. on retake). Don't spin forever.
    if (startTimer.current) clearTimeout(startTimer.current);
    startTimer.current = setTimeout(() => {
      setStatus((st) => {
        if (st !== "loading") return st;
        setError("The guided camera didn't start. Tap \"Use the simple camera\" below, or upload a photo.");
        return "failed";
      });
    }, 8000);
  }, []);

  const start = useCallback(
    () =>
      loadCameraKit()
        .then(openKit)
        .catch((e: Error) => {
          setStatus("failed");
          setError(`${e.message}. You can upload a photo instead.`);
        }),
    [openKit],
  );

  useEffect(() => {
    // The kit reports some failures (e.g. "error.no.camera") only as unhandled rejections.
    const onRejection = (e: PromiseRejectionEvent) => {
      if (typeof e.reason === "string" && e.reason.startsWith("error.")) {
        e.preventDefault();
        if (openRef.current) ymkRef.current?.close();
        openRef.current = false;
        setStatus("failed");
        setError(
          e.reason === "error.no.camera"
            ? "We couldn't find a camera on this device. You can upload a photo instead."
            : "Your camera couldn't start. You can upload a photo instead.",
        );
      }
    };
    window.addEventListener("unhandledrejection", onRejection);
    void start();
    return () => {
      const YMK = ymkRef.current;
      listenersRef.current.forEach((id) => YMK?.removeEventListener(id));
      listenersRef.current = [];
      if (openRef.current) YMK?.close();
      openRef.current = false;
      window.removeEventListener("unhandledrejection", onRejection);
    };
  }, [start]);

  const restart = () => {
    setStatus("loading");
    setError(null);
    setQuality(null);
    void start();
  };

  const retake = () => {
    if (photo) URL.revokeObjectURL(photo.url);
    setPhoto(null);
    restart();
  };

  const onFile = async (f?: File | null) => {
    if (!f) return;
    await closeKit();
    setPhoto({ blob: f, url: URL.createObjectURL(f) });
  };

  const list = checks(quality);
  const ready = list.every((c) => c.ok);

  return (
    <section className="mx-auto flex min-h-dvh max-w-md flex-col px-5 pb-10 pt-8">
      <div className="flex items-center justify-between">
        <button onClick={() => closeKit().then(onBack)} className="text-sm text-muted">
          ← Back
        </button>
        <span className="text-xs uppercase tracking-[0.25em] text-honey">Scan · Step 1 of 2</span>
      </div>

      <h2 className="mt-5 font-display text-3xl leading-tight">
        {photo ? (
          <>Looking <em className="text-sun">radiant.</em></>
        ) : (
          <>Let&apos;s get your <em className="text-sun">glow</em> in frame</>
        )}
      </h2>
      <p className="mt-2 text-sm text-muted">
        {photo
          ? "Check that your face is sharp and evenly lit, then continue."
          : simple
            ? "Face a light, fill the oval, then tap the button to take your photo."
            : "Hold still. We'll take the photo for you once everything looks right."}
      </p>

      <div
        id="capture-frame"
        className="relative mt-5 overflow-hidden rounded-[1.5rem] bg-cocoa ring-1 ring-mahogany"
        style={{ aspectRatio: "3 / 4" }}
      >
        {/* The kit's permanent #YMK-module node is moved in here (see cameraKitMount). */}
        <div ref={slotRef} className={`absolute inset-0 ${photo || simple ? "invisible" : ""}`} />
        {simple && !photo && (
          <SimpleCamera
            onCapture={(blob) => {
              setSimple(false);
              setPhoto({ blob, url: URL.createObjectURL(blob) });
            }}
          />
        )}
        {photo ? (
          // eslint-disable-next-line @next/next/no-img-element
          <img src={photo.url} alt="Your selfie" className="absolute inset-0 h-full w-full object-cover" />
        ) : simple ? null : (
          <>
            {status === "loading" && (
              <div className="absolute inset-0 flex flex-col items-center justify-center gap-3 text-sand">
                <span className="h-10 w-10 animate-spin rounded-full border-2 border-honey/30 border-t-honey" />
                <span className="text-sm">Warming up your camera…</span>
              </div>
            )}
            {status === "failed" && (
              <div className="absolute inset-0 flex flex-col items-center justify-center gap-4 p-8 text-center">
                <p className="text-sand">{error}</p>
                <button onClick={restart} className="rounded-full px-5 py-2 text-sm text-honey ring-1 ring-honey/50">
                  Try the camera again
                </button>
              </div>
            )}
            {status === "live" && (
              <div
                aria-hidden="true"
                className={`pointer-events-none absolute left-1/2 top-[46%] h-[62%] w-[66%] -translate-x-1/2 -translate-y-1/2 rounded-[50%] border-2 border-dashed transition-colors ${
                  ready ? "border-good" : "border-sun/70"
                }`}
              />
            )}
          </>
        )}
      </div>

      {!photo && (
        <button
          onClick={() => {
            if (simple) {
              setSimple(false);
              restart();
            } else void closeKit().then(() => setSimple(true));
          }}
          className="mt-3 w-full rounded-full py-2.5 text-sm font-semibold text-sand ring-1 ring-mahogany"
        >
          {simple ? "Use the guided camera" : "Can't see yourself? Use the simple camera"}
        </button>
      )}

      {photo ? (
        <div className="mt-6 grid grid-cols-2 gap-3">
          <button onClick={retake} className="rounded-full py-4 font-semibold text-sand ring-1 ring-mahogany">
            Retake
          </button>
          <button
            onClick={() => closeKit().then(() => onCaptured(photo.blob))}
            className="rounded-full bg-gradient-to-r from-honey to-sun py-4 font-semibold text-espresso"
          >
            Use this photo
          </button>
        </div>
      ) : (
        <>
          <button
            onClick={() => fileRef.current?.click()}
            className="mt-4 flex w-full items-center justify-center gap-2 rounded-full py-3.5 font-semibold text-sand ring-1 ring-mahogany transition active:scale-[0.98]"
          >
            <span aria-hidden="true">⤒</span> Upload a photo instead
          </button>
          <p className="mt-1.5 text-center text-[11px] text-muted">A clear, front-facing selfie in daylight works best.</p>
          <input
            ref={fileRef}
            type="file"
            accept="image/jpeg,image/png"
            className="hidden"
            onChange={(e) => {
              void onFile(e.target.files?.[0]);
              e.target.value = ""; // let the same photo be picked again
            }}
          />
          <ul className={`mt-5 grid grid-cols-2 gap-2 ${simple ? "hidden" : ""}`} aria-live="polite">
            {list.map((c) => (
              <li
                key={c.label}
                className={`rounded-2xl p-3 ring-1 transition-colors ${
                  c.ok ? "bg-good/10 ring-good/40" : "bg-cocoa/70 ring-mahogany"
                }`}
              >
                <div className="flex items-center gap-2 text-sm font-semibold">
                  <span className={`h-2.5 w-2.5 rounded-full ${c.ok ? "bg-good" : "bg-warn"}`} />
                  {c.label}
                </div>
                <p className="mt-1 text-xs leading-snug text-muted">{c.hint}</p>
              </li>
            ))}
          </ul>

          <details className="group mt-5 rounded-2xl bg-cocoa/60 p-4 ring-1 ring-mahogany" open>
            <summary className="cursor-pointer list-none font-semibold text-sand">
              Tips for your best scan <span className="float-right text-muted group-open:rotate-180">⌄</span>
            </summary>
            <ul className="mt-3 space-y-3">
              {TIPS.map((t) => (
                <li key={t.title} className="flex gap-3">
                  <span className="mt-0.5 text-honey" aria-hidden="true">{t.icon}</span>
                  <div>
                    <p className="text-sm font-semibold text-shea">{t.title}</p>
                    <p className="text-xs leading-relaxed text-muted">{t.body}</p>
                  </div>
                </li>
              ))}
            </ul>
          </details>

        </>
      )}
    </section>
  );
}
