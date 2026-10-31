import React, { useState, useEffect } from 'react';
import { GameshowSettings } from '../types';
import { Settings, X, Volume2, Clock, Sparkles, Mic, Zap, Home, RefreshCw, Check, CheckCircle2 } from 'lucide-react';
import { sound } from '../utils/soundEffects';
import { STANDARD_VIETNAMESE_VOICE_PRESETS, getPrioritizedVietnameseVoices } from '../utils/vietnameseSpeech';

interface SettingsModalProps {
  isOpen: boolean;
  settings: GameshowSettings;
  onUpdateSettings: (newSettings: GameshowSettings) => void;
  onClose: () => void;
  onGoHome?: () => void;
}

export const SettingsModal: React.FC<SettingsModalProps> = ({
  isOpen,
  settings,
  onUpdateSettings,
  onClose,
  onGoHome,
}) => {
  const [vietnameseVoices, setVietnameseVoices] = useState<SpeechSynthesisVoice[]>([]);
  const [isScanning, setIsScanning] = useState<boolean>(false);
  const [isTestingVoice, setIsTestingVoice] = useState<boolean>(false);

  const refreshVoices = () => {
    setIsScanning(true);
    if (typeof window !== 'undefined' && 'speechSynthesis' in window) {
      window.speechSynthesis.getVoices();
      const vi = sound.getVietnameseVoices();
      setVietnameseVoices(vi);
    }
    setTimeout(() => setIsScanning(false), 400);
  };

  useEffect(() => {
    refreshVoices();
    if (typeof window !== 'undefined' && 'speechSynthesis' in window) {
      window.speechSynthesis.onvoiceschanged = () => {
        const vi = sound.getVietnameseVoices();
        setVietnameseVoices(vi);
      };
    }
  }, []);

  // Keyboard shortcut: Press Escape key to close/exit modal
  useEffect(() => {
    if (!isOpen) return;
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        e.preventDefault();
        onClose();
        if (onGoHome) onGoHome();
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [isOpen, onClose, onGoHome]);

  if (!isOpen) return null;

  const handleReturnHome = () => {
    onClose();
    if (onGoHome) {
      onGoHome();
    }
  };

  return (
    <div
      onClick={(e) => {
        // Clicking backdrop closes modal and safely returns
        if (e.target === e.currentTarget) {
          onClose();
        }
      }}
      className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-6 bg-slate-950/85 backdrop-blur-md overflow-y-auto animate-fade-in"
    >
      {/* Floating Always-Visible Top Exit Button (Guaranteed visible even on extreme low-height screens) */}
      <div className="fixed top-3 right-3 sm:top-5 sm:right-6 z-[60] flex items-center gap-2">
        <button
          onClick={handleReturnHome}
          className="flex items-center gap-1.5 px-3.5 py-2 rounded-full bg-indigo-600 hover:bg-indigo-700 active:scale-95 text-white font-bold text-xs shadow-xl shadow-indigo-600/30 border border-indigo-400/50 backdrop-blur transition-all"
          title="Thoát cài đặt và quay về trang chủ (phím Esc)"
        >
          <Home className="w-4 h-4 text-yellow-300" />
          <span>Thoát về Trang Chủ</span>
          <kbd className="hidden sm:inline px-1.5 py-0.5 rounded bg-black/30 text-[10px] text-white/90 font-mono">
            Esc
          </kbd>
        </button>

        <button
          onClick={onClose}
          className="p-2 rounded-full bg-slate-800/90 hover:bg-slate-700 text-slate-300 hover:text-white border border-slate-700 shadow-xl transition-all"
          title="Đóng cửa sổ cài đặt"
        >
          <X className="w-4 h-4" />
        </button>
      </div>

      {/* Main Modal Dialog Box */}
      <div className="relative w-full max-w-lg max-h-[85vh] flex flex-col bg-white dark:bg-slate-900 rounded-3xl shadow-2xl border border-indigo-200 dark:border-slate-800 overflow-hidden my-auto">
        {/* Sticky Header */}
        <div className="shrink-0 sticky top-0 z-20 bg-white/95 dark:bg-slate-900/95 backdrop-blur px-5 sm:px-6 py-3.5 sm:py-4 border-b border-slate-100 dark:border-slate-800 flex items-center justify-between gap-3">
          <div className="flex items-center gap-2.5 min-w-0">
            <div className="w-9 h-9 rounded-xl bg-indigo-100 dark:bg-indigo-950/60 flex items-center justify-center text-indigo-600 dark:text-indigo-400 shrink-0">
              <Settings className="w-5 h-5" />
            </div>
            <div className="min-w-0">
              <h2 className="text-base font-bold text-slate-900 dark:text-white truncate">
                Cài Đặt Gameshow & Hiệu Ứng
              </h2>
              <span className="text-xs text-slate-500 truncate block">
                Tùy chỉnh thời lượng, âm thanh và giọng đọc
              </span>
            </div>
          </div>

          <div className="flex items-center gap-1.5 shrink-0">
            <button
              onClick={handleReturnHome}
              className="px-3 py-1.5 rounded-xl bg-indigo-50 hover:bg-indigo-100 dark:bg-indigo-950/60 text-indigo-700 dark:text-indigo-300 border border-indigo-200 dark:border-indigo-800 text-xs font-bold transition-all flex items-center gap-1"
              title="Quay về trang chủ"
            >
              <Home className="w-3.5 h-3.5 text-indigo-600 dark:text-indigo-400" />
              <span>Trang chủ</span>
            </button>
            <button
              onClick={onClose}
              className="p-1.5 text-slate-400 hover:text-slate-600 dark:hover:text-white rounded-lg hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors"
              title="Đóng (Esc)"
            >
              <X className="w-5 h-5" />
            </button>
          </div>
        </div>

        {/* Scrollable Content Body */}
        <div className="flex-1 overflow-y-auto p-5 sm:p-6 space-y-5 overscroll-contain">
          {/* Quick Notice Banner with Home Exit */}
          <div className="p-3 rounded-2xl bg-indigo-50/70 dark:bg-indigo-950/40 border border-indigo-200/80 dark:border-indigo-900/50 flex items-center justify-between gap-2">
            <div className="flex items-center gap-2 text-xs text-indigo-900 dark:text-indigo-300 font-medium">
              <Sparkles className="w-4 h-4 text-indigo-500 shrink-0" />
              <span>Các thay đổi được áp dụng tự động ngay lập tức.</span>
            </div>
            <button
              onClick={handleReturnHome}
              className="px-2.5 py-1 bg-indigo-600 hover:bg-indigo-700 text-white text-[11px] font-bold rounded-lg shrink-0 flex items-center gap-1 transition-all"
            >
              <Home className="w-3 h-3" />
              <span>Về Trang Chủ</span>
            </button>
          </div>

          {/* Duration Selector */}
          <div>
            <div className="flex items-center gap-2 text-xs font-bold text-slate-800 dark:text-slate-200 mb-2">
              <Clock className="w-4 h-4 text-indigo-500" />
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
                      ? 'bg-indigo-600 text-white border-indigo-600 shadow-md font-bold'
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

          {/* Virtual MC Voice & Vietnamese Language Selector */}
          <div className="p-3.5 bg-slate-50 dark:bg-slate-800/60 rounded-2xl border border-slate-200 dark:border-slate-700 space-y-3">
            <div className="flex items-center justify-between">
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
                <div className="w-11 h-6 bg-slate-300 peer-focus:outline-none rounded-full peer dark:bg-slate-700 peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-slate-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-indigo-600" />
              </label>
            </div>

            {settings.enableTTS && (
              <div className="pt-2.5 border-t border-slate-200/80 dark:border-slate-700/80 space-y-3">
                {/* Chế độ đọc Tiếng Việt có dấu chuẩn */}
                <div className="p-2.5 rounded-xl bg-indigo-50/80 dark:bg-indigo-950/40 border border-indigo-200/80 dark:border-indigo-900/50 flex items-center justify-between gap-2">
                  <div className="flex items-center gap-2">
                    <span className="text-base">🇻🇳</span>
                    <div>
                      <div className="text-xs font-bold text-indigo-950 dark:text-indigo-200 flex items-center gap-1.5">
                        <span>Đọc Tiếng Việt Có Dấu Chuẩn</span>
                        <span className="px-1.5 py-0.2 rounded bg-emerald-100 text-emerald-700 dark:bg-emerald-950 dark:text-emerald-300 text-[9px] font-black uppercase">
                          Khuyên dùng
                        </span>
                      </div>
                      <span className="text-[10px] text-slate-600 dark:text-slate-400 block">
                        Chuẩn hóa dấu thanh (sắc, huyền, hỏi, ngã, nặng), ngắt nghỉ tự nhiên
                      </span>
                    </div>
                  </div>

                  <label className="relative inline-flex items-center cursor-pointer shrink-0">
                    <input
                      type="checkbox"
                      checked={settings.vietnameseStandardAccent ?? true}
                      onChange={(e) =>
                        onUpdateSettings({ ...settings, vietnameseStandardAccent: e.target.checked })
                      }
                      className="sr-only peer"
                    />
                    <div className="w-9 h-5 bg-slate-300 peer-focus:outline-none rounded-full peer dark:bg-slate-700 peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-slate-300 after:border after:rounded-full after:h-4 after:w-4 after:transition-all peer-checked:bg-emerald-600" />
                  </label>
                </div>

                {/* Quick Preset Voice Pills */}
                <div>
                  <div className="flex items-center justify-between mb-1.5">
                    <label className="text-[11px] font-bold text-slate-700 dark:text-slate-300 flex items-center gap-1.5">
                      <span>🇻🇳 Chọn Giọng Đọc Google / Microsoft:</span>
                    </label>
                    <button
                      type="button"
                      onClick={refreshVoices}
                      disabled={isScanning}
                      className="text-[10px] text-indigo-600 dark:text-indigo-400 hover:text-indigo-800 font-semibold flex items-center gap-1 transition-colors"
                      title="Quét lại danh sách giọng từ trình duyệt nếu chưa tải xong"
                    >
                      <RefreshCw className={`w-3 h-3 ${isScanning ? 'animate-spin' : ''}`} />
                      <span>{isScanning ? 'Đang quét...' : 'Làm mới giọng'}</span>
                    </button>
                  </div>

                  {/* Preset quick buttons */}
                  <div className="grid grid-cols-2 sm:grid-cols-3 gap-1.5 mb-2">
                    {[
                      {
                        id: '',
                        label: '✨ Tự động',
                        sub: 'Tối ưu nhất',
                        provider: 'Auto',
                      },
                      {
                        id: 'Microsoft HoaiMy Online (Natural) - Vietnamese (Vietnam)',
                        label: '👩 Hoài My',
                        sub: 'Nữ Bắc · MS Natural',
                        provider: 'Microsoft',
                      },
                      {
                        id: 'Microsoft NamMinh Online (Natural) - Vietnamese (Vietnam)',
                        label: '👨 Nam Minh',
                        sub: 'Nam Bắc · MS Natural',
                        provider: 'Microsoft',
                      },
                      {
                        id: 'Google tiếng Việt',
                        label: '🌐 Google',
                        sub: 'Chuẩn rõ dấu',
                        provider: 'Google',
                      },
                      {
                        id: 'Linh',
                        label: '🍎 Linh',
                        sub: 'Mac / iOS',
                        provider: 'Apple',
                      },
                      {
                        id: 'vi-VN',
                        label: '🇻🇳 Mặc định',
                        sub: 'vi-VN Hệ thống',
                        provider: 'System',
                      },
                    ].map((item) => {
                      const isSelected =
                        (settings.voiceURI || '') === item.id ||
                        (!settings.voiceURI && item.id === '');
                      return (
                        <button
                          key={item.id}
                          type="button"
                          onClick={() => {
                            onUpdateSettings({ ...settings, voiceURI: item.id });
                            sound.setPreferredVoice(item.id || null);
                            sound.playSpinTick(1.2);
                          }}
                          className={`p-2 rounded-xl text-left border transition-all ${
                            isSelected
                              ? 'bg-gradient-to-r from-indigo-600 to-purple-600 text-white border-indigo-500 shadow-md ring-2 ring-indigo-400/50'
                              : 'bg-white dark:bg-slate-900 text-slate-700 dark:text-slate-300 border-slate-200 dark:border-slate-700 hover:bg-slate-100 dark:hover:bg-slate-800'
                          }`}
                        >
                          <div className="flex items-center justify-between">
                            <span className="text-xs font-bold truncate">{item.label}</span>
                            {isSelected && <Check className="w-3.5 h-3.5 text-yellow-300 shrink-0" />}
                          </div>
                          <span
                            className={`text-[9px] block truncate mt-0.5 ${
                              isSelected ? 'text-indigo-100' : 'text-slate-500'
                            }`}
                          >
                            {item.sub}
                          </span>
                        </button>
                      );
                    })}
                  </div>

                  {/* Dropdown with all available voices */}
                  <select
                    value={settings.voiceURI || ''}
                    onChange={(e) => {
                      const newURI = e.target.value;
                      onUpdateSettings({ ...settings, voiceURI: newURI });
                      sound.setPreferredVoice(newURI || null);
                    }}
                    className="w-full text-xs p-2 rounded-xl bg-white dark:bg-slate-900 border border-slate-300 dark:border-slate-700 text-slate-800 dark:text-slate-200 focus:outline-none focus:ring-2 focus:ring-indigo-500 font-medium"
                  >
                    <optgroup label="⭐ Giọng Đọc Google & Microsoft Chuẩn Khuyên Dùng">
                      {STANDARD_VIETNAMESE_VOICE_PRESETS.map((p) => (
                        <option key={p.id} value={p.id}>
                          {p.name} [{p.dialect} - {p.badge}]
                        </option>
                      ))}
                    </optgroup>

                    {vietnameseVoices.length > 0 && (
                      <optgroup label={`🎙️ Giọng Tiếng Việt Có Sẵn Trên Máy (${vietnameseVoices.length} giọng)`}>
                        {vietnameseVoices.map((v) => (
                          <option key={v.voiceURI} value={v.voiceURI}>
                            🇻🇳 {v.name} ({v.lang})
                          </option>
                        ))}
                      </optgroup>
                    )}
                  </select>
                </div>

                {/* Speed & Pitch Controls */}
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 pt-1">
                  {/* Speed / Rate Selection */}
                  <div className="p-2 rounded-xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700">
                    <span className="text-[10px] font-bold text-slate-600 dark:text-slate-300 block mb-1">
                      Tốc độ phát âm:
                    </span>
                    <div className="grid grid-cols-3 gap-1">
                      {[
                        { val: 0.92, label: '0.9x Rõ chữ' },
                        { val: 0.98, label: '1.0x Chuẩn' },
                        { val: 1.12, label: '1.1x Nhanh' },
                      ].map((spd) => (
                        <button
                          key={spd.val}
                          type="button"
                          onClick={() => {
                            onUpdateSettings({ ...settings, voiceRate: spd.val });
                            sound.setVoiceRate(spd.val);
                          }}
                          className={`py-1 px-0.5 rounded text-[10px] font-bold text-center transition-all ${
                            (settings.voiceRate || 0.98) === spd.val
                              ? 'bg-indigo-600 text-white shadow-xs'
                              : 'bg-slate-50 dark:bg-slate-800 text-slate-600 dark:text-slate-400 hover:text-slate-900'
                          }`}
                        >
                          {spd.label}
                        </button>
                      ))}
                    </div>
                  </div>

                  {/* Pitch Selection */}
                  <div className="p-2 rounded-xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700">
                    <span className="text-[10px] font-bold text-slate-600 dark:text-slate-300 block mb-1">
                      Cao độ giọng (Pitch):
                    </span>
                    <div className="grid grid-cols-3 gap-1">
                      {[
                        { val: 0.95, label: 'Trầm ấm' },
                        { val: 1.02, label: 'Tự nhiên' },
                        { val: 1.10, label: 'Trong trẻo' },
                      ].map((pit) => (
                        <button
                          key={pit.val}
                          type="button"
                          onClick={() => {
                            onUpdateSettings({ ...settings, voicePitch: pit.val });
                            sound.setVoicePitch(pit.val);
                          }}
                          className={`py-1 px-0.5 rounded text-[10px] font-bold text-center transition-all ${
                            (settings.voicePitch || 1.02) === pit.val
                              ? 'bg-purple-600 text-white shadow-xs'
                              : 'bg-slate-50 dark:bg-slate-800 text-slate-600 dark:text-slate-400 hover:text-slate-900'
                          }`}
                        >
                          {pit.label}
                        </button>
                      ))}
                    </div>
                  </div>
                </div>

                {/* Test Voice Button with comprehensive Vietnamese tones */}
                <button
                  type="button"
                  onClick={() => {
                    setIsTestingVoice(true);
                    sound.speakVirtualMC(
                      'Ms Mèo xin chúc mừng bạn Nguyễn Hoàng Tuấn Vũ đã tỏa sáng!',
                      settings.voiceURI,
                      settings.voiceRate,
                      settings.voicePitch
                    );
                    setTimeout(() => setIsTestingVoice(false), 2800);
                  }}
                  className="w-full py-2.5 px-3 rounded-xl bg-gradient-to-r from-indigo-500 via-purple-600 to-pink-500 hover:from-indigo-600 hover:to-pink-600 text-white text-xs font-bold transition-all flex items-center justify-center gap-1.5 shadow-md shadow-indigo-500/20 active:scale-95"
                >
                  <Volume2 className={`w-4 h-4 ${isTestingVoice ? 'animate-bounce text-yellow-300' : ''}`} />
                  <span>
                    {isTestingVoice
                      ? '🔊 Đang đọc thử: "Nguyễn Hoàng Tuấn Vũ"...'
                      : 'Nghe thử phát âm chuẩn dấu Google / Microsoft 🔊'}
                  </span>
                </button>
              </div>
            )}
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

          {/* Bottom Callout: Ready to go back home */}
          <div className="p-3.5 rounded-2xl bg-slate-100 dark:bg-slate-800/60 border border-slate-200 dark:border-slate-700 flex items-center justify-between gap-3">
            <span className="text-xs text-slate-600 dark:text-slate-300 font-medium">
              Đã hoàn tất cài đặt?
            </span>
            <button
              onClick={handleReturnHome}
              className="px-4 py-2 bg-gradient-to-r from-indigo-600 to-purple-600 hover:from-indigo-700 hover:to-purple-700 text-white text-xs font-bold rounded-xl shadow-md shadow-indigo-500/25 flex items-center gap-1.5 transition-all"
            >
              <Home className="w-3.5 h-3.5" />
              <span>Quay về Trang Chủ</span>
            </button>
          </div>
        </div>

        {/* Sticky Footer */}
        <div className="shrink-0 sticky bottom-0 z-20 px-5 sm:px-6 py-3.5 border-t border-slate-100 dark:border-slate-800 bg-white/95 dark:bg-slate-900/95 backdrop-blur flex items-center justify-between gap-3">
          <button
            onClick={handleReturnHome}
            className="px-4 py-2.5 bg-indigo-50 hover:bg-indigo-100 dark:bg-indigo-950/60 dark:hover:bg-indigo-900/60 text-indigo-700 dark:text-indigo-300 text-xs font-bold rounded-xl transition-all flex items-center gap-1.5 border border-indigo-200 dark:border-indigo-800"
          >
            <Home className="w-4 h-4 text-indigo-600 dark:text-indigo-400" />
            <span>Thoát về Trang Chủ</span>
          </button>

          <button
            onClick={onClose}
            className="px-5 py-2.5 bg-indigo-600 hover:bg-indigo-700 text-white text-xs font-bold rounded-xl transition-colors shadow-md shadow-indigo-500/20"
          >
            Đóng & Lưu Cài Đặt
          </button>
        </div>
      </div>
    </div>
  );
};
