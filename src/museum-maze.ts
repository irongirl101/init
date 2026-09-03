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
      sfxBtn.textContent = sfxEnabled ? "🔊" : "🔇";
      sfxBtn.classList.toggle("opacity-50", !sfxEnabled);
    });
  }

  // --- Dimensions & Coordinate Projections ---
  const COLS = 16;
  const ROWS = 16;
  const TILE_W = 68; // Isometric tile width
  const TILE_H = 34; // Isometric tile height

  // Wall Heights:
  // Back walls that display artworks are tall (58px) to showcase art proudly.
  // Interior foreground partition walls are low gallery dividers (28px) so they NEVER occlude art!
  const TALL_WALL_H = 58;
  const LOW_WALL_H = 28;

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

  // --- Architectural Gallery Floor Plan ---
  // 0 = Parquet Floor
  // 1 = Gallery Partition Wall
  // 2 = Dark Perimeter Wall
  // 3 = Leather Gallery Bench
  // Wide open central promenade: 100% UNBLOCKED SIGHTLINE directly to Torii Gate!
  const MAP: number[][] = [
    // 0  1  2  3  4  5  6  7  8  9 10 11 12 13 14 15
    [2, 2, 2, 2, 2, 2, 2, 2, 2, 2, 2, 2, 2, 2, 2, 2], // 0: North Perimeter
    [2, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 2], // 1
    [2, 0, 1, 1, 0, 0, 1, 1, 1, 1, 0, 0, 1, 1, 0, 2], // 2: Feature back walls (Holds Lot 1 & 2 & 3)
    [2, 0, 1, 1, 0, 0, 0, 0, 0, 0, 0, 0, 1, 1, 0, 2], // 3
    [2, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 2], // 4: Wide, open central sightline corridor
    [2, 0, 0, 0, 1, 0, 0, 0, 0, 0, 0, 0, 1, 0, 0, 2], // 5: Low side dividers (shifted away from center)
    [2, 0, 0, 0, 1, 0, 0, 0, 0, 0, 0, 0, 1, 0, 0, 2], // 6
    [2, 0, 0, 0, 0, 0, 0, 3, 3, 0, 0, 0, 0, 0, 0, 2], // 7: Central Atrium & Leather Bench
    [2, 0, 0, 0, 0, 0, 0, 3, 3, 0, 0, 0, 0, 0, 0, 2], // 8
    [2, 0, 0, 0, 1, 0, 0, 0, 0, 0, 0, 0, 1, 0, 0, 2], // 9: Low side dividers
    [2, 0, 1, 0, 1, 0, 0, 0, 0, 0, 0, 0, 1, 1, 0, 2], // 10
    [2, 0, 1, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 1, 0, 2], // 11
    [2, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 2], // 12: Grand Promenade (unobstructed)
    [2, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 2], // 13
    [2, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 2], // 14: Foyer
    [2, 2, 2, 2, 2, 2, 2, 2, 2, 2, 2, 2, 2, 2, 2, 2], // 15: South Perimeter
  ];

  // Check if a wall should be tall (perimeter or back artwork wall) or low (internal divider)
  function getWallHeight(r: number, c: number): number {
    if (MAP[r][c] === 2) return TALL_WALL_H; // Perimeter walls
    if (r <= 3) return TALL_WALL_H; // North exhibition feature walls
    return LOW_WALL_H; // Interior partition walls stay low to ensure open sightlines
  }

  // --- Mount the 3 Original Artworks on Prime Unobstructed Feature Walls ---
  const mountedPaintings: MountedPainting[] = [];
  const artworkMounts = [
    // Lot #1: Torii Gate at Twilight - Center North Feature Wall (SE Face, 100% open sightline)
    { artId: "torii", col: 8, row: 2, face: "SE" as const, lotNum: 1 },
    // Lot #2: WALL-E Urban Solitude - East Wing Back Wall (SW Face, 100% open sightline)
    { artId: "walle-ink", col: 13, row: 3, face: "SW" as const, lotNum: 2 },
    // Lot #3: WALL-E Solar Awakening - West Wing Feature Wall (SE Face, 100% open sightline)
    { artId: "walle-color", col: 3, row: 2, face: "SE" as const, lotNum: 3 },
  ];

  artworkMounts.forEach((m) => {
    const art = artworks.find((a) => a.id === m.artId);
    if (!art) return;

    const img = new Image();
    const imgSrc =
      art.image.startsWith("http") || (baseUrl && art.image.startsWith(baseUrl))
        ? art.image
        : baseUrl + art.image;
    img.src = imgSrc;

    mountedPaintings.push({
      artId: m.artId,
      col: m.col,
      row: m.row,
      face: m.face,
      imgElement: img,
      title: art.title,
      lotNum: m.lotNum,
    });
  });

  // --- Visitor State & Smooth Velocity ---
  const player = {
    col: 7.5,
    row: 12.5, // Spawns in the open Grand Promenade
    vx: 0,
    vy: 0,
    targetCol: null as number | null,
    targetRow: null as number | null,
    radius: 0.26, // Slimmer collision radius for effortless corner sliding
    maxSpeed: 0.085,
    accel: 0.02,
    friction: 0.78,
    walkCycle: 0,
    distMoved: 0,
  };

  // Keyboard state
  const keys: Record<string, boolean> = {};

  window.addEventListener("keydown", (e) => {
    if (document.activeElement && ["INPUT", "TEXTAREA"].includes(document.activeElement.tagName)) {
      return;
    }
    keys[e.key.toLowerCase()] = true;

    if (e.key.toLowerCase() === "e" || e.code === "Space") {
      const near = getNearbyPainting(player.col, player.row, 2.4);
      if (near) {
        openInspectionModal(near.artId);
        e.preventDefault();
      }
    }
  });

  window.addEventListener("keyup", (e) => {
    keys[e.key.toLowerCase()] = false;
  });

  // Camera coordinates
  const camera = {
    x: 0,
    y: 0,
  };

  function isWalkable(c: number, r: number, radius = 0.26): boolean {
    const minC = Math.floor(c - radius);
    const maxC = Math.floor(c + radius);
    const minR = Math.floor(r - radius);
    const maxR = Math.floor(r + radius);

    for (let row = minR; row <= maxR; row++) {
      for (let col = minC; col <= maxC; col++) {
        if (row < 0 || row >= ROWS || col < 0 || col >= COLS) return false;
        if (MAP[row][col] === 1 || MAP[row][col] === 2 || MAP[row][col] === 3) {
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
      const d = Math.hypot(pc - (p.col + 0.5), pr - (p.row + 0.5));
      if (d < minDist) {
        minDist = d;
        nearest = p;
      }
    }
    return nearest;
  }

  // Click to Walk on Isometric Plane
  canvas.addEventListener("click", (e) => {
    initAudio();
    const rect = canvas.getBoundingClientRect();
    const clickX = e.clientX - rect.left - canvas.width / 2 + camera.x;
    const clickY = e.clientY - rect.top - canvas.height / 2 + camera.y;

    const gridPos = fromIso(clickX, clickY);

    // Direct click on painting?
    for (const piece of mountedPaintings) {
      if (Math.hypot(gridPos.col - piece.col, gridPos.row - piece.row) < 1.8) {
        openInspectionModal(piece.artId);
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
      if (dir === "interact") {
        const near = getNearbyPainting(player.col, player.row, 2.4);
        if (near) openInspectionModal(near.artId);
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
      const p = getNearbyPainting(player.col, player.row, 2.4);
      if (p) openInspectionModal(p.artId);
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
      messageEl.textContent = `✦ Offer registered! You are now the premier patron for this piece!`;
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

    const up = keys["w"] || keys["arrowup"];
    const down = keys["s"] || keys["arrowdown"];
    const left = keys["a"] || keys["arrowleft"];
    const right = keys["d"] || keys["arrowright"];

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
      const dC = (nx / (TILE_W / 2) + ny / (TILE_H / 2)) * 0.5 * player.maxSpeed * 32;
      const dR = (ny / (TILE_H / 2) - nx / (TILE_W / 2)) * 0.5 * player.maxSpeed * 32;

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
    player.vx += (targetVx - player.vx) * 0.25;
    player.vy += (targetVy - player.vy) * 0.25;

    // Apply movement with wall collision & smooth sliding
    if (Math.abs(player.vx) > 0.001 || Math.abs(player.vy) > 0.001) {
      player.walkCycle += 0.22;

      const nextC = player.col + player.vx;
      const nextR = player.row + player.vy;

      // Full diagonal step
      if (isWalkable(nextC, nextR, player.radius)) {
        player.col = nextC;
        player.row = nextR;
      } else {
        // Wall slide along Col axis
        if (isWalkable(nextC, player.row, player.radius)) {
          player.col = nextC;
        }
        // Wall slide along Row axis
        if (isWalkable(player.col, nextR, player.radius)) {
          player.row = nextR;
        }
      }

      player.distMoved += Math.hypot(player.vx, player.vy);
      if (player.distMoved > 0.5) {
        player.distMoved = 0;
        playStep();
      }
    }

    // 2. Camera smoothly centers on player
    const playerIso = toIso(player.col, player.row);
    camera.x += (playerIso.x - camera.x) * 0.08;
    camera.y += (playerIso.y - camera.y) * 0.08;

    // 3. Artwork Proximity Check
    const near = getNearbyPainting(player.col, player.row, 2.4);
    if (near && promptEl && promptTitleEl) {
      promptTitleEl.textContent = `${near.title} (Lot #${near.lotNum})`;
      promptEl.classList.remove("opacity-0", "translate-y-4", "scale-95");
      promptEl.classList.add("opacity-100", "translate-y-0", "scale-100");
    } else if (promptEl) {
      promptEl.classList.add("opacity-0", "translate-y-4", "scale-95");
      promptEl.classList.remove("opacity-100", "translate-y-0", "scale-100");
    }

    // --- CANVAS DRAWING ---
    ctx.clearRect(0, 0, canvas.width, canvas.height);

    // Pure Solid Black Background (as requested: "make the background black")
    ctx.fillStyle = "#000000";
    ctx.fillRect(0, 0, canvas.width, canvas.height);

    ctx.save();
    ctx.translate(canvas.width / 2 - camera.x, canvas.height / 2 - camera.y);

    // --- Pass 1: Polished Dark Mahogany French Parquet Floors ---
    for (let r = 0; r < ROWS; r++) {
      for (let c = 0; c < COLS; c++) {
        if (MAP[r][c] === 0 || MAP[r][c] === 3) {
          const pt = toIso(c, r);

          ctx.beginPath();
          ctx.moveTo(pt.x, pt.y);
          ctx.lineTo(pt.x + TILE_W / 2, pt.y + TILE_H / 2);
          ctx.lineTo(pt.x, pt.y + TILE_H);
          ctx.lineTo(pt.x - TILE_W / 2, pt.y + TILE_H / 2);
          ctx.closePath();

          // Dark varnished parquet with subtle warm grain
          const isAlt = (r + c) % 2 === 0;
          ctx.fillStyle = isAlt ? "#241a13" : "#1c140e";
          ctx.fill();

          // Delicate plank lines
          ctx.strokeStyle = "rgba(0, 0, 0, 0.4)";
          ctx.lineWidth = 0.8;
          ctx.stroke();

          // Diagonal parquet sheen
          ctx.strokeStyle = "rgba(255, 235, 205, 0.04)";
          ctx.beginPath();
          ctx.moveTo(pt.x - TILE_W / 4, pt.y + TILE_H / 4);
          ctx.lineTo(pt.x + TILE_W / 4, pt.y + (3 * TILE_H) / 4);
          ctx.stroke();
        }
      }
    }

    // --- Pass 2: Warm Directional Art Spotlights on the Floor ---
    mountedPaintings.forEach((piece) => {
      const isNear = near?.artId === piece.artId;
      const spotPos = toIso(
        piece.col + (piece.face === "SE" ? 0.7 : 0),
        piece.row + (piece.face === "SW" ? 0.7 : 0)
      );

      const spot = ctx.createRadialGradient(
        spotPos.x,
        spotPos.y + TILE_H / 2,
        4,
        spotPos.x,
        spotPos.y + TILE_H / 2,
        isNear ? 55 : 38
      );
      spot.addColorStop(0, isNear ? "rgba(255, 230, 160, 0.45)" : "rgba(255, 230, 160, 0.22)");
      spot.addColorStop(0.7, isNear ? "rgba(255, 215, 130, 0.15)" : "rgba(255, 215, 130, 0.06)");
      spot.addColorStop(1, "rgba(255, 215, 130, 0)");

      ctx.fillStyle = spot;
      ctx.beginPath();
      ctx.ellipse(
        spotPos.x,
        spotPos.y + TILE_H / 2,
        isNear ? 48 : 34,
        isNear ? 24 : 17,
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

          // Neighbor checks: ONLY draw faces and edges that face empty floor!
          // Adjacent wall cells seamlessly share vertices without seam strokes!
          const hasSouthNeighborFloor = r + 1 < ROWS && MAP[r + 1][c] !== 1 && MAP[r + 1][c] !== 2;
          const hasEastNeighborFloor = c + 1 < COLS && MAP[r][c + 1] !== 1 && MAP[r][c + 1] !== 2;
          const hasNorthNeighborFloor = r - 1 >= 0 && MAP[r - 1][c] !== 1 && MAP[r - 1][c] !== 2;
          const hasWestNeighborFloor = c - 1 >= 0 && MAP[r][c - 1] !== 1 && MAP[r][c - 1] !== 2;

          // Soft Ambient Wall Drop Shadow
          ctx.fillStyle = "rgba(0, 0, 0, 0.4)";
          ctx.beginPath();
          ctx.moveTo(pt.x, pt.y + TILE_H);
          ctx.lineTo(pt.x + TILE_W / 2 + 8, pt.y + TILE_H / 2 + 8);
          ctx.lineTo(pt.x - TILE_W / 2 - 8, pt.y + TILE_H / 2 + 8);
          ctx.closePath();
          ctx.fill();

          // 1. South-East Facing Wall Face (Right face) - only if adjacent to floor!
          if (hasSouthNeighborFloor) {
            ctx.beginPath();
            ctx.moveTo(pt.x, pt.y + TILE_H);
            ctx.lineTo(pt.x + TILE_W / 2, pt.y + TILE_H / 2);
            ctx.lineTo(pt.x + TILE_W / 2, pt.y + TILE_H / 2 - wallH);
            ctx.lineTo(pt.x, pt.y + TILE_H - wallH);
            ctx.closePath();

            // Warm gallery plaster gradient OR sleek obsidian perimeter
            if (isGreen) {
              ctx.fillStyle = "#141617";
            } else {
              const plasterGrad = ctx.createLinearGradient(
                pt.x,
                pt.y + TILE_H - wallH,
                pt.x,
                pt.y + TILE_H
              );
              plasterGrad.addColorStop(0, "#faf6ef");
              plasterGrad.addColorStop(0.85, "#ece5d9");
              plasterGrad.addColorStop(1, "#dfd7ca");
              ctx.fillStyle = plasterGrad;
            }
            ctx.fill();

            // Continuous Dark Wood Baseboard Trim
            ctx.fillStyle = isGreen ? "#0a0b0c" : "#2d1a10";
            ctx.beginPath();
            ctx.moveTo(pt.x, pt.y + TILE_H);
            ctx.lineTo(pt.x + TILE_W / 2, pt.y + TILE_H / 2);
            ctx.lineTo(pt.x + TILE_W / 2, pt.y + TILE_H / 2 - 6);
            ctx.lineTo(pt.x, pt.y + TILE_H - 6);
            ctx.closePath();
            ctx.fill();

            // Crown Highlight
            ctx.strokeStyle = isGreen ? "rgba(255,255,255,0.12)" : "rgba(255,255,255,0.6)";
            ctx.lineWidth = 1;
            ctx.beginPath();
            ctx.moveTo(pt.x, pt.y + TILE_H - wallH);
            ctx.lineTo(pt.x + TILE_W / 2, pt.y + TILE_H / 2 - wallH);
            ctx.stroke();
          }

          // 2. South-West Facing Wall Face (Left face) - only if adjacent to floor!
          if (hasEastNeighborFloor) {
            ctx.beginPath();
            ctx.moveTo(pt.x, pt.y + TILE_H);
            ctx.lineTo(pt.x - TILE_W / 2, pt.y + TILE_H / 2);
            ctx.lineTo(pt.x - TILE_W / 2, pt.y + TILE_H / 2 - wallH);
            ctx.lineTo(pt.x, pt.y + TILE_H - wallH);
            ctx.closePath();

            if (isGreen) {
              ctx.fillStyle = "#111314";
            } else {
              const shadeGrad = ctx.createLinearGradient(
                pt.x,
                pt.y + TILE_H - wallH,
                pt.x,
                pt.y + TILE_H
              );
              shadeGrad.addColorStop(0, "#ebe4d8");
              shadeGrad.addColorStop(0.85, "#dbd2c4");
              shadeGrad.addColorStop(1, "#cec4b5");
              ctx.fillStyle = shadeGrad;
            }
            ctx.fill();

            // Baseboard
            ctx.fillStyle = isGreen ? "#08090a" : "#24140b";
            ctx.beginPath();
            ctx.moveTo(pt.x, pt.y + TILE_H);
            ctx.lineTo(pt.x - TILE_W / 2, pt.y + TILE_H / 2);
            ctx.lineTo(pt.x - TILE_W / 2, pt.y + TILE_H / 2 - 6);
            ctx.lineTo(pt.x, pt.y + TILE_H - 6);
            ctx.closePath();
            ctx.fill();

            // Crown highlight
            ctx.strokeStyle = isGreen ? "rgba(255,255,255,0.1)" : "rgba(255,255,255,0.4)";
            ctx.lineWidth = 1;
            ctx.beginPath();
            ctx.moveTo(pt.x, pt.y + TILE_H - wallH);
            ctx.lineTo(pt.x - TILE_W / 2, pt.y + TILE_H / 2 - wallH);
            ctx.stroke();
          }

          // 3. Continuous Wall Top Coping (Seamless surface, NO internal seams!)
          ctx.beginPath();
          ctx.moveTo(pt.x, pt.y - wallH);
          ctx.lineTo(pt.x + TILE_W / 2, pt.y + TILE_H / 2 - wallH);
          ctx.lineTo(pt.x, pt.y + TILE_H - wallH);
          ctx.lineTo(pt.x - TILE_W / 2, pt.y + TILE_H / 2 - wallH);
          ctx.closePath();
          ctx.fillStyle = isGreen ? "#1e2122" : "#faf7f0";
          ctx.fill();

          // ONLY stroke the outer silhouette of the wall, NEVER internal tile borders!
          ctx.strokeStyle = "rgba(0, 0, 0, 0.1)";
          ctx.lineWidth = 0.8;
          ctx.beginPath();
          if (hasNorthNeighborFloor) {
            ctx.moveTo(pt.x, pt.y - wallH);
            ctx.lineTo(pt.x + TILE_W / 2, pt.y + TILE_H / 2 - wallH);
          }
          if (hasSouthNeighborFloor) {
            ctx.moveTo(pt.x + TILE_W / 2, pt.y + TILE_H / 2 - wallH);
            ctx.lineTo(pt.x, pt.y + TILE_H - wallH);
          }
          if (hasEastNeighborFloor) {
            ctx.moveTo(pt.x, pt.y + TILE_H - wallH);
            ctx.lineTo(pt.x - TILE_W / 2, pt.y + TILE_H / 2 - wallH);
          }
          if (hasWestNeighborFloor) {
            ctx.moveTo(pt.x - TILE_W / 2, pt.y + TILE_H / 2 - wallH);
            ctx.lineTo(pt.x, pt.y - wallH);
          }
          ctx.stroke();

          // 4. Render Mounted Artwork on Feature Walls (Elevated at eye level)
          const piece = mountedPaintings.find((a) => a.col === c && a.row === r);
          if (piece) {
            const isNear = near?.artId === piece.artId;
            ctx.save();

            if (piece.face === "SE") {
              const cx = pt.x + TILE_W / 4;
              const cy = pt.y + TILE_H / 2 - wallH * 0.52;

              // Gilded Brass Frame
              ctx.fillStyle = "rgba(0, 0, 0, 0.45)";
              ctx.fillRect(cx - 18, cy - 24, 36, 46); // Shadow

              ctx.fillStyle = isNear ? "#f59e0b" : "#b45309";
              ctx.fillRect(cx - 17, cy - 23, 34, 44);

              ctx.fillStyle = "#78350f";
              ctx.fillRect(cx - 16, cy - 22, 32, 42);

              // Linen Matte
              ctx.fillStyle = "#faf8f5";
              ctx.fillRect(cx - 15, cy - 21, 30, 40);

              // Real Artwork Image
              if (piece.imgElement.complete && piece.imgElement.naturalWidth > 0) {
                ctx.drawImage(piece.imgElement, cx - 13, cy - 19, 26, 36);
              } else {
                ctx.fillStyle = "#1e293b";
                ctx.fillRect(cx - 13, cy - 19, 26, 36);
              }

              // Overhead Brass Picture Lamp
              ctx.fillStyle = "#d97706";
              ctx.fillRect(cx - 11, cy - 28, 22, 3.5);
              ctx.fillStyle = isNear ? "#fef08a" : "#fbbf24";
              ctx.fillRect(cx - 8, cy - 26, 16, 1.5);

              // Engraved Brass Placard
              ctx.fillStyle = "#78350f";
              ctx.fillRect(cx - 12, cy + 24, 24, 6);
              ctx.fillStyle = "#fef3c7";
              ctx.font = "bold 4.5px sans-serif";
              ctx.textAlign = "center";
              ctx.fillText(`LOT #${piece.lotNum}`, cx, cy + 29);
            } else {
              const cx = pt.x - TILE_W / 4;
              const cy = pt.y + TILE_H / 2 - wallH * 0.52;

              ctx.fillStyle = "rgba(0, 0, 0, 0.45)";
              ctx.fillRect(cx - 18, cy - 24, 36, 46);

              ctx.fillStyle = isNear ? "#f59e0b" : "#b45309";
              ctx.fillRect(cx - 17, cy - 23, 34, 44);

              ctx.fillStyle = "#78350f";
              ctx.fillRect(cx - 16, cy - 22, 32, 42);

              ctx.fillStyle = "#faf8f5";
              ctx.fillRect(cx - 15, cy - 21, 30, 40);

              if (piece.imgElement.complete && piece.imgElement.naturalWidth > 0) {
                ctx.drawImage(piece.imgElement, cx - 13, cy - 19, 26, 36);
              } else {
                ctx.fillStyle = "#1e293b";
                ctx.fillRect(cx - 13, cy - 19, 26, 36);
              }

              ctx.fillStyle = "#d97706";
              ctx.fillRect(cx - 11, cy - 28, 22, 3.5);
              ctx.fillStyle = isNear ? "#fef08a" : "#fbbf24";
              ctx.fillRect(cx - 8, cy - 26, 16, 1.5);

              ctx.fillStyle = "#78350f";
              ctx.fillRect(cx - 12, cy + 24, 24, 6);
              ctx.fillStyle = "#fef3c7";
              ctx.font = "bold 4.5px sans-serif";
              ctx.textAlign = "center";
              ctx.fillText(`LOT #${piece.lotNum}`, cx, cy + 29);
            }
            ctx.restore();
          }
        } else if (cellType === 3) {
          // B. Cognac Leather Gallery Bench
          ctx.fillStyle = "rgba(0, 0, 0, 0.35)";
          ctx.beginPath();
          ctx.ellipse(pt.x, pt.y + TILE_H / 2 + 4, 20, 10, 0, 0, Math.PI * 2);
          ctx.fill();

          ctx.fillStyle = "#1b120c";
          ctx.fillRect(pt.x - 16, pt.y + TILE_H / 2 - 14, 32, 14);

          ctx.fillStyle = "#5c3317";
          ctx.beginPath();
          ctx.ellipse(pt.x, pt.y + TILE_H / 2 - 14, 18, 9, 0, 0, Math.PI * 2);
          ctx.fill();
        }

        // C. Render Visitor Avatar with Glowing Golden Aura Ring
        const playerDepth = Math.floor(player.col + player.row);
        if (diag === playerDepth && Math.floor(player.col) === c) {
          const pIso = toIso(player.col, player.row);

          // 1. THE GLOWING CIRCULAR GOLDEN AURA RING
          const aura = ctx.createRadialGradient(
            pIso.x,
            pIso.y + TILE_H / 2,
            4,
            pIso.x,
            pIso.y + TILE_H / 2,
            38
          );
          aura.addColorStop(0, "rgba(251, 191, 36, 0.65)");
          aura.addColorStop(0.5, "rgba(245, 158, 11, 0.28)");
          aura.addColorStop(1, "rgba(245, 158, 11, 0)");

          ctx.fillStyle = aura;
          ctx.beginPath();
          ctx.ellipse(pIso.x, pIso.y + TILE_H / 2, 38, 19, 0, 0, Math.PI * 2);
          ctx.fill();

          // Golden boundary aura ring
          ctx.strokeStyle = "rgba(251, 191, 36, 0.95)";
          ctx.lineWidth = 1.8;
          ctx.beginPath();
          ctx.ellipse(pIso.x, pIso.y + TILE_H / 2, 28, 14, 0, 0, Math.PI * 2);
          ctx.stroke();

          // 2. Avatar Character
          const bob = Math.sin(player.walkCycle) * 2.2;

          // Shadow
          ctx.fillStyle = "rgba(0, 0, 0, 0.4)";
          ctx.beginPath();
          ctx.ellipse(pIso.x, pIso.y + TILE_H / 2, 9, 5, 0, 0, Math.PI * 2);
          ctx.fill();

          // Trousers & Shoes
          ctx.fillStyle = "#1e293b";
          ctx.fillRect(pIso.x - 4, pIso.y + TILE_H / 2 - 10 + bob, 3, 10);
          ctx.fillRect(pIso.x + 1, pIso.y + TILE_H / 2 - 10 - bob, 3, 10);

          // Charcoal Jacket
          ctx.fillStyle = "#1e1e24";
          ctx.fillRect(pIso.x - 6, pIso.y + TILE_H / 2 - 28 + bob, 13, 18);

          // Satchel Strap
          ctx.strokeStyle = "#b45309";
          ctx.lineWidth = 1.8;
          ctx.beginPath();
          ctx.moveTo(pIso.x - 5, pIso.y + TILE_H / 2 - 27 + bob);
          ctx.lineTo(pIso.x + 5, pIso.y + TILE_H / 2 - 16 + bob);
          ctx.stroke();

          // Head & Hair
          ctx.fillStyle = "#fde68a";
          ctx.beginPath();
          ctx.arc(pIso.x, pIso.y + TILE_H / 2 - 33 + bob, 6.0, 0, Math.PI * 2);
          ctx.fill();

          ctx.fillStyle = "#18181b";
          ctx.beginPath();
          ctx.arc(pIso.x, pIso.y + TILE_H / 2 - 35 + bob, 6.2, Math.PI, Math.PI * 2);
          ctx.fill();
        }
      }
    }

    ctx.restore();

    // --- Pass 4: Top-Left Blueprint Radar ---
    if (minimapCtx && minimapCanvas) {
      minimapCtx.clearRect(0, 0, minimapCanvas.width, minimapCanvas.height);

      const mw = minimapCanvas.width;
      const mh = minimapCanvas.height;
      const cellW = mw / COLS;
      const cellH = mh / ROWS;

      // Dark blueprint backdrop
      minimapCtx.fillStyle = "#070c10";
      minimapCtx.fillRect(0, 0, mw, mh);

      // White continuous walls
      minimapCtx.fillStyle = "rgba(255, 255, 255, 0.4)";
      for (let r = 0; r < ROWS; r++) {
        for (let c = 0; c < COLS; c++) {
          if (MAP[r][c] === 1 || MAP[r][c] === 2) {
            minimapCtx.fillRect(c * cellW, r * cellH, cellW, cellH);
          }
        }
      }

      // Amber lot pins
      mountedPaintings.forEach((p) => {
        minimapCtx.fillStyle = "#f59e0b";
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
