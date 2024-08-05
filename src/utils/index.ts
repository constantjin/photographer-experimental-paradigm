/* eslint-disable prefer-const */
export function delay(ms: number) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

export function jitter(baseInMs: number, ratio: number) {
  const min = Math.ceil(baseInMs - ratio * baseInMs);
  const max = Math.floor(baseInMs + ratio * baseInMs);
  return Math.floor(Math.random() * (max - min + 1) + min);
}

// normalizedImageBuffer() is from https://github.com/josephrocca/openai-clip-js/commits/main/onnx-image-demo.html
// MIT License

// Copyright (c) 2021 josephrocca

// Permission is hereby granted, free of charge, to any person obtaining a copy
// of this software and associated documentation files (the "Software"), to deal
// in the Software without restriction, including without limitation the rights
// to use, copy, modify, merge, publish, distribute, sublicense, and/or sell
// copies of the Software, and to permit persons to whom the Software is
// furnished to do so, subject to the following conditions:

// The above copyright notice and this permission notice shall be included in all
// copies or substantial portions of the Software.

// THE SOFTWARE IS PROVIDED "AS IS", WITHOUT WARRANTY OF ANY KIND, EXPRESS OR
// IMPLIED, INCLUDING BUT NOT LIMITED TO THE WARRANTIES OF MERCHANTABILITY,
// FITNESS FOR A PARTICULAR PURPOSE AND NONINFRINGEMENT. IN NO EVENT SHALL THE
// AUTHORS OR COPYRIGHT HOLDERS BE LIABLE FOR ANY CLAIM, DAMAGES OR OTHER
// LIABILITY, WHETHER IN AN ACTION OF CONTRACT, TORT OR OTHERWISE, ARISING FROM,
// OUT OF OR IN CONNECTION WITH THE SOFTWARE OR THE USE OR OTHER DEALINGS IN THE
// SOFTWARE.

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
