import React, { useState, useEffect } from 'react';
import { Student } from '../../types';
import { sound } from '../../utils/soundEffects';
import { Sparkles, Activity } from 'lucide-react';

interface HighSpeedReelProps {
  students: Student[];
  isPicking: boolean;
  selectedStudent: Student | null;
  onPickEnd: () => void;
  duration?: number;
}

export const HighSpeedReel: React.FC<HighSpeedReelProps> = ({
  students,
  isPicking,
  selectedStudent,
  onPickEnd,
  duration = 3,
}) => {
  const [currentDisplay, setCurrentDisplay] = useState<string>('SẴN SÀNG QUAY TÊN');
  const [isLocked, setIsLocked] = useState<boolean>(false);

  useEffect(() => {
    if (!isPicking || !selectedStudent) {
      setIsLocked(false);
      setCurrentDisplay('SẴN SÀNG QUAY TÊN');
      return;
    }

    setIsLocked(false);
    const startTime = performance.now();
    const animDuration = (duration || 3) * 1000;
    let step = 0;

    const interval = setInterval(() => {
      const now = performance.now();
      const progress = Math.min(1, (now - startTime) / animDuration);

      if (progress < 1) {
        // Fast cycling with decreasing frequency
        const rand = students[Math.floor(Math.random() * students.length)]?.name || 'Học sinh';
        setCurrentDisplay(rand);
        sound.playSpinTick(1.2 + (step % 6) * 0.1);
        step++;
      } else {
        clearInterval(interval);
        setCurrentDisplay(selectedStudent.name);
        setIsLocked(true);
        sound.playSlotStop();
        sound.playWinnerFanfare();

        setTimeout(() => {
          onPickEnd();
        }, 1400);
      }
    }, 60);

    return () => clearInterval(interval);
  }, [isPicking, selectedStudent, students, duration, onPickEnd]);

  return (
    <div className="relative w-full max-w-xl mx-auto flex flex-col items-center justify-center p-6 bg-slate-950 rounded-3xl border border-cyan-500/40 shadow-2xl overflow-hidden min-h-[380px]">
      {/* Header */}
      <div className="flex items-center gap-2 mb-6">
        <Activity className="w-5 h-5 text-cyan-400 animate-pulse" />
        <span className="text-xs font-bold uppercase tracking-widest text-cyan-300">
          Bảng Tên Cuộn Tốc Độ Cao (High-Speed Reel)
        </span>
      </div>

      {/* Industrial LED Casing Frame */}
      <div className="relative w-full max-w-md p-2 bg-gradient-to-b from-slate-800 to-slate-900 rounded-2xl border-4 border-slate-700 shadow-2xl">
        {/* LED Top/Bottom Border Dots */}
        <div className="flex justify-between px-3 py-1 bg-slate-950 rounded-t-lg">
          {[...Array(12)].map((_, i) => (
            <span
              key={i}
              className={`w-2 h-2 rounded-full ${
                isPicking ? 'bg-cyan-400 shadow-[0_0_8px_#22d3ee]' : 'bg-slate-700'
              }`}
            />
          ))}
        </div>

        {/* Roller Window */}
        <div className="relative h-28 bg-slate-950 flex items-center justify-center overflow-hidden border-y-2 border-cyan-500/50">
          {/* Glass Scanline Reflection */}
          <div className="absolute inset-0 bg-gradient-to-b from-white/10 via-transparent to-black/40 pointer-events-none" />

          {/* Central Target Alignment Line */}
          <div className="absolute inset-y-0 left-0 w-2 bg-amber-400 shadow-[0_0_10px_#f59e0b]" />
          <div className="absolute inset-y-0 right-0 w-2 bg-amber-400 shadow-[0_0_10px_#f59e0b]" />

          {/* Scrolling Name Item */}
          <div
            className={`px-4 py-2 text-center transition-all duration-100 ${
              isLocked
                ? 'scale-110 text-amber-300 drop-shadow-[0_0_20px_#f59e0b]'
                : isPicking
                ? 'blur-[1px] text-cyan-200'
                : 'text-slate-300'
            }`}
          >
            <h1 className="text-xl sm:text-3xl font-black font-mono tracking-tight whitespace-normal break-words max-w-md px-2 leading-tight">
              {currentDisplay}
            </h1>
          </div>
        </div>

        {/* LED Bottom Border Dots */}
        <div className="flex justify-between px-3 py-1 bg-slate-950 rounded-b-lg">
          {[...Array(12)].map((_, i) => (
            <span
              key={i}
              className={`w-2 h-2 rounded-full ${
                isLocked ? 'bg-amber-400 shadow-[0_0_8px_#f59e0b]' : isPicking ? 'bg-cyan-400' : 'bg-slate-700'
              }`}
            />
          ))}
        </div>
      </div>

      {isLocked && (
        <div className="mt-4 flex items-center gap-1.5 px-4 py-1.5 rounded-full bg-amber-500/20 border border-amber-400 text-amber-300 text-xs font-bold animate-bounce">
          <Sparkles className="w-4 h-4 text-amber-400" />
          <span>KHÓA MỤC TIÊU THÀNH CÔNG!</span>
        </div>
      )}
    </div>
  );
};
