"use client";

import { useEffect, useRef, useState } from "react";

/**
 * Backup camera: a plain live preview with a shutter button, for devices where the YouCam
 * Camera Kit can't show the feed. No automatic quality checks; the analysis afterwards is the same.
 */
export function SimpleCamera({ onCapture }: { onCapture: (photo: Blob) => void }) {
  const videoRef = useRef<HTMLVideoElement>(null);
  const [error, setError] = useState<string | null>(null);
  const [ready, setReady] = useState(false);

  useEffect(() => {
    let stream: MediaStream | null = null;
    let cancelled = false;
    navigator.mediaDevices
      ?.getUserMedia({ video: { facingMode: "user", width: { ideal: 1920 }, height: { ideal: 1440 } }, audio: false })
      .then((s) => {
        if (cancelled) return s.getTracks().forEach((t) => t.stop());
        stream = s;
        const v = videoRef.current;
        if (v) {
          v.srcObject = s;
          v.onloadedmetadata = () => {
            void v.play();
            setReady(true);
          };
        }
      })
      .catch((e: Error) =>
        setError(
          e.name === "NotAllowedError"
            ? "Camera access is blocked. Allow it in your browser settings."
            : e.name === "NotReadableError"
              ? "Another app is using your camera. Close it and try again."
              : "We couldn't open your camera.",
        ),
      );
    return () => {
      cancelled = true;
      stream?.getTracks().forEach((t) => t.stop());
    };
  }, []);

  const snap = () => {
    const v = videoRef.current;
    if (!v || !v.videoWidth) return;
    const c = document.createElement("canvas");
    c.width = v.videoWidth;
    c.height = v.videoHeight;
    const ctx = c.getContext("2d")!;
    // save the photo un-mirrored (the preview is mirrored like a mirror)
    ctx.drawImage(v, 0, 0);
    c.toBlob((b) => b && onCapture(b), "image/jpeg", 0.92);
  };

  return (
    <div className="absolute inset-0 bg-black">
      <video ref={videoRef} playsInline muted className="h-full w-full -scale-x-100 object-cover" />
      {!ready && !error && <p className="absolute inset-0 flex items-center justify-center text-sm text-sand">Opening camera…</p>}
      {error && <p className="absolute inset-0 flex items-center justify-center p-8 text-center text-sm text-sand">{error}</p>}
      <div
        aria-hidden="true"
        className="pointer-events-none absolute left-1/2 top-[46%] h-[62%] w-[66%] -translate-x-1/2 -translate-y-1/2 rounded-[50%] border-2 border-dashed border-sun/70"
      />
      {ready && (
        <button
          onClick={snap}
          aria-label="Take photo"
          className="absolute bottom-5 left-1/2 h-16 w-16 -translate-x-1/2 rounded-full border-4 border-white bg-white/30 shadow-lg backdrop-blur active:scale-95"
        />
      )}
      <p className="pointer-events-none absolute inset-x-0 top-3 text-center text-[11px] font-semibold text-shea drop-shadow">
        Face a light · fill the oval · look straight
      </p>
    </div>
  );
}
