import React, { useEffect, useRef, useState, useCallback } from 'react';
import { gestureDetector, GestureDetectionResult } from '../utils/handGestureDetector';
import {
  Camera,
  CameraOff,
  SwitchCamera,
  Minimize2,
  Maximize2,
  Sparkles,
  HelpCircle,
  Eye,
} from 'lucide-react';

interface CameraGesturePanelProps {
  onTriggerPick: (count?: number) => void;
  onSelectMode: (mode: 'gift' | 'wheel') => void;
  onPause: () => void;
}

export const CameraGesturePanel: React.FC<CameraGesturePanelProps> = ({
  onTriggerPick,
  onSelectMode,
  onPause,
}) => {
  const videoRef = useRef<HTMLVideoElement | null>(null);
  const [isActive, setIsActive] = useState<boolean>(false);
  const [isMinimized, setIsMinimized] = useState<boolean>(false);
  const [currentGesture, setCurrentGesture] = useState<string>('✋ Chưa dơ tay – Hãy giơ 1-5 ngón tay');
  const [isHandRaised, setIsHandRaised] = useState<boolean>(false);
  const [holdProgress, setHoldProgress] = useState<number>(0);
  const [cameraState, setCameraState] = useState<string>('no_hand');
  const [recentAction, setRecentAction] = useState<string | null>(null);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);
  const [facing, setFacing] = useState<'user' | 'environment'>('user');
  const [showGuide, setShowGuide] = useState<boolean>(false);

  const handleGestureResult = useCallback(
    (res: GestureDetectionResult) => {
      setCurrentGesture(res.label);
      setIsHandRaised(res.isHandRaised);
      setHoldProgress(res.confirmProgress);
      setCameraState(res.state);

      // ONLY INTERACT WHEN STATE IS STRICTLY 'confirmed'
      if (res.state !== 'confirmed' || !res.isHandRaised) {
        return;
      }

      if (res.fingerCount && res.fingerCount >= 1 && res.fingerCount <= 5) {
        setRecentAction(`🖐️ Giơ ${res.fingerCount} ngón tay -> Đã chọn ${res.fingerCount} học sinh!`);
        onTriggerPick(res.fingerCount);
      } else if (res.gesture === 'wave') {
        setRecentAction('👋 Nhận diện VẪY TAY -> Chọn 1 bạn!');
        onTriggerPick(1);
      }
    },
    [onTriggerPick]
  );

  useEffect(() => {
    gestureDetector.setOnGesture(handleGestureResult);
  }, [handleGestureResult]);

  const startCamera = async () => {
    setErrorMsg(null);
    if (!videoRef.current) return;
    const ok = await gestureDetector.startCamera(videoRef.current, facing);
    if (ok) {
      setIsActive(true);
    } else {
      setErrorMsg('Không thể mở camera. Vui lòng cấp quyền camera trong trình duyệt.');
      setIsActive(false);
    }
  };

  const stopCamera = () => {
    gestureDetector.stopCamera();
    setIsActive(false);
    setCurrentGesture('Đã tắt camera');
    setRecentAction(null);
  };

  const toggleFacing = async () => {
    if (!videoRef.current) return;
    const nextFacing = facing === 'user' ? 'environment' : 'user';
    setFacing(nextFacing);
    await gestureDetector.startCamera(videoRef.current, nextFacing);
  };

  return (
    <div className="relative">
      {!isActive ? (
        <button
          onClick={startCamera}
          className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-gradient-to-r from-rose-50 to-pink-50 hover:from-rose-100 hover:to-pink-100 dark:bg-slate-800 dark:hover:bg-slate-700 text-rose-700 dark:text-rose-300 border border-rose-200 dark:border-rose-900/50 text-xs font-bold transition-all shadow-xs"
          title="Bật nhận diện cử chỉ camera để gọi tên bằng tay"
        >
          <Camera className="w-4 h-4 text-rose-500 animate-pulse" />
          <span className="hidden sm:inline">Camera Cử Chỉ Tay</span>
          <span className="sm:hidden">Camera</span>
        </button>
      ) : (
        <div
          className={`fixed z-40 transition-all duration-300 shadow-2xl rounded-2xl border-2 border-amber-400 bg-slate-900 overflow-hidden ${
            isMinimized
              ? 'bottom-4 right-4 w-32 h-32'
              : 'bottom-4 right-4 w-72 sm:w-80'
          }`}
        >
          {/* Header Bar */}
          <div className="flex items-center justify-between px-3 py-2 bg-slate-950 text-white text-xs">
            <div className="flex items-center gap-1.5 font-bold truncate">
              <span className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse" />
              <span>Camera Cử Chỉ</span>
            </div>

            <div className="flex items-center gap-1">
              <button
                onClick={() => setShowGuide(!showGuide)}
                className="p-1 text-slate-400 hover:text-white"
                title="Xem hướng dẫn cử chỉ"
              >
                <HelpCircle className="w-3.5 h-3.5" />
              </button>
              <button
                onClick={toggleFacing}
                className="p-1 text-slate-400 hover:text-white"
                title="Đổi camera trước/sau"
              >
                <SwitchCamera className="w-3.5 h-3.5" />
              </button>
              <button
                onClick={() => setIsMinimized(!isMinimized)}
                className="p-1 text-slate-400 hover:text-white"
                title={isMinimized ? 'Phóng to' : 'Thu nhỏ'}
              >
                {isMinimized ? <Maximize2 className="w-3.5 h-3.5" /> : <Minimize2 className="w-3.5 h-3.5" />}
              </button>
              <button
                onClick={stopCamera}
                className="p-1 text-rose-400 hover:text-rose-300"
                title="Tắt camera"
              >
                <CameraOff className="w-3.5 h-3.5" />
              </button>
            </div>
          </div>

          {/* Video Preview */}
          <div className="relative bg-black w-full aspect-video flex items-center justify-center overflow-hidden">
            <video
              ref={videoRef}
              playsInline
              muted
              className="w-full h-full object-cover transform scale-x-[-1]"
            />

            {/* Hand Raised & Hold Progress Status Overlay */}
            <div className="absolute top-2 left-2 right-2 flex items-center justify-between pointer-events-none">
              <span
                className={`px-2 py-0.5 rounded-full text-[10px] font-bold shadow-xs border ${
                  isHandRaised
                    ? 'bg-emerald-500/90 text-white border-emerald-300 animate-pulse'
                    : 'bg-slate-900/80 text-amber-300 border-amber-400/40'
                }`}
              >
                {isHandRaised ? '✋ ĐÃ DƠ TAY' : '✋ CHƯA DƠ TAY'}
              </span>
              {holdProgress > 0 && holdProgress < 1 && (
                <span className="px-1.5 py-0.5 rounded bg-indigo-600/90 text-white text-[10px] font-mono font-bold">
                  {Math.round(holdProgress * 100)}%
                </span>
              )}
            </div>

            {/* Hold progress bar */}
            {holdProgress > 0 && holdProgress < 1 && (
              <div className="absolute top-0 inset-x-0 h-1.5 bg-slate-800">
                <div
                  className="h-full bg-gradient-to-r from-amber-400 to-emerald-400 transition-all duration-75"
                  style={{ width: `${Math.round(holdProgress * 100)}%` }}
                />
              </div>
            )}

            {/* Gesture feedback banner */}
            <div className="absolute bottom-2 inset-x-2 bg-slate-950/85 backdrop-blur-xs rounded-lg px-2.5 py-1 text-center text-[11px] font-bold text-amber-300 truncate border border-amber-400/40">
              {currentGesture}
            </div>
          </div>

          {/* Triggered Action Alert & Quick Legend */}
          {!isMinimized && (
            <div className="p-2.5 bg-slate-900 text-xs space-y-1.5 border-t border-slate-800">
              {recentAction && (
                <div className="p-1.5 rounded-lg bg-emerald-950 border border-emerald-500/50 text-emerald-300 text-[11px] font-bold flex items-center gap-1 animate-pulse">
                  <Sparkles className="w-3.5 h-3.5 shrink-0" />
                  <span className="truncate">{recentAction}</span>
                </div>
              )}

              {showGuide && (
                <div className="p-2 rounded-lg bg-slate-800/80 text-[11px] text-slate-300 space-y-1">
                  <div className="font-bold text-amber-300">Quy tắc nhận diện cử chỉ:</div>
                  <div>☝️ <strong>Giơ 1 ngón:</strong> Chọn 1 học sinh</div>
                  <div>✌️ <strong>Giơ 2 ngón:</strong> Chọn 2 học sinh</div>
                  <div>🤟 <strong>Giơ 3 ngón:</strong> Chọn 3 học sinh</div>
                  <div>🖖 <strong>Giơ 4 ngón:</strong> Chọn 4 học sinh</div>
                  <div>🖐️ <strong>Giơ 5 ngón:</strong> Chọn 5 học sinh</div>
                  <div>👋 <strong>Vẫy tay:</strong> Chọn 1 học sinh</div>
                  <div className="text-[10px] text-amber-200 italic mt-1">
                    * Chỉ khi thầy/cô dơ tay lên và giữ yên 0.5s thì máy mới tương tác!
                  </div>
                </div>
              )}

              <div className="text-[10px] text-slate-400 flex items-center justify-between">
                <span>Chỉ tương tác khi dơ tay</span>
                <span className="text-amber-400 font-mono">Camera: {facing}</span>
              </div>
            </div>
          )}
        </div>
      )}

      {errorMsg && (
        <div className="absolute top-10 right-0 z-50 p-2.5 bg-rose-50 border border-rose-200 text-rose-700 text-xs rounded-xl shadow-lg w-64">
          {errorMsg}
        </div>
      )}
    </div>
  );
};
