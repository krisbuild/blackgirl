"use client";

/**
 * Loader and types for the YouCam JS Camera Kit (v2.2).
 * Docs: https://yce.perfectcorp.com/document/index.html#tag/JS-Camera-Kit
 * The kit does real-time face detection and quality checks (distance, angle, lighting)
 * and captures automatically once the photo is good enough for skin analysis.
 */

export const CAMERA_KIT_SRC = "https://plugins-media.makeupar.com/v2.2-camera-kit/sdk.js";

export type FaceQuality = {
  hasFace: boolean;
  position?: "good" | "notgood" | "toosmall" | "outofboundary";
  frontal?: "good" | "notgood";
  lighting?: "good" | "ok" | "notgood";
};

export type CapturedResult = {
  mode: string;
  images: Array<{ phase: number; image: string | Blob; width: number; height: number }>;
};

type Listener = (payload: unknown) => void;

export interface YMKApi {
  init(args?: Record<string, unknown>): void;
  openCameraKit(): void;
  close(): void;
  pause(): void;
  resume(restartWebcam?: boolean): void;
  addEventListener(event: string, cb: Listener): number;
  removeEventListener(id: number): void;
}

declare global {
  interface Window {
    YMK?: YMKApi;
    ymkAsyncInit?: () => void;
  }
}

let loading: Promise<YMKApi> | null = null;

/** Load the SDK once. Resolves when window.ymkAsyncInit fires. */
export function loadCameraKit(timeoutMs = 20_000): Promise<YMKApi> {
  if (typeof window === "undefined") return Promise.reject(new Error("browser only"));
  if (window.YMK) return Promise.resolve(window.YMK);
  if (loading) return loading;

  loading = new Promise<YMKApi>((resolve, reject) => {
    const timer = setTimeout(() => {
      loading = null;
      reject(new Error("Camera Kit took too long to load"));
    }, timeoutMs);
    window.ymkAsyncInit = () => {
      clearTimeout(timer);
      if (window.YMK) resolve(window.YMK);
      else reject(new Error("Camera Kit loaded without YMK"));
    };
    const s = document.createElement("script");
    s.src = CAMERA_KIT_SRC;
    s.async = true;
    s.onerror = () => {
      clearTimeout(timer);
      loading = null;
      reject(new Error("Couldn't load Camera Kit"));
    };
    document.body.appendChild(s);
  });
  return loading;
}

/** Convert the kit's base64 output (data URL or bare base64) into a JPEG/PNG Blob. */
export async function toBlob(image: string | Blob): Promise<Blob> {
  if (image instanceof Blob) return image;
  const dataUrl = image.startsWith("data:") ? image : `data:image/jpeg;base64,${image}`;
  return (await fetch(dataUrl)).blob();
}
