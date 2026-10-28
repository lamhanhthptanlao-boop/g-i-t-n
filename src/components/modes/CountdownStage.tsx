import React, { useState, useEffect } from 'react';
import { Student } from '../../types';
import { sound } from '../../utils/soundEffects';
import { Flame, Sparkles, Radio, Zap } from 'lucide-react';

interface CountdownStageProps {
  students: Student[];
  isPicking: boolean;
  selectedStudent: Student | null;
  onPickEnd: () => void;
  duration?: number;
}

export const CountdownStage: React.FC<CountdownStageProps> = ({
  students,
  isPicking,
  selectedStudent,
  onPickEnd,
  duration = 4,
}) => {
  const [count, setCount] = useState<number | string>(3);
  const [pulse, setPulse] = useState<boolean>(false);
  const [revealed, setRevealed] = useState<boolean>(false);
  const [cyclingName, setCyclingName] = useState<string>('SẴN SÀNG');

  useEffect(() => {
    if (!isPicking || !selectedStudent) {
      setCount(3);
      setRevealed(false);
      setPulse(false);
      return;
    }

    setRevealed(false);
    // Determine timing steps based on duration
    const stepTime = (duration * 1000) / 4;

    // Count 3
    setCount(3);
    setPulse(true);
    sound.playHeartbeat();
    sound.playCountdownBeep(false);

    // Count 2
    const t2 = setTimeout(() => {
      setCount(2);
      setPulse(p => !p);
      sound.playHeartbeat();
      sound.playCountdownBeep(false);
    }, stepTime);

    // Count 1
    const t1 = setTimeout(() => {
      setCount(1);
      setPulse(p => !p);
      sound.playHeartbeat();
      sound.playCountdownBeep(false);
    }, stepTime * 2);

    // GO / Reveal
    const tGo = setTimeout(() => {
      setCount('GO!');
      sound.playCountdownBeep(true);

      // Rapid cycle names for final tension
      let step = 0;
      const interval = setInterval(() => {
        const rand = students[Math.floor(Math.random() * students.length)]?.name || 'Học sinh';
        setCyclingName(rand);
        sound.playSpinTick(1.3 + (step / 15));
        step++;
        if (step >= 12) {
          clearInterval(interval);
          setCyclingName(selectedStudent.name);
          setRevealed(true);
          sound.playWinnerFanfare();
          setTimeout(() => {
            onPickEnd();
          }, 1500);
        }
      }, 70);
    }, stepTime * 3);

    return () => {
      clearTimeout(t2);
      clearTimeout(t1);
      clearTimeout(tGo);
    };
  }, [isPicking, selectedStudent, students, duration, onPickEnd]);

  return (
    <div className="relative w-full max-w-2xl mx-auto flex flex-col items-center justify-center p-8 bg-gradient-to-b from-slate-950 via-slate-900 to-indigo-950 rounded-3xl border-2 border-red-500/40 shadow-2xl overflow-hidden min-h-[420px]">
      {/* Moving Stage Laser Beams */}
      <div className="absolute top-0 left-1/4 w-1 h-full bg-gradient-to-b from-red-500/40 via-amber-400/20 to-transparent blur-xs transform -rotate-12 animate-pulse" />
      <div className="absolute top-0 right-1/4 w-1 h-full bg-gradient-to-b from-cyan-400/40 via-blue-500/20 to-transparent blur-xs transform rotate-12 animate-pulse" />
      <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_center,_var(--tw-gradient-stops))] from-amber-500/10 via-transparent to-transparent pointer-events-none" />

      {/* Live Badge */}
      <div className="flex items-center gap-2 px-4 py-1.5 rounded-full bg-red-600/30 border border-red-500 text-red-300 text-xs font-black tracking-widest uppercase mb-6 shadow-lg shadow-red-600/20 animate-pulse">
        <Radio className="w-4 h-4 text-red-400" />
        <span>SÂN KHẤU TRUYỀN HÌNH ĐẾM NGƯỢC</span>
      </div>

      {/* Main Countdown Display */}
      {!revealed ? (
        <div className="flex flex-col items-center justify-center my-4">
          <div
            className={`w-36 h-36 sm:w-44 sm:h-44 rounded-full flex items-center justify-center border-4 border-amber-400/60 bg-gradient-to-br from-red-950/80 to-slate-900/90 shadow-[0_0_50px_rgba(239,68,68,0.4)] transition-transform duration-300 ${
              isPicking ? 'scale-110 ring-8 ring-amber-400/30' : ''
            }`}
          >
            <span className="font-black text-6xl sm:text-7xl tracking-tighter text-transparent bg-clip-text bg-gradient-to-b from-yellow-200 via-amber-300 to-red-500 drop-shadow-[0_4px_12px_rgba(0,0,0,0.8)] font-mono">
              {isPicking ? count : '3-2-1'}
            </span>
          </div>

          <div className="mt-6 flex items-center gap-2 text-slate-400 text-sm font-semibold tracking-wide">
            <Zap className="w-4 h-4 text-amber-400 animate-bounce" />
            <span>{isPicking ? 'HỒI HỘP NÍN THỞ... AI SẼ LÊN BẢNG?' : 'BẤM "GỌI TÊN NGAY" ĐỂ BẮT ĐẦU ĐẾM NGƯỢC!'}</span>
          </div>
        </div>
      ) : (
        <div className="flex flex-col items-center justify-center animate-in zoom-in-75 duration-500 my-4">
          <div className="p-3 bg-amber-500/20 rounded-full border border-amber-400/40 mb-3 animate-bounce">
            <Flame className="w-10 h-10 text-amber-400" />
          </div>
          <span className="text-xs font-black tracking-widest text-amber-300 uppercase mb-2">
            NGÔI SAO SÂN KHẤU HÔM NAY
          </span>
          <div className="px-8 py-5 rounded-3xl bg-gradient-to-r from-amber-500 via-orange-500 to-red-500 text-white font-black text-3xl sm:text-4xl shadow-[0_0_50px_rgba(245,158,11,0.6)] border-2 border-yellow-200 ring-4 ring-yellow-400/30 text-center tracking-wide">
            {cyclingName}
          </div>
          <div className="mt-4 flex items-center gap-2 text-yellow-300 font-bold text-sm">
            <Sparkles className="w-4 h-4" />
            <span>Chúc mừng bạn đã xuất sắc lên sóng!</span>
          </div>
        </div>
      )}

      {/* Stage Bottom LED Ticker */}
      <div className="mt-6 w-full max-w-md py-2 px-4 rounded-xl bg-slate-900/90 border border-slate-700/60 flex items-center justify-between text-xs font-mono text-slate-400">
        <span>⏱️ THỜI LƯỢNG: {duration}s</span>
        <span className="text-amber-400 flex items-center gap-1">
          <span className="w-2 h-2 rounded-full bg-emerald-400 animate-ping inline-block" />
          LED READY
        </span>
      </div>
    </div>
  );
};
