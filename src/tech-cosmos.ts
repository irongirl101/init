/**
 * Tech Cosmos 2D — Deep-Fold Pixel Planet Generator Edition
 * 
 * Inspired by Deep-Fold (https://deep-fold.itch.io/pixel-planet-generator)
 * - Procedural pixel-art planets with dithered Bayer shadows and rotating surface features.
 * - Gentle, slowed-down moon speeds with realistic elliptical orbits (inclination tilt + front/back depth).
 * - Earth anchored at the bottom as a large mint-green pixel terrestrial world.
 * - Vertical ascension track with upward arrow (↑) on the right side.
 * - Interactive:
 *   - Scroll or drag to ascend/descend between Earth and deep space.
 *   - Hover/click on any planet to inspect stack details.
 *   - Hover/click on any white moon to open project details with live links.
 */

export interface TechMoon {
  id: string;
  name: string;
  type: string;
  summary: string;
  link?: string;
  semiMajor: number;   // Elliptical major axis (a)
  semiMinor: number;   // Elliptical minor axis (b)
  inclination: number; // Tilt angle in radians
  speed: number;       // Slower celestial speed (rad/frame)
  angle: number;       // Current orbital angle
  size: number;        // Moon pixel radius
}

export interface TechPlanet {
  id: string;
  name: string;
  shortName: string;
  tagline: string;
  experience: string;
  planetType: "gas" | "terran" | "desert" | "magma" | "alien" | "ice";
  palette: {
    base: [number, number, number];
    detail: [number, number, number];
    shadow: [number, number, number];
    outline: [number, number, number];
    ring?: [number, number, number];
  };
  size: number;        // Display radius in canvas pixels
  res: number;         // Pixel resolution (e.g. 48x48)
  altitude: number;    // Vertical altitude above Earth
  xOffset: number;     // Normalized horizontal offset (-1 to 1)
  rotationSpeed: number;
  rotationOffset: number;
  frameworks: string[];
  moons: TechMoon[];
}

