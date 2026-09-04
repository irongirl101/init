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
  spotX: number;
  spotY: number;
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
    osc.onended = () => {
      osc.disconnect();
      gain.disconnect();
    };
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
    osc.onended = () => {
      osc.disconnect();
      gain.disconnect();
    };
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

  // --- Retro Pixel-Art Hades Media Player Controller (MP3 Audio) ---
  const HADES_TRACKS = [
    { title: "GOOD RIDDANCE", artist: "EURYDICE & ASHLEY • HADES", scale: [146.83, 155.56, 174.61, 196.00, 220.00, 233.08, 261.63, 293.66], drone: 73.42 },
    { title: "NO ESCAPE", artist: "DARREN KORB • HADES", scale: [146.83, 155.56, 174.61, 196.00, 220.00, 233.08, 261.63, 293.66], drone: 73.42 },
    { title: "HOUSE OF HADES", artist: "DARREN KORB • HADES", scale: [110.00, 130.81, 146.83, 164.81, 196.00, 220.00], drone: 55.00 },
    { title: "OUT OF TARTARUS", artist: "DARREN KORB • HADES", scale: [146.83, 174.61, 196.00, 220.00, 261.63], drone: 73.42 },
    { title: "IN THE BLOOD", artist: "DARREN KORB & ASHLEY", scale: [164.81, 196.00, 220.00, 246.94, 293.66], drone: 82.41 },
    { title: "LAMENT OF ORPHEUS", artist: "DARREN KORB • HADES", scale: [130.81, 146.83, 164.81, 196.00, 220.00], drone: 65.41 }
  ];

  let currentTrackIdx = 0;
  let isBgmPlaying = false;
  let bgmInterval: number | null = null;
  let droneOsc: OscillatorNode | null = null;
  let droneGain: GainNode | null = null;

  // Real MP3 Audio Element
  const isGhPages = window.location.pathname.startsWith("/init");
  const audioBasePath = isGhPages ? "/init/assets/audio/" : "/assets/audio/";
  const audioSrcCandidates = [
    `${audioBasePath}hades-theme.mp3`,
    "./assets/audio/hades-theme.mp3",
    "../assets/audio/hades-theme.mp3",
    "/assets/audio/hades-theme.mp3",
    `${audioBasePath}Good%20Riddance%20(Eurydice%20S....mp3`
  ];

  let bgmAudio: HTMLAudioElement | null = null;
  try {
    bgmAudio = new Audio(audioSrcCandidates[0]);
    bgmAudio.loop = true;
    bgmAudio.volume = 0.03; // Ultra-faint, gentle ambient whisper volume

    let candidateIdx = 0;
    bgmAudio.addEventListener("error", () => {
      candidateIdx++;
      if (candidateIdx < audioSrcCandidates.length && bgmAudio) {
        bgmAudio.src = audioSrcCandidates[candidateIdx];
        if (isBgmPlaying) bgmAudio.play().catch(() => {});
      }
    });
  } catch {
    // Handled
  }

  const pixelContainer = document.getElementById("pixel-player-container");
  const pixelDragHandle = document.getElementById("pixel-player-drag-handle");
  const pixelBody = document.getElementById("pixel-player-body");
  const pixelBadge = document.getElementById("pixel-player-badge");
  const pixelMinimizeBtn = document.getElementById("pixel-player-minimize-btn");
  const pixelModeToggleBtn = document.getElementById("pixel-mode-toggle-btn");
  const pixelBtnPlay = document.getElementById("pixel-btn-play");
  const pixelBtnPrev = document.getElementById("pixel-btn-prev");
  const pixelBtnNext = document.getElementById("pixel-btn-next");
  const pixelGlyphPlay = document.getElementById("pixel-glyph-play");
  const pixelGlyphPause = document.getElementById("pixel-glyph-pause");
  const pixelTrackTitle = document.getElementById("pixel-track-title");
  const pixelTrackArtist = document.getElementById("pixel-track-artist");
  const pixelProgressLine = document.getElementById("pixel-progress-line");
  const pixelSpotifyDrawer = document.getElementById("pixel-spotify-drawer");
  const pixelSpotifyCloseDrawer = document.getElementById("pixel-spotify-close-drawer");
  const spotifyNavbarBtn = document.getElementById("spotify-bgm-toggle-btn");

  function updatePixelDisplay() {
    const track = HADES_TRACKS[currentTrackIdx];
    if (pixelTrackTitle) pixelTrackTitle.textContent = track.title;
    if (pixelTrackArtist) pixelTrackArtist.textContent = track.artist;
  }

  // Faint, soothing plucked string synthesis fallback
  function playPluckedString(freq: number) {
    if (!audioCtx) return;
    try {
      const now = audioCtx.currentTime;
      const osc = audioCtx.createOscillator();
      const gain = audioCtx.createGain();
      const filter = audioCtx.createBiquadFilter();

      osc.type = "sawtooth";
      osc.frequency.setValueAtTime(freq, now);

      filter.type = "lowpass";
      filter.frequency.setValueAtTime(1400, now);
      filter.frequency.exponentialRampToValueAtTime(250, now + 0.8);

      gain.gain.setValueAtTime(0.004, now);
      gain.gain.exponentialRampToValueAtTime(0.00001, now + 0.85);

      osc.connect(filter);
      filter.connect(gain);
      gain.connect(audioCtx.destination);

      osc.start(now);
      osc.stop(now + 0.9);
    } catch {
      // Handled
    }
  }

  function startProceduralBgm() {
    if (!audioCtx) {
      const AudioContextClass = window.AudioContext || (window as unknown as { webkitAudioContext: typeof AudioContext }).webkitAudioContext;
      if (AudioContextClass) audioCtx = new AudioContextClass();
    }
    if (audioCtx && audioCtx.state === "suspended") {
      audioCtx.resume();
    }

    try {
      if (!droneOsc && audioCtx) {
        const track = HADES_TRACKS[currentTrackIdx];
        droneOsc = audioCtx.createOscillator();
        droneGain = audioCtx.createGain();
        droneOsc.type = "triangle";
        droneOsc.frequency.setValueAtTime(track.drone, audioCtx.currentTime);
        droneGain.gain.setValueAtTime(0.0015, audioCtx.currentTime);
        droneOsc.connect(droneGain);
        droneGain.connect(audioCtx.destination);
        droneOsc.start();
      }
    } catch {
      // Ignored
    }

    if (bgmInterval) clearInterval(bgmInterval);
    let noteStep = 0;
    bgmInterval = window.setInterval(() => {
      if (!isBgmPlaying) return;
      const track = HADES_TRACKS[currentTrackIdx];
      const scale = track.scale;
      const noteFreq = scale[noteStep % scale.length];
      playPluckedString(noteFreq);
      noteStep = (noteStep + 1 + (Math.random() > 0.75 ? 2 : 0)) % scale.length;
    }, 420);
  }

  function stopProceduralBgm() {
    if (bgmInterval) {
      clearInterval(bgmInterval);
      bgmInterval = null;
    }
    if (droneOsc) {
      try {
        droneOsc.stop();
        droneOsc.disconnect();
      } catch {
        // Disconnected
      }
      droneOsc = null;
      droneGain = null;
    }
  }

  function startBgmMusic() {
    // 1. Primary: Real Hades MP3 Audio Track (Ultra-faint whisper)
    if (bgmAudio) {
      bgmAudio.volume = 0.03;
      bgmAudio.play().catch(() => {
        // Fallback to procedural synthesis if browser autoplay policy blocks MP3
        startProceduralBgm();
      });
    } else {
      startProceduralBgm();
    }
  }

  function stopBgmMusic() {
    if (bgmAudio) {
      bgmAudio.pause();
    }
    stopProceduralBgm();
  }

  function toggleBgm() {
    isBgmPlaying = !isBgmPlaying;
    if (isBgmPlaying) {
      if (pixelGlyphPlay) pixelGlyphPlay.classList.add("hidden");
      if (pixelGlyphPause) pixelGlyphPause.classList.remove("hidden");
      if (pixelProgressLine) pixelProgressLine.classList.add("animate-pulse");
      if (spotifyNavbarBtn) {
        spotifyNavbarBtn.classList.add("border-emerald-400", "bg-emerald-500/20", "text-emerald-300");
      }
      startBgmMusic();
    } else {
      if (pixelGlyphPlay) pixelGlyphPlay.classList.remove("hidden");
      if (pixelGlyphPause) pixelGlyphPause.classList.add("hidden");
      if (pixelProgressLine) pixelProgressLine.classList.remove("animate-pulse");
      if (spotifyNavbarBtn) {
        spotifyNavbarBtn.classList.remove("border-emerald-400", "bg-emerald-500/20", "text-emerald-300");
      }
      stopBgmMusic();
    }
  }

  if (pixelBtnPlay) {
    pixelBtnPlay.addEventListener("click", toggleBgm);
  }

  if (pixelBtnNext) {
    pixelBtnNext.addEventListener("click", () => {
      currentTrackIdx = (currentTrackIdx + 1) % HADES_TRACKS.length;
      updatePixelDisplay();
      if (isBgmPlaying) {
        stopBgmMusic();
        startBgmMusic();
      }
    });
  }

  if (pixelBtnPrev) {
    pixelBtnPrev.addEventListener("click", () => {
      currentTrackIdx = (currentTrackIdx - 1 + HADES_TRACKS.length) % HADES_TRACKS.length;
      updatePixelDisplay();
      if (isBgmPlaying) {
        stopBgmMusic();
        startBgmMusic();
      }
    });
  }

  // --- Minimize / Maximise Handling ---
  if (pixelMinimizeBtn) {
    pixelMinimizeBtn.addEventListener("click", (e) => {
      e.stopPropagation();
      if (pixelBody) pixelBody.classList.add("hidden");
      if (pixelSpotifyDrawer) pixelSpotifyDrawer.classList.add("hidden");
      if (pixelDragHandle) pixelDragHandle.classList.add("hidden");
      if (pixelBadge) pixelBadge.classList.remove("hidden");
    });
  }

  if (pixelBadge) {
    pixelBadge.addEventListener("click", () => {
      if (pixelBody) pixelBody.classList.remove("hidden");
      if (pixelDragHandle) pixelDragHandle.classList.remove("hidden");
      if (pixelBadge) pixelBadge.classList.add("hidden");
    });
  }

  if (pixelModeToggleBtn) {
    pixelModeToggleBtn.addEventListener("click", (e) => {
      e.stopPropagation();
      if (pixelSpotifyDrawer) {
        pixelSpotifyDrawer.classList.toggle("hidden");
      }
    });
  }

  if (pixelSpotifyCloseDrawer) {
    pixelSpotifyCloseDrawer.addEventListener("click", () => {
      if (pixelSpotifyDrawer) pixelSpotifyDrawer.classList.add("hidden");
    });
  }

  if (spotifyNavbarBtn) {
    spotifyNavbarBtn.addEventListener("click", () => {
      if (!pixelContainer) return;
      if (pixelContainer.classList.contains("hidden")) {
        pixelContainer.classList.remove("hidden");
      }
      if (pixelBody && pixelBody.classList.contains("hidden")) {
        pixelBody.classList.remove("hidden");
        if (pixelDragHandle) pixelDragHandle.classList.remove("hidden");
        if (pixelBadge) pixelBadge.classList.add("hidden");
      } else {
        toggleBgm();
      }
    });
  }

  // --- Draggable Player Implementation ("move the player around") ---
  if (pixelContainer && pixelDragHandle) {
    let isDragging = false;
    let startX = 0;
    let startY = 0;
    let initialLeft = 0;
    let initialTop = 0;

    const onPointerDown = (clientX: number, clientY: number, target: EventTarget | null) => {
      // Don't drag if user clicked an interactive button inside the header
      if (target instanceof Element && (target.closest("button") || target.tagName === "BUTTON")) {
        return;
      }

      isDragging = true;
      startX = clientX;
      startY = clientY;

      const rect = pixelContainer.getBoundingClientRect();
      initialLeft = rect.left;
      initialTop = rect.top;

      // Lock positioning to left/top so bottom/right doesn't fight drag
      pixelContainer.style.bottom = "auto";
      pixelContainer.style.right = "auto";
      pixelContainer.style.left = `${initialLeft}px`;
      pixelContainer.style.top = `${initialTop}px`;
    };

    const onPointerMove = (clientX: number, clientY: number) => {
      if (!isDragging) return;
      const dx = clientX - startX;
      const dy = clientY - startY;

      const newLeft = Math.max(10, Math.min(window.innerWidth - pixelContainer.offsetWidth - 10, initialLeft + dx));
      const newTop = Math.max(10, Math.min(window.innerHeight - pixelContainer.offsetHeight - 10, initialTop + dy));

      pixelContainer.style.left = `${newLeft}px`;
      pixelContainer.style.top = `${newTop}px`;
    };

    const onPointerUp = () => {
      isDragging = false;
    };

    pixelDragHandle.addEventListener("mousedown", (e) => {
      onPointerDown(e.clientX, e.clientY, e.target);
    });

    window.addEventListener("mousemove", (e) => {
      onPointerMove(e.clientX, e.clientY);
    });

    window.addEventListener("mouseup", onPointerUp);

    // Touch support for mobile / tablets
    pixelDragHandle.addEventListener("touchstart", (e) => {
      if (e.touches.length > 0) {
        onPointerDown(e.touches[0].clientX, e.touches[0].clientY, e.target);
      }
    }, { passive: true });

    window.addEventListener("touchmove", (e) => {
      if (isDragging && e.touches.length > 0) {
        onPointerMove(e.touches[0].clientX, e.touches[0].clientY);
      }
    }, { passive: true });

    window.addEventListener("touchend", onPointerUp);
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

  // Canvas Sizing & Cached Vignette Gradient (Zero Allocation per Frame)
  let cachedVigGrad: CanvasGradient | null = null;
  function updateVignette() {
    if (!ctx || !canvas) return;
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
    cachedVigGrad = vig;
  }

  function resize() {
    if (!canvas || !canvas.parentElement) return;
    canvas.width = canvas.parentElement.clientWidth;
    canvas.height = Math.max(620, Math.min(window.innerHeight * 0.78, 800));
    updateVignette();
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
    [2, 0, 0, 1, 1, 0, 0, 1, 0, 1, 1, 0, 0, 0, 1, 0, 0, 1, 1, 0, 0, 2], // 6: South Salon Archways (corners opened)
    [2, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 2], // 7: Mid Concourse Walkway
    [2, 0, 0, 0, 1, 0, 0, 1, 0, 0, 0, 0, 0, 0, 1, 0, 0, 1, 0, 0, 0, 2], // 8: Wing Portal Colonnades
    [2, 0, 0, 0, 1, 0, 0, 1, 0, 0, 0, 0, 0, 0, 1, 0, 0, 1, 0, 0, 0, 2], // 9: Cyber & 3D Entry Corridors
    [2, 0, 0, 1, 1, 0, 0, 1, 0, 0, 0, 0, 0, 0, 1, 0, 0, 1, 1, 0, 0, 2], // 10: Gallery Headers (corners opened)
    [2, 0, 1, 0, 1, 0, 0, 1, 0, 0, 0, 0, 0, 0, 1, 0, 0, 1, 0, 0, 0, 2], // 11: Display Alcove Corridors (East wall opened)
    [2, 0, 0, 0, 1, 0, 1, 1, 0, 0, 0, 0, 0, 0, 1, 1, 0, 1, 0, 0, 0, 2], // 12: Digital & 3D Floor
    [2, 0, 1, 0, 1, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 1, 0, 0, 0, 2], // 13: Central Rotunda Upper Floor (East wall opened)
    [2, 0, 1, 1, 1, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 1, 1, 0, 0, 2], // 14: Central Rotunda Lower Floor (East wall opened)
    [2, 0, 1, 0, 1, 0, 0, 1, 0, 0, 0, 0, 0, 0, 1, 0, 0, 1, 0, 0, 0, 2], // 15: Cross Promenade Portals (East wall opened)
    [2, 0, 0, 0, 1, 0, 1, 1, 0, 0, 0, 0, 0, 0, 1, 1, 0, 1, 0, 0, 0, 2], // 16: South Wing Floor
    [2, 0, 1, 0, 1, 0, 0, 1, 0, 0, 0, 0, 0, 0, 1, 0, 0, 1, 0, 0, 0, 2], // 17: Lower Cyber & 3D Corridors (East wall opened)
    [2, 0, 0, 0, 1, 0, 0, 1, 0, 0, 0, 0, 0, 0, 1, 0, 0, 1, 0, 0, 0, 2], // 18: Pavilion End Portals (All bottom corners opened)
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
    img.decoding = "async";
    const cleanImg = art.image.startsWith("/") ? art.image.slice(1) : art.image;
    const isGhPages = window.location.pathname.startsWith("/init");
    const prefix = isGhPages ? "/init/" : (baseUrl ? `${baseUrl.replace(/\/$/, "")}/` : "/");
    const imgSrc = art.image.startsWith("http") ? art.image : `${prefix}${cleanImg}`;
    
    // Performance & RAM optimization:
    // Raw physical scans are 3000-4000px and decode into 30-45MB of RAM each.
    // The maze displays artworks at 24x30px on wall plaques.
    // Using the 640px WebP thumbnail slashes memory consumption from 300MB+ down to ~40MB!
    const baseName = cleanImg.replace(/^.*\//, "").replace(/\.[^/.]+$/, "");
    const webpSubPath = cleanImg.replace(/^assets\/images\/portfolio\//, "assets/images-processed/portfolio/").replace(/\/[^/]+$/, "");
    const thumbSrc = art.image.startsWith("http") ? art.image : `${prefix}${webpSubPath}/${baseName}-640.webp`;

    img.src = thumbSrc;
    img.onerror = () => {
      // Fallback to original image if 640px WebP is not directly matched
      if (img.src !== imgSrc) {
        img.src = imgSrc;
      } else if (!img.src.includes("../")) {
        img.src = `../${cleanImg}`;
      }
    };

    const wingName =
      cat === "digital"
        ? "Digital Art Studio"
        : cat === "blender"
        ? "3D Blender Pavilion"
        : "Physical Fine Art Wing";

    const spotPos = toIso(
      slot.col + (slot.face === "SE" ? 0.7 : 0),
      slot.row + (slot.face === "SW" ? 0.7 : 0)
    );

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
      spotX: spotPos.x,
      spotY: spotPos.y,
    });
  });

  // Add dedicated illuminated museum wing reserved mounts for empty exhibition space
  // (Shows upcoming display plinth without allowing bidding)
  const remainingBlenderSlots = BLENDER_SLOTS.slice(blendCount, blendCount + 2);
  remainingBlenderSlots.forEach((slot, i) => {
    const dummyImg = new Image();
    const spotPos = toIso(
      slot.col + (slot.face === "SE" ? 0.7 : 0),
      slot.row + (slot.face === "SW" ? 0.7 : 0)
    );
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
      spotX: spotPos.x,
      spotY: spotPos.y,
    });
  });

  // Performance: Build O(1) 2D Spatial Lookup Grid for mounted artworks
  // (Eliminates 1.3M inner loop iterations per second)
  const paintingsGrid: (MountedPainting | null)[][] = Array.from({ length: ROWS }, () =>
    Array(COLS).fill(null)
  );
  mountedPaintings.forEach((p) => {
    if (p.row >= 0 && p.row < ROWS && p.col >= 0 && p.col < COLS) {
      paintingsGrid[p.row][p.col] = p;
    }
  });

  // List of active chaises for O(1) distance scanning
  const placedBenches: Array<{ col: number; row: number }> = [];

  // --- Dynamic Chair/Chaise Randomization Across Underworld Salons ---
  // Constraints:
  // 1. More random: dynamically scans all eligible floor tiles across all wings and shuffles on each visit.
  // 2. Distance: strictly AT LEAST 2 squares away from ANY art piece mount and its viewing tile.
  // 3. Hallways: requires floorNeighbors >= 2 so chaises never block corridors.
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

    // Place 9 well-spaced chaises across the museum
    placedBenches.length = 0;
    const placedChairs: [number, number][] = [];
    for (const [c, r] of eligibleTiles) {
      if (placedChairs.length >= 9) break;
      const tooClose = placedChairs.some(
        ([sc, sr]) => Math.hypot(sc - c, sr - r) < 2.8
      );
      if (!tooClose) {
        placedChairs.push([c, r]);
        placedBenches.push({ col: c, row: r });
        grid[r][c] = 3;
      }
    }
  }

  randomizeChairs(MAP, mountedPaintings);

  // --- Precomputed Coordinate Grid & Wall Rendering Metadata (Zero-Allocation Loop) ---
  const isoGrid: { x: number; y: number }[][] = [];
  for (let r = 0; r < ROWS; r++) {
    isoGrid[r] = [];
    for (let c = 0; c < COLS; c++) {
      isoGrid[r][c] = toIso(c, r);
    }
  }

  interface WallMeta {
    wallH: number;
    shadowCutH: number;
    hasSEFloor: boolean;
    hasSWFloor: boolean;
    hasNEFloor: boolean;
    hasNWFloor: boolean;
    fillSE1: string;
    fillSE2: string;
    baseboardColor: string;
    baseboardHighlight: string;
    fillSW1: string;
    fillSW2: string;
    baseboardSWColor: string;
    baseboardSWHighlight: string;
    topFill: string;
  }

  const isWallCell = (col: number, row: number) => {
    if (row < 0 || row >= ROWS || col < 0 || col >= COLS) return false;
    return MAP[row][col] === 1 || MAP[row][col] === 2;
  };

  const wallMetaGrid: (WallMeta | null)[][] = [];
  for (let r = 0; r < ROWS; r++) {
    wallMetaGrid[r] = [];
    for (let c = 0; c < COLS; c++) {
      const cellType = MAP[r][c];
      if (cellType !== 1 && cellType !== 2) {
        wallMetaGrid[r][c] = null;
        continue;
      }
      const isGreen = cellType === 2;
      const wallH = getWallHeight(r, c);
      const shadowCutH = wallH * 0.35;
      const zone = getTileZone(c, r);

      wallMetaGrid[r][c] = {
        wallH,
        shadowCutH,
        hasSEFloor: !isWallCell(c + 1, r),
        hasSWFloor: !isWallCell(c, r + 1),
        hasNEFloor: !isWallCell(c, r - 1),
        hasNWFloor: !isWallCell(c - 1, r),
        fillSE1: isGreen ? "#163e30" : zone === "digital" ? "#3a2d45" : zone === "blender" ? "#422e20" : zone === "nexus" ? "#382430" : "#1f4738",
        fillSE2: isGreen ? "#0f2c22" : zone === "digital" ? "#281e31" : zone === "blender" ? "#2d1f16" : zone === "nexus" ? "#271822" : "#153327",
        baseboardColor: isGreen ? "#040e0a" : zone === "digital" ? "#500720" : zone === "blender" ? "#451a03" : zone === "nexus" ? "#540625" : "#064e3b",
        baseboardHighlight: isGreen ? "#34d399" : zone === "digital" ? "#f43f5e" : zone === "blender" ? "#fb923c" : "#fbbf24",
        fillSW1: isGreen ? "#123327" : zone === "digital" ? "#2f2238" : zone === "blender" ? "#352318" : zone === "nexus" ? "#2d1c27" : "#183b2d",
        fillSW2: isGreen ? "#0b2119" : zone === "digital" ? "#1d1424" : zone === "blender" ? "#22150e" : zone === "nexus" ? "#1d101a" : "#10271d",
        baseboardSWColor: isGreen ? "#030a07" : zone === "digital" ? "#3b0717" : zone === "blender" ? "#351403" : zone === "nexus" ? "#3d061c" : "#04372a",
        baseboardSWHighlight: isGreen ? "rgba(52, 211, 153, 0.70)" : zone === "digital" ? "#e11d48" : zone === "blender" ? "#f97316" : "#f59e0b",
        topFill: isGreen ? "#1f5642" : zone === "digital" ? "#4e3a5c" : zone === "blender" ? "#553a27" : zone === "nexus" ? "#4a3141" : "#295b47",
      };
    }
  }

  // --- Pre-rendered Cached Floor Canvas (Performance: Eliminates 1,280+ canvas path operations per frame) ---
  const cachedFloorCanvas = document.createElement("canvas");
  let isFloorCached = false;
  const FLOOR_ORIGIN_X = 850;
  const FLOOR_ORIGIN_Y = 60;
  const FLOOR_CACHE_W = 1700;
  const FLOOR_CACHE_H = 920;

  function buildFloorCache() {
    cachedFloorCanvas.width = FLOOR_CACHE_W;
    cachedFloorCanvas.height = FLOOR_CACHE_H;
    const fctx = cachedFloorCanvas.getContext("2d");
    if (!fctx) return;

    fctx.save();
    fctx.translate(FLOOR_ORIGIN_X, FLOOR_ORIGIN_Y);

    // 1. Draw all multi-wing parquet floor tiles
    for (let r = 0; r < ROWS; r++) {
      for (let c = 0; c < COLS; c++) {
        if (MAP[r][c] === 0 || MAP[r][c] === 3) {
          const pt = isoGrid[r][c];
          const zone = getTileZone(c, r);

          fctx.beginPath();
          fctx.moveTo(pt.x, pt.y);
          fctx.lineTo(pt.x + TILE_W / 2, pt.y + TILE_H / 2);
          fctx.lineTo(pt.x, pt.y + TILE_H);
          fctx.lineTo(pt.x - TILE_W / 2, pt.y + TILE_H / 2);
          fctx.closePath();

          const isAlt = (r + c) % 2 === 0;

          if (zone === "digital") {
            fctx.fillStyle = isAlt ? "#120f14" : "#0a070c";
          } else if (zone === "blender") {
            fctx.fillStyle = isAlt ? "#17100b" : "#0d0805";
          } else if (zone === "nexus") {
            fctx.fillStyle = isAlt ? "#14080b" : "#090406";
          } else {
            fctx.fillStyle = isAlt ? "#091711" : "#050e0a";
          }
          fctx.fill();

          if (zone === "digital") {
            fctx.strokeStyle = "rgba(225, 29, 72, 0.28)";
          } else if (zone === "blender") {
            fctx.strokeStyle = "rgba(245, 158, 11, 0.25)";
          } else if (zone === "nexus") {
            fctx.strokeStyle = "rgba(251, 191, 36, 0.24)";
          } else {
            fctx.strokeStyle = "rgba(52, 211, 153, 0.22)";
          }
          fctx.lineWidth = 0.8;
          fctx.stroke();

          // Underworld Greek geometric interior engraving
          fctx.strokeStyle = "rgba(0, 0, 0, 0.55)";
          fctx.lineWidth = 0.6;
          fctx.beginPath();
          fctx.moveTo(pt.x - TILE_W / 4, pt.y + TILE_H / 4);
          fctx.lineTo(pt.x, pt.y + TILE_H / 2);
          fctx.lineTo(pt.x + TILE_W / 4, pt.y + (3 * TILE_H) / 4);
          fctx.moveTo(pt.x, pt.y);
          fctx.lineTo(pt.x + TILE_W / 4, pt.y + TILE_H / 4);
          fctx.lineTo(pt.x, pt.y + TILE_H / 2);
          fctx.stroke();

          // Realm ambient gloss sheen
          if (zone === "digital") {
            fctx.strokeStyle = "rgba(244, 63, 94, 0.10)";
          } else if (zone === "blender") {
            fctx.strokeStyle = "rgba(251, 191, 36, 0.10)";
          } else if (zone === "nexus") {
            fctx.strokeStyle = "rgba(244, 63, 94, 0.12)";
          } else {
            fctx.strokeStyle = "rgba(52, 211, 153, 0.10)";
          }
          fctx.lineWidth = 1;
          fctx.beginPath();
          fctx.moveTo(pt.x - TILE_W / 3, pt.y + TILE_H / 3);
          fctx.lineTo(pt.x + TILE_W / 3, pt.y + (2 * TILE_H) / 3);
          fctx.stroke();
        }
      }
    }

    // 2. Pre-bake all base art spotlights directly onto the floor
    mountedPaintings.forEach((piece) => {
      const spot = fctx.createRadialGradient(
        piece.spotX,
        piece.spotY + TILE_H / 2,
        3,
        piece.spotX,
        piece.spotY + TILE_H / 2,
        38
      );

      if (piece.category === "digital") {
        spot.addColorStop(0, "rgba(56, 189, 248, 0.32)");
        spot.addColorStop(0.5, "rgba(14, 165, 233, 0.12)");
        spot.addColorStop(1, "rgba(14, 165, 233, 0)");
      } else if (piece.category === "blender") {
        spot.addColorStop(0, "rgba(249, 115, 22, 0.36)");
        spot.addColorStop(0.5, "rgba(234, 88, 12, 0.12)");
        spot.addColorStop(1, "rgba(234, 88, 12, 0)");
      } else {
        spot.addColorStop(0, "rgba(251, 191, 36, 0.26)");
        spot.addColorStop(0.5, "rgba(245, 158, 11, 0.09)");
        spot.addColorStop(1, "rgba(245, 158, 11, 0)");
      }

      fctx.fillStyle = spot;
      fctx.beginPath();
      fctx.ellipse(
        piece.spotX,
        piece.spotY + TILE_H / 2,
        36,
        18,
        0,
        0,
        Math.PI * 2
      );
      fctx.fill();
    });

    fctx.restore();
    isFloorCached = true;
  }

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
  for (let i = 0; i < 24; i++) {
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

  // --- Pre-rendered Cached Minimap Canvas (Performance: Eliminates 2,100+ fillRects per frame) ---
  const cachedMinimap = document.createElement("canvas");
  let isMinimapCached = false;
  let minimapCellW = 160 / COLS;
  let minimapCellH = 160 / ROWS;

  function buildMinimapCache() {
    if (!minimapCanvas) return;
    const targetW = minimapCanvas.width || 160;
    const targetH = minimapCanvas.height || 160;
    cachedMinimap.width = targetW;
    cachedMinimap.height = targetH;
    const cctx = cachedMinimap.getContext("2d");
    if (!cctx) return;

    const mw = targetW;
    const mh = targetH;
    minimapCellW = mw / COLS;
    minimapCellH = mh / ROWS;
    const cellW = minimapCellW;
    const cellH = minimapCellH;

    // Dark blueprint backdrop
    cctx.fillStyle = "#070c10";
    cctx.fillRect(0, 0, mw, mh);

    // Tinted floor areas and walls by wing
    for (let r = 0; r < ROWS; r++) {
      for (let c = 0; c < COLS; c++) {
        const zone = getTileZone(c, r);
        if (MAP[r][c] === 0 || MAP[r][c] === 3) {
          if (zone === "physical") cctx.fillStyle = "rgba(245, 158, 11, 0.20)";
          else if (zone === "digital") cctx.fillStyle = "rgba(56, 189, 248, 0.22)";
          else if (zone === "blender") cctx.fillStyle = "rgba(249, 115, 22, 0.22)";
          else cctx.fillStyle = "rgba(251, 191, 36, 0.12)";
          cctx.fillRect(c * cellW, r * cellH, cellW, cellH);
        } else if (MAP[r][c] === 1 || MAP[r][c] === 2) {
          if (zone === "digital") cctx.fillStyle = "rgba(186, 230, 253, 0.75)";
          else if (zone === "blender") cctx.fillStyle = "rgba(253, 186, 116, 0.75)";
          else cctx.fillStyle = "rgba(255, 255, 255, 0.65)";
          cctx.fillRect(c * cellW, r * cellH, cellW, cellH);
        }
      }
    }

    // Color-coded wing pins
    mountedPaintings.forEach((p) => {
      if (p.category === "digital") {
        cctx.fillStyle = "#38bdf8";
      } else if (p.category === "blender") {
        cctx.fillStyle = "#f97316";
      } else {
        cctx.fillStyle = "#f59e0b";
      }
      cctx.beginPath();
      cctx.arc((p.col + 0.5) * cellW, (p.row + 0.5) * cellH, 3.5, 0, Math.PI * 2);
      cctx.fill();
    });

    isMinimapCached = true;
  }

  // --- Visitor State & Smooth Velocity (Zagreus, Prince of the Underworld) ---
  const player = {
    col: 10.5,
    row: 20.5, // Spawns safely in the open Grand Entrance Foyer
    vx: 0,
    vy: 0,
    targetCol: null as number | null,
    targetRow: null as number | null,
    radius: 0.20, // Calibrated collision radius: allows effortless cornering and prevents wedging
    maxSpeed: 0.14, // Increased speed for swift, responsive navigation through the museum
    accel: 0.045,
    friction: 0.78,
    walkCycle: 0,
    distMoved: 0,
    isSitting: false,
    seatedBench: null as { col: number; row: number } | null,
    sitTicks: 0,
  };

  function getNearbyBench(pc: number, pr: number, maxDist = 1.4): { col: number; row: number } | null {
    let nearest: { col: number; row: number } | null = null;
    let minDist = maxDist;

    for (let i = 0; i < placedBenches.length; i++) {
      const b = placedBenches[i];
      const d = Math.hypot(pc - (b.col + 0.5), pr - (b.row + 0.5));
      if (d < minDist) {
        minDist = d;
        nearest = b;
      }
    }
    return nearest;
  }

  function standUp(moveDirection?: { dc: number; dr: number }) {
    if (!player.isSitting) return;
    const b = player.seatedBench;
    player.isSitting = false;
    player.seatedBench = null;
    player.sitTicks = 0;

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

    // Arrow keys disabled for character movement
    if (["arrowup", "arrowdown", "arrowleft", "arrowright"].includes(k)) {
      return;
    }

    keys[k] = true;
    keys[c] = true;

    // Movement key stand-up check
    if (player.isSitting) {
      let dir: { dc: number; dr: number } | undefined;
      if (k === "w") dir = { dc: 0, dr: -1 };
      else if (k === "s") dir = { dc: 0, dr: 1 };
      else if (k === "a") dir = { dc: -1, dr: 0 };
      else if (k === "d") dir = { dc: 1, dr: 0 };

      if (dir || ["w", "a", "s", "d"].includes(k)) {
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

  // Camera coordinates (Spawn centered directly on player)
  const initialPlayerIso = toIso(player.col, player.row);
  const camera = {
    x: initialPlayerIso.x,
    y: initialPlayerIso.y,
  };

  function isWalkable(c: number, r: number, radius = 0.20): boolean {
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

    // Direct click on Underworld velvet chaise / bench?
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

    if (isWalkable(gridPos.col, gridPos.row, 0.15)) {
      player.targetCol = gridPos.col;
      player.targetRow = gridPos.row;
    } else {
      // If clicked point hit an elevated wall face or perimeter base, resolve to closest walkable floor tile
      let bestDist = 999;
      let bestC: number | null = null;
      let bestR: number | null = null;
      for (let dr = -1.5; dr <= 1.5; dr += 0.5) {
        for (let dc = -1.5; dc <= 1.5; dc += 0.5) {
          const testC = gridPos.col + dc;
          const testR = gridPos.row + dr;
          if (isWalkable(testC, testR, 0.15)) {
            const d = dc * dc + dr * dr;
            if (d < bestDist) {
              bestDist = d;
              bestC = testC;
              bestR = testR;
            }
          }
        }
      }
      if (bestC !== null && bestR !== null) {
        player.targetCol = bestC;
        player.targetRow = bestR;
      }
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
    const ledgerBalEl = document.getElementById("ledger-patron-balance");
    if (ledgerBalEl) ledgerBalEl.textContent = `${patronBalance.toLocaleString()} TKN`;
    localStorage.setItem("museum_patron_balance", patronBalance.toString());
  }
  updateHudBalance();

  // --- Museum Action Toast Notification (CSS-accelerated) ---
  let toastTimeout: number | null = null;
  function showToast(message: string, type: "obol" | "chaise" | "bid" = "obol") {
    const toastEl = document.getElementById("museum-toast");
    const textEl = document.getElementById("museum-toast-text");
    if (!toastEl || !textEl) return;

    textEl.textContent = message;
    toastEl.classList.remove("opacity-0", "translate-y-2");
    toastEl.classList.add("opacity-100", "translate-y-0");

    if (toastTimeout) clearTimeout(toastTimeout);
    toastTimeout = window.setTimeout(() => {
      toastEl.classList.remove("opacity-100", "translate-y-0");
      toastEl.classList.add("opacity-0", "translate-y-2");
    }, 2400);
  }

  // --- Underworld Stygian Obol Coin Pickups (Option 4 Gamified Economy) ---
  interface StygianObol {
    id: string;
    name: string;
    col: number;
    row: number;
    value: number;
    collected: boolean;
    phase: number;
    isoX: number;
    isoY: number;
  }

  const savedCollectedObols: string[] = (() => {
    try {
      const raw = localStorage.getItem("museum_collected_obols");
      return raw ? JSON.parse(raw) : [];
    } catch {
      return [];
    }
  })();

  // --- Dynamic Urn of Wealth ("Thick Gold Pot") Randomization Along Walls ---
  // Constraints:
  // 1. Strictly on walkable floor tiles (grid === 0).
  // 2. Never on the same place as anything else (no walls, no chaises/chairs, no painting viewing tiles, no spawn point).
  // 3. Tucked strictly against walls/corners.
  // 4. More randomized across all wings with minimum spacing between urns.
  function randomizeUrnsOfWealth(
    grid: number[][],
    paintings: MountedPainting[],
    benches: Array<{ col: number; row: number }>
  ): StygianObol[] {
    const candidateTiles: Array<{
      col: number;
      row: number;
      zone: WingZone;
      offC: number;
      offR: number;
    }> = [];

    for (let r = 1; r < ROWS - 1; r++) {
      for (let c = 1; c < COLS - 1; c++) {
        if (grid[r][c] !== 0) continue;
        // Never on player spawn or entrance foyer doorway
        if ((c === 10 || c === 11) && (r === 20 || r === 19)) continue;

        // Never on chaise/bench
        if (benches.some((b) => b.col === c && b.row === r)) continue;

        // Never on painting mount or viewing tile
        let nearPainting = false;
        for (let pi = 0; pi < paintings.length; pi++) {
          const p = paintings[pi];
          if (Math.hypot(c - p.col, r - p.row) < 1.3) {
            nearPainting = true;
            break;
          }
          const vc = p.face === "SE" ? p.col + 1 : p.col;
          const vr = p.face === "SW" ? p.row + 1 : p.row;
          if (Math.hypot(c - vc, r - vr) < 1.3) {
            nearPainting = true;
            break;
          }
        }
        if (nearPainting) continue;

        // Must be adjacent to at least one wall
        const wallN = r > 0 && grid[r - 1][c] >= 1 && grid[r - 1][c] !== 3;
        const wallS = r < ROWS - 1 && grid[r + 1][c] >= 1 && grid[r + 1][c] !== 3;
        const wallW = c > 0 && grid[r][c - 1] >= 1 && grid[r][c - 1] !== 3;
        const wallE = c < COLS - 1 && grid[r][c + 1] >= 1 && grid[r][c + 1] !== 3;

        if (!wallN && !wallS && !wallW && !wallE) continue;

        // Calculate offset to tuck urn snugly against the wall/corner
        let offC = 0.5;
        let offR = 0.5;
        if (wallN && wallW) {
          offC = 0.28;
          offR = 0.28;
        } else if (wallN && wallE) {
          offC = 0.72;
          offR = 0.28;
        } else if (wallS && wallW) {
          offC = 0.28;
          offR = 0.72;
        } else if (wallS && wallE) {
          offC = 0.72;
          offR = 0.72;
        } else if (wallN) {
          offR = 0.25;
        } else if (wallS) {
          offR = 0.75;
        } else if (wallW) {
          offC = 0.25;
        } else if (wallE) {
          offC = 0.75;
        }

        candidateTiles.push({
          col: c,
          row: r,
          zone: getTileZone(c, r),
          offC,
          offR,
        });
      }
    }

    // Shuffle candidates
    for (let i = candidateTiles.length - 1; i > 0; i--) {
      const j = Math.floor(Math.random() * (i + 1));
      [candidateTiles[i], candidateTiles[j]] = [candidateTiles[j], candidateTiles[i]];
    }

    // Group candidates by zone to guarantee balanced distribution across all wings
    const byZone: Record<WingZone, typeof candidateTiles> = {
      physical: [],
      digital: [],
      blender: [],
      nexus: [],
    };
    candidateTiles.forEach((tile) => byZone[tile.zone].push(tile));

    const chosen: typeof candidateTiles = [];
    const targetPerZone: Record<WingZone, number> = {
      physical: 6,
      digital: 6,
      blender: 5,
      nexus: 5,
    };

    // Pick well-spaced urns from each zone
    (Object.keys(targetPerZone) as WingZone[]).forEach((zone) => {
      let count = 0;
      for (let ci = 0; ci < byZone[zone].length; ci++) {
        const cand = byZone[zone][ci];
        if (count >= targetPerZone[zone]) break;
        const tooClose = chosen.some(
          (sc) => Math.hypot(sc.col - cand.col, sc.row - cand.row) < 2.4
        );
        if (!tooClose) {
          chosen.push(cand);
          count++;
        }
      }
    });

    const wingNames: Record<WingZone, string> = {
      physical: "Elysium Salon",
      digital: "Tartarus Studio",
      blender: "Asphodel Pavilion",
      nexus: "House of Hades",
    };

    const values = [75, 80, 90, 100, 120, 150];

    return chosen.map((t, idx) => {
      const finalCol = t.col + t.offC;
      const finalRow = t.row + t.offR;
      const pt = toIso(finalCol, finalRow);
      const val = values[idx % values.length];
      const id = `urn_${t.col}_${t.row}`;

      return {
        id,
        name: `Urn of Wealth • ${wingNames[t.zone]}`,
        col: finalCol,
        row: finalRow,
        value: val,
        collected: savedCollectedObols.includes(id),
        phase: idx * 0.72,
        isoX: pt.x,
        isoY: pt.y,
      };
    });
  }

  const obols: StygianObol[] = randomizeUrnsOfWealth(MAP, mountedPaintings, placedBenches);

  // Precomputed 2D lookup for Pass 3 depth sorting (Zero allocation during render)
  const obolGrid: (StygianObol | null)[][] = Array.from({ length: ROWS }, () =>
    Array.from({ length: COLS }, () => null)
  );
  obols.forEach((o) => {
    const r = Math.floor(o.row);
    const c = Math.floor(o.col);
    if (r >= 0 && r < ROWS && c >= 0 && c < COLS) {
      obolGrid[r][c] = o;
    }
  });

  let uncollectedObols = obols.filter((o) => !o.collected);

  function collectObol(ob: StygianObol) {
    if (ob.collected) return;
    ob.collected = true;
    uncollectedObols = obols.filter((o) => !o.collected);

    const collectedIds = obols.filter((o) => o.collected).map((o) => o.id);
    localStorage.setItem("museum_collected_obols", JSON.stringify(collectedIds));

    patronBalance += ob.value;
    updateHudBalance();
    playChime();
    showToast(`+${ob.value} TKN Claimed • ${ob.name}`, "obol");

    // Golden celebration sparks & shattered pottery shard embers
    for (let k = 0; k < 14; k++) {
      footstepEmbers.push({
        isoX: ob.isoX + (Math.random() - 0.5) * 18,
        isoY: ob.isoY + TILE_H / 2 - 12 + (Math.random() - 0.5) * 14,
        life: 1.0,
        maxLife: 42,
        size: 2.2 + Math.random() * 1.8,
      });
    }
  }

  const NPOINT_BIDS_URL = "https://api.npoint.io/8dcab2cb18f42e65e5b8";

  type NpointStore = Record<string, Record<string, { amount: number; time?: string }>>;
  let npointStore: NpointStore = {};

  function applyNpointStoreToLedger(store: NpointStore) {
    const artBidsMap: Record<string, Array<{ patron: string; amount: number; timestamp: string }>> = {};

    for (const [user, userBids] of Object.entries(store)) {
      if (!userBids || typeof userBids !== "object") continue;
      for (const [artKey, bidInfo] of Object.entries(userBids)) {
        if (!bidInfo || typeof bidInfo.amount !== "number") continue;
        let targetArtId = artKey;
        const foundArt = artworks.find(
          (a) =>
            a.id === artKey ||
            a.id.startsWith(artKey) ||
            artKey.startsWith(a.id) ||
            a.id.replace(/-(ink|color)$/, "") === artKey.replace(/-(ink|color)$/, "")
        );
        if (foundArt) {
          targetArtId = foundArt.id;
        }

        if (!artBidsMap[targetArtId]) {
          artBidsMap[targetArtId] = [];
        }
        artBidsMap[targetArtId].push({
          patron: user,
          amount: bidInfo.amount,
          timestamp: bidInfo.time || "",
        });
      }
    }

    for (const art of artworks) {
      const bids = artBidsMap[art.id] || [];
      bids.sort((a, b) => b.amount - a.amount);

      const startBid = art.starting_bid || 450;
      const highestBid = bids.length > 0 ? bids[0].amount : startBid;
      const leadPatron = bids.length > 0 ? bids[0].patron : "House Lot";

      ledgerData[art.id] = {
        title: art.title,
        starting_bid: startBid,
        highest_bid: highestBid,
        leading_patron: leadPatron,
        bids: bids,
      };
    }

    updateCatalogBids();
    renderLedgerTable();
  }

  async function loadBidsData() {
    try {
      const res = await fetch(`${NPOINT_BIDS_URL}?_t=${Date.now()}`);
      if (res.ok) {
        const data = await res.json();
        if (data && typeof data === "object") {
          npointStore = data;
          localStorage.setItem("museum_npoint_cache", JSON.stringify(npointStore));
          applyNpointStoreToLedger(npointStore);
          return;
        }
      }
    } catch (e) {
      console.warn("Could not fetch live bids from npoint, falling back", e);
    }

    const cached = localStorage.getItem("museum_npoint_cache");
    if (cached) {
      try {
        npointStore = JSON.parse(cached);
        applyNpointStoreToLedger(npointStore);
        return;
      } catch (e) {}
    }

    try {
      const bidsUrl = baseUrl ? `${baseUrl}/data/bids.json` : "/data/bids.json";
      const res = await fetch(bidsUrl);
      if (res.ok) {
        ledgerData = await res.json();
        updateCatalogBids();
        renderLedgerTable();
      }
    } catch (e) {}
  }
  loadBidsData();

  let currentLedgerFilter = "all";

  function renderLedgerTable() {
    const tbody = document.getElementById("ledger-table-body");
    if (!tbody) return;

    tbody.innerHTML = "";

    const isGhPages = window.location.pathname.startsWith("/init");
    const prefix = isGhPages ? "/init/" : (baseUrl ? `${baseUrl.replace(/\/$/, "")}/` : "/");

    let displayedCount = 0;

    artworks.forEach((art, idx) => {
      const ledger = ledgerData[art.id] || {
        starting_bid: art.starting_bid,
        highest_bid: art.starting_bid,
        leading_patron: "House Lot",
      };

      const isMine = ledger.leading_patron === currentPatronName && currentPatronName !== "Anonymous Patron";
      const cat = art.category || "physical";

      // Filter check
      if (currentLedgerFilter === "mine" && !isMine) return;
      if (currentLedgerFilter !== "all" && currentLedgerFilter !== "mine" && cat !== currentLedgerFilter) return;

      displayedCount++;

      const row = document.createElement("tr");
      row.className = `hover:bg-primary/10 transition-colors border-b border-white/5 ${isMine ? "bg-primary/15" : ""}`;

      const cleanImg = art.image.startsWith("/") ? art.image.slice(1) : art.image;
      const imgSrc = `${prefix}${cleanImg}`;

      const catBadge = cat === "digital" 
        ? '<span class="badge badge-xs sm:badge-sm badge-info font-mono">Digital</span>'
        : cat === "blender"
        ? '<span class="badge badge-xs sm:badge-sm badge-secondary font-mono">3D</span>'
        : '<span class="badge badge-xs sm:badge-sm badge-warning font-mono">Physical</span>';

      const patronBadge = isMine
        ? `<span class="badge badge-sm badge-primary font-bold">@${ledger.leading_patron} (You)</span>`
        : `<span class="font-mono text-xs opacity-80">@${ledger.leading_patron}</span>`;

      row.innerHTML = `
        <td class="font-mono text-xs text-primary font-bold">#${idx + 1}</td>
        <td>
          <div class="flex items-center gap-3">
            <div class="w-10 h-10 rounded-lg overflow-hidden bg-black/40 border border-white/10 shrink-0">
              <img src="${imgSrc}" onerror="this.src='../${cleanImg}'" alt="${art.title}" class="w-full h-full object-cover" />
            </div>
            <div>
              <div class="font-bold text-xs sm:text-sm text-white hover:text-primary cursor-pointer leading-tight" onclick="window.openInspectionModal('${art.id}')">${art.title}</div>
              <div class="text-[10px] opacity-60 truncate max-w-[200px] sm:max-w-xs">${art.medium}</div>
            </div>
          </div>
        </td>
        <td>${catBadge}</td>
        <td class="text-right font-mono text-xs opacity-70">${ledger.starting_bid.toLocaleString()} TKN</td>
        <td class="text-right font-mono text-xs sm:text-sm font-bold text-amber-300">${ledger.highest_bid.toLocaleString()} TKN</td>
        <td>${patronBadge}</td>
        <td class="text-center">
          <button class="btn btn-xs btn-primary font-bold px-3 shadow-md" onclick="window.openInspectionModal('${art.id}')">
            Bid
          </button>
        </td>
      `;

      tbody.appendChild(row);
    });

    if (displayedCount === 0) {
      const emptyRow = document.createElement("tr");
      emptyRow.innerHTML = `
        <td colspan="7" class="text-center py-8 opacity-60 text-xs font-mono">
          No lots match the current filter selection.
        </td>
      `;
      tbody.appendChild(emptyRow);
    }
  }

  function updateCatalogBids() {
    // 1. Update Catalog Cards
    document.querySelectorAll(".catalog-lead-bid").forEach((el) => {
      const artId = el.getAttribute("data-art-id");
      if (artId && ledgerData[artId]) {
        el.textContent = `${ledgerData[artId].highest_bid.toLocaleString()} TKN (@${ledgerData[artId].leading_patron})`;
      }
    });

    // 2. Compute Auction Metrics
    let totalVolume = 0;
    let myBidsCount = 0;
    let myTotalOffered = 0;

    artworks.forEach((art) => {
      const ledger = ledgerData[art.id] || {
        starting_bid: art.starting_bid,
        highest_bid: art.starting_bid,
        leading_patron: "House Lot",
      };
      totalVolume += ledger.highest_bid;
      if (ledger.leading_patron === currentPatronName && currentPatronName !== "Anonymous Patron") {
        myBidsCount++;
        myTotalOffered += ledger.highest_bid;
      }
    });

    const totalVolEl = document.getElementById("ledger-total-volume");
    const myCountEl = document.getElementById("ledger-my-bids-count");
    const myTotalEl = document.getElementById("ledger-my-total-offered");
    const patronBalEl = document.getElementById("ledger-patron-balance");
    const filterMineCountEl = document.getElementById("ledger-filter-mine-count");

    if (totalVolEl) totalVolEl.textContent = `${totalVolume.toLocaleString()} TKN`;
    if (myCountEl) myCountEl.textContent = `${myBidsCount} Lots`;
    if (myTotalEl) myTotalEl.textContent = `${myTotalOffered.toLocaleString()} TKN Committed`;
    if (patronBalEl) patronBalEl.textContent = `${patronBalance.toLocaleString()} TKN`;
    if (filterMineCountEl) filterMineCountEl.textContent = myBidsCount.toString();

    // 3. Render dynamic ledger table
    renderLedgerTable();
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
      const cleanImg = art.image.startsWith("/") ? art.image.slice(1) : art.image;
      const isGhPages = window.location.pathname.startsWith("/init");
      const prefix = isGhPages ? "/init/" : (baseUrl ? `${baseUrl.replace(/\/$/, "")}/` : "/");
      const baseName = cleanImg.replace(/^.*\//, "").replace(/\.[^/.]+$/, "");
      const webpSubPath = cleanImg.replace(/^assets\/images\/portfolio\//, "assets/images-processed/portfolio/").replace(/\/[^/]+$/, "");
      const webp1280 = `${prefix}${webpSubPath}/${baseName}-1280.webp`;
      imageEl.src = webp1280;
      imageEl.onerror = () => {
        imageEl.src = `${prefix}${cleanImg}`;
        imageEl.onerror = () => {
          imageEl.src = `../${cleanImg}`;
        };
      };
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

    const slipCard = document.getElementById("patron-bid-slip-card");
    if (slipCard) slipCard.classList.add("hidden");

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
    submitBidBtn.addEventListener("click", async () => {
      if (!activeModalArtId) return;

      const patronInput = document.getElementById("bid-patron-name") as HTMLInputElement | null;
      const amountInput = document.getElementById("bid-amount-input") as HTMLInputElement | null;
      const messageEl = document.getElementById("bid-message");

      const patron = patronInput?.value.trim() || "";
      const amount = parseInt(amountInput?.value || "0", 10);

      if (!patron) {
        if (messageEl) {
          messageEl.className =
            "text-xs text-center py-2 rounded-lg bg-error/20 text-error border border-error/30";
          messageEl.textContent = "Please enter your username!";
          messageEl.classList.remove("hidden");
        }
        return;
      }

      currentPatronName = patron;
      localStorage.setItem("museum_patron_name", patron);

      const ledger = ledgerData[activeModalArtId];
      if (!ledger || !messageEl) return;

      if (amount <= ledger.highest_bid) {
        messageEl.className =
          "text-xs text-center py-2 rounded-lg bg-error/20 text-error border border-error/30";
        messageEl.textContent = `Bid must exceed current top bid of ${ledger.highest_bid.toLocaleString()} TKN!`;
        messageEl.classList.remove("hidden");
        return;
      }

      if (amount > patronBalance) {
        messageEl.className =
          "text-xs text-center py-2 rounded-lg bg-warning/20 text-warning border border-warning/30";
        messageEl.textContent = `Insufficient patron tokens (${patronBalance.toLocaleString()} TKN available).`;
        messageEl.classList.remove("hidden");
        return;
      }

      patronBalance -= 50;
      updateHudBalance();

      const now = new Date();
      const timeStr = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, "0")}-${String(now.getDate()).padStart(2, "0")} ${String(now.getHours()).padStart(2, "0")}:${String(now.getMinutes()).padStart(2, "0")}`;

      // Optimistic in-memory update
      if (!npointStore[patron]) {
        npointStore[patron] = {};
      }
      npointStore[patron][activeModalArtId] = {
        amount: amount,
        time: timeStr,
      };
      localStorage.setItem("museum_npoint_cache", JSON.stringify(npointStore));
      applyNpointStoreToLedger(npointStore);

      const highBidEl = document.getElementById("modal-highest-bid");
      const leadingPatronEl = document.getElementById("modal-leading-patron");
      if (highBidEl) highBidEl.textContent = `${amount.toLocaleString()} TKN`;
      if (leadingPatronEl) leadingPatronEl.textContent = `@${patron}`;

      // Refresh modal bid history
      const historyContainer = document.getElementById("modal-bid-history");
      if (historyContainer) {
        historyContainer.innerHTML = "";
        const bids = ledgerData[activeModalArtId]?.bids || [];
        bids.forEach((b) => {
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

      messageEl.className =
        "text-xs text-center py-2 rounded-lg bg-success/20 text-success border border-success/30 font-semibold";
      messageEl.textContent = "Bid registered live! You are now the lead bidder for this piece!";
      messageEl.classList.remove("hidden");

      // Generate & Display Official Patron Bid Slip Card
      const hash = "HD-" + Math.random().toString(36).substring(2, 7).toUpperCase();
      const art = artworks.find((a) => a.id === activeModalArtId);
      const lotIdx = artworks.findIndex((a) => a.id === activeModalArtId);
      const lotNum = lotIdx >= 0 ? lotIdx + 1 : 1;

      const slipCard = document.getElementById("patron-bid-slip-card");
      const slipHash = document.getElementById("slip-hash");
      const slipAmount = document.getElementById("slip-amount");
      const slipPatron = document.getElementById("slip-patron");
      const slipEmailBtn = document.getElementById("slip-email-btn") as HTMLAnchorElement | null;
      const slipCopyBtn = document.getElementById("slip-copy-btn");

      if (slipHash) slipHash.textContent = `#${hash}`;
      if (slipAmount) slipAmount.textContent = `${amount.toLocaleString()} TKN`;
      if (slipPatron) slipPatron.textContent = `@${patron}`;

      if (slipEmailBtn && art) {
        const mailSubject = encodeURIComponent(`[Auction Bid] Lot #${lotNum} - ${art.title}`);
        const mailBody = encodeURIComponent(
          `Hello Aditi,\n\nI have placed an official gallery bid for "${art.title}" (Lot #${lotNum}).\n\n` +
          `• Bid Amount: ${amount.toLocaleString()} TKN\n` +
          `• Username: @${patron}\n` +
          `• Verification Hash: #${hash}\n` +
          `• Medium: ${art.medium}\n` +
          `• Date: ${timeStr}\n\n` +
          `Best regards,\n${patron}`
        );
        slipEmailBtn.href = `mailto:aditi061806@gmail.com?subject=${mailSubject}&body=${mailBody}`;
      }

      if (slipCopyBtn && art) {
        const slipText = `[OFFICIAL PATRON BID SLIP]\nArtwork: "${art.title}" (Lot #${lotNum})\nBid: ${amount.toLocaleString()} TKN\nUsername: @${patron}\nVerification: #${hash}\nDate: ${timeStr}`;
        slipCopyBtn.onclick = () => {
          navigator.clipboard.writeText(slipText).then(() => {
            const originalText = slipCopyBtn.textContent;
            slipCopyBtn.textContent = "✓ Copied to Clipboard!";
            setTimeout(() => {
              slipCopyBtn.textContent = originalText;
            }, 2200);
          });
        };
      }

      if (slipCard) slipCard.classList.remove("hidden");

      updateCatalogBids();
      playChime();
      showToast(`Bid Registered! ${amount.toLocaleString()} TKN on Lot #${lotNum}`, "bid");

      // Asynchronously persist to npoint.io
      try {
        let remoteStore: NpointStore = { ...npointStore };
        try {
          const fetchRes = await fetch(`${NPOINT_BIDS_URL}?_t=${Date.now()}`);
          if (fetchRes.ok) {
            const remoteData = await fetchRes.json();
            if (remoteData && typeof remoteData === "object") {
              remoteStore = { ...remoteData, ...remoteStore };
            }
          }
        } catch (_) {}

        if (!remoteStore[patron]) remoteStore[patron] = {};
        remoteStore[patron][activeModalArtId] = { amount, time: timeStr };

        await fetch(NPOINT_BIDS_URL, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(remoteStore),
        });
      } catch (err) {
        console.error("Error updating live bids on npoint.io:", err);
      }
    });
  }

  // --- View Mode Toggle ---
  let currentViewMode: "maze" | "catalog" | "ledger" = "maze";
  const mazeViewEl = document.getElementById("museum-view");
  const catalogViewEl = document.getElementById("catalog-view");
  const ledgerViewEl = document.getElementById("ledger-view");
  const btnMaze = document.getElementById("view-mode-maze");
  const btnCatalog = document.getElementById("view-mode-catalog");
  const btnLedger = document.getElementById("view-mode-ledger");

  function setViewMode(mode: "maze" | "catalog" | "ledger") {
    currentViewMode = mode;
    if (mazeViewEl) mazeViewEl.classList.toggle("hidden", mode !== "maze");
    if (catalogViewEl) catalogViewEl.classList.toggle("hidden", mode !== "catalog");
    if (ledgerViewEl) ledgerViewEl.classList.toggle("hidden", mode !== "ledger");

    if (btnMaze) {
      btnMaze.className = mode === "maze"
        ? "btn btn-xs sm:btn-sm btn-primary rounded-lg join-item"
        : "btn btn-xs sm:btn-sm btn-ghost rounded-lg join-item";
    }
    if (btnCatalog) {
      btnCatalog.className = mode === "catalog"
        ? "btn btn-xs sm:btn-sm btn-primary rounded-lg join-item"
        : "btn btn-xs sm:btn-sm btn-ghost rounded-lg join-item";
    }
    if (btnLedger) {
      btnLedger.className = mode === "ledger"
        ? "btn btn-xs sm:btn-sm btn-primary rounded-lg join-item text-white"
        : "btn btn-xs sm:btn-sm btn-ghost rounded-lg join-item text-amber-300";
    }

    if (mode === "ledger") {
      updateCatalogBids();
    } else if (mode === "catalog") {
      // Ensure all catalog images resolve properly
      const isGhPages = window.location.pathname.startsWith("/init");
      const prefix = isGhPages ? "/init/" : (baseUrl ? `${baseUrl.replace(/\/$/, "")}/` : "/");
      document.querySelectorAll<HTMLImageElement>(".catalog-card img").forEach((img) => {
        const artId = img.getAttribute("data-art-id");
        if (artId) {
          const art = artworks.find((a) => a.id === artId);
          if (art && (!img.complete || img.naturalWidth === 0)) {
            const clean = art.image.startsWith("/") ? art.image.slice(1) : art.image;
            img.src = `${prefix}${clean}`;
          }
        }
      });
    }
  }

  btnMaze?.addEventListener("click", () => setViewMode("maze"));
  btnCatalog?.addEventListener("click", () => setViewMode("catalog"));
  btnLedger?.addEventListener("click", () => setViewMode("ledger"));

  // Ledger category filter buttons
  document.querySelectorAll(".ledger-filter-btn").forEach((btn) => {
    btn.addEventListener("click", () => {
      currentLedgerFilter = btn.getAttribute("data-filter") || "all";
      document.querySelectorAll(".ledger-filter-btn").forEach((b) => {
        b.classList.remove("btn-primary");
        b.classList.add("btn-outline");
      });
      btn.classList.add("btn-primary");
      btn.classList.remove("btn-outline");
      renderLedgerTable();
    });
  });

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
  const promptSubtitleEl = document.getElementById("prompt-subtitle");
  const promptActionBtn = document.getElementById("prompt-action-btn");
  const promptReservedBadge = document.getElementById("prompt-reserved-badge");
  const wingNameEl = document.getElementById("current-wing-name");
  const wingDotEl = document.getElementById("current-wing-dot");
  let currentRenderedZone = "";
  let currentPromptKey = "";

  // Page visibility listener: pause render loop & audio when user switches tabs (100% CPU/battery savings)
  let isPageVisible = !document.hidden;
  document.addEventListener("visibilitychange", () => {
    isPageVisible = !document.hidden;
    if (bgmAudio && isBgmPlaying) {
      if (document.hidden) {
        bgmAudio.pause();
      } else {
        bgmAudio.play().catch(() => {});
      }
    }
  });

  // --- Render Hades Golden Urn of Wealth ("THICK GOLD POT" from Hades) ---
  function drawHadesUrnOfWealth(
    c: CanvasRenderingContext2D,
    x: number,
    y: number,
    time: number,
    phase: number
  ) {
    // 1. Ground Contact Shadow (Resting snug flat against stone base)
    c.fillStyle = "rgba(0, 0, 0, 0.55)";
    c.beginPath();
    c.ellipse(x, y + 2.5, 11, 5, 0, 0, Math.PI * 2);
    c.fill();

    // 2. Divine Golden Underworld Radiance (Pulsing Ambient Glow)
    const pulse = 0.22 + Math.sin(time * 2.8 + phase) * 0.08;
    const aura = c.createRadialGradient(x, y - 13, 2, x, y - 13, 26);
    aura.addColorStop(0, `rgba(253, 224, 71, ${pulse})`);
    aura.addColorStop(0.55, `rgba(245, 158, 11, ${pulse * 0.45})`);
    aura.addColorStop(1, "rgba(245, 158, 11, 0)");
    c.fillStyle = aura;
    c.beginPath();
    c.arc(x, y - 13, 26, 0, Math.PI * 2);
    c.fill();

    // 3. Flared Golden Pedestal Base
    c.fillStyle = "#000000";
    c.beginPath();
    c.ellipse(x, y + 0.5, 8.5, 3.8, 0, 0, Math.PI * 2);
    c.fill();

    const baseGrad = c.createLinearGradient(x - 8, y, x + 8, y);
    baseGrad.addColorStop(0, "#fbbf24");
    baseGrad.addColorStop(0.5, "#d97706");
    baseGrad.addColorStop(1, "#78350f");
    c.fillStyle = baseGrad;
    c.beginPath();
    c.ellipse(x, y - 0.5, 7.5, 3.2, 0, 0, Math.PI * 2);
    c.fill();

    // 4. Curvaceous Voluptuous Amphora Pot Belly ("Thick Gold Pot")
    c.beginPath();
    c.moveTo(x - 4.5, y - 1);
    c.bezierCurveTo(x - 12, y - 7, x - 12.5, y - 16, x - 5.5, y - 22);
    c.lineTo(x + 5.5, y - 22);
    c.bezierCurveTo(x + 12.5, y - 16, x + 12, y - 7, x + 4.5, y - 1);
    c.closePath();

    // Master Hades comic black ink outline
    c.lineWidth = 2.4;
    c.strokeStyle = "#000000";
    c.stroke();

    // Rich Hades radiant gold gradient fill
    const bodyGrad = c.createLinearGradient(x - 12, y - 12, x + 12, y - 12);
    bodyGrad.addColorStop(0, "#fef08a");
    bodyGrad.addColorStop(0.25, "#fde047");
    bodyGrad.addColorStop(0.65, "#eab308");
    bodyGrad.addColorStop(0.9, "#b45309");
    bodyGrad.addColorStop(1, "#451a03");
    c.fillStyle = bodyGrad;
    c.fill();

    // Sharp Comic Shading: High-contrast shadow crescent on right flank
    c.save();
    c.clip();
    c.fillStyle = "rgba(0, 0, 0, 0.38)";
    c.beginPath();
    c.ellipse(x + 5, y - 12, 7.5, 12, 0, 0, Math.PI * 2);
    c.fill();

    // Vibrant Specular Highlight Sheen on Left Shoulder
    c.fillStyle = "rgba(255, 255, 255, 0.65)";
    c.beginPath();
    c.ellipse(x - 5.5, y - 15, 2.2, 5.5, -0.25, 0, Math.PI * 2);
    c.fill();
    c.restore();

    // 5. Lower Beaded Golden Ring
    c.strokeStyle = "#000000";
    c.lineWidth = 1.0;
    for (let b = -3; b <= 3; b++) {
      const bx = x + b * 2.8;
      const by = y - 7 + Math.abs(b) * 0.45;
      c.fillStyle = "#fef08a";
      c.beginPath();
      c.arc(bx, by, 1.4, 0, Math.PI * 2);
      c.fill();
      c.stroke();
    }

    // 6. Upper Beaded Golden Choker Collar
    for (let b = -2; b <= 2; b++) {
      const bx = x + b * 2.2;
      const by = y - 21;
      c.fillStyle = "#fef08a";
      c.beginPath();
      c.arc(bx, by, 1.2, 0, Math.PI * 2);
      c.fill();
      c.stroke();
    }

    // 7. Scalloped Golden Crown (Fluted Jagged Petal Rim)
    c.fillStyle = "#000000";
    c.beginPath();
    c.moveTo(x - 8, y - 22);
    c.lineTo(x - 8.5, y - 27.5);
    c.lineTo(x - 5, y - 24.5);
    c.lineTo(x - 3, y - 28.5);
    c.lineTo(x, y - 25);
    c.lineTo(x + 3, y - 28.5);
    c.lineTo(x + 5, y - 24.5);
    c.lineTo(x + 8.5, y - 27.5);
    c.lineTo(x + 8, y - 22);
    c.closePath();
    c.lineWidth = 2.0;
    c.strokeStyle = "#000000";
    c.stroke();

    const crownGrad = c.createLinearGradient(x - 8, y - 28, x + 8, y - 28);
    crownGrad.addColorStop(0, "#fde047");
    crownGrad.addColorStop(0.5, "#facc15");
    crownGrad.addColorStop(1, "#b45309");
    c.fillStyle = crownGrad;
    c.fill();

    // 8. Dark Interior Opening & Overflowing Stygian Gold Coins
    c.fillStyle = "#1a0f04";
    c.beginPath();
    c.ellipse(x, y - 23, 5.5, 2.2, 0, 0, Math.PI * 2);
    c.fill();

    // Overflowing golden coins inside mouth
    c.fillStyle = "#fef08a";
    c.beginPath();
    c.arc(x - 2, y - 23.5, 1.8, 0, Math.PI * 2);
    c.arc(x + 2, y - 23.5, 1.8, 0, Math.PI * 2);
    c.arc(x, y - 24.5, 2.0, 0, Math.PI * 2);
    c.fill();

    // 9. Rising Magical Sparkles / Wealth Embers
    const sp1Y = y - 28 - ((time * 18 + phase * 20) % 22);
    const sp1X = x + Math.sin(time * 3 + phase) * 6;
    const sp2Y = y - 28 - ((time * 15 + phase * 20 + 11) % 22);
    const sp2X = x + Math.cos(time * 2.6 + phase) * 5;

    c.fillStyle = "#ffffff";
    c.beginPath();
    c.arc(sp1X, sp1Y, 1.5, 0, Math.PI * 2);
    c.arc(sp2X, sp2Y, 1.2, 0, Math.PI * 2);
    c.fill();

    c.fillStyle = "rgba(253, 224, 71, 0.8)";
    c.beginPath();
    c.arc(sp1X, sp1Y, 2.8, 0, Math.PI * 2);
    c.arc(sp2X, sp2Y, 2.2, 0, Math.PI * 2);
    c.fill();
  }

  // Helper: Draw cel-shaded themed artwork or reserved exhibition display (Hoisted to eliminate GC churn)
  function drawArtworkCard(piece: MountedPainting, isNear: boolean) {
    const isDigital = piece.category === "digital";
    const isBlender = piece.category === "blender";

    // 1. Cel-Shaded Faceted Light Cones (Graphic Polygon Beams with Sharp Edges)
    ctx.fillStyle = isDigital
      ? "rgba(56, 189, 248, 0.16)"
      : isBlender
      ? "rgba(249, 115, 22, 0.18)"
      : "rgba(251, 191, 36, 0.16)";
    ctx.beginPath();
    ctx.moveTo(-7, -22);
    ctx.lineTo(7, -22);
    ctx.lineTo(24, 26);
    ctx.lineTo(-24, 26);
    ctx.closePath();
    ctx.fill();

    // Inner high-intensity core beam facet (classic toon light shaft)
    ctx.fillStyle = isDigital
      ? "rgba(224, 242, 254, 0.28)"
      : isBlender
      ? "rgba(255, 237, 213, 0.30)"
      : "rgba(254, 240, 138, 0.28)";
    ctx.beginPath();
    ctx.moveTo(-3.5, -22);
    ctx.lineTo(3.5, -22);
    ctx.lineTo(13, 26);
    ctx.lineTo(-13, 26);
    ctx.closePath();
    ctx.fill();

    // 2. Hard-Edged Comic Cast Shadow (Zero blur, crisp black offset)
    ctx.fillStyle = "rgba(0, 0, 0, 0.85)";
    ctx.fillRect(-14, -16, 33, 39);

    // 3. Cel-Shaded Outer Frame & Inset
    ctx.fillStyle = "#000000";
    ctx.fillRect(-17.5, -20.5, 35, 41);

    if (isDigital) {
      ctx.fillStyle = isNear ? "#38bdf8" : "#0284c7";
      ctx.fillRect(-16, -19, 32, 38);
      ctx.fillStyle = "#031326";
      ctx.fillRect(-14.5, -17.5, 29, 35);
    } else if (isBlender) {
      ctx.fillStyle = isNear ? "#fb923c" : "#ea580c";
      ctx.fillRect(-16, -19, 32, 38);
      ctx.fillStyle = "#1b0b04";
      ctx.fillRect(-14.5, -17.5, 29, 35);
    } else {
      ctx.fillStyle = isNear ? "#fbbf24" : "#d97706";
      ctx.fillRect(-16, -19, 32, 38);
      ctx.fillStyle = "#1c1103";
      ctx.fillRect(-14.5, -17.5, 29, 35);
    }

    // 4. Artwork Canvas OR Reserved Exhibition Display
    if (piece.isReservedMount) {
      if (isDigital) {
        ctx.fillStyle = "#060911";
        ctx.fillRect(-12, -15, 24, 30);
        ctx.strokeStyle = "#000000";
        ctx.lineWidth = 1.2;
        ctx.strokeRect(-12, -15, 24, 30);

        ctx.strokeStyle = "#38bdf8";
        ctx.lineWidth = 1.4;
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
        ctx.fillStyle = "#0d0906";
        ctx.fillRect(-12, -15, 24, 30);
        ctx.strokeStyle = "#000000";
        ctx.lineWidth = 1.2;
        ctx.strokeRect(-12, -15, 24, 30);

        ctx.strokeStyle = "#f97316";
        ctx.lineWidth = 1.4;
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
      ctx.strokeStyle = "#000000";
      ctx.lineWidth = 1.2;
      ctx.strokeRect(-12, -15, 24, 30);
    }

    // 5. Cel-Shaded Overhead Picture Lamp Fixture
    ctx.fillStyle = "#000000";
    ctx.fillRect(-11, -26.5, 22, 5.5);
    if (isDigital) {
      ctx.fillStyle = "#0284c7";
      ctx.fillRect(-10, -25.5, 20, 3.5);
      ctx.fillStyle = isNear ? "#ffffff" : "#38bdf8";
      ctx.fillRect(-7, -25, 14, 2.0);
    } else if (isBlender) {
      ctx.fillStyle = "#c2410c";
      ctx.fillRect(-10, -25.5, 20, 3.5);
      ctx.fillStyle = isNear ? "#ffffff" : "#fb923c";
      ctx.fillRect(-7, -25, 14, 2.0);
    } else {
      ctx.fillStyle = "#b45309";
      ctx.fillRect(-10, -25.5, 20, 3.5);
      ctx.fillStyle = isNear ? "#ffffff" : "#fbbf24";
      ctx.fillRect(-7, -25, 14, 2.0);
    }

    // 6. Cel-Shaded Identification Placard
    ctx.fillStyle = "#000000";
    ctx.fillRect(-12, 19, 24, 7.5);
    if (isDigital) {
      ctx.fillStyle = "#081525";
      ctx.fillRect(-11, 20, 22, 5.5);
      ctx.strokeStyle = "#38bdf8";
      ctx.lineWidth = 1.0;
      ctx.strokeRect(-11, 20, 22, 5.5);
      ctx.fillStyle = "#38bdf8";
      ctx.font = "bold 4px sans-serif";
      ctx.textAlign = "center";
      ctx.textBaseline = "middle";
      ctx.fillText(piece.isReservedMount ? "DIGITAL WING" : `LOT #${piece.lotNum}`, 0, 22.5);
    } else if (isBlender) {
      ctx.fillStyle = "#150904";
      ctx.fillRect(-11, 20, 22, 5.5);
      ctx.strokeStyle = "#ea580c";
      ctx.lineWidth = 1.0;
      ctx.strokeRect(-11, 20, 22, 5.5);
      ctx.fillStyle = "#fb923c";
      ctx.font = "bold 4px sans-serif";
      ctx.textAlign = "center";
      ctx.textBaseline = "middle";
      ctx.fillText(piece.isReservedMount ? "BLENDER WING" : `LOT #${piece.lotNum}`, 0, 22.5);
    } else {
      ctx.fillStyle = "#150e04";
      ctx.fillRect(-11, 20, 22, 5.5);
      ctx.strokeStyle = "#d97706";
      ctx.lineWidth = 1.0;
      ctx.strokeRect(-11, 20, 22, 5.5);
      ctx.fillStyle = "#fbbf24";
      ctx.font = "bold 4px sans-serif";
      ctx.textAlign = "center";
      ctx.textBaseline = "middle";
      ctx.fillText(`LOT #${piece.lotNum}`, 0, 22.5);
    }
  }

  // Initial Camera Centering
  const startIso = toIso(player.col, player.row);
  camera.x = startIso.x;
  camera.y = startIso.y;

  // --- Main Animation Loop ---
  function animate() {
    // Performance: Sleep animation loop completely when user is viewing Catalog/Ledger or tab is inactive
    if (currentViewMode !== "maze" || !isPageVisible) {
      requestAnimationFrame(animate);
      return;
    }

    const time = performance.now() * 0.001;

    // 1. Natural Intuitive WASD Movement (Screen-Space & Corridor Aligned)
    // Converts keyboard inputs directly to screen directions so:
    // W = moves straight UP on screen
    // S = moves straight DOWN on screen
    // A = moves straight LEFT on screen
    // D = moves straight RIGHT on screen
    // W+D / W+A / S+D / S+A move smoothly along diagonal corridor axes!
    let targetVx = 0;
    let targetVy = 0;

    const up = keys["w"] || keys["keyw"];
    const down = keys["s"] || keys["keys"];
    const left = keys["a"] || keys["keya"];
    const right = keys["d"] || keys["keyd"];

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
      player.vx += (targetVx - player.vx) * 0.32;
      player.vy += (targetVy - player.vy) * 0.32;
    }

    // Apply movement with wall collision & smooth sliding
    if (!player.isSitting && (Math.abs(player.vx) > 0.001 || Math.abs(player.vy) > 0.001)) {
      player.walkCycle += 0.30;

      // Strict axis-separated collision resolution with corner sliding deflection
      const nextC = player.col + player.vx;
      if (isWalkable(nextC, player.row, player.radius)) {
        player.col = nextC;
      } else {
        // Corner slide along row if moving horizontally into a corner
        if (Math.abs(player.vy) < 0.001) {
          if (isWalkable(nextC, player.row + 0.06, player.radius)) player.row += 0.025;
          else if (isWalkable(nextC, player.row - 0.06, player.radius)) player.row -= 0.025;
        }
        player.vx = 0;
      }

      const nextR = player.row + player.vy;
      if (isWalkable(player.col, nextR, player.radius)) {
        player.row = nextR;
      } else {
        // Corner slide along col if moving vertically into a corner
        if (Math.abs(player.vx) < 0.001) {
          if (isWalkable(player.col + 0.06, nextR, player.radius)) player.col += 0.025;
          else if (isWalkable(player.col - 0.06, nextR, player.radius)) player.col -= 0.025;
        }
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

      // Check collision with uncollected Stygian Urns of Wealth (Zero allocation check)
      for (let i = 0; i < uncollectedObols.length; i++) {
        const ob = uncollectedObols[i];
        const dCol = ob.col - player.col;
        const dRow = ob.row - player.row;
        if (dCol * dCol + dRow * dRow < 0.65) {
          collectObol(ob);
          break;
        }
      }

      player.distMoved += Math.hypot(player.vx, player.vy);
      if (player.distMoved > 0.5) {
        player.distMoved = 0;
        playStep();
      }
    }

    // Restorative soul particles & chaise resting bonus
    if (player.isSitting) {
      player.sitTicks = (player.sitTicks || 0) + 1;
      if (player.sitTicks >= 210) {
        player.sitTicks = 0;
        patronBalance += 15;
        updateHudBalance();
        playChime();
        showToast("+15 TKN Restored • Velvet Chaise", "chaise");
      }

      if (Math.random() < 0.12) {
        const pIso = toIso(player.col, player.row);
        footstepEmbers.push({
          isoX: pIso.x + (Math.random() - 0.5) * 16,
          isoY: pIso.y + TILE_H / 2 - 18 - Math.random() * 12,
          life: 1.0,
          maxLife: 36,
          size: 1.6,
        });
      }
    } else {
      player.sitTicks = 0;
    }

    // 2. Camera smoothly centers on player
    const playerIso = toIso(player.col, player.row);
    camera.x += (playerIso.x - camera.x) * 0.11;
    camera.y += (playerIso.y - camera.y) * 0.11;

    // 3. Artwork & Bench Proximity Check & HUD Wing Indicator Update (House of Hades)
    const currentZone = getTileZone(Math.floor(player.col), Math.floor(player.row));
    if (wingNameEl && wingDotEl && currentZone !== currentRenderedZone) {
      currentRenderedZone = currentZone;
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

    // Dynamic prompt key generation (eliminates 60 FPS DOM thrashing and layout recalcs)
    const promptKey = player.isSitting
      ? `sitting_${Math.ceil((210 - (player.sitTicks || 0)) / 60)}`
      : near
      ? `art_${near.artId}`
      : nearBench
      ? "bench"
      : "none";

    if (promptKey !== currentPromptKey) {
      currentPromptKey = promptKey;

      if (player.isSitting && promptEl && promptTitleEl) {
        promptTitleEl.textContent = "Imperial Velvet Chaise • House of Hades";
        if (promptSubtitleEl) {
          const secsLeft = Math.ceil((210 - (player.sitTicks || 0)) / 60);
          promptSubtitleEl.textContent = `Resting (+15 TKN in ${secsLeft}s) • Press [E], [WASD] or Click to Stand`;
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
            const lead = ledgerData[near.artId];
            if (lead && lead.highest_bid > 0) {
              promptSubtitleEl.textContent = `Top Offer: ${lead.highest_bid.toLocaleString()} TKN (@${lead.leading_patron}) • Press [E] to Bid`;
            } else {
              promptSubtitleEl.textContent = `${near.wingName || "Underworld Gallery"} • Reserve: ${(lead?.starting_bid || 500).toLocaleString()} TKN • Press [E] to Bid`;
            }
            promptSubtitleEl.className = "text-[10px] text-amber-400 uppercase font-bold tracking-wider";
          }
          if (promptActionBtn) {
            promptActionBtn.textContent = "Inspect & Bid [E]";
            promptActionBtn.classList.remove("hidden");
          }
          if (promptReservedBadge) promptReservedBadge.classList.add("hidden");
        }
        promptEl.classList.remove("opacity-0", "translate-y-4", "scale-95");
        promptEl.classList.add("opacity-100", "translate-y-0", "scale-100");
      } else if (nearBench && promptEl && promptTitleEl) {
        promptTitleEl.textContent = "Imperial Velvet Chaise";
        if (promptSubtitleEl) {
          promptSubtitleEl.textContent = "Resting Sanctuary • Restores +15 TKN over time • Press [E] to Sit";
          promptSubtitleEl.className = "text-[10px] text-amber-300 uppercase font-bold tracking-wider";
        }
        if (promptActionBtn) {
          promptActionBtn.textContent = "Rest? [E]";
          promptActionBtn.classList.remove("hidden");
        }
        if (promptReservedBadge) promptReservedBadge.classList.add("hidden");
        promptEl.classList.remove("opacity-0", "translate-y-4", "scale-95");
        promptEl.classList.add("opacity-100", "translate-y-0", "scale-100");
      } else if (promptEl) {
        promptEl.classList.add("opacity-0", "translate-y-4", "scale-95");
        promptEl.classList.remove("opacity-100", "translate-y-0", "scale-100");
      }
    }

    // --- CANVAS DRAWING ---
    ctx.clearRect(0, 0, canvas.width, canvas.height);

    // Pure Solid Black Background (as requested: "make the background black")
    ctx.fillStyle = "#000000";
    ctx.fillRect(0, 0, canvas.width, canvas.height);

    ctx.save();
    ctx.translate(canvas.width / 2 - camera.x, canvas.height / 2 - camera.y);

    // --- Performance Optimization: Viewport Frustum Culling ---
    // Only process & draw tiles within the camera viewport (eliminates 95% of render calls!)
    const halfW = canvas.width / 2;
    const halfH = canvas.height / 2;
    const cullMargin = 160;
    const minIsoX = camera.x - halfW - cullMargin;
    const maxIsoX = camera.x + halfW + cullMargin;
    const minIsoY = camera.y - halfH - cullMargin;
    const maxIsoY = camera.y + halfH + cullMargin;

    // --- Pass 1: Multi-Wing Themed Parquet Floors & Base Spotlights (Cached Blit) ---
    if (!isFloorCached) {
      buildFloorCache();
    }
    ctx.drawImage(cachedFloorCanvas, -FLOOR_ORIGIN_X, -FLOOR_ORIGIN_Y);

    // --- Pass 1.5: Zagreus Burning Footstep Embers (Fast Non-Allocating) ---
    for (let i = footstepEmbers.length - 1; i >= 0; i--) {
      const e = footstepEmbers[i];
      e.life -= 1 / e.maxLife;
      if (e.life <= 0) {
        footstepEmbers.splice(i, 1);
        continue;
      }
      ctx.fillStyle = `rgba(249, 115, 22, ${e.life * 0.75})`;
      ctx.beginPath();
      ctx.ellipse(e.isoX, e.isoY, e.size * 2, e.size, 0, 0, Math.PI * 2);
      ctx.fill();
    }

    // --- Pass 2: Active Dynamic Art Spotlight (Single active spotlight when near artwork) ---
    if (near && near.artId) {
      const spot = ctx.createRadialGradient(
        near.spotX,
        near.spotY + TILE_H / 2,
        3,
        near.spotX,
        near.spotY + TILE_H / 2,
        54
      );
      if (near.category === "digital") {
        spot.addColorStop(0, "rgba(56, 189, 248, 0.60)");
        spot.addColorStop(0.5, "rgba(14, 165, 233, 0.24)");
        spot.addColorStop(1, "rgba(14, 165, 233, 0)");
      } else if (near.category === "blender") {
        spot.addColorStop(0, "rgba(249, 115, 22, 0.65)");
        spot.addColorStop(0.5, "rgba(234, 88, 12, 0.26)");
        spot.addColorStop(1, "rgba(234, 88, 12, 0)");
      } else {
        spot.addColorStop(0, "rgba(254, 240, 138, 0.48)");
        spot.addColorStop(0.5, "rgba(245, 158, 11, 0.20)");
        spot.addColorStop(1, "rgba(245, 158, 11, 0)");
      }
      ctx.fillStyle = spot;
      ctx.beginPath();
      ctx.ellipse(
        near.spotX,
        near.spotY + TILE_H / 2,
        50,
        25,
        0,
        0,
        Math.PI * 2
      );
      ctx.fill();
    }

    // --- Pass 3: Continuous Seamless Walls, Artworks, Benches & Visitor ---
    const maxDiag = COLS + ROWS;
    const playerDepth = Math.floor(player.col + player.row);

    for (let diag = 0; diag <= maxDiag; diag++) {
      for (let c = 0; c <= diag; c++) {
        const r = diag - c;
        if (r < 0 || r >= ROWS || c < 0 || c >= COLS) continue;

        const cellType = MAP[r][c];
        const isPlayerTile = diag === playerDepth && Math.floor(player.col) === c;
        const obol = obolGrid[r]?.[c];
        const hasActiveObol = obol && !obol.collected;

        // Skip empty floor tiles unless visitor or active obol is on this tile
        if (cellType === 0 && !isPlayerTile && !hasActiveObol) continue;

        const pt = isoGrid[r][c];

        // Frustum Cull: Skip off-screen walls, benches & obols
        if (
          !isPlayerTile &&
          (pt.x < minIsoX || pt.x > maxIsoX || pt.y < minIsoY - 170 || pt.y > maxIsoY + 50)
        ) {
          continue;
        }

        // 0. Render Hades Golden Urn of Wealth ("THICK GOLD POT" from Hades)
        if (hasActiveObol && obol) {
          drawHadesUrnOfWealth(ctx, obol.isoX, obol.isoY + TILE_H / 2, time, obol.phase);
        }

        // A. Continuous Architectural Walls
        if (cellType === 1 || cellType === 2) {
          const wm = wallMetaGrid[r][c];
          if (!wm) continue;
          const { wallH, shadowCutH, hasSEFloor, hasSWFloor, hasNEFloor, hasNWFloor } = wm;

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
            ctx.strokeStyle = "#000000";
            ctx.lineWidth = 2.0;

            ctx.beginPath();
            ctx.moveTo(pt.x, pt.y + TILE_H);
            ctx.lineTo(pt.x + TILE_W / 2, pt.y + TILE_H / 2);
            ctx.lineTo(pt.x + TILE_W / 2, pt.y + TILE_H / 2 - wallH);
            ctx.lineTo(pt.x, pt.y + TILE_H - wallH);
            ctx.closePath();

            ctx.fillStyle = wm.fillSE1;
            ctx.fill();
            ctx.stroke();

            ctx.beginPath();
            ctx.moveTo(pt.x, pt.y + TILE_H);
            ctx.lineTo(pt.x + TILE_W / 2, pt.y + TILE_H / 2);
            ctx.lineTo(pt.x + TILE_W / 2, pt.y + TILE_H / 2 - shadowCutH);
            ctx.lineTo(pt.x, pt.y + TILE_H - shadowCutH);
            ctx.closePath();
            ctx.fillStyle = wm.fillSE2;
            ctx.fill();

            ctx.strokeStyle = "rgba(0, 0, 0, 0.75)";
            ctx.lineWidth = 1.0;
            ctx.beginPath();
            ctx.moveTo(pt.x, pt.y + TILE_H - shadowCutH);
            ctx.lineTo(pt.x + TILE_W / 2, pt.y + TILE_H / 2 - shadowCutH);
            ctx.stroke();

            ctx.fillStyle = wm.baseboardColor;
            ctx.beginPath();
            ctx.moveTo(pt.x, pt.y + TILE_H);
            ctx.lineTo(pt.x + TILE_W / 2, pt.y + TILE_H / 2);
            ctx.lineTo(pt.x + TILE_W / 2, pt.y + TILE_H / 2 - 8);
            ctx.lineTo(pt.x, pt.y + TILE_H - 8);
            ctx.closePath();
            ctx.fill();
            ctx.strokeStyle = "#000000";
            ctx.lineWidth = 1.5;
            ctx.stroke();

            ctx.strokeStyle = wm.baseboardHighlight;
            ctx.lineWidth = 1.2;
            ctx.beginPath();
            ctx.moveTo(pt.x, pt.y + TILE_H - 8);
            ctx.lineTo(pt.x + TILE_W / 2, pt.y + TILE_H / 2 - 8);
            ctx.stroke();

            ctx.strokeStyle = "#fbbf24";
            ctx.lineWidth = 1.4;
            ctx.beginPath();
            ctx.moveTo(pt.x, pt.y + TILE_H - wallH);
            ctx.lineTo(pt.x + TILE_W / 2, pt.y + TILE_H / 2 - wallH);
            ctx.stroke();
          }

          // 2. South-West Facing Wall Face (Down-Left face, Shadowed)
          if (hasSWFloor) {
            ctx.strokeStyle = "#000000";
            ctx.lineWidth = 2.0;

            ctx.beginPath();
            ctx.moveTo(pt.x, pt.y + TILE_H);
            ctx.lineTo(pt.x - TILE_W / 2, pt.y + TILE_H / 2);
            ctx.lineTo(pt.x - TILE_W / 2, pt.y + TILE_H / 2 - wallH);
            ctx.lineTo(pt.x, pt.y + TILE_H - wallH);
            ctx.closePath();

            ctx.fillStyle = wm.fillSW1;
            ctx.fill();
            ctx.stroke();

            ctx.beginPath();
            ctx.moveTo(pt.x, pt.y + TILE_H);
            ctx.lineTo(pt.x - TILE_W / 2, pt.y + TILE_H / 2);
            ctx.lineTo(pt.x - TILE_W / 2, pt.y + TILE_H / 2 - shadowCutH);
            ctx.lineTo(pt.x, pt.y + TILE_H - shadowCutH);
            ctx.closePath();
            ctx.fillStyle = wm.fillSW2;
            ctx.fill();

            ctx.strokeStyle = "rgba(0, 0, 0, 0.75)";
            ctx.lineWidth = 1.0;
            ctx.beginPath();
            ctx.moveTo(pt.x, pt.y + TILE_H - shadowCutH);
            ctx.lineTo(pt.x - TILE_W / 2, pt.y + TILE_H / 2 - shadowCutH);
            ctx.stroke();

            ctx.fillStyle = wm.baseboardSWColor;
            ctx.beginPath();
            ctx.moveTo(pt.x, pt.y + TILE_H);
            ctx.lineTo(pt.x - TILE_W / 2, pt.y + TILE_H / 2);
            ctx.lineTo(pt.x - TILE_W / 2, pt.y + TILE_H / 2 - 8);
            ctx.lineTo(pt.x, pt.y + TILE_H - 8);
            ctx.closePath();
            ctx.fill();
            ctx.strokeStyle = "#000000";
            ctx.lineWidth = 1.5;
            ctx.stroke();

            ctx.strokeStyle = wm.baseboardSWHighlight;
            ctx.lineWidth = 1.2;
            ctx.beginPath();
            ctx.moveTo(pt.x, pt.y + TILE_H - 8);
            ctx.lineTo(pt.x - TILE_W / 2, pt.y + TILE_H / 2 - 8);
            ctx.stroke();

            ctx.strokeStyle = "#fbbf24";
            ctx.lineWidth = 1.4;
            ctx.beginPath();
            ctx.moveTo(pt.x, pt.y + TILE_H - wallH);
            ctx.lineTo(pt.x - TILE_W / 2, pt.y + TILE_H / 2 - wallH);
            ctx.stroke();
          }

          // 3. Cel-Shaded Continuous Wall Top Coping (Polished Obsidian & Stygian Gold)
          ctx.beginPath();
          ctx.moveTo(pt.x, pt.y - wallH);
          ctx.lineTo(pt.x + TILE_W / 2, pt.y + TILE_H / 2 - wallH);
          ctx.lineTo(pt.x, pt.y + TILE_H - wallH);
          ctx.lineTo(pt.x - TILE_W / 2, pt.y + TILE_H / 2 - wallH);
          ctx.closePath();
          ctx.fillStyle = wm.topFill;
          ctx.fill();

          ctx.strokeStyle = "#000000";
          ctx.lineWidth = 2.0;
          ctx.stroke();

          ctx.strokeStyle = "#fbbf24";
          ctx.lineWidth = 1.0;
          ctx.beginPath();
          if (hasNEFloor) {
            ctx.moveTo(pt.x, pt.y - wallH + 1);
            ctx.lineTo(pt.x + TILE_W / 2 - 1, pt.y + TILE_H / 2 - wallH + 0.5);
          }
          if (hasSEFloor) {
            ctx.moveTo(pt.x + TILE_W / 2 - 1, pt.y + TILE_H / 2 - wallH + 0.5);
            ctx.lineTo(pt.x, pt.y + TILE_H - wallH - 1);
          }
          if (hasSWFloor) {
            ctx.moveTo(pt.x, pt.y + TILE_H - wallH - 1);
            ctx.lineTo(pt.x - TILE_W / 2 + 1, pt.y + TILE_H / 2 - wallH + 0.5);
          }
          if (hasNWFloor) {
            ctx.moveTo(pt.x - TILE_W / 2 + 1, pt.y + TILE_H / 2 - wallH + 0.5);
            ctx.lineTo(pt.x, pt.y - wallH + 1);
          }
          ctx.stroke();

          // 4. Render Mounted Artwork on Feature Walls (O(1) Spatial Grid Lookup)
          const piece = paintingsGrid[r][c];
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
          // B. House of Hades Imperial Underworld Velvet Chaise (Cel-Shaded Comic Style)
          const isPlayerSittingHere = player.isSitting && player.seatedBench?.col === c && player.seatedBench?.row === r;

          // 1. Hard-Edged Comic Contact Shadow
          ctx.fillStyle = "rgba(0, 0, 0, 0.75)";
          ctx.beginPath();
          ctx.ellipse(pt.x, pt.y + TILE_H / 2 + 5, 24, 11, 0, 0, Math.PI * 2);
          ctx.fill();

          // 2. Chiseled Basalt & Obsidian Plinth (Solid Inked Facets)
          ctx.fillStyle = "#0c0a0e";
          ctx.beginPath();
          ctx.moveTo(pt.x, pt.y + TILE_H / 2 - 12);
          ctx.lineTo(pt.x + 21, pt.y + TILE_H / 2 - 2);
          ctx.lineTo(pt.x + 21, pt.y + TILE_H / 2 + 3);
          ctx.lineTo(pt.x, pt.y + TILE_H / 2 + 13);
          ctx.lineTo(pt.x - 21, pt.y + TILE_H / 2 + 3);
          ctx.lineTo(pt.x - 21, pt.y + TILE_H / 2 - 2);
          ctx.closePath();
          ctx.fill();

          // Crisp 2px Master Black Ink Outline
          ctx.strokeStyle = "#000000";
          ctx.lineWidth = 2.0;
          ctx.stroke();

          // 3. Stygian Gold Beveled Greek Trim
          ctx.strokeStyle = "#fbbf24";
          ctx.lineWidth = 1.2;
          ctx.beginPath();
          ctx.moveTo(pt.x - 20, pt.y + TILE_H / 2 + 1);
          ctx.lineTo(pt.x, pt.y + TILE_H / 2 + 11);
          ctx.lineTo(pt.x + 20, pt.y + TILE_H / 2 + 1);
          ctx.stroke();

          // Gilded bronze rivets / lion-paw feet accents with black ink rings
          [-18, 0, 18].forEach((rx) => {
            const ry = rx === 0 ? pt.y + TILE_H / 2 + 11 : pt.y + TILE_H / 2 + 2;
            ctx.fillStyle = "#000000";
            ctx.beginPath();
            ctx.arc(pt.x + rx, ry, 2.6, 0, Math.PI * 2);
            ctx.fill();
            ctx.fillStyle = "#fbbf24";
            ctx.beginPath();
            ctx.arc(pt.x + rx, ry, 1.8, 0, Math.PI * 2);
            ctx.fill();
          });

          // 4. Cel-Shaded Pomegranate Velvet Cushion
          // Lower Shadow Facet (Deep wine #881337)
          ctx.fillStyle = "#881337";
          ctx.beginPath();
          ctx.ellipse(pt.x, pt.y + TILE_H / 2 - 12, 21, 10.5, 0, 0, Math.PI * 2);
          ctx.fill();

          // Upper Lit Facet (Radiant Ruby Red #e11d48)
          ctx.fillStyle = "#e11d48";
          ctx.beginPath();
          ctx.ellipse(pt.x, pt.y + TILE_H / 2 - 15, 20.5, 9.5, 0, 0, Math.PI * 2);
          ctx.fill();

          // Master Black Ink Border around Cushion
          ctx.strokeStyle = "#000000";
          ctx.lineWidth = 1.8;
          ctx.beginPath();
          ctx.ellipse(pt.x, pt.y + TILE_H / 2 - 13.5, 21, 11, 0, 0, Math.PI * 2);
          ctx.stroke();

          // Gold Piping Rim Highlight
          ctx.strokeStyle = "#fbbf24";
          ctx.lineWidth = 1.0;
          ctx.beginPath();
          ctx.ellipse(pt.x, pt.y + TILE_H / 2 - 15, 19, 8.5, 0, 0, Math.PI * 2);
          ctx.stroke();

          // 5. Tufted Black Creases & Gold Buttons
          ctx.strokeStyle = "#000000";
          ctx.lineWidth = 1.2;
          ctx.beginPath();
          ctx.moveTo(pt.x - 12, pt.y + TILE_H / 2 - 15);
          ctx.lineTo(pt.x + 12, pt.y + TILE_H / 2 - 15);
          ctx.stroke();

          [-8, 0, 8].forEach((btnX) => {
            ctx.fillStyle = "#000000";
            ctx.beginPath();
            ctx.arc(pt.x + btnX, pt.y + TILE_H / 2 - 15, 2.0, 0, Math.PI * 2);
            ctx.fill();
            ctx.fillStyle = "#fde047";
            ctx.beginPath();
            ctx.arc(pt.x + btnX, pt.y + TILE_H / 2 - 15, 1.2, 0, Math.PI * 2);
            ctx.fill();
          });
        }

        // C. Render Visitor Avatar (Zagreus, Prince of the Underworld - Cel-Shaded)
        if (diag === playerDepth && Math.floor(player.col) === c) {
          const pIso = toIso(player.col, player.row);

          if (player.isSitting) {
            // Seated Posture (Zagreus relaxing in royal repose atop the velvet chaise)
            const sitY = pIso.y + TILE_H / 2 - 14;

            // Hard-edged Comic Drop Shadow
            ctx.fillStyle = "rgba(0, 0, 0, 0.75)";
            ctx.beginPath();
            ctx.ellipse(pIso.x, sitY + 2, 11, 4.5, 0, 0, Math.PI * 2);
            ctx.fill();

            // Legs draped down front with black ink outline
            ctx.fillStyle = "#000000";
            ctx.fillRect(pIso.x - 5.5, sitY + 1.5, 4.5, 8.5);
            ctx.fillRect(pIso.x + 0.5, sitY + 1.5, 4.5, 8.5);
            ctx.fillStyle = "#18181b";
            ctx.fillRect(pIso.x - 5, sitY + 2, 3.5, 7.5);
            ctx.fillRect(pIso.x + 1, sitY + 2, 3.5, 7.5);

            // Fiery Underworld Boots (Cel flame bands)
            ctx.fillStyle = "#000000";
            ctx.fillRect(pIso.x - 6.5, sitY + 7.5, 5.5, 4.5);
            ctx.fillRect(pIso.x + 0.5, sitY + 7.5, 5.5, 4.5);
            ctx.fillStyle = "#dc2626";
            ctx.fillRect(pIso.x - 6, sitY + 8, 4.5, 3.5);
            ctx.fillRect(pIso.x + 1, sitY + 8, 4.5, 3.5);
            ctx.fillStyle = "#f97316";
            ctx.fillRect(pIso.x - 5, sitY + 9, 3, 2);
            ctx.fillRect(pIso.x + 2, sitY + 9, 3, 2);
            ctx.fillStyle = "#fde047";
            ctx.fillRect(pIso.x - 4, sitY + 9.5, 1.5, 1.2);
            ctx.fillRect(pIso.x + 3, sitY + 9.5, 1.5, 1.2);

            // Torso (Dark Underworld Chiton with black ink contour)
            ctx.fillStyle = "#000000";
            ctx.fillRect(pIso.x - 7, sitY - 17, 14, 18);
            ctx.fillStyle = "#18181b";
            ctx.fillRect(pIso.x - 6, sitY - 16, 12, 16);

            // Crimson Royal Underworld Sash (Two-Tone Cel Facet)
            ctx.fillStyle = "#000000";
            ctx.beginPath();
            ctx.moveTo(pIso.x - 7, sitY - 17);
            ctx.lineTo(pIso.x + 7, sitY - 15);
            ctx.lineTo(pIso.x + 3, sitY + 2);
            ctx.lineTo(pIso.x - 6, sitY - 1);
            ctx.closePath();
            ctx.fill();

            ctx.fillStyle = "#dc2626";
            ctx.beginPath();
            ctx.moveTo(pIso.x - 6, sitY - 16);
            ctx.lineTo(pIso.x + 6, sitY - 14);
            ctx.lineTo(pIso.x + 2, sitY + 1);
            ctx.lineTo(pIso.x - 5, sitY - 2);
            ctx.closePath();
            ctx.fill();

            // Sash shadow fold facet
            ctx.fillStyle = "#881337";
            ctx.beginPath();
            ctx.moveTo(pIso.x - 1, sitY - 15);
            ctx.lineTo(pIso.x + 6, sitY - 14);
            ctx.lineTo(pIso.x + 2, sitY + 1);
            ctx.closePath();
            ctx.fill();

            // Golden Skull Brooch
            ctx.fillStyle = "#000000";
            ctx.beginPath();
            ctx.arc(pIso.x - 4, sitY - 13, 2.8, 0, Math.PI * 2);
            ctx.fill();
            ctx.fillStyle = "#fde047";
            ctx.beginPath();
            ctx.arc(pIso.x - 4, sitY - 13, 2.0, 0, Math.PI * 2);
            ctx.fill();

            // Head & Face with Inking & Two-Tone Skin
            ctx.fillStyle = "#000000";
            ctx.beginPath();
            ctx.arc(pIso.x, sitY - 21, 6.2, 0, Math.PI * 2);
            ctx.fill();

            // Base skin
            ctx.fillStyle = "#fde68a";
            ctx.beginPath();
            ctx.arc(pIso.x, sitY - 21, 5.2, 0, Math.PI * 2);
            ctx.fill();

            // Jaw/neck cel shadow
            ctx.fillStyle = "#f59e0b";
            ctx.beginPath();
            ctx.arc(pIso.x, sitY - 21, 5.2, 0.2 * Math.PI, 0.8 * Math.PI);
            ctx.closePath();
            ctx.fill();

            // Fiery Underworld Laurel Wreath (Sharp Cel Leaves)
            ctx.fillStyle = "#ef4444";
            ctx.beginPath();
            ctx.arc(pIso.x - 5, sitY - 23, 2.5, 0, Math.PI * 2);
            ctx.arc(pIso.x + 5, sitY - 23, 2.5, 0, Math.PI * 2);
            ctx.arc(pIso.x, sitY - 25, 2.8, 0, Math.PI * 2);
            ctx.fill();
            ctx.strokeStyle = "#000000";
            ctx.lineWidth = 1.0;
            ctx.stroke();

            // Spiky Raven Black Hair with Specular Cel Highlight
            ctx.fillStyle = "#050507";
            ctx.beginPath();
            ctx.arc(pIso.x, sitY - 22, 5.8, Math.PI, Math.PI * 2);
            ctx.fill();
            ctx.fillStyle = "#000000";
            // Manga hair spikes
            ctx.beginPath();
            ctx.moveTo(pIso.x - 4, sitY - 24);
            ctx.lineTo(pIso.x - 6, sitY - 28);
            ctx.lineTo(pIso.x - 2, sitY - 25);
            ctx.lineTo(pIso.x + 1, sitY - 29);
            ctx.lineTo(pIso.x + 3, sitY - 25);
            ctx.lineTo(pIso.x + 6, sitY - 27);
            ctx.lineTo(pIso.x + 4, sitY - 23);
            ctx.closePath();
            ctx.fill();

            // Floating Underworld Rest Indicator
            ctx.fillStyle = "rgba(251, 191, 36, 0.95)";
            ctx.font = "bold 9px serif";
            ctx.textAlign = "center";
            const floatOffset = Math.sin(Date.now() * 0.004) * 3;
            ctx.fillText("Resting", pIso.x, sitY - 32 + floatOffset);
          } else {
            // Standing / Walking Zagreus Avatar (Full Cel-Shaded)
            const bob = Math.sin(player.walkCycle) * 2.2;

            // 1. Hard-Edged Comic Drop Shadow
            ctx.fillStyle = "rgba(0, 0, 0, 0.75)";
            ctx.beginPath();
            ctx.ellipse(pIso.x, pIso.y + TILE_H / 2 + 1, 10, 4.5, 0, 0, Math.PI * 2);
            ctx.fill();

            // 2. THE GLOWING CIRCULAR UNDERWORLD AURA RING (Cel faceted)
            ctx.strokeStyle = "#000000";
            ctx.lineWidth = 3.2;
            ctx.beginPath();
            ctx.ellipse(pIso.x, pIso.y + TILE_H / 2, 26, 13, 0, 0, Math.PI * 2);
            ctx.stroke();

            ctx.strokeStyle = "#fbbf24";
            ctx.lineWidth = 1.8;
            ctx.beginPath();
            ctx.ellipse(pIso.x, pIso.y + TILE_H / 2, 26, 13, 0, 0, Math.PI * 2);
            ctx.stroke();

            // 3. Legs & Trousers with Black Comic Inking
            ctx.fillStyle = "#000000";
            ctx.fillRect(pIso.x - 4.8, pIso.y + TILE_H / 2 - 10.5 + bob, 4.2, 10.5);
            ctx.fillRect(pIso.x + 0.5, pIso.y + TILE_H / 2 - 10.5 - bob, 4.2, 10.5);
            ctx.fillStyle = "#18181b";
            ctx.fillRect(pIso.x - 4, pIso.y + TILE_H / 2 - 10 + bob, 3, 9.5);
            ctx.fillRect(pIso.x + 1, pIso.y + TILE_H / 2 - 10 - bob, 3, 9.5);

            // 4. Fiery Burning Boots (Cel flame bands)
            ctx.fillStyle = "#000000";
            ctx.fillRect(pIso.x - 5.8, pIso.y + TILE_H / 2 - 3.8 + bob, 5.2, 4.5);
            ctx.fillRect(pIso.x + 0.5, pIso.y + TILE_H / 2 - 3.8 - bob, 5.2, 4.5);
            ctx.fillStyle = "#dc2626";
            ctx.fillRect(pIso.x - 5, pIso.y + TILE_H / 2 - 3 + bob, 4, 3.5);
            ctx.fillRect(pIso.x + 1, pIso.y + TILE_H / 2 - 3 - bob, 4, 3.5);
            ctx.fillStyle = "#f97316";
            ctx.fillRect(pIso.x - 4, pIso.y + TILE_H / 2 - 2 + bob, 2.5, 2);
            ctx.fillRect(pIso.x + 2, pIso.y + TILE_H / 2 - 2 - bob, 2.5, 2);
            ctx.fillStyle = "#fde047";
            ctx.fillRect(pIso.x - 3.5, pIso.y + TILE_H / 2 - 1.5 + bob, 1.5, 1);
            ctx.fillRect(pIso.x + 2.5, pIso.y + TILE_H / 2 - 1.5 - bob, 1.5, 1);

            // 5. Charcoal Chiton/Tunic with Master Black Outline
            ctx.fillStyle = "#000000";
            ctx.fillRect(pIso.x - 7, pIso.y + TILE_H / 2 - 29 + bob, 15, 20);
            ctx.fillStyle = "#18181b";
            ctx.fillRect(pIso.x - 6, pIso.y + TILE_H / 2 - 28 + bob, 13, 18);

            // Shoulder highlight facet
            ctx.fillStyle = "#27272a";
            ctx.fillRect(pIso.x - 6, pIso.y + TILE_H / 2 - 28 + bob, 5, 6);

            // 6. Crimson Royal Underworld Sash (Two-Tone Cel Facet)
            ctx.fillStyle = "#000000";
            ctx.beginPath();
            ctx.moveTo(pIso.x - 7, pIso.y + TILE_H / 2 - 29 + bob);
            ctx.lineTo(pIso.x + 8, pIso.y + TILE_H / 2 - 26 + bob);
            ctx.lineTo(pIso.x + 5, pIso.y + TILE_H / 2 - 9 + bob);
            ctx.lineTo(pIso.x - 6, pIso.y + TILE_H / 2 - 11 + bob);
            ctx.closePath();
            ctx.fill();

            ctx.fillStyle = "#dc2626";
            ctx.beginPath();
            ctx.moveTo(pIso.x - 6, pIso.y + TILE_H / 2 - 28 + bob);
            ctx.lineTo(pIso.x + 7, pIso.y + TILE_H / 2 - 25 + bob);
            ctx.lineTo(pIso.x + 4, pIso.y + TILE_H / 2 - 10 + bob);
            ctx.lineTo(pIso.x - 5, pIso.y + TILE_H / 2 - 12 + bob);
            ctx.closePath();
            ctx.fill();

            // Sash shadow facet
            ctx.fillStyle = "#881337";
            ctx.beginPath();
            ctx.moveTo(pIso.x, pIso.y + TILE_H / 2 - 26 + bob);
            ctx.lineTo(pIso.x + 7, pIso.y + TILE_H / 2 - 25 + bob);
            ctx.lineTo(pIso.x + 4, pIso.y + TILE_H / 2 - 10 + bob);
            ctx.closePath();
            ctx.fill();

            // Golden Skull Brooch Clasp with Black Rim
            ctx.fillStyle = "#000000";
            ctx.beginPath();
            ctx.arc(pIso.x - 4, pIso.y + TILE_H / 2 - 24 + bob, 3.0, 0, Math.PI * 2);
            ctx.fill();
            ctx.fillStyle = "#fde047";
            ctx.beginPath();
            ctx.arc(pIso.x - 4, pIso.y + TILE_H / 2 - 24 + bob, 2.0, 0, Math.PI * 2);
            ctx.fill();

            // 7. Head & Face with Comic Inking & Two-Tone Shadow
            ctx.fillStyle = "#000000";
            ctx.beginPath();
            ctx.arc(pIso.x, pIso.y + TILE_H / 2 - 33 + bob, 6.8, 0, Math.PI * 2);
            ctx.fill();

            // Base skin tone
            ctx.fillStyle = "#fde68a";
            ctx.beginPath();
            ctx.arc(pIso.x, pIso.y + TILE_H / 2 - 33 + bob, 5.8, 0, Math.PI * 2);
            ctx.fill();

            // Jaw cel shadow
            ctx.fillStyle = "#f59e0b";
            ctx.beginPath();
            ctx.arc(pIso.x, pIso.y + TILE_H / 2 - 33 + bob, 5.8, 0.2 * Math.PI, 0.8 * Math.PI);
            ctx.closePath();
            ctx.fill();

            // Stylized eyes (sharp manga ink slits)
            ctx.fillStyle = "#000000";
            ctx.fillRect(pIso.x - 3.5, pIso.y + TILE_H / 2 - 34 + bob, 2.2, 1.2);
            ctx.fillRect(pIso.x + 1.2, pIso.y + TILE_H / 2 - 34 + bob, 2.2, 1.2);
            // Red Zagreus iris glint
            ctx.fillStyle = "#ef4444";
            ctx.fillRect(pIso.x - 2.8, pIso.y + TILE_H / 2 - 34 + bob, 1.0, 1.0);
            ctx.fillRect(pIso.x + 1.8, pIso.y + TILE_H / 2 - 34 + bob, 1.0, 1.0);

            // 8. Fiery Red Laurel Wreath
            ctx.fillStyle = "#ef4444";
            ctx.beginPath();
            ctx.arc(pIso.x - 5, pIso.y + TILE_H / 2 - 35 + bob, 2.8, 0, Math.PI * 2);
            ctx.arc(pIso.x + 5, pIso.y + TILE_H / 2 - 35 + bob, 2.8, 0, Math.PI * 2);
            ctx.arc(pIso.x, pIso.y + TILE_H / 2 - 37 + bob, 3.0, 0, Math.PI * 2);
            ctx.fill();
            ctx.strokeStyle = "#000000";
            ctx.lineWidth = 1.0;
            ctx.stroke();

            // 9. Spiky Raven Black Manga Hair
            ctx.fillStyle = "#050507";
            ctx.beginPath();
            ctx.arc(pIso.x, pIso.y + TILE_H / 2 - 35 + bob, 6.2, Math.PI, Math.PI * 2);
            ctx.fill();
            ctx.fillStyle = "#000000";
            ctx.beginPath();
            ctx.moveTo(pIso.x - 5, pIso.y + TILE_H / 2 - 36 + bob);
            ctx.lineTo(pIso.x - 7, pIso.y + TILE_H / 2 - 41 + bob);
            ctx.lineTo(pIso.x - 2, pIso.y + TILE_H / 2 - 38 + bob);
            ctx.lineTo(pIso.x + 1, pIso.y + TILE_H / 2 - 43 + bob);
            ctx.lineTo(pIso.x + 4, pIso.y + TILE_H / 2 - 38 + bob);
            ctx.lineTo(pIso.x + 7, pIso.y + TILE_H / 2 - 40 + bob);
            ctx.lineTo(pIso.x + 5, pIso.y + TILE_H / 2 - 35 + bob);
            ctx.closePath();
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

    // --- Pass 3.5: Floating Underworld Embers & Soul Motes (Fast Batched Draw) ---
    const hw = canvas.width / 2;
    const hh = canvas.height / 2;
    ctx.fillStyle = "rgba(251, 191, 36, 0.45)";
    ctx.beginPath();
    for (let i = 0; i < underworldMotes.length; i++) {
      const m = underworldMotes[i];
      m.y += m.vy;
      m.x += m.vx + Math.sin(m.wobble) * 0.35;
      m.wobble += 0.035;

      if (m.y < -hh - 60) m.y = hh + 60;
      if (m.y > hh + 60) m.y = -hh - 60;
      if (m.x < -hw - 60) m.x = hw + 60;
      if (m.x > hw + 60) m.x = -hw - 60;

      const px = m.x + hw;
      const py = m.y + hh;
      ctx.moveTo(px + m.size, py);
      ctx.arc(px, py, m.size, 0, Math.PI * 2);
    }
    ctx.fill();

    // --- Pass 4: Atmospheric Cinema Vignette (Zero-Allocation Cached Gradient) ---
    if (cachedVigGrad) {
      ctx.fillStyle = cachedVigGrad;
      ctx.fillRect(0, 0, canvas.width, canvas.height);
    }

    // --- Pass 5: Top-Left Blueprint Radar (Using Pre-rendered Offscreen Cache) ---
    if (minimapCtx && minimapCanvas) {
      if (!isMinimapCached) {
        buildMinimapCache();
      }
      minimapCtx.clearRect(0, 0, minimapCanvas.width, minimapCanvas.height);
      minimapCtx.drawImage(cachedMinimap, 0, 0);

      const px = player.col * minimapCellW;
      const py = player.row * minimapCellH;

      // Uncollected Stygian Obol radar pips (Radiant Neon Cyan Diamonds)
      if (uncollectedObols.length > 0) {
        for (let i = 0; i < uncollectedObols.length; i++) {
          const ob = uncollectedObols[i];
          const ox = ob.col * minimapCellW;
          const oy = ob.row * minimapCellH;
          // Outer neon cyan aura
          minimapCtx.fillStyle = "rgba(34, 211, 238, 0.45)";
          minimapCtx.beginPath();
          minimapCtx.arc(ox, oy, 3.6, 0, Math.PI * 2);
          minimapCtx.fill();
          // Crisp radiant diamond center
          minimapCtx.fillStyle = "#22d3ee";
          minimapCtx.beginPath();
          minimapCtx.arc(ox, oy, 2.0, 0, Math.PI * 2);
          minimapCtx.fill();
        }
      }

      // Visitor pulsing indicator
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

  animate();
}
