import React, { useState, useEffect } from 'react';
import { Student } from '../../types';
import { sound } from '../../utils/soundEffects';
import { Sparkles, Mail, ShieldCheck } from 'lucide-react';

interface SealedEnvelopeProps {
  isPicking: boolean;
  selectedStudent: Student | null;
  onPickEnd: () => void;
  duration?: number;
}

export const SealedEnvelope: React.FC<SealedEnvelopeProps> = ({
  isPicking,
  selectedStudent,
  onPickEnd,
  duration = 4,
}) => {
  const [envelopeState, setEnvelopeState] = useState<'sealed' | 'breaking' | 'opened'>('sealed');

  useEffect(() => {
    if (!isPicking || !selectedStudent) {
      setEnvelopeState('sealed');
      return;
    }

    setEnvelopeState('breaking');
    sound.playHeartbeat();

    const breakTimer = setTimeout(() => {
      sound.playPaperSlide();
      setEnvelopeState('opened');
      sound.playWinnerFanfare();

      const endTimer = setTimeout(() => {
        onPickEnd();
      }, 1600);

      return () => clearTimeout(endTimer);
    }, (duration * 1000) * 0.45);

    return () => clearTimeout(breakTimer);
  }, [isPicking, selectedStudent, duration, onPickEnd]);

  return (
    <div className="relative w-full max-w-xl mx-auto flex flex-col items-center justify-center p-6 bg-slate-950 rounded-3xl border border-amber-500/30 shadow-2xl overflow-hidden min-h-[400px]">
      {/* Theatrical Spotlight Background */}
      <div className="absolute inset-0 bg-[radial-gradient(circle_at_50%_35%,rgba(245,158,11,0.18),transparent_70%)] pointer-events-none" />

      {/* Mode Header */}
      <div className="flex items-center gap-2 mb-6 z-10">
        <Mail className="w-5 h-5 text-amber-400" />
        <span className="text-xs font-bold uppercase tracking-widest text-amber-300">
          Phong Bì Niêm Phong Bí Mật
        </span>
      </div>

      {/* Main Envelope Visual */}
      <div className="relative w-72 sm:w-80 h-52 flex items-center justify-center">
        {/* Parchment Letter inside sliding upwards */}
        <div
          className={`absolute inset-x-4 bg-gradient-to-b from-amber-50 to-amber-100 rounded-xl p-5 shadow-2xl border-2 border-amber-300 text-center transition-all duration-700 z-10 ${
            envelopeState === 'opened'
              ? '-translate-y-20 scale-105 shadow-amber-500/40'
              : 'translate-y-4 opacity-0 pointer-events-none'
          }`}
        >
          <span className="text-[10px] font-bold text-amber-800 uppercase tracking-widest block">
            ✨ Ngôi sao được xướng tên
          </span>
          <h2 className="text-xl sm:text-2xl font-black text-slate-900 mt-1 whitespace-normal break-words leading-tight px-1">
            {selectedStudent?.name || 'Học sinh'}
          </h2>
          <div className="mt-2 flex items-center justify-center gap-1 text-[11px] font-semibold text-emerald-700 bg-emerald-100 py-0.5 px-2 rounded-full w-max mx-auto">
            <Sparkles className="w-3.5 h-3.5" />
            <span>Mời bạn bước lên sân khấu!</span>
          </div>
        </div>

        {/* Envelope Base Body */}
        <div className="absolute inset-0 bg-gradient-to-tr from-rose-900 via-rose-800 to-red-950 rounded-2xl shadow-2xl border-2 border-amber-400/60 overflow-hidden flex flex-col justify-between z-20">
          {/* Top Flap Triangular Geometry */}
          <div
            className={`w-full h-24 bg-gradient-to-b from-rose-800 to-rose-900 origin-top transition-transform duration-700 shadow-md ${
              envelopeState === 'opened' ? '-rotate-x-180 opacity-60' : 'rotate-x-0'
            }`}
            style={{
              clipPath: 'polygon(0 0, 100% 0, 50% 100%)',
            }}
          />

          {/* Red Wax Seal */}
          {envelopeState !== 'opened' && (
            <div
              className={`absolute inset-0 m-auto w-14 h-14 rounded-full bg-gradient-to-br from-red-600 to-rose-800 border-2 border-amber-300 shadow-xl flex items-center justify-center transition-all duration-300 ${
                envelopeState === 'breaking' ? 'scale-125 animate-ping' : ''
              }`}
            >
              <ShieldCheck className="w-8 h-8 text-amber-300" />
            </div>
          )}

          {/* Bottom Fold */}
          <div className="p-3 text-center text-[10px] font-mono tracking-widest text-amber-200/60">
            OFFICIAL CLASSROOM MAGIC ENVELOPE
          </div>
        </div>
      </div>

      <div className="mt-8 text-center text-xs font-semibold text-slate-300 z-10">
        {envelopeState === 'breaking'
          ? '📜 Đang phá niêm phong phong bì...'
          : envelopeState === 'opened'
          ? '🎉 Phong bì đã mở!'
          : 'Nhấn "GỌI TÊN NGAY" để mở niêm phong lá thư danh dự!'}
      </div>
    </div>
  );
};
