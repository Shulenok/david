(() => {
  "use strict";

  const canvas = document.getElementById("game");
  const ctx = canvas.getContext("2d");
  const scoreEl = document.getElementById("score");
  const bestEl = document.getElementById("best");
  const facesEl = document.getElementById("faces");
  const statusEl = document.getElementById("status");
  const boostBtn = document.getElementById("boost");
  const nitroBtn = document.getElementById("nitro");
  const stopBtn = document.getElementById("stop");
  const restartBtn = document.getElementById("restart");
  const appRootEl = document.getElementById("appRoot");
  const mainMenuEl = document.getElementById("mainMenu");
  const menuPlayBtn = document.getElementById("menuPlay");
  const menuSettingsBtn = document.getElementById("menuSettings");
  const menuShopBtn = document.getElementById("menuShop");
  const menuMainPanelEl = document.getElementById("menuMainPanel");
  const menuSettingsPanelEl = document.getElementById("menuSettingsPanel");
  const menuShopPanelEl = document.getElementById("menuShopPanel");
  const menuSettingsBackBtn = document.getElementById("menuSettingsBack");
  const menuShopBackBtn = document.getElementById("menuShopBack");
  const menuSoundOffBtn = document.getElementById("menuSoundOff");
  const menuSoundOnBtn = document.getElementById("menuSoundOn");
  const menuVideoWindowBtn = document.getElementById("menuVideoWindow");
  const menuVideoFullBtn = document.getElementById("menuVideoFull");
  const shopSkinBtn = document.getElementById("shopSkin");
  const shopTrailBtn = document.getElementById("shopTrail");
  const shopPackBtn = document.getElementById("shopPack");
  const menuHintEl = document.getElementById("menuHint");

  const WIDTH = 1280;
  const HEIGHT = 720;
  const GROUND_Y = 560;
  const BEST_KEY = "dino-best-v2";

  const PHYSICS = {
    jumpImpulse: 1200,
    gravity: 4300,
    fastFallGravity: 5600,
    maxFallSpeed: 2300,
  };
  const MAX_JUMPS = 2;
  const DOUBLE_JUMP_FACTOR = 0.92;

  const BASE_SPEED = 430;
  const MAX_SPEED = 1060;
  const ILYA_IMAGE_SRC = "./_source/ilja.png";
  const DAVID_IMAGE_SRC = "./_source/david.png";
  const FACE_IMAGE_SRC = "./_source/mellstroy-face.jpg";
  const MAXIMA_TEXT = "\u041c\u0410\u041a\u0421\u0418\u041c\u0410";
  const FART_BOOST = {
    minImpulse: 1800,
    maxImpulse: 2100,
    cooldown: 7.5,
  };
  const NEAR_MISS = {
    distance: 105,
    duration: 0.85,
    cooldown: 1.6,
    slowMo: 0.34,
  };
  const NITRO = {
    boost: 250,
    duration: 10,
    cooldown: 30,
  };
  const BRAKE = {
    duration: 0.55,
    cooldown: 0.9,
    speedFactor: 0.2,
  };
  const SAMPLE_SOUNDS = {
    jumpMain: "./_source/sfx/jump_main.ogg",
    jumpDouble: "./_source/sfx/jump_double.ogg",
    boostFunny: "./_source/sfx/boost_funny.ogg",
    nitroFunny: "./_source/sfx/nitro_funny.ogg",
    stopFunny: "./_source/sfx/stop_funny.ogg",
    scoreTick: "./_source/sfx/score_tick.ogg",
    faceJump: "./_source/sfx/face_jump.ogg",
    nearMiss: "./_source/sfx/near_miss.ogg",
    gameOver: "./_source/sfx/game_over.ogg",
    restart: "./_source/sfx/restart.ogg",
  };

  const ilyaImage = new Image();
  let ilyaImageReady = false;
  ilyaImage.addEventListener("load", () => {
    ilyaImageReady = true;
  });
  ilyaImage.addEventListener("error", () => {
    ilyaImageReady = false;
  });
  ilyaImage.src = ILYA_IMAGE_SRC;

  const faceImage = new Image();
  let faceImageReady = false;
  faceImage.addEventListener("load", () => {
    faceImageReady = true;
  });
  faceImage.addEventListener("error", () => {
    faceImageReady = false;
  });
  faceImage.src = FACE_IMAGE_SRC;

  const davidImage = new Image();
  let davidImageReady = false;
  davidImage.addEventListener("load", () => {
    davidImageReady = true;
  });
  davidImage.addEventListener("error", () => {
    davidImageReady = false;
  });
  davidImage.src = DAVID_IMAGE_SRC;

  const audio = {
    ctx: null,
    master: null,
    unlocked: false,
    sampleLoadStarted: false,
    sampleBuffers: {},
  };

  function ensureAudio() {
    if (audio.ctx) return audio.ctx;
    const AudioContextClass = window.AudioContext || window.webkitAudioContext;
    if (!AudioContextClass) return null;
    audio.ctx = new AudioContextClass();
    audio.master = audio.ctx.createGain();
    audio.master.gain.value = state.soundEnabled ? 0.2 : 0;
    audio.master.connect(audio.ctx.destination);
    return audio.ctx;
  }

  function unlockAudio() {
    const ctx = ensureAudio();
    if (!ctx) return;
    if (ctx.state === "suspended") {
      ctx.resume();
    }
    audio.unlocked = true;
    preloadSamples();
  }

  function updateSoundButtons() {
    if (menuSoundOffBtn) {
      menuSoundOffBtn.classList.toggle("menu-sound-btn-active", !state.soundEnabled);
    }
    if (menuSoundOnBtn) {
      menuSoundOnBtn.classList.toggle("menu-sound-btn-active", state.soundEnabled);
    }
  }

  function setSoundEnabled(enabled) {
    state.soundEnabled = enabled;
    if (audio.master) {
      audio.master.gain.value = enabled ? 0.2 : 0;
    }
    updateSoundButtons();
    if (menuHintEl) {
      menuHintEl.textContent = enabled ? "Звук включен." : "Звук выключен.";
    }
    updateStatus();
  }

  function getFullscreenElement() {
    return document.fullscreenElement || document.webkitFullscreenElement || null;
  }

  function isGameFullscreen() {
    const fullEl = getFullscreenElement();
    return fullEl === appRootEl || fullEl === document.documentElement;
  }

  function updateVideoButtons() {
    const full = isGameFullscreen();
    state.videoMode = full ? "fullscreen" : "window";
    if (menuVideoWindowBtn) {
      menuVideoWindowBtn.classList.toggle("menu-video-btn-active", !full);
    }
    if (menuVideoFullBtn) {
      menuVideoFullBtn.classList.toggle("menu-video-btn-active", full);
    }
  }

  async function setVideoMode(mode) {
    const target = appRootEl || document.documentElement;
    try {
      if (mode === "fullscreen") {
        if (!isGameFullscreen()) {
          if (target.requestFullscreen) {
            await target.requestFullscreen();
          } else if (target.webkitRequestFullscreen) {
            target.webkitRequestFullscreen();
          } else if (menuHintEl) {
            menuHintEl.textContent = "Полный режим не поддерживается в этом браузере.";
          }
        }
      } else if (getFullscreenElement()) {
        if (document.exitFullscreen) {
          await document.exitFullscreen();
        } else if (document.webkitExitFullscreen) {
          document.webkitExitFullscreen();
        }
      }
    } catch (error) {
      console.warn("Failed to switch video mode:", error);
      if (menuHintEl) {
        menuHintEl.textContent = "Не удалось переключить режим видео.";
      }
    }

    updateVideoButtons();
    resizeCanvas();
    if (menuHintEl) {
      menuHintEl.textContent = isGameFullscreen() ? "Режим видео: полный." : "Режим видео: оконный.";
    }
  }

  async function preloadSamples() {
    if (audio.sampleLoadStarted) return;
    const ctx = ensureAudio();
    if (!ctx) return;
    audio.sampleLoadStarted = true;

    const entries = Object.entries(SAMPLE_SOUNDS);
    await Promise.all(entries.map(async ([name, src]) => {
      try {
        const response = await fetch(src, { cache: "force-cache" });
        if (!response.ok) return;
        const raw = await response.arrayBuffer();
        const decoded = await ctx.decodeAudioData(raw.slice(0));
        audio.sampleBuffers[name] = decoded;
      } catch (error) {
        // Keep gameplay smooth even if a sample fails to load.
        console.warn("Failed to load sample:", name, error);
      }
    }));
  }

  function playSample(name, config = {}) {
    const ctx = ensureAudio();
    if (!ctx || !audio.master || !audio.unlocked) return false;
    if (!state.soundEnabled) return true;
    const buffer = audio.sampleBuffers[name];
    if (!buffer) return false;

    const when = ctx.currentTime + (config.delay || 0);
    const rate = config.rate || 1;
    const volume = config.volume === undefined ? 0.9 : config.volume;
    const maxOffset = Math.max(0, buffer.duration - 0.02);
    const offset = Math.min(Math.max(0, config.offset || 0), maxOffset);
    let duration = config.duration;

    if (duration !== undefined) {
      duration = Math.min(Math.max(0.02, duration), buffer.duration - offset);
    }

    const source = ctx.createBufferSource();
    source.buffer = buffer;
    source.playbackRate.setValueAtTime(rate, when);

    const gain = ctx.createGain();
    gain.gain.setValueAtTime(volume, when);

    source.connect(gain);
    gain.connect(audio.master);
    if (duration !== undefined) {
      source.start(when, offset, duration);
    } else {
      source.start(when, offset);
    }
    return true;
  }

  function playTone(config) {
    const ctx = ensureAudio();
    if (!ctx || !audio.master || !audio.unlocked) return;
    if (!state.soundEnabled) return;

    const type = config.type || "sine";
    const freq = config.freq || 440;
    const slideTo = config.slideTo || null;
    const duration = config.duration || 0.12;
    const volume = config.volume || 0.16;
    const attack = config.attack || 0.004;
    const release = config.release || 0.07;
    const when = ctx.currentTime + (config.delay || 0);

    const osc = ctx.createOscillator();
    const gain = ctx.createGain();
    osc.type = type;
    osc.frequency.setValueAtTime(freq, when);
    if (slideTo) {
      osc.frequency.exponentialRampToValueAtTime(slideTo, when + duration);
    }

    gain.gain.setValueAtTime(0.0001, when);
    gain.gain.linearRampToValueAtTime(volume, when + attack);
    gain.gain.exponentialRampToValueAtTime(0.0001, when + duration + release);

    osc.connect(gain);
    gain.connect(audio.master);
    osc.start(when);
    osc.stop(when + duration + release + 0.02);
  }

  function playWobble(config) {
    const ctx = ensureAudio();
    if (!ctx || !audio.master || !audio.unlocked) return;
    if (!state.soundEnabled) return;

    const base = config.base || 220;
    const depth = config.depth || 90;
    const speed = config.speed || 22;
    const duration = config.duration || 0.18;
    const volume = config.volume || 0.13;
    const when = ctx.currentTime + (config.delay || 0);

    const osc = ctx.createOscillator();
    const lfo = ctx.createOscillator();
    const lfoGain = ctx.createGain();
    const gain = ctx.createGain();

    osc.type = config.type || "triangle";
    osc.frequency.setValueAtTime(base, when);

    lfo.type = "sine";
    lfo.frequency.setValueAtTime(speed, when);
    lfoGain.gain.setValueAtTime(depth, when);

    gain.gain.setValueAtTime(0.0001, when);
    gain.gain.linearRampToValueAtTime(volume, when + 0.01);
    gain.gain.exponentialRampToValueAtTime(0.0001, when + duration + 0.06);

    lfo.connect(lfoGain);
    lfoGain.connect(osc.frequency);
    osc.connect(gain);
    gain.connect(audio.master);

    osc.start(when);
    lfo.start(when);
    osc.stop(when + duration + 0.08);
    lfo.stop(when + duration + 0.08);
  }

  function playNoise(config) {
    const ctx = ensureAudio();
    if (!ctx || !audio.master || !audio.unlocked) return;
    if (!state.soundEnabled) return;

    const duration = config.duration || 0.14;
    const volume = config.volume || 0.08;
    const lowpass = config.lowpass || 1800;
    const when = ctx.currentTime + (config.delay || 0);
    const bufferSize = Math.max(1, Math.floor(ctx.sampleRate * duration));
    const buffer = ctx.createBuffer(1, bufferSize, ctx.sampleRate);
    const data = buffer.getChannelData(0);
    for (let i = 0; i < bufferSize; i += 1) {
      data[i] = Math.random() * 2 - 1;
    }

    const src = ctx.createBufferSource();
    src.buffer = buffer;

    const filter = ctx.createBiquadFilter();
    filter.type = "lowpass";
    filter.frequency.value = lowpass;

    const gain = ctx.createGain();
    gain.gain.setValueAtTime(volume, when);
    gain.gain.exponentialRampToValueAtTime(0.0001, when + duration);

    src.connect(filter);
    filter.connect(gain);
    gain.connect(audio.master);
    src.start(when);
    src.stop(when + duration + 0.02);
  }

  function sfxJump(primary) {
    const played = primary
      ? playSample("jumpMain", { volume: 0.95, rate: 1.08 })
      : playSample("jumpDouble", { volume: 0.95, rate: 1.17 });
    if (!played) {
      if (primary) {
        playWobble({ type: "triangle", base: 300, depth: 70, speed: 18, duration: 0.13, volume: 0.13 });
        playTone({ type: "sine", freq: 420, slideTo: 760, duration: 0.08, volume: 0.08, delay: 0.01 });
      } else {
        playWobble({ type: "square", base: 520, depth: 120, speed: 26, duration: 0.1, volume: 0.1 });
        playTone({ type: "triangle", freq: 690, slideTo: 980, duration: 0.08, volume: 0.08, delay: 0.012 });
      }
      return;
    }
    playTone({ type: "triangle", freq: primary ? 760 : 920, slideTo: primary ? 980 : 1160, duration: 0.04, volume: 0.03 });
  }

  function sfxBoost() {
    const played = playSample("boostFunny", { volume: 0.98, rate: 1.2, offset: 0.08, duration: 0.72 });
    if (!played) {
      playNoise({ duration: 0.22, volume: 0.12, lowpass: 820 });
      playWobble({ type: "triangle", base: 180, depth: 80, speed: 14, duration: 0.2, volume: 0.1, delay: 0.01 });
      playTone({ type: "sine", freq: 180, slideTo: 480, duration: 0.24, volume: 0.09, delay: 0.03 });
      return;
    }
    playNoise({ duration: 0.1, volume: 0.04, lowpass: 1000 });
  }

  function sfxNitro() {
    const played = playSample("nitroFunny", { volume: 0.95, rate: 1.28 });
    if (!played) {
      playNoise({ duration: 0.09, volume: 0.05, lowpass: 4200 });
      playTone({ type: "sawtooth", freq: 320, slideTo: 1260, duration: 0.16, volume: 0.12 });
      playTone({ type: "square", freq: 760, slideTo: 1320, duration: 0.1, volume: 0.08, delay: 0.03 });
      playWobble({ type: "triangle", base: 540, depth: 60, speed: 24, duration: 0.1, volume: 0.06, delay: 0.02 });
      return;
    }
    playTone({ type: "square", freq: 780, slideTo: 1260, duration: 0.08, volume: 0.05, delay: 0.01 });
  }

  function sfxStop() {
    const played = playSample("stopFunny", { volume: 0.92, rate: 0.95 });
    if (!played) {
      playTone({ type: "sawtooth", freq: 300, slideTo: 170, duration: 0.15, volume: 0.12 });
      playTone({ type: "triangle", freq: 240, slideTo: 110, duration: 0.2, volume: 0.1, delay: 0.04 });
      playWobble({ type: "sine", base: 120, depth: 22, speed: 10, duration: 0.18, volume: 0.05, delay: 0.05 });
      return;
    }
    playTone({ type: "sine", freq: 240, slideTo: 120, duration: 0.12, volume: 0.03, delay: 0.01 });
  }

  function sfxScoreTick() {
    const played = playSample("scoreTick", { volume: 0.45, rate: 1.2, duration: 0.09 });
    if (!played) {
      playTone({ type: "square", freq: 900, slideTo: 1120, duration: 0.05, volume: 0.06 });
    }
  }

  function sfxFaceJumped() {
    const played = playSample("faceJump", { volume: 0.88, rate: 1.12 });
    if (!played) {
      playTone({ type: "square", freq: 560, slideTo: 930, duration: 0.07, volume: 0.1 });
      playTone({ type: "square", freq: 820, slideTo: 1190, duration: 0.06, volume: 0.08, delay: 0.05 });
      playWobble({ type: "sine", base: 760, depth: 45, speed: 30, duration: 0.06, volume: 0.05, delay: 0.03 });
      return;
    }
    playTone({ type: "sine", freq: 980, slideTo: 1220, duration: 0.05, volume: 0.03, delay: 0.01 });
  }

  function sfxNearMiss() {
    const played = playSample("nearMiss", { volume: 0.88, rate: 1.16, duration: 0.24 });
    if (!played) {
      playNoise({ duration: 0.24, volume: 0.07, lowpass: 1200 });
      playWobble({ type: "triangle", base: 240, depth: 130, speed: 34, duration: 0.2, volume: 0.11 });
      playTone({ type: "sine", freq: 420, slideTo: 180, duration: 0.21, volume: 0.05 });
      return;
    }
    playNoise({ duration: 0.08, volume: 0.04, lowpass: 1300 });
  }

  function sfxGameOver() {
    const played = playSample("gameOver", { volume: 1.1, rate: 0.9, offset: 0.02, duration: 0.9 });
    if (!played) {
      playTone({ type: "sawtooth", freq: 430, slideTo: 170, duration: 0.24, volume: 0.14 });
      playWobble({ type: "triangle", base: 175, depth: 90, speed: 8, duration: 0.32, volume: 0.1, delay: 0.04 });
      playNoise({ duration: 0.2, volume: 0.05, lowpass: 560, delay: 0.02 });
      return;
    }
    playSample("gameOver", { volume: 0.35, rate: 0.74, offset: 0.06, duration: 0.55, delay: 0.11 });
    playTone({ type: "triangle", freq: 220, slideTo: 110, duration: 0.2, volume: 0.04, delay: 0.08 });
  }

  function sfxRestart() {
    const played = playSample("restart", { volume: 0.7, rate: 1.18, duration: 0.22 });
    if (!played) {
      playTone({ type: "square", freq: 540, slideTo: 920, duration: 0.08, volume: 0.09 });
      playTone({ type: "triangle", freq: 700, slideTo: 1180, duration: 0.06, volume: 0.07, delay: 0.04 });
      return;
    }
    playTone({ type: "triangle", freq: 860, slideTo: 1180, duration: 0.05, volume: 0.03, delay: 0.01 });
  }

  function clamp(value, min, max) {
    return Math.max(min, Math.min(max, value));
  }

  function random(min, max) {
    return min + Math.random() * (max - min);
  }

  function lerp(a, b, t) {
    return a + (b - a) * t;
  }

  function parseHex(hex) {
    const clean = hex.replace("#", "");
    return {
      r: parseInt(clean.slice(0, 2), 16),
      g: parseInt(clean.slice(2, 4), 16),
      b: parseInt(clean.slice(4, 6), 16),
    };
  }

  function mixColor(dayHex, nightHex, t) {
    const day = parseHex(dayHex);
    const night = parseHex(nightHex);
    const r = Math.round(lerp(day.r, night.r, t));
    const g = Math.round(lerp(day.g, night.g, t));
    const b = Math.round(lerp(day.b, night.b, t));
    return `rgb(${r}, ${g}, ${b})`;
  }

  function loadBest() {
    const value = Number(localStorage.getItem(BEST_KEY) || 0);
    return Number.isFinite(value) ? Math.max(0, Math.floor(value)) : 0;
  }

  function saveBest(value) {
    localStorage.setItem(BEST_KEY, String(Math.floor(value)));
  }

  function formatScore(value) {
    return String(Math.floor(value)).padStart(5, "0");
  }

  const SPRITE_SCALE = 2;

  const DINO_RUN_1 = [
    "....................XXXXX",
    "...................XDDDDXX",
    "..................XDDDDDDDX",
    ".................XDDDEXDDDX",
    ".................XDDDDDDDDX",
    "..................XDDDDDDDX",
    "...XX..............XDDDDDDX",
    "..XDDXX.............XDDDDDX",
    ".XDDDDLXXXXXXXXXXXXXXDDDDDX",
    "XDDDDDLLLDDDDDDDDDDDDDDDDX",
    ".XDDDDDDDDDDDDDDDDDDDDDDDX",
    "..XDDDDDDDDDDDDDDDDDDDDDDX",
    "...XDDDDDDDDDLLLLLDDDDDDDX",
    "....XDDDDDDDDLLLLLDDDDDDDX",
    ".....XDDDDDDDLLLLLDDDDDDDX",
    "......XDDDDDDDDDDDDDDDDDDX",
    "......XDDDDDDDDDDDDDDDDDDX",
    "......XDDDDDX.....XDDDDDDX",
    "......XDDDDX......XDDDDDX",
    ".....XDDDDX.......XDDDDX",
    ".....XDDDX........XDDDX",
    ".....XXX..........XXX",
  ];

  const DINO_RUN_2 = [
    "....................XXXXX",
    "...................XDDDDXX",
    "..................XDDDDDDDX",
    ".................XDDDEXDDDX",
    ".................XDDDDDDDDX",
    "..................XDDDDDDDX",
    "...XX..............XDDDDDDX",
    "..XDDXX.............XDDDDDX",
    ".XDDDDLXXXXXXXXXXXXXXDDDDDX",
    "XDDDDDLLLDDDDDDDDDDDDDDDDX",
    ".XDDDDDDDDDDDDDDDDDDDDDDDX",
    "..XDDDDDDDDDDDDDDDDDDDDDDX",
    "...XDDDDDDDDDLLLLLDDDDDDDX",
    "....XDDDDDDDDLLLLLDDDDDDDX",
    ".....XDDDDDDDLLLLLDDDDDDDX",
    "......XDDDDDDDDDDDDDDDDDDX",
    "......XDDDDDDDDDDDDDDDDDDX",
    ".....XDDDDDDX....XDDDDDDX",
    "....XDDDDDDX.....XDDDDDX",
    "...XDDDDDDX......XDDDDX",
    "...XDDDDDX.......XDDDX",
    "...XXXXXX........XXX",
  ];

  const DINO_DUCK = [
    ".......................XXXXXX",
    "..................XXXXXDDDDDX",
    ".............XXXXXDDDDDDDDDDX",
    "......XXXXXXXDDDDDDDDDDDDDDDX",
    "...XXXDDDDDDDDDDDDDDDDDDDDDDX",
    "..XDDDDDDDDDDDDDDDDDDDDDDDDDX",
    ".XDDDDDDDDDDDDDDDDDLLLLEDDDDX",
    ".XDDDDDDDDDDDDDDDDDLLLLDDDDDX",
    ".XDDDDDDDDDDDDDDDDDLLLLDDDDDX",
    "..XDDDDDDDDDDDDDDDDDDDDDDDDDX",
    "...XDDDDDDDDDDDDDDDDDDDDDDDDX",
    "...XDDDDDDDDDDDDDDDDDDDDDDDX",
    "...XDDDDDX.....XDDDDDX..XDDDX",
    "...XDDDDX.......XDDDDX...XDDX",
    "...XDDDX.........XDDX....XXX",
  ];

  const CACTUS_SMALL = [
    "...##.....",
    "...##.....",
    "...##.....",
    "...##.....",
    "..####....",
    "##.##.....",
    "##.##.....",
    "##.##.....",
    "#####..##.",
    "...##..##.",
    "...##..##.",
    "...##..##.",
    "...##..##.",
    "...##..##.",
    "...##..##.",
    "...##..##.",
    "...##..##.",
    "...##..##.",
    "...##.....",
    "...##.....",
  ];

  const CACTUS_TALL = [
    "....##......",
    "....##......",
    "....##......",
    "....##......",
    "....##......",
    "...####.....",
    "##..##......",
    "##..##......",
    "##..##......",
    "##..##......",
    "######...##.",
    "....##...##.",
    "....##...##.",
    "....##...##.",
    "....##...##.",
    "....##...##.",
    "....##...##.",
    "....##...##.",
    "....##...##.",
    "....##...##.",
    "....##...##.",
    "....##...##.",
    "....##......",
    "....##......",
    "....##......",
  ];

  const CACTUS_COLORS = {
    outline: "#369b06",
    body: "#86d82d",
    shadow: "#58b307",
    mid: "#6ec61a",
    highlight: "#a5ec54",
    spine: "#3b9807",
  };

  const DINO_COLORS = {
    X: "#0b0b0b",
    D: "#627f55",
    L: "#a9cd67",
    E: "#0b0b0b",
  };

  const HAT_COLORS = {
    outline: "#1b130e",
    brim: "#5f3a1b",
    crown: "#7a4d27",
    band: "#b73030",
    highlight: "#9c6a38",
  };

  const state = {
    menuVisible: true,
    menuView: "main",
    soundEnabled: true,
    videoMode: "window",
    started: false,
    gameOver: false,
    baseSpeed: BASE_SPEED,
    speed: BASE_SPEED,
    score: 0,
    best: loadBest(),
    facesJumped: 0,
    jumpQueued: false,
    jumpsUsed: 0,
    fartCooldown: 0,
    duckHeld: false,
    brakeTimer: 0,
    brakeCooldown: 0,
    nitroTimer: 0,
    nitroCooldown: 0,
    spawnTimer: 0,
    groundOffset: 0,
    time: 0,
    blinkTimer: random(1.2, 2.6),
    blinkPhase: 0,
    blinkDuration: 0,
    scoreFlash: 0,
    nearMissTimer: 0,
    nearMissCooldown: 0,
    nightLevel: 0,
    nightTarget: 0,
    moonX: WIDTH + 80,
    moonY: 120,
    dino: {
      x: 130,
      y: GROUND_Y,
      vy: 0,
      standW: 72,
      standH: 180,
      duckW: 88,
      duckH: 146,
      onGround: true,
    },
    obstacles: [],
    clouds: [],
    stars: [],
    snowflakes: [],
    hills: [],
    billboards: [],
    nextMaximaScore: 1000,
  };

  bestEl.textContent = formatScore(state.best);
  facesEl.textContent = "0";

  function resizeCanvas() {
    const dpr = Math.max(1, Math.min(window.devicePixelRatio || 1, 2));
    canvas.width = WIDTH * dpr;
    canvas.height = HEIGHT * dpr;
    ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
    ctx.imageSmoothingEnabled = false;
  }

  function dinoHeight() {
    return state.duckHeld && state.dino.onGround ? state.dino.duckH : state.dino.standH;
  }

  function dinoWidth() {
    return state.duckHeld && state.dino.onGround ? state.dino.duckW : state.dino.standW;
  }

  function dinoRect() {
    const w = dinoWidth();
    const h = dinoHeight();
    return {
      x: state.dino.x,
      y: state.dino.y - h,
      w,
      h,
    };
  }

  function updateStatus() {
    if (state.menuVisible) {
      statusEl.textContent = "Меню открыто. Нажми M, чтобы скрыть меню.";
      return;
    }
    if (state.gameOver) {
      statusEl.textContent = "Game over. Press Space, Right Mouse, R, or Restart.";
      return;
    }
    if (!state.started) {
      statusEl.textContent = "Space/Right Mouse jump x2, F boost jump, Shift/E nitro, S stop, R restart, M menu.";
      return;
    }
    statusEl.textContent = "Space/Right Mouse jump x2, F boost jump, Shift/E nitro, S stop, R restart, M menu.";
  }

  function setMenuView(view) {
    state.menuView = view;
    if (menuMainPanelEl) {
      menuMainPanelEl.classList.toggle("hidden", view !== "main");
    }
    if (menuSettingsPanelEl) {
      menuSettingsPanelEl.classList.toggle("hidden", view !== "settings");
    }
    if (menuShopPanelEl) {
      menuShopPanelEl.classList.toggle("hidden", view !== "shop");
    }
    updateSoundButtons();
    updateVideoButtons();
    if (menuHintEl) {
      if (view === "settings") {
        menuHintEl.textContent = "Настройки: звук и режим видео.";
      } else if (view === "shop") {
        menuHintEl.textContent = "Магазин: выбери кнопку товара.";
      } else {
        menuHintEl.textContent = "Выбери пункт меню. Кнопка M открывает меню в игре.";
      }
    }
  }

  function setMenuVisible(visible, view = null) {
    state.menuVisible = visible;
    if (mainMenuEl) {
      mainMenuEl.classList.toggle("hidden", !visible);
    }
    if (visible) {
      setMenuView(view || "main");
    }
    updateStatus();
  }

  function startFromMenu() {
    if (state.gameOver) restartGame();
    state.started = true;
    setMenuVisible(false);
    updateStatus();
  }

  function updateNitroStatus() {
    if (state.gameOver || !state.started) return;
    if (state.nearMissTimer > 0) {
      statusEl.textContent = "Cinematic dodge!";
      return;
    }
    if (state.brakeTimer > 0) {
      statusEl.textContent = "STOP active!";
      return;
    }
    if (state.nitroTimer > 0) {
      statusEl.textContent = "Nitro active!";
      return;
    }
    if (state.nitroCooldown > 0) {
      statusEl.textContent = `Nitro recharge: ${state.nitroCooldown.toFixed(1)}s`;
      return;
    }
    if (state.fartCooldown > 0) {
      statusEl.textContent = `Boost recharge: ${state.fartCooldown.toFixed(1)}s`;
      return;
    }
    statusEl.textContent = "Space/Right Mouse jump x2, F boost jump, Shift/E nitro, S stop, R restart, M menu.";
  }

  function spawnCloud() {
    state.clouds.push({
      x: WIDTH + random(0, 280),
      y: random(40, 220),
      w: random(70, 130),
      h: random(24, 38),
      speedMul: random(0.15, 0.28),
    });
  }

  function spawnStarField() {
    state.stars.length = 0;
    for (let i = 0; i < 42; i += 1) {
      state.stars.push({
        x: random(0, WIDTH),
        y: random(10, GROUND_Y - 30),
        r: random(0.7, 1.7),
        twinkle: random(0.6, 1.4),
      });
    }
  }

  function spawnSnowField() {
    state.snowflakes.length = 0;
    const flakesCount = 140;
    for (let i = 0; i < flakesCount; i += 1) {
      state.snowflakes.push({
        x: random(0, WIDTH),
        y: random(-HEIGHT, HEIGHT),
        r: random(1, 2.7),
        speed: random(35, 92),
        drift: random(-18, 18),
        wobbleFreq: random(0.6, 1.8),
        wobbleAmp: random(3, 14),
        phase: random(0, Math.PI * 2),
        alpha: random(0.45, 0.95),
      });
    }
  }

  function spawnHill() {
    state.hills.push({
      x: WIDTH + random(30, 380),
      y: GROUND_Y,
      w: random(140, 300),
      h: random(30, 86),
      speedMul: random(0.22, 0.36),
    });
  }

  function spawnMaximaBillboard(scoreMark) {
    state.billboards.push({
      x: WIDTH + random(40, 200),
      y: random(120, GROUND_Y - 240),
      w: random(300, 380),
      h: random(110, 140),
      speedMul: random(0.15, 0.22),
      scoreMark,
    });
  }

  function spawnObstacle() {
    const allowBird = state.score > 280;
    const allowFace = state.score > 160;
    const allowTriple = state.score > 350;
    const nitroActive = state.nitroTimer > 0;
    const spawnBirdChance = nitroActive ? 0.22 : 0.32;
    const spawnFaceChance = nitroActive ? 0.16 : 0.24;
    const spawnFace = allowFace && Math.random() < spawnFaceChance;
    const spawnBird = allowBird && Math.random() < spawnBirdChance;
    let obstacleWidth = 38;
    let spawnedKind = "small";

    if (spawnFace) {
      const lanes = [GROUND_Y - 150, GROUND_Y - 190, GROUND_Y - 230];
      const baseY = lanes[Math.floor(Math.random() * lanes.length)];
      spawnedKind = "face";
      state.obstacles.push({
        kind: "face",
        x: WIDTH + 24,
        y: baseY,
        baseY,
        w: 96,
        h: 96,
        bobAmp: random(8, 16),
        bobPhase: random(0, Math.PI * 2),
        angle: random(0, Math.PI * 2),
        spinSpeed: random(2.8, 4.4) * (Math.random() < 0.5 ? -1 : 1),
        nearMissed: false,
        passed: false,
      });
      obstacleWidth = 96;
    } else if (spawnBird) {
      spawnedKind = "bird";
      const lanes = [GROUND_Y - 60, GROUND_Y - 130, GROUND_Y - 95];
      state.obstacles.push({
        kind: "bird",
        x: WIDTH + 30,
        y: lanes[Math.floor(Math.random() * lanes.length)],
        w: 74,
        h: 42,
      });
      obstacleWidth = 74;
    } else {
      const roll = Math.random();
      if (roll < (nitroActive ? 0.68 : 0.54)) {
        spawnedKind = "small";
        state.obstacles.push({
          kind: "small",
          x: WIDTH + 24,
          y: GROUND_Y - 64,
          w: 32,
          h: 64,
        });
        obstacleWidth = 32;
      } else if (roll < (nitroActive ? 0.95 : 0.88)) {
        spawnedKind = "tall";
        state.obstacles.push({
          kind: "tall",
          x: WIDTH + 24,
          y: GROUND_Y - 80,
          w: 38,
          h: 80,
        });
        obstacleWidth = 38;
      } else if (roll < (nitroActive ? 0.995 : 0.97)) {
        spawnedKind = "cluster";
        state.obstacles.push({
          kind: "cluster",
          x: WIDTH + 24,
          y: GROUND_Y - 80,
          w: 74,
          h: 80,
        });
        obstacleWidth = 74;
      } else if (allowTriple) {
        spawnedKind = "triple";
        state.obstacles.push({
          kind: "triple",
          x: WIDTH + 24,
          y: GROUND_Y - 80,
          w: 106,
          h: 80,
        });
        obstacleWidth = 106;
      } else {
        spawnedKind = "cluster";
        state.obstacles.push({
          kind: "cluster",
          x: WIDTH + 24,
          y: GROUND_Y - 80,
          w: 74,
          h: 80,
        });
        obstacleWidth = 74;
      }
    }

    const speedProgress = clamp((state.speed - BASE_SPEED) / 400, 0, 1);
    const isCactus =
      spawnedKind === "small" ||
      spawnedKind === "tall" ||
      spawnedKind === "cluster" ||
      spawnedKind === "triple";
    const cactusDistanceBonus = isCactus ? 40 : 0;
    const minDistance = lerp(480, 340, speedProgress) + (nitroActive ? 95 : 0) + cactusDistanceBonus;
    const maxDistance = minDistance + 260 + (isCactus ? 25 : 0);
    const widthBonus = (obstacleWidth >= 96 ? 180 : obstacleWidth >= 70 ? 120 : 36) + (isCactus ? 15 : 0);
    const distance = random(minDistance + widthBonus, maxDistance + widthBonus);
    state.spawnTimer = distance / state.speed;
  }

  function queueJump() {
    if (state.gameOver) return;
    if (!state.dino.onGround && state.jumpsUsed >= MAX_JUMPS) return;
    state.jumpQueued = true;
  }

  function triggerNitro() {
    if (state.gameOver || !state.started) return;
    if (state.nitroTimer > 0 || state.nitroCooldown > 0) return;
    state.nitroTimer = NITRO.duration;
    state.nitroCooldown = NITRO.cooldown;
    sfxNitro();
  }

  function triggerBrake() {
    if (state.gameOver || !state.started) return;
    if (state.brakeTimer > 0 || state.brakeCooldown > 0) return;
    state.brakeTimer = BRAKE.duration;
    state.brakeCooldown = BRAKE.cooldown;
    sfxStop();
  }

  function triggerStop() {
    triggerBrake();
  }

  function triggerFartBoost() {
    if (state.gameOver || !state.started) return;
    if (state.fartCooldown > 0) return;
    state.dino.vy = -random(FART_BOOST.minImpulse, FART_BOOST.maxImpulse);
    state.dino.onGround = false;
    state.jumpQueued = false;
    state.jumpsUsed = MAX_JUMPS;
    state.fartCooldown = FART_BOOST.cooldown;
    state.scoreFlash = Math.max(state.scoreFlash, 0.12);
    sfxBoost();
  }

  function restartGame(options = {}) {
    const showMenu = options.showMenu === true;
    const hadProgress = state.score > 0 || state.gameOver;
    state.started = false;
    state.gameOver = false;
    state.baseSpeed = BASE_SPEED;
    state.speed = BASE_SPEED;
    state.score = 0;
    state.facesJumped = 0;
    state.jumpQueued = false;
    state.jumpsUsed = 0;
    state.fartCooldown = 0;
    state.nearMissTimer = 0;
    state.nearMissCooldown = 0;
    state.duckHeld = false;
    state.brakeTimer = 0;
    state.brakeCooldown = 0;
    state.nitroTimer = 0;
    state.nitroCooldown = 0;
    state.spawnTimer = 0.9;
    state.time = 0;
    state.groundOffset = 0;
    state.scoreFlash = 0;
    state.nightLevel = 0;
    state.nightTarget = 0;
    state.moonX = WIDTH + 80;
    state.moonY = 120;
    state.blinkTimer = random(1.2, 2.6);
    state.blinkPhase = 0;
    state.blinkDuration = 0;
    state.obstacles.length = 0;
    state.clouds.length = 0;
    state.snowflakes.length = 0;
    state.hills.length = 0;
    state.billboards.length = 0;
    state.nextMaximaScore = 1000;
    state.dino.y = GROUND_Y;
    state.dino.vy = 0;
    state.dino.onGround = true;

    spawnStarField();
    spawnSnowField();
    for (let i = 0; i < 3; i += 1) spawnCloud();
    for (let i = 0; i < 4; i += 1) spawnHill();

    scoreEl.textContent = formatScore(0);
    facesEl.textContent = "0";
    if (showMenu) {
      setMenuVisible(true);
    } else {
      setMenuVisible(false);
    }
    updateStatus();
    if (hadProgress) sfxRestart();
  }

  function keyDown(event) {
    unlockAudio();
    const key = event.key.toLowerCase();
    if (key === "m") {
      event.preventDefault();
      if (state.menuVisible) {
        setMenuVisible(false);
      } else {
        setMenuVisible(true, "main");
      }
      return;
    }

    if (state.menuVisible) {
      if (event.key === " " || key === "enter") {
        event.preventDefault();
        if (state.menuView === "main") {
          startFromMenu();
        }
      }
      return;
    }

    if (key === " ") {
      event.preventDefault();
      if (state.gameOver) restartGame();
      if (!state.started) state.started = true;
      queueJump();
    } else if (key === "arrowdown") {
      state.duckHeld = true;
    } else if (key === "s" || key === "x") {
      triggerStop();
    } else if (key === "e" || key === "shift") {
      triggerNitro();
    } else if (event.code === "KeyF") {
      if (!state.started) state.started = true;
      triggerFartBoost();
    } else if (event.code === "KeyR") {
      restartGame();
    }
  }

  function keyUp(event) {
    const key = event.key.toLowerCase();
    if (key === "arrowdown") {
      state.duckHeld = false;
    }
  }

  function intersects(a, b) {
    return !(
      a.x + a.w <= b.x ||
      a.x >= b.x + b.w ||
      a.y + a.h <= b.y ||
      a.y >= b.y + b.h
    );
  }

  function updateSky(dt) {
    const cycle = Math.floor(state.score / 700) % 2;
    state.nightTarget = cycle === 1 ? 1 : 0;
    state.nightLevel = lerp(state.nightLevel, state.nightTarget, 0.45 * dt * 60);

    if (state.nightLevel > 0.02) {
      state.moonX -= dt * 10;
      if (state.moonX < -40) {
        state.moonX = WIDTH + 80;
        state.moonY = random(70, 170);
      }
    } else {
      state.moonX = WIDTH + 80;
    }
  }

  function updateAmbient(dt) {
    if (Math.random() < 0.007 && state.clouds.length < 6) spawnCloud();
    if (Math.random() < 0.01 && state.hills.length < 6) spawnHill();

    for (let i = state.clouds.length - 1; i >= 0; i -= 1) {
      const cloud = state.clouds[i];
      cloud.x -= state.speed * cloud.speedMul * dt;
      if (cloud.x + cloud.w < -25) state.clouds.splice(i, 1);
    }

    for (let i = state.hills.length - 1; i >= 0; i -= 1) {
      const hill = state.hills[i];
      hill.x -= state.speed * hill.speedMul * dt;
      if (hill.x + hill.w < -40) state.hills.splice(i, 1);
    }

    for (let i = state.billboards.length - 1; i >= 0; i -= 1) {
      const billboard = state.billboards[i];
      billboard.x -= state.speed * billboard.speedMul * dt;
      if (billboard.x + billboard.w < -60) state.billboards.splice(i, 1);
    }

    for (let i = 0; i < state.snowflakes.length; i += 1) {
      const flake = state.snowflakes[i];
      flake.y += (flake.speed + state.speed * 0.04) * dt;
      flake.x +=
        flake.drift * dt +
        Math.sin(state.time * flake.wobbleFreq + flake.phase) * flake.wobbleAmp * dt;

      if (flake.y > HEIGHT + 12) {
        flake.y = random(-120, -12);
        flake.x = random(-20, WIDTH + 20);
      }
      if (flake.x < -24) flake.x = WIDTH + 24;
      if (flake.x > WIDTH + 24) flake.x = -24;
    }
  }

  function updateBlink(dt) {
    if (state.blinkDuration > 0) {
      state.blinkDuration -= dt;
      state.blinkPhase += dt * 40;
      return;
    }

    state.blinkTimer -= dt;
    if (state.blinkTimer <= 0) {
      state.blinkDuration = 0.12;
      state.blinkPhase = 0;
      state.blinkTimer = random(1.4, 3.0);
    }
  }

  function updateGameplay(dt, realDt) {
    if (state.nearMissTimer > 0) state.nearMissTimer = Math.max(0, state.nearMissTimer - realDt);
    if (state.nearMissCooldown > 0) state.nearMissCooldown = Math.max(0, state.nearMissCooldown - realDt);
    if (state.fartCooldown > 0) state.fartCooldown = Math.max(0, state.fartCooldown - realDt);
    if (state.gameOver) return;
    if (state.menuVisible) return;
    if (!state.started) return;

    state.baseSpeed = Math.min(MAX_SPEED, state.baseSpeed + dt * 8.5);
    if (state.brakeTimer > 0) state.brakeTimer = Math.max(0, state.brakeTimer - dt);
    if (state.brakeCooldown > 0) state.brakeCooldown = Math.max(0, state.brakeCooldown - dt);
    if (state.nitroTimer > 0) state.nitroTimer = Math.max(0, state.nitroTimer - dt);
    if (state.nitroCooldown > 0) state.nitroCooldown = Math.max(0, state.nitroCooldown - dt);
    const nitroBoost = state.nitroTimer > 0 ? NITRO.boost : 0;
    const brakeFactor = state.brakeTimer > 0 ? BRAKE.speedFactor : 1;
    state.speed = Math.min(MAX_SPEED + NITRO.boost, (state.baseSpeed + nitroBoost) * brakeFactor);

    state.score += dt * 12;
    scoreEl.textContent = formatScore(state.score);

    while (state.score >= state.nextMaximaScore) {
      spawnMaximaBillboard(state.nextMaximaScore);
      state.nextMaximaScore += 1000;
    }

    if (Math.floor(state.score) > state.best) {
      state.best = Math.floor(state.score);
      bestEl.textContent = formatScore(state.best);
      saveBest(state.best);
    }

    if (Math.floor(state.score) > 0 && Math.floor(state.score) % 100 === 0 && state.scoreFlash <= 0) {
      state.scoreFlash = 0.22;
      sfxScoreTick();
    }
    if (state.scoreFlash > 0) state.scoreFlash -= dt;
    updateNitroStatus();

    if (state.jumpQueued) {
      if (state.dino.onGround) {
        state.dino.vy = -PHYSICS.jumpImpulse;
        state.dino.onGround = false;
        state.jumpsUsed = 1;
        sfxJump(true);
      } else if (state.jumpsUsed < MAX_JUMPS) {
        state.dino.vy = -PHYSICS.jumpImpulse * DOUBLE_JUMP_FACTOR;
        state.jumpsUsed += 1;
        sfxJump(false);
      }
    }
    state.jumpQueued = false;

    const gravity = state.duckHeld && !state.dino.onGround ? PHYSICS.fastFallGravity : PHYSICS.gravity;
    state.dino.vy = clamp(state.dino.vy + gravity * dt, -2000, PHYSICS.maxFallSpeed);
    state.dino.y += state.dino.vy * dt;

    if (state.dino.y >= GROUND_Y) {
      state.dino.y = GROUND_Y;
      state.dino.vy = 0;
      state.dino.onGround = true;
      state.jumpsUsed = 0;
    }

    state.spawnTimer -= dt;
    if (state.spawnTimer <= 0) {
      if (state.nitroTimer > 0 && Math.random() < 0.42) {
        // During nitro, sometimes skip an obstacle to lower density.
        state.spawnTimer = random(0.22, 0.45);
      } else {
        spawnObstacle();
      }
    }

    for (let i = state.obstacles.length - 1; i >= 0; i -= 1) {
      const obstacle = state.obstacles[i];
      obstacle.x -= state.speed * dt;

      if (obstacle.kind === "face") {
        obstacle.bobPhase += dt * 7;
        obstacle.y = obstacle.baseY + Math.sin(obstacle.bobPhase) * obstacle.bobAmp;
        obstacle.angle += obstacle.spinSpeed * dt;

        if (!obstacle.nearMissed && state.nearMissCooldown <= 0) {
          const dinoCx = state.dino.x + dinoWidth() * 0.5;
          const dinoCy = state.dino.y - dinoHeight() * 0.5;
          const faceCx = obstacle.x + obstacle.w * 0.5;
          const faceCy = obstacle.y + obstacle.h * 0.5;
          const dx = faceCx - dinoCx;
          const dy = faceCy - dinoCy;
          const nearDist = Math.hypot(dx, dy);
          if (nearDist <= NEAR_MISS.distance) {
            obstacle.nearMissed = true;
            state.nearMissTimer = NEAR_MISS.duration;
            state.nearMissCooldown = NEAR_MISS.cooldown;
            sfxNearMiss();
          }
        }
      }

      if (obstacle.kind === "face" && !obstacle.passed && obstacle.x + obstacle.w < state.dino.x) {
        obstacle.passed = true;
        if (state.dino.y < obstacle.y + obstacle.h * 0.82) {
          state.facesJumped += 1;
          facesEl.textContent = String(state.facesJumped);
          sfxFaceJumped();
        }
      }

      if (obstacle.x + obstacle.w < -30) state.obstacles.splice(i, 1);
    }

    const rect = dinoRect();
    const hitbox = {
      x: rect.x + rect.w * 0.24,
      y: rect.y + rect.h * 0.1,
      w: rect.w * 0.54,
      h: rect.h * 0.88,
    };

    for (const obstacle of state.obstacles) {
      let obstacleBox = {
        x: obstacle.x + 5,
        y: obstacle.y + 3,
        w: obstacle.w - 10,
        h: obstacle.h - 6,
      };

      // Make packed cactus groups more forgiving.
      if (obstacle.kind === "cluster") {
        obstacleBox = {
          x: obstacle.x + 12,
          y: obstacle.y + 9,
          w: obstacle.w - 25,
          h: obstacle.h - 16,
        };
      } else if (obstacle.kind === "triple") {
        obstacleBox = {
          x: obstacle.x + 14,
          y: obstacle.y + 10,
          w: obstacle.w - 30,
          h: obstacle.h - 18,
        };
      } else if (obstacle.kind === "face") {
        obstacleBox = {
          x: obstacle.x + 16,
          y: obstacle.y + 16,
          w: obstacle.w - 32,
          h: obstacle.h - 32,
        };
      }

      if (intersects(hitbox, obstacleBox)) {
        state.gameOver = true;
        updateStatus();
        sfxGameOver();
        return;
      }
    }

    state.groundOffset = (state.groundOffset + state.speed * dt) % 52;
  }

  function update(dt) {
    state.time += dt;
    const timeScale = state.nearMissTimer > 0 ? NEAR_MISS.slowMo : 1;
    const simDt = dt * timeScale;
    updateAmbient(simDt);
    updateSky(simDt);
    updateBlink(simDt);
    updateGameplay(simDt, dt);
  }

  function drawSky() {
    const sky = mixColor("#8fd3ff", "#2e4f70", state.nightLevel);
    ctx.fillStyle = sky;
    ctx.fillRect(0, 0, WIDTH, HEIGHT);

    const starAlpha = clamp(state.nightLevel * 1.15, 0, 0.95);
    if (starAlpha > 0.01) {
      ctx.fillStyle = `rgba(255,255,255,${starAlpha})`;
      for (const star of state.stars) {
        const pulse = 0.45 + Math.sin(state.time * star.twinkle + star.x) * 0.55;
        ctx.globalAlpha = starAlpha * pulse;
        ctx.beginPath();
        ctx.arc(star.x, star.y, star.r, 0, Math.PI * 2);
        ctx.fill();
      }
      ctx.globalAlpha = 1;

      ctx.fillStyle = `rgba(247,247,247,${starAlpha})`;
      ctx.beginPath();
      ctx.arc(state.moonX, state.moonY, 24, 0, Math.PI * 2);
      ctx.fill();
      ctx.fillStyle = sky;
      ctx.beginPath();
      ctx.arc(state.moonX + 10, state.moonY - 7, 20, 0, Math.PI * 2);
      ctx.fill();
    }
  }

  function drawCloud(cloud) {
    const cloudColor = mixColor("#dcdcdc", "#707070", state.nightLevel);
    ctx.fillStyle = cloudColor;
    ctx.beginPath();
    ctx.ellipse(cloud.x, cloud.y, cloud.w * 0.38, cloud.h, 0, 0, Math.PI * 2);
    ctx.ellipse(cloud.x + cloud.w * 0.24, cloud.y - 8, cloud.w * 0.3, cloud.h * 0.8, 0, 0, Math.PI * 2);
    ctx.ellipse(cloud.x + cloud.w * 0.5, cloud.y, cloud.w * 0.26, cloud.h * 0.9, 0, 0, Math.PI * 2);
    ctx.fill();
  }

  function drawHills() {
    const hillColor = mixColor("#9ea4ab", "#6b7076", state.nightLevel);
    ctx.fillStyle = hillColor;
    for (const hill of state.hills) {
      ctx.beginPath();
      ctx.moveTo(hill.x, hill.y + 2);
      ctx.lineTo(hill.x + hill.w * 0.5, hill.y - hill.h);
      ctx.lineTo(hill.x + hill.w, hill.y + 2);
      ctx.closePath();
      ctx.fill();
    }
  }

  function drawSnow() {
    const baseAlpha = 0.42 + state.nightLevel * 0.28;
    for (const flake of state.snowflakes) {
      const alpha = clamp(baseAlpha * flake.alpha, 0.12, 0.9);
      ctx.fillStyle = `rgba(255,255,255,${alpha.toFixed(3)})`;
      ctx.beginPath();
      ctx.arc(flake.x, flake.y, flake.r, 0, Math.PI * 2);
      ctx.fill();
    }
  }

  function drawBillboards() {
    const frame = mixColor("#6a0f0f", "#b86767", state.nightLevel);
    const panel = mixColor("#d11f1f", "#f3a0a0", state.nightLevel);
    const pole = mixColor("#676d75", "#9aa2ac", state.nightLevel);
    const text = mixColor("#fff6bf", "#fff1d2", state.nightLevel);

    for (const b of state.billboards) {
      const poleX = b.x + b.w * 0.5 - 10;
      ctx.fillStyle = pole;
      ctx.fillRect(poleX, b.y + b.h, 20, GROUND_Y - (b.y + b.h) + 2);

      ctx.fillStyle = frame;
      ctx.fillRect(b.x, b.y, b.w, b.h);
      ctx.fillStyle = panel;
      ctx.fillRect(b.x + 10, b.y + 10, b.w - 20, b.h - 20);

      ctx.fillStyle = text;
      ctx.textAlign = "center";
      ctx.font = "900 54px Segoe UI";
      ctx.fillText(MAXIMA_TEXT, b.x + b.w * 0.5, b.y + b.h * 0.62);
      ctx.font = "700 22px Segoe UI";
      ctx.fillText(`${Math.floor(b.scoreMark)}`, b.x + b.w * 0.5, b.y + b.h * 0.86);
      ctx.textAlign = "start";
    }
  }

  function drawGround() {
    const border = mixColor("#5f6368", "#c8cdd2", state.nightLevel);
    const road = mixColor("#9aa0a6", "#5f6368", state.nightLevel);
    const lane = mixColor("#f3c64e", "#d8aa35", state.nightLevel);

    // Road body
    ctx.fillStyle = road;
    ctx.fillRect(0, GROUND_Y + 2, WIDTH, HEIGHT - (GROUND_Y + 2));

    // Top border of road
    ctx.strokeStyle = border;
    ctx.lineWidth = 3;
    ctx.beginPath();
    ctx.moveTo(0, GROUND_Y + 1);
    ctx.lineTo(WIDTH, GROUND_Y + 1);
    ctx.stroke();

    // Yellow dashed center line
    ctx.fillStyle = lane;
    const laneY = GROUND_Y + 24;
    for (let x = -state.groundOffset; x < WIDTH + 56; x += 58) {
      ctx.fillRect(x, laneY, 36, 4);
    }
  }

  function drawSprite(sprite, x, y, scale, color) {
    ctx.fillStyle = color;
    for (let rowIndex = 0; rowIndex < sprite.length; rowIndex += 1) {
      const row = sprite[rowIndex];
      for (let colIndex = 0; colIndex < row.length; colIndex += 1) {
        if (row[colIndex] === "#") {
          ctx.fillRect(
            Math.round(x + colIndex * scale),
            Math.round(y + rowIndex * scale),
            scale,
            scale
          );
        }
      }
    }
  }

  function drawPaletteSprite(sprite, x, y, scale, palette) {
    for (let rowIndex = 0; rowIndex < sprite.length; rowIndex += 1) {
      const row = sprite[rowIndex];
      for (let colIndex = 0; colIndex < row.length; colIndex += 1) {
        const token = row[colIndex];
        const color = palette[token];
        if (!color) continue;
        ctx.fillStyle = color;
        ctx.fillRect(
          Math.round(x + colIndex * scale),
          Math.round(y + rowIndex * scale),
          scale,
          scale
        );
      }
    }
  }

  function roundedRectPath(x, y, w, h, r) {
    const rr = Math.min(r, w / 2, h / 2);
    ctx.beginPath();
    ctx.moveTo(x + rr, y);
    ctx.arcTo(x + w, y, x + w, y + h, rr);
    ctx.arcTo(x + w, y + h, x, y + h, rr);
    ctx.arcTo(x, y + h, x, y, rr);
    ctx.arcTo(x, y, x + w, y, rr);
    ctx.closePath();
  }

  function drawCactusPart(x, y, w, h, radius, showShine) {
    roundedRectPath(x, y, w, h, radius);
    ctx.fillStyle = CACTUS_COLORS.body;
    ctx.fill();
    ctx.lineWidth = 2;
    ctx.strokeStyle = CACTUS_COLORS.outline;
    ctx.stroke();

    roundedRectPath(x + w * 0.06, y + 1, w * 0.34, h - 2, radius * 0.7);
    ctx.fillStyle = CACTUS_COLORS.shadow;
    ctx.fill();

    roundedRectPath(x + w * 0.36, y + 1, w * 0.18, h - 2, radius * 0.7);
    ctx.fillStyle = CACTUS_COLORS.mid;
    ctx.fill();

    if (showShine) {
      roundedRectPath(x + w * 0.62, y + h * 0.1, w * 0.22, h * 0.8, radius * 0.7);
      ctx.fillStyle = CACTUS_COLORS.highlight;
      ctx.fill();
    }
  }

  function drawCactusSpines(x, y, s) {
    const spikes = [
      [10, 12, 13, 8],
      [14, 24, 18, 20],
      [26, 16, 23, 12],
      [28, 34, 24, 39],
      [18, 44, 14, 49],
      [35, 29, 40, 25],
      [38, 42, 43, 38],
    ];
    ctx.strokeStyle = CACTUS_COLORS.spine;
    ctx.lineWidth = Math.max(1.8, 2.2 * s);
    ctx.lineCap = "round";
    for (const spike of spikes) {
      ctx.beginPath();
      ctx.moveTo(x + spike[0] * s, y + spike[1] * s);
      ctx.lineTo(x + spike[2] * s, y + spike[3] * s);
      ctx.stroke();
    }
  }

  function drawStickerCactus(x, y, s) {
    drawCactusPart(x + 12 * s, y, 16 * s, 50 * s, 7 * s, true);
    drawCactusPart(x + 2 * s, y + 22 * s, 12 * s, 20 * s, 6 * s, false);
    drawCactusPart(x + 40 * s, y + 12 * s, 12 * s, 24 * s, 6 * s, true);
    drawCactusPart(x + 24 * s, y + 24 * s, 20 * s, 10 * s, 5 * s, false);
    drawCactusSpines(x, y, s);
  }

  function drawCowboyHat(topX, topY, ducking) {
    const s = SPRITE_SCALE;
    const crownLeft = ducking ? topX + 46 : topX + 34;
    const crownTop = ducking ? topY - 4 : topY - 8;

    ctx.fillStyle = HAT_COLORS.outline;
    ctx.fillRect(crownLeft - 4 * s, crownTop + 7 * s, 18 * s, 2 * s);
    ctx.fillRect(crownLeft - 1 * s, crownTop - 1 * s, 12 * s, 9 * s);

    ctx.fillStyle = HAT_COLORS.brim;
    ctx.fillRect(crownLeft - 3 * s, crownTop + 7 * s, 16 * s, 1 * s);

    ctx.fillStyle = HAT_COLORS.crown;
    ctx.fillRect(crownLeft, crownTop, 10 * s, 7 * s);

    ctx.fillStyle = HAT_COLORS.band;
    ctx.fillRect(crownLeft, crownTop + 4 * s, 10 * s, 1 * s);

    ctx.fillStyle = HAT_COLORS.highlight;
    ctx.fillRect(crownLeft + 6 * s, crownTop + 1 * s, 2 * s, 5 * s);
  }

  function drawNitroTrail(rect, ducking) {
    const active = state.nitroTimer > 0;
    if (!active) return;

    const t = clamp(state.nitroTimer / NITRO.duration, 0, 1);
    const tailX = rect.x - rect.w * 0.12;
    const tailY = rect.y + (ducking ? rect.h * 0.64 : rect.h * 0.6);
    const w = rect.w;

    ctx.fillStyle = `rgba(110, 235, 255, ${0.35 + 0.35 * t})`;
    ctx.fillRect(tailX - w * 0.24, tailY - 4, w * 0.21, 5);
    ctx.fillRect(tailX - w * 0.45, tailY - 1, w * 0.24, 4);
    ctx.fillRect(tailX - w * 0.64, tailY + 2, w * 0.22, 3);

    ctx.fillStyle = `rgba(40, 160, 255, ${0.3 + 0.35 * t})`;
    ctx.fillRect(tailX - w * 0.18, tailY - 2, w * 0.1, 3);
    ctx.fillRect(tailX - w * 0.38, tailY + 1, w * 0.1, 3);
    ctx.fillRect(tailX - w * 0.56, tailY + 4, w * 0.08, 2);
  }

  function drawNitroOverlay() {
    if (state.nitroTimer <= 0) return;
    const t = clamp(state.nitroTimer / NITRO.duration, 0, 1);

    // Subtle blue tint over the whole scene.
    ctx.fillStyle = `rgba(70, 205, 255, ${0.06 + 0.08 * t})`;
    ctx.fillRect(0, 0, WIDTH, HEIGHT);

    // Speed lines.
    ctx.strokeStyle = `rgba(140, 240, 255, ${0.35 + 0.35 * t})`;
    ctx.lineWidth = 2;
    for (let i = 0; i < 16; i += 1) {
      const y = 20 + i * 18 + Math.sin(state.time * 6 + i) * 2;
      const length = 36 + (i % 4) * 12;
      const x = WIDTH - ((state.time * 850 + i * 90) % (WIDTH + length));
      ctx.beginPath();
      ctx.moveTo(x, y);
      ctx.lineTo(x + length, y);
      ctx.stroke();
    }

    // On-screen nitro label.
    ctx.fillStyle = `rgba(190, 250, 255, ${0.9})`;
    ctx.font = "700 34px Segoe UI";
    ctx.fillText("NITRO!", WIDTH - 210, 52);
  }

  function drawStopOverlay() {
    if (state.brakeTimer <= 0) return;
    const t = clamp(state.brakeTimer / BRAKE.duration, 0, 1);
    ctx.fillStyle = `rgba(255, 170, 40, ${0.06 + 0.08 * t})`;
    ctx.fillRect(0, 0, WIDTH, HEIGHT);
    ctx.fillStyle = `rgba(255, 220, 170, ${0.88})`;
    ctx.font = "700 34px Segoe UI";
    ctx.fillText("STOP!", WIDTH - 170, 94);
  }

  function drawNearMissOverlay() {
    if (state.nearMissTimer <= 0) return;
    const t = clamp(state.nearMissTimer / NEAR_MISS.duration, 0, 1);

    ctx.fillStyle = `rgba(158, 165, 176, ${0.12 + 0.22 * t})`;
    ctx.fillRect(0, 0, WIDTH, HEIGHT);

    const fog = ctx.createRadialGradient(
      WIDTH * 0.5,
      HEIGHT * 0.5,
      120,
      WIDTH * 0.5,
      HEIGHT * 0.5,
      Math.max(WIDTH, HEIGHT) * 0.8
    );
    fog.addColorStop(0, `rgba(235, 238, 244, ${0.05 + 0.08 * t})`);
    fog.addColorStop(1, `rgba(48, 50, 56, ${0.24 + 0.25 * t})`);
    ctx.fillStyle = fog;
    ctx.fillRect(0, 0, WIDTH, HEIGHT);

    ctx.fillStyle = `rgba(28, 28, 32, ${0.18 + 0.22 * t})`;
    ctx.fillRect(0, 0, WIDTH, 46);
    ctx.fillRect(0, HEIGHT - 46, WIDTH, 46);
  }

  function drawDino() {
    const ducking = state.duckHeld && state.dino.onGround;
    const rect = dinoRect();
    drawNitroTrail(rect, ducking);

    if (!ilyaImageReady) {
      ctx.fillStyle = "#3e7f32";
      ctx.fillRect(rect.x, rect.y, rect.w, rect.h);
      return;
    }

    ctx.save();
    ctx.imageSmoothingEnabled = true;
    if (ducking) {
      const cx = rect.x + rect.w * 0.5;
      const cy = rect.y + rect.h * 0.62;
      ctx.translate(cx, cy);
      ctx.rotate(-0.08);
      ctx.drawImage(ilyaImage, -rect.w * 0.55, -rect.h * 0.58, rect.w * 1.1, rect.h * 1.05);
    } else {
      ctx.drawImage(ilyaImage, rect.x, rect.y, rect.w, rect.h);
    }
    ctx.restore();
  }

  function drawFaceObstacle(obstacle) {
    const cx = obstacle.x + obstacle.w * 0.5;
    const cy = obstacle.y + obstacle.h * 0.5;
    const r = obstacle.w * 0.46;
    const ring = mixColor("#d8dde3", "#8f99a7", state.nightLevel);
    const glow = clamp(0.18 + Math.sin(state.time * 5 + obstacle.x * 0.01) * 0.08, 0.08, 0.32);

    ctx.save();
    ctx.translate(cx, cy);
    ctx.rotate(obstacle.angle);

    ctx.fillStyle = `rgba(200,220,255,${glow.toFixed(3)})`;
    ctx.beginPath();
    ctx.arc(0, 0, r + 8, 0, Math.PI * 2);
    ctx.fill();

    ctx.beginPath();
    ctx.arc(0, 0, r, 0, Math.PI * 2);
    ctx.clip();

    if (faceImageReady) {
      // Auto-crop to a square from the most face-friendly region.
      const srcW = faceImage.naturalWidth || faceImage.width;
      const srcH = faceImage.naturalHeight || faceImage.height;
      if (srcW > 0 && srcH > 0) {
        let sx = 0;
        let sy = 0;
        let crop = 0;
        if (srcW >= srcH) {
          crop = srcH;
          sx = (srcW - crop) * 0.5;
        } else {
          crop = srcW;
          sy = clamp((srcH - crop) * 0.14, 0, srcH - crop);
        }
        ctx.drawImage(faceImage, sx, sy, crop, crop, -r, -r, r * 2, r * 2);
      }
    } else {
      ctx.fillStyle = "#c8c8c8";
      ctx.fillRect(-r, -r, r * 2, r * 2);
      ctx.fillStyle = "#555";
      ctx.fillRect(-r * 0.35, -r * 0.12, r * 0.18, r * 0.08);
      ctx.fillRect(r * 0.17, -r * 0.12, r * 0.18, r * 0.08);
      ctx.fillRect(-r * 0.24, r * 0.2, r * 0.48, r * 0.1);
    }

    ctx.restore();

    ctx.strokeStyle = ring;
    ctx.lineWidth = 3;
    ctx.beginPath();
    ctx.arc(cx, cy, r, 0, Math.PI * 2);
    ctx.stroke();
  }

  function drawObstacle(obstacle) {
    const ink = mixColor("#202124", "#f3f3f3", state.nightLevel);
    if (obstacle.kind === "bird") {
      const s = obstacle.w / 46;
      ctx.fillStyle = ink;
      const flap = Math.floor(state.time * 16) % 2;
      ctx.fillRect(obstacle.x + 7 * s, obstacle.y + 9 * s, 22 * s, 9 * s);
      ctx.fillRect(obstacle.x + 29 * s, obstacle.y + 5 * s, 8 * s, 8 * s);
      if (flap === 0) {
        ctx.fillRect(obstacle.x, obstacle.y + 12 * s, 14 * s, 5 * s);
        ctx.fillRect(obstacle.x + 14 * s, obstacle.y + 3 * s, 12 * s, 4 * s);
      } else {
        ctx.fillRect(obstacle.x, obstacle.y + 8 * s, 14 * s, 5 * s);
        ctx.fillRect(obstacle.x + 14 * s, obstacle.y + 15 * s, 12 * s, 4 * s);
      }
      return;
    }

    if (obstacle.kind === "face") {
      drawFaceObstacle(obstacle);
      return;
    }

    if (obstacle.kind === "small") {
      drawStickerCactus(obstacle.x - 4, obstacle.y, 1.15);
      return;
    }

    if (obstacle.kind === "tall") {
      drawStickerCactus(obstacle.x - 3, obstacle.y, 1.45);
      return;
    }

    if (obstacle.kind === "cluster") {
      drawStickerCactus(obstacle.x - 6, obstacle.y, 1.3);
      drawStickerCactus(obstacle.x + 25, obstacle.y + 12, 1.1);
      return;
    }

    if (obstacle.kind === "triple") {
      drawStickerCactus(obstacle.x - 8, obstacle.y + 11, 1.05);
      drawStickerCactus(obstacle.x + 22, obstacle.y, 1.22);
      drawStickerCactus(obstacle.x + 54, obstacle.y + 11, 1.05);
      return;
    }
  }

  function render() {
    drawSky();
    for (const cloud of state.clouds) drawCloud(cloud);
    drawHills();
    drawBillboards();
    drawGround();
    drawSnow();
    for (const obstacle of state.obstacles) drawObstacle(obstacle);
    drawDino();
    drawNitroOverlay();
    drawStopOverlay();
    drawNearMissOverlay();

    if (!state.started && !state.gameOver && !state.menuVisible) {
      const ink = mixColor("#666666", "#dcdcdc", state.nightLevel);
      ctx.fillStyle = ink;
      ctx.font = "600 34px Segoe UI";
      ctx.textAlign = "center";
      ctx.fillText("Press Space to start", WIDTH / 2, HEIGHT * 0.22);
      ctx.textAlign = "start";
    }

    if (state.scoreFlash > 0) {
      const alpha = clamp(state.scoreFlash * 4.2, 0, 0.55);
      ctx.fillStyle = `rgba(255,255,255,${alpha})`;
      ctx.fillRect(0, 0, WIDTH, HEIGHT);
    }

    if (state.gameOver) {
      if (davidImageReady) {
        const srcW = davidImage.naturalWidth || davidImage.width;
        const srcH = davidImage.naturalHeight || davidImage.height;
        if (srcW > 0 && srcH > 0) {
          const scale = Math.max(WIDTH / srcW, HEIGHT / srcH) * 0.82;
          const drawW = srcW * scale;
          const drawH = srcH * scale;
          const drawX = WIDTH - drawW - 36;
          const drawY = HEIGHT - drawH;
          ctx.drawImage(davidImage, drawX, drawY, drawW, drawH);
        }
      }

      ctx.fillStyle = "#ffffff";
      ctx.font = "700 92px Segoe UI";
      ctx.textAlign = "start";
      ctx.shadowColor = "rgba(0, 0, 0, 0.55)";
      ctx.shadowBlur = 10;
      ctx.fillText("GAME", 12, 108);
      ctx.fillText("OVER", 12, 206);
      ctx.shadowColor = "transparent";
      ctx.shadowBlur = 0;
    }
  }

  let lastTime = performance.now();
  function frame(time) {
    const dt = Math.min(0.033, (time - lastTime) / 1000);
    lastTime = time;
    update(dt);
    render();
    requestAnimationFrame(frame);
  }

  window.addEventListener("resize", resizeCanvas, { passive: true });
  document.addEventListener("fullscreenchange", () => {
    updateVideoButtons();
    resizeCanvas();
  });
  document.addEventListener("webkitfullscreenchange", () => {
    updateVideoButtons();
    resizeCanvas();
  });
  window.addEventListener("keydown", keyDown);
  window.addEventListener("keyup", keyUp);

  canvas.addEventListener("contextmenu", (event) => {
    event.preventDefault();
  });

  canvas.addEventListener("mousedown", (event) => {
    unlockAudio();
    if (state.menuVisible) return;
    if (event.button !== 2) return;
    event.preventDefault();
    if (state.gameOver) {
      restartGame();
      return;
    }
    if (!state.started) state.started = true;
    queueJump();
  });

  boostBtn.addEventListener("click", () => {
    unlockAudio();
    if (state.menuVisible) return;
    if (!state.started && !state.gameOver) state.started = true;
    triggerFartBoost();
  });

  nitroBtn.addEventListener("click", () => {
    unlockAudio();
    if (state.menuVisible) return;
    if (!state.started && !state.gameOver) state.started = true;
    triggerNitro();
  });

  stopBtn.addEventListener("click", () => {
    unlockAudio();
    if (state.menuVisible) return;
    if (!state.started && !state.gameOver) state.started = true;
    triggerStop();
  });

  restartBtn.addEventListener("click", () => {
    unlockAudio();
    restartGame();
  });

  if (menuPlayBtn) {
    menuPlayBtn.addEventListener("click", () => {
      unlockAudio();
      startFromMenu();
    });
  }

  if (menuSettingsBtn) {
    menuSettingsBtn.addEventListener("click", () => {
      unlockAudio();
      setMenuView("settings");
    });
  }

  if (menuShopBtn) {
    menuShopBtn.addEventListener("click", () => {
      unlockAudio();
      setMenuView("shop");
    });
  }

  if (menuSettingsBackBtn) {
    menuSettingsBackBtn.addEventListener("click", () => {
      unlockAudio();
      setMenuView("main");
    });
  }

  if (menuShopBackBtn) {
    menuShopBackBtn.addEventListener("click", () => {
      unlockAudio();
      setMenuView("main");
    });
  }

  if (menuSoundOffBtn) {
    menuSoundOffBtn.addEventListener("click", () => {
      unlockAudio();
      setSoundEnabled(false);
    });
  }

  if (menuSoundOnBtn) {
    menuSoundOnBtn.addEventListener("click", () => {
      unlockAudio();
      setSoundEnabled(true);
    });
  }

  if (menuVideoWindowBtn) {
    menuVideoWindowBtn.addEventListener("click", () => {
      unlockAudio();
      setVideoMode("window");
    });
  }

  if (menuVideoFullBtn) {
    menuVideoFullBtn.addEventListener("click", () => {
      unlockAudio();
      setVideoMode("fullscreen");
    });
  }

  if (shopSkinBtn) {
    shopSkinBtn.addEventListener("click", () => {
      if (menuHintEl) menuHintEl.textContent = "Скин Илья Pro скоро появится в магазине.";
    });
  }

  if (shopTrailBtn) {
    shopTrailBtn.addEventListener("click", () => {
      if (menuHintEl) menuHintEl.textContent = "Эффект Огонь скоро появится в магазине.";
    });
  }

  if (shopPackBtn) {
    shopPackBtn.addEventListener("click", () => {
      if (menuHintEl) menuHintEl.textContent = "Пак Meme SFX скоро появится в магазине.";
    });
  }

  updateSoundButtons();
  updateVideoButtons();
  resizeCanvas();
  restartGame({ showMenu: true });
  requestAnimationFrame(frame);
})();
