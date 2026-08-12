document.addEventListener("DOMContentLoaded", function () {
  const cake = document.querySelector(".cake");
  const relightBtn = document.getElementById("relightBtn");
  const confettiCanvas = document.getElementById("confettiCanvas");
  const burnText = document.getElementById("burnText");

  const FIXED_CANDLE_COUNT = 19;
  let candles = [];
  let audioContext;
  let analyser;
  let microphone;
  let burnTextTimeout = null;

  /* ================= Confetti Particle System ================= */
  let particles = [];
  let animationFrameId = null;

  function resizeCanvas() {
    if (confettiCanvas) {
      confettiCanvas.width = window.innerWidth;
      confettiCanvas.height = window.innerHeight;
    }
  }
  window.addEventListener("resize", resizeCanvas);
  resizeCanvas();

  function triggerConfetti() {
    if (!confettiCanvas) return;
    const ctx = confettiCanvas.getContext("2d");
    const cakeRect = cake.getBoundingClientRect();
    const originX = cakeRect.left + cakeRect.width / 2;
    const originY = cakeRect.top + cakeRect.height / 3;

    // Romantic crimson, rose, cream, gold palette
    const colors = [
      "#B01030", "#8A0A22", "#D94868",  // Crimson & rose reds
      "#F4A0B5", "#E87090", "#FFC4CC",  // Blush pinks
      "#FFD700", "#FFB830", "#FF9040",  // Gold & amber
      "#FFF8F2", "#F0E0D8", "#FFFFFF"   // Cream & white
    ];

    for (let i = 0; i < 75; i++) {
      const angle = Math.random() * Math.PI * 2;
      const speed = Math.random() * 13 + 5;
      particles.push({
        x: originX,
        y: originY,
        vx: Math.cos(angle) * speed * (Math.random() > 0.5 ? 1 : -1) * 0.85,
        vy: -Math.abs(Math.sin(angle) * speed) - 4,
        sizeWidth: Math.random() * 11 + 5,
        sizeHeight: Math.random() * 7 + 4,
        color: colors[Math.floor(Math.random() * colors.length)],
        rotation: Math.random() * 360,
        rotSpeed: (Math.random() - 0.5) * 14,
        gravity: 0.32,
        drag: 0.979,
        life: 1.0,
        decay: Math.random() * 0.013 + 0.009
      });
    }

    if (!animationFrameId) {
      updateAndDrawParticles(ctx);
    }
  }

  function updateAndDrawParticles(ctx) {
    ctx.clearRect(0, 0, confettiCanvas.width, confettiCanvas.height);

    for (let i = particles.length - 1; i >= 0; i--) {
      const p = particles[i];
      p.vx *= p.drag;
      p.vy *= p.drag;
      p.vy += p.gravity;
      p.x += p.vx;
      p.y += p.vy;
      p.rotation += p.rotSpeed;
      p.life -= p.decay;

      if (p.life <= 0 || p.y > confettiCanvas.height) {
        particles.splice(i, 1);
        continue;
      }

      ctx.save();
      ctx.translate(p.x, p.y);
      ctx.rotate((p.rotation * Math.PI) / 180);
      ctx.globalAlpha = Math.max(0, p.life);
      ctx.fillStyle = p.color;
      ctx.fillRect(-p.sizeWidth / 2, -p.sizeHeight / 2, p.sizeWidth, p.sizeHeight);
      ctx.restore();
    }

    if (particles.length > 0) {
      animationFrameId = requestAnimationFrame(() => updateAndDrawParticles(ctx));
    } else {
      animationFrameId = null;
      ctx.clearRect(0, 0, confettiCanvas.width, confettiCanvas.height);
    }
  }

  /* ================= Burn Text Animation ================= */
  function hideBurnText() {
    if (burnTextTimeout) {
      clearTimeout(burnTextTimeout);
      burnTextTimeout = null;
    }
    if (burnText) {
      burnText.classList.remove("burning");
      burnText.classList.add("hidden");
    }
  }

  function showBurnText() {
    if (!burnText) return;

    hideBurnText();
    // Force reflow to restart animation
    void burnText.offsetWidth;
    burnText.classList.remove("hidden");
    burnText.classList.add("burning");

    // Hide after animation ends (5s defined in CSS)
    burnTextTimeout = setTimeout(() => {
      hideBurnText();
    }, 5000);
  }

  /* ================= Candle State Logic ================= */
  function countLitCandles() {
    return candles.filter((c) => !c.classList.contains("out")).length;
  }

  function relightAllCandles() {
    candles.forEach((candle) => candle.classList.remove("out"));
    hideBurnText();
  }

  if (relightBtn) {
    relightBtn.addEventListener("click", function (e) {
      e.stopPropagation();
      relightAllCandles();
    });
  }

  /* ================= Candle Position Calculation ================= */
  function calculate19CandlePositions() {
    const positions = [];
    const centerX = 50;
    const centerY = 24;

    // Center candle (1)
    positions.push({ x: centerX, y: centerY });

    // Inner ring (6 candles)
    const innerCount = 6;
    const innerRx = 18;
    const innerRy = 7;
    for (let i = 0; i < innerCount; i++) {
      const angle = (i * 2 * Math.PI) / innerCount;
      positions.push({
        x: centerX + innerRx * Math.cos(angle),
        y: centerY + innerRy * Math.sin(angle),
      });
    }

    // Outer ring (12 candles)
    const outerCount = 12;
    const outerRx = 35;
    const outerRy = 13.5;
    const offsetAngle = Math.PI / 12;
    for (let j = 0; j < outerCount; j++) {
      const angle = (j * 2 * Math.PI) / outerCount + offsetAngle;
      positions.push({
        x: centerX + outerRx * Math.cos(angle),
        y: centerY + outerRy * Math.sin(angle),
      });
    }

    return positions;
  }

  function createCandle(posX, posY, zIndex) {
    const candle = document.createElement("div");
    candle.className = "candle";
    candle.style.left = posX + "%";
    candle.style.top = posY + "%";
    candle.style.zIndex = zIndex;

    const flame = document.createElement("div");
    flame.className = "flame";
    candle.appendChild(flame);

    // Click: extinguish if lit (with confetti), relight if out
    candle.addEventListener("click", function (e) {
      e.stopPropagation();
      if (!candle.classList.contains("out")) {
        candle.classList.add("out");
        triggerConfetti();
        // Show burn text if all candles are now out
        if (countLitCandles() === 0) {
          setTimeout(showBurnText, 400);
        }
      } else {
        candle.classList.remove("out");
        hideBurnText();
      }
    });

    cake.appendChild(candle);
    return candle;
  }

  function init19Candles() {
    candles.forEach((c) => c.remove());
    candles = [];

    const positions = calculate19CandlePositions();
    positions.forEach((pos) => {
      const zIndex = Math.floor(pos.y * 10) + 10;
      const candle = createCandle(pos.x, pos.y, zIndex);
      candles.push(candle);
    });
  }

  // Initialize 19 fixed candles
  init19Candles();

  /* ================= Microphone Blow Detection ================= */
  function isBlowing() {
    if (!analyser) return false;
    const bufferLength = analyser.frequencyBinCount;
    const dataArray = new Uint8Array(bufferLength);
    analyser.getByteFrequencyData(dataArray);

    let sum = 0;
    for (let i = 0; i < bufferLength; i++) sum += dataArray[i];
    return (sum / bufferLength) > 40;
  }

  function blowOutCandles() {
    let blownOut = 0;

    if (isBlowing()) {
      candles.forEach((candle) => {
        if (!candle.classList.contains("out") && Math.random() > 0.5) {
          candle.classList.add("out");
          blownOut++;
        }
      });
    }

    if (blownOut > 0) {
      triggerConfetti();
      // Show burn text when all candles blown out
      if (countLitCandles() === 0) {
        setTimeout(showBurnText, 400);
      }
    }
  }

  function initAudioMicrophone() {
    if (navigator.mediaDevices && navigator.mediaDevices.getUserMedia) {
      navigator.mediaDevices
        .getUserMedia({ audio: true })
        .then(function (stream) {
          audioContext = new (window.AudioContext || window.webkitAudioContext)();
          if (audioContext.state === "suspended") audioContext.resume();
          analyser = audioContext.createAnalyser();
          microphone = audioContext.createMediaStreamSource(stream);
          microphone.connect(analyser);
          analyser.fftSize = 256;
          setInterval(blowOutCandles, 200);
        })
        .catch(function (err) {
          console.log("Microphone access notice: " + err.message);
        });
    } else {
      console.log("getUserMedia not supported on this browser.");
    }
  }

  initAudioMicrophone();

  // Resume AudioContext on first gesture
  document.body.addEventListener("click", function () {
    if (audioContext && audioContext.state === "suspended") {
      audioContext.resume();
    }
  }, { once: true });
});
