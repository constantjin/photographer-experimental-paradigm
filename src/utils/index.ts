export function delay(ms: number) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

export function jitter(baseInMs: number, ratio: number) {
  const min = Math.ceil(baseInMs - ratio * baseInMs);
  const max = Math.floor(baseInMs + ratio * baseInMs);
  return Math.floor(Math.random() * (max - min + 1) + min);
}

 // Reference: https://github.com/josephrocca/openai-clip-js/commits/main/onnx-image-demo.html
export async function noramlizeImageBuffer(inputBuffer: Uint8Array) {
  const blobFromBuffer = new Blob([inputBuffer], { type: "image/png" });
  const img = await createImageBitmap(blobFromBuffer);
  let canvas = new OffscreenCanvas(224, 224);
  let ctx = canvas.getContext("2d");
  if (!ctx) {
    throw "[normalizeImageBuffer] Error: Cannot get a canvas context.";
  }

  ctx.drawImage(img, 0, 0, canvas.width, canvas.height);
  const imageData = ctx.getImageData(0, 0, canvas.width, canvas.height);

  let rgbData: number[][][] = [[], [], []]; // [r, g, b]
  // remove alpha and put into correct shape:
  let d = imageData.data;
  for (let i = 0; i < d.length; i += 4) {
    let x = (i / 4) % canvas.width;
    let y = Math.floor(i / 4 / canvas.width);
    if (!rgbData[0][y]) rgbData[0][y] = [];
    if (!rgbData[1][y]) rgbData[1][y] = [];
    if (!rgbData[2][y]) rgbData[2][y] = [];
    rgbData[0][y][x] = d[i + 0] / 255;
    rgbData[1][y][x] = d[i + 1] / 255;
    rgbData[2][y][x] = d[i + 2] / 255;
    // From CLIP repo: Normalize(mean=(0.48145466, 0.4578275, 0.40821073), std=(0.26862954, 0.26130258, 0.27577711))
    rgbData[0][y][x] = (rgbData[0][y][x] - 0.48145466) / 0.26862954;
    rgbData[1][y][x] = (rgbData[1][y][x] - 0.4578275) / 0.26130258;
    rgbData[2][y][x] = (rgbData[2][y][x] - 0.40821073) / 0.27577711;
  }
  const normalizedRgbData = Float32Array.from(rgbData.flat().flat());
  return normalizedRgbData;
}

const dot = (a: Float32Array, b: Float32Array) =>
    a.map((x, i) => a[i] * b[i]).reduce((m, n) => m + n);

export const cosineSimilarity = (a: Float32Array, b: Float32Array) => {
  const norm = (x: Float32Array) => {
    return Math.sqrt(dot(x, x));
  };

  return dot(a, b) / norm(a) / norm(b);
};

export async function base64ToBlob(base64Input: string) {
  return await (await fetch(base64Input)).blob();
}