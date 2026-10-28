import React, { useEffect, useRef, useState, useCallback } from 'react';
import { FireworksSpeed } from '../types';
import { sound } from '../utils/soundEffects';
import { Sparkles, Zap, Clock, Rocket, Plus } from 'lucide-react';
import confetti from 'canvas-confetti';

interface FireworksOverlayProps {
  isActive: boolean;
  speed?: FireworksSpeed;
  duration?: number; // duration in seconds
  onComplete?: () => void;
  onUpdateSettings?: (speed: FireworksSpeed, duration: number) => void;
  showControls?: boolean;
}

// Physics structures
interface FireworkRocket {
  id: number;
  x: number;
  y: number;
  targetY: number;
  vx: number;
  vy: number;
  color: string;
  size: number;
  trail: { x: number; y: number; alpha: number }[];
  pattern: 'peony' | 'willow' | 'ring' | 'heart' | 'strobe';
}

interface FireworkParticle {
  x: number;
  y: number;
  vx: number;
  vy: number;
  color: string;
  alpha: number;
  decay: number;
  gravity: number;
  drag: number;
  size: number;
  flicker: boolean;
  trail: { x: number; y: number }[];
}

const PALETTES = [
  ['#FF1361', '#FFF800', '#FF7A00', '#FFFFFF'], // Sunset Blaze
  ['#00F5D4', '#7B2CBF', '#FF007F', '#FFFFFF'], // Cyber Neon
  ['#FFD700', '#FFA500', '#FF4500', '#FFF5B8'], // Imperial Gold
  ['#10B981', '#38EF7D', '#11998E', '#FFFFFF'], // Emerald Glow
  ['#FF0055', '#FF5050', '#FF9999', '#FFE6E6'], // Ruby Heart
  ['#A855F7', '#EC4899', '#6366F1', '#38BDF8'], // Galaxy Dream
];

const SPEED_MULTIPLIERS: Record<FireworksSpeed, number> = {
  slow: 0.7,
  normal: 1.0,
  fast: 1.45,
  super: 2.1,
};