export function initTechCosmos(): void {
  const container = document.getElementById("tech-observatory-root");
  if (!container) return;

  const canvas = document.getElementById("tech-canvas") as HTMLCanvasElement | null;
  if (!canvas) return;

  const ctx = canvas.getContext("2d");
  if (!ctx) return;

  // --- Deep-Fold Style Procedural Pixel Planets ---
  const planets: TechPlanet[] = [
    {
      id: "python",
      name: "Python",
      shortName: "PY",
      tagline: "Backend & Systems Tooling",
      experience: "3+ Years • Core Language",
      planetType: "gas",
      palette: {
        base: [253, 224, 71],    // Warm pastel yellow (matching user sketch)
        detail: [245, 158, 11],  // Amber gold bands & storm spot
        shadow: [113, 63, 18],   // Deep warm shadow
        outline: [30, 20, 10],   // Dark outline
      },
      size: 50,
      res: 48,
      altitude: 350,
      xOffset: 0.28,
      rotationSpeed: 0.008,
      rotationOffset: 0.2,
      frameworks: ["Django", "FastAPI", "Jinja2", "Pygments", "AWS S3 SDK"],
      moons: [
        {
          id: "django-portal",
          name: "School Django Portal",
          type: "Full Stack",
          summary: "Built first ever Django app with a friend in 12th grade for school usage — where the engineering love began.",
          link: "https://github.com/irongirl101",
          semiMajor: 82,
          semiMinor: 32,
          inclination: -0.25,
          speed: 0.0042, // Slowed down from 0.022!
          angle: 0.4,
          size: 9,
        },
        {
          id: "mettu-ssg",
          name: "Mettu Engine",
          type: "Static Pipeline",
          summary: "Custom markdown-to-static site generator and build pipeline powering this portfolio.",
          link: "https://github.com/Andy34G7/mettu",
          semiMajor: 108,
          semiMinor: 42,
          inclination: 0.18,
          speed: -0.0032,
          angle: 2.8,
          size: 10,
        },
        {
          id: "automation-scripts",
          name: "Automation Scripts",
          type: "CLI & Scripts",
          summary: "Background tooling for image optimization, file hashing, and media pipelines.",
          link: "https://github.com/irongirl101",
          semiMajor: 130,
          semiMinor: 48,
          inclination: -0.12,
          speed: 0.0024,
          angle: 4.6,
          size: 8,
        },
      ],
    },
    {
      id: "typescript",
      name: "TypeScript / Web",
      shortName: "TS",
      tagline: "Interactive Canvas & Modern Frontend",
      experience: "2+ Years • Advanced",
      planetType: "ice",
      palette: {
        base: [147, 197, 253],   // Soft pastel sky-blue (matching user sketch)
        detail: [59, 130, 246],  // Sapphire blue
        shadow: [30, 58, 138],   // Deep navy shadow
        outline: [10, 25, 47],
        ring: [191, 219, 254],   // Pixelated icy ring
      },
      size: 48,
      res: 48,
      altitude: 700,
      xOffset: -0.32,
      rotationSpeed: 0.007,
      rotationOffset: 1.1,
      frameworks: ["TypeScript", "HTML5 Canvas", "Vite", "Tailwind CSS", "Perlin Noise"],
      moons: [
        {
          id: "hades-gallery",
          name: "Underworld Art Gallery",
          type: "Interactive Canvas",
          summary: "House of Hades art exhibition maze with mini-map radar and live auction bidding ledger.",
          link: "/init/portfolio/",
          semiMajor: 78,
          semiMinor: 30,
          inclination: 0.28,
          speed: 0.0044,
          angle: 1.2,
          size: 9,
        },
        {
          id: "retro-arcade",
          name: "16-Bit Gaming Shelf",
          type: "Pixel Web App",
          summary: "Tactile pixel-art bookshelf with interactive cartridge spines and full game dossier.",
          link: "/init/games/",
          semiMajor: 102,
          semiMinor: 38,
          inclination: -0.22,
          speed: -0.0034,
          angle: 3.5,
          size: 10,
        },
        {
          id: "topography-noise",
          name: "Topography Noise Lattice",
          type: "Generative Physics",
          summary: "Real-time Perlin noise contour lattice with fluid particle repulsion.",
          link: "/init/",
          semiMajor: 126,
          semiMinor: 46,
          inclination: 0.15,
          speed: 0.0026,
          angle: 5.1,
          size: 8,
        },
      ],
    },
    {
      id: "swift",
      name: "Swift",
      shortName: "SW",
      tagline: "Native Apple Ecosystem & SwiftUI",
      experience: "1+ Year • macOS & iOS",
      planetType: "desert",
      palette: {
        base: [253, 186, 116],   // Coral peach
        detail: [234, 88, 12],   // Sunset orange dunes
        shadow: [124, 45, 18],   // Terracotta shadow
        outline: [40, 15, 10],
      },
      size: 42,
      res: 44,
      altitude: 1050,
      xOffset: 0.32,
      rotationSpeed: 0.006,
      rotationOffset: 2.3,
      frameworks: ["SwiftUI", "AppKit", "macOS MenuBar", "CoreAnimation"],
      moons: [
        {
          id: "macos-island",
          name: "macOS Dynamic Island",
          type: "Desktop App",
          summary: "Interactive dynamic island utility designed for macOS notch displays using SwiftUI.",
          link: "https://github.com/irongirl101",
          semiMajor: 76,
          semiMinor: 28,
          inclination: -0.28,
          speed: 0.004,
          angle: 0.9,
          size: 9,
        },
      ],
    },
    {
      id: "c-systems",
      name: "C / Systems",
      shortName: "C",
      tagline: "Low-Level Systems & Networking",
      experience: "Academic & Systems Deep-Dives",
      planetType: "magma",
      palette: {
        base: [216, 180, 254],   // Lavender purple
        detail: [147, 51, 234],  // Molten violet fissures
        shadow: [59, 7, 100],    // Deep obsidian shadow
        outline: [25, 10, 40],
      },
      size: 42,
      res: 44,
      altitude: 1400,
      xOffset: -0.28,
      rotationSpeed: 0.005,
      rotationOffset: 3.5,
      frameworks: ["C", "Libcurl", "POSIX", "Memory Management", "GDB"],
      moons: [
        {
          id: "curl-client",
          name: "Libcurl API Client",
          type: "Systems Networking",
          summary: "Low-level C network client performing raw HTTP requests and API integrations.",
          link: "https://github.com/irongirl101",
          semiMajor: 74,
          semiMinor: 28,
          inclination: 0.22,
          speed: 0.0042,
          angle: 1.8,
          size: 9,
        },
      ],
    },
    {
      id: "foss-devops",
      name: "FOSS & DevOps",
      shortName: "OS",
      tagline: "Open Source Stewardship & Linux",
      experience: "Community Founder & Contributor",
      planetType: "alien",
      palette: {
        base: [165, 180, 252],   // Soft indigo
        detail: [79, 70, 229],   // Deep cobalt
        shadow: [30, 27, 75],    // Dark indigo shadow
        outline: [15, 15, 45],
      },
      size: 45,
      res: 46,
      altitude: 1750,
      xOffset: 0.26,
      rotationSpeed: 0.006,
      rotationOffset: 4.8,
      frameworks: ["Git", "Linux", "Bash", "Docker", "QEMU", "OpenTofu", "Kafka"],
      moons: [
        {
          id: "pes-os-club",
          name: "PES OS Community",
          type: "FOSS Leadership",
          summary: "Co-founded and scaled campus open-source student club to 900+ active developers.",
          link: "/init/posts/PESOS/",
          semiMajor: 78,
          semiMinor: 30,
          inclination: -0.24,
          speed: 0.0036,
          angle: 0.6,
          size: 10,
        },
        {
          id: "gitgud-workshop",
          name: "GitGud Workshop",
          type: "Education",
          summary: "Hands-on Git & GitHub bootcamp training 150+ students in collaborative workflows.",
          link: "/init/posts/first-blog/",
          semiMajor: 100,
          semiMinor: 36,
          inclination: 0.16,
          speed: -0.0028,
          angle: 2.7,
          size: 9,
        },
        {
          id: "open-source-fridays",
          name: "Open Source Fridays",
          type: "Publication",
          summary: "Weekly deep-dive articles exploring prominent open-source projects.",
          link: "/init/blog/",
          semiMajor: 122,
          semiMinor: 44,
          inclination: -0.15,
          speed: 0.0022,
          angle: 4.8,
          size: 8,
        },
      ],
    },
    {
      id: "gamedev-3d",
      name: "Game Dev & 3D",
      shortName: "3D",
      tagline: "Interactive 3D Art & AR/VR",
      experience: "Creative Computing & Asset Pipelines",
      planetType: "terran",
      palette: {
        base: [253, 164, 175],   // Soft rose
        detail: [225, 29, 72],   // Ruby red continents
        shadow: [76, 5, 25],     // Deep wine shadow
        outline: [30, 5, 15],
      },
      size: 44,
      res: 44,
      altitude: 2100,
      xOffset: -0.3,
      rotationSpeed: 0.005,
      rotationOffset: 5.7,
      frameworks: ["Blender", "3D Shaders", "AR/VR", "Godot", "FiniteLoop"],
      moons: [
        {
          id: "gamejam-2025",
          name: "GameJam 2025",
          type: "Game Project",
          summary: "Handmade game assets, environment design, and 3D modeling fueling AR/VR love.",
          link: "https://github.com/irongirl101",
          semiMajor: 76,
          semiMinor: 28,
          inclination: 0.25,
          speed: 0.0038,
          angle: 1.4,
          size: 9,
        },
        {
          id: "finiteloop-intern",
          name: "FiniteLoop Product & Cyber",
          type: "Internship",
          summary: "Built full product end-to-end and explored cyber defense & systems engineering.",
          link: "/init/",
          semiMajor: 98,
          semiMinor: 35,
          inclination: -0.18,
          speed: -0.003,
          angle: 3.6,
          size: 8,
        },
      ],
    },
  ];

  const maxAltitude = 2300;

  // --- Background Starfield ---
  interface Star {
    x: number;
    y: number;
    r: number;
    alpha: number;
    twinkleSpeed: number;
  }
  const stars: Star[] = [];
  for (let i = 0; i < 350; i++) {
    stars.push({
      x: (Math.random() - 0.5) * 1600,
      y: -Math.random() * (maxAltitude + 800),
      r: Math.random() * 1.5 + 0.4,
      alpha: Math.random() * 0.7 + 0.2,
      twinkleSpeed: Math.random() * 0.04 + 0.01,
    });
  }

  // --- State Variables ---
  let cameraAltitude = 0;
  let targetCameraAltitude = 0;

  let width = window.innerWidth;
  let height = window.innerHeight;
  let dpr = window.devicePixelRatio || 1;

  let isDragging = false;
  let dragStartY = 0;
  let mouseScreenX = -9999;
  let mouseScreenY = -9999;

  let hoveredPlanetId: string | null = null;
  let hoveredMoonId: string | null = null;
  let hoveredPlanetParentId: string | null = null;

  let animClock = 0;

  // --- Resize Handler ---
  function resizeCanvas() {
    width = window.innerWidth;
    height = window.innerHeight;
    dpr = window.devicePixelRatio || 1;

    canvas.width = Math.floor(width * dpr);
    canvas.height = Math.floor(height * dpr);
    canvas.style.width = `${width}px`;
    canvas.style.height = `${height}px`;
  }

  window.addEventListener("resize", resizeCanvas);
  resizeCanvas();

  // --- Coordinates Helper ---
  function worldToScreen(wx: number, wy: number): { x: number; y: number } {
    const earthBaseY = height - 60;
    return {
      x: width * 0.5 + wx,
      y: earthBaseY - (wy - cameraAltitude),
    };
  }

  function screenToWorld(sx: number, sy: number): { x: number; y: number } {
    const earthBaseY = height - 60;
    return {
      x: sx - width * 0.5,
      y: earthBaseY - sy + cameraAltitude,
    };
  }

  function getPlanetWorldPos(p: TechPlanet): { x: number; y: number } {
    const horizontalSpread = Math.min(width * 0.38, 280);
    return {
      x: p.xOffset * horizontalSpread,
      y: p.altitude,
    };
  }

  // Elliptical orbit calculation with inclination tilt!
  function getMoonWorldPos(p: TechPlanet, m: TechMoon): { x: number; y: number; isBehind: boolean } {
    const pPos = getPlanetWorldPos(p);
    // Unrotated ellipse position:
    const ex = Math.cos(m.angle) * m.semiMajor;
    const ey = Math.sin(m.angle) * m.semiMinor;

    // Rotate by inclination angle:
    const cosI = Math.cos(m.inclination);
    const sinI = Math.sin(m.inclination);
    const rotX = ex * cosI - ey * sinI;
    const rotY = ex * sinI + ey * cosI;

    // If sin(angle) < 0, the moon is traveling behind the planet!
    const isBehind = Math.sin(m.angle) < 0;

    return {
      x: pPos.x + rotX,
      y: pPos.y + rotY,
      isBehind,
    };
  }

  // --- Bayer 2x2 Dither Matrix for Signature Deep-Fold Shading ---
  const bayer2x2 = [
    [0.0, 0.5],
    [0.75, 0.25],
  ];

  // Offscreen canvas cache for pixel planets
  const planetCanvases = new Map<string, HTMLCanvasElement>();

  function getOffscreenCanvas(id: string, size: number): HTMLCanvasElement {
    let off = planetCanvases.get(id);
    if (!off) {
      off = document.createElement("canvas");
      off.width = size;
      off.height = size;
      planetCanvases.set(id, off);
    }
    return off;
  }

  // --- Procedural Deep-Fold Pixel Planet Generator ---
  function renderPixelPlanet(p: TechPlanet): HTMLCanvasElement {
    const res = p.res;
    const offCanvas = getOffscreenCanvas(p.id, res);
    const offCtx = offCanvas.getContext("2d");
    if (!offCtx) return offCanvas;

    const imgData = offCtx.createImageData(res, res);
    const data = imgData.data;

    const R = (res * 0.5) - 2; // radius with 1px border margin
    const cx = res * 0.5;
    const cy = res * 0.5;

    // Light source from top-left (Deep-Fold standard)
    const lx = -0.55;
    const ly = -0.55;
    const lz = 0.62;

    const rot = animClock * p.rotationSpeed * 40 + p.rotationOffset;

    for (let py = 0; py < res; py++) {
      for (let px = 0; px < res; px++) {
        const dx = px - cx;
        const dy = py - cy;
        const distSq = dx * dx + dy * dy;

        const idx = (py * res + px) * 4;

        if (distSq > (R + 1) * (R + 1)) {
          // Transparent outside circle
          data[idx + 3] = 0;
          continue;
        }

        if (distSq > R * R) {
          // 1px Dark Outline (signature Deep-Fold border)
          data[idx] = p.palette.outline[0];
          data[idx + 1] = p.palette.outline[1];
          data[idx + 2] = p.palette.outline[2];
          data[idx + 3] = 255;
          continue;
        }

        // Inside planet sphere: compute normal (nx, ny, nz)
        const dist = Math.sqrt(distSq);
        const nx = dx / R;
        const ny = dy / R;
        const nz = Math.sqrt(Math.max(0, 1 - nx * nx - ny * ny));

        // Spherical longitude & latitude
        const lat = Math.asin(ny);
        const lon = Math.atan2(nx, nz) + rot;

        // Diffuse Lighting Dot Product
        const dot = nx * lx + ny * ly + nz * lz;

        // Bayer Dithering for smooth pixel shading transition
        const ditherVal = bayer2x2[px % 2][py % 2];
        const isShadow = (dot + (ditherVal - 0.5) * 0.35) < 0.18;

        // Surface Pattern based on Planet Type
        let isDetail = false;

        if (p.planetType === "gas") {
          // Wavy Jupiter/Python gas bands & storm spot
          const bandVal = Math.sin(lat * 14 + Math.sin(lon * 4) * 0.8);
          if (bandVal > 0.15) {
            isDetail = true;
          }
          // Swirling storm spot (like user sketch)
          const spotLonDiff = lon % (Math.PI * 2) - 1.2;
          const spotLatDiff = lat - 0.2;
          if (spotLonDiff * spotLonDiff * 3 + spotLatDiff * spotLatDiff * 8 < 0.15) {
            isDetail = true;
          }
        } else if (p.planetType === "ice") {
          // Icy striated bands
          const bandVal = Math.sin(lat * 10 + Math.cos(lon * 2) * 0.5);
          if (bandVal > 0.2) isDetail = true;
        } else if (p.planetType === "desert") {
          // Sand dune contours
          const duneVal = Math.sin(lon * 5 + lat * 4);
          if (duneVal > 0.25) isDetail = true;
        } else if (p.planetType === "magma") {
          // Obsidian with molten fissure veins
          const fissVal = Math.sin(lon * 7 + Math.cos(lat * 8) * 1.5);
          if (Math.abs(fissVal) < 0.28) isDetail = true;
        } else {
          // Continents / Biome
          const contVal = Math.sin(lon * 3 + lat * 3) + Math.cos(lon * 5 - lat * 4) * 0.5;
          if (contVal > 0.2) isDetail = true;
        }

        // Color selection
        if (isShadow) {
          // Dithered shadow color
          data[idx] = p.palette.shadow[0];
          data[idx + 1] = p.palette.shadow[1];
          data[idx + 2] = p.palette.shadow[2];
        } else if (isDetail) {
          // Detail / band color
          data[idx] = p.palette.detail[0];
          data[idx + 1] = p.palette.detail[1];
          data[idx + 2] = p.palette.detail[2];
        } else {
          // Base lit color
          data[idx] = p.palette.base[0];
          data[idx + 1] = p.palette.base[1];
          data[idx + 2] = p.palette.base[2];
        }
        data[idx + 3] = 255;
      }
    }

    offCtx.putImageData(imgData, 0, 0);

    // If planet has rings (TypeScript), draw pixel rings
    if (p.palette.ring) {
      offCtx.save();
      offCtx.translate(cx, cy);
      offCtx.rotate(-0.32);
      offCtx.strokeStyle = `rgb(${p.palette.ring[0]}, ${p.palette.ring[1]}, ${p.palette.ring[2]})`;
      offCtx.lineWidth = 3;
      offCtx.beginPath();
      offCtx.ellipse(0, 0, R * 1.5, R * 0.38, 0, 0, Math.PI * 2);
      offCtx.stroke();
      offCtx.restore();
    }

    return offCanvas;
  }

  // --- Project Modal Management ---
  const modalEl = document.getElementById("project-modal");
  const modalBadgeEl = document.getElementById("modal-badge");
  const modalTitleEl = document.getElementById("modal-title");
  const modalSubEl = document.getElementById("modal-subtitle");
  const modalDescEl = document.getElementById("modal-desc");
  const modalLinkContainer = document.getElementById("modal-link-container");
  const modalCloseBtn = document.getElementById("modal-close-btn");

  function openMoonModal(planet: TechPlanet, moon: TechMoon) {
    if (!modalEl || !modalTitleEl || !modalDescEl) return;

    if (modalBadgeEl) {
      modalBadgeEl.textContent = moon.type.toUpperCase();
      modalBadgeEl.style.borderColor = `rgb(${planet.palette.base.join(",")})`;
      modalBadgeEl.style.color = `rgb(${planet.palette.base.join(",")})`;
    }
    modalTitleEl.textContent = `🌙 ${moon.name}`;
    if (modalSubEl) {
      modalSubEl.textContent = `Orbiting Planet ${planet.name} (${planet.tagline})`;
    }
    modalDescEl.textContent = moon.summary;

    if (modalLinkContainer) {
      if (moon.link) {
        modalLinkContainer.innerHTML = `
          <a href="${moon.link}" target="_blank" rel="noopener noreferrer"
             class="btn btn-sm btn-primary w-full gap-2 font-mono text-xs">
            <span>View Project / Code</span>
            <svg class="w-4 h-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M18 13v6a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V8a2 2 0 0 1 2-2h6"/><polyline points="15 3 21 3 21 9"/><line x1="10" y1="14" x2="21" y2="3"/></svg>
          </a>
        `;
      } else {
        modalLinkContainer.innerHTML = "";
      }
    }

    modalEl.classList.remove("opacity-0", "pointer-events-none");
    modalEl.classList.add("opacity-100", "pointer-events-auto");
  }

  function openPlanetModal(planet: TechPlanet) {
    if (!modalEl || !modalTitleEl || !modalDescEl) return;

    if (modalBadgeEl) {
      modalBadgeEl.textContent = "CORE LANGUAGE / TECH";
      modalBadgeEl.style.borderColor = `rgb(${planet.palette.base.join(",")})`;
      modalBadgeEl.style.color = `rgb(${planet.palette.base.join(",")})`;
    }
    modalTitleEl.textContent = `🪐 Planet ${planet.name}`;
    if (modalSubEl) {
      modalSubEl.textContent = `${planet.tagline} • ${planet.experience}`;
    }

    const moonsList = planet.moons.map((m) => `• 🌙 ${m.name} (${m.type})`).join("\n");
    modalDescEl.innerHTML = `
      <div class="space-y-3">
        <div>
          <div class="text-[11px] font-bold text-slate-400 uppercase tracking-wider mb-1.5">Stack & Frameworks</div>
          <div class="flex flex-wrap gap-1.5">
            ${planet.frameworks.map((f) => `<span class="badge badge-xs text-[10px] py-1 px-2 border" style="border-color: rgb(${planet.palette.base.join(",")}); color: #fff;">${f}</span>`).join("")}
          </div>
        </div>
        <div>
          <div class="text-[11px] font-bold text-slate-400 uppercase tracking-wider mb-1.5">Orbiting Moons (${planet.moons.length})</div>
          <div class="text-xs text-slate-300 whitespace-pre-line leading-relaxed">${moonsList}</div>
        </div>
      </div>
    `;

    if (modalLinkContainer) {
      modalLinkContainer.innerHTML = `
        <button id="modal-focus-planet" class="btn btn-sm btn-outline w-full text-xs font-mono" style="border-color: rgb(${planet.palette.base.join(",")}); color: rgb(${planet.palette.base.join(",")});">
          Center on ${planet.name}
        </button>
      `;
      document.getElementById("modal-focus-planet")?.addEventListener("click", () => {
        targetCameraAltitude = Math.max(0, Math.min(maxAltitude, planet.altitude - height * 0.4));
        closeModal();
      });
    }

    modalEl.classList.remove("opacity-0", "pointer-events-none");
    modalEl.classList.add("opacity-100", "pointer-events-auto");
  }

  function closeModal() {
    if (!modalEl) return;
    modalEl.classList.remove("opacity-100", "pointer-events-auto");
    modalEl.classList.add("opacity-0", "pointer-events-none");
  }

  modalCloseBtn?.addEventListener("click", closeModal);
  modalEl?.addEventListener("click", (e) => {
    if (e.target === modalEl) closeModal();
  });

  // --- Scroll & Drag Handlers ---
  window.addEventListener(
    "wheel",
    (e) => {
      targetCameraAltitude = Math.max(
        0,
        Math.min(maxAltitude, targetCameraAltitude + e.deltaY * 0.95)
      );
    },
    { passive: true }
  );

  canvas.addEventListener("mousedown", (e) => {
    isDragging = true;
    dragStartY = e.clientY;
  });

  window.addEventListener("mouseup", () => {
    isDragging = false;
  });

  canvas.addEventListener("mousemove", (e) => {
    const rect = canvas.getBoundingClientRect();
    mouseScreenX = e.clientX - rect.left;
    mouseScreenY = e.clientY - rect.top;

    if (isDragging) {
      const dy = e.clientY - dragStartY;
      dragStartY = e.clientY;
      targetCameraAltitude = Math.max(
        0,
        Math.min(maxAltitude, targetCameraAltitude - dy * 1.4)
      );
    }

    // Hit Testing
    const worldPos = screenToWorld(mouseScreenX, mouseScreenY);
    let foundPlanet: string | null = null;
    let foundMoon: string | null = null;
    let foundPlanetParent: string | null = null;

    // 1. Check Moons first
    for (const p of planets) {
      for (const m of p.moons) {
        const mPos = getMoonWorldPos(p, m);
        const dist = Math.hypot(worldPos.x - mPos.x, worldPos.y - mPos.y);
        if (dist < m.size + 8) {
          foundPlanetParent = p.id;
          foundMoon = m.id;
          break;
        }
      }
      if (foundMoon) break;
    }

    // 2. Check Planets
    if (!foundMoon) {
      for (const p of planets) {
        const pPos = getPlanetWorldPos(p);
        const dist = Math.hypot(worldPos.x - pPos.x, worldPos.y - pPos.y);
        if (dist < p.size + 8) {
          foundPlanet = p.id;
          break;
        }
      }
    }

    // 3. Check Earth Base
    if (!foundPlanet && !foundMoon) {
      if (worldPos.y < 90 && Math.abs(worldPos.x) < 320) {
        foundPlanet = "earth";
      }
    }

    hoveredPlanetId = foundPlanet;
    hoveredMoonId = foundMoon;
    hoveredPlanetParentId = foundPlanetParent;

    canvas.style.cursor = foundPlanet || foundMoon ? "pointer" : isDragging ? "grabbing" : "grab";
  });

  canvas.addEventListener("click", () => {
    if (hoveredMoonId && hoveredPlanetParentId) {
      const p = planets.find((planet) => planet.id === hoveredPlanetParentId);
      const m = p?.moons.find((moon) => moon.id === hoveredMoonId);
      if (p && m) openMoonModal(p, m);
    } else if (hoveredPlanetId) {
      if (hoveredPlanetId === "earth") {
        targetCameraAltitude = 0;
      } else {
        const p = planets.find((planet) => planet.id === hoveredPlanetId);
        if (p) openPlanetModal(p);
      }
    }
  });

  // Touch Support
  canvas.addEventListener("touchstart", (e) => {
    if (e.touches.length === 1) {
      isDragging = true;
      dragStartY = e.touches[0].clientY;
    }
  });

  canvas.addEventListener("touchmove", (e) => {
    if (isDragging && e.touches.length === 1) {
      const dy = e.touches[0].clientY - dragStartY;
      dragStartY = e.touches[0].clientY;
      targetCameraAltitude = Math.max(
        0,
        Math.min(maxAltitude, targetCameraAltitude - dy * 1.5)
      );
    }
  });

  canvas.addEventListener("touchend", () => {
    isDragging = false;
  });

  window.addEventListener("return-earth", () => {
    targetCameraAltitude = 0;
  });

  // =========================================================================
  // --- RENDERING LOOP ---
  // =========================================================================
  function render() {
    animClock += 0.016;

    // Orbit revolutions of moons around each planet (at new slower speeds!)
    for (const p of planets) {
      for (const m of p.moons) {
        m.angle += m.speed;
      }
    }

    // Smooth camera altitude easing
    cameraAltitude += (targetCameraAltitude - cameraAltitude) * 0.1;

    // Clear Canvas
    ctx.setTransform(dpr, 0, 0, dpr, 0, 0);

    // Deep cosmic background
    const bgGrad = ctx.createLinearGradient(0, 0, 0, height);
    bgGrad.addColorStop(0, "#080c14");
    bgGrad.addColorStop(1, "#020408");
    ctx.fillStyle = bgGrad;
    ctx.fillRect(0, 0, width, height);

    // 1. Starfield
    drawStarfield();

    // 2. Vertical Ascension Arrow (↑) on right rail
    drawVerticalAscensionArrow();

    // 3. Draw Planets & their orbiting Moons with realistic elliptical z-depth
    for (const p of planets) {
      drawPlanetAndMoons(p);
    }

    // 4. Draw Earth at the bottom (Mint green dome)
    drawEarth();

    // 5. Hover Tooltips
    drawHoverTooltip();

    requestAnimationFrame(render);
  }

  // --- DRAW: STARFIELD ---
  function drawStarfield() {
    ctx.save();
    for (const s of stars) {
      const sx = width * 0.5 + s.x;
      const sy = (height - 60) - (s.y - cameraAltitude * 0.4);
      const wrappedY = ((sy % height) + height) % height;

      const twinkle = Math.sin(animClock * s.twinkleSpeed * 60) * 0.3 + 0.7;
      ctx.fillStyle = "#ffffff";
      ctx.globalAlpha = Math.max(0.15, Math.min(0.85, s.alpha * twinkle));
      ctx.beginPath();
      ctx.arc(sx, wrappedY, s.r, 0, Math.PI * 2);
      ctx.fill();
    }
    ctx.restore();
  }

  // --- DRAW: VERTICAL ASCENSION ARROW (↑) ---
  function drawVerticalAscensionArrow() {
    const arrowX = Math.min(width - 32, width * 0.94);
    const topY = 70;
    const bottomY = height - 50;

    ctx.save();
    // 1. Long vertical line
    ctx.strokeStyle = "rgba(255, 255, 255, 0.45)";
    ctx.lineWidth = 2;
    ctx.beginPath();
    ctx.moveTo(arrowX, bottomY);
    ctx.lineTo(arrowX, topY);
    ctx.stroke();

    // 2. Arrowhead pointing UP (↑)
    ctx.beginPath();
    ctx.moveTo(arrowX - 7, topY + 12);
    ctx.lineTo(arrowX, topY);
    ctx.lineTo(arrowX + 7, topY + 12);
    ctx.strokeStyle = "rgba(255, 255, 255, 0.75)";
    ctx.lineWidth = 2.2;
    ctx.stroke();

    // 3. Current Altitude Indicator Bead
    const progress = cameraAltitude / maxAltitude;
    const currentY = bottomY - progress * (bottomY - topY);

    ctx.fillStyle = "#34d399";
    ctx.beginPath();
    ctx.arc(arrowX, currentY, 5, 0, Math.PI * 2);
    ctx.fill();

    // Altitude text
    ctx.font = "9px ui-monospace, SFMono-Regular, monospace";
    ctx.fillStyle = "rgba(255, 255, 255, 0.6)";
    ctx.textAlign = "right";
    ctx.fillText(`${Math.round(cameraAltitude)} km`, arrowX - 10, currentY + 3.5);

    ctx.restore();
  }

  // --- DRAW: EARTH (MINT GREEN BASE DOME) ---
  function drawEarth() {
    const s = worldToScreen(0, 0);
    const rx = Math.min(width * 0.45, 340);
    const ry = 145;

    ctx.save();
    // Atmospheric Halo Glow
    const glowGrad = ctx.createRadialGradient(s.x, s.y, ry * 0.8, s.x, s.y, ry * 1.6);
    glowGrad.addColorStop(0, "rgba(52, 211, 153, 0.35)");
    glowGrad.addColorStop(0.7, "rgba(16, 185, 129, 0.1)");
    glowGrad.addColorStop(1, "transparent");
    ctx.fillStyle = glowGrad;
    ctx.beginPath();
    ctx.ellipse(s.x, s.y, rx * 1.25, ry * 1.4, 0, 0, Math.PI * 2);
    ctx.fill();

    // Earth Body (Mint / Celestial Green with clean dark outline like sketch)
    const earthGrad = ctx.createLinearGradient(s.x, s.y - ry, s.x, s.y + ry);
    earthGrad.addColorStop(0, "#a7f3d0");
    earthGrad.addColorStop(0.6, "#6ee7b7");
    earthGrad.addColorStop(1, "#34d399");
    ctx.fillStyle = earthGrad;

    ctx.beginPath();
    ctx.ellipse(s.x, s.y, rx, ry, 0, 0, Math.PI * 2);
    ctx.fill();

    // Crisp hand-drawn dark outline matching sketch
    ctx.strokeStyle = "#042f2e";
    ctx.lineWidth = 2.5;
    ctx.stroke();

    // Subtle continent curve
    ctx.save();
    ctx.clip();
    ctx.fillStyle = "rgba(5, 150, 105, 0.25)";
    ctx.beginPath();
    ctx.arc(s.x - rx * 0.3, s.y - ry * 0.2, rx * 0.5, 0, Math.PI * 2);
    ctx.fill();
    ctx.restore();

    // Center Origin Badge
    ctx.font = "bold 13px ui-monospace, SFMono-Regular, monospace";
    ctx.textAlign = "center";
    ctx.fillStyle = "#022c22";
    ctx.fillText("EARTH", s.x, s.y - ry * 0.35);

    ctx.font = "10px ui-monospace, SFMono-Regular, monospace";
    ctx.fillStyle = "#065f46";
    ctx.fillText("GROUND ZERO • VANTAGE POINT", s.x, s.y - ry * 0.15);

    ctx.restore();
  }

  // --- DRAW: PLANET AND MOONS (WITH ELLIPTICAL ORBITS & Z-DEPTH) ---
  function drawPlanetAndMoons(p: TechPlanet) {
    const pPos = getPlanetWorldPos(p);
    const s = worldToScreen(pPos.x, pPos.y);

    // Skip if far off screen
    if (s.y < -140 || s.y > height + 140) return;

    ctx.save();

    // 1. Draw Faint Elliptical Orbit Paths for each moon
    for (const m of p.moons) {
      ctx.save();
      ctx.translate(s.x, s.y);
      ctx.rotate(m.inclination);
      ctx.beginPath();
      ctx.ellipse(0, 0, m.semiMajor, m.semiMinor, 0, 0, Math.PI * 2);
      ctx.strokeStyle = "rgba(255, 255, 255, 0.15)";
      ctx.lineWidth = 1;
      ctx.setLineDash([3, 4]);
      ctx.stroke();
      ctx.restore();
    }

    // 2. LAYER 1: Draw Moons that are currently BEHIND the planet
    for (const m of p.moons) {
      const pos = getMoonWorldPos(p, m);
      if (pos.isBehind) {
        drawMoon(p, m, pos);
      }
    }

    // 3. LAYER 2: Draw Deep-Fold Pixel Planet Sprite
    // Generate/render procedural pixel sprite
    const pixelCanvas = renderPixelPlanet(p);

    ctx.save();
    // Soft Atmospheric Aura behind planet
    const glow = ctx.createRadialGradient(s.x, s.y, p.size * 0.7, s.x, s.y, p.size * 1.8);
    glow.addColorStop(0, `rgba(${p.palette.base.join(",")}, 0.3)`);
    glow.addColorStop(1, "transparent");
    ctx.fillStyle = glow;
    ctx.beginPath();
    ctx.arc(s.x, s.y, p.size * 1.8, 0, Math.PI * 2);
    ctx.fill();

    // Draw the pixel-art planet with crisp pixel scaling (no smoothing)
    ctx.imageSmoothingEnabled = false;
    const destSize = p.size * 2;
    ctx.drawImage(
      pixelCanvas,
      0,
      0,
      p.res,
      p.res,
      s.x - p.size,
      s.y - p.size,
      destSize,
      destSize
    );
    ctx.restore();

    // 4. LAYER 3: Draw Moons that are currently IN FRONT of the planet
    for (const m of p.moons) {
      const pos = getMoonWorldPos(p, m);
      if (!pos.isBehind) {
        drawMoon(p, m, pos);
      }
    }

    // 5. Planet Labels
    ctx.font = "bold 13px ui-monospace, SFMono-Regular, monospace";
    ctx.textAlign = "center";
    ctx.fillStyle = "#ffffff";
    ctx.fillText(p.name, s.x, s.y + p.size + 18);

    ctx.font = "10px ui-monospace, SFMono-Regular, monospace";
    ctx.fillStyle = "rgba(255, 255, 255, 0.65)";
    ctx.fillText(`${p.moons.length} projects`, s.x, s.y + p.size + 30);

    ctx.restore();
  }

  // --- DRAW: MOON (CRISP PIXEL-ART WHITE CIRCLE) ---
  function drawMoon(p: TechPlanet, m: TechMoon, pos: { x: number; y: number; isBehind: boolean }) {
    const s = worldToScreen(pos.x, pos.y);
    const isHovered = m.id === hoveredMoonId;

    ctx.save();
    // If behind, slightly smaller with slight dimmer opacity for realistic depth
    const scale = pos.isBehind ? 0.85 : 1.0;
    const mRadius = m.size * scale;

    ctx.globalAlpha = pos.isBehind ? 0.7 : 1.0;

    // Pure White Moon Body
    ctx.fillStyle = "#ffffff";
    ctx.beginPath();
    ctx.arc(s.x, s.y, mRadius, 0, Math.PI * 2);
    ctx.fill();

    // Subtle crescent pixel shadow on the moon (bottom-right)
    ctx.save();
    ctx.clip();
    ctx.fillStyle = "#94a3b8";
    ctx.beginPath();
    ctx.arc(s.x + mRadius * 0.45, s.y + mRadius * 0.45, mRadius * 0.9, 0, Math.PI * 2);
    ctx.fill();
    ctx.restore();

    // Crisp Dark Outline
    ctx.strokeStyle = "#020617";
    ctx.lineWidth = 1.8;
    ctx.beginPath();
    ctx.arc(s.x, s.y, mRadius, 0, Math.PI * 2);
    ctx.stroke();

    // Hover Highlight Ring
    if (isHovered) {
      ctx.strokeStyle = `rgb(${p.palette.base.join(",")})`;
      ctx.lineWidth = 2;
      ctx.beginPath();
      ctx.arc(s.x, s.y, mRadius + 4, 0, Math.PI * 2);
      ctx.stroke();

      // Floating name tag
      ctx.font = "bold 10px ui-monospace, SFMono-Regular, monospace";
      ctx.fillStyle = "#ffffff";
      ctx.textAlign = "center";
      ctx.fillText(m.name, s.x, s.y - mRadius - 6);
    }

    ctx.restore();
  }

  // --- DRAW: HOVER TOOLTIP ---
  function drawHoverTooltip() {
    if (!hoveredPlanetId && !hoveredMoonId) return;

    let title = "";
    let sub = "";
    let color = "#38bdf8";

    if (hoveredMoonId && hoveredPlanetParentId) {
      const p = planets.find((planet) => planet.id === hoveredPlanetParentId);
      const m = p?.moons.find((moon) => moon.id === hoveredMoonId);
      if (p && m) {
        title = `🌙 ${m.name}`;
        sub = `${m.type} • Click to View Project`;
        color = `rgb(${p.palette.base.join(",")})`;
      }
    } else if (hoveredPlanetId) {
      if (hoveredPlanetId === "earth") {
        title = "🌍 Earth (Origin)";
        sub = "Ground Zero • Click to Return";
        color = "#34d399";
      } else {
        const p = planets.find((planet) => planet.id === hoveredPlanetId);
        if (p) {
          title = `🪐 Planet ${p.name}`;
          sub = `${p.moons.length} Orbiting Moons • Click for Info`;
          color = `rgb(${p.palette.base.join(",")})`;
        }
      }
    }

    if (!title) return;

    ctx.save();
    const tx = Math.min(width - 180, Math.max(10, mouseScreenX + 16));
    const ty = Math.min(height - 45, Math.max(20, mouseScreenY - 26));

    ctx.font = "bold 11px ui-monospace, SFMono-Regular, monospace";
    const textW = Math.max(ctx.measureText(title).width, ctx.measureText(sub).width) + 20;

    ctx.fillStyle = "rgba(4, 10, 20, 0.92)";
    ctx.strokeStyle = color;
    ctx.lineWidth = 1.2;
    ctx.beginPath();
    ctx.roundRect(tx, ty, textW, 38, 8);
    ctx.fill();
    ctx.stroke();

    ctx.fillStyle = color;
    ctx.textAlign = "left";
    ctx.fillText(title, tx + 10, ty + 16);

    ctx.font = "9px ui-monospace, SFMono-Regular, monospace";
    ctx.fillStyle = "rgba(255, 255, 255, 0.75)";
    ctx.fillText(sub, tx + 10, ty + 30);
    ctx.restore();
  }

  // Start Loop
  requestAnimationFrame(render);
}
