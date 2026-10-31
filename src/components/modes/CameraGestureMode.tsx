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
  SwitchCamera,
  Sparkles,
  Hand,
  CheckCircle,
  Zap,
  ShieldCheck,
  Lock,
  ArrowDownCircle,
  AlertCircle,
  Home,
  X,
} from 'lucide-react';

interface CameraGestureModeProps {
  students: Student[];
  isPicking: boolean;
  selectedStudent: Student | null;
  selectedStudents?: Student[];
  onTriggerPick: (count?: number) => void;
  onPickEnd: () => void;
  onReturnHome?: () => void;
}

export const CameraGestureMode: React.FC<CameraGestureModeProps> = ({
  students,
  isPicking,
  selectedStudent,
  selectedStudents,
  onTriggerPick,
  onPickEnd,
  onReturnHome,
}) => {
  const videoRef = useRef<HTMLVideoElement | null>(null);
  const [isActive, setIsActive] = useState<boolean>(true);
  const [cameraState, setCameraState] = useState<CameraHandState>('no_hand');
  const [currentGestureLabel, setCurrentGestureLabel] = useState<string>('✋ Sẵn sàng – Hãy giơ 1-5 ngón tay');
  const [isHandRaised, setIsHandRaised] = useState<boolean>(false);
  const [consecutiveFrames, setConsecutiveFrames] = useState<number>(0);
  const [requiredFrames, setRequiredFrames] = useState<number>(8);
  const [confirmProgress, setConfirmProgress] = useState<number>(0);
  const [cooldownRemainingMs, setCooldownRemainingMs] = useState<number>(0);
  const [confidence, setConfidence] = useState<number>(0);
  const [detectedFingers, setDetectedFingers] = useState<number>(1);
  const [recentAction, setRecentAction] = useState<string | null>(null);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);
  const [facing, setFacing] = useState<'user' | 'environment'>('user');
  const [cyclingName, setCyclingName] = useState<string>('GIƠ TAY ĐỂ GỌI TIẾP');
  const [isFinalLocked, setIsFinalLocked] = useState<boolean>(false);
  const [landmarks, setLandmarks] = useState<HandLandmark[] | undefined>(undefined);
  const skeletonCanvasRef = useRef<HTMLCanvasElement | null>(null);

  // Auto return home when hand is lowered (default to false to support uninterrupted continuous calling)
  const [autoReturnOnLowerHand, setAutoReturnOnLowerHand] = useState<boolean>(false);
  const [handLoweredNotice, setHandLoweredNotice] = useState<boolean>(false);
  const hadHandRaisedRef = useRef<boolean>(false);
  const returnHomeTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  // Stable references for callbacks
  const isPickingRef = useRef(isPicking);
  useEffect(() => {
    isPickingRef.current = isPicking;
  }, [isPicking]);

  const onTriggerPickRef = useRef(onTriggerPick);
  useEffect(() => {
    onTriggerPickRef.current = onTriggerPick;
  }, [onTriggerPick]);

  const onReturnHomeRef = useRef(onReturnHome);
  useEffect(() => {
    onReturnHomeRef.current = onReturnHome;
  }, [onReturnHome]);

  const lastTriggerTimeRef = useRef<number>(0);

  // Robust, complete exit function that stops all hardware streams and switches back to 'game'
  const handleExitToHome = useCallback(() => {
    // 1. Cancel any pending auto-return timers
    if (returnHomeTimerRef.current) {
      clearTimeout(returnHomeTimerRef.current);
      returnHomeTimerRef.current = null;
    }
    setHandLoweredNotice(false);

    // 2. Shut down media tracks and camera loop completely
    setIsActive(false);
    gestureDetector.stopCamera();

    if (videoRef.current) {
      if (videoRef.current.srcObject) {
        try {
          const stream = videoRef.current.srcObject as MediaStream;
          stream.getTracks().forEach((track) => {
            track.stop();
            track.enabled = false;
          });
        } catch (e) {
          console.warn('Error stopping video tracks:', e);
        }
        videoRef.current.srcObject = null;
      }
    }

    // 3. Clear AR skeleton canvas
    if (skeletonCanvasRef.current) {
      const ctx = skeletonCanvasRef.current.getContext('2d');
      if (ctx) {
        ctx.clearRect(0, 0, skeletonCanvasRef.current.width, skeletonCanvasRef.current.height);
      }
    }

    // 4. Play audio feedback
    sound.playSparkle();

    // 5. Notify parent App to set viewTab back to 'game' and reset gameMode
    if (onReturnHomeRef.current) {
      onReturnHomeRef.current();
    }
  }, []);

  // Keyboard shortcut: Escape key closes camera and returns home
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        e.preventDefault();
        handleExitToHome();
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [handleExitToHome]);

  const handleGestureResult = useCallback((res: GestureDetectionResult) => {
    // If currently picking/spinning, ignore gesture updates
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

    // Detect hand raised vs hand lowered
    if (res.isHandRaised) {
      hadHandRaisedRef.current = true;
      // If a return-home countdown was pending, cancel it because teacher raised hand again
      if (returnHomeTimerRef.current) {
        clearTimeout(returnHomeTimerRef.current);
        returnHomeTimerRef.current = null;
        setHandLoweredNotice(false);
      }
    } else if (hadHandRaisedRef.current && (res.state === 'no_hand' || !res.isHandRaised)) {
      // User has lowered hand!
      // Only return home if teacher EXPLICITLY turned on autoReturnOnLowerHand and no pick is in progress
      if (autoReturnOnLowerHand && !returnHomeTimerRef.current && !isPickingRef.current) {
        hadHandRaisedRef.current = false;
        setHandLoweredNotice(true);
        sound.playSpinTick(1.2);
        returnHomeTimerRef.current = setTimeout(() => {
          handleExitToHome();
        }, 1200);
      }
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
  }, [autoReturnOnLowerHand, handleExitToHome]);

  useEffect(() => {
    gestureDetector.setOnGesture(handleGestureResult);
  }, [handleGestureResult]);

  // Continuous Camera Calling: When picking completes, reset detector and ready state for the next student
  useEffect(() => {
    if (!isPicking) {
      hadHandRaisedRef.current = false;
      gestureDetector.resetState();
      setIsFinalLocked(false);
      setCyclingName('GIƠ TAY ĐỂ GỌI TIẾP (1–5 NGÓN)');
      if (returnHomeTimerRef.current) {
        clearTimeout(returnHomeTimerRef.current);
        returnHomeTimerRef.current = null;
      }
      setHandLoweredNotice(false);
    }
  }, [isPicking]);

  // Clean up timer and camera hardware on unmount
  useEffect(() => {
    return () => {
      if (returnHomeTimerRef.current) {
        clearTimeout(returnHomeTimerRef.current);
      }
      gestureDetector.stopCamera();
      if (videoRef.current && videoRef.current.srcObject) {
        try {
          const stream = videoRef.current.srcObject as MediaStream;
          stream.getTracks().forEach((track) => track.stop());
          videoRef.current.srcObject = null;
        } catch {
          // Ignore cleanup error
        }
      }
    };
  }, []);

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
    if (videoRef.current && videoRef.current.srcObject) {
      try {
        const stream = videoRef.current.srcObject as MediaStream;
        stream.getTracks().forEach((track) => track.stop());
        videoRef.current.srcObject = null;
      } catch {
        // Ignore
      }
    }
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
      const delay = Math.round(50 + progress * progress * 370);

      const rand = students[Math.floor(Math.random() * students.length)]?.name || 'Học sinh';
      setCyclingName(rand);

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
    ctx.strokeStyle = cameraState === 'confirming_gesture' ? '#8B5CF6' : '#10B981';
    ctx.shadowColor = cameraState === 'confirming_gesture' ? '#C084FC' : '#34D399';
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
      ctx.fillStyle = isTip ? '#FBBF24' : '#FFFFFF';
      ctx.shadowColor = isTip ? '#FEF08A' : '#6366F1';
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
          badgeColor: 'bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300 border-slate-200 dark:border-slate-700',
          dot: 'bg-slate-400',
          icon: <Hand className="w-3.5 h-3.5 opacity-60" />,
          hint: 'Hãy giơ bàn tay từ 1 đến 5 ngón trước camera (cách 1–2m)',
        };
      case 'waiting_gesture':
        return {
          title: 'Đang chờ cử chỉ',
          badgeColor: 'bg-amber-50 dark:bg-amber-950/60 text-amber-700 dark:text-amber-300 border-amber-300 dark:border-amber-700/50',
          dot: 'bg-amber-500 animate-pulse',
          icon: <AlertCircle className="w-3.5 h-3.5 text-amber-500" />,
          hint: 'Hãy giơ tay lên cao và xòe rõ các ngón tay trước camera',
        };
      case 'detecting_hand':
        return {
          title: 'Đang nhận diện bàn tay',
          badgeColor: 'bg-indigo-50 dark:bg-indigo-950/60 text-indigo-700 dark:text-indigo-300 border-indigo-300 dark:border-indigo-700/50',
          dot: 'bg-indigo-500 animate-pulse',
          icon: <Zap className="w-3.5 h-3.5 text-indigo-500" />,
          hint: 'Đang phân tích số ngón tay... Giữ ổn định trước camera',
        };
      case 'confirming_gesture':
        return {
          title: `Đang xác nhận (${consecutiveFrames}/${requiredFrames} frame)`,
          badgeColor: 'bg-purple-50 dark:bg-purple-950/70 text-purple-700 dark:text-purple-300 border-purple-300 dark:border-purple-600 ring-1 ring-purple-400/40',
          dot: 'bg-purple-500 animate-ping',
          icon: <Sparkles className="w-3.5 h-3.5 text-purple-600 dark:text-purple-300" />,
          hint: `Phát hiện ${detectedFingers} ngón! Giữ yên tay ${Math.max(1, requiredFrames - consecutiveFrames)} frame nữa để chốt...`,
        };
      case 'confirmed':
        return {
          title: `Đã xác nhận: ${detectedFingers} bạn!`,
          badgeColor: 'bg-emerald-50 dark:bg-emerald-950/80 text-emerald-700 dark:text-emerald-300 border-emerald-400 ring-2 ring-emerald-400/40',
          dot: 'bg-emerald-500 animate-bounce',
          icon: <CheckCircle className="w-3.5 h-3.5 text-emerald-600 dark:text-emerald-300" />,
          hint: `Chốt chính xác ${detectedFingers} học sinh! Bắt đầu gọi tên...`,
        };
      case 'locked_cooldown':
        return {
          title: `Đang khóa chống lặp (${(cooldownRemainingMs / 1000).toFixed(1)}s)`,
          badgeColor: 'bg-orange-50 dark:bg-orange-950/60 text-orange-700 dark:text-orange-300 border-orange-300 dark:border-orange-700/50',
          dot: 'bg-orange-500',
          icon: <Lock className="w-3.5 h-3.5 text-orange-500" />,
          hint: 'Khóa chống nhận diện lặp để tránh gọi liên tục',
        };
      case 'waiting_hand_lowered':
        return {
          title: 'Hạ tay xuống để tiếp tục',
          badgeColor: 'bg-cyan-50 dark:bg-cyan-950/60 text-cyan-700 dark:text-cyan-300 border-cyan-300 dark:border-cyan-700/50 animate-pulse',
          dot: 'bg-cyan-500',
          icon: <ArrowDownCircle className="w-3.5 h-3.5 text-cyan-600 dark:text-cyan-300" />,
          hint: 'Vui lòng hạ tay xuống để hệ thống sẵn sàng cho lượt gọi tiếp theo',
        };
    }
  };

  const stateInfo = getStateDisplay();

  return (
    <div className="relative w-full max-w-2xl mx-auto flex flex-col items-center justify-center p-4 sm:p-6 bg-white/95 dark:bg-slate-900/95 rounded-3xl border border-indigo-200 dark:border-slate-800 shadow-xl backdrop-blur-md overflow-hidden transition-all">
      {/* Hand Lowered Auto-Return Toast Notification */}
      {handLoweredNotice && (
        <div className="w-full mb-3 px-4 py-2.5 rounded-2xl bg-gradient-to-r from-indigo-600 via-purple-600 to-pink-500 text-white font-bold text-xs flex items-center justify-between shadow-lg shadow-indigo-500/25 animate-fade-in">
          <div className="flex items-center gap-2">
            <ArrowDownCircle className="w-4 h-4 text-yellow-300 animate-bounce" />
            <span>Đã hạ tay – Đang giải phóng camera và chuyển về trang chủ...</span>
          </div>
          <button
            onClick={handleExitToHome}
            className="px-2 py-0.5 rounded bg-black/30 hover:bg-black/50 text-[10px] text-yellow-200 uppercase tracking-wider font-mono"
          >
            Về ngay
          </button>
        </div>
      )}

      {/* Header Bar with Persistent Home & Exit Buttons */}
      <div className="w-full flex items-center justify-between mb-3 gap-2">
        <div className="flex items-center gap-2">
          {/* Primary Persistent Home Button */}
          <button
            onClick={handleExitToHome}
            className="px-3.5 py-1.5 rounded-xl bg-indigo-600 hover:bg-indigo-700 active:scale-95 text-white border border-indigo-500 text-xs font-bold transition-all flex items-center gap-1.5 shadow-md shadow-indigo-500/25"
            title="Giải phóng camera và quay về sân khấu chính / trang chủ (phím Esc)"
          >
            <Home className="w-4 h-4 text-yellow-300" />
            <span>Trang chủ</span>
          </button>

          <div className="flex items-center gap-2 px-3 py-1.5 rounded-full bg-indigo-50 dark:bg-indigo-950/60 border border-indigo-200 dark:border-indigo-800 text-indigo-700 dark:text-indigo-300 text-xs font-bold shadow-xs">
            <Camera className="w-4 h-4 text-indigo-600 dark:text-indigo-400" />
            <span className="truncate">TƯƠNG TÁC CAMERA AI</span>
          </div>
        </div>

        <div className="flex items-center gap-1.5">
          <button
            onClick={() => {
              setFacing((f) => (f === 'user' ? 'environment' : 'user'));
            }}
            className="p-1.5 px-2.5 text-xs rounded-xl bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300 hover:bg-slate-200 dark:hover:bg-slate-700 flex items-center gap-1 transition-all border border-slate-200 dark:border-slate-700"
            title="Đổi camera trước / sau"
          >
            <SwitchCamera className="w-3.5 h-3.5" />
            <span className="hidden sm:inline">Đổi cam</span>
          </button>

          {/* Persistent Close / Exit 'X' Button */}
          <button
            onClick={handleExitToHome}
            className="p-1.5 px-3 text-xs font-bold rounded-xl flex items-center gap-1 transition-all border bg-rose-50 hover:bg-rose-100 dark:bg-rose-950/60 dark:hover:bg-rose-900/60 text-rose-600 dark:text-rose-300 border-rose-200 dark:border-rose-800 shadow-xs active:scale-95"
            title="Đóng camera và thoát về trang chủ ngay lập tức"
          >
            <X className="w-3.5 h-3.5" />
            <span>Thoát</span>
          </button>
        </div>
      </div>

      {/* 6-State Visual Status Bar */}
      <div className="w-full mb-3 p-2.5 rounded-2xl bg-slate-50 dark:bg-slate-800/80 border border-slate-200 dark:border-slate-700 flex items-center justify-between gap-2">
        <div className="flex items-center gap-2 min-w-0">
          <span
            className={`px-3 py-1 rounded-full text-xs font-bold border flex items-center gap-1.5 shrink-0 ${stateInfo.badgeColor}`}
          >
            <span className={`w-2 h-2 rounded-full ${stateInfo.dot}`} />
            {stateInfo.icon}
            <span className="truncate">{stateInfo.title}</span>
          </span>
          <span className="text-xs text-slate-500 dark:text-slate-400 truncate hidden sm:inline">{stateInfo.hint}</span>
        </div>

        {/* Confidence Badge */}
        {confidence > 0 && (
          <div className="flex items-center gap-1 px-2.5 py-1 rounded-lg bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700 text-[11px] font-mono text-indigo-600 dark:text-indigo-400 shrink-0">
            <ShieldCheck className="w-3.5 h-3.5 text-indigo-500" />
            <span>{confidence}% tin cậy</span>
          </div>
        )}
      </div>

      {/* Mascot Ms. Mèo Welcome Bubble & Auto-Return Home Option */}
      <div className="w-full mb-3 p-3 rounded-2xl bg-indigo-50/70 dark:bg-indigo-950/30 border border-indigo-200/80 dark:border-indigo-900/40 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
        <div className="flex items-center gap-3 min-w-0">
          <div className="w-11 h-11 rounded-xl overflow-hidden border border-amber-300 shadow-sm shrink-0">
            <img
              src="/src/assets/images/ms_meo_mascot_1793188289324.jpg"
              alt="Ms Mèo Mascot"
              className="w-full h-full object-cover"
            />
          </div>
          <div className="text-left min-w-0">
            <div className="text-[11px] font-bold text-indigo-700 dark:text-indigo-300 flex items-center gap-1">
              <span>🐾 HƯỚNG DẪN TỪ MS MÈO</span>
            </div>
            <div className="text-xs text-slate-700 dark:text-slate-300 font-medium">
              Giơ <strong>1–5 ngón tay</strong> để chọn học sinh. Gọi xong, camera <strong>tiếp tục sẵn sàng</strong> để thầy cô giơ tay gọi bạn tiếp theo! Bấm <strong>"Về Trang Chủ"</strong> bất cứ khi nào muốn dừng.
            </div>
          </div>
        </div>

        {/* Toggle: Auto-return home when hand lowered */}
        <label className="flex items-center gap-2 cursor-pointer text-xs font-semibold text-slate-700 dark:text-slate-300 shrink-0 select-none bg-white dark:bg-slate-900 px-3 py-1.5 rounded-xl border border-slate-200 dark:border-slate-700">
          <input
            type="checkbox"
            checked={autoReturnOnLowerHand}
            onChange={(e) => setAutoReturnOnLowerHand(e.target.checked)}
            className="rounded text-indigo-600 focus:ring-indigo-500 w-4 h-4"
          />
          <span className="text-[11px]">Tự về trang chủ khi hạ tay</span>
        </label>
      </div>

      {/* 1 to 5 Finger Segmented Selector HUD */}
      <div className="w-full max-w-lg mb-3 p-2.5 rounded-2xl bg-slate-50 dark:bg-slate-800/80 border border-indigo-200 dark:border-slate-700 shadow-xs">
        <div className="text-[11px] font-bold text-indigo-700 dark:text-indigo-300 uppercase tracking-wider mb-2 flex items-center justify-between">
          <span className="flex items-center gap-1">
            <span>🖐️</span>
            <span>CHỌN SỐ HỌC SINH (HOẶC BẤM TRỰC TIẾP):</span>
          </span>
          <span className="text-[10px] text-amber-600 dark:text-amber-400 font-bold">Mục tiêu: {detectedFingers} bạn</span>
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
              className={`py-2 px-1 rounded-xl text-xs font-bold transition-all duration-200 flex flex-col items-center gap-0.5 border ${
                detectedFingers === item.count
                  ? 'bg-gradient-to-r from-indigo-600 to-purple-600 text-white border-indigo-500 shadow-md shadow-indigo-500/30 ring-2 ring-indigo-400'
                  : 'bg-white dark:bg-slate-900 text-slate-700 dark:text-slate-300 border-slate-200 dark:border-slate-700 hover:bg-slate-100 dark:hover:bg-slate-800'
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
      <div className="relative w-full aspect-video max-w-lg rounded-2xl overflow-hidden bg-slate-950 border-2 border-indigo-400/60 shadow-lg flex items-center justify-center">
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

        {/* Persistent 'X' & 'Home' Button Overlay Directly On Video Preview (Top-Right) */}
        <div className="absolute top-2.5 right-2.5 z-30 flex items-center gap-1.5">
          <button
            onClick={handleExitToHome}
            className="flex items-center gap-1 px-3 py-1.5 rounded-full bg-slate-900/90 hover:bg-black text-white text-xs font-bold border border-white/25 backdrop-blur shadow-xl active:scale-95 transition-all"
            title="Thoát camera và trở về trang chủ ngay lập tức (Esc)"
          >
            <Home className="w-3.5 h-3.5 text-yellow-300" />
            <span>Về Trang Chủ</span>
            <X className="w-3.5 h-3.5 text-rose-400 hover:text-rose-300 ml-1" />
          </button>
        </div>

        {/* 8 Frame Hold Confirmation Progress Bar */}
        {confirmProgress > 0 && confirmProgress < 1 && (
          <div className="absolute top-0 inset-x-0 h-2 bg-slate-800/80 z-10">
            <div
              className="h-full bg-gradient-to-r from-indigo-500 via-purple-500 to-emerald-400 transition-all duration-75 shadow-lg shadow-indigo-500/50"
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

              <span className="flex items-center gap-1.5 bg-black/60 px-2 py-0.5 rounded border border-emerald-400/30 text-cyan-300 mr-28">
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
            <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_center,rgba(99,102,241,0.3),transparent_70%)] pointer-events-none" />

            <div className="flex items-center gap-2 mb-3">
              <Zap className="w-5 h-5 text-amber-400 animate-pulse" />
              <span className="text-xs uppercase tracking-widest text-amber-300 font-black">
                {isFinalLocked
                  ? `🎉 ĐÃ XÁC ĐỊNH ${detectedFingers} HỌC SINH CHIẾN THẮNG!`
                  : `ĐANG QUÉT CHỌN ${detectedFingers} HỌC SINH...`}
              </span>
            </div>

            {/* Deceleration winner board: Show full name(s) without truncation */}
            {isFinalLocked && selectedStudents && selectedStudents.length > 1 ? (
              <div className="w-full max-w-md max-h-52 overflow-y-auto p-2 flex flex-col gap-2">
                {selectedStudents.map((st, i) => (
                  <div
                    key={st.id}
                    className="flex items-center gap-2.5 px-4 py-2.5 rounded-2xl bg-gradient-to-r from-indigo-600 via-purple-600 to-pink-500 border-2 border-yellow-300 text-white shadow-lg"
                  >
                    <span className="w-6 h-6 rounded-full bg-yellow-400 text-indigo-950 font-black text-xs flex items-center justify-center shrink-0">
                      {i + 1}
                    </span>
                    <span className="font-black text-sm sm:text-base whitespace-normal break-words leading-tight text-left">
                      {st.name}
                    </span>
                  </div>
                ))}
              </div>
            ) : (
              <div
                className={`px-6 sm:px-8 py-4 sm:py-5 rounded-3xl text-white font-black text-xl sm:text-3xl md:text-4xl shadow-2xl transition-all duration-300 text-center max-w-lg w-full whitespace-normal break-words leading-tight border-4 ${
                  isFinalLocked
                    ? 'bg-gradient-to-r from-indigo-600 via-purple-600 to-pink-500 border-yellow-300 scale-105 shadow-purple-500/50'
                    : 'bg-slate-900/90 border-indigo-400/60 shadow-indigo-500/30'
                }`}
              >
                {cyclingName}
              </div>
            )}

            <div className="mt-4 flex items-center gap-2 text-xs font-semibold text-slate-300">
              <Sparkles className="w-4 h-4 text-amber-400" />
              <span>{isFinalLocked ? 'Chuẩn bị vinh danh...' : 'Hiệu ứng giảm tốc quán tính tự nhiên'}</span>
            </div>
          </div>
        )}

        {errorMsg && (
          <div className="absolute inset-0 bg-slate-950/90 flex flex-col items-center justify-center p-4 text-center z-20">
            <p className="text-xs text-rose-200 mb-3">{errorMsg}</p>
            <div className="flex items-center gap-2">
              <button
                onClick={startCamera}
                className="px-4 py-2 rounded-xl bg-indigo-600 text-white text-xs font-bold hover:bg-indigo-700 shadow-md"
              >
                Thử lại camera
              </button>
              <button
                onClick={handleExitToHome}
                className="px-4 py-2 rounded-xl bg-slate-800 text-slate-200 text-xs font-bold hover:bg-slate-700 border border-slate-700"
              >
                Về trang chủ
              </button>
            </div>
          </div>
        )}
      </div>

      {/* Action Notification */}
      {recentAction && (
        <div className="mt-3 px-4 py-1.5 rounded-xl bg-emerald-50 dark:bg-emerald-950/80 border border-emerald-300 dark:border-emerald-700 text-emerald-800 dark:text-emerald-200 text-xs font-bold flex items-center gap-1.5">
          <CheckCircle className="w-3.5 h-3.5 text-emerald-600 dark:text-emerald-400" />
          <span>{recentAction}</span>
        </div>
      )}

      {/* Dual Buttons: Home & Trigger Pick */}
      <div className="w-full mt-3 flex items-center justify-between gap-2 max-w-lg">
        <button
          onClick={handleExitToHome}
          className="py-3 px-4 rounded-2xl bg-indigo-50 hover:bg-indigo-100 dark:bg-indigo-950/60 dark:hover:bg-indigo-900/60 text-indigo-700 dark:text-indigo-300 font-bold text-xs flex items-center gap-1.5 border border-indigo-200 dark:border-indigo-800 transition-all active:scale-95 shrink-0"
          title="Giải phóng camera và trở về trang chủ ngay"
        >
          <Home className="w-4 h-4 text-indigo-600 dark:text-indigo-400" />
          <span>Về Trang Chủ</span>
        </button>

        <button
          onClick={() => onTriggerPick(detectedFingers)}
          disabled={isPicking}
          className="flex-1 py-3 px-4 rounded-2xl bg-gradient-to-r from-indigo-600 via-purple-600 to-pink-500 hover:from-indigo-700 hover:to-pink-600 text-white font-bold text-xs sm:text-sm shadow-lg shadow-indigo-500/25 flex items-center justify-center gap-2 active:scale-95 transition-all truncate"
        >
          <Hand className="w-4 h-4 shrink-0" />
          <span>CHỌN {detectedFingers} HỌC SINH</span>
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
                ? 'bg-indigo-50 dark:bg-indigo-950/60 border-indigo-400 dark:border-indigo-600 text-indigo-900 dark:text-white font-bold'
                : 'bg-slate-50 dark:bg-slate-800/60 border-slate-200 dark:border-slate-700 text-slate-500 dark:text-slate-400'
            }`}
          >
            <span className="text-xl">{g.icon}</span>
            <div className="font-bold text-[11px]">{g.label}</div>
            <div className="text-[9px] opacity-75">{g.desc}</div>
          </div>
        ))}
      </div>
    </div>
  );
};
