import React from 'react';
import { GameshowSettings } from '../types';
import { Settings, X, Volume2, Clock, Sparkles, Mic, Zap } from 'lucide-react';
import { sound } from '../utils/soundEffects';

interface SettingsModalProps {
  isOpen: boolean;
  settings: GameshowSettings;
  onUpdateSettings: (newSettings: GameshowSettings) => void;
  onClose: () => void;
}

export const SettingsModal: React.FC<SettingsModalProps> = ({
  isOpen,
  settings,
  onUpdateSettings,
  onClose,
}) => {
  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/80 backdrop-blur-sm animate-fade-in">
      <div className="relative w-full max-w-md bg-white dark:bg-slate-900 rounded-3xl shadow-2xl border border-slate-200 dark:border-slate-800 overflow-hidden">
        {/* Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-slate-100 dark:border-slate-800">
          <div className="flex items-center gap-2.5">
            <div className="w-9 h-9 rounded-xl bg-amber-100 dark:bg-amber-950/60 flex items-center justify-center text-amber-600 dark:text-amber-400">
              <Settings className="w-5 h-5" />
            </div>
            <div>
              <h2 className="text-base font-bold text-slate-900 dark:text-white">
                Cài Đặt Gameshow & Hiệu Ứng
              </h2>
              <span className="text-xs text-slate-500">
                Tùy chỉnh thời lượng và mức độ kịch tính
              </span>
            </div>
          </div>

          <button
            onClick={onClose}
            className="p-1.5 text-slate-400 hover:text-slate-600 dark:hover:text-white rounded-lg hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Content */}
        <div className="p-6 space-y-5">
          {/* Duration Selector */}
          <div>
            <div className="flex items-center gap-2 text-xs font-bold text-slate-800 dark:text-slate-200 mb-2">
              <Clock className="w-4 h-4 text-amber-500" />
              <span>Thời Lượng Hiệu Ứng Quay / Chọn:</span>
            </div>
            <div className="grid grid-cols-3 gap-2">
              {[
                { val: 2, label: '2 Giây', desc: 'Nhanh gọn' },
                { val: 4, label: '4 Giây', desc: 'Tiêu chuẩn' },
                { val: 6, label: '6 Giây', desc: 'Kịch tính cao' },
              ].map((opt) => (
                <button
                  key={opt.val}
                  type="button"
                  onClick={() => {
                    onUpdateSettings({ ...settings, duration: opt.val });
                    sound.playSpinTick(1.2);
                  }}
                  className={`p-2.5 rounded-xl border text-center transition-all ${
                    settings.duration === opt.val
                      ? 'bg-amber-500 text-white border-amber-500 shadow-md font-bold'
                      : 'bg-slate-50 dark:bg-slate-800 text-slate-700 dark:text-slate-300 border-slate-200 dark:border-slate-700'
                  }`}
                >
                  <span className="text-sm block">{opt.label}</span>
                  <span className="text-[10px] opacity-80 block">{opt.desc}</span>
                </button>
              ))}
            </div>
          </div>

          {/* Drama & Suspense Level */}
          <div>
            <div className="flex items-center gap-2 text-xs font-bold text-slate-800 dark:text-slate-200 mb-2">
              <Sparkles className="w-4 h-4 text-purple-500" />
              <span>Mức Độ Hồi Hộp & Âm Thanh:</span>
            </div>
            <div className="grid grid-cols-3 gap-2">
              {[
                { key: 'quick', label: 'Êm ái', desc: 'Ít hiệu ứng' },
                { key: 'standard', label: 'Hài hòa', desc: 'Chuẩn sân khấu' },
                { key: 'dramatic', label: 'Bùng nổ', desc: 'Hồi hộp tối đa' },
              ].map((opt) => (
                <button
                  key={opt.key}
                  type="button"
                  onClick={() => {
                    onUpdateSettings({
                      ...settings,
                      dramaLevel: opt.key as 'quick' | 'standard' | 'dramatic',
                    });
                    sound.playSpinTick(1.2);
                  }}
                  className={`p-2.5 rounded-xl border text-center transition-all ${
                    settings.dramaLevel === opt.key
                      ? 'bg-purple-600 text-white border-purple-600 shadow-md font-bold'
                      : 'bg-slate-50 dark:bg-slate-800 text-slate-700 dark:text-slate-300 border-slate-200 dark:border-slate-700'
                  }`}
                >
                  <span className="text-xs block">{opt.label}</span>
                  <span className="text-[10px] opacity-80 block">{opt.desc}</span>
                </button>
              ))}
            </div>
          </div>

          {/* Physics Fireworks Speed Setting */}
          <div className="p-3.5 rounded-2xl bg-amber-50/60 dark:bg-amber-950/20 border border-amber-200 dark:border-amber-900/40">
            <div className="flex items-center justify-between mb-2">
              <div className="flex items-center gap-2 text-xs font-bold text-amber-900 dark:text-amber-300">
                <Zap className="w-4 h-4 text-amber-500" />
                <span>Tốc Độ Pháo Hoa Vật Lý:</span>
              </div>
              <span className="text-[10px] font-bold text-amber-600 bg-amber-100 dark:bg-amber-900/60 px-2 py-0.5 rounded-full">
                {settings.fireworksSpeed === 'slow' ? 'Chậm (0.7x)' : settings.fireworksSpeed === 'fast' ? 'Nhanh (1.4x)' : settings.fireworksSpeed === 'super' ? 'Siêu tốc (2.1x)' : 'Vừa (1.0x)'}
              </span>
            </div>
            <div className="grid grid-cols-4 gap-1.5">
              {[
                { val: 'slow', label: 'Chậm', sub: '0.7x' },
                { val: 'normal', label: 'Vừa', sub: '1.0x' },
                { val: 'fast', label: 'Nhanh', sub: '1.4x' },
                { val: 'super', label: 'Siêu tốc', sub: '2.1x' },
              ].map((opt) => (
                <button
                  key={opt.val}
                  type="button"
                  onClick={() => {
                    onUpdateSettings({
                      ...settings,
                      fireworksSpeed: opt.val as 'slow' | 'normal' | 'fast' | 'super',
                    });
                    sound.playFireworkBurst(1.1);
                  }}
                  className={`p-2 rounded-xl border text-center transition-all ${
                    settings.fireworksSpeed === opt.val
                      ? 'bg-amber-500 text-white border-amber-500 shadow-md font-bold'
                      : 'bg-white dark:bg-slate-800 text-slate-700 dark:text-slate-300 border-slate-200 dark:border-slate-700'
                  }`}
                >
                  <span className="text-xs block font-bold">{opt.label}</span>
                  <span className="text-[9px] opacity-75 block">{opt.sub}</span>
                </button>
              ))}
            </div>
          </div>

          {/* Physics Fireworks Duration Setting */}
          <div className="p-3.5 rounded-2xl bg-cyan-50/60 dark:bg-cyan-950/20 border border-cyan-200 dark:border-cyan-900/40">
            <div className="flex items-center justify-between mb-2">
              <div className="flex items-center gap-2 text-xs font-bold text-cyan-900 dark:text-cyan-300">
                <Clock className="w-4 h-4 text-cyan-500" />
                <span>Thời Gian Bắn Pháo Hoa Chúc Mừng:</span>
              </div>
              <span className="text-[10px] font-bold text-cyan-700 bg-cyan-100 dark:bg-cyan-900/60 px-2 py-0.5 rounded-full">
                {settings.fireworksDuration || 5} Giây
              </span>
            </div>
            <div className="grid grid-cols-4 gap-1.5">
              {[
                { val: 3, label: '3 Giây', desc: 'Nhanh' },
                { val: 5, label: '5 Giây', desc: 'Chuẩn' },
                { val: 8, label: '8 Giây', desc: 'Rực rỡ' },
                { val: 12, label: '12 Giây', desc: 'Đại tiệc' },
              ].map((opt) => (
                <button
                  key={opt.val}
                  type="button"
                  onClick={() => {
                    onUpdateSettings({
                      ...settings,
                      fireworksDuration: opt.val,
                    });
                    sound.playSparkle();
                  }}
                  className={`p-2 rounded-xl border text-center transition-all ${
                    (settings.fireworksDuration || 5) === opt.val
                      ? 'bg-cyan-600 text-white border-cyan-600 shadow-md font-bold'
                      : 'bg-white dark:bg-slate-800 text-slate-700 dark:text-slate-300 border-slate-200 dark:border-slate-700'
                  }`}
                >
                  <span className="text-xs block font-bold">{opt.label}</span>
                  <span className="text-[9px] opacity-75 block">{opt.desc}</span>
                </button>
              ))}
            </div>
          </div>

          {/* Virtual MC Voice Toggle (TTS) */}
          <div className="flex items-center justify-between p-3.5 bg-slate-50 dark:bg-slate-800/60 rounded-2xl border border-slate-200 dark:border-slate-700">
            <div className="flex items-center gap-3">
              <div className="w-8 h-8 rounded-lg bg-indigo-100 dark:bg-indigo-950 flex items-center justify-center text-indigo-600 dark:text-indigo-400">
                <Mic className="w-4 h-4" />
              </div>
              <div>
                <span className="text-xs font-bold text-slate-900 dark:text-white block">
                  Giọng Đọc MC Ảo Tiếng Việt
                </span>
                <span className="text-[11px] text-slate-500">
                  Tự động đọc to tên học sinh khi công bố
                </span>
              </div>
            </div>

            <label className="relative inline-flex items-center cursor-pointer">
              <input
                type="checkbox"
                checked={settings.enableTTS}
                onChange={(e) => onUpdateSettings({ ...settings, enableTTS: e.target.checked })}
                className="sr-only peer"
              />
              <div className="w-11 h-6 bg-slate-300 peer-focus:outline-none rounded-full peer dark:bg-slate-700 peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-slate-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-amber-500" />
            </label>
          </div>

          {/* Performance Saver / Reduced Motion */}
          <div className="flex items-center justify-between p-3.5 bg-slate-50 dark:bg-slate-800/60 rounded-2xl border border-slate-200 dark:border-slate-700">
            <div className="flex items-center gap-3">
              <div className="w-8 h-8 rounded-lg bg-emerald-100 dark:bg-emerald-950 flex items-center justify-center text-emerald-600 dark:text-emerald-400">
                <Zap className="w-4 h-4" />
              </div>
              <div>
                <span className="text-xs font-bold text-slate-900 dark:text-white block">
                  Chế Độ Tiết Kiệm Hiệu Năng
                </span>
                <span className="text-[11px] text-slate-500">
                  Tối ưu cho máy tính cấu hình nhẹ
                </span>
              </div>
            </div>

            <label className="relative inline-flex items-center cursor-pointer">
              <input
                type="checkbox"
                checked={settings.reducedMotion}
                onChange={(e) => onUpdateSettings({ ...settings, reducedMotion: e.target.checked })}
                className="sr-only peer"
              />
              <div className="w-11 h-6 bg-slate-300 peer-focus:outline-none rounded-full peer dark:bg-slate-700 peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-slate-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-emerald-500" />
            </label>
          </div>
        </div>

        {/* Footer */}
        <div className="px-6 py-3 border-t border-slate-100 dark:border-slate-800 bg-slate-50 dark:bg-slate-900/80 flex justify-end">
          <button
            onClick={onClose}
            className="px-5 py-2 bg-slate-900 hover:bg-slate-800 dark:bg-white dark:hover:bg-slate-100 text-white dark:text-slate-900 text-xs font-bold rounded-xl transition-colors"
          >
            Áp Dụng
          </button>
        </div>
      </div>
    </div>
  );
};
