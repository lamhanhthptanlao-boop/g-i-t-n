import React, { useEffect, useRef, useState, useCallback } from 'react';
import { Student } from '../../types';
import { sound } from '../../utils/soundEffects';

interface LuckyWheelProps {
  students: Student[];
  isSpinning: boolean;
  selectedStudent: Student | null;
  onSpinEnd: () => void;
  theme: 'cute' | 'gameshow';
}

const CUTE_PALETTE = [
  '#FF6B8B', '#FFA07A', '#FFD166', '#06D6A0',
  '#118AB2', '#8338EC', '#3A86FF', '#FF9F1C',
  '#48CAE4', '#9B5DE5', '#F15BB5', '#00BBF9'
];

const GAMESHOW_PALETTE = [
  '#E63946', '#F4A261', '#E76F51', '#2A9D8F',
  '#264653', '#457B9D', '#1D3557', '#9D4EDD',
  '#7B2CBF', '#C77DFF', '#3F37C9', '#4895EF'
];

export const LuckyWheel: React.FC<LuckyWheelProps> = ({
  students,
  isSpinning,
  selectedStudent,
  onSpinEnd,
  theme,
}) => {
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const currentRotationRef = useRef<number>(0);
  const animFrameRef = useRef<number | null>(null);
  const [activeCandidate, setActiveCandidate] = useState<string>('');

  const displayList = students.length > 0 ? students : [{ id: 'empty', name: 'Chưa có học sinh', called: false, callCount: 0 }];
  const palette = theme === 'cute' ? CUTE_PALETTE : GAMESHOW_PALETTE;

  // Draw wheel on canvas
  const drawWheel = useCallback(
    (rotation: number) => {
      const canvas = canvasRef.current;
      if (!canvas) return;
      const ctx = canvas.getContext('2d');
      if (!ctx) return;

      const dpr = window.devicePixelRatio || 1;
      const size = Math.min(canvas.clientWidth, canvas.clientHeight) || 400;
      canvas.width = size * dpr;
      canvas.height = size * dpr;
      ctx.scale(dpr, dpr);

      const centerX = size / 2;
      const centerY = size / 2;
      const radius = size / 2 - 16;
      const totalSlices = displayList.length;
      const sliceAngle = (2 * Math.PI) / totalSlices;

      ctx.clearRect(0, 0, size, size);

      // Outer rim glow
      ctx.save();
      ctx.translate(centerX, centerY);
      ctx.beginPath();
      ctx.arc(0, 0, radius + 8, 0, 2 * Math.PI);
      ctx.fillStyle = theme === 'cute' ? '#FEE440' : '#FFD700';
      ctx.shadowColor = theme === 'cute' ? 'rgba(254, 228, 64, 0.6)' : 'rgba(255, 215, 0, 0.8)';
      ctx.shadowBlur = 18;
      ctx.fill();
      ctx.restore();

      // Outer border with gold/amber pegs
      ctx.save();
      ctx.translate(centerX, centerY);
      ctx.rotate(rotation);

      for (let i = 0; i < totalSlices; i++) {
        const start = i * sliceAngle;
        const end = start + sliceAngle;
        const color = palette[i % palette.length];

        // Draw sector
        ctx.beginPath();
        ctx.moveTo(0, 0);
        ctx.arc(0, 0, radius, start, end);
        ctx.closePath();
        ctx.fillStyle = color;
        ctx.fill();
        ctx.lineWidth = 2;
        ctx.strokeStyle = '#FFFFFF';
        ctx.stroke();

        // Draw text
        ctx.save();
        ctx.rotate(start + sliceAngle / 2);
        ctx.textAlign = 'right';
        ctx.fillStyle = '#FFFFFF';
        ctx.font = totalSlices > 25 ? 'bold 11px sans-serif' : totalSlices > 15 ? 'bold 13px sans-serif' : 'bold 15px sans-serif';
        ctx.shadowColor = 'rgba(0,0,0,0.4)';
        ctx.shadowBlur = 4;

        // Truncate name if too long
        const name = displayList[i].name;
        const maxLen = totalSlices > 20 ? 11 : 16;
        const displayName = name.length > maxLen ? name.substring(0, maxLen) + '…' : name;
        ctx.fillText(displayName, radius - 24, 5);
        ctx.restore();

        // Outer rim peg dots
        const pegAngle = start;
        const px = Math.cos(pegAngle) * (radius + 2);
        const py = Math.sin(pegAngle) * (radius + 2);
        ctx.beginPath();
        ctx.arc(px, py, 4, 0, 2 * Math.PI);
        ctx.fillStyle = '#FFFFFF';
        ctx.fill();
      }

      // Center Hub
      ctx.beginPath();
      ctx.arc(0, 0, 36, 0, 2 * Math.PI);
      ctx.fillStyle = theme === 'cute' ? '#FF006E' : '#1D3557';
      ctx.fill();
      ctx.lineWidth = 4;
      ctx.strokeStyle = '#FFD700';
      ctx.stroke();

      // Inner star/circle on hub
      ctx.beginPath();
      ctx.arc(0, 0, 16, 0, 2 * Math.PI);
      ctx.fillStyle = '#FFD700';
      ctx.fill();

      ctx.restore();

      // Top Pointer / Needle
      ctx.save();
      ctx.translate(centerX, 12);
      ctx.beginPath();
      ctx.moveTo(-16, 0);
      ctx.lineTo(16, 0);
      ctx.lineTo(0, 28);
      ctx.closePath();
      ctx.fillStyle = '#EF4444';
      ctx.shadowColor = 'rgba(0,0,0,0.5)';
      ctx.shadowBlur = 6;
      ctx.fill();
      ctx.lineWidth = 2;
      ctx.strokeStyle = '#FFFFFF';
      ctx.stroke();
      ctx.restore();
    },
    [displayList, palette, theme]
  );

  // Initial draw & resize
  useEffect(() => {
    drawWheel(currentRotationRef.current);
    const handleResize = () => drawWheel(currentRotationRef.current);
    window.addEventListener('resize', handleResize);
    return () => window.removeEventListener('resize', handleResize);
  }, [drawWheel]);

  // Execute spin animation when isSpinning triggers
  useEffect(() => {
    if (!isSpinning || !selectedStudent) return;

    const totalSlices = displayList.length;
    const sliceAngle = (2 * Math.PI) / totalSlices;

    // Find target index of selected student
    const targetIdx = displayList.findIndex((s) => s.id === selectedStudent.id);
    const validIdx = targetIdx >= 0 ? targetIdx : 0;

    // Calculate required final angle to align pointer (pointer is at 3*PI/2 or 270 deg / top)
    // Pointer is at angle -PI/2 (top). The sector center should land at -PI/2.
    // In our coordinate system, 0 is right, PI/2 is bottom, PI is left, 3PI/2 (-PI/2) is top.
    const sliceCenterAngle = validIdx * sliceAngle + sliceAngle / 2;
    const targetSectorAtTop = (3 * Math.PI) / 2 - sliceCenterAngle;

    // Calculate full spin rotations (5 to 8 full loops)
    const extraLoops = (5 + Math.floor(Math.random() * 3)) * 2 * Math.PI;
    const currentRot = currentRotationRef.current % (2 * Math.PI);
    const startAngle = currentRot;
    const endAngle = startAngle + extraLoops + ((targetSectorAtTop - startAngle) % (2 * Math.PI)) + 2 * Math.PI;

    const duration = 4600; // 4.6 seconds spin
    const startTime = performance.now();
    let lastTickAngle = startAngle;

    const animate = (time: number) => {
      const elapsed = time - startTime;
      const progress = Math.min(1, elapsed / duration);

      // Ease-out cubic deceleration
      const ease = 1 - Math.pow(1 - progress, 3);
      const currentAngle = startAngle + (endAngle - startAngle) * ease;
      currentRotationRef.current = currentAngle;
      drawWheel(currentAngle);

      // Play tick sound when passing a sector
      const angleDiff = currentAngle - lastTickAngle;
      if (angleDiff > sliceAngle * 0.7) {
        sound.playSpinTick(1 + progress * 0.4);
        lastTickAngle = currentAngle;

        // Current candidate passing under pointer
        const normalized = ((3 * Math.PI) / 2 - (currentAngle % (2 * Math.PI)) + 4 * Math.PI) % (2 * Math.PI);
        const curIdx = Math.floor(normalized / sliceAngle) % totalSlices;
        if (displayList[curIdx]) {
          setActiveCandidate(displayList[curIdx].name);
        }
      }

      if (progress < 1) {
        animFrameRef.current = requestAnimationFrame(animate);
      } else {
        currentRotationRef.current = endAngle;
        drawWheel(endAngle);
        setActiveCandidate(selectedStudent.name);
        onSpinEnd();
      }
    };

    animFrameRef.current = requestAnimationFrame(animate);

    return () => {
      if (animFrameRef.current) {
        cancelAnimationFrame(animFrameRef.current);
      }
    };
  }, [isSpinning, selectedStudent, displayList, onSpinEnd, drawWheel]);

  return (
    <div className="flex flex-col items-center justify-center w-full max-w-lg mx-auto p-2">
      <div className="relative w-72 h-72 sm:w-96 sm:h-96 md:w-[420px] md:h-[420px] flex items-center justify-center">
        <canvas
          ref={canvasRef}
          className="w-full h-full cursor-pointer transition-transform duration-300 drop-shadow-2xl"
        />
      </div>

      {/* Dynamic current pointer target display */}
      {isSpinning && activeCandidate && (
        <div className="mt-3 text-sm font-semibold tracking-wide px-4 py-1 rounded-full bg-amber-400/20 text-amber-900 border border-amber-300 animate-pulse">
          Kim đang chỉ: <span className="font-bold text-amber-700">{activeCandidate}</span>
        </div>
      )}
    </div>
  );
};
