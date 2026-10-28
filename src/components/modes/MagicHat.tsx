import React, { useState, useEffect } from 'react';
import { Student } from '../../types';
import { sound } from '../../utils/soundEffects';
import { Wand2, Sparkles, Star } from 'lucide-react';

interface MagicHatProps {
  isPicking: boolean;
  selectedStudent: Student | null;
  onPickEnd: () => void;
}

export const MagicHat: React.FC<MagicHatProps> = ({
  isPicking,
  selectedStudent,
  onPickEnd,
}) => {
  const [magicState, setMagicState] = useState<'idle' | 'casting' | 'revealed'>('idle');

  useEffect(() => {
    if (!isPicking || !selectedStudent) {
      setMagicState('idle');
      return;
    }

    setMagicState('casting');
    sound.playSparkle();

    const wandTimer = setTimeout(() => {
      sound.playCountdownBeep(true);
      sound.playSparkle();
      setMagicState('revealed');

      const endTimer = setTimeout(() => {
        onPickEnd();
      }, 1500);

      return () => clearTimeout(endTimer);
    }, 1800);

    return () => clearTimeout(wandTimer);
  }, [isPicking, selectedStudent, onPickEnd]);

  return (
    <div className="relative w-full max-w-lg mx-auto flex flex-col items-center justify-center p-6 bg-gradient-to-b from-indigo-950 to-slate-900 rounded-3xl border border-purple-500/30 shadow-2xl min-h-[360px] overflow-hidden">
      {/* Magic Runes / Stars in backdrop */}
      <div className="absolute top-4 left-6 text-purple-400 opacity-60">
        <Sparkles className="w-5 h-5 animate-pulse" />
      </div>
      <div className="absolute bottom-6 right-8 text-amber-300 opacity-60">
        <Star className="w-4 h-4 animate-spin" />
      </div>

      {/* Wand tapping animation */}
      {magicState === 'casting' && (
        <div className="absolute top-10 right-16 animate-bounce z-20">
          <Wand2 className="w-12 h-12 text-yellow-300 drop-shadow-[0_0_15px_#fde047]" />
        </div>
      )}

      {/* Floating Card revealing student */}
      {magicState === 'revealed' && selectedStudent && (
        <div className="z-20 -mb-6 transform -translate-y-6 transition-all duration-700 animate-bounce">
          <div className="bg-gradient-to-b from-amber-100 to-amber-200 border-2 border-amber-400 rounded-xl px-6 py-4 shadow-2xl text-center">
            <span className="text-[11px] font-bold text-amber-800 uppercase tracking-wider block">
              ✨ Lá bài phép thuật
            </span>
            <span className="text-2xl font-black text-slate-900 block mt-0.5">
              {selectedStudent.name}
            </span>
          </div>
        </div>
      )}

      {/* Wizard Hat Visual */}
      <div className="relative z-10 flex flex-col items-center">
        {/* Hat Cone */}
        <div
          className={`w-0 h-0 border-l-[70px] border-l-transparent border-r-[70px] border-r-transparent border-b-[120px] border-b-purple-800 relative transition-transform duration-300 ${
            magicState === 'casting' ? 'scale-105 rotate-3' : ''
          }`}
        >
          {/* Star on hat */}
          <div className="absolute top-12 -left-3 text-amber-300">
            <Star className="w-6 h-6 fill-amber-300 drop-shadow" />
          </div>
        </div>

        {/* Hat Belt Ribbon */}
        <div className="w-44 h-5 bg-amber-400 rounded-xs shadow-md -mt-2 z-10 flex items-center justify-center">
          <div className="w-5 h-5 bg-yellow-200 border-2 border-amber-600 rounded-xs" />
        </div>

        {/* Hat Brim */}
        <div className="w-60 h-10 bg-purple-900 rounded-[50%] shadow-xl -mt-4 border-b-4 border-purple-950 flex items-center justify-center" />
      </div>

      <div className="mt-6 text-center">
        <p className="text-sm font-semibold text-purple-200">
          {magicState === 'casting'
            ? '🪄 Đang niệm thần chú gọi tên...'
            : magicState === 'revealed'
            ? '🎩 Thần chú thành công!'
            : 'Chiếc mũ phép thuật đang chờ lệnh của thầy cô!'}
        </p>
      </div>
    </div>
  );
};
