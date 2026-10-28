import React, { useState, useEffect } from 'react';
import { Student } from '../../types';
import { sound } from '../../utils/soundEffects';
import { Compass, Sparkles } from 'lucide-react';

interface TreasureMapProps {
  isPicking: boolean;
  selectedStudent: Student | null;
  onPickEnd: () => void;
}

export const TreasureMap: React.FC<TreasureMapProps> = ({
  isPicking,
  selectedStudent,
  onPickEnd,
}) => {
  const [chestOpened, setChestOpened] = useState<boolean>(false);
  const [shipProgress, setShipProgress] = useState<number>(0);

  useEffect(() => {
    if (!isPicking || !selectedStudent) {
      setChestOpened(false);
      setShipProgress(0);
      return;
    }

    setChestOpened(false);
    setShipProgress(0);

    // Ship sails along map
    let prog = 0;
    const sailInterval = setInterval(() => {
      prog += 10;
      setShipProgress(prog);
      sound.playSpinTick(0.9 + prog / 100);
      if (prog >= 100) {
        clearInterval(sailInterval);
        setChestOpened(true);
        sound.playTreasureChest();

        setTimeout(() => {
          onPickEnd();
        }, 1500);
      }
    }, 150);

    return () => clearInterval(sailInterval);
  }, [isPicking, selectedStudent, onPickEnd]);

  return (
    <div className="relative w-full max-w-xl mx-auto flex flex-col items-center justify-center p-6 bg-amber-50 dark:bg-amber-950/40 rounded-3xl border-2 border-amber-300 dark:border-amber-700 shadow-xl min-h-[360px] overflow-hidden">
      {/* Compass in corner */}
      <div className="absolute top-4 right-4 text-amber-700 dark:text-amber-300 opacity-60">
        <Compass className="w-10 h-10 animate-spin" />
      </div>

      <div className="text-center mb-6">
        <span className="text-xs font-bold text-amber-800 dark:text-amber-200 uppercase tracking-widest block">
          🗺️ HÀNH TRÌNH TÌM KHO BÁU TRI THỨC
        </span>
      </div>

      {chestOpened && selectedStudent ? (
        <div className="flex flex-col items-center text-center animate-bounce z-10">
          <div className="text-5xl mb-2">💎</div>
          <div className="bg-amber-100 dark:bg-amber-900 border-2 border-amber-500 rounded-2xl px-6 py-4 shadow-xl">
            <span className="text-[11px] font-bold text-amber-700 dark:text-amber-300 uppercase tracking-wider block">
              Kho báu tri thức thuộc về:
            </span>
            <span className="text-3xl font-black text-amber-950 dark:text-amber-100 block mt-1">
              {selectedStudent.name}
            </span>
          </div>
        </div>
      ) : (
        <div className="w-full flex flex-col items-center">
          {/* Sailing path */}
          <div className="relative w-full max-w-sm h-16 flex items-center justify-between px-4 border-b-2 border-dashed border-amber-400 my-4">
            <span className="text-2xl" title="Bến cảng">🏝️</span>

            {/* Moving Ship */}
            <div
              className="absolute text-3xl transition-all duration-150"
              style={{ left: `${Math.min(85, 10 + shipProgress * 0.75)}%` }}
            >
              ⛵
            </div>

            <span className="text-2xl" title="Đảo kho báu">❌</span>
          </div>

          <div className="flex items-center gap-2 mt-4 text-xs font-bold text-amber-900 dark:text-amber-200">
            <Sparkles className="w-4 h-4 text-amber-500" />
            <span>
              {isPicking ? `Đang chèo thuyền tới đảo kho báu (${shipProgress}%)` : 'Thuyền đang neo đậu, sẵn sàng nhổ neo!'}
            </span>
          </div>
        </div>
      )}
    </div>
  );
};
