import React, { useEffect, useRef, useState, useCallback } from 'react';
import { Student } from '../../types';
import {
  gestureDetector,
  GestureDetectionResult,
  CameraHandState,
  HandLandmark,
} from '../../utils/handGestureDetector';
import { sound } from '../../utils/soundEffects';
import {
  Camera,
  CameraOff,
  SwitchCamera,
  Sparkles,
  Video,
  Hand,
  CheckCircle,
  Zap,
  ShieldCheck,
  Lock,
  ArrowDownCircle,
  AlertCircle,
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
  const [cameraState, setCameraState] = useState<CameraHandState>('no_hand');
  const [currentGestureLabel, setCurrentGestureLabel] = useState<string>('✋ Chưa dơ tay – Hãy giơ 1-5 ngón tay');
  const [isHandRaised, setIsHandRaised] = useState<boolean>(false);
  const [consecutiveFrames, setConsecutiveFrames] = useState<number>(0);
  const [requiredFrames, setRequiredFrames] = useState<number>(10);
  const [confirmProgress, setConfirmProgress] = useState<number>(0);
  const [cooldownRemainingMs, setCooldownRemainingMs] = useState<number>(0);
  const [confidence, setConfidence] = useState<number>(0);
  const [detectedFingers, setDetectedFingers] = useState<number>(1);
  const [recentAction, setRecentAction] = useState<string | null>(null);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);
  const [facing, setFacing] = useState<'user' | 'environment'>('user');
  const [cyclingName, setCyclingName] = useState<string>('GIƠ TAY ĐỂ CHỌN');
  const [isFinalLocked, setIsFinalLocked] = useState<boolean>(false);
  const [landmarks, setLandmarks] = useState<HandLandmark[] | undefined>(undefined);
  const skeletonCanvasRef = useRef<HTMLCanvasElement | null>(null);

  // Stable references for callbacks
  const isPickingRef = useRef(isPicking);
  useEffect(() => {
    isPickingRef.current = isPicking;
  }, [isPicking]);

  const onTriggerPickRef = useRef(onTriggerPick);
  useEffect(() => {
    onTriggerPickRef.current = onTriggerPick;
  }, [onTriggerPick]);

  const lastTriggerTimeRef = useRef<number>(0);

  const handleGestureResult = useCallback((res: GestureDetectionResult) => {
    // If currently picking/spinning or camera inactive, freeze detector state
    if (isPickingRef.current) return;

    setCameraState(res.state);
    setCurrentGestureLabel(res.label);
    setIsHandRaised(res.isHandRaised);
    setConsecutiveFrames(res.consecutiveFrames);
    setRequiredFrames(res.requiredFrames);
    setConfirmProgress(res.confirmProgress);
    setCooldownRemainingMs(res.cooldownRemainingMs);
    setConfidence(res.confidence);
    setLandmarks(res.landmarks);

    if (res.previewCount) {
      setDetectedFingers(res.previewCount);
    }

    // STRICT TRIGGER CONDITION: Only trigger when state is officially 'confirmed'
    if (res.state !== 'confirmed' || !res.isHandRaised) {
      return;
    }

    const now = Date.now();
    if (now - lastTriggerTimeRef.current < 2500) return; // 2.5s anti-repeat debounce

    if (res.fingerCount && res.fingerCount >= 1 && res.fingerCount <= 5) {
      lastTriggerTimeRef.current = now;
      setDetectedFingers(res.fingerCount);
      setRecentAction(`🖐️ Đã xác nhận giơ ${res.fingerCount} ngón tay -> Đang chọn ${res.fingerCount} học sinh!`);
      sound.playSparkle();
      onTriggerPickRef.current(res.fingerCount);
    } else if (res.gesture === 'wave') {
      lastTriggerTimeRef.current = now;
      setDetectedFingers(1);
      setRecentAction('👋 Nhận diện VẪY TAY -> Đang chọn 1 bạn!');
      sound.playSparkle();
      onTriggerPickRef.current(1);
    }
  }, []);

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

  // Eased Deceleration Pick Animation (Hiệu ứng giảm tốc quán tính Gameshow TV)
  useEffect(() => {
    if (!isPicking || !selectedStudent) {
      setIsFinalLocked(false);
      return;
    }

    setIsFinalLocked(false);
    let isMounted = true;
    let step = 0;
    const maxSteps = 22; // 22 steps of natural deceleration
    let timerId: ReturnType<typeof setTimeout>;

    const runStep = () => {
      if (!isMounted) return;

      const progress = step / maxSteps; // 0 to 1
      // Quadratic deceleration: 50ms at start, slows to 420ms
      const delay = Math.round(50 + progress * progress * 370);

      const rand = students[Math.floor(Math.random() * students.length)]?.name || 'Học sinh';
      setCyclingName(rand);

      // Sound pitch decelerates synchronously with the name roll
      const pitch = Math.max(0.7, 1.3 - progress * 0.5);
      sound.playSpinTick(pitch);

      step++;

      if (step < maxSteps) {
        timerId = setTimeout(runStep, delay);
      } else {
        // Locked on final winner!
        setIsFinalLocked(true);
        setCyclingName(selectedStudent.name);
        sound.playWinnerFanfare();

        timerId = setTimeout(() => {
          if (isMounted) {
            onPickEnd();
          }
        }, 1200);
      }
    };

    runStep();

    return () => {
      isMounted = false;
      clearTimeout(timerId);
    };
  }, [isPicking, selectedStudent, students, onPickEnd]);

  // Real-time AR Neon Skeleton Overlay Effect
  useEffect(() => {
    const canvas = skeletonCanvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    ctx.clearRect(0, 0, canvas.width, canvas.height);

    if (!landmarks || landmarks.length === 0 || isPicking) return;

    const w = canvas.width;
    const h = canvas.height;

    // Connections between the 21 MediaPipe hand landmarks
    const connections = [
      [0, 1], [1, 2], [2, 3], [3, 4], // Thumb
      [0, 5], [5, 6], [6, 7], [7, 8], // Index
      [5, 9], [9, 10], [10, 11], [11, 12], // Middle
      [9, 13], [13, 14], [14, 15], [15, 16], // Ring
      [13, 17], [17, 18], [18, 19], [19, 20], // Pinky
      [0, 17], [5, 9], [9, 13], [13, 17], // Palm frame
    ];

    ctx.save();
    if (facing === 'user') {
      ctx.translate(w, 0);
      ctx.scale(-1, 1);
    }

    // Draw connection lines
    ctx.lineWidth = 3.5;
    ctx.strokeStyle = cameraState === 'confirming_gesture' ? '#a855f7' : '#10b981';
    ctx.shadowColor = cameraState === 'confirming_gesture' ? '#c084fc' : '#34d399';
    ctx.shadowBlur = 10;

    for (const [from, to] of connections) {
      const p1 = landmarks[from];
      const p2 = landmarks[to];
      if (p1 && p2) {
        ctx.beginPath();
        ctx.moveTo(p1.x * w, p1.y * h);
        ctx.lineTo(p2.x * w, p2.y * h);
        ctx.stroke();
      }
    }

    // Draw landmark joints
    for (let i = 0; i < landmarks.length; i++) {
      const pt = landmarks[i];
      const isTip = i === 4 || i === 8 || i === 12 || i === 16 || i === 20;

      ctx.beginPath();
      ctx.arc(pt.x * w, pt.y * h, isTip ? 6.5 : 4, 0, 2 * Math.PI);
      ctx.fillStyle = isTip ? '#facc15' : '#ffffff';
      ctx.shadowColor = isTip ? '#fef08a' : '#60a5fa';
      ctx.shadowBlur = 12;
      ctx.fill();
    }

    ctx.restore();
  }, [landmarks, facing, isPicking, cameraState]);

  // Helper for rendering State Indicator Info
  const getStateDisplay = () => {
    switch (cameraState) {
      case 'no_hand':
        return {
          title: 'Không phát hiện bàn tay',
          badgeColor: 'bg-slate-800 text-slate-300 border-slate-700',
          dot: 'bg-slate-500',
          icon: <Hand className="w-3.5 h-3.5 opacity-60" />,
          hint: 'Hãy giơ bàn tay từ 1 đến 5 ngón trước camera (cách 1–2m)',
        };
      case 'waiting_gesture':
        return {
          title: 'Đang chờ cử chỉ',
          badgeColor: 'bg-amber-950/80 text-amber-300 border-amber-600/50',
          dot: 'bg-amber-400 animate-pulse',
          icon: <AlertCircle className="w-3.5 h-3.5 text-amber-400" />,
          hint: 'Hãy giơ tay lên cao và xòe rõ các ngón tay trước camera',
        };
      case 'detecting_hand':
        return {
          title: 'Đang nhận diện bàn tay',
          badgeColor: 'bg-blue-950/80 text-blue-300 border-blue-500/50',
          dot: 'bg-blue-400 animate-pulse',
          icon: <Zap className="w-3.5 h-3.5 text-blue-400" />,
          hint: 'Đang phân tích số ngón tay... Giữ ổn định trước camera',
        };
      case 'confirming_gesture':
        return {
          title: `Đang xác nhận cử chỉ (${consecutiveFrames}/${requiredFrames} frame)`,
          badgeColor: 'bg-purple-950/80 text-purple-300 border-purple-500/70 ring-1 ring-purple-400/40',
          dot: 'bg-purple-400 animate-ping',
          icon: <Sparkles className="w-3.5 h-3.5 text-purple-300" />,
          hint: `Phát hiện giơ ${detectedFingers} ngón! Giữ yên bàn tay ${Math.max(1, requiredFrames - consecutiveFrames)} frame nữa để chốt...`,
        };
      case 'confirmed':
        return {
          title: `Đã nhận diện thành công: ${detectedFingers} bạn!`,
          badgeColor: 'bg-emerald-950/90 text-emerald-300 border-emerald-400 ring-2 ring-emerald-400/50',
          dot: 'bg-emerald-400 animate-bounce',
          icon: <CheckCircle className="w-3.5 h-3.5 text-emerald-300" />,
          hint: `Chốt chính xác ${detectedFingers} học sinh! Bắt đầu gọi tên...`,
        };
      case 'locked_cooldown':
        return {
          title: `Đang khóa chống lặp (${(cooldownRemainingMs / 1000).toFixed(1)}s)`,
          badgeColor: 'bg-orange-950/80 text-orange-300 border-orange-500/60',
          dot: 'bg-orange-400',
          icon: <Lock className="w-3.5 h-3.5 text-orange-400" />,
          hint: 'Khóa chống nhận diện lặp để tránh gọi liên tục',
        };
      case 'waiting_hand_lowered':
        return {
          title: 'Hạ tay xuống để tiếp tục',
          badgeColor: 'bg-cyan-950/80 text-cyan-300 border-cyan-500/60 animate-pulse',
          dot: 'bg-cyan-400',
          icon: <ArrowDownCircle className="w-3.5 h-3.5 text-cyan-300" />,
          hint: 'Vui lòng hạ tay xuống để hệ thống sẵn sàng cho lượt gọi tiếp theo',
        };
    }
  };

  const stateInfo = getStateDisplay();

  return (
    <div className="relative w-full max-w-2xl mx-auto flex flex-col items-center justify-center p-4 sm:p-6 bg-slate-950/90 rounded-3xl border-2 border-indigo-500/50 shadow-2xl backdrop-blur-md overflow-hidden">
      {/* Header Bar */}
      <div className="w-full flex items-center justify-between mb-3">
        <div className="flex items-center gap-2 px-3.5 py-1.5 rounded-full bg-indigo-500/20 border border-indigo-400/60 text-indigo-300 text-xs font-black shadow-xs">
          <Camera className="w-4 h-4 text-indigo-400" />
          <span>TƯƠNG TÁC CAMERA AI – GỌI TÊN BẰNG TAY</span>
        </div>

        <div className="flex items-center gap-2">
          <button
            onClick={() => {
              setFacing((f) => (f === 'user' ? 'environment' : 'user'));
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
              isActive
                ? 'bg-rose-500/20 text-rose-300 border border-rose-500/30'
                : 'bg-emerald-500/20 text-emerald-300 border border-emerald-500/30'
            }`}
          >
            {isActive ? <CameraOff className="w-3.5 h-3.5" /> : <Video className="w-3.5 h-3.5" />}
            <span>{isActive ? 'Tắt cam' : 'Bật cam'}</span>
          </button>
        </div>
      </div>

      {/* 6-State Visual Status Bar */}
      <div className="w-full mb-3 p-2.5 rounded-2xl bg-slate-900/90 border border-slate-800 flex items-center justify-between gap-2">
        <div className="flex items-center gap-2 min-w-0">
          <span
            className={`px-3 py-1 rounded-full text-xs font-bold border flex items-center gap-1.5 shrink-0 ${stateInfo.badgeColor}`}
          >
            <span className={`w-2 h-2 rounded-full ${stateInfo.dot}`} />
            {stateInfo.icon}
            <span className="truncate">{stateInfo.title}</span>
          </span>
          <span className="text-xs text-slate-300 truncate hidden sm:inline">{stateInfo.hint}</span>
        </div>

        {/* Confidence Badge */}
        {confidence > 0 && (
          <div className="flex items-center gap-1 px-2.5 py-1 rounded-lg bg-slate-800/80 border border-slate-700 text-[11px] font-mono text-cyan-300 shrink-0">
            <ShieldCheck className="w-3.5 h-3.5 text-cyan-400" />
            <span>{confidence}% tin cậy</span>
          </div>
        )}
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
            Giơ từ <strong>1 đến 5 ngón tay</strong> trước camera và <strong>giữ yên 8–10 frame</strong> để hệ thống chốt số lượng và gọi tên nhé!
          </div>
        </div>
      </div>

      {/* 1 to 5 Finger Real-Time Selector HUD */}
      <div className="w-full max-w-lg mb-3 p-2 rounded-2xl bg-slate-900/90 border border-indigo-500/40 shadow-md">
        <div className="text-[11px] font-bold text-cyan-300 uppercase tracking-wider mb-1.5 flex items-center justify-between">
          <span className="flex items-center gap-1">
            <span>🖐️</span>
            <span>CHỌN SỐ HỌC SINH (HOẶC BẤM TRỰC TIẾP):</span>
          </span>
          <span className="text-[10px] text-amber-300 font-bold">Mục tiêu: {detectedFingers} bạn</span>
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
              className={`py-2 px-1 rounded-xl text-xs font-black transition-all duration-200 flex flex-col items-center gap-0.5 border ${
                detectedFingers === item.count
                  ? 'bg-gradient-to-b from-amber-500 to-orange-500 text-white border-yellow-300 shadow-md shadow-amber-500/40 ring-2 ring-yellow-400'
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

      {/* Camera Feed with Augmented Reality Scanning Frame */}
      <div className="relative w-full aspect-video max-w-lg rounded-2xl overflow-hidden bg-slate-900 border-2 border-indigo-400/60 shadow-inner flex items-center justify-center">
        <video
          ref={videoRef}
          autoPlay
          playsInline
          muted
          className={`w-full h-full object-cover transform ${facing === 'user' ? 'scale-x-[-1]' : ''}`}
        />

        {/* Augmented Reality Hand Landmark Skeleton Overlay Canvas */}
        <canvas
          ref={skeletonCanvasRef}
          width={640}
          height={480}
          className="absolute inset-0 w-full h-full pointer-events-none z-10"
        />

        {/* 8-12 Frame Hold Confirmation Progress Bar */}
        {confirmProgress > 0 && confirmProgress < 1 && (
          <div className="absolute top-0 inset-x-0 h-2 bg-slate-800 z-10">
            <div
              className="h-full bg-gradient-to-r from-purple-500 via-indigo-500 to-emerald-400 transition-all duration-75 shadow-lg shadow-purple-500/50"
              style={{ width: `${Math.round(confirmProgress * 100)}%` }}
            />
          </div>
        )}

        {/* Augmented Reality Scanning Frame (Hidden during pick) */}
        {!isPicking && (
          <div className="absolute inset-3 border-2 border-dashed border-indigo-400/40 rounded-xl pointer-events-none flex flex-col justify-between p-2.5">
            <div className="flex justify-between items-center text-[10px] font-mono">
              <span
                className={`px-2.5 py-1 rounded-full font-bold shadow-md border ${
                  isHandRaised
                    ? 'bg-emerald-600/90 text-white border-emerald-300'
                    : 'bg-slate-900/90 text-amber-300 border-amber-400/50'
                }`}
              >
                {isHandRaised ? `✋ ĐÃ DƠ TAY (${detectedFingers} NGÓN)` : '✋ CHƯA DƠ TAY'}
              </span>

              <span className="flex items-center gap-1.5 bg-black/60 px-2 py-0.5 rounded border border-emerald-400/30 text-cyan-300">
                <span className="w-2 h-2 rounded-full bg-emerald-400" />
                <span className="text-emerald-300 font-bold">20 FPS KHỬ NHIỄU</span>
              </span>
            </div>

            {/* Center Target Crosshair & Palm Frame */}
            <div
              className={`w-28 h-28 mx-auto rounded-3xl flex flex-col items-center justify-center relative transition-all duration-200 border-2 ${
                isHandRaised
                  ? cameraState === 'confirming_gesture'
                    ? 'border-purple-400 bg-purple-500/20 shadow-lg shadow-purple-500/40'
                    : 'border-emerald-400 bg-emerald-500/20 shadow-lg shadow-emerald-500/30'
                  : 'border-dashed border-amber-400/50 bg-black/40'
              }`}
            >
              {isHandRaised ? (
                <>
                  <div className="text-3xl">
                    {detectedFingers === 1
                      ? '☝️'
                      : detectedFingers === 2
                      ? '✌️'
                      : detectedFingers === 3
                      ? '🤟'
                      : detectedFingers === 4
                      ? '🖖'
                      : '🖐️'}
                  </div>
                  <div className="text-[11px] font-black text-white uppercase tracking-wider mt-1">
                    {detectedFingers} NGÓN TAY
                  </div>
                  {confirmProgress > 0 && confirmProgress < 1 && (
                    <div className="text-[9px] font-mono font-bold text-yellow-300 bg-black/70 px-1.5 py-0.5 rounded mt-0.5 border border-yellow-300/40">
                      {consecutiveFrames}/{requiredFrames} frame ({Math.round(confirmProgress * 100)}%)
                    </div>
                  )}
                </>
              ) : (
                <>
                  <div className="text-2xl opacity-60">✋</div>
                  <div className="text-[9px] font-bold text-amber-200/90 text-center uppercase tracking-tight mt-1 px-1">
                    Dơ tay lên đây
                  </div>
                </>
              )}
            </div>

            <div className="text-center">
              <span
                className={`inline-block px-3.5 py-1.5 rounded-full text-xs font-bold backdrop-blur shadow-md border ${
                  isHandRaised
                    ? 'bg-slate-900/90 text-emerald-300 border-emerald-400/60'
                    : 'bg-black/80 text-amber-300 border-amber-400/50'
                }`}
              >
                {currentGestureLabel}
              </span>
            </div>
          </div>
        )}

        {/* Eased Gameshow Deceleration Overlay (Chùm sáng sân khấu quét chọn mượt mà) */}
        {isPicking && (
          <div className="absolute inset-0 bg-slate-950/90 backdrop-blur-sm flex flex-col items-center justify-center p-6 z-20">
            {/* Ambient Spotlight */}
            <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_center,rgba(245,158,11,0.3),transparent_70%)] pointer-events-none" />

            <div className="flex items-center gap-2 mb-3">
              <Zap className="w-5 h-5 text-amber-400 animate-pulse" />
              <span className="text-xs uppercase tracking-widest text-amber-300 font-black">
                {isFinalLocked
                  ? `🎉 ĐÃ XÁC ĐỊNH ${detectedFingers} HỌC SINH CHIẾN THẮNG!`
                  : `ĐANG QUÉT CHỌN ${detectedFingers} HỌC SINH...`}
              </span>
            </div>

            <div
              className={`px-8 py-5 rounded-3xl text-white font-black text-2xl sm:text-4xl shadow-2xl transition-all duration-300 text-center max-w-sm truncate border-4 ${
                isFinalLocked
                  ? 'bg-gradient-to-r from-amber-500 via-orange-500 to-pink-500 border-yellow-300 scale-105 shadow-amber-500/50'
                  : 'bg-slate-900/90 border-amber-400/60 shadow-indigo-500/30'
              }`}
            >
              {cyclingName}
            </div>

            <div className="mt-4 flex items-center gap-2 text-xs font-semibold text-slate-300">
              <Sparkles className="w-4 h-4 text-amber-400" />
              <span>{isFinalLocked ? 'Chuẩn bị vinh danh...' : 'Hiệu ứng giảm tốc quán tính tự nhiên'}</span>
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
        <div className="mt-3 px-4 py-1.5 rounded-xl bg-emerald-950/80 border border-emerald-500/50 text-emerald-200 text-xs font-bold flex items-center gap-1.5">
          <CheckCircle className="w-3.5 h-3.5 text-emerald-400" />
          <span>{recentAction}</span>
        </div>
      )}

      {/* Quick Trigger Button for Manual Tap */}
      <div className="w-full mt-3 flex items-center justify-center">
        <button
          onClick={() => onTriggerPick(detectedFingers)}
          disabled={isPicking}
          className="w-full max-w-md py-3 px-6 rounded-2xl bg-gradient-to-r from-indigo-500 via-purple-500 to-pink-500 hover:from-indigo-600 hover:to-pink-600 text-white font-black text-sm sm:text-base shadow-lg shadow-purple-500/30 flex items-center justify-center gap-2 active:scale-95 transition-all"
        >
          <Hand className="w-5 h-5" />
          <span>BẤM HOẶC GIƠ TAY ĐỂ CHỌN {detectedFingers} HỌC SINH</span>
        </button>
      </div>

      {/* Gestures Guide Strip */}
      <div className="mt-3 grid grid-cols-5 gap-1.5 w-full max-w-lg text-xs">
        {[
          { count: 1, icon: '☝️', label: '1 Ngón', desc: '1 bạn' },
          { count: 2, icon: '✌️', label: '2 Ngón', desc: '2 bạn' },
          { count: 3, icon: '🤟', label: '3 Ngón', desc: '3 bạn' },
          { count: 4, icon: '🖖', label: '4 Ngón', desc: '4 bạn' },
          { count: 5, icon: '🖐️', label: '5 Ngón', desc: '5 bạn' },
        ].map((g) => (
          <div
            key={g.count}
            className={`p-1.5 rounded-xl border flex flex-col items-center text-center transition-all ${
              detectedFingers === g.count
                ? 'bg-amber-500/20 border-amber-400/60 text-white'
                : 'bg-slate-900/80 border-slate-800 text-slate-400'
            }`}
          >
            <span className="text-xl">{g.icon}</span>
            <div className="font-bold text-white text-[11px]">{g.label}</div>
            <div className="text-[9px] text-slate-400">{g.desc}</div>
          </div>
        ))}
      </div>
    </div>
  );
};
