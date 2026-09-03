/**
 * The Pavilion Gallery - Curated 2.5D Isometric Exhibition
 * Continuous seamless walls (no voxel seams), unobstructed art sightlines,
 * natural fluid WASD movement, and silent ledger bidding.
 */

interface Artwork {
  id: string;
  title: string;
  medium: string;
  year: string;
  dimensions: string;
  description: string;
  image: string;
  starting_bid: number;
}

interface BidRecord {
  patron: string;
  amount: number;
  timestamp: string;
}

interface ArtworkLedger {
  title: string;
  starting_bid: number;
  highest_bid: number;
  leading_patron: string;
  bids: BidRecord[];
}

interface MountedPainting {
  artId: string;
  col: number;
  row: number;
  face: "SE" | "SW"; // SE = facing south-east, SW = facing south-west
  imgElement: HTMLImageElement;
  title: string;
  lotNum: number;
  category: "physical" | "digital" | "blender";
  isReservedMount?: boolean;
  wingName?: string;
}

export function initMuseumMaze() {
  const canvas = document.getElementById("museum-canvas") as HTMLCanvasElement | null;
  if (!canvas) return;

  const ctx = canvas.getContext("2d");
  if (!ctx) return;

  const minimapCanvas = document.getElementById("minimap-canvas") as HTMLCanvasElement | null;
  const minimapCtx = minimapCanvas?.getContext("2d") || null;

  // Load artworks metadata from embedded JSON
  const rawDataScript = document.getElementById("museum-artworks-data");
  const baseUrl = rawDataScript?.getAttribute("data-base-url") || "";
  let artworks: Artwork[] = [];
  try {
    if (rawDataScript && rawDataScript.textContent) {
      artworks = JSON.parse(rawDataScript.textContent);
    }
  } catch (e) {
    console.warn("Could not parse artworks data:", e);
  }

  // --- Sound Synthesizer ---
  let audioCtx: AudioContext | null = null;
  let sfxEnabled = true;

  function initAudio() {
    if (!audioCtx) {
      const AudioClass =
        window.AudioContext ||
        (window as unknown as { webkitAudioContext: typeof AudioContext }).webkitAudioContext;
      if (AudioClass) audioCtx = new AudioClass();
    }
    if (audioCtx && audioCtx.state === "suspended") {
      audioCtx.resume();
    }
  }

  function playChime() {
    if (!sfxEnabled) return;
    initAudio();
    if (!audioCtx) return;
    const now = audioCtx.currentTime;
    const osc = audioCtx.createOscillator();
    const gain = audioCtx.createGain();
    osc.type = "sine";
    osc.frequency.setValueAtTime(523.25, now);
    osc.frequency.exponentialRampToValueAtTime(783.99, now + 0.18);
    gain.gain.setValueAtTime(0.12, now);
    gain.gain.exponentialRampToValueAtTime(0.001, now + 0.65);
    osc.connect(gain);
    gain.connect(audioCtx.destination);
    osc.start(now);
    osc.stop(now + 0.65);
  }

  function playStep() {
    if (!sfxEnabled) return;
    initAudio();
    if (!audioCtx) return;
    const now = audioCtx.currentTime;
    const osc = audioCtx.createOscillator();
    const gain = audioCtx.createGain();
    osc.type = "triangle";
    osc.frequency.setValueAtTime(110, now);
    osc.frequency.exponentialRampToValueAtTime(55, now + 0.06);
    gain.gain.setValueAtTime(0.02, now);
    gain.gain.exponentialRampToValueAtTime(0.001, now + 0.06);
    osc.connect(gain);
    gain.connect(audioCtx.destination);
    osc.start(now);
    osc.stop(now + 0.06);
  }

  const sfxBtn = document.getElementById("museum-sfx-btn");
  if (sfxBtn) {
    sfxBtn.addEventListener("click", () => {
      sfxEnabled = !sfxEnabled;
      sfxBtn.textContent = sfxEnabled ? "Audio On" : "Muted";
      sfxBtn.classList.toggle("opacity-50", !sfxEnabled);
    });
  }

  // --- Dimensions & Coordinate Projections ---
  const COLS = 22;
  const ROWS = 22;
  const TILE_W = 68; // Isometric tile width
  const TILE_H = 34; // Isometric tile height

  const GALLERY_WALL_H = 48;
  const PERIMETER_WALL_H = 58;

  function toIso(col: number, row: number): { x: number; y: number } {
    return {
      x: (col - row) * (TILE_W / 2),
      y: (col + row) * (TILE_H / 2),
    };
  }

  function fromIso(screenX: number, screenY: number): { col: number; row: number } {
    const x = screenX / (TILE_W / 2);
    const y = screenY / (TILE_H / 2);
    return {
      col: (x + y) / 2,
      row: (y - x) / 2,
    };
  }

  // Canvas Sizing
  function resize() {
    if (!canvas || !canvas.parentElement) return;
    canvas.width = canvas.parentElement.clientWidth;
    canvas.height = Math.max(620, Math.min(window.innerHeight * 0.78, 800));
  }
  window.addEventListener("resize", resize);
  resize();

  // --- Architectural Museum Floor Plan (22x22 Curated Estate) ---
  // Base architectural walls and corridors; chairs (value 3) are placed dynamically by randomizeChairs()
  const MAP: number[][] = [
    // 0  1  2  3  4  5  6  7  8  9 10 11 12 13 14 15 16 17 18 19 20 21
    [2, 2, 2, 2, 2, 2, 2, 2, 2, 2, 2, 2, 2, 2, 2, 2, 2, 2, 2, 2, 2, 2], // 0: North Perimeter Wall
    [2, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 2], // 1: North Masterpiece Promenade
    [2, 0, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 0, 2], // 2: Grand Masterpiece North Wall Run
    [2, 0, 0, 0, 0, 0, 0, 1, 0, 0, 0, 0, 0, 0, 1, 0, 0, 0, 0, 0, 0, 2], // 3: Salon Viewing Aisle & Division Spines
    [2, 0, 0, 1, 1, 1, 0, 1, 0, 1, 1, 1, 1, 0, 1, 0, 1, 1, 1, 0, 0, 2], // 4: Drawing Salon, Masterpiece Island & Color Salon
    [2, 0, 0, 0, 0, 0, 0, 1, 0, 0, 0, 0, 0, 0, 1, 0, 0, 0, 0, 0, 0, 2], // 5: Salon Floor
    [2, 0, 1, 1, 1, 0, 0, 1, 0, 1, 1, 0, 0, 0, 1, 0, 0, 1, 1, 1, 0, 2], // 6: South Salon Archways
    [2, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 2], // 7: Mid Concourse Walkway
    [2, 0, 0, 0, 1, 0, 0, 1, 0, 0, 0, 0, 0, 0, 1, 0, 0, 1, 0, 0, 0, 2], // 8: Wing Portal Colonnades
    [2, 0, 0, 0, 1, 0, 0, 1, 0, 0, 0, 0, 0, 0, 1, 0, 0, 1, 0, 0, 0, 2], // 9: Cyber & 3D Entry Corridors
    [2, 0, 1, 1, 1, 0, 0, 1, 0, 0, 0, 0, 0, 0, 1, 0, 0, 1, 1, 1, 0, 2], // 10: Gallery Headers
    [2, 0, 1, 0, 1, 0, 0, 1, 0, 0, 0, 0, 0, 0, 1, 0, 0, 1, 0, 1, 0, 2], // 11: Display Alcove Corridors
    [2, 0, 0, 0, 1, 0, 1, 1, 0, 0, 0, 0, 0, 0, 1, 1, 0, 1, 0, 0, 0, 2], // 12: Digital & 3D Floor
    [2, 0, 1, 0, 1, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 1, 0, 1, 0, 2], // 13: Central Rotunda Upper Floor
    [2, 0, 1, 1, 1, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 1, 1, 1, 0, 2], // 14: Central Rotunda Lower Floor
    [2, 0, 1, 0, 1, 0, 0, 1, 0, 0, 0, 0, 0, 0, 1, 0, 0, 1, 0, 1, 0, 2], // 15: Cross Promenade Portals
    [2, 0, 0, 0, 1, 0, 1, 1, 0, 0, 0, 0, 0, 0, 1, 1, 0, 1, 0, 0, 0, 2], // 16: South Wing Floor
    [2, 0, 1, 0, 1, 0, 0, 1, 0, 0, 0, 0, 0, 0, 1, 0, 0, 1, 0, 1, 0, 2], // 17: Lower Cyber & 3D Corridors
    [2, 0, 1, 1, 1, 0, 0, 1, 0, 0, 0, 0, 0, 0, 1, 0, 0, 1, 1, 1, 0, 2], // 18: Pavilion End Portals
    [2, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 2], // 19: Grand Foyer Promenade
    [2, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 2], // 20: Grand Entrance Foyer (Spawn at 10.5, 20.5)
    [2, 2, 2, 2, 2, 2, 2, 2, 2, 2, 2, 2, 2, 2, 2, 2, 2, 2, 2, 2, 2, 2], // 21: South Perimeter Wall
  ];

  // All exhibition walls stand at calibrated 2.5D architectural height
  function getWallHeight(r: number, c: number): number {
    if (MAP[r][c] === 2) return PERIMETER_WALL_H; // Perimeter walls
    return GALLERY_WALL_H; // Exhibition partition walls
  }

  // --- Museum Wing Zones & Architecture ---
  // Physical: North Grand Fine Art Suite (r <= 7)
  // Digital: West Cyber Digital Studio (c <= 7 && r >= 8 && r <= 18)
  // Blender: East 3D Blender Pavilion (c >= 14 && r >= 8 && r <= 18)
  // Nexus: Grand Central Rotunda & Entrance Foyer (c = 8..13 or r >= 19)
  type WingZone = "physical" | "digital" | "blender" | "nexus";

  function getTileZone(c: number, r: number): WingZone {
    if (r <= 7) return "physical"; // North Grand Fine Art Suite
    if (r >= 8 && r <= 18) {
      if (c <= 7) return "digital"; // West Cyber Digital Studio
      if (c >= 14) return "blender"; // East 3D Blender Pavilion
      return "nexus"; // Central Grand Rotunda & Promenade
    }
    return "nexus"; // Grand Entrance Foyer (r >= 19)
  }

  // Wing-Specific Exhibition Wall Slots
  // 1. Physical Art Gallery (North Grand Fine Art Suite - 19 feature wall slots, mixed SW and SE faces)
  const PHYSICAL_SLOTS: Array<{ col: number; row: number; face: "SW" | "SE" }> = [
    { col: 2, row: 2, face: "SW" },
    { col: 3, row: 2, face: "SW" },
    { col: 4, row: 2, face: "SW" },
    { col: 5, row: 2, face: "SW" },
    { col: 6, row: 2, face: "SW" },
    { col: 8, row: 2, face: "SW" },
    { col: 9, row: 2, face: "SW" },
    { col: 10, row: 2, face: "SW" },
    { col: 11, row: 2, face: "SW" },
    { col: 12, row: 2, face: "SW" },
    { col: 13, row: 2, face: "SW" },
    { col: 15, row: 2, face: "SW" },
    { col: 16, row: 2, face: "SW" },
    { col: 17, row: 2, face: "SW" },
    { col: 18, row: 2, face: "SW" },
    { col: 19, row: 2, face: "SE" },
    { col: 7, row: 3, face: "SE" },
    { col: 14, row: 3, face: "SE" },
    { col: 4, row: 4, face: "SW" },
  ];

  // 2. Digital Art Studio (West Cyber Studio - 23 feature wall slots, mixed SW and SE faces)
  const DIGITAL_SLOTS: Array<{ col: number; row: number; face: "SW" | "SE" }> = [
    { col: 4, row: 8, face: "SE" },
    { col: 7, row: 8, face: "SE" },
    { col: 4, row: 9, face: "SE" },
    { col: 7, row: 9, face: "SE" },
    { col: 3, row: 10, face: "SW" },
    { col: 4, row: 10, face: "SE" },
    { col: 7, row: 10, face: "SE" },
    { col: 2, row: 11, face: "SW" },
    { col: 4, row: 11, face: "SE" },
    { col: 7, row: 11, face: "SE" },
    { col: 6, row: 12, face: "SW" },
    { col: 7, row: 12, face: "SW" },
    { col: 2, row: 13, face: "SE" },
    { col: 4, row: 13, face: "SE" },
    { col: 3, row: 14, face: "SW" },
    { col: 4, row: 14, face: "SE" },
    { col: 2, row: 15, face: "SW" },
    { col: 4, row: 15, face: "SE" },
    { col: 7, row: 15, face: "SE" },
    { col: 6, row: 16, face: "SW" },
    { col: 7, row: 16, face: "SE" },
    { col: 2, row: 17, face: "SE" },
    { col: 4, row: 17, face: "SE" },
  ];

  // 3. 3D Blender Pavilion (East 3D Pavilion - 6 feature wall & pedestal slots, mixed SW and SE faces)
  const BLENDER_SLOTS: Array<{ col: number; row: number; face: "SW" | "SE" }> = [
    { col: 14, row: 8, face: "SE" },
    { col: 17, row: 8, face: "SE" },
    { col: 14, row: 9, face: "SE" },
    { col: 17, row: 9, face: "SE" },
    { col: 14, row: 10, face: "SE" },
    { col: 18, row: 10, face: "SW" },
  ];

  // Dynamically mount artworks into their respective wings
  const mountedPaintings: MountedPainting[] = [];
  let physCount = 0;
  let digCount = 0;
  let blendCount = 0;

  artworks.forEach((art, idx) => {
    const cat = (art.category as "physical" | "digital" | "blender") || "physical";
    let slot: { col: number; row: number; face: "SW" | "SE" };

    if (cat === "digital") {
      slot = DIGITAL_SLOTS[digCount % DIGITAL_SLOTS.length];
      digCount++;
    } else if (cat === "blender") {
      slot = BLENDER_SLOTS[blendCount % BLENDER_SLOTS.length];
      blendCount++;
    } else {
      slot = PHYSICAL_SLOTS[physCount % PHYSICAL_SLOTS.length];
      physCount++;
    }

    const img = new Image();
    const imgSrc =
      art.image.startsWith("http") || (baseUrl && art.image.startsWith(baseUrl))
        ? art.image
        : baseUrl + art.image;
    img.src = imgSrc;

    const wingName =
      cat === "digital"
        ? "Digital Art Studio"
        : cat === "blender"
        ? "3D Blender Pavilion"
        : "Physical Fine Art Wing";

    mountedPaintings.push({
      artId: art.id,
      col: slot.col,
      row: slot.row,
      face: slot.face,
      imgElement: img,
      title: art.title,
      lotNum: idx + 1,
      category: cat,
      isReservedMount: false,
      wingName: wingName,
    });
  });

  // Add dedicated illuminated museum wing reserved mounts for empty exhibition space
  // (Shows upcoming display plinth without allowing bidding)
  const remainingBlenderSlots = BLENDER_SLOTS.slice(blendCount, blendCount + 2);
  remainingBlenderSlots.forEach((slot, i) => {
    const dummyImg = new Image();
    mountedPaintings.push({
      artId: `reserved-blender-${i}`,
      col: slot.col,
      row: slot.row,
      face: slot.face,
      imgElement: dummyImg,
      title: "3D Blender Pavilion",
      lotNum: 0,
      category: "blender",
      isReservedMount: true,
      wingName: "3D Blender Pavilion",
    });
  });

  // --- Dynamic Chair/Divan Randomization Across Underworld Salons ---
  // Constraints:
  // 1. More random: dynamically scans all eligible floor tiles across all wings and shuffles on each visit.
  // 2. Distance: strictly AT LEAST 2 squares away from ANY art piece mount and its viewing tile.
  // 3. Hallways: requires floorNeighbors >= 2 so divans never block corridors.
  // 4. Spread: maintains >= 2.8 units distance between chairs to distribute them across the whole estate.
  function randomizeChairs(grid: number[][], paintings: MountedPainting[]) {
    // Clear any pre-existing chairs
    for (let r = 0; r < ROWS; r++) {
      for (let c = 0; c < COLS; c++) {
        if (grid[r][c] === 3) grid[r][c] = 0;
      }
    }

    const eligibleTiles: [number, number][] = [];

    for (let r = 0; r < ROWS; r++) {
      for (let c = 0; c < COLS; c++) {
        if (grid[r][c] !== 0) continue;
        // Avoid entrance foyer & spawn area
        if (r >= 19 && c >= 8 && c <= 13) continue;

        // Constraint 2: AT LEAST 2 squares away from ANY art piece and its viewing square
        let tooCloseToArt = false;
        for (const p of paintings) {
          const dx = Math.abs(c - p.col);
          const dy = Math.abs(r - p.row);
          if (Math.max(dx, dy) < 2 || Math.hypot(dx, dy) < 2.0) {
            tooCloseToArt = true;
            break;
          }
          const vc = p.face === "SE" ? p.col + 1 : p.col;
          const vr = p.face === "SW" ? p.row + 1 : p.row;
          if (Math.max(Math.abs(c - vc), Math.abs(r - vr)) < 2) {
            tooCloseToArt = true;
            break;
          }
        }
        if (tooCloseToArt) continue;

        // Ensure at least 2 walkable floor neighbors so walkways are never bottlenecked
        let floorNeighbors = 0;
        const dirs = [
          [0, 1],
          [0, -1],
          [1, 0],
          [-1, 0],
        ];
        for (const [dc, dr] of dirs) {
          const nc = c + dc;
          const nr = r + dr;
          if (nc >= 0 && nc < COLS && nr >= 0 && nr < ROWS && grid[nr][nc] === 0) {
            floorNeighbors++;
          }
        }
        if (floorNeighbors < 2) continue;

        eligibleTiles.push([c, r]);
      }
    }

    // Constraint 1: True randomness via Fisher-Yates shuffle
    for (let i = eligibleTiles.length - 1; i > 0; i--) {
      const j = Math.floor(Math.random() * (i + 1));
      [eligibleTiles[i], eligibleTiles[j]] = [eligibleTiles[j], eligibleTiles[i]];
    }

    // Place 9 well-spaced divans across the museum
    const placedChairs: [number, number][] = [];
    for (const [c, r] of eligibleTiles) {
      if (placedChairs.length >= 9) break;
      const tooClose = placedChairs.some(
        ([sc, sr]) => Math.hypot(sc - c, sr - r) < 2.8
      );
      if (!tooClose) {
        placedChairs.push([c, r]);
        grid[r][c] = 3;
      }
    }
  }

  randomizeChairs(MAP, mountedPaintings);

  // --- Underworld Atmosphere & Particles (Hades Theme) ---
  interface UnderworldParticle {
    x: number;
    y: number;
    vx: number;
    vy: number;
    size: number;
    alpha: number;
    type: "ember" | "shade" | "gold";
    wobble: number;
  }

  interface FootstepEmber {
    isoX: number;
    isoY: number;
    life: number;
    maxLife: number;
    size: number;
  }

  const underworldMotes: UnderworldParticle[] = [];
  for (let i = 0; i < 48; i++) {
    underworldMotes.push({
      x: (Math.random() - 0.5) * 1600,
      y: (Math.random() - 0.5) * 1200,
      vx: (Math.random() - 0.5) * 0.4,
      vy: -0.35 - Math.random() * 0.45,
      size: 1.2 + Math.random() * 2.2,
      alpha: 0.2 + Math.random() * 0.6,
      type: Math.random() < 0.5 ? "ember" : Math.random() < 0.8 ? "gold" : "shade",
      wobble: Math.random() * Math.PI * 2,
    });
  }

  const footstepEmbers: FootstepEmber[] = [];

  // --- Visitor State & Smooth Velocity (Zagreus, Prince of the Underworld) ---
  const player = {
    col: 10.5,
    row: 20.5, // Spawns safely in the open Grand Entrance Foyer
    vx: 0,
    vy: 0,
    targetCol: null as number | null,
    targetRow: null as number | null,
    radius: 0.28, // Robust collision radius: 3x frame step size, completely preventing tunnel clipping
    maxSpeed: 0.09,
    accel: 0.03,
    friction: 0.78,
    walkCycle: 0,
    distMoved: 0,
    isSitting: false,
    seatedBench: null as { col: number; row: number } | null,
  };

  function getNearbyBench(pc: number, pr: number, maxDist = 1.4): { col: number; row: number } | null {
    let nearest: { col: number; row: number } | null = null;
    let minDist = maxDist;

    for (let r = 0; r < ROWS; r++) {
      for (let c = 0; c < COLS; c++) {
        if (MAP[r][c] === 3) {
          const d = Math.hypot(pc - (c + 0.5), pr - (r + 0.5));
          if (d < minDist) {
            minDist = d;
            nearest = { col: c, row: r };
          }
        }
      }
    }
    return nearest;
  }

  function standUp(moveDirection?: { dc: number; dr: number }) {
    if (!player.isSitting) return;
    const b = player.seatedBench;
    player.isSitting = false;
    player.seatedBench = null;

    if (b) {
      // Find nearest adjacent walkable floor tile to step onto cleanly
      const offsets = [
        moveDirection || { dc: 0, dr: 1 },
        { dc: 0, dr: 1 },
        { dc: 0, dr: -1 },
        { dc: 1, dr: 0 },
        { dc: -1, dr: 0 },
      ];
      for (const off of offsets) {
        const nc = b.col + off.dc;
        const nr = b.row + off.dr;
        if (nr >= 0 && nr < ROWS && nc >= 0 && nc < COLS && MAP[nr][nc] === 0) {
          player.col = nc + 0.5;
          player.row = nr + 0.5;
          player.vx = 0;
          player.vy = 0;
          player.targetCol = null;
          player.targetRow = null;
          return;
        }
      }
    }
  }

  // Keyboard state
  const keys: Record<string, boolean> = {};

  window.addEventListener("keydown", (e) => {
    if (document.activeElement && ["INPUT", "TEXTAREA"].includes(document.activeElement.tagName)) {
      return;
    }
    const k = e.key.toLowerCase();
    const c = e.code.toLowerCase();
    keys[k] = true;
    keys[c] = true;

    // Movement key stand-up check
    if (player.isSitting) {
      let dir: { dc: number; dr: number } | undefined;
      if (k === "w" || k === "arrowup") dir = { dc: 0, dr: -1 };
      else if (k === "s" || k === "arrowdown") dir = { dc: 0, dr: 1 };
      else if (k === "a" || k === "arrowleft") dir = { dc: -1, dr: 0 };
      else if (k === "d" || k === "arrowright") dir = { dc: 1, dr: 0 };

      if (dir || ["w", "a", "s", "d", "arrowup", "arrowdown", "arrowleft", "arrowright"].includes(k)) {
        standUp(dir);
      }
    }

    if (k === "e" || c === "keye" || c === "space") {
      // If currently sitting, stand up smoothly
      if (player.isSitting) {
        standUp();
        e.preventDefault();
        return;
      }

      const nearBench = getNearbyBench(player.col, player.row, 1.4);
      const nearArt = getNearbyPainting(player.col, player.row, 2.4);

      // If near a bench and not in front of an active painting, sit down!
      if (nearBench && (!nearArt || Math.hypot(player.col - (nearBench.col + 0.5), player.row - (nearBench.row + 0.5)) < 1.1)) {
        player.col = nearBench.col + 0.5;
        player.row = nearBench.row + 0.5;
        player.isSitting = true;
        player.seatedBench = nearBench;
        player.vx = 0;
        player.vy = 0;
        player.targetCol = null;
        player.targetRow = null;
        e.preventDefault();
        return;
      }

      if (nearArt) {
        // Bidding on exhibition space is strictly disabled
        if (!nearArt.isReservedMount) {
          openInspectionModal(nearArt.artId);
        }
        e.preventDefault();
      }
    }
  });

  window.addEventListener("keyup", (e) => {
    const k = e.key.toLowerCase();
    const c = e.code.toLowerCase();
    keys[k] = false;
    keys[c] = false;
  });

  // Camera coordinates
  const camera = {
    x: 0,
    y: 0,
  };

  function isWalkable(c: number, r: number, radius = 0.28): boolean {
    const minC = Math.floor(c - radius);
    const maxC = Math.floor(c + radius);
    const minR = Math.floor(r - radius);
    const maxR = Math.floor(r + radius);

    // Current cell of the player
    const curPlayerC = Math.floor(player.col);
    const curPlayerR = Math.floor(player.row);
    const isPlayerInsideBench =
      curPlayerR >= 0 && curPlayerR < ROWS && curPlayerC >= 0 && curPlayerC < COLS && MAP[curPlayerR][curPlayerC] === 3;

    for (let row = minR; row <= maxR; row++) {
      for (let col = minC; col <= maxC; col++) {
        if (row < 0 || row >= ROWS || col < 0 || col >= COLS) return false;
        if (MAP[row][col] === 1 || MAP[row][col] === 2 || MAP[row][col] === 3) {
          // If the player is standing inside a bench tile, do not let that bench tile block them from walking out!
          if (isPlayerInsideBench && MAP[row][col] === 3 && row === curPlayerR && col === curPlayerC) {
            continue;
          }
          const closestC = Math.max(col, Math.min(c, col + 1));
          const closestR = Math.max(row, Math.min(r, row + 1));
          const dc = c - closestC;
          const dr = r - closestR;
          if (dc * dc + dr * dr < radius * radius) return false;
        }
      }
    }
    return true;
  }

  function getNearbyPainting(pc: number, pr: number, maxDist = 2.4): MountedPainting | null {
    let nearest: MountedPainting | null = null;
    let minDist = maxDist;

    for (const p of mountedPaintings) {
      // Viewing target adjusted for wall face direction:
      // SW face is viewed from (col + 0.5, row + 1.1)
      // SE face is viewed from (col + 1.1, row + 0.5)
      const targetC = p.face === "SE" ? p.col + 1.1 : p.col + 0.5;
      const targetR = p.face === "SW" ? p.row + 1.1 : p.row + 0.5;
      const d = Math.hypot(pc - targetC, pr - targetR);
      if (d < minDist) {
        minDist = d;
        nearest = p;
      }
    }
    return nearest;
  }

  // Click to Walk or Sit on Isometric Plane
  canvas.addEventListener("click", (e) => {
    initAudio();
    const rect = canvas.getBoundingClientRect();
    const clickX = e.clientX - rect.left - canvas.width / 2 + camera.x;
    const clickY = e.clientY - rect.top - canvas.height / 2 + camera.y;

    const gridPos = fromIso(clickX, clickY);

    // If currently sitting, stand up on click
    if (player.isSitting) {
      standUp();
    }

    // Direct click on painting?
    for (const piece of mountedPaintings) {
      if (Math.hypot(gridPos.col - piece.col, gridPos.row - piece.row) < 1.8) {
        openInspectionModal(piece.artId);
        return;
      }
    }

    // Direct click on Underworld velvet divan / bench?
    const clickC = Math.floor(gridPos.col);
    const clickR = Math.floor(gridPos.row);
    if (clickR >= 0 && clickR < ROWS && clickC >= 0 && clickC < COLS && MAP[clickR][clickC] === 3) {
      const distToBench = Math.hypot(player.col - (clickC + 0.5), player.row - (clickR + 0.5));
      if (distToBench < 1.8) {
        // Sit down directly!
        player.col = clickC + 0.5;
        player.row = clickR + 0.5;
        player.isSitting = true;
        player.seatedBench = { col: clickC, row: clickR };
        player.targetCol = null;
        player.targetRow = null;
        player.vx = 0;
        player.vy = 0;
        return;
      } else {
        // Walk toward the bench
        player.targetCol = clickC + 0.5;
        player.targetRow = clickR + 1.0;
        return;
      }
    }

    if (isWalkable(gridPos.col, gridPos.row, 0.2)) {
      player.targetCol = gridPos.col;
      player.targetRow = gridPos.row;
    }
  });

  // Mobile virtual buttons
  document.querySelectorAll(".virtual-btn").forEach((btn) => {
    const dir = btn.getAttribute("data-dir");
    if (!dir) return;

    btn.addEventListener("touchstart", (e) => {
      e.preventDefault();
      initAudio();
      if (player.isSitting) {
        standUp();
      }
      if (dir === "interact") {
        const near = getNearbyPainting(player.col, player.row, 2.4);
        if (near) {
          openInspectionModal(near.artId);
        } else {
          const bench = getNearbyBench(player.col, player.row, 1.4);
          if (bench) {
            player.col = bench.col + 0.5;
            player.row = bench.row + 0.5;
            player.isSitting = true;
            player.seatedBench = bench;
          }
        }
      } else {
        if (dir === "up") keys["w"] = true;
        if (dir === "down") keys["s"] = true;
        if (dir === "left") keys["a"] = true;
        if (dir === "right") keys["d"] = true;
      }
    });

    btn.addEventListener("touchend", (e) => {
      e.preventDefault();
      if (dir === "up") keys["w"] = false;
      if (dir === "down") keys["s"] = false;
      if (dir === "left") keys["a"] = false;
      if (dir === "right") keys["d"] = false;
    });
  });

  // --- Bidding & Silent Ledger ---
  let ledgerData: Record<string, ArtworkLedger> = {};
  let patronBalance = 2500;
  let currentPatronName = "Visitor";

  const savedLedger = localStorage.getItem("museum_bids_ledger");
  const savedBalance = localStorage.getItem("museum_patron_balance");
  const savedPatron = localStorage.getItem("museum_patron_name");

  if (savedPatron) currentPatronName = savedPatron;
  if (savedBalance) patronBalance = parseInt(savedBalance, 10) || 2500;

  function updateHudBalance() {
    const balEl = document.getElementById("patron-display-balance");
    if (balEl) balEl.textContent = patronBalance.toLocaleString();
    localStorage.setItem("museum_patron_balance", patronBalance.toString());
  }
  updateHudBalance();

  async function loadBidsData() {
    try {
      const bidsUrl = baseUrl ? `${baseUrl}/data/bids.json` : "/data/bids.json";
      const res = await fetch(bidsUrl);
      if (res.ok) {
        const data = await res.json();
        ledgerData = data;
        if (savedLedger) {
          try {
            const parsed = JSON.parse(savedLedger);
            ledgerData = { ...ledgerData, ...parsed };
          } catch (e) {}
        }
        updateCatalogBids();
      }
    } catch (e) {
      ledgerData = {
        torii: {
          title: "Torii Gate at Twilight",
          starting_bid: 500,
          highest_bid: 850,
          leading_patron: "Miles_M",
          bids: [{ patron: "Miles_M", amount: 850, timestamp: "2026-09-01" }],
        },
        "walle-ink": {
          title: "WALL-E: Urban Solitude",
          starting_bid: 600,
          highest_bid: 900,
          leading_patron: "CyberCurator",
          bids: [{ patron: "CyberCurator", amount: 900, timestamp: "2026-09-02" }],
        },
        "walle-color": {
          title: "WALL-E: Solar Awakening",
          starting_bid: 450,
          highest_bid: 750,
          leading_patron: "EvaCollector",
          bids: [{ patron: "EvaCollector", amount: 750, timestamp: "2026-09-01" }],
        },
      };
    }
  }
  loadBidsData();

  function updateCatalogBids() {
    document.querySelectorAll(".catalog-lead-bid").forEach((el) => {
      const artId = el.getAttribute("data-art-id");
      if (artId && ledgerData[artId]) {
        el.textContent = `${ledgerData[artId].highest_bid.toLocaleString()} TKN (@${ledgerData[artId].leading_patron})`;
      }
    });
  }

  // --- Inspection Modal ---
  let activeModalArtId: string | null = null;
  const modal = document.getElementById("artwork-inspection-modal") as HTMLDialogElement | null;

  function openInspectionModal(artId: string) {
    if (artId.startsWith("reserved-")) return;
    const mounted = mountedPaintings.find((m) => m.artId === artId);
    if (mounted?.isReservedMount) return; // Disallow bidding on exhibition space

    playChime();
    activeModalArtId = artId;
    const art = artworks.find((a) => a.id === artId);
    if (!art || !modal) return;

    const ledger = ledgerData[artId] || {
      starting_bid: art.starting_bid,
      highest_bid: art.starting_bid,
      leading_patron: "House Lot",
      bids: [],
    };

    const titleEl = document.getElementById("modal-title");
    const lotBadgeEl = document.getElementById("modal-lot-badge");
    const imageEl = document.getElementById("modal-image") as HTMLImageElement | null;
    const mediumEl = document.getElementById("modal-medium");
    const yearEl = document.getElementById("modal-year");
    const dimensionsEl = document.getElementById("modal-dimensions");
    const descEl = document.getElementById("modal-description");
    const startBidEl = document.getElementById("modal-starting-bid");
    const highBidEl = document.getElementById("modal-highest-bid");
    const leadingPatronEl = document.getElementById("modal-leading-patron");
    const patronInput = document.getElementById("bid-patron-name") as HTMLInputElement | null;
    const amountInput = document.getElementById("bid-amount-input") as HTMLInputElement | null;
    const historyContainer = document.getElementById("modal-bid-history");
    const messageEl = document.getElementById("bid-message");

    if (titleEl) titleEl.textContent = art.title;
    if (lotBadgeEl) lotBadgeEl.textContent = `LOT #${artworks.indexOf(art) + 1}`;
    if (imageEl) {
      const imgSrc =
        art.image.startsWith("http") || (baseUrl && art.image.startsWith(baseUrl))
          ? art.image
          : baseUrl + art.image;
      imageEl.src = imgSrc;
    }
    if (mediumEl) mediumEl.textContent = art.medium;
    if (yearEl) yearEl.textContent = art.year;
    if (dimensionsEl) dimensionsEl.textContent = art.dimensions;
    if (descEl) descEl.textContent = art.description;

    if (startBidEl) startBidEl.textContent = `${ledger.starting_bid.toLocaleString()} TKN`;
    if (highBidEl) highBidEl.textContent = `${ledger.highest_bid.toLocaleString()} TKN`;
    if (leadingPatronEl) leadingPatronEl.textContent = `@${ledger.leading_patron}`;

    if (patronInput) patronInput.value = currentPatronName;
    if (amountInput) amountInput.value = (ledger.highest_bid + 50).toString();

    if (messageEl) {
      messageEl.classList.add("hidden");
      messageEl.textContent = "";
    }

    if (historyContainer) {
      historyContainer.innerHTML = "";
      const bids = ledger.bids || [];
      if (bids.length === 0) {
        historyContainer.innerHTML =
          '<div class="opacity-50 text-[11px]">No gallery offers recorded yet. Be the first!</div>';
      } else {
        [...bids].reverse().forEach((b) => {
          const row = document.createElement("div");
          row.className = "flex items-center justify-between py-1.5 border-b border-white/5";
          row.innerHTML = `
            <span class="font-bold text-primary">@${b.patron}</span>
            <span class="opacity-80 font-mono">${b.amount.toLocaleString()} TKN</span>
            <span class="text-[10px] opacity-40">${b.timestamp}</span>
          `;
          historyContainer.appendChild(row);
        });
      }
    }

    modal.showModal();
  }

  (window as unknown as { openInspectionModal: typeof openInspectionModal }).openInspectionModal =
    openInspectionModal;

  const promptBtn = document.getElementById("prompt-action-btn");
  if (promptBtn) {
    promptBtn.addEventListener("click", () => {
      if (player.isSitting) {
        standUp();
        return;
      }
      const p = getNearbyPainting(player.col, player.row, 2.4);
      if (p && !p.isReservedMount) {
        openInspectionModal(p.artId);
        return;
      }
      const bench = getNearbyBench(player.col, player.row, 1.4);
      if (bench) {
        player.col = bench.col + 0.5;
        player.row = bench.row + 0.5;
        player.isSitting = true;
        player.seatedBench = bench;
        player.vx = 0;
        player.vy = 0;
        player.targetCol = null;
        player.targetRow = null;
      }
    });
  }

  document.querySelectorAll(".quick-bid-btn").forEach((btn) => {
    btn.addEventListener("click", (e) => {
      const inc = parseInt((e.target as HTMLElement).getAttribute("data-inc") || "50", 10);
      const amountInput = document.getElementById("bid-amount-input") as HTMLInputElement | null;
      if (amountInput) {
        const cur = parseInt(amountInput.value, 10) || 0;
        amountInput.value = (cur + inc).toString();
      }
    });
  });

  const submitBidBtn = document.getElementById("submit-bid-btn");
  if (submitBidBtn) {
    submitBidBtn.addEventListener("click", () => {
      if (!activeModalArtId) return;

      const patronInput = document.getElementById("bid-patron-name") as HTMLInputElement | null;
      const amountInput = document.getElementById("bid-amount-input") as HTMLInputElement | null;
      const messageEl = document.getElementById("bid-message");

      const patron = patronInput?.value.trim() || "Anonymous Patron";
      const amount = parseInt(amountInput?.value || "0", 10);

      currentPatronName = patron;
      localStorage.setItem("museum_patron_name", patron);

      const ledger = ledgerData[activeModalArtId];
      if (!ledger || !messageEl) return;

      if (amount <= ledger.highest_bid) {
        messageEl.className =
          "text-xs text-center py-2 rounded-lg bg-error/20 text-error border border-error/30";
        messageEl.textContent = `Offer must exceed top recorded offer of ${ledger.highest_bid.toLocaleString()} TKN!`;
        messageEl.classList.remove("hidden");
        return;
      }

      if (amount > patronBalance) {
        messageEl.className =
          "text-xs text-center py-2 rounded-lg bg-warning/20 text-warning border border-warning/30";
        messageEl.textContent = `Insufficient patron credit (${patronBalance.toLocaleString()} TKN available).`;
        messageEl.classList.remove("hidden");
        return;
      }

      patronBalance -= 50;
      updateHudBalance();

      ledger.highest_bid = amount;
      ledger.leading_patron = patron;
      ledger.bids.push({
        patron: patron,
        amount: amount,
        timestamp: new Date().toISOString().split("T")[0],
      });

      localStorage.setItem("museum_bids_ledger", JSON.stringify(ledgerData));

      const highBidEl = document.getElementById("modal-highest-bid");
      const leadingPatronEl = document.getElementById("modal-leading-patron");
      if (highBidEl) highBidEl.textContent = `${amount.toLocaleString()} TKN`;
      if (leadingPatronEl) leadingPatronEl.textContent = `@${patron}`;

      messageEl.className =
        "text-xs text-center py-2 rounded-lg bg-success/20 text-success border border-success/30 font-semibold";
      messageEl.textContent = "Offer registered! You are now the premier patron for this piece!";
      messageEl.classList.remove("hidden");

      updateCatalogBids();
      playChime();
    });
  }

  // --- View Mode Toggle ---
  const mazeViewEl = document.getElementById("museum-view");
  const catalogViewEl = document.getElementById("catalog-view");
  const btnMaze = document.getElementById("view-mode-maze");
  const btnCatalog = document.getElementById("view-mode-catalog");

  if (btnMaze && btnCatalog && mazeViewEl && catalogViewEl) {
    btnMaze.addEventListener("click", () => {
      mazeViewEl.classList.remove("hidden");
      catalogViewEl.classList.add("hidden");
      btnMaze.className = "btn btn-xs sm:btn-sm btn-primary rounded-lg join-item";
      btnCatalog.className = "btn btn-xs sm:btn-sm btn-ghost rounded-lg join-item";
    });

    btnCatalog.addEventListener("click", () => {
      mazeViewEl.classList.add("hidden");
      catalogViewEl.classList.remove("hidden");
      btnCatalog.className = "btn btn-xs sm:btn-sm btn-primary rounded-lg join-item";
      btnMaze.className = "btn btn-xs sm:btn-sm btn-ghost rounded-lg join-item";
    });
  }

  // Catalog category filter buttons
  document.querySelectorAll(".catalog-filter-btn").forEach((btn) => {
    btn.addEventListener("click", () => {
      const category = btn.getAttribute("data-category") || "all";
      document.querySelectorAll(".catalog-filter-btn").forEach((b) => {
        b.classList.remove("btn-primary");
        b.classList.add("btn-outline");
      });
      btn.classList.add("btn-primary");
      btn.classList.remove("btn-outline");

      document.querySelectorAll(".catalog-card").forEach((card) => {
        const cardCat = card.getAttribute("data-category");
        if (category === "all" || cardCat === category) {
          (card as HTMLElement).style.display = "";
        } else {
          (card as HTMLElement).style.display = "none";
        }
      });
    });
  });

  const promptEl = document.getElementById("proximity-prompt");
  const promptTitleEl = document.getElementById("prompt-title");

  // Initial Camera Centering
  const startIso = toIso(player.col, player.row);
  camera.x = startIso.x;
  camera.y = startIso.y;

  // --- Main Animation Loop ---
  function animate() {
    // 1. Natural Intuitive WASD Movement (Screen-Space & Corridor Aligned)
    // Converts keyboard inputs directly to screen directions so:
    // W = moves straight UP on screen
    // S = moves straight DOWN on screen
    // A = moves straight LEFT on screen
    // D = moves straight RIGHT on screen
    // W+D / W+A / S+D / S+A move smoothly along diagonal corridor axes!
    let targetVx = 0;
    let targetVy = 0;

    const up = keys["w"] || keys["arrowup"] || keys["keyw"];
    const down = keys["s"] || keys["arrowdown"] || keys["keys"];
    const left = keys["a"] || keys["arrowleft"] || keys["keya"];
    const right = keys["d"] || keys["arrowright"] || keys["keyd"];

    let screenX = 0;
    let screenY = 0;

    if (up) screenY -= 1;
    if (down) screenY += 1;
    if (left) screenX -= 1;
    if (right) screenX += 1;

    if (screenX !== 0 || screenY !== 0) {
      // Normalize screen vector
      const mag = Math.hypot(screenX, screenY);
      const nx = screenX / mag;
      const ny = screenY / mag;

      // Project screen direction into isometric grid steps:
      // screenX = (col - row) * (TILE_W / 2)
      // screenY = (col + row) * (TILE_H / 2)
      // Reverse transformation:
      const dC = (nx / (TILE_W / 2) + ny / (TILE_H / 2)) * 0.5 * player.maxSpeed * 34;
      const dR = (ny / (TILE_H / 2) - nx / (TILE_W / 2)) * 0.5 * player.maxSpeed * 34;

      targetVx = dC;
      targetVy = dR;
    }

    // Pathfinding toward click target
    if (player.targetCol !== null && player.targetRow !== null) {
      const dc = player.targetCol - player.col;
      const dr = player.targetRow - player.row;
      const dist = Math.hypot(dc, dr);

      if (dist < 0.15) {
        player.targetCol = null;
        player.targetRow = null;
      } else {
        targetVx = (dc / dist) * player.maxSpeed;
        targetVy = (dr / dist) * player.maxSpeed;
      }
    }

    // Smooth acceleration & friction easing
    if (player.isSitting) {
      targetVx = 0;
      targetVy = 0;
      player.vx = 0;
      player.vy = 0;
      if (player.seatedBench) {
        player.col = player.seatedBench.col + 0.5;
        player.row = player.seatedBench.row + 0.5;
      }
    } else {
      player.vx += (targetVx - player.vx) * 0.28;
      player.vy += (targetVy - player.vy) * 0.28;
    }

    // Apply movement with wall collision & smooth sliding
    if (!player.isSitting && (Math.abs(player.vx) > 0.001 || Math.abs(player.vy) > 0.001)) {
      player.walkCycle += 0.22;

      // Strict axis-separated collision resolution:
      // Prevents all wall clipping while allowing smooth sliding along corridors
      const nextC = player.col + player.vx;
      if (isWalkable(nextC, player.row, player.radius)) {
        player.col = nextC;
      } else {
        player.vx = 0;
      }

      const nextR = player.row + player.vy;
      if (isWalkable(player.col, nextR, player.radius)) {
        player.row = nextR;
      } else {
        player.vy = 0;
      }

      // Zagreus Burning Footstep Embers emission
      if (Math.random() < 0.45) {
        const pIso = toIso(player.col, player.row);
        footstepEmbers.push({
          isoX: pIso.x + (Math.random() - 0.5) * 8,
          isoY: pIso.y + TILE_H / 2 + (Math.random() - 0.5) * 4,
          life: 1.0,
          maxLife: 26,
          size: 1.8 + Math.random() * 2.2,
        });
      }

      player.distMoved += Math.hypot(player.vx, player.vy);
      if (player.distMoved > 0.5) {
        player.distMoved = 0;
        playStep();
      }
    }

    // Restorative soul particles when sitting on divan
    if (player.isSitting && Math.random() < 0.12) {
      const pIso = toIso(player.col, player.row);
      footstepEmbers.push({
        isoX: pIso.x + (Math.random() - 0.5) * 16,
        isoY: pIso.y + TILE_H / 2 - 18 - Math.random() * 12,
        life: 1.0,
        maxLife: 36,
        size: 1.6,
      });
    }

    // 2. Camera smoothly centers on player
    const playerIso = toIso(player.col, player.row);
    camera.x += (playerIso.x - camera.x) * 0.08;
    camera.y += (playerIso.y - camera.y) * 0.08;

    // 3. Artwork & Bench Proximity Check & HUD Wing Indicator Update (House of Hades)
    const currentZone = getTileZone(Math.floor(player.col), Math.floor(player.row));
    const wingNameEl = document.getElementById("current-wing-name");
    const wingDotEl = document.getElementById("current-wing-dot");
    if (wingNameEl && wingDotEl) {
      if (currentZone === "physical") {
        wingNameEl.textContent = "Elysium Salon (Physical Fine Art)";
        wingDotEl.className = "w-2 h-2 rounded-full bg-emerald-400 animate-pulse";
      } else if (currentZone === "digital") {
        wingNameEl.textContent = "Tartarus Studio (Digital Art)";
        wingDotEl.className = "w-2 h-2 rounded-full bg-rose-500 animate-pulse";
      } else if (currentZone === "blender") {
        wingNameEl.textContent = "Asphodel Pavilion (3D Art)";
        wingDotEl.className = "w-2 h-2 rounded-full bg-amber-500 animate-pulse";
      } else {
        wingNameEl.textContent = "House of Hades (Grand Nexus)";
        wingDotEl.className = "w-2 h-2 rounded-full bg-amber-400 animate-pulse";
      }
    }

    const near = getNearbyPainting(player.col, player.row, 2.4);
    const nearBench = getNearbyBench(player.col, player.row, 1.4);
    const promptSubtitleEl = document.getElementById("prompt-subtitle");
    const promptActionBtn = document.getElementById("prompt-action-btn");
    const promptReservedBadge = document.getElementById("prompt-reserved-badge");

    if (player.isSitting && promptEl && promptTitleEl) {
      promptTitleEl.textContent = "Underworld Divan • House of Hades";
      if (promptSubtitleEl) {
        promptSubtitleEl.textContent = "Resting in Royal Repose • Press [E], [WASD] or Click to Stand";
        promptSubtitleEl.className = "text-[10px] text-amber-400 uppercase font-bold tracking-wider";
      }
      if (promptActionBtn) {
        promptActionBtn.textContent = "Stand Up";
        promptActionBtn.classList.remove("hidden");
      }
      if (promptReservedBadge) promptReservedBadge.classList.add("hidden");
      promptEl.classList.remove("opacity-0", "translate-y-4", "scale-95");
      promptEl.classList.add("opacity-100", "translate-y-0", "scale-100");
    } else if (near && promptEl && promptTitleEl) {
      if (near.isReservedMount) {
        promptTitleEl.textContent = `${near.title} (Exhibition Space)`;
        if (promptSubtitleEl) {
          promptSubtitleEl.textContent = "Reserved Underworld Plinth • Bidding Unavailable";
          promptSubtitleEl.className = "text-[10px] text-slate-400 uppercase font-bold tracking-wider";
        }
        if (promptActionBtn) promptActionBtn.classList.add("hidden");
        if (promptReservedBadge) promptReservedBadge.classList.remove("hidden");
      } else {
        promptTitleEl.textContent = `${near.title} (Lot #${near.lotNum})`;
        if (promptSubtitleEl) {
          promptSubtitleEl.textContent = `${near.wingName || "Underworld Gallery"} • Inspect & Submit Offer`;
          promptSubtitleEl.className = "text-[10px] text-amber-400 uppercase font-bold tracking-wider";
        }
        if (promptActionBtn) {
          promptActionBtn.textContent = "Inspect";
          promptActionBtn.classList.remove("hidden");
        }
        if (promptReservedBadge) promptReservedBadge.classList.add("hidden");
      }
      promptEl.classList.remove("opacity-0", "translate-y-4", "scale-95");
      promptEl.classList.add("opacity-100", "translate-y-0", "scale-100");
    } else if (nearBench && promptEl && promptTitleEl) {
      promptTitleEl.textContent = "Imperial Velvet Divan";
      if (promptSubtitleEl) {
        promptSubtitleEl.textContent = "House of Hades Lounge • Press [E] or Click to Sit & Contemplate";
        promptSubtitleEl.className = "text-[10px] text-amber-300 uppercase font-bold tracking-wider";
      }
      if (promptActionBtn) {
        promptActionBtn.textContent = "Sit Down";
        promptActionBtn.classList.remove("hidden");
      }
      if (promptReservedBadge) promptReservedBadge.classList.add("hidden");
      promptEl.classList.remove("opacity-0", "translate-y-4", "scale-95");
      promptEl.classList.add("opacity-100", "translate-y-0", "scale-100");
    } else if (promptEl) {
      promptEl.classList.add("opacity-0", "translate-y-4", "scale-95");
      promptEl.classList.remove("opacity-100", "translate-y-0", "scale-100");
    }

    // Helper: Draw themed artwork or reserved exhibition display
    function drawArtworkCard(piece: MountedPainting, isNear: boolean) {
      const isDigital = piece.category === "digital";
      const isBlender = piece.category === "blender";

      // 1. Overhead Light Wash Cone
      const lightWash = ctx.createLinearGradient(0, -22, 0, 22);
      if (isDigital) {
        lightWash.addColorStop(0, "rgba(224, 242, 254, 0.35)");
        lightWash.addColorStop(0.4, "rgba(56, 189, 248, 0.15)");
        lightWash.addColorStop(1, "rgba(56, 189, 248, 0)");
      } else if (isBlender) {
        lightWash.addColorStop(0, "rgba(255, 237, 213, 0.35)");
        lightWash.addColorStop(0.4, "rgba(249, 115, 22, 0.16)");
        lightWash.addColorStop(1, "rgba(249, 115, 22, 0)");
      } else {
        lightWash.addColorStop(0, "rgba(254, 240, 138, 0.28)");
        lightWash.addColorStop(0.4, "rgba(251, 191, 36, 0.12)");
        lightWash.addColorStop(1, "rgba(251, 191, 36, 0)");
      }
      ctx.fillStyle = lightWash;
      ctx.beginPath();
      ctx.moveTo(-6, -22);
      ctx.lineTo(6, -22);
      ctx.lineTo(20, 22);
      ctx.lineTo(-20, 22);
      ctx.closePath();
      ctx.fill();

      // 2. Wall Cast Shadow
      ctx.fillStyle = "rgba(0, 0, 0, 0.45)";
      ctx.fillRect(-17, -18, 34, 38);

      // 3. Outer Frame & Inset
      if (isDigital) {
        // Brushed Aluminum Modern Floating Frame
        ctx.fillStyle = isNear ? "#38bdf8" : "#334155";
        ctx.fillRect(-16, -19, 32, 38);
        ctx.fillStyle = isNear ? "#0284c7" : "#0f172a";
        ctx.fillRect(-15, -18, 30, 36);
        ctx.fillStyle = "#f8fafc";
        ctx.fillRect(-14, -17, 28, 34);
      } else if (isBlender) {
        // Dark Studio Shadowbox Frame with Blender Orange Rim
        ctx.fillStyle = isNear ? "#fb923c" : "#ea580c";
        ctx.fillRect(-16, -19, 32, 38);
        ctx.fillStyle = "#18181b";
        ctx.fillRect(-15, -18, 30, 36);
        ctx.fillStyle = "#27272a";
        ctx.fillRect(-14, -17, 28, 34);
      } else {
        // Gilded Antique Brass Frame (Physical)
        ctx.fillStyle = isNear ? "#f59e0b" : "#b45309";
        ctx.fillRect(-16, -19, 32, 38);
        ctx.fillStyle = isNear ? "#fbbf24" : "#78350f";
        ctx.fillRect(-15, -18, 30, 36);
        ctx.fillStyle = "#faf8f5";
        ctx.fillRect(-14, -17, 28, 34);
      }

      // 4. Artwork Canvas OR Reserved Exhibition Display
      if (piece.isReservedMount) {
        if (isDigital) {
          ctx.fillStyle = "#090d16";
          ctx.fillRect(-12, -15, 24, 30);
          // Holographic Cybernetic Diamond Icon
          ctx.strokeStyle = "#38bdf8";
          ctx.lineWidth = 1.2;
          ctx.beginPath();
          ctx.moveTo(0, -9);
          ctx.lineTo(8, -1);
          ctx.lineTo(0, 7);
          ctx.lineTo(-8, -1);
          ctx.closePath();
          ctx.stroke();

          ctx.fillStyle = "#38bdf8";
          ctx.font = "bold 4px sans-serif";
          ctx.textAlign = "center";
          ctx.textBaseline = "middle";
          ctx.fillText("DIGITAL", 0, -1);
          ctx.font = "3.2px sans-serif";
          ctx.fillStyle = "#94a3b8";
          ctx.fillText("STUDIO", 0, 11);
        } else if (isBlender) {
          ctx.fillStyle = "#121215";
          ctx.fillRect(-12, -15, 24, 30);
          // Stylized 3D Wireframe Cube
          ctx.strokeStyle = "#f97316";
          ctx.lineWidth = 1.2;
          ctx.strokeRect(-6, -8, 12, 12);
          ctx.beginPath();
          ctx.moveTo(-6, -8);
          ctx.lineTo(-2, -12);
          ctx.lineTo(10, -12);
          ctx.lineTo(6, -8);
          ctx.moveTo(10, -12);
          ctx.lineTo(10, 0);
          ctx.lineTo(6, 4);
          ctx.stroke();

          ctx.fillStyle = "#f97316";
          ctx.font = "bold 4px sans-serif";
          ctx.textAlign = "center";
          ctx.textBaseline = "middle";
          ctx.fillText("BLENDER", 0, 8);
          ctx.font = "3.2px sans-serif";
          ctx.fillStyle = "#a1a1aa";
          ctx.fillText("3D LAB", 0, 12);
        }
      } else {
        if (piece.imgElement.complete && piece.imgElement.naturalWidth > 0) {
          ctx.drawImage(piece.imgElement, -12, -15, 24, 30);
        } else {
          ctx.fillStyle = isDigital ? "#0f172a" : isBlender ? "#18181b" : "#1e293b";
          ctx.fillRect(-12, -15, 24, 30);
        }
      }

      // 5. Overhead Picture Lamp Fixture
      if (isDigital) {
        ctx.fillStyle = "#0284c7";
        ctx.fillRect(-10, -25, 20, 3.5);
        ctx.fillStyle = isNear ? "#e0f2fe" : "#38bdf8";
        ctx.fillRect(-7, -24, 14, 1.5);
      } else if (isBlender) {
        ctx.fillStyle = "#c2410c";
        ctx.fillRect(-10, -25, 20, 3.5);
        ctx.fillStyle = isNear ? "#ffedd5" : "#f97316";
        ctx.fillRect(-7, -24, 14, 1.5);
      } else {
        ctx.fillStyle = "#d97706";
        ctx.fillRect(-10, -25, 20, 3.5);
        ctx.fillStyle = isNear ? "#fef08a" : "#fbbf24";
        ctx.fillRect(-7, -24, 14, 1.5);
      }

      // 6. Identification Placard
      if (isDigital) {
        ctx.fillStyle = "#0f172a";
        ctx.fillRect(-11, 20, 22, 5.5);
        ctx.strokeStyle = "#0284c7";
        ctx.lineWidth = 0.6;
        ctx.strokeRect(-11, 20, 22, 5.5);
        ctx.fillStyle = "#38bdf8";
        ctx.font = "bold 4px sans-serif";
        ctx.textAlign = "center";
        ctx.textBaseline = "middle";
        ctx.fillText(piece.isReservedMount ? "DIGITAL WING" : `LOT #${piece.lotNum}`, 0, 22.5);
      } else if (isBlender) {
        ctx.fillStyle = "#09090b";
        ctx.fillRect(-11, 20, 22, 5.5);
        ctx.strokeStyle = "#ea580c";
        ctx.lineWidth = 0.6;
        ctx.strokeRect(-11, 20, 22, 5.5);
        ctx.fillStyle = "#fb923c";
        ctx.font = "bold 4px sans-serif";
        ctx.textAlign = "center";
        ctx.textBaseline = "middle";
        ctx.fillText(piece.isReservedMount ? "3D BLENDER" : `LOT #${piece.lotNum}`, 0, 22.5);
      } else {
        ctx.fillStyle = "#78350f";
        ctx.fillRect(-11, 20, 22, 5.5);
        ctx.fillStyle = "#fef3c7";
        ctx.font = "bold 4.5px sans-serif";
        ctx.textAlign = "center";
        ctx.textBaseline = "middle";
        ctx.fillText(`LOT #${piece.lotNum}`, 0, 22.5);
      }
    }

    // --- CANVAS DRAWING ---
    ctx.clearRect(0, 0, canvas.width, canvas.height);

    // Pure Solid Black Background (as requested: "make the background black")
    ctx.fillStyle = "#000000";
    ctx.fillRect(0, 0, canvas.width, canvas.height);

    ctx.save();
    ctx.translate(canvas.width / 2 - camera.x, canvas.height / 2 - camera.y);

    // --- Pass 1: Multi-Wing Themed French Herringbone Parquet Floors ---
    for (let r = 0; r < ROWS; r++) {
      for (let c = 0; c < COLS; c++) {
        if (MAP[r][c] === 0 || MAP[r][c] === 3) {
          const pt = toIso(c, r);
          const zone = getTileZone(c, r);

          ctx.beginPath();
          ctx.moveTo(pt.x, pt.y);
          ctx.lineTo(pt.x + TILE_W / 2, pt.y + TILE_H / 2);
          ctx.lineTo(pt.x, pt.y + TILE_H);
          ctx.lineTo(pt.x - TILE_W / 2, pt.y + TILE_H / 2);
          ctx.closePath();

          const isAlt = (r + c) % 2 === 0;

          // Distinct floor color scheme per Underworld realm
          if (zone === "digital") {
            // Tartarus: dark obsidian slate with raw charcoal texture
            ctx.fillStyle = isAlt ? "#120f14" : "#0a070c";
          } else if (zone === "blender") {
            // Asphodel: volcanic dark basalt with warm magma understone
            ctx.fillStyle = isAlt ? "#17100b" : "#0d0805";
          } else if (zone === "nexus") {
            // House of Hades: imperial polished black marble
            ctx.fillStyle = isAlt ? "#14080b" : "#090406";
          } else {
            // Elysium: celestial verdant jade-veined dark stone
            ctx.fillStyle = isAlt ? "#091711" : "#050e0a";
          }
          ctx.fill();

          // Underworld realm tile grout & inlay lines
          if (zone === "digital") {
            // Tartarus: glowing infernal crimson ember seams
            ctx.strokeStyle = "rgba(225, 29, 72, 0.28)";
          } else if (zone === "blender") {
            // Asphodel: molten gold & amber seams
            ctx.strokeStyle = "rgba(245, 158, 11, 0.25)";
          } else if (zone === "nexus") {
            // House of Hades: Stygian gold geometric inlays
            ctx.strokeStyle = "rgba(251, 191, 36, 0.24)";
          } else {
            // Elysium: celestial emerald & pale gold seams
            ctx.strokeStyle = "rgba(52, 211, 153, 0.22)";
          }
          ctx.lineWidth = 0.8;
          ctx.stroke();

          // Underworld Greek geometric interior engraving
          ctx.strokeStyle = "rgba(0, 0, 0, 0.55)";
          ctx.lineWidth = 0.6;
          ctx.beginPath();
          ctx.moveTo(pt.x - TILE_W / 4, pt.y + TILE_H / 4);
          ctx.lineTo(pt.x, pt.y + TILE_H / 2);
          ctx.lineTo(pt.x + TILE_W / 4, pt.y + (3 * TILE_H) / 4);
          ctx.moveTo(pt.x, pt.y);
          ctx.lineTo(pt.x + TILE_W / 4, pt.y + TILE_H / 4);
          ctx.lineTo(pt.x, pt.y + TILE_H / 2);
          ctx.stroke();

          // Realm ambient gloss sheen
          if (zone === "digital") {
            ctx.strokeStyle = "rgba(244, 63, 94, 0.10)";
          } else if (zone === "blender") {
            ctx.strokeStyle = "rgba(251, 191, 36, 0.10)";
          } else if (zone === "nexus") {
            ctx.strokeStyle = "rgba(244, 63, 94, 0.12)";
          } else {
            ctx.strokeStyle = "rgba(52, 211, 153, 0.10)";
          }
          ctx.lineWidth = 1;
          ctx.beginPath();
          ctx.moveTo(pt.x - TILE_W / 3, pt.y + TILE_H / 3);
          ctx.lineTo(pt.x + TILE_W / 3, pt.y + (2 * TILE_H) / 3);
          ctx.stroke();
        }
      }
    }

    // --- Pass 1.5: Zagreus Burning Footstep Embers ---
    for (let i = footstepEmbers.length - 1; i >= 0; i--) {
      const e = footstepEmbers[i];
      e.life -= 1 / e.maxLife;
      if (e.life <= 0) {
        footstepEmbers.splice(i, 1);
        continue;
      }
      const alpha = e.life;
      const grad = ctx.createRadialGradient(e.isoX, e.isoY, 0, e.isoX, e.isoY, e.size * 2);
      grad.addColorStop(0, `rgba(254, 240, 138, ${alpha * 0.95})`);
      grad.addColorStop(0.35, `rgba(249, 115, 22, ${alpha * 0.75})`);
      grad.addColorStop(0.75, `rgba(225, 29, 72, ${alpha * 0.45})`);
      grad.addColorStop(1, "rgba(225, 29, 72, 0)");
      ctx.fillStyle = grad;
      ctx.beginPath();
      ctx.ellipse(e.isoX, e.isoY, e.size * 2, e.size, 0, 0, Math.PI * 2);
      ctx.fill();
    }

    // --- Pass 2: Directional Art Spotlights on Floor (Colored by Wing) ---
    mountedPaintings.forEach((piece) => {
      const isNear = near?.artId === piece.artId;
      const spotPos = toIso(
        piece.col + (piece.face === "SE" ? 0.7 : 0),
        piece.row + (piece.face === "SW" ? 0.7 : 0)
      );

      const spot = ctx.createRadialGradient(
        spotPos.x,
        spotPos.y + TILE_H / 2,
        3,
        spotPos.x,
        spotPos.y + TILE_H / 2,
        isNear ? 54 : 38
      );

      if (piece.category === "digital") {
        spot.addColorStop(0, isNear ? "rgba(56, 189, 248, 0.60)" : "rgba(56, 189, 248, 0.32)");
        spot.addColorStop(0.5, isNear ? "rgba(14, 165, 233, 0.24)" : "rgba(14, 165, 233, 0.12)");
        spot.addColorStop(1, "rgba(14, 165, 233, 0)");
      } else if (piece.category === "blender") {
        spot.addColorStop(0, isNear ? "rgba(249, 115, 22, 0.65)" : "rgba(249, 115, 22, 0.36)");
        spot.addColorStop(0.5, isNear ? "rgba(234, 88, 12, 0.26)" : "rgba(234, 88, 12, 0.12)");
        spot.addColorStop(1, "rgba(234, 88, 12, 0)");
      } else {
        spot.addColorStop(0, isNear ? "rgba(254, 240, 138, 0.48)" : "rgba(251, 191, 36, 0.26)");
        spot.addColorStop(0.5, isNear ? "rgba(245, 158, 11, 0.20)" : "rgba(245, 158, 11, 0.09)");
        spot.addColorStop(1, "rgba(245, 158, 11, 0)");
      }

      ctx.fillStyle = spot;
      ctx.beginPath();
      ctx.ellipse(
        spotPos.x,
        spotPos.y + TILE_H / 2,
        isNear ? 50 : 36,
        isNear ? 25 : 18,
        0,
        0,
        Math.PI * 2
      );
      ctx.fill();
    });

    // --- Pass 3: Continuous Seamless Walls, Artworks, Benches & Visitor ---
    const maxDiag = COLS + ROWS;

    for (let diag = 0; diag <= maxDiag; diag++) {
      for (let c = 0; c <= diag; c++) {
        const r = diag - c;
        if (r < 0 || r >= ROWS || c < 0 || c >= COLS) continue;

        const cellType = MAP[r][c];
        const pt = toIso(c, r);

        // A. Continuous Architectural Walls
        if (cellType === 1 || cellType === 2) {
          const isGreen = cellType === 2;
          const wallH = getWallHeight(r, c);
          const zone = getTileZone(c, r);

          const isWall = (col: number, row: number) => {
            if (row < 0 || row >= ROWS || col < 0 || col >= COLS) return false;
            return MAP[row][col] === 1 || MAP[row][col] === 2;
          };

          const hasSEFloor = !isWall(c + 1, r);
          const hasSWFloor = !isWall(c, r + 1);
          const hasNEFloor = !isWall(c, r - 1);
          const hasNWFloor = !isWall(c - 1, r);

          // Soft Ambient Wall Drop Shadow on Wood Floor
          ctx.fillStyle = "rgba(0, 0, 0, 0.45)";
          ctx.beginPath();
          ctx.moveTo(pt.x, pt.y + TILE_H);
          ctx.lineTo(pt.x + TILE_W / 2 + 10, pt.y + TILE_H / 2 + 10);
          ctx.lineTo(pt.x - TILE_W / 2 - 10, pt.y + TILE_H / 2 + 10);
          ctx.closePath();
          ctx.fill();

          // 1. South-East Facing Wall Face (Down-Right face)
          if (hasSEFloor) {
            ctx.beginPath();
            ctx.moveTo(pt.x, pt.y + TILE_H);
            ctx.lineTo(pt.x + TILE_W / 2, pt.y + TILE_H / 2);
            ctx.lineTo(pt.x + TILE_W / 2, pt.y + TILE_H / 2 - wallH);
            ctx.lineTo(pt.x, pt.y + TILE_H - wallH);
            ctx.closePath();

            if (isGreen) {
              const greenGrad = ctx.createLinearGradient(pt.x, pt.y + TILE_H - wallH, pt.x, pt.y + TILE_H);
              greenGrad.addColorStop(0, "#092218");
              greenGrad.addColorStop(1, "#04140e");
              ctx.fillStyle = greenGrad;
            } else if (zone === "digital") {
              // Tartarus: chiseled volcanic obsidian
              const slateGrad = ctx.createLinearGradient(pt.x, pt.y + TILE_H - wallH, pt.x, pt.y + TILE_H);
              slateGrad.addColorStop(0, "#231f2b");
              slateGrad.addColorStop(0.75, "#17141e");
              slateGrad.addColorStop(1, "#0f0d14");
              ctx.fillStyle = slateGrad;
            } else if (zone === "blender") {
              // Asphodel: magma-tempered dark bronze basalt
              const graphGrad = ctx.createLinearGradient(pt.x, pt.y + TILE_H - wallH, pt.x, pt.y + TILE_H);
              graphGrad.addColorStop(0, "#2a1f18");
              graphGrad.addColorStop(0.75, "#1c140e");
              graphGrad.addColorStop(1, "#120c08");
              ctx.fillStyle = graphGrad;
            } else if (zone === "nexus") {
              // House of Hades: imperial black marble with crimson depth
              const nexusGrad = ctx.createLinearGradient(pt.x, pt.y + TILE_H - wallH, pt.x, pt.y + TILE_H);
              nexusGrad.addColorStop(0, "#1f181c");
              nexusGrad.addColorStop(0.75, "#140e12");
              nexusGrad.addColorStop(1, "#0d080b");
              ctx.fillStyle = nexusGrad;
            } else {
              // Elysium: heroic jade-veined dark marble
              const plasterGrad = ctx.createLinearGradient(pt.x, pt.y + TILE_H - wallH, pt.x, pt.y + TILE_H);
              plasterGrad.addColorStop(0, "#12261d");
              plasterGrad.addColorStop(0.75, "#0b1c14");
              plasterGrad.addColorStop(1, "#06120c");
              ctx.fillStyle = plasterGrad;
            }
            ctx.fill();

            // Baseboard Trim (7px tall)
            ctx.fillStyle = isGreen
              ? "#06100c"
              : zone === "digital"
              ? "#4c0519"
              : zone === "blender"
              ? "#451a03"
              : zone === "nexus"
              ? "#500724"
              : "#064e3b";
            ctx.beginPath();
            ctx.moveTo(pt.x, pt.y + TILE_H);
            ctx.lineTo(pt.x + TILE_W / 2, pt.y + TILE_H / 2);
            ctx.lineTo(pt.x + TILE_W / 2, pt.y + TILE_H / 2 - 7);
            ctx.lineTo(pt.x, pt.y + TILE_H - 7);
            ctx.closePath();
            ctx.fill();

            // Baseboard Bevel Highlight (Stygian Gold / Realm Accent)
            ctx.strokeStyle = isGreen
              ? "rgba(52, 211, 153, 0.35)"
              : zone === "digital"
              ? "rgba(244, 63, 94, 0.70)"
              : zone === "blender"
              ? "rgba(245, 158, 11, 0.75)"
              : "rgba(251, 191, 36, 0.75)";
            ctx.lineWidth = 1.0;
            ctx.beginPath();
            ctx.moveTo(pt.x, pt.y + TILE_H - 7);
            ctx.lineTo(pt.x + TILE_W / 2, pt.y + TILE_H / 2 - 7);
            ctx.stroke();

            // Crown Stygian Gold Highlight
            ctx.strokeStyle = "rgba(251, 191, 36, 0.75)";
            ctx.lineWidth = 1.2;
            ctx.beginPath();
            ctx.moveTo(pt.x, pt.y + TILE_H - wallH);
            ctx.lineTo(pt.x + TILE_W / 2, pt.y + TILE_H / 2 - wallH);
            ctx.stroke();
          }

          // 2. South-West Facing Wall Face (Down-Left face)
          if (hasSWFloor) {
            ctx.beginPath();
            ctx.moveTo(pt.x, pt.y + TILE_H);
            ctx.lineTo(pt.x - TILE_W / 2, pt.y + TILE_H / 2);
            ctx.lineTo(pt.x - TILE_W / 2, pt.y + TILE_H / 2 - wallH);
            ctx.lineTo(pt.x, pt.y + TILE_H - wallH);
            ctx.closePath();

            if (isGreen) {
              const greenShade = ctx.createLinearGradient(pt.x, pt.y + TILE_H - wallH, pt.x, pt.y + TILE_H);
              greenShade.addColorStop(0, "#061811");
              greenShade.addColorStop(1, "#030d09");
              ctx.fillStyle = greenShade;
            } else if (zone === "digital") {
              const slateShade = ctx.createLinearGradient(pt.x, pt.y + TILE_H - wallH, pt.x, pt.y + TILE_H);
              slateShade.addColorStop(0, "#1c1722");
              slateShade.addColorStop(0.75, "#120e18");
              slateShade.addColorStop(1, "#0a070e");
              ctx.fillStyle = slateShade;
            } else if (zone === "blender") {
              const graphShade = ctx.createLinearGradient(pt.x, pt.y + TILE_H - wallH, pt.x, pt.y + TILE_H);
              graphShade.addColorStop(0, "#221711");
              graphShade.addColorStop(0.75, "#160d08");
              graphShade.addColorStop(1, "#0e0804");
              ctx.fillStyle = graphShade;
            } else if (zone === "nexus") {
              const nexusShade = ctx.createLinearGradient(pt.x, pt.y + TILE_H - wallH, pt.x, pt.y + TILE_H);
              nexusShade.addColorStop(0, "#191216");
              nexusShade.addColorStop(0.75, "#0f0a0d");
              nexusShade.addColorStop(1, "#090507");
              ctx.fillStyle = nexusShade;
            } else {
              const shadeGrad = ctx.createLinearGradient(pt.x, pt.y + TILE_H - wallH, pt.x, pt.y + TILE_H);
              shadeGrad.addColorStop(0, "#0c1f17");
              shadeGrad.addColorStop(0.75, "#07140e");
              shadeGrad.addColorStop(1, "#040c08");
              ctx.fillStyle = shadeGrad;
            }
            ctx.fill();

            // Baseboard (7px tall)
            ctx.fillStyle = isGreen
              ? "#040b08"
              : zone === "digital"
              ? "#3b0717"
              : zone === "blender"
              ? "#351403"
              : zone === "nexus"
              ? "#3d061c"
              : "#04372a";
            ctx.beginPath();
            ctx.moveTo(pt.x, pt.y + TILE_H);
            ctx.lineTo(pt.x - TILE_W / 2, pt.y + TILE_H / 2);
            ctx.lineTo(pt.x - TILE_W / 2, pt.y + TILE_H / 2 - 7);
            ctx.lineTo(pt.x, pt.y + TILE_H - 7);
            ctx.closePath();
            ctx.fill();

            // Baseboard Bevel
            ctx.strokeStyle = isGreen
              ? "rgba(52, 211, 153, 0.28)"
              : zone === "digital"
              ? "rgba(244, 63, 94, 0.55)"
              : zone === "blender"
              ? "rgba(245, 158, 11, 0.60)"
              : "rgba(251, 191, 36, 0.60)";
            ctx.lineWidth = 1.0;
            ctx.beginPath();
            ctx.moveTo(pt.x, pt.y + TILE_H - 7);
            ctx.lineTo(pt.x - TILE_W / 2, pt.y + TILE_H / 2 - 7);
            ctx.stroke();

            // Crown Stygian Gold highlight
            ctx.strokeStyle = "rgba(251, 191, 36, 0.65)";
            ctx.lineWidth = 1.2;
            ctx.beginPath();
            ctx.moveTo(pt.x, pt.y + TILE_H - wallH);
            ctx.lineTo(pt.x - TILE_W / 2, pt.y + TILE_H / 2 - wallH);
            ctx.stroke();
          }

          // 3. Continuous Wall Top Coping (Polished Obsidian & Stygian Gold)
          ctx.beginPath();
          ctx.moveTo(pt.x, pt.y - wallH);
          ctx.lineTo(pt.x + TILE_W / 2, pt.y + TILE_H / 2 - wallH);
          ctx.lineTo(pt.x, pt.y + TILE_H - wallH);
          ctx.lineTo(pt.x - TILE_W / 2, pt.y + TILE_H / 2 - wallH);
          ctx.closePath();
          ctx.fillStyle = isGreen
            ? "#081b13"
            : zone === "digital"
            ? "#1a1622"
            : zone === "blender"
            ? "#201812"
            : "#151117";
          ctx.fill();

          // Outer silhouette stroke in Stygian gold
          ctx.strokeStyle = "rgba(251, 191, 36, 0.55)";
          ctx.lineWidth = 1.0;
          ctx.beginPath();
          if (hasNEFloor) {
            ctx.moveTo(pt.x, pt.y - wallH);
            ctx.lineTo(pt.x + TILE_W / 2, pt.y + TILE_H / 2 - wallH);
          }
          if (hasSEFloor) {
            ctx.moveTo(pt.x + TILE_W / 2, pt.y + TILE_H / 2 - wallH);
            ctx.lineTo(pt.x, pt.y + TILE_H - wallH);
          }
          if (hasSWFloor) {
            ctx.moveTo(pt.x, pt.y + TILE_H - wallH);
            ctx.lineTo(pt.x - TILE_W / 2, pt.y + TILE_H / 2 - wallH);
          }
          if (hasNWFloor) {
            ctx.moveTo(pt.x - TILE_W / 2, pt.y + TILE_H / 2 - wallH);
            ctx.lineTo(pt.x, pt.y - wallH);
          }
          ctx.stroke();

          // 4. Render Mounted Artwork on Feature Walls (True Isometric Wall Projection)
          const piece = mountedPaintings.find((a) => a.col === c && a.row === r);
          if (piece) {
            const isNear = near?.artId === piece.artId;
            ctx.save();

            if (piece.face === "SE") {
              const midX = pt.x + TILE_W / 4;
              const midY = pt.y + (3 * TILE_H) / 4 - wallH / 2;

              ctx.translate(midX, midY);
              ctx.transform(1, -0.5, 0, 1, 0, 0);
              drawArtworkCard(piece, isNear);
            } else {
              const midX = pt.x - TILE_W / 4;
              const midY = pt.y + (3 * TILE_H) / 4 - wallH / 2;

              ctx.translate(midX, midY);
              ctx.transform(1, 0.5, 0, 1, 0, 0);
              drawArtworkCard(piece, isNear);
            }
            ctx.restore();
          }
        } else if (cellType === 3) {
          // B. House of Hades Imperial Underworld Velvet Divan
          // Chiseled Obsidian Base + Stygian Gold Greek Key Inlay + Royal Pomegranate Velvet Cushion
          const isPlayerSittingHere = player.isSitting && player.seatedBench?.col === c && player.seatedBench?.row === r;

          // 1. Ambient Underworld Ember Shadow
          const underGlow = ctx.createRadialGradient(pt.x, pt.y + TILE_H / 2 + 3, 2, pt.x, pt.y + TILE_H / 2 + 3, 26);
          underGlow.addColorStop(0, "rgba(225, 29, 72, 0.35)");
          underGlow.addColorStop(0.6, "rgba(185, 28, 28, 0.15)");
          underGlow.addColorStop(1, "rgba(0, 0, 0, 0)");
          ctx.fillStyle = underGlow;
          ctx.beginPath();
          ctx.ellipse(pt.x, pt.y + TILE_H / 2 + 4, 26, 13, 0, 0, Math.PI * 2);
          ctx.fill();

          // 2. Chiseled Basalt & Obsidian Plinth
          ctx.fillStyle = "#121114";
          ctx.beginPath();
          ctx.moveTo(pt.x, pt.y + TILE_H / 2 - 12);
          ctx.lineTo(pt.x + 21, pt.y + TILE_H / 2 - 2);
          ctx.lineTo(pt.x + 21, pt.y + TILE_H / 2 + 3);
          ctx.lineTo(pt.x, pt.y + TILE_H / 2 + 13);
          ctx.lineTo(pt.x - 21, pt.y + TILE_H / 2 + 3);
          ctx.lineTo(pt.x - 21, pt.y + TILE_H / 2 - 2);
          ctx.closePath();
          ctx.fill();

          // 3. Stygian Gold Beveled Greek Trim
          ctx.strokeStyle = "#d97706";
          ctx.lineWidth = 1.2;
          ctx.stroke();

          // Gilded bronze rivets / lion-paw feet accents
          ctx.fillStyle = "#fbbf24";
          ctx.beginPath();
          ctx.arc(pt.x - 18, pt.y + TILE_H / 2 + 2, 1.8, 0, Math.PI * 2);
          ctx.arc(pt.x + 18, pt.y + TILE_H / 2 + 2, 1.8, 0, Math.PI * 2);
          ctx.arc(pt.x, pt.y + TILE_H / 2 + 11, 2.0, 0, Math.PI * 2);
          ctx.fill();

          // 4. Plush Pomegranate Velvet Cushion (Deep Underworld Crimson)
          const velvetGrad = ctx.createLinearGradient(
            pt.x,
            pt.y + TILE_H / 2 - 20,
            pt.x,
            pt.y + TILE_H / 2 - 8
          );
          velvetGrad.addColorStop(0, "#be123c"); // Radiant crimson
          velvetGrad.addColorStop(0.4, "#9f1239");
          velvetGrad.addColorStop(1, "#4c0519"); // Deep shadowy wine
          ctx.fillStyle = velvetGrad;
          ctx.beginPath();
          ctx.ellipse(pt.x, pt.y + TILE_H / 2 - 14, 21, 10.5, 0, 0, Math.PI * 2);
          ctx.fill();

          // Gold piping border
          ctx.strokeStyle = "rgba(251, 191, 36, 0.75)";
          ctx.lineWidth = 1;
          ctx.stroke();

          // 5. Tufted Golden Buttons & Creases
          ctx.strokeStyle = "rgba(76, 5, 25, 0.6)";
          ctx.lineWidth = 1;
          ctx.beginPath();
          ctx.moveTo(pt.x - 12, pt.y + TILE_H / 2 - 14);
          ctx.lineTo(pt.x + 12, pt.y + TILE_H / 2 - 14);
          ctx.stroke();

          ctx.fillStyle = "#fef08a";
          [-8, 0, 8].forEach((btnX) => {
            ctx.beginPath();
            ctx.arc(pt.x + btnX, pt.y + TILE_H / 2 - 14, 1.3, 0, Math.PI * 2);
            ctx.fill();
          });
        }

        // C. Render Visitor Avatar (Zagreus, Prince of the Underworld)
        const playerDepth = Math.floor(player.col + player.row);
        if (diag === playerDepth && Math.floor(player.col) === c) {
          const pIso = toIso(player.col, player.row);

          if (player.isSitting) {
            // Seated Posture (Zagreus relaxing in royal repose atop the velvet divan)
            const sitY = pIso.y + TILE_H / 2 - 14;

            // Soft Underworld Shadow
            ctx.fillStyle = "rgba(0, 0, 0, 0.45)";
            ctx.beginPath();
            ctx.ellipse(pIso.x, sitY + 2, 11, 5, 0, 0, Math.PI * 2);
            ctx.fill();

            // Legs draped down the front
            ctx.fillStyle = "#18181b";
            ctx.fillRect(pIso.x - 5, sitY + 2, 4, 8);
            ctx.fillRect(pIso.x + 1, sitY + 2, 4, 8);

            // Fiery Underworld Boots
            ctx.fillStyle = "#dc2626";
            ctx.fillRect(pIso.x - 6, sitY + 8, 5, 4);
            ctx.fillRect(pIso.x + 1, sitY + 8, 5, 4);
            ctx.fillStyle = "#fbbf24";
            ctx.fillRect(pIso.x - 5, sitY + 9, 3, 2);
            ctx.fillRect(pIso.x + 2, sitY + 9, 3, 2);

            // Torso (Dark Underworld Chiton)
            ctx.fillStyle = "#1e1e24";
            ctx.fillRect(pIso.x - 6, sitY - 16, 12, 16);

            // Crimson Royal Underworld Sash
            ctx.fillStyle = "#b91c1c";
            ctx.beginPath();
            ctx.moveTo(pIso.x - 6, sitY - 16);
            ctx.lineTo(pIso.x + 6, sitY - 14);
            ctx.lineTo(pIso.x + 2, sitY + 1);
            ctx.lineTo(pIso.x - 5, sitY - 2);
            ctx.closePath();
            ctx.fill();

            // Golden Skull Brooch
            ctx.fillStyle = "#fbbf24";
            ctx.beginPath();
            ctx.arc(pIso.x - 4, sitY - 13, 2.2, 0, Math.PI * 2);
            ctx.fill();

            // Head & Face
            ctx.fillStyle = "#fde68a";
            ctx.beginPath();
            ctx.arc(pIso.x, sitY - 21, 5.5, 0, Math.PI * 2);
            ctx.fill();

            // Fiery Underworld Laurel Wreath (Zagreus glowing laurels)
            const laurelPulse = Math.sin(Date.now() * 0.005) * 0.3 + 0.7;
            ctx.fillStyle = `rgba(239, 68, 68, ${laurelPulse})`;
            ctx.beginPath();
            ctx.arc(pIso.x - 5, sitY - 23, 2.5, 0, Math.PI * 2);
            ctx.arc(pIso.x + 5, sitY - 23, 2.5, 0, Math.PI * 2);
            ctx.arc(pIso.x, sitY - 25, 2.8, 0, Math.PI * 2);
            ctx.fill();

            // Spiky Raven Black Hair
            ctx.fillStyle = "#09090b";
            ctx.beginPath();
            ctx.arc(pIso.x, sitY - 22, 5.6, Math.PI, Math.PI * 2);
            ctx.fill();

            // Floating Underworld Rest Indicator
            ctx.fillStyle = "rgba(251, 191, 36, 0.95)";
            ctx.font = "bold 9px serif";
            ctx.textAlign = "center";
            const floatOffset = Math.sin(Date.now() * 0.004) * 3;
            ctx.fillText("Resting", pIso.x, sitY - 32 + floatOffset);
          } else {
            // Standing / Walking Zagreus Avatar

            // 1. THE GLOWING CIRCULAR UNDERWORLD AURA RING (Golden with Crimson flame edge)
            const aura = ctx.createRadialGradient(
              pIso.x,
              pIso.y + TILE_H / 2,
              4,
              pIso.x,
              pIso.y + TILE_H / 2,
              38
            );
            aura.addColorStop(0, "rgba(239, 68, 68, 0.65)");
            aura.addColorStop(0.4, "rgba(245, 158, 11, 0.35)");
            aura.addColorStop(1, "rgba(245, 158, 11, 0)");

            ctx.fillStyle = aura;
            ctx.beginPath();
            ctx.ellipse(pIso.x, pIso.y + TILE_H / 2, 36, 18, 0, 0, Math.PI * 2);
            ctx.fill();

            // Stygian gold boundary aura ring
            ctx.strokeStyle = "rgba(251, 191, 36, 0.95)";
            ctx.lineWidth = 1.8;
            ctx.beginPath();
            ctx.ellipse(pIso.x, pIso.y + TILE_H / 2, 26, 13, 0, 0, Math.PI * 2);
            ctx.stroke();

            // 2. Avatar Character
            const bob = Math.sin(player.walkCycle) * 2.2;

            // Shadow
            ctx.fillStyle = "rgba(0, 0, 0, 0.45)";
            ctx.beginPath();
            ctx.ellipse(pIso.x, pIso.y + TILE_H / 2, 9, 5, 0, 0, Math.PI * 2);
            ctx.fill();

            // Trousers
            ctx.fillStyle = "#18181b";
            ctx.fillRect(pIso.x - 4, pIso.y + TILE_H / 2 - 10 + bob, 3, 10);
            ctx.fillRect(pIso.x + 1, pIso.y + TILE_H / 2 - 10 - bob, 3, 10);

            // Fiery Burning Boots (Zagreus iconic flaming feet)
            ctx.fillStyle = "#dc2626";
            ctx.fillRect(pIso.x - 5, pIso.y + TILE_H / 2 - 3 + bob, 4, 3.5);
            ctx.fillRect(pIso.x + 1, pIso.y + TILE_H / 2 - 3 - bob, 4, 3.5);
            ctx.fillStyle = "#fbbf24";
            ctx.fillRect(pIso.x - 4, pIso.y + TILE_H / 2 - 2 + bob, 2.5, 2);
            ctx.fillRect(pIso.x + 2, pIso.y + TILE_H / 2 - 2 - bob, 2.5, 2);

            // Charcoal Chiton/Tunic
            ctx.fillStyle = "#1e1e24";
            ctx.fillRect(pIso.x - 6, pIso.y + TILE_H / 2 - 28 + bob, 13, 18);

            // Crimson Royal Underworld Sash
            ctx.fillStyle = "#b91c1c";
            ctx.beginPath();
            ctx.moveTo(pIso.x - 6, pIso.y + TILE_H / 2 - 28 + bob);
            ctx.lineTo(pIso.x + 7, pIso.y + TILE_H / 2 - 25 + bob);
            ctx.lineTo(pIso.x + 4, pIso.y + TILE_H / 2 - 10 + bob);
            ctx.lineTo(pIso.x - 5, pIso.y + TILE_H / 2 - 12 + bob);
            ctx.closePath();
            ctx.fill();

            // Golden Skull Brooch Clasp
            ctx.fillStyle = "#fbbf24";
            ctx.beginPath();
            ctx.arc(pIso.x - 4, pIso.y + TILE_H / 2 - 24 + bob, 2.4, 0, Math.PI * 2);
            ctx.fill();

            // Head & Face
            ctx.fillStyle = "#fde68a";
            ctx.beginPath();
            ctx.arc(pIso.x, pIso.y + TILE_H / 2 - 33 + bob, 6.0, 0, Math.PI * 2);
            ctx.fill();

            // Fiery Red Laurel Wreath
            const laurelPulse = Math.sin(Date.now() * 0.005) * 0.3 + 0.7;
            ctx.fillStyle = `rgba(239, 68, 68, ${laurelPulse})`;
            ctx.beginPath();
            ctx.arc(pIso.x - 5, pIso.y + TILE_H / 2 - 35 + bob, 2.6, 0, Math.PI * 2);
            ctx.arc(pIso.x + 5, pIso.y + TILE_H / 2 - 35 + bob, 2.6, 0, Math.PI * 2);
            ctx.arc(pIso.x, pIso.y + TILE_H / 2 - 37 + bob, 2.8, 0, Math.PI * 2);
            ctx.fill();

            // Spiky Raven Black Hair
            ctx.fillStyle = "#09090b";
            ctx.beginPath();
            ctx.arc(pIso.x, pIso.y + TILE_H / 2 - 35 + bob, 6.2, Math.PI, Math.PI * 2);
            ctx.fill();
          }
        }
      }
    }

    // X-Ray Silhouette Pass:
    // If the visitor is occluded behind foreground walls, render a luminous silhouette
    // so they are always visible and never awkwardly clipped in 2.5D perspective
    const pC = Math.floor(player.col);
    const pR = Math.floor(player.row);
    const isBehindWall =
      (pR + 1 < ROWS && (MAP[pR + 1][pC] === 1 || MAP[pR + 1][pC] === 2)) ||
      (pC + 1 < COLS && (MAP[pR][pC + 1] === 1 || MAP[pR][pC + 1] === 2)) ||
      (pR + 1 < ROWS && pC + 1 < COLS && (MAP[pR + 1][pC + 1] === 1 || MAP[pR + 1][pC + 1] === 2));

    if (isBehindWall) {
      ctx.save();
      ctx.globalAlpha = 0.6;
      const pIso = toIso(player.col, player.row);
      const bob = Math.sin(player.walkCycle) * 2.2;

      // Golden glowing Underworld ring
      ctx.strokeStyle = "rgba(251, 191, 36, 0.95)";
      ctx.lineWidth = 1.6;
      ctx.beginPath();
      ctx.ellipse(pIso.x, pIso.y + TILE_H / 2, 26, 13, 0, 0, Math.PI * 2);
      ctx.stroke();

      // Soft Zagreus silhouette
      ctx.fillStyle = "#fef08a";
      ctx.beginPath();
      ctx.arc(pIso.x, pIso.y + TILE_H / 2 - 33 + bob, 6.0, 0, Math.PI * 2);
      ctx.fill();

      // Laurel glow
      ctx.fillStyle = "rgba(239, 68, 68, 0.9)";
      ctx.beginPath();
      ctx.arc(pIso.x, pIso.y + TILE_H / 2 - 36 + bob, 3.0, 0, Math.PI * 2);
      ctx.fill();

      ctx.fillStyle = "#b91c1c";
      ctx.fillRect(pIso.x - 6, pIso.y + TILE_H / 2 - 28 + bob, 13, 18);

      ctx.fillStyle = "#18181b";
      ctx.fillRect(pIso.x - 4, pIso.y + TILE_H / 2 - 10 + bob, 3, 10);
      ctx.fillRect(pIso.x + 1, pIso.y + TILE_H / 2 - 10 - bob, 3, 10);
      ctx.restore();
    }

    ctx.restore();

    // --- Pass 3.5: Floating Underworld Embers & Soul Motes (Hades Atmospheric Magic) ---
    underworldMotes.forEach((m) => {
      m.y += m.vy;
      m.x += m.vx + Math.sin(m.wobble) * 0.35;
      m.wobble += 0.035;

      if (m.y < -canvas.height / 2 - 60) m.y = canvas.height / 2 + 60;
      if (m.y > canvas.height / 2 + 60) m.y = -canvas.height / 2 - 60;
      if (m.x < -canvas.width / 2 - 60) m.x = canvas.width / 2 + 60;
      if (m.x > canvas.width / 2 + 60) m.x = -canvas.width / 2 - 60;

      const alpha = m.alpha * (0.55 + Math.sin(m.wobble * 2) * 0.45);
      if (m.type === "ember") {
        ctx.fillStyle = `rgba(244, 63, 94, ${alpha})`;
      } else if (m.type === "gold") {
        ctx.fillStyle = `rgba(251, 191, 36, ${alpha})`;
      } else {
        ctx.fillStyle = `rgba(52, 211, 153, ${alpha * 0.8})`;
      }
      ctx.beginPath();
      ctx.arc(m.x + canvas.width / 2, m.y + canvas.height / 2, m.size, 0, Math.PI * 2);
      ctx.fill();
    });

    // --- Pass 4: Atmospheric Cinema Vignette ---
    // Soft radial falloff that frames the museum pavilion against the pure black canvas
    const vig = ctx.createRadialGradient(
      canvas.width / 2,
      canvas.height / 2,
      Math.min(canvas.width, canvas.height) * 0.40,
      canvas.width / 2,
      canvas.height / 2,
      Math.max(canvas.width, canvas.height) * 0.78
    );
    vig.addColorStop(0, "rgba(0, 0, 0, 0)");
    vig.addColorStop(0.65, "rgba(0, 0, 0, 0.25)");
    vig.addColorStop(1, "rgba(0, 0, 0, 0.85)");
    ctx.fillStyle = vig;
    ctx.fillRect(0, 0, canvas.width, canvas.height);

    // --- Pass 5: Top-Left Blueprint Radar ---
    if (minimapCtx && minimapCanvas) {
      minimapCtx.clearRect(0, 0, minimapCanvas.width, minimapCanvas.height);

      const mw = minimapCanvas.width;
      const mh = minimapCanvas.height;
      const cellW = mw / COLS;
      const cellH = mh / ROWS;

      // Dark blueprint backdrop
      minimapCtx.fillStyle = "#070c10";
      minimapCtx.fillRect(0, 0, mw, mh);

      // Tinted floor areas and walls by wing
      for (let r = 0; r < ROWS; r++) {
        for (let c = 0; c < COLS; c++) {
          const zone = getTileZone(c, r);
          if (MAP[r][c] === 0 || MAP[r][c] === 3) {
            if (zone === "physical") minimapCtx.fillStyle = "rgba(245, 158, 11, 0.12)";
            else if (zone === "digital") minimapCtx.fillStyle = "rgba(56, 189, 248, 0.14)";
            else if (zone === "blender") minimapCtx.fillStyle = "rgba(249, 115, 22, 0.14)";
            else minimapCtx.fillStyle = "rgba(255, 255, 255, 0.03)";
            minimapCtx.fillRect(c * cellW, r * cellH, cellW, cellH);
          } else if (MAP[r][c] === 1 || MAP[r][c] === 2) {
            if (zone === "digital") minimapCtx.fillStyle = "rgba(186, 230, 253, 0.55)";
            else if (zone === "blender") minimapCtx.fillStyle = "rgba(253, 186, 116, 0.55)";
            else minimapCtx.fillStyle = "rgba(255, 255, 255, 0.45)";
            minimapCtx.fillRect(c * cellW, r * cellH, cellW, cellH);
          }
        }
      }

      // Color-coded wing pins
      mountedPaintings.forEach((p) => {
        if (p.category === "digital") {
          minimapCtx.fillStyle = "#38bdf8"; // Cyan
        } else if (p.category === "blender") {
          minimapCtx.fillStyle = "#f97316"; // Blender Orange
        } else {
          minimapCtx.fillStyle = "#f59e0b"; // Warm Gold
        }
        minimapCtx.beginPath();
        minimapCtx.arc((p.col + 0.5) * cellW, (p.row + 0.5) * cellH, 3.5, 0, Math.PI * 2);
        minimapCtx.fill();
      });

      // Visitor pulsing indicator
      const px = (player.col + 0.5) * cellW;
      const py = (player.row + 0.5) * cellH;

      minimapCtx.fillStyle = "rgba(251, 191, 36, 0.45)";
      minimapCtx.beginPath();
      minimapCtx.arc(px, py, 7, 0, Math.PI * 2);
      minimapCtx.fill();

      minimapCtx.fillStyle = "#ffffff";
      minimapCtx.beginPath();
      minimapCtx.arc(px, py, 3, 0, Math.PI * 2);
      minimapCtx.fill();
    }

    requestAnimationFrame(animate);
  }

  requestAnimationFrame(animate);
}
