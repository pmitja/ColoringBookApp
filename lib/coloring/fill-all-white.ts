export interface FillRgb {
  r: number;
  g: number;
  b: number;
}

export interface FillPoint {
  x: number;
  y: number;
}

interface FillRegionOptions {
  tolerance?: number;
  outlineThreshold?: number;
}

function clampByte(value: number) {
  if (value < 0) return 0;
  if (value > 255) return 255;
  return Math.round(value);
}

function isOutlinePixel(r: number, g: number, b: number, a: number, threshold: number) {
  if (a === 0) return false;

  const max = Math.max(r, g, b);
  const min = Math.min(r, g, b);
  const brightness = (r + g + b) / 3;
  const saturation = max - min;

  return brightness <= threshold && saturation <= 35;
}

export function isNearWhite(
  r: number,
  g: number,
  b: number,
  brightMin = 235,
  satMax = 25,
) {
  const max = Math.max(r, g, b);
  const min = Math.min(r, g, b);
  const brightness = (r + g + b) / 3;
  const saturation = max - min;

  return brightness >= brightMin && saturation <= satMax;
}

export function fillAllWhite(
  canvas: HTMLCanvasElement,
  fillRgb: FillRgb,
  threshold = 240,
) {
  const ctx = canvas.getContext("2d", { willReadFrequently: true });
  if (!ctx) return 0;

  const width = canvas.width;
  const height = canvas.height;
  if (width === 0 || height === 0) return 0;

  const imageData = ctx.getImageData(0, 0, width, height);
  const data = imageData.data;

  const fr = clampByte(fillRgb.r);
  const fg = clampByte(fillRgb.g);
  const fb = clampByte(fillRgb.b);
  let changedPixels = 0;

  for (let i = 0; i < data.length; i += 4) {
    const r = data[i];
    const g = data[i + 1];
    const b = data[i + 2];
    const a = data[i + 3];

    if (a === 0) continue;

    if (!isNearWhite(r, g, b, threshold, 25)) continue;
    if (r === fr && g === fg && b === fb) continue;

    data[i] = fr;
    data[i + 1] = fg;
    data[i + 2] = fb;
    changedPixels += 1;
  }

  ctx.putImageData(imageData, 0, 0);
  return changedPixels;
}

export function fillRegionAtPoint(
  canvas: HTMLCanvasElement,
  point: FillPoint,
  fillRgb: FillRgb,
  options: FillRegionOptions = {},
) {
  const ctx = canvas.getContext("2d", { willReadFrequently: true });
  if (!ctx) return 0;

  const width = canvas.width;
  const height = canvas.height;
  if (width === 0 || height === 0) return 0;

  const px = Math.floor(point.x);
  const py = Math.floor(point.y);
  if (px < 0 || py < 0 || px >= width || py >= height) return 0;

  const tolerance = options.tolerance ?? 28;
  const outlineThreshold = options.outlineThreshold ?? 108;
  const toleranceSquared = tolerance * tolerance;

  const imageData = ctx.getImageData(0, 0, width, height);
  const data = imageData.data;

  const startIndex = py * width + px;
  const startOffset = startIndex * 4;
  const targetR = data[startOffset];
  const targetG = data[startOffset + 1];
  const targetB = data[startOffset + 2];
  const targetA = data[startOffset + 3];

  if (targetA === 0) return 0;
  if (isOutlinePixel(targetR, targetG, targetB, targetA, outlineThreshold)) {
    return 0;
  }

  const fr = clampByte(fillRgb.r);
  const fg = clampByte(fillRgb.g);
  const fb = clampByte(fillRgb.b);

  if (targetR === fr && targetG === fg && targetB === fb) {
    return 0;
  }

  const visited = new Uint8Array(width * height);
  const queue = new Int32Array(width * height);
  let head = 0;
  let tail = 0;
  let changedPixels = 0;

  const enqueue = (index: number) => {
    if (visited[index]) return;
    visited[index] = 1;
    queue[tail] = index;
    tail += 1;
  };

  const isWithinTargetRange = (index: number) => {
    const offset = index * 4;
    const r = data[offset];
    const g = data[offset + 1];
    const b = data[offset + 2];
    const a = data[offset + 3];

    if (a === 0) return false;
    if (isOutlinePixel(r, g, b, a, outlineThreshold)) return false;

    const dr = r - targetR;
    const dg = g - targetG;
    const db = b - targetB;
    return dr * dr + dg * dg + db * db <= toleranceSquared;
  };

  enqueue(startIndex);

  while (head < tail) {
    const currentIndex = queue[head];
    head += 1;

    if (!isWithinTargetRange(currentIndex)) continue;

    const offset = currentIndex * 4;
    data[offset] = fr;
    data[offset + 1] = fg;
    data[offset + 2] = fb;
    changedPixels += 1;

    const x = currentIndex % width;
    const y = (currentIndex / width) | 0;

    if (x > 0) enqueue(currentIndex - 1);
    if (x < width - 1) enqueue(currentIndex + 1);
    if (y > 0) enqueue(currentIndex - width);
    if (y < height - 1) enqueue(currentIndex + width);
  }

  if (changedPixels > 0) {
    ctx.putImageData(imageData, 0, 0);
  }

  return changedPixels;
}
