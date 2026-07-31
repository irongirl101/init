import * as ChriscoursesPerlinNoise from "@chriscourses/perlin-noise";
import "../assets/css/main.css";
import "../assets/css/syntax.css";

const canvas = document.getElementById("res-canvas") as HTMLCanvasElement;
const ctx = canvas.getContext("2d") as CanvasRenderingContext2D;

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

// Eased coordinates for the spider web center
let webCenterX = 0;
let webCenterY = 0;

let currentThreshold = 0;
let noiseMin = 100;
let noiseMax = 0;
const inputValues: number[][] = [];

// Spiderman mode transition variables
const timelineSection = document.getElementById("timeline-section");
let targetSpideyFactor = 0;
let currentSpideyFactor = 0;

// Dynamic background color blending values
let startR = 4;
let startG = 36;
let startB = 28;

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

function updateSpideyFactor() {
  if (!timelineSection) {
    targetSpideyFactor = 0;
    return;
  }
  const rect = timelineSection.getBoundingClientRect();
  const viewportHeight = window.innerHeight;
  
  // The timeline section is active in the upper half of the screen
  const isActive = rect.top < viewportHeight * 0.4 && rect.bottom > 0;
  
  if (isActive) {
    // Start fading in web when top of timeline crosses 40% of viewport height
    // Reach full intensity when top of timeline is at 10% of viewport height
    const startFade = viewportHeight * 0.4;
    const endFade = viewportHeight * 0.1;
    
    let factor = 0;
    if (rect.top <= endFade) {
      factor = 1.0;
    } else if (rect.top < startFade) {
      factor = (startFade - rect.top) / (startFade - endFade);
    }
    targetSpideyFactor = factor;
  } else {
    targetSpideyFactor = 0;
  }
}

