import React, { useState, useEffect } from 'react';
import { Student } from '../../types';
import { sound } from '../../utils/soundEffects';
import { Rocket, Star, Sparkles } from 'lucide-react';

interface KnowledgeRocketProps {
  isPicking: boolean;
  selectedStudent: Student | null;
  onPickEnd: () => void;
}

export const KnowledgeRocket: React.FC<KnowledgeRocketProps> = ({
  isPicking,
  selectedStudent,
  onPickEnd,
}) => {
  const [flightPhase, setFlightPhase] = useState<'idle' | 'countdown' | 'launch' | 'landed'>('idle');
  const [countdown, setCountdown] = useState<number>(3);

  useEffect(() => {
    if (!isPicking || !selectedStudent) {
      setFlightPhase('idle');
      return;
    }

    setFlightPhase('countdown');
    setCountdown(3);
    sound.playCountdownBeep(false);

    const t2 = setTimeout(() => {
      setCountdown(2);
      sound.playCountdownBeep(false);
    }, 700);

    const t1 = setTimeout(() => {
      setCountdown(1);
      sound.playCountdownBeep(false);
    }, 1400);

    const tLaunch = setTimeout(() => {
      setFlightPhase('launch');
      sound.playRocketLaunch();

      const tLanded = setTimeout(() => {
        setFlightPhase('landed');
        sound.playWinnerFanfare();

        const tEnd = setTimeout(() => {
          onPickEnd();
        }, 1400);

        return () => clearTimeout(tEnd);
      }, 1600);

      return () => clearTimeout(tLanded);
    }, 2100);

    return () => {
      clearTimeout(t2);
      clearTimeout(t1);
      clearTimeout(tLaunch);
    };
  }, [isPicking, selectedStudent, onPickEnd]);

  return (
    <div className="relative w-full max-w-lg mx-auto flex flex-col items-center justify-center p-6 bg-slate-900 rounded-3xl border border-indigo-500/30 shadow-2xl overflow-hidden min-h-[360px]">
      {/* Floating Stars Background */}
      <div className="absolute inset-0 pointer-events-none opacity-40">
        <Star className="absolute top-4 left-6 w-3 h-3 text-yellow-300 animate-pulse" />
        <Star className="absolute top-12 right-10 w-4 h-4 text-cyan-300 animate-ping" />
        <Star className="absolute bottom-8 left-12 w-3 h-3 text-pink-300 animate-bounce" />
        <Star className="absolute bottom-16 right-8 w-4 h-4 text-amber-200 animate-pulse" />
      </div>

      {flightPhase === 'idle' && (
        <div className="flex flex-col items-center text-center">
          <div className="w-24 h-24 rounded-full bg-gradient-to-tr from-indigo-600 to-purple-500 flex items-center justify-center shadow-lg shadow-indigo-500/30 mb-4 animate-bounce">
            <Rocket className="w-12 h-12 text-white transform -rotate-45" />
          </div>
          <h3 className="text-lg font-bold text-white mb-1">Tên Lửa Tri Thức Sẵn Sàng</h3>
          <p className="text-xs text-indigo-200">Nhấn nút bên dưới để phóng tàu vũ trụ chọn học sinh!</p>
        </div>
      )}

      {flightPhase === 'countdown' && (
        <div className="flex flex-col items-center">
          <span className="text-6xl font-black text-amber-400 animate-scale-up">{countdown}</span>
          <span className="text-xs uppercase tracking-widest text-indigo-300 mt-3 font-semibold">
            Đang đếm ngược khai hỏa...
          </span>
        </div>
      )}

      {flightPhase === 'launch' && (
        <div className="flex flex-col items-center">
          <div className="animate-launch-up flex flex-col items-center">
            <Rocket className="w-20 h-20 text-amber-400 transform -rotate-45 drop-shadow-[0_0_20px_#f59e0b]" />
            <div className="w-6 h-12 bg-gradient-to-b from-amber-400 via-orange-500 to-transparent rounded-full blur-xs mt-1 animate-pulse" />
          </div>
          <span className="text-sm font-bold text-amber-300 tracking-wider mt-4">
            🚀 Đang bay vào vũ trụ tri thức...
          </span>
        </div>
      )}

      {flightPhase === 'landed' && selectedStudent && (
        <div className="flex flex-col items-center text-center animate-fade-in z-10">
          <div className="flex items-center gap-2 text-amber-400 mb-2">
            <Sparkles className="w-5 h-5 animate-spin" />
            <span className="text-xs font-bold uppercase tracking-widest">Hạ cánh tại trạm tri thức</span>
            <Sparkles className="w-5 h-5 animate-spin" />
          </div>
          <div className="p-6 bg-gradient-to-r from-amber-500/20 via-purple-500/30 to-indigo-500/20 border-2 border-amber-400 rounded-2xl shadow-xl backdrop-blur">
            <span className="text-xs text-indigo-300 block font-semibold">Phi hành gia được chọn:</span>
            <span className="text-3xl sm:text-4xl font-black text-white drop-shadow-[0_0_15px_#f59e0b] block mt-1">
              {selectedStudent.name}
            </span>
          </div>
        </div>
      )}
    </div>
  );
};
