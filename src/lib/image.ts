"use client";

/**
 * Normalise a captured/uploaded photo for YouCam SD skin analysis:
 * JPEG, long side <= 2048 px, short side >= 480 px, < 10 MB.
 */
export async function prepareForAnalysis(input: Blob): Promise<{ blob: Blob; width: number; height: number }> {
  const bmp = await createImageBitmap(input, { imageOrientation: "from-image" });
  const short = Math.min(bmp.width, bmp.height);
  if (short < 480) {
    bmp.close();
    throw new Error("This photo is too small for skin analysis. Please use one at least 480 pixels on its shortest side.");
  }
  const scale = Math.min(1, 2048 / Math.max(bmp.width, bmp.height));
  const width = Math.round(bmp.width * scale);
  const height = Math.round(bmp.height * scale);
  const canvas = document.createElement("canvas");
  canvas.width = width;
  canvas.height = height;
  canvas.getContext("2d")!.drawImage(bmp, 0, 0, width, height);
  bmp.close();
  const blob = await new Promise<Blob>((res, rej) =>
    canvas.toBlob((b) => (b ? res(b) : rej(new Error("Couldn't process the photo"))), "image/jpeg", 0.9),
  );
  return { blob, width, height };
}
