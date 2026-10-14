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

import blenderLogo from "simple-icons/icons/blender.svg?raw";
import cLogo from "simple-icons/icons/c.svg?raw";
import linuxLogo from "simple-icons/icons/linux.svg?raw";
import pythonPixelLogo from "./assets/tech/python-pixel-logo.png?url";
import swiftLogo from "simple-icons/icons/swift.svg?raw";
import typescriptLogo from "simple-icons/icons/typescript.svg?raw";

type TechPlanetId = "python" | "typescript" | "swift" | "c-systems" | "foss-devops" | "gamedev-3d";

const techLogos: Record<TechPlanetId, { svg?: string; src?: string; color: string }> = {
  python: { src: pythonPixelLogo, color: "#3776ab" },
  typescript: { svg: typescriptLogo, color: "#3178c6" },
  swift: { svg: swiftLogo, color: "#f05138" },
  "c-systems": { svg: cLogo, color: "#a8b9cc" },
  "foss-devops": { svg: linuxLogo, color: "#fcc624" },
  "gamedev-3d": { svg: blenderLogo, color: "#e87d0d" },
};

export interface TechMoon {
  id: string;
  name: string;
  type: string;
  summary: string;
  link?: string;
  color?: [number, number, number];
  semiMajor: number;   // Elliptical major axis (a)
  semiMinor: number;   // Elliptical minor axis (b)
  inclination: number; // Tilt angle in radians
  speed: number;       // Slower celestial speed (rad/frame)
  angle: number;       // Current orbital angle
  size: number;        // Moon pixel radius
}

