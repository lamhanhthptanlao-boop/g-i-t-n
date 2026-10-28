import React, { useState, useEffect } from 'react';
import { Student } from '../../types';
import { sound } from '../../utils/soundEffects';
import { CircleDot, Sparkles } from 'lucide-react';

interface LuckyBubblesProps {
  students: Student[];
  isPicking: boolean;
  selectedStudent: Student | null;
  onPickEnd: () => void;
}

const BUBBLE_COLORS = [
  'bg-pink-400/30 border-pink-300 text-pink-700 dark:text-pink-200',
  'bg-sky-400/30 border-sky-300 text-sky-700 dark:text-sky-200',
  'bg-emerald-400/30 border-emerald-300 text-emerald-700 dark:text-emerald-200',
  'bg-purple-400/30 border-purple-300 text-purple-700 dark:text-purple-200',
  'bg-amber-400/30 border-amber-300 text-amber-700 dark:text-amber-200',
  'bg-teal-400/30 border-teal-300 text-teal-700 dark:text-teal-200',
];

export const LuckyBubbles: React.FC<LuckyBubblesProps> = ({
  students,
  isPicking,
  selectedStudent,
  onPickEnd,
}) => {
  const [popped, setPopped] = useState<boolean>(false);
  const [highlightIdx, setHighlightIdx] = useState<number>(0);

  useEffect(() => {
    if (!isPicking || !selectedStudent) {
      setPopped(false);
      return;
    }

    setPopped(false);
    const targetIdx = students.findIndex((s) => s.id === selectedStudent.id);
    let step = 0;
    const interval = setInterval(() => {
      setHighlightIdx((prev) => (prev + 1) % Math.max(1, students.length));
      sound.playBubblePop();
      step++;
      if (step > 15) {
        clearInterval(interval);
        setHighlightIdx(targetIdx >= 0 ? targetIdx : 0);
        setPopped(true);
        sound.playWinnerFanfare();

        setTimeout(() => {
          onPickEnd();
        }, 1400);
      }
    }, 110);

    return () => clearInterval(interval);
  }, [isPicking, selectedStudent, students, onPickEnd]);

  return (
    <div className="relative w-full max-w-3xl mx-auto flex flex-col items-center justify-center p-4 sm:p-6 min-h-[380px] bg-sky-50 dark:bg-slate-900 rounded-3xl border border-sky-200 dark:border-slate-800 shadow-xl overflow-hidden">
      {popped && selectedStudent ? (
        <div className="flex flex-col items-center text-center animate-bounce z-20">
          <div className="w-16 h-16 rounded-full bg-pink-100 dark:bg-pink-950 flex items-center justify-center mb-3 text-pink-500 shadow-lg">
            <Sparkles className="w-8 h-8 animate-spin" />
          </div>
          <span className="text-xs font-bold text-sky-600 dark:text-sky-400 uppercase tracking-widest">
            Bong bóng may mắn đã nổ!
          </span>
          <h2 className="text-3xl sm:text-4xl font-black text-slate-900 dark:text-white mt-1">
            {selectedStudent.name}
          </h2>
        </div>
      ) : (
        <div className="w-full flex flex-col items-center">
          <div className="flex items-center gap-2 text-xs font-bold text-sky-600 dark:text-sky-400 mb-3 uppercase tracking-wider">
            <CircleDot className="w-4 h-4 animate-ping" />
            <span>
              {isPicking
                ? '🫧 Đang tìm bong bóng may mắn...'
                : `🫧 ${students.length} Bong Bóng Tương Ứng ${students.length} Học Sinh`}
            </span>
          </div>

          <div className="flex flex-wrap justify-center gap-2.5 max-h-[320px] overflow-y-auto p-2 w-full">
            {students.map((st, idx) => {
              const isHL = isPicking && highlightIdx === idx;
              const colorStyle = BUBBLE_COLORS[idx % BUBBLE_COLORS.length];

              return (
                <div
                  key={st.id}
                  className={`w-20 h-20 sm:w-22 sm:h-22 rounded-full border-2 flex flex-col items-center justify-center p-1.5 text-center text-xs font-bold shadow-md backdrop-blur-xs transition-all duration-200 ${colorStyle} ${
                    isHL ? 'scale-125 ring-4 ring-yellow-400 shadow-xl bg-yellow-200/60' : 'hover:scale-105 animate-pulse'
                  }`}
                  onClick={() => sound.playBubblePop()}
                >
                  <span className="text-[10px] opacity-75">#{idx + 1}</span>
                  <span className="truncate max-w-[70px] leading-tight font-extrabold">{st.name}</span>
                </div>
              );
            })}
          </div>
        </div>
      )}
    </div>
  );
};
