import React, { useState, useEffect } from 'react';
import { classroomMascot3D } from '../../assets/images';
import { Student } from '../../types';
import { sound } from '../../utils/soundEffects';
import { Mic, Volume2, Sparkles, UserCheck } from 'lucide-react';

interface VirtualMCHostProps {
  isPicking: boolean;
  selectedStudent: Student | null;
  onPickEnd: () => void;
  enableTTS?: boolean;
}

const MC_INTRO_SPEECHES = [
  'Xin chào cả lớp! Khoảnh khắc hồi hộp nhất của gameshow đã đến...',
  'Ai sẽ là ngôi sao may mắn được xướng tên hôm nay?',
  'Cả lớp cùng nín thở theo dõi màn hình nào...',
  'Micro đã sẵn sàng, và nhân vật đặc biệt bước lên sân khấu chính là...',
];

export const VirtualMCHost: React.FC<VirtualMCHostProps> = ({
  isPicking,
  selectedStudent,
  onPickEnd,
  enableTTS = true,
}) => {
  const [mcSpeech, setMcSpeech] = useState<string>('MC ảo đang sẵn sàng dẫn dắt tiết học!');
  const [isRevealed, setIsRevealed] = useState<boolean>(false);

  useEffect(() => {
    if (!isPicking || !selectedStudent) {
      setMcSpeech('MC ảo đang sẵn sàng dẫn dắt tiết học!');
      setIsRevealed(false);
      return;
    }

    setIsRevealed(false);
    const intro = MC_INTRO_SPEECHES[Math.floor(Math.random() * MC_INTRO_SPEECHES.length)];
    setMcSpeech(intro);

    if (enableTTS) {
      sound.speakVirtualMC(intro);
    }
    sound.playHeartbeat();

    // After dramatic pause (2.4s)
    const announceTimer = setTimeout(() => {
      const announceText = `Xin chúc mừng bạn ${selectedStudent.name}!`;
      setMcSpeech(announceText);
      setIsRevealed(true);
      sound.playWinnerFanfare();

      if (enableTTS) {
        sound.speakVirtualMC(`Xin chúc mừng bạn, ${selectedStudent.name}! Mời bạn tỏa sáng!`);
      }

      const endTimer = setTimeout(() => {
        onPickEnd();
      }, 1800);

      return () => clearTimeout(endTimer);
    }, 2400);

    return () => clearTimeout(announceTimer);
  }, [isPicking, selectedStudent, enableTTS, onPickEnd]);

  return (
    <div className="relative w-full max-w-xl mx-auto flex flex-col items-center justify-center p-6 bg-slate-950 rounded-3xl border border-amber-500/40 shadow-2xl overflow-hidden min-h-[400px]">
      {/* Stage Backdrop Lights */}
      <div className="absolute top-0 inset-x-0 h-40 bg-[radial-gradient(ellipse_at_top,rgba(245,158,11,0.25),transparent_70%)] pointer-events-none" />

      {/* MC Character Illustration / Avatar */}
      <div className="relative z-10 flex flex-col items-center mb-4">
        <div
          className={`w-32 h-32 rounded-full border-4 border-amber-400 p-1 bg-amber-100 shadow-2xl transition-transform duration-300 ${
            isPicking ? 'scale-105 animate-bounce' : ''
          }`}
        >
          <img
            src={classroomMascot3D}
            alt="MC ảo dẫn chương trình"
            className="w-full h-full object-cover rounded-full"
            referrerPolicy="no-referrer"
          />
        </div>

        {/* Live On-Air Mic Badge */}
        <div className="flex items-center gap-1.5 px-3 py-1 rounded-full bg-red-600 text-white font-bold text-[11px] tracking-wider uppercase -mt-3 shadow-md border border-white/20">
          <span className="w-2 h-2 rounded-full bg-white animate-pulse" />
          <Mic className="w-3.5 h-3.5" />
          <span>MC TRỰC TIẾP</span>
        </div>
      </div>

      {/* Speech Bubble */}
      <div className="relative z-10 w-full max-w-md p-4 bg-slate-900/90 rounded-2xl border-2 border-amber-400/50 shadow-xl backdrop-blur text-center my-2">
        <div className="flex items-center justify-center gap-1.5 text-xs font-semibold text-amber-400 mb-1">
          <Volume2 className="w-4 h-4 animate-pulse" />
          <span>Lời dẫn MC:</span>
        </div>
        <p className="text-sm sm:text-base font-bold text-white italic">
          "{mcSpeech}"
        </p>
      </div>

      {/* Winner Spotlight Banner */}
      {isRevealed && selectedStudent && (
        <div className="relative z-10 mt-3 p-4 bg-gradient-to-r from-amber-500/20 via-purple-500/30 to-amber-500/20 border-2 border-amber-400 rounded-2xl text-center w-full max-w-md animate-fade-in shadow-2xl">
          <div className="flex items-center justify-center gap-1.5 text-xs font-extrabold text-amber-300 uppercase tracking-widest">
            <Sparkles className="w-4 h-4" />
            <span>NGƯỜI CHIẾN THẮNG BƯỚC LÊN SÂN KHẤU</span>
            <Sparkles className="w-4 h-4" />
          </div>
          <h1 className="text-3xl sm:text-4xl font-black text-white mt-1 drop-shadow-[0_0_15px_#f59e0b]">
            {selectedStudent.name}
          </h1>
        </div>
      )}
    </div>
  );
};
