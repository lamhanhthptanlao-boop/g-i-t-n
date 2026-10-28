import confetti from 'canvas-confetti';

/**
 * Grand Screen-Wide Celebratory Fireworks & Confetti Particle System
 * Triggers multi-stage fireworks, golden starbursts, lateral cannons, and festive ribbon rain
 * across the entire viewport for an authentic television gameshow championship feel.
 */
export function launchGrandCelebrationFireworks() {
  const count = 200;
  const defaults = {
    origin: { y: 0.7 },
    zIndex: 9999,
  };

  function fire(particleRatio: number, opts: confetti.Options) {
    confetti({
      ...defaults,
      ...opts,
      particleCount: Math.floor(count * particleRatio),
    });
  }

  // Stage 1: Immediate explosive center burst with vibrant multi-colors
  fire(0.25, {
    spread: 26,
    startVelocity: 55,
    colors: ['#FF6B8B', '#FFD166', '#06D6A0', '#118AB2', '#8338EC'],
  });

  fire(0.2, {
    spread: 60,
    colors: ['#FFA07A', '#F15BB5', '#FEE440', '#00BBF9', '#00F5D4'],
  });

  fire(0.35, {
    spread: 100,
    decay: 0.91,
    scalar: 0.8,
    colors: ['#FFD700', '#FFA500', '#FF4500', '#38EF7D', '#11998E'],
  });

  fire(0.1, {
    spread: 120,
    startVelocity: 25,
    decay: 0.92,
    scalar: 1.2,
    shapes: ['circle'],
    colors: ['#FFE66D', '#FF6B6B', '#4ECDC4'],
  });

  fire(0.1, {
    spread: 120,
    startVelocity: 45,
    colors: ['#E63946', '#F4A261', '#2A9D8F', '#E76F51'],
  });

  // Stage 2: Lateral stadium cannons firing from bottom-left and bottom-right (t + 250ms)
  setTimeout(() => {
    confetti({
      particleCount: 80,
      angle: 60,
      spread: 75,
      origin: { x: 0, y: 0.85 },
      colors: ['#FF416C', '#FF4B2B', '#FFD700', '#00C9FF', '#92FE9D'],
      zIndex: 9999,
    });
    confetti({
      particleCount: 80,
      angle: 120,
      spread: 75,
      origin: { x: 1, y: 0.85 },
      colors: ['#7F00FF', '#E100FF', '#FFD700', '#F37335', '#FDC830'],
      zIndex: 9999,
    });
  }, 250);

  // Stage 3: High altitude sky rockets bursting at top corners (t + 550ms)
  setTimeout(() => {
    confetti({
      particleCount: 60,
      angle: 45,
      spread: 90,
      startVelocity: 60,
      origin: { x: 0.15, y: 0.65 },
      colors: ['#FFD700', '#FFF', '#FF69B4', '#00E5FF'],
      zIndex: 9999,
    });
    confetti({
      particleCount: 60,
      angle: 135,
      spread: 90,
      startVelocity: 60,
      origin: { x: 0.85, y: 0.65 },
      colors: ['#FFD700', '#FFF', '#76FF03', '#D500F9'],
      zIndex: 9999,
    });
  }, 550);

  // Stage 4: Gentle golden star & shimmer rain drifting down over the screen (t + 900ms)
  setTimeout(() => {
    const duration = 2500;
    const end = Date.now() + duration;

    const interval: ReturnType<typeof setInterval> = setInterval(() => {
      if (Date.now() > end) {
        return clearInterval(interval);
      }

      confetti({
        startVelocity: 30,
        spread: 360,
        ticks: 60,
        origin: { x: Math.random(), y: Math.random() * 0.3 },
        colors: ['#FFD700', '#FFEA00', '#FFB703', '#FB8500', '#FF006E'],
        zIndex: 9999,
        scalar: 0.9,
      });
    }, 200);
  }, 900);
}
