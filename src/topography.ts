import * as ChriscoursesPerlinNoise from "@chriscourses/perlin-noise";

const canvas = document.getElementById(
  "res-canvas"
) as HTMLCanvasElement;

const ctx = canvas.getContext(
  "2d"
) as CanvasRenderingContext2D;

let width: number;
let height: number;

let cols: number;
let rows: number;

const res = 6;
const thresholdIncrement = 6;

let zOffset = 0;

let flowX = 0;
let flowY = 0;

let targetMouseX = -9999;
let targetMouseY = -9999;

let mouseX = -9999;
let mouseY = -9999;

let currentThreshold = 0;

let noiseMin = 100;
let noiseMax = 0;

const inputValues: number[][] = [];


window.addEventListener("mousemove", (e) => {
  targetMouseX = e.clientX;
  targetMouseY = e.clientY;
});

window.addEventListener("mouseleave", () => {
  targetMouseX = -9999;
  targetMouseY = -9999;
});

function resizeCanvas(): void {
  width = window.innerWidth;
  height = window.innerHeight;

  canvas.width = width;
  canvas.height = height;

  cols = Math.floor(width / res) + 1;
  rows = Math.floor(height / res) + 1;
}

window.addEventListener("resize", resizeCanvas);

resizeCanvas();

function generateNoise(): void {
  noiseMin = 100;
  noiseMax = 0;

  // smooth mouse interpolation
  mouseX += (targetMouseX - mouseX) * 0.05;
  mouseY += (targetMouseY - mouseY) * 0.05;

  for (let y = 0; y < rows; y++) {
    inputValues[y] = [];

    for (let x = 0; x < cols; x++) {
      const screenX = x * res;
      const screenY = y * res;

      const dx = screenX - mouseX;
      const dy = screenY - mouseY;

      const distance = Math.sqrt(dx * dx + dy * dy);

      // smooth localized influence
      let influence = 0;

      if (distance < 220) {
        influence =
          ((220 - distance) / 220) * 0.18;
      }

      const value =
        ChriscoursesPerlinNoise.noise(
          x * 0.009 + flowX + influence,
          y * 0.009 + flowY + influence,
          zOffset
        ) * 100;

      inputValues[y][x] = value;

      if (value < noiseMin) noiseMin = value;
      if (value > noiseMax) noiseMax = value;
    }
  }
}

function line(
  from: number[],
  to: number[]
): void {
  ctx.moveTo(from[0], from[1]);
  ctx.lineTo(to[0], to[1]);
}

function linInterpolate(
  x0: number,
  x1: number,
  y0 = 0,
  y1 = 1
): number {
  if (x0 === x1) return 0;

  return (
    y0 +
    ((y1 - y0) * (currentThreshold - x0)) /
      (x1 - x0)
  );
}

function binaryToType(
  nw: number,
  ne: number,
  se: number,
  sw: number
): number {
  return [nw, ne, se, sw].reduce(
    (res, x) => (res << 1) | x
  );
}

function placeLines(
  gridValue: number,
  x: number,
  y: number
): void {
  const nw = inputValues[y][x];
  const ne = inputValues[y][x + 1];
  const se = inputValues[y + 1][x + 1];
  const sw = inputValues[y + 1][x];

  let a: number[];
  let b: number[];
  let c: number[];
  let d: number[];

  switch (gridValue) {
    case 1:
    case 14:
      c = [
        x * res + res * linInterpolate(sw, se),
        y * res + res
      ];

      d = [
        x * res,
        y * res + res * linInterpolate(nw, sw)
      ];

      line(d, c);
      break;

    case 2:
    case 13:
      b = [
        x * res + res,
        y * res + res * linInterpolate(ne, se)
      ];

      c = [
        x * res + res * linInterpolate(sw, se),
        y * res + res
      ];

      line(b, c);
      break;

    case 3:
    case 12:
      b = [
        x * res + res,
        y * res + res * linInterpolate(ne, se)
      ];

      d = [
        x * res,
        y * res + res * linInterpolate(nw, sw)
      ];

      line(d, b);
      break;

    case 4:
    case 11:
      a = [
        x * res + res * linInterpolate(nw, ne),
        y * res
      ];

      b = [
        x * res + res,
        y * res + res * linInterpolate(ne, se)
      ];

      line(a, b);
      break;

    case 6:
    case 9:
      a = [
        x * res + res * linInterpolate(nw, ne),
        y * res
      ];

      c = [
        x * res + res * linInterpolate(sw, se),
        y * res + res
      ];

      line(c, a);
      break;

    case 7:
    case 8:
      a = [
        x * res + res * linInterpolate(nw, ne),
        y * res
      ];

      d = [
        x * res,
        y * res + res * linInterpolate(nw, sw)
      ];

      line(d, a);
      break;
  }
}

function renderAtThreshold(): void {
  ctx.beginPath();

  // stronger/more visible lines
  ctx.strokeStyle = "rgba(255,255,255,0.16)";
  ctx.lineWidth = 1.2;

  for (let y = 0; y < rows - 1; y++) {
    for (let x = 0; x < cols - 1; x++) {
      const gridValue = binaryToType(
        inputValues[y][x] > currentThreshold ? 1 : 0,
        inputValues[y][x + 1] > currentThreshold ? 1 : 0,
        inputValues[y + 1][x + 1] > currentThreshold ? 1 : 0,
        inputValues[y + 1][x] > currentThreshold ? 1 : 0
      );

      placeLines(gridValue, x, y);
    }
  }

  ctx.stroke();
}

function animate(): void {
  ctx.clearRect(0, 0, width, height);

  // slow organic evolution
  zOffset += 0.00008;

  // subtle directional flow
  flowX += 0.00004;
  flowY += 0.00002;

  generateNoise();

  const roundedNoiseMin =
    Math.floor(noiseMin / thresholdIncrement) *
    thresholdIncrement;

  const roundedNoiseMax =
    Math.ceil(noiseMax / thresholdIncrement) *
    thresholdIncrement;

  for (
    let threshold = roundedNoiseMin;
    threshold < roundedNoiseMax;
    threshold += thresholdIncrement
  ) {
    currentThreshold = threshold;

    renderAtThreshold();
  }

  requestAnimationFrame(animate);
}

animate();