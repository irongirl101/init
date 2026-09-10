import * as ChriscoursesPerlinNoise from "@chriscourses/perlin-noise";
import "../assets/css/main.css";
import "../assets/css/syntax.css";
import { initMuseumMaze } from "./museum-maze";

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

// Interactive background spider-web lattice grid
interface WebPoint {
  origX: number;
  origY: number;
  x: number;
  y: number;
  vx: number;
  vy: number;
}

let webGrid: WebPoint[][] = [];
const webSpacing = 50;

function initWebPattern(): void {
  webGrid = [];
  const webCols = Math.ceil(width / webSpacing) + 2;
  const webRows = Math.ceil(height / webSpacing) + 2;

  for (let r = 0; r <= webRows; r++) {
    const row: WebPoint[] = [];
    const isOdd = r % 2 === 1;
    for (let c = 0; c <= webCols; c++) {
      const offsetX = isOdd ? webSpacing * 0.5 : 0;
      const ox = (c - 1) * webSpacing + offsetX;
      const oy = (r - 1) * webSpacing;
      row.push({
        origX: ox,
        origY: oy,
        x: ox,
        y: oy,
        vx: 0,
        vy: 0,
      });
    }
    webGrid.push(row);
  }
}

let currentThreshold = 0;
let noiseMin = 100;
let noiseMax = 0;
const inputValues: number[][] = [];

// Spiderman mode transition variables
const timelineSection = document.getElementById("timeline-section");
let targetSpideyFactor = 0;
let currentSpideyFactor = 0;
let spideyWebY = 30;

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

  initWebPattern();
}

window.addEventListener("resize", resizeCanvas);
resizeCanvas();

