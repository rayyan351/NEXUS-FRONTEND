import React, { useEffect, useRef, useMemo } from "react";
import { motion } from "framer-motion"; // kept in case you use elsewhere; not required for cards now
import {
  Target, Heart, Lightbulb, Globe, Zap, TrendingUp, Users, Mail,
  Sparkles, DollarSign, Clock, ArrowUpRight, LineChart, Rocket
} from "lucide-react";
import "../styles/premium-process-timeline.css";

/* ============== tiny media query hook ============== */
function useMediaQuery(query) {
  const mql = useMemo(() => (typeof window !== "undefined" ? window.matchMedia(query) : null), [query]);
  const [matches, setMatches] = React.useState(mql ? mql.matches : false);
  useEffect(() => {
    if (!mql) return;
    const onChange = (e) => setMatches(e.matches);
    mql.addEventListener?.("change", onChange);
    setMatches(mql.matches);
    return () => mql.removeEventListener?.("change", onChange);
  }, [mql]);
  return matches;
}

/* ============== Particle rain (perf-optimized, colored sprites) ============== */
function ParticleRainBackground({
  className = "",
  colors = ["#00aeef", "#a44de4"],
  count = 36,
  speed = [12, 22],
  size = [0.45, 0.9],   // tiny sparkles
  blur = 4,
  opacity = 0.35,
  wind = 1.0,
  emit = "both"
}) {
  const hostRef = React.useRef(null);
  const rafRef = React.useRef();
  const particlesRef = React.useRef([]);
  const lastRef = React.useRef(performance.now());
  const boundsRef = React.useRef({ w: 0, h: 0 });
  const visibleRef = React.useRef(true);
  const fpsTargetRef = React.useRef(60);
  const spriteCacheRef = React.useRef(new Map()); // color -> {canvas,size}

  const rand = (a,b)=> a + Math.random()*(b-a);
  const pick = (arr)=> arr[(Math.random()*arr.length)|0];

  const makeSprite = React.useCallback((r = 0.6, b = 4, color = "#00aeef") => {
    const pad = Math.ceil(b * 2.2);
    const S = Math.ceil(r * 2 + pad * 2);
    const c = document.createElement("canvas");
    c.width = S; c.height = S;
    const ctx = c.getContext("2d");
    const cx = S / 2, cy = S / 2;

    const g = ctx.createRadialGradient(cx, cy, r * 0.25, cx, cy, Math.max(r, b) + pad / 2);
    g.addColorStop(0.0, color);
    g.addColorStop(0.35, color);
    g.addColorStop(1.0, "rgba(0,0,0,0)");

    ctx.globalCompositeOperation = "source-over";
    ctx.globalAlpha = 0.95;
    ctx.fillStyle = g;
    ctx.beginPath();
    ctx.arc(cx, cy, Math.max(r, b) + pad / 2, 0, Math.PI * 2);
    ctx.fill();

    ctx.globalAlpha = 1;
    ctx.fillStyle = color;
    ctx.beginPath();
    ctx.arc(cx, cy, r, 0, Math.PI * 2);
    ctx.fill();

    return { canvas: c, size: S };
  }, []);

  React.useEffect(() => {
    const host = hostRef.current;
    if (!host) return;

    const canvas = document.createElement("canvas");
    canvas.style.width = "100%";
    canvas.style.height = "100%";
    canvas.style.display = "block";
    canvas.style.pointerEvents = "none";
    canvas.style.mixBlendMode = "normal";
    host.appendChild(canvas);
    const ctx = canvas.getContext("2d", { alpha: true, desynchronized: true });
    ctx.imageSmoothingEnabled = true;

    const seed = () => {
      const w = host.clientWidth || 1;
      const h = host.clientHeight || 1;
      const dpr = Math.min(window.devicePixelRatio || 1, 1.5); // cap DPR
      canvas.width = Math.floor(w * dpr);
      canvas.height = Math.floor(h * dpr);
      ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
      boundsRef.current = { w, h };

      const wantTop = emit === "top" || emit === "both";
      const wantBottom = emit === "bottom" || emit === "both";
      const topCount = wantTop && wantBottom ? Math.floor(count/2) : (wantTop ? count : 0);
      const bottomCount = wantBottom && wantTop ? count - topCount : (wantBottom ? count : 0);

      const P = [];
      for (let i = 0; i < topCount; i++) {
        P.push({
          dir: 1,
          x: Math.random()*w,
          y: rand(-h*0.25, 0),
          r: rand(size[0], size[1]),
          vy: rand(speed[0], speed[1]),
          vx: (Math.random()*2-1) * wind,
          c: pick(colors),
          a: opacity * rand(0.7, 1)
        });
      }
      for (let i = 0; i < bottomCount; i++) {
        P.push({
          dir: -1,
          x: Math.random()*w,
          y: rand(h, h*1.25),
          r: rand(size[0], size[1]),
          vy: rand(speed[0], speed[1]),
          vx: (Math.random()*2-1) * wind,
          c: pick(colors),
          a: opacity * rand(0.7, 1)
        });
      }
      particlesRef.current = P;

      spriteCacheRef.current.clear();
      colors.forEach(col => {
        spriteCacheRef.current.set(col, makeSprite(Math.max(0.5, (size[0] + size[1]) * 0.35), blur, col));
      });
    };

    const ro = new ResizeObserver(seed);
    ro.observe(host);
    seed();

    const io = new IntersectionObserver(([e]) => { visibleRef.current = !!e.isIntersecting; }, { threshold: 0.01 });
    io.observe(host);

    const onVis = () => { fpsTargetRef.current = document.hidden ? 30 : 60; };
    document.addEventListener("visibilitychange", onVis);

    const prefersReduced =
      window.matchMedia &&
      window.matchMedia("(prefers-reduced-motion: reduce)").matches;

    let acc = 0;
    const tick = (t) => {
      const dt = Math.min(0.05, (t - lastRef.current)/1000);
      lastRef.current = t;

      if (!visibleRef.current || prefersReduced) {
        rafRef.current = requestAnimationFrame(tick);
        return;
      }

      acc += dt;
      const targetStep = 1 / fpsTargetRef.current;
      if (acc < targetStep) { rafRef.current = requestAnimationFrame(tick); return; }
      acc = 0;

      const { w, h } = boundsRef.current;

      ctx.globalCompositeOperation = "source-over";
      ctx.clearRect(0, 0, w, h);

      ctx.globalCompositeOperation = "lighter";

      for (const p of particlesRef.current) {
        p.y += p.dir * p.vy * dt * 60;
        p.x += p.vx * dt * 60;

        if (p.x < -20) p.x = w + 20;
        if (p.x > w + 20) p.x = -20;

        if (p.dir === 1 && p.y - p.r > h) { p.y = -p.r; p.x = Math.random()*w; }
        if (p.dir === -1 && p.y + p.r < 0) { p.y = h + p.r; p.x = Math.random()*w; }

        const spr = spriteCacheRef.current.get(p.c);
        if (spr) {
          const S = spr.size;
          const half = S / 2;
          ctx.globalAlpha = p.a;
          ctx.drawImage(spr.canvas, p.x - half, p.y - half, S, S);
        }
      }

      rafRef.current = requestAnimationFrame(tick);
    };

    if (!prefersReduced) {
      lastRef.current = performance.now();
      rafRef.current = requestAnimationFrame(tick);
    }

    return () => {
      if (rafRef.current) cancelAnimationFrame(rafRef.current);
      ro.disconnect();
      io.disconnect();
      document.removeEventListener("visibilitychange", onVis);
      try { host.removeChild(canvas); } catch {}
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [colors.join(","), count, speed[0], speed[1], size[0], size[1], blur, opacity, wind, emit]);

  return <div ref={hostRef} className={`particles-layer ${className}`} />;
}

/* ===================== content ===================== */
const ITEMS = [
  { title: "ROAD MAP TOWARDS SUCCESS", icon: Heart },
  { title: "Our Core Purpose", description: "To drive your growth and revenue by strategically securing your ideal customers.", icon: Target },
  { title: "Our Expertise", description: "We take on the full complexity of modern marketing on your behalf.", icon: Lightbulb },
  { title: "Brand-Centric Web Presence", description: "Building a website that perfectly reflects and complements your brand.", icon: Globe },
  { title: "Lead Generation Engine", description: "Strategic META funnels that convert casual visitors into qualified leads and loyal buyers.", icon: Zap },
  { title: "High-Impact Advertising", description: "Expert, high-converting ad creatives that consistently amplify your ROI.", icon: TrendingUp },
  { title: "Exemplary Campaign Management", description: "Strategists build and run flawlessly executed marketing campaigns.", icon: Users },
  { title: "Continuous Nurturing", description: "Targeted content distribution and email marketing to strengthen connections.", icon: Mail },
  { title: "The Ultimate Result", description: "A seamless, all-in-one growth engine, fine-tuned exclusively for META platforms.", icon: Sparkles },
  { title: "Maximize Your ROI", description: "An elite team architects high-conversion systems that deliver a definitive return on investment.", icon: DollarSign },
  { title: "Reclaim Your Time & Resources", description: "We remove marketing complexity so you can focus on core operations.", icon: Clock },
  { title: "Consistent Lead Pipeline", description: "An engine designed to deliver a steady, qualified stream of potential customers.", icon: ArrowUpRight },
  { title: "Amplify Sales & Brand Equity", description: "We drive immediate revenue and cultivate lasting brand value and presence.", icon: LineChart },
  { title: "Profitable, Sustainable Growth", description: "A holistic approach that scales on a solid, enduring foundation.", icon: Rocket },
];

const pair = (arr) => {
  const out = [];
  for (let i = 0; i < arr.length; i += 2) out.push(arr.slice(i, i + 2));
  return out;
};

/* === Glass Card (no scroll-triggered animations) === */
function GlassCard({ side = "left", data }) {
  const Icon = data.icon || Sparkles;

  const onMove = (e) => {
    const el = e.currentTarget;
    const r = el.getBoundingClientRect();
    el.style.setProperty("--mx", `${e.clientX - r.left}px`);
    el.style.setProperty("--my", `${e.clientY - r.top}px`);
  };

  return (
    <article
      className={`pptr3-card ${side}`}
      onMouseMove={onMove}
    >
      <div className="pptr3-top">
        <span className="pptr3-pill">
          <Icon size={18} />
        </span>
        <div>
          <h3 className="pptr3-title">{data.title}</h3>
        </div>
      </div>
      <p className="pptr3-desc">{data.description}</p>
      <span className="pptr3-blob" aria-hidden />
    </article>
  );
}

/* mobile step badge */
const StepChip = ({ n }) => (
  <div className="pptr3-stepchip pptr3-stepchip--center">
    <span>{String(n).padStart(2, "0")}</span>
  </div>
);

export default function PremiumProcessTimeline() {
  const isMobile = useMediaQuery("(max-width: 820px)");
  const rows = pair(ITEMS);
  const particleCount = isMobile ? 18 : 36;

  return (
    <section id="process" className={`pptr3-section section-with-particles ${isMobile ? "pptr3-mobile-mode" : ""}`}>
      <ParticleRainBackground
        colors={["#00aeef", "#a44de4"]}
        emit="both"
        count={particleCount}
        speed={isMobile ? [1, 1] : [1, 1]}
        size={isMobile ? [0.4, 0.7] : [0.45, 0.9]}
        opacity={isMobile ? 0.30 : 0.35}
        wind={isMobile ? 0.6 : 1.0}
        blur={4}
      />

      <div className="pptr3-wrap">
        <header className="pptr3-header">
          <h2 className="growth-heading">
            The RoadHouse Process<br />
            <span>How We Scale Your Brand</span>
          </h2>
          <p className="growth-subtext">
            We drive your growth and revenue by securing your ideal customers — and we handle the full complexity of modern marketing for you.
          </p>
        </header>

        {isMobile ? (
          <div className="pptr3-mobile-rail">
            {ITEMS.map((item, i) => (
              <div className="pptr3-mrow" key={i}>
                <StepChip n={i + 1} />
                <div className="pptr3-mrow-connector" aria-hidden />
                <GlassCard side="mobile" data={item} />
              </div>
            ))}
          </div>
        ) : (
          <>
            <div className="pptr3-spine" aria-hidden />
            <div className="pptr3-grid">
              {rows.map((pr, rIndex) => {
                const leftIndex = rIndex * 2 + 1;
                const rightIndex = rIndex * 2 + 2;
                const leftData = pr[0];
                const rightData = pr[1];
                return (
                  <div className="pptr3-row" key={rIndex}>
                    {leftData ? <GlassCard side="left" data={leftData} /> : <div />}
                    <div className="pptr3-center">
                      <div className="pptr3-node left">
                        <span className="num">{String(leftIndex).padStart(2, "0")}</span>
                        <span className="dot" />
                        <span className="arm left" />
                      </div>
                      {rightData && (
                        <div className="pptr3-node right">
                          <span className="num">{String(rightIndex).padStart(2, "0")}</span>
                          <span className="dot" />
                          <span className="arm right" />
                        </div>
                      )}
                    </div>
                    {rightData ? <GlassCard side="right" data={rightData} /> : <div />}
                  </div>
                );
              })}
            </div>
          </>
        )}
      </div>
    </section>
  );
}
