import React, { useState, useEffect } from 'react';
import { Student } from '../../types';
import { sound } from '../../utils/soundEffects';
import { Trophy, Sparkles, Flame } from 'lucide-react';

interface StageGameshowProps {
  students: Student[];
  isPicking: boolean;
  selectedStudent: Student | null;
  onPickEnd: () => void;
  theme: 'cute' | 'gameshow';
}

export const StageGameshow: React.FC<StageGameshowProps> = ({
  students,
  isPicking,
  selectedStudent,
  onPickEnd,
}) => {
  const [countdown, setCountdown] = useState<number | null>(null);
  const [cyclingName, setCyclingName] = useState<string>('SẴN SÀNG LÊN SÂN KHẤU!');
  const [stageRevealed, setStageRevealed] = useState<boolean>(false);

  useEffect(() => {
    if (!isPicking || !selectedStudent) {
      setCountdown(null);
      setStageRevealed(false);
      return;
    }

    // Start 3-2-1 countdown
    setCountdown(3);
    sound.playCountdownBeep(false);

    const c2 = setTimeout(() => {
      setCountdown(2);
      sound.playCountdownBeep(false);
    }, 800);

    const c1 = setTimeout(() => {
      setCountdown(1);
      sound.playCountdownBeep(false);
    }, 1600);

    const cGo = setTimeout(() => {
      setCountdown(null);
      sound.playCountdownBeep(true);

      // Rapid shuffle names for 1.8 seconds
      let step = 0;
      const shuffleInterval = setInterval(() => {
        const rand = students[Math.floor(Math.random() * students.length)]?.name || 'Học sinh';
        setCyclingName(rand);
        sound.playSpinTick(1.2 + (step / 20));
        step++;
        if (step > 18) {
          clearInterval(shuffleInterval);
          setCyclingName(selectedStudent.name);
          setStageRevealed(true);
          sound.playWinnerFanfare();

          setTimeout(() => {
            onPickEnd();
          }, 1400);
        }
      }, 90);
    }, 2400);

    return () => {
      clearTimeout(c2);
      clearTimeout(c1);
      clearTimeout(cGo);
    };
  }, [isPicking, selectedStudent, students, onPickEnd]);

  return (
    <div className="relative w-full max-w-xl mx-auto flex flex-col items-center justify-center p-6 bg-slate-950/80 rounded-3xl border border-amber-500/30 shadow-2xl backdrop-blur overflow-hidden">
      {/* Stage Spotlights */}
      <div className="absolute -top-12 -left-12 w-48 h-48 bg-amber-400/20 rounded-full blur-3xl pointer-events-none" />
      <div className="absolute -top-12 -right-12 w-48 h-48 bg-purple-500/20 rounded-full blur-3xl pointer-events-none" />

      {/* Stage Header */}
      <div className="flex items-center gap-2 px-4 py-1.5 rounded-full bg-amber-500/10 border border-amber-400/40 text-amber-300 text-xs font-bold tracking-wider mb-6">
        <Trophy className="w-4 h-4 text-amber-400" />
        <span>GAMESHOW ĐẤU TRƯỜNG TRI THỨC</span>
      </div>

      {/* Main Display Box */}
      <div className="relative w-full min-h-[190px] flex flex-col items-center justify-center p-6 bg-gradient-to-b from-slate-900 to-indigo-950 rounded-2xl border-2 border-amber-400 shadow-[inset_0_0_30px_rgba(251,191,36,0.15)] text-center">
        {countdown !== null ? (
          <div className="flex flex-col items-center">
            <span className="text-7xl font-black text-amber-400 animate-ping">
              {countdown}
            </span>
            <span className="text-sm font-semibold text-slate-300 mt-3 tracking-widest uppercase">
              Chuẩn bị gọi tên...
            </span>
          </div>
        ) : (
          <div className="flex flex-col items-center gap-2">
            <div className="flex items-center gap-2 text-amber-400 text-xs font-semibold">
              <Sparkles className="w-4 h-4 animate-spin" />
              <span>{stageRevealed ? 'NGƯỜI CHIẾN THẮNG LÀ' : 'ĐANG QUAY TÊN...'}</span>
              <Sparkles className="w-4 h-4 animate-spin" />
            </div>

            <h2
              className={`text-2xl sm:text-4xl font-black tracking-tight text-white transition-all duration-200 ${
                stageRevealed
                  ? 'scale-110 text-amber-300 drop-shadow-[0_0_25px_rgba(252,211,77,0.8)]'
                  : 'text-slate-200'
              }`}
            >
              {cyclingName}
            </h2>

            {stageRevealed && (
              <div className="mt-2 flex items-center gap-1.5 text-xs font-bold text-emerald-400 bg-emerald-950/60 px-3 py-1 rounded-full border border-emerald-500/40">
                <Flame className="w-3.5 h-3.5" />
                <span>CHÚC MỪNG BẠN! HÃY TỎA SÁNG!</span>
              </div>
            )}
          </div>
        )}
      </div>

      {/* Footlight Indicators */}
      <div className="flex justify-center gap-3 mt-5">
        {[...Array(7)].map((_, i) => (
          <div
            key={i}
            className={`w-3 h-3 rounded-full transition-all duration-300 ${
              isPicking ? 'bg-amber-400 shadow-[0_0_10px_#f59e0b]' : 'bg-slate-700'
            }`}
          />
        ))}
      </div>
    </div>
  );
};
