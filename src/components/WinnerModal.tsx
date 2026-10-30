import React, { useEffect, useState } from 'react';
import { Student, FireworksSpeed } from '../types';
import { MC_CHEER_QUOTES } from '../utils/studentParser';
import { sound } from '../utils/soundEffects';
import { launchGrandCelebrationFireworks } from '../utils/celebrationEffects';
import { Sparkles, RotateCcw, ArrowRight, RefreshCw, X, Volume2, Award, Heart, Zap, Clock } from 'lucide-react';

interface WinnerModalProps {
  isOpen: boolean;
  student: Student | null;
  students?: Student[];
  totalStudents: number;
  calledCount: number;
  remainingCount: number;
  callNumber: number;
  enableTTS?: boolean;
  fireworksSpeed?: FireworksSpeed;
  fireworksDuration?: number;
  voiceURI?: string;
  voiceRate?: number;
  voicePitch?: number;
  onUpdateFireworksSettings?: (speed: FireworksSpeed, duration: number) => void;
  onNext: () => void;
  onUndo: () => void;
  onResetRound: () => void;
  onClose: () => void;
}

export const WinnerModal: React.FC<WinnerModalProps> = ({
  isOpen,
  student,
  students,
  totalStudents,
  calledCount,
  remainingCount,
  callNumber,
  enableTTS = true,
  fireworksSpeed = 'normal',
  fireworksDuration = 5,
  voiceURI,
  voiceRate,
  voicePitch,
  onUpdateFireworksSettings,
  onNext,
  onUndo,
  onResetRound,
  onClose,
}) => {
  const [mcQuote, setMcQuote] = useState<string>('');

  const displayList = students && students.length > 0 ? students : (student ? [student] : []);

  useEffect(() => {
    if (isOpen && displayList.length > 0) {
      // Pick random cheerful quote
      const quote = MC_CHEER_QUOTES[Math.floor(Math.random() * MC_CHEER_QUOTES.length)];
      setMcQuote(quote);

      // Launch screen-wide grand celebration fireworks & confetti rain!
      launchGrandCelebrationFireworks();

      if (enableTTS) {
        if (displayList.length === 1) {
          sound.speakVirtualMC(`Ms Mèo xin chúc mừng học sinh ${displayList[0].name}!`, voiceURI, voiceRate, voicePitch);
        } else {
          sound.speakVirtualMC(
            `Ms Mèo xin chúc mừng ${displayList.length} bạn: ${displayList.map((s) => s.name).join(', ')}!`,
            voiceURI,
            voiceRate,
            voicePitch
          );
        }
      }
    }
  }, [isOpen, displayList.length, enableTTS, voiceURI, voiceRate, voicePitch]);

  if (!isOpen || displayList.length === 0) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/85 backdrop-blur-md animate-fade-in overflow-y-auto">
      {/* Golden Screen Fireworks Aura Light */}
      <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_center,_var(--tw-gradient-stops))] from-amber-500/25 via-pink-500/10 to-transparent pointer-events-none animate-pulse" />

      <div className="relative w-full max-w-lg bg-gradient-to-b from-amber-50 via-white to-pink-50 dark:from-slate-900 dark:via-indigo-950 dark:to-slate-900 rounded-[36px] p-6 sm:p-8 shadow-[0_0_80px_rgba(245,158,11,0.5)] border-4 border-amber-300 dark:border-amber-400 text-center flex flex-col items-center">
        {/* Close Button */}
        <button
          onClick={onClose}
          className="absolute top-4 right-4 p-2 text-slate-400 hover:text-slate-600 dark:hover:text-white rounded-full hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors"
          title="Đóng hộp thoại"
        >
          <X className="w-5 h-5" />
        </button>

        {/* Ms. Mèo Mascot Character Avatar */}
        <div className="relative -mt-20 sm:-mt-24 mb-3">
          <div className="relative w-32 h-32 sm:w-36 sm:h-36 rounded-full border-4 border-amber-300 shadow-2xl overflow-hidden bg-amber-100 ring-4 ring-pink-300/60 dark:ring-amber-400/40 transform hover:scale-105 transition-transform duration-300">
            <img
              src="/src/assets/images/ms_meo_mascot_1793188289324.jpg"
              alt="Cô giáo Ms. Mèo Mascot"
              className="w-full h-full object-cover"
              referrerPolicy="no-referrer"
            />
            {/* Sparkle pin */}
            <div className="absolute top-1 right-2 p-1 bg-amber-400 text-white rounded-full shadow-md animate-bounce">
              <Sparkles className="w-3.5 h-3.5" />
            </div>
          </div>

          {/* Ms Mèo Tag */}
          <div className="absolute -bottom-2.5 inset-x-0 mx-auto w-max px-3.5 py-1 rounded-full bg-gradient-to-r from-amber-500 via-orange-500 to-pink-500 text-white text-xs font-black uppercase tracking-wider shadow-lg flex items-center gap-1.5 border border-yellow-200">
            <span>🐾 Cô giáo Ms. Mèo</span>
            <span className="text-yellow-200">· Lượt #{callNumber}</span>
          </div>
        </div>

        {/* Cheerful Ms. Mèo Speech Bubble */}
        <div className="mt-3 mb-2 px-4 py-2.5 rounded-2xl bg-amber-100/80 dark:bg-amber-950/50 border border-amber-300/60 text-amber-900 dark:text-amber-200 text-xs sm:text-sm font-bold flex items-center gap-2 shadow-xs">
          <Heart className="w-4 h-4 text-pink-500 fill-pink-500 shrink-0 animate-pulse" />
          <p className="italic leading-relaxed">{mcQuote}</p>
        </div>

        {/* Student Name or Multi-Student Group */}
        {displayList.length === 1 ? (
          <div className="my-3 px-6 py-4 bg-white/90 dark:bg-slate-800/90 rounded-2xl border-2 border-amber-300 dark:border-amber-500 shadow-lg w-full relative">
            <div className="flex items-center justify-between">
              <span className="text-[11px] font-bold uppercase tracking-widest text-slate-500 dark:text-slate-400">
                Học sinh được gọi tên
              </span>
              <button
                onClick={() =>
                  sound.speakVirtualMC(
                    `Xin chúc mừng học sinh ${displayList[0].name}!`,
                    voiceURI,
                    voiceRate,
                    voicePitch
                  )
                }
                className="p-1.5 rounded-lg bg-amber-100 hover:bg-amber-200 dark:bg-slate-700 text-amber-700 dark:text-amber-300 transition-colors flex items-center gap-1 text-[11px] font-bold"
                title="Đọc lại tên học sinh bằng giọng Tiếng Việt"
              >
                <Volume2 className="w-3.5 h-3.5" />
                <span>Đọc tên</span>
              </button>
            </div>
            <h1 className="text-3xl sm:text-5xl font-black text-amber-600 dark:text-amber-300 tracking-tight mt-1 truncate">
              {displayList[0].name}
            </h1>
          </div>
        ) : (
          <div className="my-3 p-4 bg-white/90 dark:bg-slate-800/90 rounded-2xl border-2 border-amber-300 dark:border-amber-500 shadow-lg w-full">
            <div className="flex items-center justify-between mb-2">
              <div className="flex items-center gap-1.5 text-xs font-black text-amber-600 dark:text-amber-400">
                <Award className="w-4 h-4 text-amber-500" />
                <span>ĐỘI {displayList.length} BẠN ĐƯỢC CHỌN ({displayList.length} NGÓN TAY 🖐️)</span>
              </div>
              <button
                onClick={() =>
                  sound.speakVirtualMC(
                    `Xin chúc mừng các bạn: ${displayList.map((s) => s.name).join(', ')}!`,
                    voiceURI,
                    voiceRate,
                    voicePitch
                  )
                }
                className="p-1.5 px-2.5 rounded-lg bg-amber-100 hover:bg-amber-200 dark:bg-slate-700 text-amber-700 dark:text-amber-300 transition-colors flex items-center gap-1 text-[11px] font-bold"
                title="Đọc tên tất cả học sinh trong đội bằng giọng Tiếng Việt"
              >
                <Volume2 className="w-3.5 h-3.5" />
                <span>Đọc cả đội</span>
              </button>
            </div>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 mt-2 max-h-56 overflow-y-auto p-1">
              {displayList.map((st, idx) => (
                <div
                  key={st.id}
                  className="flex items-center justify-between p-2.5 rounded-xl bg-amber-50/80 dark:bg-slate-900/80 border border-amber-200/80 dark:border-slate-700 shadow-xs"
                >
                  <div className="flex items-center gap-2 min-w-0">
                    <span className="w-6 h-6 rounded-full bg-amber-400 text-white font-black text-xs flex items-center justify-center shrink-0">
                      {idx + 1}
                    </span>
                    <span className="font-black text-base sm:text-lg text-slate-800 dark:text-slate-100 truncate">
                      {st.name}
                    </span>
                  </div>
                  <button
                    onClick={() => sound.speakVirtualMC(`Bạn ${st.name}`, voiceURI, voiceRate, voicePitch)}
                    className="p-1 text-slate-400 hover:text-amber-600 transition-colors shrink-0"
                    title={`Đọc tên bạn ${st.name}`}
                  >
                    <Volume2 className="w-4 h-4" />
                  </button>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Round Progress Stats */}
        <div className="flex items-center justify-center gap-6 my-4 text-xs font-semibold text-slate-600 dark:text-slate-300 border-t border-b border-amber-200 dark:border-slate-800 py-2.5 w-full">
          <div>
            Tổng số: <span className="font-bold text-slate-900 dark:text-white">{totalStudents}</span>
          </div>
          <div>·</div>
          <div>
            Đã gọi: <span className="font-bold text-emerald-600 dark:text-emerald-400">{calledCount}</span>
          </div>
          <div>·</div>
          <div>
            Còn lại: <span className="font-bold text-amber-600 dark:text-amber-400">{remainingCount}</span>
          </div>
        </div>

        {/* Quick Fireworks Speed & Duration Adjuster */}
        <div className="w-full my-2.5 p-2 rounded-2xl bg-amber-500/10 border border-amber-300/40 text-[11px] flex flex-wrap items-center justify-between gap-2">
          <div className="flex items-center gap-1.5 font-bold text-amber-800 dark:text-amber-300">
            <Sparkles className="w-3.5 h-3.5 text-amber-500" />
            <span>Pháo hoa:</span>
          </div>

          <div className="flex flex-wrap items-center gap-2">
            {/* Speed pills */}
            <div className="flex items-center gap-1 bg-white/90 dark:bg-slate-800/90 px-2 py-0.5 rounded-lg border border-amber-200 dark:border-slate-700">
              <Zap className="w-3 h-3 text-amber-500" />
              <span className="text-[10px] text-slate-500 font-semibold">Tốc độ:</span>
              {(['slow', 'normal', 'fast', 'super'] as FireworksSpeed[]).map((spd) => (
                <button
                  key={spd}
                  type="button"
                  onClick={() => {
                    onUpdateFireworksSettings?.(spd, fireworksDuration);
                    sound.playFireworkBurst(1.1);
                  }}
                  className={`px-1.5 py-0.5 rounded font-bold text-[10px] transition-all ${
                    fireworksSpeed === spd
                      ? 'bg-amber-500 text-white shadow-xs'
                      : 'text-slate-600 dark:text-slate-400 hover:text-slate-900'
                  }`}
                >
                  {spd === 'slow' ? 'Chậm' : spd === 'normal' ? 'Vừa' : spd === 'fast' ? 'Nhanh' : 'Siêu'}
                </button>
              ))}
            </div>

            {/* Duration pills */}
            <div className="flex items-center gap-1 bg-white/90 dark:bg-slate-800/90 px-2 py-0.5 rounded-lg border border-cyan-200 dark:border-slate-700">
              <Clock className="w-3 h-3 text-cyan-500" />
              <span className="text-[10px] text-slate-500 font-semibold">Thời gian:</span>
              {[3, 5, 8, 12].map((dur) => (
                <button
                  key={dur}
                  type="button"
                  onClick={() => {
                    onUpdateFireworksSettings?.(fireworksSpeed, dur);
                    sound.playSparkle();
                  }}
                  className={`px-1.5 py-0.5 rounded font-bold text-[10px] transition-all ${
                    fireworksDuration === dur
                      ? 'bg-cyan-600 text-white shadow-xs'
                      : 'text-slate-600 dark:text-slate-400 hover:text-slate-900'
                  }`}
                >
                  {dur}s
                </button>
              ))}
            </div>
          </div>
        </div>

        {/* Actions */}
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5 w-full mt-2">
          <button
            onClick={() => {
              onClose();
              onNext();
            }}
            className="flex items-center justify-center gap-2 px-5 py-3 rounded-xl bg-amber-500 hover:bg-amber-600 text-white font-black text-sm tracking-wide shadow-lg shadow-amber-500/30 transition-all hover:scale-[1.02]"
          >
            <span>GỌI BẠN TIẾP THEO</span>
            <ArrowRight className="w-4 h-4" />
          </button>

          <button
            onClick={() => {
              onUndo();
              onClose();
            }}
            className="flex items-center justify-center gap-2 px-4 py-3 rounded-xl bg-slate-100 hover:bg-slate-200 dark:bg-slate-800 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-200 font-bold text-xs transition-colors"
          >
            <RotateCcw className="w-4 h-4" />
            <span>HOÀN TÁC LƯỢT VỪA RỒI</span>
          </button>
        </div>

        {remainingCount === 0 && (
          <div className="mt-4 p-3 bg-emerald-50 dark:bg-emerald-950/40 border border-emerald-300 dark:border-emerald-700 rounded-xl w-full text-center">
            <span className="text-xs font-bold text-emerald-800 dark:text-emerald-200 block">
              🎉 Tất cả học sinh đều đã được gọi tên trong lượt này!
            </span>
            <button
              onClick={() => {
                onResetRound();
                onClose();
              }}
              className="mt-2 inline-flex items-center gap-1.5 px-4 py-1.5 bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-bold rounded-lg transition-colors"
            >
              <RefreshCw className="w-3.5 h-3.5" />
              <span>BẮT ĐẦU LƯỢT MỚI</span>
            </button>
          </div>
        )}
      </div>
    </div>
  );
};