export interface TechPlanet {
  id: TechPlanetId;
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

interface TechContentMoon {
  id: string;
  name: string;
  type: string;
  summary: string;
  link?: string;
  distance: number;
  orbit_speed: number;
  color: string;
  size: number;
}

interface TechContentPlanet {
  id: TechPlanetId;
  name: string;
  short_name: string;
  tagline: string;
  experience: string;
  color: string;
  glow_color: string;
  distance: number;
  orbit_speed: number;
  size: number;
  texture_type?: string;
  has_rings?: boolean;
  frameworks: string[];
  moons: TechContentMoon[];
}

const techPlanetIds: TechPlanetId[] = [
  "python",
  "typescript",
  "swift",
  "c-systems",
  "foss-devops",
  "gamedev-3d",
];

function isPositiveNumber(value: unknown): value is number {
  return typeof value === "number" && Number.isFinite(value) && value > 0;
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null;
}

function isTechPlanetId(value: unknown): value is TechPlanetId {
  return typeof value === "string" && techPlanetIds.some((id) => id === value);
}

function isTechContentMoon(value: unknown): value is TechContentMoon {
  return isRecord(value)
    && typeof value.id === "string"
    && typeof value.name === "string"
    && typeof value.type === "string"
    && typeof value.summary === "string"
    && (value.link === undefined || typeof value.link === "string")
    && isPositiveNumber(value.distance)
    && typeof value.orbit_speed === "number"
    && Number.isFinite(value.orbit_speed)
    && typeof value.color === "string"
    && isPositiveNumber(value.size);
}

function isTechContentPlanet(value: unknown): value is TechContentPlanet {
  return isRecord(value)
    && isTechPlanetId(value.id)
    && typeof value.name === "string"
    && typeof value.short_name === "string"
    && typeof value.tagline === "string"
    && typeof value.experience === "string"
    && typeof value.color === "string"
    && typeof value.glow_color === "string"
    && isPositiveNumber(value.distance)
    && typeof value.orbit_speed === "number"
    && Number.isFinite(value.orbit_speed)
    && isPositiveNumber(value.size)
    && (value.texture_type === undefined || typeof value.texture_type === "string")
    && (value.has_rings === undefined || typeof value.has_rings === "boolean")
    && Array.isArray(value.frameworks)
    && value.frameworks.every((framework) => typeof framework === "string")
    && Array.isArray(value.moons)
    && value.moons.every(isTechContentMoon);
}

function readTechContentPlanets(): TechContentPlanet[] {
  const dataElement = document.getElementById("tech-planet-data");
  if (!dataElement?.textContent) {
    throw new Error("Tech planet data is missing from the generated page.");
  }

  let parsed: unknown;
  try {
    parsed = JSON.parse(dataElement.textContent);
  } catch (error) {
    throw new Error("Tech planet data is not valid JSON.", { cause: error });
  }

  if (!Array.isArray(parsed) || parsed.length === 0 || !parsed.every(isTechContentPlanet)) {
    throw new Error("Tech planet data does not match the expected content format.");
  }
  return parsed;
}

function parseHexColor(value: string): [number, number, number] {
  const match = /^#([0-9a-f]{6})$/i.exec(value);
  if (!match) {
    throw new Error(`Invalid tech planet color: ${value}`);
  }
  const hex = match[1];
  return [
    Number.parseInt(hex.slice(0, 2), 16),
    Number.parseInt(hex.slice(2, 4), 16),
    Number.parseInt(hex.slice(4, 6), 16),
  ];
}

export function initTechCosmos(): void {
  const container = document.getElementById("tech-observatory-root");
  if (!container) return;

  const canvas = document.getElementById("tech-canvas") as HTMLCanvasElement | null;
  if (!canvas) return;

  const ctx = canvas.getContext("2d");
  if (!ctx) return;

  const earthSprite = new Image();
  let earthFrameSize = 0;
  let earthFrameCount = 0;
  earthSprite.addEventListener("load", () => {
    earthFrameSize = earthSprite.naturalHeight;
    if (earthFrameSize === 0 || earthSprite.naturalWidth % earthFrameSize !== 0) {
      earthFrameSize = 0;
      console.error("The Earth spritesheet must contain evenly sized square frames.");
      return;
    }
    earthFrameCount = earthSprite.naturalWidth / earthFrameSize;
  });
  earthSprite.addEventListener("error", () => {
    console.error("Unable to load the Earth animation spritesheet.");
  });
  earthSprite.src = new URL("./assets/tech/earth-spritesheet.png", import.meta.url).href;

  // --- Deep-Fold Style Procedural Pixel Planets ---
  const planetDefaults: TechPlanet[] = [
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
        base: [59, 130, 246],    // Ocean blue
        detail: [191, 219, 254], // Pale cloud bands
        shadow: [30, 58, 138],   // Deep navy shadow
        outline: [10, 25, 47],
        ring: [191, 219, 254],   // Pale pixel ring
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

  const defaultsById = new Map(planetDefaults.map((planet) => [planet.id, planet]));
  const planetTypeByTexture: Partial<Record<string, TechPlanet["planetType"]>> = {
    bands: "gas",
    rings: "ice",
    aurora: "desert",
    magma: "magma",
    nodes: "alien",
    terrestrial: "terran",
  };
  const planets: TechPlanet[] = readTechContentPlanets().map((contentPlanet, index) => {
    const defaults = defaultsById.get(contentPlanet.id);
    if (!defaults) {
      throw new Error(`No visual configuration exists for tech planet "${contentPlanet.id}".`);
    }

    const baseColor = parseHexColor(contentPlanet.color);
    const glowColor = parseHexColor(contentPlanet.glow_color);
    const texture = contentPlanet.texture_type;
    const planetType = texture ? planetTypeByTexture[texture] : undefined;
    if (texture && !planetType) {
      throw new Error(`Unknown texture type "${texture}" for tech planet "${contentPlanet.id}".`);
    }
    const palette = {
      ...defaults.palette,
      base: baseColor,
      detail: glowColor,
    };
    if (contentPlanet.has_rings === true) {
      palette.ring = glowColor;
    } else if (contentPlanet.has_rings === false) {
      delete palette.ring;
    }

    return {
      ...defaults,
      name: contentPlanet.name,
      shortName: contentPlanet.short_name,
      tagline: contentPlanet.tagline,
      experience: contentPlanet.experience,
      planetType: planetType ?? defaults.planetType,
      palette,
      size: contentPlanet.size * 7.5,
      altitude: contentPlanet.distance * 4.5,
      rotationSpeed: contentPlanet.orbit_speed * 2,
      frameworks: [...contentPlanet.frameworks],
      moons: contentPlanet.moons.map((contentMoon, moonIndex) => {
        const moonDefaults = defaults.moons.find((moon) => moon.id === contentMoon.id);
        return {
          id: contentMoon.id,
          name: contentMoon.name,
          type: contentMoon.type,
          summary: contentMoon.summary,
          link: contentMoon.link,
          color: parseHexColor(contentMoon.color),
          semiMajor: contentMoon.distance * 4.5,
          semiMinor: contentMoon.distance * 1.8,
          inclination: moonDefaults?.inclination ?? (moonIndex % 2 === 0 ? 0.2 : -0.2),
          speed: contentMoon.orbit_speed * 0.14,
          angle: moonDefaults?.angle ?? (moonIndex * 2.1),
          size: contentMoon.size * 4.5,
        };
      }),
    };
  });

  for (const planet of planets) {
    planet.xOffset = (Math.random() - 0.5) * 1.5;
    planet.altitude += (Math.random() - 0.5) * 180;
    planet.size *= 0.55 + Math.random() * 1.1;
    for (const moon of planet.moons) {
      moon.size *= 0.55 + Math.random() * 1.1;
    }
  }

  const maxAltitude = Math.max(...planets.map((planet) => planet.altitude)) + 200;

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
    const earthBaseY = height;
    return {
      x: width * 0.5 + wx,
      y: earthBaseY - (wy - cameraAltitude),
    };
  }

  function screenToWorld(sx: number, sy: number): { x: number; y: number } {
    const earthBaseY = height;
    return {
      x: sx - width * 0.5,
      y: earthBaseY - sy + cameraAltitude,
    };
  }

  function getEarthRadius(): number {
    return Math.min(width * 0.38, 200);
  }

  const minEarthPlanetGap = 100;

  function getPlanetWorldPos(p: TechPlanet): { x: number; y: number } {
    const horizontalSpread = Math.min(width * 0.38, 280);
    const orbitScale = getMoonOrbitScale(p);
    const orbitExtent = Math.max(...p.moons.map((moon) => moon.semiMajor * orbitScale + moon.size));
    const ringExtent = p.palette.ring ? p.size * 1.65 : p.size;
    const verticalSystemExtent = Math.max(
      p.size,
      ...p.moons.map((moon) =>
        Math.hypot(
          moon.semiMajor * orbitScale * Math.sin(moon.inclination),
          moon.semiMinor * orbitScale * Math.cos(moon.inclination)
        ) + moon.size
      )
    );
    const labelExtent = Math.max(42, p.name.length * 4.5);
    const maxOffset = Math.max(0, width * 0.5 - Math.max(ringExtent, orbitExtent, labelExtent) - 14);
    const desiredOffset = p.xOffset * horizontalSpread;
    const earthRadius = getEarthRadius();
    return {
      x: Math.max(-maxOffset, Math.min(maxOffset, desiredOffset)),
      y: Math.max(p.altitude, earthRadius + verticalSystemExtent + minEarthPlanetGap),
    };
  }

  function getMoonOrbitScale(p: TechPlanet): number {
    const largestOrbit = Math.max(...p.moons.map((moon) => moon.semiMajor));
    const largestMoon = Math.max(...p.moons.map((moon) => moon.size));
    const availableWidth = Math.max(0, width * 0.5 - p.size - largestMoon - 18);
    return Math.min(1, availableWidth / largestOrbit);
  }

  // Elliptical orbit calculation with inclination tilt!
  function getMoonWorldPos(p: TechPlanet, m: TechMoon): { x: number; y: number; isBehind: boolean } {
    const pPos = getPlanetWorldPos(p);
    const orbitScale = getMoonOrbitScale(p);
    // Unrotated ellipse position:
    const ex = Math.cos(m.angle) * m.semiMajor * orbitScale;
    const ey = Math.sin(m.angle) * m.semiMinor * orbitScale;

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

  // Offscreen canvas cache for chunky pixel planets
  const planetCanvases = new Map<string, HTMLCanvasElement>();
  const planetImageData = new Map<string, ImageData>();

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
    const res = Math.min(p.res, 32);
    const offCanvas = getOffscreenCanvas(p.id, res);
    const offCtx = offCanvas.getContext("2d");
    if (!offCtx) return offCanvas;

    let imgData = planetImageData.get(p.id);
    if (!imgData) {
      imgData = offCtx.createImageData(res, res);
      planetImageData.set(p.id, imgData);
    }
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
          // Chunky ocean-and-cloud bands echo Earth's blue oceans and pale cloud belts.
          const cloudBand = Math.floor((lat + Math.sin(lon * 2) * 0.14) * 9);
          isDetail = cloudBand % 3 === 0 || (cloudBand % 7 === 1 && Math.sin(lon * 5) > 0.25);
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

    return offCanvas;
  }

  function drawPixelOrbit(
    centerX: number,
    centerY: number,
    semiMajor: number,
    semiMinor: number,
    inclination: number,
    alpha = 0.2
  ) {
    const pixelSize = 2;
    const steps = 64;
    const cosI = Math.cos(inclination);
    const sinI = Math.sin(inclination);
    ctx.fillStyle = `rgba(255, 255, 255, ${alpha})`;
    ctx.beginPath();
    for (let i = 0; i < steps; i++) {
      const angle = (i / steps) * Math.PI * 2;
      const ex = Math.cos(angle) * semiMajor;
      const ey = Math.sin(angle) * semiMinor;
      const x = Math.round(centerX + ex * cosI - ey * sinI);
      const y = Math.round(centerY + ex * sinI + ey * cosI);
      ctx.rect(x - pixelSize / 2, y - pixelSize / 2, pixelSize, pixelSize);
    }
    ctx.fill();
  }

  function drawPixelRing(p: TechPlanet, centerX: number, centerY: number, front: boolean) {
    if (!p.palette.ring) return;

    const radiusX = p.size * 1.55;
    const radiusY = p.size * 0.48;
    const pixelSize = Math.max(2, Math.round(p.size / 16));
    const steps = 144;
    const rotation = -0.32;
    const cosRotation = Math.cos(rotation);
    const sinRotation = Math.sin(rotation);
    const bands = [
      { scale: 1, color: p.palette.shadow },
      { scale: 0.91, color: p.palette.ring },
      { scale: 0.82, color: p.palette.base },
    ];

    for (const band of bands) {
      ctx.fillStyle = `rgb(${band.color[0]}, ${band.color[1]}, ${band.color[2]})`;
      ctx.beginPath();
      for (let i = 0; i < steps; i++) {
        const angle = (i / steps) * Math.PI * 2;
        if ((Math.sin(angle) > 0) !== front) continue;
        const ellipseX = Math.cos(angle) * radiusX * band.scale;
        const ellipseY = Math.sin(angle) * radiusY * band.scale;
        const x = Math.round(centerX + ellipseX * cosRotation - ellipseY * sinRotation);
        const y = Math.round(centerY + ellipseX * sinRotation + ellipseY * cosRotation);
        ctx.rect(x - pixelSize / 2, y - pixelSize / 2, pixelSize, pixelSize);
      }
      ctx.fill();
    }
  }

  // --- Project Modal Management ---
  const modalEl = document.getElementById("project-modal");
  if (modalEl) document.body.appendChild(modalEl);
  const modalPanelEl = modalEl?.querySelector<HTMLElement>(".modal-panel");
  const modalContentEl = modalEl?.querySelector<HTMLElement>(".modal-content");
  const modalLogoEl = document.getElementById("modal-tech-logo");
  const modalBadgeEl = document.getElementById("modal-badge");
  const modalTitleEl = document.getElementById("modal-title");
  const modalSubEl = document.getElementById("modal-subtitle");
  const modalDescEl = document.getElementById("modal-desc");
  const modalLinkContainer = document.getElementById("modal-link-container");
  const modalCloseBtn = document.getElementById("modal-close-btn");

  function setModalAccent(color: [number, number, number]): void {
    const accent = `rgb(${color.join(",")})`;
    modalPanelEl?.style.setProperty("--modal-accent", accent);
    if (modalBadgeEl) {
      modalBadgeEl.style.borderColor = accent;
      modalBadgeEl.style.color = accent;
    }
  }

  function setModalLogo(planet: TechPlanet): void {
    if (!modalLogoEl) return;
    const logo = techLogos[planet.id];
    modalLogoEl.style.setProperty("--tech-logo-color", logo.color);
    modalLogoEl.innerHTML = logo.src
      ? `<img src="${logo.src}" alt="" draggable="false">`
      : logo.svg?.replace("<svg ", '<svg fill="currentColor" ') ?? "";
  }

  function openMoonModal(planet: TechPlanet, moon: TechMoon) {
    if (!modalEl || !modalTitleEl || !modalDescEl) return;

    if (modalContentEl) modalContentEl.scrollTop = 0;
    setModalAccent(planet.palette.base);
    setModalLogo(planet);
    if (modalBadgeEl) {
      modalBadgeEl.textContent = moon.type.toUpperCase();
    }
    modalTitleEl.textContent = moon.name;
    if (modalSubEl) {
      modalSubEl.textContent = `${planet.name} · ${planet.tagline}`;
    }
    modalDescEl.innerHTML = `
      <div class="grid grid-cols-2 gap-2">
        <div class="modal-record-section rounded-lg border border-white/10 bg-white/[0.025] p-3">
          <div class="font-mono text-[9px] uppercase tracking-widest text-slate-500">Satellite type</div>
          <div class="mt-1 text-xs font-semibold text-white">${moon.type}</div>
        </div>
        <div class="modal-record-section rounded-lg border border-white/10 bg-white/[0.025] p-3">
          <div class="font-mono text-[9px] uppercase tracking-widest text-slate-500">Parent system</div>
          <div class="mt-1 truncate text-xs font-semibold text-white">${planet.name}</div>
        </div>
      </div>
      <section class="modal-record-section mt-3 rounded-lg border border-white/10 bg-black/20 p-3">
        <div class="mb-2 font-mono text-[10px] uppercase tracking-widest text-slate-400">Project record</div>
        <p class="text-xs leading-relaxed text-slate-200">${moon.summary}</p>
      </section>
    `;

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

    if (modalContentEl) modalContentEl.scrollTop = 0;
    setModalAccent(planet.palette.base);
    setModalLogo(planet);
    if (modalBadgeEl) {
      modalBadgeEl.textContent = "CORE LANGUAGE / TECH";
    }
    modalTitleEl.textContent = planet.name;
    if (modalSubEl) {
      modalSubEl.textContent = `${planet.tagline} • ${planet.experience}`;
    }

    modalDescEl.innerHTML = `
      <div class="space-y-4">
        <section class="modal-record-section rounded-lg border border-white/10 bg-white/[0.025] p-3">
          <div class="mb-2 flex items-center justify-between font-mono text-[10px] uppercase tracking-widest text-slate-400">
            <span>Stack / Frameworks</span>
            <span>${planet.frameworks.length} entries</span>
          </div>
          <div class="flex flex-wrap gap-1.5">
            ${planet.frameworks.map((framework) => `<span class="rounded border border-white/10 bg-black/20 px-2 py-1 font-mono text-[10px] text-slate-200">${framework}</span>`).join("")}
          </div>
        </section>
        <div class="grid grid-cols-2 gap-2">
          <div class="modal-record-section rounded-lg border border-white/10 bg-white/[0.025] p-3">
            <div class="font-mono text-[9px] uppercase tracking-widest text-slate-500">Project satellites</div>
            <div class="mt-1 text-lg font-semibold text-white">${planet.moons.length}</div>
          </div>
          <div class="modal-record-section rounded-lg border border-white/10 bg-white/[0.025] p-3">
            <div class="font-mono text-[9px] uppercase tracking-widest text-slate-500">Experience</div>
            <div class="mt-1 text-xs font-semibold text-white">${planet.experience}</div>
          </div>
        </div>
        <section>
          <div class="mb-2 flex items-center justify-between font-mono text-[10px] uppercase tracking-widest text-slate-400">
            <span>Orbiting projects</span>
            <span>NAME / TYPE</span>
          </div>
          <div class="space-y-1.5">
            ${planet.moons.map((moon, index) => `
              <div class="flex items-center gap-3 rounded-lg border border-white/10 bg-black/20 px-3 py-2">
                <span class="font-mono text-[10px] text-slate-500">${String(index + 1).padStart(2, "0")}</span>
                <span class="min-w-0 flex-1 truncate text-xs text-slate-100">${moon.name}</span>
                <span class="shrink-0 font-mono text-[9px] uppercase text-slate-500">${moon.type}</span>
              </div>
            `).join("")}
          </div>
        </section>
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
      const earthRadius = getEarthRadius();
      const earthCenter = worldToScreen(0, 0);
      const earthDistance = Math.hypot(mouseScreenX - earthCenter.x, mouseScreenY - earthCenter.y);
      if (mouseScreenY <= height && earthDistance <= earthRadius) {
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

  // --- DRAW: EARTH (PIXEL-PLANET HORIZON) ---
  function drawEarth() {
    const earthCenter = worldToScreen(0, 0);
    const centerX = earthCenter.x;
    const centerY = earthCenter.y;
    const radius = getEarthRadius();
    if (centerY - radius * 1.35 > height) return;

    ctx.save();
    const glowGrad = ctx.createRadialGradient(centerX, centerY, radius * 0.55, centerX, centerY, radius * 1.35);
    glowGrad.addColorStop(0, "rgba(52, 211, 153, 0.35)");
    glowGrad.addColorStop(0.7, "rgba(16, 185, 129, 0.1)");
    glowGrad.addColorStop(1, "transparent");
    ctx.fillStyle = glowGrad;
    ctx.beginPath();
    ctx.arc(centerX, centerY, radius * 1.35, 0, Math.PI * 2);
    ctx.fill();

    if (earthSprite.complete && earthFrameCount > 0) {
      const frameIndex = Math.floor(animClock * 3) % earthFrameCount;
      ctx.imageSmoothingEnabled = false;
      ctx.save();
      ctx.beginPath();
      ctx.arc(centerX, centerY, radius, 0, Math.PI * 2);
      ctx.clip();
      ctx.drawImage(
        earthSprite,
        frameIndex * earthFrameSize,
        0,
        earthFrameSize,
        earthFrameSize,
        centerX - radius,
        centerY - radius,
        radius * 2,
        radius * 2
      );
      ctx.restore();
    }

    ctx.font = "bold 13px ui-monospace, SFMono-Regular, monospace";
    ctx.textAlign = "center";
    ctx.fillStyle = "#042f2e";
    ctx.fillText("EARTH", centerX, centerY - radius * 0.48);

    ctx.font = "10px ui-monospace, SFMono-Regular, monospace";
    ctx.fillStyle = "#064e3b";
    ctx.fillText("", centerX, centerY - radius * 0.34);

    ctx.restore();
  }

  // --- DRAW: PLANET AND MOONS (WITH ELLIPTICAL ORBITS & Z-DEPTH) ---
  function drawPlanetAndMoons(p: TechPlanet) {
    const pPos = getPlanetWorldPos(p);
    const s = worldToScreen(pPos.x, pPos.y);
    const orbitScale = getMoonOrbitScale(p);
    const screenExtent = Math.max(
      p.size + 42,
      ...p.moons.map((moon) =>
        Math.hypot(
          moon.semiMajor * orbitScale * Math.sin(moon.inclination),
          moon.semiMinor * orbitScale * Math.cos(moon.inclination)
        ) + moon.size
      )
    );
    if (s.y + screenExtent < 0 || s.y - screenExtent > height) return;

    ctx.save();

    // 1. Draw pixel-step elliptical orbit paths for each moon
    for (const m of p.moons) {
      drawPixelOrbit(
        s.x,
        s.y,
        m.semiMajor * orbitScale,
        m.semiMinor * orbitScale,
        m.inclination
      );
    }

    // 2. Draw the far side of the planet's pixel ring
    drawPixelRing(p, s.x, s.y, false);

    // 3. Draw moons behind the planet
    for (const m of p.moons) {
      const pos = getMoonWorldPos(p, m);
      if (pos.isBehind) {
        drawMoon(p, m, pos);
      }
    }

    // 4. Draw the chunky pixel planet
    const pixelCanvas = renderPixelPlanet(p);

    ctx.save();
    ctx.imageSmoothingEnabled = false;
    const destSize = p.size * 2;
    ctx.drawImage(
      pixelCanvas,
      0,
      0,
      pixelCanvas.width,
      pixelCanvas.height,
      s.x - p.size,
      s.y - p.size,
      destSize,
      destSize
    );
    ctx.restore();

    // 5. Draw the near side of the ring and foreground moons
    drawPixelRing(p, s.x, s.y, true);
    for (const m of p.moons) {
      const pos = getMoonWorldPos(p, m);
      if (!pos.isBehind) {
        drawMoon(p, m, pos);
      }
    }

    // 6. Pixel-font planet labels
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
    const scale = pos.isBehind ? 0.85 : 1.0;
    const mRadius = m.size * scale;
    const moonColor = m.color ?? [184, 216, 232];
    const moonShadow = moonColor.map((channel) => Math.round(channel * 0.16));
    const moonMid = moonColor.map((channel) => Math.round(channel * 0.72));
    const moonHighlight = moonColor.map((channel) => Math.min(255, Math.round(channel * 1.25)));
    ctx.globalAlpha = pos.isBehind ? 0.7 : 1.0;
    const pixelSize = Math.max(2, Math.round(mRadius / 4));
    const left = Math.floor((s.x - mRadius) / pixelSize) * pixelSize;
    const top = Math.floor((s.y - mRadius) / pixelSize) * pixelSize;

    for (let y = top; y <= s.y + mRadius; y += pixelSize) {
      for (let x = left; x <= s.x + mRadius; x += pixelSize) {
        const dx = x + pixelSize * 0.5 - s.x;
        const dy = y + pixelSize * 0.5 - s.y;
        const distance = Math.hypot(dx, dy);
        if (distance > mRadius + pixelSize * 0.45) continue;

        ctx.fillStyle = distance > mRadius - pixelSize
          ? `rgb(${moonShadow.join(",")})`
          : dx > mRadius * 0.2 && dy > 0
            ? `rgb(${moonMid.join(",")})`
            : dx < -mRadius * 0.3 && dy < -mRadius * 0.2
              ? `rgb(${moonHighlight.join(",")})`
              : `rgb(${moonColor.join(",")})`;
        ctx.fillRect(x, y, pixelSize, pixelSize);
      }
    }

    if (isHovered) {
      ctx.strokeStyle = `rgb(${p.palette.base.join(",")})`;
      ctx.lineWidth = pixelSize;
      for (let i = 0; i < 24; i++) {
        const angle = (i / 24) * Math.PI * 2;
        ctx.fillStyle = `rgb(${p.palette.base.join(",")})`;
        ctx.fillRect(
          Math.round(s.x + Math.cos(angle) * (mRadius + 4)),
          Math.round(s.y + Math.sin(angle) * (mRadius + 4)),
          pixelSize,
          pixelSize
        );
      }
    }

    ctx.restore();
  }

  // --- DRAW: HOVER TOOLTIP ---
  function drawHoverTooltip() {
    if (!hoveredPlanetId && !hoveredMoonId) return;

    let title = "";
    let sub = "";

    if (hoveredMoonId && hoveredPlanetParentId) {
      const p = planets.find((planet) => planet.id === hoveredPlanetParentId);
      const m = p?.moons.find((moon) => moon.id === hoveredMoonId);
      if (p && m) {
        title = m.name;
        sub = "Click to view project";
      }
    } else if (hoveredPlanetId) {
      if (hoveredPlanetId === "earth") {
        title = "Earth";
        sub = "Click to return to ground zero";
      } else {
        const p = planets.find((planet) => planet.id === hoveredPlanetId);
        if (p) {
          title = p.name;
          sub = `${p.moons.length} projects · Click to inspect`;
        }
      }
    }

    if (!title) return;

    ctx.save();
    ctx.font = "bold 11px ui-monospace, SFMono-Regular, monospace";
    const titleWidth = ctx.measureText(title).width;
    ctx.font = "10px ui-monospace, SFMono-Regular, monospace";
    const subWidth = ctx.measureText(sub).width;
    const tooltipWidth = Math.min(width - 20, Math.max(titleWidth, subWidth) + 20);
    const tooltipHeight = 38;
    const tx = Math.max(10, Math.min(width - tooltipWidth - 10, mouseScreenX + 14));
    const ty = Math.max(10, Math.min(height - tooltipHeight - 10, mouseScreenY - tooltipHeight - 10));

    ctx.fillStyle = "rgba(5, 8, 17, 0.94)";
    ctx.strokeStyle = "rgba(148, 163, 184, 0.35)";
    ctx.lineWidth = 1;
    ctx.beginPath();
    ctx.roundRect(tx, ty, tooltipWidth, tooltipHeight, 5);
    ctx.fill();
    ctx.stroke();

    ctx.fillStyle = "#f8fafc";
    ctx.textAlign = "left";
    ctx.font = "bold 11px ui-monospace, SFMono-Regular, monospace";
    ctx.fillText(title, tx + 10, ty + 15, tooltipWidth - 20);

    ctx.font = "10px ui-monospace, SFMono-Regular, monospace";
    ctx.fillStyle = "#94a3b8";
    ctx.fillText(sub, tx + 10, ty + 30, tooltipWidth - 20);
    ctx.restore();
  }

  // Start Loop
  requestAnimationFrame(render);
}
