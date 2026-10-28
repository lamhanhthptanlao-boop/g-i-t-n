import React, { useState, useEffect } from 'react';
import { Student } from '../../types';
import { sound } from '../../utils/soundEffects';
import { Gift, Sparkles } from 'lucide-react';

interface MysteryGiftProps {
  students: Student[];
  isPicking: boolean;
  selectedStudent: Student | null;
  onPickEnd: () => void;
  theme: 'cute' | 'gameshow';
}

const BOX_PALETTES = [
  { bg: 'from-pink-400 to-rose-500', ribbon: 'bg-amber-300', shadow: 'shadow-pink-300' },
  { bg: 'from-purple-400 to-indigo-600', ribbon: 'bg-yellow-300', shadow: 'shadow-purple-300' },
  { bg: 'from-amber-400 to-orange-500', ribbon: 'bg-red-400', shadow: 'shadow-orange-300' },
  { bg: 'from-emerald-400 to-teal-600', ribbon: 'bg-amber-300', shadow: 'shadow-teal-300' },
  { bg: 'from-blue-400 to-cyan-600', ribbon: 'bg-yellow-300', shadow: 'shadow-blue-300' },
  { bg: 'from-fuchsia-400 to-pink-600', ribbon: 'bg-cyan-300', shadow: 'shadow-fuchsia-300' },
  { bg: 'from-teal-400 to-emerald-600', ribbon: 'bg-yellow-300', shadow: 'shadow-teal-300' },
  { bg: 'from-rose-400 to-red-600', ribbon: 'bg-amber-200', shadow: 'shadow-rose-300' },
];

export const MysteryGift: React.FC<MysteryGiftProps> = ({
  students,
  isPicking,
  selectedStudent,
  onPickEnd,
}) => {
  const [selectedBoxIndex, setSelectedBoxIndex] = useState<number | null>(null);
  const [openedBox, setOpenedBox] = useState<boolean>(false);

  useEffect(() => {
    if (isPicking && selectedStudent) {
      const targetIdx = students.findIndex((s) => s.id === selectedStudent.id);
      const chosenIdx = targetIdx >= 0 ? targetIdx : 0;
      setSelectedBoxIndex(chosenIdx);
      setOpenedBox(false);

      sound.playCountdownBeep(false);

      const openTimer = setTimeout(() => {
        sound.playGiftOpen();
        setOpenedBox(true);

        const endTimer = setTimeout(() => {
          onPickEnd();
        }, 1500);

        return () => clearTimeout(endTimer);
      }, 1600);

      return () => clearTimeout(openTimer);
    } else {
      setSelectedBoxIndex(null);
      setOpenedBox(false);
    }
  }, [isPicking, selectedStudent, students, onPickEnd]);

  return (
    <div className="w-full max-w-4xl mx-auto flex flex-col items-center justify-center p-4">
      <div className="text-center mb-4">
        <span className="text-xs font-bold text-amber-500 uppercase tracking-widest block">
          🎁 HỘP QUÀ BÍ MẬT ({students.length} HỘP QUÀ TƯƠNG ỨNG {students.length} HỌC SINH)
        </span>
        <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">
          {isPicking ? '✨ Đang mở hộp quà may mắn...' : 'Mỗi học sinh đều có 1 hộp quà may mắn mang mã số riêng!'}
        </p>
      </div>

      <div className="grid grid-cols-2 sm:grid-cols-4 md:grid-cols-6 gap-3 w-full max-h-[380px] overflow-y-auto p-2">
        {students.map((st, idx) => {
          const isTarget = selectedBoxIndex === idx;
          const isRevealed = isTarget && openedBox;
          const box = BOX_PALETTES[idx % BOX_PALETTES.length];

          return (
            <div
              key={st.id}
              className={`relative flex flex-col items-center justify-center p-3 rounded-2xl bg-gradient-to-br ${box.bg} ${box.shadow} shadow-md cursor-pointer transform transition-all duration-300 ${
                isTarget && !openedBox ? 'animate-bounce scale-110 ring-4 ring-amber-300 ring-offset-2' : 'hover:-translate-y-1 hover:shadow-lg'
              } ${isRevealed ? 'scale-110 bg-amber-400 ring-4 ring-yellow-400' : ''} h-28 sm:h-32`}
              onClick={() => {
                if (!isPicking) {
                  sound.playSparkle();
                }
              }}
            >
              <div className={`absolute top-0 bottom-0 w-3 ${box.ribbon} opacity-75 rounded-xs`} />
              <div className={`absolute left-0 right-0 h-3 ${box.ribbon} opacity-75 rounded-xs`} />

              <div className="absolute -top-2 flex items-center justify-center">
                <Sparkles className="w-4 h-4 text-yellow-200 animate-spin" />
              </div>

              {isRevealed && selectedStudent ? (
                <div className="z-10 text-center bg-white/95 rounded-xl px-1.5 py-2 shadow-md w-full animate-fade-in border border-amber-300">
                  <span className="text-[9px] font-bold text-amber-600 uppercase tracking-wider block">Mở quà</span>
                  <span className="text-xs font-black text-slate-900 truncate block mt-0.5">
                    {selectedStudent.name}
                  </span>
                </div>
              ) : (
                <div className="z-10 flex flex-col items-center text-white">
                  <Gift className="w-8 h-8 drop-shadow" />
                  <span className="text-[10px] font-extrabold mt-1 tracking-wider">#{idx + 1}</span>
                  <span className="text-[9px] opacity-80 truncate max-w-[70px]">{st.name}</span>
                </div>
              )}
            </div>
          );
        })}
      </div>
    </div>
  );
};