export const FireworksOverlay: React.FC<FireworksOverlayProps> = ({
  isActive,
  speed: initialSpeed = 'normal',
  duration: initialDuration = 5,
  onComplete,
  onUpdateSettings,
  showControls = true,
}) => {
  const canvasRef = useRef<HTMLCanvasElement | null>(null);

  const [currentSpeed, setCurrentSpeed] = useState<FireworksSpeed>(initialSpeed);
  const [currentDuration, setCurrentDuration] = useState<number>(initialDuration);
  const [showToolbar, setShowToolbar] = useState<boolean>(true);

  // Sync props
  useEffect(() => {
    setCurrentSpeed(initialSpeed);
  }, [initialSpeed]);

  useEffect(() => {
    setCurrentDuration(initialDuration);
  }, [initialDuration]);

  // Keep refs for animation loop
  const speedRef = useRef<FireworksSpeed>(currentSpeed);
  speedRef.current = currentSpeed;

  const durationRef = useRef<number>(currentDuration);
  durationRef.current = currentDuration;

  const rocketsRef = useRef<FireworkRocket[]>([]);
  const particlesRef = useRef<FireworkParticle[]>([]);
  const animFrameRef = useRef<number | null>(null);
  const launchTimerRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const finishTimeoutRef = useRef<ReturnType<typeof setTimeout>[]>([]);

  // Sound throttle to avoid audio congestion
  const lastBurstSoundTimeRef = useRef<number>(0);

  const createBurst = useCallback(
    (x: number, y: number, pattern: FireworkRocket['pattern'], baseColor: string) => {
      const palette = PALETTES[Math.floor(Math.random() * PALETTES.length)];
      const particles: FireworkParticle[] = [];

      const now = Date.now();
      if (now - lastBurstSoundTimeRef.current > 120) {
        lastBurstSoundTimeRef.current = now;
        sound.playFireworkBurst(0.9 + Math.random() * 0.3);
      }

      if (pattern === 'heart') {
        // Parametric heart curve
        const count = 75;
        for (let i = 0; i < count; i++) {
          const t = (Math.PI * 2 * i) / count;
          const hx = 16 * Math.pow(Math.sin(t), 3);
          const hy = -(13 * Math.cos(t) - 5 * Math.cos(2 * t) - 2 * Math.cos(3 * t) - Math.cos(4 * t));
          const vScale = 0.28 + Math.random() * 0.05;
          particles.push({
            x,
            y,
            vx: hx * vScale,
            vy: hy * vScale,
            color: '#FF1361',
            alpha: 1,
            decay: 0.012 + Math.random() * 0.008,
            gravity: 0.05,
            drag: 0.965,
            size: 3 + Math.random() * 2,
            flicker: true,
            trail: [],
          });
        }
      } else if (pattern === 'ring') {
        // Uniform circular ring shockwave
        const count = 65;
        const speed = 4.5 + Math.random() * 1.5;
        for (let i = 0; i < count; i++) {
          const angle = (Math.PI * 2 * i) / count;
          particles.push({
            x,
            y,
            vx: Math.cos(angle) * speed,
            vy: Math.sin(angle) * speed,
            color: palette[i % palette.length],
            alpha: 1,
            decay: 0.014 + Math.random() * 0.008,
            gravity: 0.07,
            drag: 0.96,
            size: 2.8 + Math.random() * 1.5,
            flicker: Math.random() > 0.5,
            trail: [],
          });
        }
      } else if (pattern === 'willow') {
        // Long lingering golden streamer willow
        const count = 90;
        for (let i = 0; i < count; i++) {
          const angle = Math.random() * Math.PI * 2;
          const speed = Math.random() * 5 + 1;
          particles.push({
            x,
            y,
            vx: Math.cos(angle) * speed,
            vy: Math.sin(angle) * speed,
            color: '#FFD700',
            alpha: 1,
            decay: 0.007 + Math.random() * 0.005, // very slow decay for willow
            gravity: 0.06,
            drag: 0.97,
            size: 2.2 + Math.random() * 1.5,
            flicker: true,
            trail: [],
          });
        }
      } else {
        // Standard Spherical Peony Burst
        const count = 85;
        for (let i = 0; i < count; i++) {
          const angle = Math.random() * Math.PI * 2;
          const speed = Math.random() * 6.5 + 1.2;
          particles.push({
            x,
            y,
            vx: Math.cos(angle) * speed,
            vy: Math.sin(angle) * speed,
            color: palette[Math.floor(Math.random() * palette.length)],
            alpha: 1,
            decay: 0.013 + Math.random() * 0.01,
            gravity: 0.09,
            drag: 0.958,
            size: 3 + Math.random() * 2,
            flicker: Math.random() > 0.4,
            trail: [],
          });
        }
      }

      particlesRef.current.push(...particles);

      // Light flash effect on canvas
      const canvas = canvasRef.current;
      if (canvas) {
        const ctx = canvas.getContext('2d');
        if (ctx) {
          const grad = ctx.createRadialGradient(x, y, 0, x, y, 160);
          grad.addColorStop(0, 'rgba(255, 255, 255, 0.45)');
          grad.addColorStop(0.3, baseColor + '44');
          grad.addColorStop(1, 'transparent');
          ctx.save();
          ctx.fillStyle = grad;
          ctx.beginPath();
          ctx.arc(x, y, 160, 0, Math.PI * 2);
          ctx.fill();
          ctx.restore();
        }
      }
    },
    []
  );

  const launchRocket = useCallback(
    (customX?: number, customTargetY?: number) => {
      const canvas = canvasRef.current;
      if (!canvas) return;

      const w = canvas.width;
      const h = canvas.height;
      const x = customX ?? w * 0.15 + Math.random() * (w * 0.7);
      const targetY = customTargetY ?? h * 0.15 + Math.random() * (h * 0.35);

      const patterns: FireworkRocket['pattern'][] = ['peony', 'willow', 'ring', 'heart', 'strobe'];
      const pattern = patterns[Math.floor(Math.random() * patterns.length)];

      const palette = PALETTES[Math.floor(Math.random() * PALETTES.length)];
      const color = palette[0];

      // Rocket initial upward velocity
      const distance = h - targetY;
      const vy = -Math.sqrt(2 * 0.18 * distance) * 0.95;
      const vx = (Math.random() - 0.5) * 2;

      rocketsRef.current.push({
        id: Math.random(),
        x,
        y: h,
        targetY,
        vx,
        vy,
        color,
        size: 3.5,
        trail: [],
        pattern,
      });

      sound.playFireworkLaunch(0.9 + Math.random() * 0.2);
    },
    []
  );

  // Manual burst of multiple rockets
  const launchSalvo = () => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const w = canvas.width;
    launchRocket(w * 0.25);
    launchRocket(w * 0.5);
    launchRocket(w * 0.75);

    // Also fire a confetti burst
    confetti({
      particleCount: 40,
      spread: 70,
      origin: { y: 0.6 },
      zIndex: 99999,
    });
  };

  const handleSpeedChange = (newSpeed: FireworksSpeed) => {
    setCurrentSpeed(newSpeed);
    if (onUpdateSettings) {
      onUpdateSettings(newSpeed, currentDuration);
    }
    sound.playSpinTick(1.3);
  };

  const handleDurationChange = (newDur: number) => {
    setCurrentDuration(newDur);
    if (onUpdateSettings) {
      onUpdateSettings(currentSpeed, newDur);
    }
    sound.playSpinTick(1.3);
  };

  // Main Animation & Physics Loop
  useEffect(() => {
    if (!isActive) {
      if (launchTimerRef.current) {
        clearInterval(launchTimerRef.current);
        launchTimerRef.current = null;
      }
      finishTimeoutRef.current.forEach(clearTimeout);
      finishTimeoutRef.current = [];
      rocketsRef.current = [];
      particlesRef.current = [];
      if (animFrameRef.current) {
        cancelAnimationFrame(animFrameRef.current);
        animFrameRef.current = null;
      }
      return;
    }

    const canvas = canvasRef.current;
    if (!canvas) return;

    // Handle high DPI resize
    const resizeCanvas = () => {
      canvas.width = window.innerWidth;
      canvas.height = window.innerHeight;
    };
    resizeCanvas();
    window.addEventListener('resize', resizeCanvas);

    // Initial instant salvo
    setTimeout(() => {
      launchRocket(window.innerWidth * 0.3);
      launchRocket(window.innerWidth * 0.7);
    }, 100);

    setTimeout(() => {
      launchRocket(window.innerWidth * 0.5);
    }, 450);

    // Continuous rocket launches for duration
    const speedMultiplier = SPEED_MULTIPLIERS[speedRef.current];
    const launchIntervalMs = Math.max(280, Math.floor(750 / speedMultiplier));

    launchTimerRef.current = setInterval(() => {
      launchRocket();
      if (Math.random() > 0.45) {
        setTimeout(() => launchRocket(), 150);
      }
    }, launchIntervalMs);

    // Stop launcher after chosen duration
    const durSeconds = durationRef.current;
    if (durSeconds > 0) {
      const tStop = setTimeout(() => {
        if (launchTimerRef.current) {
          clearInterval(launchTimerRef.current);
          launchTimerRef.current = null;
        }
      }, durSeconds * 1000);
      finishTimeoutRef.current.push(tStop);

      const tFinish = setTimeout(() => {
        if (onComplete) onComplete();
      }, (durSeconds + 2.5) * 1000);
      finishTimeoutRef.current.push(tFinish);
    }

    // Render loop
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    let isRunning = true;

    const render = () => {
      if (!isRunning) return;

      const currentMult = SPEED_MULTIPLIERS[speedRef.current];

      // Soft clear with trailing alpha
      ctx.globalCompositeOperation = 'destination-out';
      ctx.fillStyle = 'rgba(0, 0, 0, 0.22)';
      ctx.fillRect(0, 0, canvas.width, canvas.height);

      // Additive blend for radiant sparkling light
      ctx.globalCompositeOperation = 'lighter';

      // 1. Update & draw rockets
      const survivingRockets: FireworkRocket[] = [];
      for (const r of rocketsRef.current) {
        r.trail.push({ x: r.x, y: r.y, alpha: 1 });
        if (r.trail.length > 7) r.trail.shift();

        // Draw rocket spark trail
        ctx.strokeStyle = r.color;
        ctx.lineWidth = r.size * 0.8;
        ctx.beginPath();
        for (let i = 0; i < r.trail.length; i++) {
          const pt = r.trail[i];
          if (i === 0) ctx.moveTo(pt.x, pt.y);
          else ctx.lineTo(pt.x, pt.y);
        }
        ctx.stroke();

        // Draw glowing rocket tip
        ctx.fillStyle = '#FFFFFF';
        ctx.beginPath();
        ctx.arc(r.x, r.y, r.size, 0, Math.PI * 2);
        ctx.fill();

        // Physics step
        r.x += r.vx * currentMult;
        r.y += r.vy * currentMult;
        r.vy += 0.16 * currentMult; // rocket gravity deceleration

        // Check if rocket reached zenith or target
        if (r.vy >= -0.5 || r.y <= r.targetY) {
          createBurst(r.x, r.y, r.pattern, r.color);
        } else {
          survivingRockets.push(r);
        }
      }
      rocketsRef.current = survivingRockets;

      // 2. Update & draw particles
      const survivingParticles: FireworkParticle[] = [];
      for (const p of particlesRef.current) {
        p.trail.push({ x: p.x, y: p.y });
        if (p.trail.length > 4) p.trail.shift();

        // Draw particle spark trail
        ctx.strokeStyle = p.color;
        ctx.globalAlpha = Math.max(0, p.alpha * 0.6);
        ctx.lineWidth = Math.max(1, p.size * 0.7);
        ctx.beginPath();
        for (let i = 0; i < p.trail.length; i++) {
          const pt = p.trail[i];
          if (i === 0) ctx.moveTo(pt.x, pt.y);
          else ctx.lineTo(pt.x, pt.y);
        }
        ctx.stroke();

        // Draw spark head
        const flickerAlpha = p.flicker && Math.random() > 0.4 ? p.alpha * 0.4 : p.alpha;
        ctx.globalAlpha = Math.max(0, flickerAlpha);
        ctx.fillStyle = p.color;
        ctx.beginPath();
        ctx.arc(p.x, p.y, p.size, 0, Math.PI * 2);
        ctx.fill();

        // Physics step
        p.vx *= p.drag;
        p.vy *= p.drag;
        p.vy += p.gravity * currentMult;
        p.x += p.vx * currentMult;
        p.y += p.vy * currentMult;
        p.alpha -= p.decay * currentMult;
        p.size *= 0.985;

        if (p.alpha > 0.02 && p.size > 0.5) {
          survivingParticles.push(p);
        }
      }
      particlesRef.current = survivingParticles;

      ctx.globalAlpha = 1;
      animFrameRef.current = requestAnimationFrame(render);
    };

    animFrameRef.current = requestAnimationFrame(render);

    return () => {
      isRunning = false;
      window.removeEventListener('resize', resizeCanvas);
      if (launchTimerRef.current) {
        clearInterval(launchTimerRef.current);
        launchTimerRef.current = null;
      }
      finishTimeoutRef.current.forEach(clearTimeout);
      finishTimeoutRef.current = [];
      if (animFrameRef.current) {
        cancelAnimationFrame(animFrameRef.current);
        animFrameRef.current = null;
      }
    };
  }, [isActive, launchRocket, createBurst, onComplete]);

  if (!isActive) return null;

  return (
    <div className="fixed inset-0 z-[99998] pointer-events-none overflow-hidden select-none">
      {/* HTML5 Physical Particle Fireworks Canvas */}
      <canvas
        ref={canvasRef}
        className="absolute inset-0 w-full h-full pointer-events-none"
      />

      {/* Floating Speed & Duration Quick Controller */}
      {showControls && (
        <div className="absolute top-4 inset-x-0 mx-auto w-fit max-w-xl px-4 pointer-events-auto z-[99999] animate-in fade-in slide-in-from-top-4 duration-300">
          <div className="bg-slate-900/90 backdrop-blur-md border border-amber-400/40 rounded-2xl p-2.5 shadow-2xl text-white flex flex-wrap items-center justify-between gap-3 text-xs">
            {/* Header / Mode Indicator */}
            <div className="flex items-center gap-2 font-black text-amber-300 shrink-0">
              <Sparkles className="w-4 h-4 text-amber-400 animate-spin" />
              <span>PHÁO HOA VẬT LÝ</span>
            </div>

            {/* Speed Selector (Tốc độ) */}
            <div className="flex items-center gap-1 bg-slate-800/80 p-1 rounded-xl border border-slate-700">
              <Zap className="w-3.5 h-3.5 text-yellow-400 ml-1" />
              {(
                [
                  { id: 'slow', label: 'Chậm' },
                  { id: 'normal', label: 'Vừa' },
                  { id: 'fast', label: 'Nhanh' },
                  { id: 'super', label: 'Siêu tốc' },
                ] as { id: FireworksSpeed; label: string }[]
              ).map((s) => (
                <button
                  key={s.id}
                  type="button"
                  onClick={() => handleSpeedChange(s.id)}
                  className={`px-2 py-1 rounded-lg font-bold text-[11px] transition-all ${
                    currentSpeed === s.id
                      ? 'bg-amber-500 text-white shadow-xs scale-105'
                      : 'text-slate-300 hover:text-white'
                  }`}
                  title={`Tốc độ pháo hoa: ${s.label}`}
                >
                  {s.label}
                </button>
              ))}
            </div>

            {/* Duration Selector (Thời gian) */}
            <div className="flex items-center gap-1 bg-slate-800/80 p-1 rounded-xl border border-slate-700">
              <Clock className="w-3.5 h-3.5 text-cyan-400 ml-1" />
              {[3, 5, 8, 12].map((dur) => (
                <button
                  key={dur}
                  type="button"
                  onClick={() => handleDurationChange(dur)}
                  className={`px-2 py-1 rounded-lg font-bold text-[11px] transition-all ${
                    currentDuration === dur
                      ? 'bg-cyan-500 text-white shadow-xs scale-105'
                      : 'text-slate-300 hover:text-white'
                  }`}
                  title={`Bắn pháo hoa trong ${dur} giây`}
                >
                  {dur}s
                </button>
              ))}
            </div>

            {/* Launch Salvo Button */}
            <button
              type="button"
              onClick={launchSalvo}
              className="px-3 py-1.5 rounded-xl bg-gradient-to-r from-pink-500 to-rose-600 hover:from-pink-600 hover:to-rose-700 text-white font-black text-[11px] flex items-center gap-1 shadow-md shadow-pink-500/30 active:scale-95 transition-all"
              title="Bắn thêm một chùm pháo hoa ngay!"
            >
              <Rocket className="w-3.5 h-3.5" />
              <span>Bắn Thêm</span>
            </button>
          </div>
        </div>
      )}
    </div>
  );
};