function generateNoise(): void {
  noiseMin = 100;
  noiseMax = 0;

  // Smooth mouse interpolation for topography influence
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

      let influence = 0;
      if (distance < 220) {
        influence = ((220 - distance) / 220) * 0.18;
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

function line(from: number[], to: number[]): void {
  ctx.moveTo(from[0], from[1]);
  ctx.lineTo(to[0], to[1]);
}

function linInterpolate(x0: number, x1: number, y0 = 0, y1 = 1): number {
  if (x0 === x1) return 0;
  return y0 + ((y1 - y0) * (currentThreshold - x0)) / (x1 - x0);
}

function binaryToType(nw: number, ne: number, se: number, sw: number): number {
  return [nw, ne, se, sw].reduce((res, x) => (res << 1) | x);
}

function placeLines(gridValue: number, x: number, y: number): void {
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
      c = [x * res + res * linInterpolate(sw, se), y * res + res];
      d = [x * res, y * res + res * linInterpolate(nw, sw)];
      line(d, c);
      break;

    case 2:
    case 13:
      b = [x * res + res, y * res + res * linInterpolate(ne, se)];
      c = [x * res + res * linInterpolate(sw, se), y * res + res];
      line(b, c);
      break;

    case 3:
    case 12:
      b = [x * res + res, y * res + res * linInterpolate(ne, se)];
      d = [x * res, y * res + res * linInterpolate(nw, sw)];
      line(d, b);
      break;

    case 4:
    case 11:
      a = [x * res + res * linInterpolate(nw, ne), y * res];
      b = [x * res + res, y * res + res * linInterpolate(ne, se)];
      line(a, b);
      break;

    case 6:
    case 9:
      a = [x * res + res * linInterpolate(nw, ne), y * res];
      c = [x * res + res * linInterpolate(sw, se), y * res + res];
      line(c, a);
      break;

    case 7:
    case 8:
      a = [x * res + res * linInterpolate(nw, ne), y * res];
      d = [x * res, y * res + res * linInterpolate(nw, sw)];
      line(d, a);
      break;
  }
}

function renderTopography(opacity: number): void {
  if (opacity <= 0.01) return;
  
  ctx.beginPath();
  ctx.strokeStyle = `rgba(255, 255, 255, ${0.15 * opacity})`;
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

function renderSpiderWeb(opacity: number): void {
  if (opacity <= 0.01) return;

  const numRadials = 12;
  const angleStep = (Math.PI * 2) / numRadials;
  const maxDist = Math.max(width, height);
  const time = Date.now() * 0.0008;

  // 1. Draw radial threads from web center
  ctx.beginPath();
  for (let j = 0; j < numRadials; j++) {
    const angle = j * angleStep;
    const x = webCenterX + Math.cos(angle) * maxDist;
    const y = webCenterY + Math.sin(angle) * maxDist;
    ctx.moveTo(webCenterX, webCenterY);
    ctx.lineTo(x, y);
  }
  
  const radGrad = ctx.createRadialGradient(
    webCenterX, webCenterY, 5,
    webCenterX, webCenterY, maxDist * 0.6
  );
  radGrad.addColorStop(0, `rgba(255, 255, 255, ${0.45 * opacity})`);
  radGrad.addColorStop(0.2, `rgba(0, 85, 255, ${0.2 * opacity})`);
  radGrad.addColorStop(0.5, `rgba(230, 36, 41, ${0.08 * opacity})`);
  radGrad.addColorStop(1, "rgba(0, 0, 0, 0)");

  ctx.strokeStyle = radGrad;
  ctx.lineWidth = 1;
  ctx.stroke();

  // 2. Draw concentric rings with saggy curves
  const numLayers = 8;
  ctx.beginPath();
  for (let i = 1; i <= numLayers; i++) {
    const r = i * ((maxDist * 0.4) / numLayers);

    for (let j = 0; j <= numRadials; j++) {
      const angle1 = j * angleStep;
      const angle2 = (j + 1) * angleStep;

      // Slight wavy movement based on time
      const w1 = Math.sin(angle1 * 3 + time) * 5;
      const w2 = Math.sin(angle2 * 3 + time) * 5;

      const r1 = r + w1;
      const r2 = r + w2;

      const x1 = webCenterX + Math.cos(angle1) * r1;
      const y1 = webCenterY + Math.sin(angle1) * r1;

      const x2 = webCenterX + Math.cos(angle2) * r2;
      const y2 = webCenterY + Math.sin(angle2) * r2;

      if (j === 0) {
        ctx.moveTo(x1, y1);
      }

      // Calculate sagging control point
      const midX = (x1 + x2) / 2;
      const midY = (y1 + y2) / 2;
      const controlX = midX + (webCenterX - midX) * 0.16;
      const controlY = midY + (webCenterY - midY) * 0.16;

      ctx.quadraticCurveTo(controlX, controlY, x2, y2);
    }
  }
  ctx.strokeStyle = `rgba(255, 255, 255, ${0.16 * opacity})`;
  ctx.lineWidth = 0.8;
  ctx.stroke();

  // 3. Draw active threads connecting the web center to visible timeline nodes
  const nodes = document.querySelectorAll(".timeline-node");
  nodes.forEach((node) => {
    const rect = node.getBoundingClientRect();
    const nodeX = rect.left + rect.width / 2;
    const nodeY = rect.top + rect.height / 2;

    // Connect if node is visible on viewport
    if (nodeY > -50 && nodeY < height + 50) {
      const midX = (webCenterX + nodeX) / 2;
      const midY = (webCenterY + nodeY) / 2;

      // Dynamic control point representing gravity sag + scroll inertia sway
      const sway = Math.sin(time * 2.5 + nodeY) * 10;
      const controlX = midX + sway;
      const controlY = midY + 25; // Droop down

      // Core white web line
      ctx.beginPath();
      ctx.moveTo(webCenterX, webCenterY);
      ctx.quadraticCurveTo(controlX, controlY, nodeX, nodeY);
      ctx.strokeStyle = `rgba(255, 255, 255, ${0.35 * opacity})`;
      ctx.lineWidth = 1.1;
      ctx.stroke();

      // Secondary glowing blue core
      ctx.beginPath();
      ctx.moveTo(webCenterX, webCenterY);
      ctx.quadraticCurveTo(controlX - sway * 0.2, controlY - 5, nodeX, nodeY);
      ctx.strokeStyle = `rgba(0, 85, 255, ${0.18 * opacity})`;
      ctx.lineWidth = 0.7;
      ctx.stroke();
    }
  });
}

function animate(): void {
  ctx.clearRect(0, 0, width, height);

  // Background organic slow evolution
  zOffset += 0.00008;
  flowX += 0.00004;
  flowY += 0.00002;

  // Update target spidey factor based on scroll / viewport
  updateSpideyFactor();
  currentSpideyFactor += (targetSpideyFactor - currentSpideyFactor) * 0.07;

  // Interpolate body background color based on spidey active level
  const targetR = 8;
  const targetG = 9;
  const targetB = 17;
  const r = Math.round(startR * (1 - currentSpideyFactor) + targetR * currentSpideyFactor);
  const g = Math.round(startG * (1 - currentSpideyFactor) + targetG * currentSpideyFactor);
  const b = Math.round(startB * (1 - currentSpideyFactor) + targetB * currentSpideyFactor);

  document.body.style.backgroundColor = `rgb(${r}, ${g}, ${b})`;
  
  const glassNavbar = document.querySelector(".glass-navbar") as HTMLElement;
  if (glassNavbar) {
    glassNavbar.style.setProperty("--navbar-bg-rgb", `${r}, ${g}, ${b}`);
  }

  // Check if mouse is within timelineSection bounds
  let isMouseInTimeline = false;
  if (timelineSection && targetMouseX !== -9999) {
    const rect = timelineSection.getBoundingClientRect();
    if (
      targetMouseX >= rect.left &&
      targetMouseX <= rect.right &&
      targetMouseY >= rect.top &&
      targetMouseY <= rect.bottom
    ) {
      isMouseInTimeline = true;
    }
  }

  // Smooth web center coordinates
  if (!isMouseInTimeline) {
    // When mouse is off-screen or not in the timeline, hover in a circular wind pattern
    const time = Date.now() * 0.0008;
    const hoverX = width / 2 + Math.sin(time) * 140;
    const hoverY = height / 2 + Math.cos(time * 0.8) * 90;
    webCenterX += (hoverX - webCenterX) * 0.05;
    webCenterY += (hoverY - webCenterY) * 0.05;
  } else {
    // Follow the cursor
    webCenterX += (targetMouseX - webCenterX) * 0.08;
    webCenterY += (targetMouseY - webCenterY) * 0.08;
  }

  // Draw topographic contours
  generateNoise();
  const roundedNoiseMin = Math.floor(noiseMin / thresholdIncrement) * thresholdIncrement;
  const roundedNoiseMax = Math.ceil(noiseMax / thresholdIncrement) * thresholdIncrement;

  for (
    let threshold = roundedNoiseMin;
    threshold < roundedNoiseMax;
    threshold += thresholdIncrement
  ) {
    currentThreshold = threshold;
    renderTopography(1 - currentSpideyFactor);
  }

  // Draw interactive spider web
  renderSpiderWeb(currentSpideyFactor);

  // "Leap of Faith" Silhouette Scroll Animation
  const silhouette = document.getElementById("spidey-silhouette");
  if (silhouette && timelineSection) {
    const rect = timelineSection.getBoundingClientRect();
    const viewportHeight = window.innerHeight;
    
    // Calculate scroll progress through the timeline section
    // 0.0 means the timeline section just started entering the screen from the bottom
    // 1.0 means the timeline section has scrolled off the screen at the top
    const totalDist = rect.height + viewportHeight;
    const currentDist = viewportHeight - rect.top;
    const progress = Math.max(0, Math.min(1, currentDist / totalDist));
    
    // Map progress to y-position: from 115vh (below screen) to -35vh (above screen)
    // Since it's "falling upwards", it rises as we scroll down (progress increases)
    const startY = 115; 
    const endY = -35;   
    const yPos = startY + (endY - startY) * progress;
    
    silhouette.style.top = `${yPos}vh`;
    
    // Fade in/out at the boundaries to make it smooth
    let opacity = currentSpideyFactor;
    if (progress < 0.12) {
      opacity *= (progress / 0.12);
    } else if (progress > 0.88) {
      opacity *= ((1 - progress) / 0.12);
    }
    
    silhouette.style.opacity = `${opacity}`;
    
    // Add a gentle wind sway / rotation based on time
    const time = Date.now() * 0.002;
    const sway = Math.sin(time) * 4;
    silhouette.style.transform = `translateX(-50%) rotate(${sway}deg) scale(0.95)`;
  }

  requestAnimationFrame(animate);
}

animate();