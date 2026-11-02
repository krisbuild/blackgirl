"use client";

type Source = { draw: CanvasImageSource; width: number; height: number; done: () => void };

/** Decode a photo; falls back to <img> where createImageBitmap or its options aren't supported (older iOS Safari). */
async function decode(input: Blob): Promise<Source> {
  try {
    const bmp = await createImageBitmap(input, { imageOrientation: "from-image" });
    return { draw: bmp, width: bmp.width, height: bmp.height, done: () => bmp.close() };
  } catch {
    const url = URL.createObjectURL(input);
    const img = new Image();
    img.src = url;
    await img.decode();
    return { draw: img, width: img.naturalWidth, height: img.naturalHeight, done: () => URL.revokeObjectURL(url) };
  }
}

async function toJpeg(src: Source, sx: number, sy: number, sw: number, sh: number, maxLong = 2048) {
  const scale = Math.min(1, maxLong / Math.max(sw, sh));
  const width = Math.round(sw * scale);
  const height = Math.round(sh * scale);
  const canvas = document.createElement("canvas");
  canvas.width = width;
  canvas.height = height;
  canvas.getContext("2d")!.drawImage(src.draw, sx, sy, sw, sh, 0, 0, width, height);
  const blob = await new Promise<Blob>((res, rej) =>
    canvas.toBlob((b) => (b ? res(b) : rej(new Error("Couldn't process the photo"))), "image/jpeg", 0.9),
  );
  return { blob, width, height };
}

/**
 * Normalise a captured/uploaded photo for YouCam skin analysis:
 * JPEG, long side <= 2048 px, short side >= 480 px, < 10 MB.
 */
export async function prepareForAnalysis(input: Blob): Promise<{ blob: Blob; width: number; height: number }> {
  const src = await decode(input);
  try {
    if (Math.min(src.width, src.height) < 480) {
      throw new Error("This photo is too small for skin analysis. Please use one at least 480 pixels on its shortest side.");
    }
    return await toJpeg(src, 0, 0, src.width, src.height);
  } finally {
    src.done();
  }
}

/**
 * Zoom in on the centre of a selfie (3:4 crop, 62% of the width) so the face fills more of the
 * frame. Used once automatically when YouCam says the face is too small.
 */
export async function zoomToFace(input: Blob): Promise<{ blob: Blob; width: number; height: number }> {
  const src = await decode(input);
  try {
    const sw = Math.round(src.width * 0.62);
    const sh = Math.min(src.height, Math.round((sw * 4) / 3));
    const sx = Math.round((src.width - sw) / 2);
    const sy = Math.max(0, Math.min(src.height - sh, Math.round(src.height * 0.44 - sh / 2)));
    return await toJpeg(src, sx, sy, sw, sh);
  } finally {
    src.done();
  }
}
