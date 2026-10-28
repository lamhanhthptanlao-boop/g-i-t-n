import React, { useEffect, useRef } from 'react';
import confetti from 'canvas-confetti';

interface ConfettiOverlayProps {
  isActive: boolean;
  duration?: number; // duration of golden star/confetti rain in ms
  onComplete?: () => void;
}

/**
 * ConfettiOverlay component using `canvas-confetti`
 * Fires a spectacular multi-stage screen-wide fireworks and confetti celebration:
 * 1. Center explosive burst with star/circle ribbons
 * 2. Lateral stadium cannons (left & right corners)
 * 3. High altitude skyrocket bursts
 * 4. Drifting golden star & sparkle rain across the entire screen
 */
export const ConfettiOverlay: React.FC<ConfettiOverlayProps> = ({
  isActive,
  duration = 4000,
  onComplete,
}) => {
  const rainIntervalRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const timeoutIdsRef = useRef<ReturnType<typeof setTimeout>[]>([]);

  useEffect(() => {
    if (!isActive) {
      if (rainIntervalRef.current) {
        clearInterval(rainIntervalRef.current);
        rainIntervalRef.current = null;
      }
      timeoutIdsRef.current.forEach(clearTimeout);
      timeoutIdsRef.current = [];
      return;
    }

    const count = 220;
    const defaults = {
      origin: { y: 0.68 },
      zIndex: 99999,
      disableForReducedMotion: false,
    };

    const fire = (particleRatio: number, opts: confetti.Options) => {
      confetti({
        ...defaults,
        ...opts,
        particleCount: Math.floor(count * particleRatio),
      });
    };

    // Stage 1: Explosive center cannon burst (immediate)
    fire(0.28, {
      spread: 28,
      startVelocity: 55,
      colors: ['#FF6B8B', '#FFD166', '#06D6A0', '#118AB2', '#8338EC'],
    });

    fire(0.22, {
      spread: 60,
      colors: ['#FFA07A', '#F15BB5', '#FEE440', '#00BBF9', '#00F5D4'],
    });

    fire(0.35, {
      spread: 100,
      decay: 0.91,
      scalar: 0.9,
      colors: ['#FFD700', '#FFA500', '#FF4500', '#38EF7D', '#11998E'],
    });

    fire(0.12, {
      spread: 130,
      startVelocity: 30,
      decay: 0.93,
      scalar: 1.3,
      shapes: ['circle', 'square'],
      colors: ['#FFE66D', '#FF6B6B', '#4ECDC4', '#A855F7'],
    });

    // Stage 2: Lateral stadium cannons (t + 250ms)
    const t1 = setTimeout(() => {
      confetti({
        particleCount: 90,
        angle: 60,
        spread: 80,
        startVelocity: 65,
        origin: { x: 0, y: 0.85 },
        colors: ['#FF416C', '#FF4B2B', '#FFD700', '#00C9FF', '#92FE9D'],
        zIndex: 99999,
      });

      confetti({
        particleCount: 90,
        angle: 120,
        spread: 80,
        startVelocity: 65,
        origin: { x: 1, y: 0.85 },
        colors: ['#7F00FF', '#E100FF', '#FFD700', '#F37335', '#FDC830'],
        zIndex: 99999,
      });
    }, 250);
    timeoutIdsRef.current.push(t1);

    // Stage 3: High altitude sky rockets bursting at top corners (t + 600ms)
    const t2 = setTimeout(() => {
      confetti({
        particleCount: 75,
        angle: 45,
        spread: 95,
        startVelocity: 65,
        origin: { x: 0.15, y: 0.6 },
        colors: ['#FFD700', '#FFFFFF', '#FF69B4', '#00E5FF', '#F59E0B'],
        zIndex: 99999,
      });

      confetti({
        particleCount: 75,
        angle: 135,
        spread: 95,
        startVelocity: 65,
        origin: { x: 0.85, y: 0.6 },
        colors: ['#FFD700', '#FFFFFF', '#76FF03', '#D500F9', '#EC4899'],
        zIndex: 99999,
      });
    }, 600);
    timeoutIdsRef.current.push(t2);

    // Stage 4: Gentle drifting golden star & streamer rain across entire viewport (t + 950ms)
    const t3 = setTimeout(() => {
      const end = Date.now() + duration;

      rainIntervalRef.current = setInterval(() => {
        if (Date.now() > end) {
          if (rainIntervalRef.current) {
            clearInterval(rainIntervalRef.current);
            rainIntervalRef.current = null;
          }
          if (onComplete) onComplete();
          return;
        }

        confetti({
          startVelocity: 35,
          spread: 360,
          ticks: 70,
          origin: { x: Math.random(), y: Math.random() * 0.25 },
          colors: ['#FFD700', '#FFEA00', '#FFB703', '#FB8500', '#FF006E', '#10B981'],
          zIndex: 99999,
          scalar: 0.95,
          shapes: ['circle', 'square'],
        });
      }, 180);
    }, 950);
    timeoutIdsRef.current.push(t3);

    // Auto complete timer
    const tEnd = setTimeout(() => {
      if (onComplete) onComplete();
    }, duration + 1200);
    timeoutIdsRef.current.push(tEnd);

    return () => {
      if (rainIntervalRef.current) {
        clearInterval(rainIntervalRef.current);
        rainIntervalRef.current = null;
      }
      timeoutIdsRef.current.forEach(clearTimeout);
      timeoutIdsRef.current = [];
    };
  }, [isActive, duration, onComplete]);

  return (
    <div
      className="pointer-events-none fixed inset-0 z-[9999] overflow-hidden"
      aria-hidden="true"
    />
  );
};