function updateSpideyFactor() {
  if (!timelineSection) {
    targetSpideyFactor = 0;
    return;
  }
  const rect = timelineSection.getBoundingClientRect();
  const vh = window.innerHeight;
  const scrollY = window.scrollY || window.pageYOffset || document.documentElement.scrollTop;

  // If near the top of the page (Hero section) or timeline hasn't entered viewport
  if (scrollY < 120 || rect.top > vh * 0.65) {
    targetSpideyFactor = 0;
    return;
  }

  // If timeline section has scrolled off the top of the screen (e.g. past timeline)
  if (rect.bottom < 60) {
    targetSpideyFactor = 0;
    return;
  }

  // Timeline is in view: calculate smooth progressive fade-in and fade-out
  let factor = 1.0;
  if (rect.top > vh * 0.25) {
    // Entering from bottom
    factor = (vh * 0.65 - rect.top) / (vh * 0.4);
  } else if (rect.bottom < vh * 0.45) {
    // Exiting towards top
    factor = Math.max(0, (rect.bottom - 60) / (vh * 0.35));
  }

  targetSpideyFactor = Math.max(0, Math.min(1, factor));
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

function renderWebPattern(opacity: number, isMouseInTimeline: boolean): void {
  if (opacity <= 0.01 || webGrid.length === 0) return;

  // Only allow mouse to interact with the web grid if cursor is actually inside the timeline
  const hasMouse = targetMouseX !== -9999 && targetMouseY !== -9999 && isMouseInTimeline;
  const mouseRadius = 140;
  const mouseRadiusSq = mouseRadius * mouseRadius;

  const webRows = webGrid.length;
  const webCols = webGrid[0]?.length || 0;

  // 1. Interactive spring physics simulation across the background web lattice
  for (let r = 0; r < webRows; r++) {
    const row = webGrid[r];
    for (let c = 0; c < webCols; c++) {
      const p = row[c];

      // Cursor elastic perturbation
      if (hasMouse) {
        const dx = p.x - targetMouseX;
        const dy = p.y - targetMouseY;
        const distSq = dx * dx + dy * dy;

        if (distSq < mouseRadiusSq && distSq > 0.01) {
          const dist = Math.sqrt(distSq);
          const force = (1 - dist / mouseRadius) * 12;
          const angle = Math.atan2(dy, dx);
          p.vx += Math.cos(angle) * force * 0.35;
          p.vy += Math.sin(angle) * force * 0.35;
        }
      }

      // High-tension silk spring-back to rest position
      p.vx += (p.origX - p.x) * 0.09;
      p.vy += (p.origY - p.y) * 0.09;
      p.vx *= 0.85; // Damping
      p.vy *= 0.85;

      p.x += p.vx;
      p.y += p.vy;
    }
  }

  // 2. Render background spider-web mesh lines
  ctx.beginPath();
  for (let r = 0; r < webRows; r++) {
    const row = webGrid[r];
    const isOdd = r % 2 === 1;

    for (let c = 0; c < webCols; c++) {
      const p = row[c];

      // Horizontal web strand
      if (c < webCols - 1) {
        const right = row[c + 1];
        ctx.moveTo(p.x, p.y);
        ctx.lineTo(right.x, right.y);
      }

      // Downward diagonal web threads (creating triangular/hexagonal spider webbing)
      if (r < webRows - 1) {
        const downRight = isOdd ? webGrid[r + 1][c + 1] : webGrid[r + 1][c];
        if (downRight) {
          ctx.moveTo(p.x, p.y);
          ctx.lineTo(downRight.x, downRight.y);
        }

        const downLeft = isOdd ? webGrid[r + 1][c] : (c > 0 ? webGrid[r + 1][c - 1] : null);
        if (downLeft) {
          ctx.moveTo(p.x, p.y);
          ctx.lineTo(downLeft.x, downLeft.y);
        }
      }
    }
  }
  ctx.strokeStyle = `rgba(255, 255, 255, ${0.055 * opacity})`;
  ctx.lineWidth = 0.5;
  ctx.stroke();

  // 3. Highlighted active web strands & cursor illumination
  if (hasMouse) {
    ctx.beginPath();
    for (let r = 0; r < webRows; r++) {
      const row = webGrid[r];
      const isOdd = r % 2 === 1;

      for (let c = 0; c < webCols; c++) {
        const p = row[c];
        const dist = Math.hypot(p.x - targetMouseX, p.y - targetMouseY);
        if (dist < mouseRadius * 1.15) {
          if (c < webCols - 1) {
            const right = row[c + 1];
            ctx.moveTo(p.x, p.y);
            ctx.lineTo(right.x, right.y);
          }
          if (r < webRows - 1) {
            const downRight = isOdd ? webGrid[r + 1][c + 1] : webGrid[r + 1][c];
            if (downRight) {
              ctx.moveTo(p.x, p.y);
              ctx.lineTo(downRight.x, downRight.y);
            }
          }
        }
      }
    }
    ctx.strokeStyle = `rgba(186, 230, 253, ${0.18 * opacity})`;
    ctx.lineWidth = 0.75;
    ctx.stroke();

    // Subtle localized moonlight aura
    const aura = ctx.createRadialGradient(
      targetMouseX, targetMouseY, 0,
      targetMouseX, targetMouseY, mouseRadius
    );
    aura.addColorStop(0, `rgba(147, 197, 253, ${0.06 * opacity})`);
    aura.addColorStop(0.5, `rgba(230, 36, 41, ${0.02 * opacity})`);
    aura.addColorStop(1, "rgba(0, 0, 0, 0)");
    ctx.fillStyle = aura;
    ctx.beginPath();
    ctx.arc(targetMouseX, targetMouseY, mouseRadius, 0, Math.PI * 2);
    ctx.fill();
  }

  // 4. Subtle silk intersection micro-droplets
  ctx.beginPath();
  for (let r = 0; r < webRows; r += 2) {
    const row = webGrid[r];
    for (let c = 0; c < webCols; c += 2) {
      const p = row[c];
      ctx.moveTo(p.x + 0.7, p.y);
      ctx.arc(p.x, p.y, 0.7, 0, Math.PI * 2);
    }
  }
  ctx.fillStyle = `rgba(215, 238, 255, ${0.1 * opacity})`;
  ctx.fill();
}

function animate(): void {
  // Check if we are on the Art Portfolio page (user wants ONLY portfolio page to be black)
  const isPortfolioPage = !!document.getElementById("portfolio-root") || !!document.getElementById("museum-view");

  if (isPortfolioPage) {
    document.body.style.backgroundColor = "#000000";
    if (canvas) canvas.style.display = "none";
    const glassNavbar = document.querySelector(".glass-navbar") as HTMLElement;
    if (glassNavbar) {
      glassNavbar.style.setProperty("--navbar-bg-rgb", "0, 0, 0");
    }
    // Performance: Completely terminate topography animation loop on portfolio page to free 100% CPU/GPU resources
    return;
  }

  ctx.clearRect(0, 0, width, height);

  // Background organic slow evolution
  zOffset += 0.00008;
  flowX += 0.00004;
  flowY += 0.00002;

  // Update target spidey factor based on scroll / viewport
  updateSpideyFactor();
  currentSpideyFactor += (targetSpideyFactor - currentSpideyFactor) * 0.07;

  if (canvas && canvas.style.display === "none") canvas.style.display = "block";
  // Smooth transition: Original green (#04241c) across the website,
  // transitioning to the sleek dark background (rgb(8, 9, 17)) exclusively when scrolling into the timeline.
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

  const hasMouse = targetMouseX !== -9999 && targetMouseY !== -9999;

  // Determine area context based on cursor position relative to timeline
  let isMouseInTimeline = false;
  if (timelineSection && hasMouse) {
    const rect = timelineSection.getBoundingClientRect();
    // Spans vertically across the timeline section across the viewport width
    if (targetMouseY >= rect.top - 60 && targetMouseY <= rect.bottom + 60) {
      isMouseInTimeline = true;
    }
  }

  // Update card cursor spotlights whenever in timeline
  if (timelineSection && currentSpideyFactor > 0.04) {
    const cards = timelineSection.querySelectorAll(".spidey-card");
    cards.forEach((c) => {
      const cardEl = c as HTMLElement;
      const cRect = cardEl.getBoundingClientRect();
      const cx = targetMouseX - cRect.left;
      const cy = targetMouseY - cRect.top;
      cardEl.style.setProperty("--mouse-x", `${cx}px`);
      cardEl.style.setProperty("--mouse-y", `${cy}px`);
    });
  }

  // Draw topographic contours
  generateNoise();
  const roundedNoiseMin = Math.floor(noiseMin / thresholdIncrement) * thresholdIncrement;
  const roundedNoiseMax = Math.ceil(noiseMax / thresholdIncrement) * thresholdIncrement;

  // Topography stays active: vibrant 100% in hero/blog, keeping a subtle 15% depth in timeline
  // so the terrain is always interactive across every area
  const topoOpacity = Math.max(0.15, 1 - currentSpideyFactor * 0.85);

  for (
    let threshold = roundedNoiseMin;
    threshold < roundedNoiseMax;
    threshold += thresholdIncrement
  ) {
    currentThreshold = threshold;
    renderTopography(topoOpacity);
  }

  // Draw interactive background web pattern strictly with timeline opacity
  renderWebPattern(currentSpideyFactor, isMouseInTimeline);

  // Spider-Man Mascot on the Timeline Web String: slides and bobs up and down
  const silhouette = document.getElementById("spidey-silhouette");
  const timelineContainer = document.querySelector(".timeline-container") as HTMLElement;
  if (silhouette && timelineContainer) {
    const cRect = timelineContainer.getBoundingClientRect();
    const vh = window.innerHeight;

    // Target focal point tracks user's viewport reading center (around 42% down the screen)
    const focalY = vh * 0.42;
    const rawTargetY = focalY - cRect.top;
    // Clamp between top milestone node area (24px) and bottom of the string
    const targetY = Math.max(24, Math.min(cRect.height - 35, rawTargetY));

    // Smooth elastic travel along the web string
    const travelDelta = targetY - spideyWebY;
    spideyWebY += travelDelta * 0.08;

    // Spider-Man only moves up and down when scrolling. When stopped, he stays completely still.
    // Dynamic tilt/sway responds naturally to movement velocity, smoothly resting at 0 when idle.
    const sway = Math.max(-5, Math.min(5, travelDelta * 0.12));

    silhouette.style.top = `${spideyWebY}px`;
    silhouette.style.left = `0px`;
    silhouette.style.transform = `translate(-50%, -50%) rotate(${sway.toFixed(2)}deg)`;
    silhouette.style.opacity = `${Math.max(0, Math.min(1, currentSpideyFactor * 1.25))}`;
  }

  // Floating Games Bookmark Tab visibility:
  // Allowed ONLY to be seen after timeline section
  const bookmarkTab = document.getElementById("games-bookmark-tab");
  if (bookmarkTab) {
    if (timelineSection) {
      const tRect = timelineSection.getBoundingClientRect();
      // Appears when the user reaches the end of the timeline or scrolls below it
      const isAfterTimeline = tRect.bottom <= window.innerHeight * 0.85;
      if (isAfterTimeline) {
        bookmarkTab.classList.add("visible");
      } else {
        bookmarkTab.classList.remove("visible");
      }
    } else {
      // Keep accessible on pages without timeline
      bookmarkTab.classList.add("visible");
    }
  }

  requestAnimationFrame(animate);
}

animate();

// Normalize bookmark link href for local development if running without /init base
function normalizeBookmarkTabHref(): void {
  const bookmarkTab = document.getElementById("games-bookmark-tab");
  if (bookmarkTab && !window.location.pathname.startsWith("/init")) {
    const rawHref = bookmarkTab.getAttribute("href");
    if (rawHref && rawHref.startsWith("/init/")) {
      bookmarkTab.setAttribute("href", rawHref.replace(/^\/init/, ""));
    }
  }
}

// Initialize modules on page load
if (document.readyState === "loading") {
  document.addEventListener("DOMContentLoaded", () => {
    initMuseumMaze();
    normalizeBookmarkTabHref();
  });
} else {
  initMuseumMaze();
  normalizeBookmarkTabHref();
}