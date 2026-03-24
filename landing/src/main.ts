// ---- Typewriter effect ----
const typewriterEl = document.querySelector(".typewriter-text");
if (typewriterEl) {
  interface Phrase {
    plain: string;       // plain text for character counting
    build: (len: number) => string;  // returns HTML for first `len` chars
  }

  function makePhrase(before: string, highlight: string, after: string): Phrase {
    const plain = before + highlight + after;
    return {
      plain,
      build(len: number) {
        let out = "";
        const bLen = before.length;
        const hLen = highlight.length;
        if (len <= bLen) {
          out = before.slice(0, len);
        } else if (len <= bLen + hLen) {
          out = before + '<span class="text-gradient">' + highlight.slice(0, len - bLen) + "</span>";
        } else {
          out = before + '<span class="text-gradient">' + highlight + "</span>" + after.slice(0, len - bLen - hLen);
        }
        return out.replace(/\n/g, "<br />");
      },
    };
  }

  const phrases: Phrase[] = [
    makePhrase("Bring ", "Bitcoin", "\nto your app in minutes"),
    makePhrase("Bring your app\n", "Onchain", " in minutes"),
    makePhrase("The complete\n", "Money Toolkit", " for your app"),
  ];
  const typeSpeed = 40;
  const eraseSpeed = 25;
  const holdTime = 3000;
  let phraseIdx = 0;

  async function sleep(ms: number) {
    return new Promise((r) => setTimeout(r, ms));
  }

  async function typePhrase(phrase: Phrase) {
    for (let i = 0; i <= phrase.plain.length; i++) {
      typewriterEl!.innerHTML = phrase.build(i);
      await sleep(typeSpeed);
    }
  }

  async function erasePhrase(phrase: Phrase) {
    for (let i = phrase.plain.length; i >= 0; i--) {
      typewriterEl!.innerHTML = phrase.build(i);
      await sleep(eraseSpeed);
    }
  }

  async function loop() {
    while (true) {
      const p = phrases[phraseIdx];
      await typePhrase(p);
      await sleep(holdTime);
      await erasePhrase(p);
      await sleep(300);
      phraseIdx = (phraseIdx + 1) % phrases.length;
    }
  }

  loop();
}

// ---- Copy button ----
const NPM_CMD = "npm install starkzap";
const copyBtn = document.getElementById("copy-btn");

if (copyBtn) {
  copyBtn.addEventListener("click", async () => {
    try {
      await navigator.clipboard.writeText(NPM_CMD);
      copyBtn.textContent = "Copied!";
      copyBtn.classList.add("copied");
      setTimeout(() => {
        copyBtn.textContent = "Copy";
        copyBtn.classList.remove("copied");
      }, 2000);
    } catch {
      copyBtn.textContent = "Copy failed";
      setTimeout(() => {
        copyBtn.textContent = "Copy";
      }, 2000);
    }
  });
}

// ---- Comparison toggle ----
document.querySelectorAll<HTMLButtonElement>(".toggle-btn").forEach((btn) => {
  btn.addEventListener("click", () => {
    const view = btn.dataset.view;
    document.querySelectorAll(".toggle-btn").forEach((b) => b.classList.remove("active"));
    btn.classList.add("active");
    document.querySelectorAll(".compare-view").forEach((v) => v.classList.remove("active"));
    document.getElementById(`view-${view}`)?.classList.add("active");
  });
});

// ---- Sparkle particles ----
const canvas = document.getElementById("sparkles") as HTMLCanvasElement | null;
if (canvas) {
  const ctx = canvas.getContext("2d")!;
  let w = (canvas.width = window.innerWidth);
  let h = (canvas.height = window.innerHeight);

  interface Particle {
    x: number;
    y: number;
    size: number;
    speed: number;
    opacity: number;
    flicker: number;
    phase: number;
  }

  const particles: Particle[] = [];
  const COUNT = 60;

  for (let i = 0; i < COUNT; i++) {
    particles.push({
      x: Math.random() * w,
      y: Math.random() * h,
      size: Math.random() * 2 + 0.5,
      speed: Math.random() * 0.3 + 0.1,
      opacity: Math.random() * 0.6 + 0.2,
      flicker: Math.random() * 0.02 + 0.005,
      phase: Math.random() * Math.PI * 2,
    });
  }

  function draw(t: number) {
    ctx.clearRect(0, 0, w, h);

    for (const p of particles) {
      p.y -= p.speed;
      p.phase += p.flicker;

      if (p.y < -10) {
        p.y = h + 10;
        p.x = Math.random() * w;
      }

      const flicker = Math.sin(t * 0.002 + p.phase) * 0.3 + 0.7;
      const alpha = p.opacity * flicker;

      // Warm sparkle color matching brand orange
      ctx.fillStyle = `rgba(249, 180, 120, ${alpha})`;
      ctx.beginPath();
      ctx.arc(p.x, p.y, p.size, 0, Math.PI * 2);
      ctx.fill();

      // Tiny glow
      if (p.size > 1.2) {
        ctx.fillStyle = `rgba(249, 115, 22, ${alpha * 0.3})`;
        ctx.beginPath();
        ctx.arc(p.x, p.y, p.size * 3, 0, Math.PI * 2);
        ctx.fill();
      }
    }

    requestAnimationFrame(draw);
  }

  requestAnimationFrame(draw);

  window.addEventListener("resize", () => {
    w = canvas.width = window.innerWidth;
    h = canvas.height = window.innerHeight;
  });
}
