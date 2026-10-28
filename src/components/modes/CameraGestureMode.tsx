import React, { useEffect, useRef, useState, useCallback } from 'react';
import { Student } from '../../types';
import { gestureDetector, GestureDetectionResult } from '../../utils/handGestureDetector';
import { sound } from '../../utils/soundEffects';
import {
  Camera,
  CameraOff,
  SwitchCamera,
  Sparkles,
  Video,
  Play,
  Hand,
  CheckCircle,
} from 'lucide-react';

interface CameraGestureModeProps {
  students: Student[];
  isPicking: boolean;
  selectedStudent: Student | null;
  onTriggerPick: (count?: number) => void;
  onPickEnd: () => void;
}

export const CameraGestureMode: React.FC<CameraGestureModeProps> = ({
  students,
  isPicking,
  selectedStudent,
  onTriggerPick,
  onPickEnd,
}) => {
  const videoRef = useRef<HTMLVideoElement | null>(null);
  const [isActive, setIsActive] = useState<boolean>(true);
  const [currentGesture, setCurrentGesture] = useState<string>('Sẵn sàng dò cử chỉ tay...');
  const [detectedFingers, setDetectedFingers] = useState<number>(1);
  const [recentAction, setRecentAction] = useState<string | null>(null);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);
  const [facing, setFacing] = useState<'user' | 'environment'>('user');
  const [cyclingName, setCyclingName] = useState<string>('GIƠ TAY ĐỂ CHỌN');
  const [lastDetectedTime, setLastDetectedTime] = useState<number>(0);

  const handleGestureResult = useCallback(
    (res: GestureDetectionResult) => {
      setCurrentGesture(res.label);

      if (isPicking) return;

      const now = Date.now();
      if (now - lastDetectedTime < 1600) return; // Cooldown between gesture triggers

      // Finger count gesture mapping: 1, 2, 3, 4, 5
      if (res.fingerCount && res.fingerCount >= 1 && res.fingerCount <= 5) {
        setLastDetectedTime(now);
        setDetectedFingers(res.fingerCount);
        setRecentAction(`🖐️ Giơ ${res.fingerCount} ngón tay -> Đang chọn ${res.fingerCount} học sinh!`);
        sound.playSparkle();
        onTriggerPick(res.fingerCount);
      } else if (res.gesture === 'wave') {
        setLastDetectedTime(now);
        setDetectedFingers(1);
        setRecentAction('👋 Nhận diện VẪY TAY -> Chọn 1 bạn!');
        sound.playSparkle();
        onTriggerPick(1);
      } else if (res.gesture === 'thumbs_up') {
        setLastDetectedTime(now);
        setDetectedFingers(1);
        setRecentAction('👍 Nhận diện NGÓN CÁI -> Chọn 1 bạn!');
        sound.playSparkle();
        onTriggerPick(1);
      }
    },
    [isPicking, onTriggerPick, lastDetectedTime]
  );

  useEffect(() => {
    gestureDetector.setOnGesture(handleGestureResult);
  }, [handleGestureResult]);

  // Start webcam
  const startCamera = useCallback(async () => {
    setErrorMsg(null);
    if (!videoRef.current) return;
    try {
      const ok = await gestureDetector.startCamera(videoRef.current, facing);
      if (ok) {
        setIsActive(true);
      } else {
        setErrorMsg('Không thể truy cập camera. Vui lòng cho phép quyền trên trình duyệt.');
      }
    } catch {
      setErrorMsg('Lỗi kích hoạt camera thiết bị.');
    }
  }, [facing]);

  const stopCamera = useCallback(() => {
    gestureDetector.stopCamera();
    setIsActive(false);
  }, []);

  useEffect(() => {
    startCamera();
    return () => {
      stopCamera();
    };
  }, [startCamera, stopCamera]);

  // Cycling during pick
  useEffect(() => {
    if (!isPicking || !selectedStudent) return;
    let step = 0;
    const interval = setInterval(() => {
      const rand = students[Math.floor(Math.random() * students.length)]?.name || 'Học sinh';
      setCyclingName(rand);
      sound.playSpinTick(1.2);
      step++;
      if (step >= 22) {
        clearInterval(interval);
        setCyclingName(selectedStudent.name);
        sound.playWinnerFanfare();
        setTimeout(() => {
          onPickEnd();
        }, 1400);
      }
    }, 80);

    return () => clearInterval(interval);
  }, [isPicking, selectedStudent, students, onPickEnd]);

  return (
    <div className="relative w-full max-w-2xl mx-auto flex flex-col items-center justify-center p-4 sm:p-6 bg-slate-950/85 rounded-3xl border-2 border-indigo-500/50 shadow-2xl backdrop-blur-md overflow-hidden">
      {/* Header bar */}
      <div className="w-full flex items-center justify-between mb-3">
        <div className="flex items-center gap-2 px-3.5 py-1.5 rounded-full bg-indigo-500/20 border border-indigo-400/60 text-indigo-300 text-xs font-black shadow-xs">
          <Camera className="w-4 h-4 text-indigo-400" />
          <span>TƯƠNG TÁC CAMERA AI – GỌI TÊN BẰNG TAY</span>
        </div>

        <div className="flex items-center gap-2">
          <button
            onClick={() => {
              setFacing(f => (f === 'user' ? 'environment' : 'user'));
            }}
            className="p-1.5 text-xs rounded-xl bg-slate-800 text-slate-300 hover:bg-slate-700 flex items-center gap-1 transition-all"
            title="Đổi camera trước / sau"
          >
            <SwitchCamera className="w-3.5 h-3.5" />
            <span className="hidden sm:inline">Đổi camera</span>
          </button>
          <button
            onClick={isActive ? stopCamera : startCamera}
            className={`p-1.5 px-2.5 text-xs font-bold rounded-xl flex items-center gap-1 transition-all ${
              isActive ? 'bg-rose-500/20 text-rose-300 border border-rose-500/30' : 'bg-emerald-500/20 text-emerald-300 border border-emerald-500/30'
            }`}
          >
            {isActive ? <CameraOff className="w-3.5 h-3.5" /> : <Video className="w-3.5 h-3.5" />}
            <span>{isActive ? 'Tắt cam' : 'Bật cam'}</span>
          </button>
        </div>
      </div>

      {/* Mascot Ms. Mèo Welcome Bubble */}
      <div className="w-full mb-3 flex items-center gap-3 p-2.5 rounded-2xl bg-amber-500/10 border border-amber-400/30">
        <div className="w-11 h-11 rounded-xl overflow-hidden border border-amber-300 shadow-md shrink-0">
          <img
            src="/src/assets/images/ms_meo_mascot_1793188289324.jpg"
            alt="Ms Mèo Mascot"
            className="w-full h-full object-cover"
          />
        </div>
        <div className="text-left flex-1 min-w-0">
          <div className="text-[11px] font-bold text-amber-300 flex items-center gap-1">
            <span>🐾 LỜI NHẮC TỪ MS MÈO</span>
          </div>
          <div className="text-xs text-slate-200 truncate sm:whitespace-normal font-medium">
            Giơ ngón tay trước camera: <strong>giơ 1 ngón chọn 1 bạn</strong>, <strong>2 ngón chọn 2</strong>, <strong>3 ngón chọn 3</strong>, <strong>4 ngón chọn 4</strong>, <strong>5 ngón chọn 5 bạn</strong>!
          </div>
        </div>
      </div>

      {/* 1 to 5 Finger Real-Time Selector HUD */}
      <div className="w-full max-w-lg mb-3 p-2 rounded-2xl bg-slate-900/90 border border-indigo-500/40 shadow-md">
        <div className="text-[11px] font-bold text-cyan-300 uppercase tracking-wider mb-1.5 flex items-center justify-between">
          <span className="flex items-center gap-1">
            <span>🖐️</span>
            <span>CHỌN SỐ HỌC SINH BẰNG NGÓN TAY:</span>
          </span>
          <span className="text-[10px] text-amber-300">Đang chọn: {detectedFingers} bạn</span>
        </div>
        <div className="grid grid-cols-5 gap-1.5">
          {[
            { count: 1, icon: '☝️', label: '1 Bạn' },
            { count: 2, icon: '✌️', label: '2 Bạn' },
            { count: 3, icon: '🤟', label: '3 Bạn' },
            { count: 4, icon: '🖖', label: '4 Bạn' },
            { count: 5, icon: '🖐️', label: '5 Bạn' },
          ].map((item) => (
            <button
              key={item.count}
              onClick={() => {
                setDetectedFingers(item.count);
                sound.playSparkle();
                onTriggerPick(item.count);
              }}
              disabled={isPicking}
              className={`py-2 px-1 rounded-xl text-xs font-black transition-all flex flex-col items-center gap-0.5 border ${
                detectedFingers === item.count
                  ? 'bg-gradient-to-b from-amber-500 to-orange-500 text-white border-yellow-300 shadow-md shadow-amber-500/40 scale-105 ring-2 ring-yellow-400'
                  : 'bg-slate-800/80 text-slate-300 border-slate-700 hover:bg-slate-700/80'
              }`}
              title={`Giơ ${item.count} ngón tay hoặc bấm để chọn ${item.count} học sinh`}
            >
              <span className="text-base">{item.icon}</span>
              <span className="text-[10px] leading-none">{item.label}</span>
            </button>
          ))}
        </div>
      </div>

      {/* Camera Feed with Augmented Reality HUD Overlay */}
      <div className="relative w-full aspect-video max-w-lg rounded-2xl overflow-hidden bg-slate-900 border-2 border-indigo-400/60 shadow-inner flex items-center justify-center">
        <video
          ref={videoRef}
          autoPlay
          playsInline
          muted
          className={`w-full h-full object-cover transform ${facing === 'user' ? 'scale-x-[-1]' : ''}`}
        />

        {/* Augmented Reality Scanning Frame */}
        <div className="absolute inset-3 border-2 border-dashed border-indigo-400/50 rounded-xl pointer-events-none flex flex-col justify-between p-2.5">
          <div className="flex justify-between items-center text-[10px] font-mono text-cyan-300">
            <span className="bg-black/50 px-2 py-0.5 rounded border border-cyan-400/30">[AI_FINGER_SCAN]</span>
            <span className="flex items-center gap-1.5 bg-black/50 px-2 py-0.5 rounded border border-emerald-400/30">
              <span className="w-2 h-2 rounded-full bg-emerald-400 animate-ping" />
              <span className="text-emerald-300 font-bold">ONLINE</span>
            </span>
          </div>

          {/* Center Target Crosshair & Palm Frame */}
          <div className="w-20 h-20 mx-auto border-2 border-indigo-400/60 rounded-2xl flex flex-col items-center justify-center animate-pulse relative bg-indigo-500/10">
            <div className="text-xl">🖐️</div>
            <div className="text-[9px] font-bold text-indigo-200 uppercase tracking-widest mt-0.5">
              GIƠ {detectedFingers} NGÓN
            </div>
          </div>

          <div className="text-center">
            <span className="inline-block px-3.5 py-1.5 rounded-full bg-black/80 backdrop-blur text-xs font-bold text-amber-300 border border-amber-400/50 shadow-md">
              {currentGesture}
            </span>
          </div>
        </div>

        {/* Active Picking Overlay */}
        {isPicking && (
          <div className="absolute inset-0 bg-black/80 backdrop-blur-xs flex flex-col items-center justify-center p-4 z-20">
            <Sparkles className="w-10 h-10 text-yellow-400 animate-spin mb-2" />
            <span className="text-xs uppercase tracking-widest text-yellow-300 font-bold mb-2">
              CAMERA ĐANG GỌI {detectedFingers} HỌC SINH...
            </span>
            <div className="px-6 py-3.5 rounded-2xl bg-amber-500 text-white font-black text-2xl sm:text-3xl shadow-xl ring-4 ring-amber-300 animate-pulse text-center">
              {cyclingName}
            </div>
          </div>
        )}

        {errorMsg && (
          <div className="absolute inset-0 bg-slate-950/90 flex flex-col items-center justify-center p-4 text-center z-20">
            <CameraOff className="w-12 h-12 text-rose-400 mb-2" />
            <p className="text-xs text-rose-200 mb-3">{errorMsg}</p>
            <button
              onClick={startCamera}
              className="px-4 py-2 rounded-xl bg-indigo-600 text-white text-xs font-bold hover:bg-indigo-700 shadow-md"
            >
              Thử lại camera
            </button>
          </div>
        )}
      </div>

      {/* Action Notification */}
      {recentAction && (
        <div className="mt-3 px-4 py-1.5 rounded-xl bg-emerald-950/80 border border-emerald-500/50 text-emerald-200 text-xs font-bold flex items-center gap-1.5 animate-bounce">
          <CheckCircle className="w-3.5 h-3.5 text-emerald-400" />
          <span>{recentAction}</span>
        </div>
      )}

      {/* Quick Trigger Button for Fallback / Manual Tap */}
      <div className="w-full mt-3 flex items-center justify-center">
        <button
          onClick={() => onTriggerPick(detectedFingers)}
          disabled={isPicking}
          className="w-full max-w-md py-3 px-6 rounded-2xl bg-gradient-to-r from-indigo-500 via-purple-500 to-pink-500 hover:from-indigo-600 hover:to-pink-600 text-white font-black text-sm sm:text-base shadow-lg shadow-purple-500/30 flex items-center justify-center gap-2 active:scale-95 transition-all"
        >
          <Hand className="w-5 h-5 animate-pulse" />
          <span>GIƠ TAY HOẶC BẤM ĐỂ CHỌN {detectedFingers} HỌC SINH NGAY!</span>
        </button>
      </div>

      {/* Gestures Guide Strip */}
      <div className="mt-3 grid grid-cols-5 gap-1.5 w-full max-w-lg text-xs">
        <div className="p-1.5 rounded-xl bg-slate-900/80 border border-slate-800 flex flex-col items-center text-center">
          <span className="text-xl">☝️</span>
          <div className="font-bold text-white text-[11px]">1 Ngón</div>
          <div className="text-[9px] text-slate-400">1 học sinh</div>
        </div>
        <div className="p-1.5 rounded-xl bg-slate-900/80 border border-slate-800 flex flex-col items-center text-center">
          <span className="text-xl">✌️</span>
          <div className="font-bold text-white text-[11px]">2 Ngón</div>
          <div className="text-[9px] text-slate-400">2 học sinh</div>
        </div>
        <div className="p-1.5 rounded-xl bg-slate-900/80 border border-slate-800 flex flex-col items-center text-center">
          <span className="text-xl">🤟</span>
          <div className="font-bold text-white text-[11px]">3 Ngón</div>
          <div className="text-[9px] text-slate-400">3 học sinh</div>
        </div>
        <div className="p-1.5 rounded-xl bg-slate-900/80 border border-slate-800 flex flex-col items-center text-center">
          <span className="text-xl">🖖</span>
          <div className="font-bold text-white text-[11px]">4 Ngón</div>
          <div className="text-[9px] text-slate-400">4 học sinh</div>
        </div>
        <div className="p-1.5 rounded-xl bg-slate-900/80 border border-slate-800 flex flex-col items-center text-center">
          <span className="text-xl">🖐️</span>
          <div className="font-bold text-white text-[11px]">5 Ngón</div>
          <div className="text-[9px] text-slate-400">5 học sinh</div>
        </div>
      </div>
    </div>
  );
};
