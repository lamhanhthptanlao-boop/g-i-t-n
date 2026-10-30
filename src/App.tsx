import React, { useState, useEffect, useCallback, useMemo } from 'react';
import { Student, GameMode, CallMode, ThemeMode, CallHistoryItem } from './types';
import { sound } from './utils/soundEffects';
import { DEFAULT_STUDENTS } from './utils/studentParser';

// Components
import { LuckyWheel } from './components/modes/LuckyWheel';
import { MysteryGift } from './components/modes/MysteryGift';
import { StageGameshow } from './components/modes/StageGameshow';
import { KnowledgeRocket } from './components/modes/KnowledgeRocket';
import { MagicHat } from './components/modes/MagicHat';
import { LuckyBubbles } from './components/modes/LuckyBubbles';
import { TreasureMap } from './components/modes/TreasureMap';
import { SmartRobot } from './components/modes/SmartRobot';

// 5 New 3D Folk Games (Three.js)
import { CatchDuck3D } from './components/modes/CatchDuck3D';
import { CatchChicken3D } from './components/modes/CatchChicken3D';
import { StealEgg3D } from './components/modes/StealEgg3D';
import { BlindGoat3D } from './components/modes/BlindGoat3D';
import { XocDia3D } from './components/modes/XocDia3D';

// Live TV Gameshow Modes (Professional Live Production)
import { LotteryDrum3D } from './components/modes/LotteryDrum3D';
import { SealedEnvelope } from './components/modes/SealedEnvelope';
import { HighSpeedReel } from './components/modes/HighSpeedReel';
import { HologramCard3D } from './components/modes/HologramCard3D';
import { VirtualMCHost } from './components/modes/VirtualMCHost';
import { GashaponMachine3D } from './components/modes/GashaponMachine3D';
import { CountdownStage } from './components/modes/CountdownStage';
import { CameraGestureMode } from './components/modes/CameraGestureMode';

import { WinnerModal } from './components/WinnerModal';
import { ConfettiOverlay } from './components/ConfettiOverlay';
import { FireworksOverlay } from './components/FireworksOverlay';
import { StudentManagerModal } from './components/StudentManagerModal';
import { HistoryDrawer } from './components/HistoryDrawer';
import { CameraGesturePanel } from './components/CameraGesturePanel';
import { SeatingMap } from './components/SeatingMap';
import { SettingsModal } from './components/SettingsModal';
import { GameshowSettings } from './types';
import { launchMiniConfettiBurst } from './utils/celebrationEffects';

import {
  Volume2,
  VolumeX,
  Music,
  Maximize,
  Minimize,
  Users,
  History,
  Sparkles,
  Play,
  RotateCcw,
  Monitor,
  LayoutGrid,
  SunMedium,
  Moon,
  Settings,
} from 'lucide-react';

export default function App() {
  // 1. Core State
  const [students, setStudents] = useState<Student[]>(() => {
    try {
      const saved = localStorage.getItem('classroom_magic_students');
      if (saved) return JSON.parse(saved);
    } catch {
      // Fallback
    }
    return DEFAULT_STUDENTS.map((name, idx) => ({
      id: `student_${idx}`,
      name,
      called: false,
      callCount: 0,
      seatRow: Math.floor(idx / 6),
      seatCol: idx % 6,
    }));
  });

  const [history, setHistory] = useState<CallHistoryItem[]>(() => {
    try {
      const saved = localStorage.getItem('classroom_magic_history');
      if (saved) return JSON.parse(saved);
    } catch {
      // Fallback
    }
    return [];
  });

  const [callMode, setCallMode] = useState<CallMode>(() => {
    return (localStorage.getItem('classroom_magic_call_mode') as CallMode) || 'no_repeat';
  });

  const [gameMode, setGameMode] = useState<GameMode>(() => {
    return (localStorage.getItem('classroom_magic_game_mode') as GameMode) || 'wheel';
  });

  const [theme, setTheme] = useState<ThemeMode>(() => {
    return (localStorage.getItem('classroom_magic_theme') as ThemeMode) || 'cute';
  });

  // UI state
  const [viewTab, setViewTab] = useState<'game' | 'seating' | 'camera'>('game');
  const [isPicking, setIsPicking] = useState<boolean>(false);
  const [currentSelectedStudent, setCurrentSelectedStudent] = useState<Student | null>(null);
  const [currentSelectedStudents, setCurrentSelectedStudents] = useState<Student[]>([]);
  const [pickCount, setPickCount] = useState<number>(1);
  const [showWinnerModal, setShowWinnerModal] = useState<boolean>(false);
  const [isConfettiActive, setIsConfettiActive] = useState<boolean>(false);
  const [showManagerModal, setShowManagerModal] = useState<boolean>(false);
  const [showHistoryDrawer, setShowHistoryDrawer] = useState<boolean>(false);
  const [isProjectorMode, setIsProjectorMode] = useState<boolean>(false);
  const [isFullscreen, setIsFullscreen] = useState<boolean>(false);

  // Gameshow Settings (Duration, Drama, TTS, Reduced Motion)
  const [settings, setSettings] = useState<GameshowSettings>(() => {
    try {
      const saved = localStorage.getItem('classroom_magic_settings');
      if (saved) return JSON.parse(saved);
    } catch {
      // Fallback
    }
    return {
      duration: 4,
      dramaLevel: 'standard',
      enableTTS: true,
      reducedMotion: false,
      fireworksSpeed: 'normal',
      fireworksDuration: 5,
    };
  });
  const [showSettingsModal, setShowSettingsModal] = useState<boolean>(false);

  // Audio state
  const [isMuted, setIsMuted] = useState<boolean>(false);
  const [isBgmActive, setIsBgmActive] = useState<boolean>(false);

  // Floating praise badges triggered by "Pháo tay"
  const [praiseBadges, setPraiseBadges] = useState<Array<{ id: number; text: string; x: number; y: number }>>([]);

  // Pháo tay khen ngợi học sinh tức thì (Confetti burst at mouse position + applause sound)
  const handlePraiseConfetti = useCallback((e?: React.MouseEvent) => {
    let clientX = typeof window !== 'undefined' ? window.innerWidth / 2 : 500;
    let clientY = typeof window !== 'undefined' ? window.innerHeight / 2 : 400;

    if (e && e.clientX && e.clientY) {
      clientX = e.clientX;
      clientY = e.clientY;
    }

    // 1. Launch crisp mini confetti burst right at mouse coordinates
    launchMiniConfettiBurst(clientX, clientY);

    // 2. Play celebratory applause + popper sound
    sound.playApplausePopper();

    // 3. Trigger haptic vibration on mobile
    if (typeof navigator !== 'undefined' && navigator.vibrate) {
      try {
        navigator.vibrate([40, 50, 40]);
      } catch {
        // Ignore
      }
    }

    // 4. Floating cheerful encouragement text at cursor
    const praiseList = [
      '👏 Giỏi quá!',
      '🌟 Xuất sắc!',
      '💯 Điểm 10!',
      '✨ Tuyệt vời!',
      '🎉 Hoan hô!',
      '🚀 Quá đỉnh!',
    ];
    const text = praiseList[Math.floor(Math.random() * praiseList.length)];
    const badgeId = Date.now() + Math.random();
    setPraiseBadges((prev) => [...prev, { id: badgeId, text, x: clientX, y: clientY }]);

    setTimeout(() => {
      setPraiseBadges((prev) => prev.filter((b) => b.id !== badgeId));
    }, 1200);
  }, []);

  // Periodic suspense haptic feedback while picking
  useEffect(() => {
    if (!isPicking) return;
    if (typeof navigator !== 'undefined' && navigator.vibrate) {
      try {
        navigator.vibrate([40, 30, 40]);
      } catch {
        // Ignore
      }
    }
    const interval = setInterval(() => {
      if (typeof navigator !== 'undefined' && navigator.vibrate) {
        try {
          navigator.vibrate(30);
        } catch {
          // Ignore
        }
      }
    }, 220);
    return () => clearInterval(interval);
  }, [isPicking]);

  // 2. Persistence sync
  useEffect(() => {
    localStorage.setItem('classroom_magic_students', JSON.stringify(students));
  }, [students]);

  useEffect(() => {
    localStorage.setItem('classroom_magic_history', JSON.stringify(history));
  }, [history]);

  useEffect(() => {
    localStorage.setItem('classroom_magic_call_mode', callMode);
  }, [callMode]);

  useEffect(() => {
    localStorage.setItem('classroom_magic_game_mode', gameMode);
  }, [gameMode]);

  useEffect(() => {
    localStorage.setItem('classroom_magic_theme', theme);
  }, [theme]);

  useEffect(() => {
    localStorage.setItem('classroom_magic_settings', JSON.stringify(settings));
    sound.setPreferredVoice(settings.voiceURI || null);
    if (settings.voiceRate) sound.setVoiceRate(settings.voiceRate);
    if (settings.voicePitch) sound.setVoicePitch(settings.voicePitch);
  }, [settings]);

  // Sound sync
  const toggleSound = () => {
    const next = !isMuted;
    setIsMuted(next);
    sound.setMuted(next);
  };

  const toggleBgm = () => {
    const active = sound.toggleBGM();
    setIsBgmActive(active);
  };

  const toggleFullscreen = () => {
    if (!document.fullscreenElement) {
      document.documentElement.requestFullscreen().then(() => setIsFullscreen(true)).catch(() => {});
    } else {
      document.exitFullscreen().then(() => setIsFullscreen(false)).catch(() => {});
    }
  };

  // 3. Selection Calculation
  const totalStudents = students.length;
  const uncalledStudents = useMemo(() => students.filter((s) => !s.called), [students]);
  const calledCount = students.filter((s) => s.called).length;
  const remainingCount = totalStudents - calledCount;

  // Primary Call Name Action with finger count support (1, 2, 3, 4, 5)
  const triggerPick = useCallback(
    (countArg?: number | unknown) => {
      if (isPicking) return; // Prevent double-triggering

      // Robustly sanitize count: if an Event, undefined, or NaN is passed, fallback to 1
      let count = 1;
      if (typeof countArg === 'number' && !isNaN(countArg) && countArg >= 1) {
        count = Math.floor(countArg);
      } else if (typeof pickCount === 'number' && !isNaN(pickCount) && pickCount >= 1) {
        count = Math.floor(pickCount);
      }

      if (totalStudents === 0) {
        setShowManagerModal(true);
        return;
      }

      // If user was on seating chart, switch to gameshow stage so the reveal animation displays
      if (viewTab === 'seating') {
        setViewTab('game');
      }

      // Determine candidate pool based on mode
      let candidatePool = [...students];
      if (callMode === 'no_repeat') {
        if (uncalledStudents.length === 0) {
          // If all students have been called, seamlessly reset round and play sparkle
          setStudents((prev) => prev.map((s) => ({ ...s, called: false })));
          candidatePool = students.map((s) => ({ ...s, called: false }));
          sound.playSparkle();
        } else {
          candidatePool = [...uncalledStudents];
        }
      }

      // Safeguard: fallback to full student list if candidate pool is somehow empty
      if (candidatePool.length === 0) {
        candidatePool = [...students];
      }

      // Target count up to candidatePool length
      const targetCount = Math.max(1, Math.min(count, candidatePool.length || 1));
      setPickCount(targetCount);

      // Fair random selection of targetCount distinct students
      const shuffled = [...candidatePool].sort(() => 0.5 - Math.random());
      let chosenStudents = shuffled.slice(0, targetCount);

      if (chosenStudents.length === 0 && candidatePool.length > 0) {
        chosenStudents = [candidatePool[Math.floor(Math.random() * candidatePool.length)]];
      }

      const primaryWinner = chosenStudents[0] || students[0] || null;
      if (!primaryWinner) {
        setShowManagerModal(true);
        return;
      }

      setCurrentSelectedStudent(primaryWinner);
      setCurrentSelectedStudents(chosenStudents);
      setIsPicking(true);
    },
    [isPicking, totalStudents, callMode, uncalledStudents, students, pickCount, viewTab]
  );

  // Handler when animation ends
  const handlePickAnimationEnd = useCallback(() => {
    setIsPicking(false);
    const chosenList =
      currentSelectedStudents.length > 0
        ? currentSelectedStudents
        : currentSelectedStudent
        ? [currentSelectedStudent]
        : [];

    if (chosenList.length === 0) return;

    const chosenIds = new Set(chosenList.map((s) => s.id));

    // Update students called status
    setStudents((prev) =>
      prev.map((s) =>
        chosenIds.has(s.id)
          ? { ...s, called: true, callCount: s.callCount + 1, lastCalledAt: Date.now() }
          : s
      )
    );

    // Record into history
    const now = Date.now();
    const newHistoryItems: CallHistoryItem[] = chosenList.map((st, idx) => ({
      id: `call_${now}_${idx}_${Math.random().toString(36).substring(2, 6)}`,
      studentId: st.id,
      studentName: st.name,
      timestamp: now + idx,
      order: history.length + idx + 1,
      mode: gameMode,
    }));
    setHistory((prev) => [...newHistoryItems.reverse(), ...prev]);

    // Speak winner name(s) if enableTTS is enabled
    if (settings.enableTTS && gameMode !== 'virtual_mc') {
      if (chosenList.length === 1) {
        sound.speakVirtualMC(
          `Xin chúc mừng bạn, ${chosenList[0].name}!`,
          settings.voiceURI,
          settings.voiceRate,
          settings.voicePitch
        );
      } else {
        sound.speakVirtualMC(
          `Xin chúc mừng ${chosenList.length} bạn: ${chosenList.map((s) => s.name).join(', ')}!`,
          settings.voiceURI,
          settings.voiceRate,
          settings.voicePitch
        );
      }
    }

    // Trigger full-screen fireworks & confetti overlay
    setIsConfettiActive(true);

    // Show celebration modal
    setShowWinnerModal(true);
  }, [
    currentSelectedStudents,
    currentSelectedStudent,
    gameMode,
    history.length,
    settings.enableTTS,
    settings.voiceURI,
    settings.voiceRate,
    settings.voicePitch,
  ]);

  // Safety watchdog: ensure isPicking never gets permanently stuck
  useEffect(() => {
    if (!isPicking) return;
    const maxSafetyDurationMs = Math.max(7500, ((settings.duration || 4) + 3) * 1000);
    const timeout = setTimeout(() => {
      handlePickAnimationEnd();
    }, maxSafetyDurationMs);
    return () => clearTimeout(timeout);
  }, [isPicking, settings.duration, handlePickAnimationEnd]);

  // Undo last call
  const handleUndoLastCall = useCallback(() => {
    if (history.length === 0) return;
    const lastItem = history[0];

    // Decrement callCount and revert called flag if count drops to 0
    setStudents((prev) =>
      prev.map((s) => {
        if (s.id === lastItem.studentId) {
          const nextCount = Math.max(0, s.callCount - 1);
          return {
            ...s,
            callCount: nextCount,
            called: nextCount > 0,
          };
        }
        return s;
      })
    );

    setHistory((prev) => prev.slice(1));
    sound.playSpinTick(0.8);
  }, [history]);

  // Reset round (mark all students uncalled for a fresh round)
  const handleResetRound = useCallback(() => {
    setStudents((prev) => prev.map((s) => ({ ...s, called: false })));
    sound.playSparkle();
  }, []);

  // Keyboard shortcut: Spacebar or Enter triggers pick
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (showWinnerModal || showManagerModal || showHistoryDrawer) return;
      if (e.target instanceof HTMLInputElement || e.target instanceof HTMLTextAreaElement) return;

      if (e.code === 'Space' || e.code === 'Enter') {
        e.preventDefault();
        triggerPick(pickCount);
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [triggerPick, pickCount, showWinnerModal, showManagerModal, showHistoryDrawer]);

  // Background styling based on theme
  const backdropImage =
    theme === 'cute'
      ? '/src/assets/images/cute_classroom_backdrop_1793182499927.jpg'
      : '/src/assets/images/gameshow_stage_backdrop_1793182500158.jpg';

  return (
    <div
      className={`min-h-screen w-full flex flex-col font-sans transition-colors duration-500 relative select-none ${
        theme === 'cute'
          ? 'bg-sky-50 text-slate-900'
          : 'bg-slate-950 text-white'
      } ${isProjectorMode ? 'p-2 sm:p-4' : 'p-3 sm:p-6'}`}
      style={{
        backgroundImage: `linear-gradient(to bottom, ${
          theme === 'cute' ? 'rgba(240, 249, 255, 0.88), rgba(240, 249, 255, 0.94)' : 'rgba(2, 6, 23, 0.88), rgba(2, 6, 23, 0.94)'
        }), url('${backdropImage}')`,
        backgroundSize: 'cover',
        backgroundPosition: 'center',
        backgroundAttachment: 'fixed',
      }}
    >
      {/* Top Header Bar */}
      <header className="w-full max-w-6xl mx-auto flex items-center justify-between gap-4 py-2 mb-3">
        {/* Brand Zone with Cat Logo */}
        <div className="flex items-center gap-2.5">
          <div className="w-11 h-11 rounded-2xl overflow-hidden border-2 border-amber-300 shadow-md shadow-amber-500/20 ring-2 ring-amber-400/30 shrink-0">
            <img
              src="/src/assets/images/cat_logo_cute_1793188309200.jpg"
              alt="Logo Mèo Gameshow"
              className="w-full h-full object-cover"
            />
          </div>
          <div>
            <h1 className="text-base sm:text-lg font-black tracking-tight flex items-center gap-1.5 truncate text-amber-600 dark:text-amber-400">
              <span>CLASSROOM MAGIC</span>
              <span className="text-xs font-bold px-2 py-0.5 rounded-full bg-pink-100 text-pink-700 dark:bg-pink-950/60 dark:text-pink-300 border border-pink-300">
                🐾 MS MÈO
              </span>
            </h1>
            <p className="hidden md:block text-[11px] font-semibold text-slate-500 dark:text-slate-400">
              Vòng Quay May Mắn & Gameshow Lớp Học
            </p>
          </div>
        </div>

        {/* Action Controls & Navigation */}
        <div className="flex items-center gap-2">
          {/* Theme Switcher */}
          <button
            onClick={() => setTheme(theme === 'cute' ? 'gameshow' : 'cute')}
            className="p-2 rounded-xl bg-white/80 dark:bg-slate-800/80 border border-slate-200 dark:border-slate-700 shadow-xs hover:scale-105 transition-all text-xs font-semibold flex items-center gap-1.5"
            title="Đổi giao diện Dễ thương / Gameshow"
          >
            {theme === 'cute' ? (
              <>
                <SunMedium className="w-4 h-4 text-amber-500" />
                <span className="hidden sm:inline text-slate-700">Chủ đề Cute</span>
              </>
            ) : (
              <>
                <Moon className="w-4 h-4 text-purple-400" />
                <span className="hidden sm:inline text-slate-200">Chủ đề Gameshow</span>
              </>
            )}
          </button>

          {/* Sound Mute */}
          <button
            onClick={toggleSound}
            className={`p-2 rounded-xl border transition-all ${
              isMuted
                ? 'bg-rose-50 dark:bg-rose-950/50 border-rose-300 text-rose-500'
                : 'bg-white/80 dark:bg-slate-800/80 border-slate-200 dark:border-slate-700 text-slate-700 dark:text-slate-300'
            }`}
            title={isMuted ? 'Bật âm thanh' : 'Tắt âm thanh'}
          >
            {isMuted ? <VolumeX className="w-4 h-4" /> : <Volume2 className="w-4 h-4" />}
          </button>

          {/* Cheerful BGM */}
          <button
            onClick={toggleBgm}
            className={`p-2 rounded-xl border transition-all ${
              isBgmActive
                ? 'bg-amber-100 dark:bg-amber-950/60 border-amber-400 text-amber-600 dark:text-amber-400 animate-pulse'
                : 'bg-white/80 dark:bg-slate-800/80 border-slate-200 dark:border-slate-700 text-slate-700 dark:text-slate-300'
            }`}
            title={isBgmActive ? 'Tắt nhạc nền' : 'Bật nhạc nền gameshow'}
          >
            <Music className="w-4 h-4" />
          </button>

          {/* Projector Mode (Máy chiếu) */}
          <button
            onClick={() => setIsProjectorMode(!isProjectorMode)}
            className={`p-2 rounded-xl border transition-all ${
              isProjectorMode
                ? 'bg-purple-600 border-purple-500 text-white shadow-md'
                : 'bg-white/80 dark:bg-slate-800/80 border-slate-200 dark:border-slate-700 text-slate-700 dark:text-slate-300'
            }`}
            title="Chế độ Trình chiếu Máy Chiếu (chữ siêu to, tối giản)"
          >
            <Monitor className="w-4 h-4" />
          </button>

          {/* Settings Modal Button */}
          <button
            onClick={() => setShowSettingsModal(true)}
            className="p-2 rounded-xl bg-white/80 dark:bg-slate-800/80 border border-slate-200 dark:border-slate-700 text-slate-700 dark:text-slate-300 transition-all hover:scale-105"
            title="Cài đặt gameshow (thời lượng, kịch tính, âm thanh)"
          >
            <Settings className="w-4 h-4 text-amber-500" />
          </button>

          {/* Fullscreen Toggle */}
          <button
            onClick={toggleFullscreen}
            className="p-2 rounded-xl bg-white/80 dark:bg-slate-800/80 border border-slate-200 dark:border-slate-700 text-slate-700 dark:text-slate-300 transition-all hidden sm:block"
            title="Toàn màn hình"
          >
            {isFullscreen ? <Minimize className="w-4 h-4" /> : <Maximize className="w-4 h-4" />}
          </button>

          {/* Nút Pháo tay (Confetti Burst khen ngợi học sinh tức thì tại chuột) */}
          <button
            onClick={(e) => handlePraiseConfetti(e)}
            className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-gradient-to-r from-pink-500 via-rose-500 to-amber-500 hover:from-pink-600 hover:to-amber-600 active:scale-95 text-white font-bold text-xs shadow-md shadow-pink-500/25 transition-all hover:scale-105 ring-2 ring-pink-300/40"
            title="Bấm để bắn pháo tay khen ngợi học sinh tại vị trí chuột mà không cần gọi tên!"
          >
            <span className="text-base animate-pulse">👏</span>
            <span className="hidden sm:inline">Pháo tay</span>
            <Sparkles className="w-3.5 h-3.5 text-yellow-200" />
          </button>

          {/* Camera Gesture Module for floating overlay (only active in non-camera modes) */}
          {gameMode !== 'camera_gesture' && (
            <CameraGesturePanel
              onTriggerPick={triggerPick}
              onSelectMode={(m) => setGameMode(m)}
              onPause={() => setIsPicking(false)}
            />
          )}

          {/* Student Roster Button */}
          <button
            onClick={() => setShowManagerModal(true)}
            className="flex items-center gap-1.5 px-3 py-2 rounded-xl bg-amber-500 hover:bg-amber-600 text-white font-bold text-xs shadow-md shadow-amber-500/20 transition-all hover:scale-105"
          >
            <Users className="w-4 h-4" />
            <span className="hidden sm:inline">Danh sách ({totalStudents})</span>
          </button>

          {/* History Drawer Button */}
          <button
            onClick={() => setShowHistoryDrawer(true)}
            className="p-2 rounded-xl bg-white/80 dark:bg-slate-800/80 border border-slate-200 dark:border-slate-700 text-slate-700 dark:text-slate-300 transition-all"
            title="Xem lịch sử gọi tên"
          >
            <History className="w-4 h-4" />
          </button>
        </div>
      </header>

      {/* Main Content Area */}
      <main className="w-full max-w-6xl mx-auto flex-1 flex flex-col items-center justify-between">
        {/* Banner Section with Ms. Mèo Welcome */}
        {!isProjectorMode && (
          <div className="flex flex-col sm:flex-row items-center justify-center gap-3 text-center my-2 animate-fade-in">
            {/* Cute Ms Meo Mini Avatar */}
            <div className="relative w-14 h-14 sm:w-16 sm:h-16 rounded-2xl overflow-hidden border-2 border-amber-300 shadow-md ring-2 ring-pink-300/50 shrink-0 transform hover:rotate-6 transition-transform">
              <img
                src="/src/assets/images/ms_meo_mascot_1793188289324.jpg"
                alt="Ms. Mèo Mascot"
                className="w-full h-full object-cover"
              />
              <span className="absolute bottom-0 inset-x-0 bg-amber-500/90 text-[9px] font-black text-white text-center py-0.5">
                MS MÈO
              </span>
            </div>
            <div>
              <h2 className="text-xl sm:text-3xl font-black tracking-tight text-amber-500 dark:text-amber-400 drop-shadow-xs flex items-center justify-center gap-2">
                <span>🎉 HÔM NAY AI SẼ ĐƯỢC GỌI TÊN NHỈ?</span>
                <span className="text-2xl animate-bounce">🐾</span>
              </h2>
              <p className="text-xs sm:text-sm font-bold text-slate-600 dark:text-slate-300 mt-0.5">
                Cùng cô giáo <span className="text-amber-600 dark:text-amber-300 font-black">Ms. Mèo</span> khám phá những ngôi sao tri thức của lớp mình! ✨
              </p>
            </div>
          </div>
        )}

        {/* View Switcher: 10 Live Gameshows vs 5 3D Folk Games vs Classroom Seating Map */}
        {!isProjectorMode && (
          <div className="flex flex-wrap items-center justify-center gap-1.5 p-1 bg-white/80 dark:bg-slate-900/80 rounded-2xl border border-slate-200 dark:border-slate-800 shadow-xs mb-3">
            <button
              onClick={() => {
                setViewTab('game');
                if (['catch_duck', 'catch_chicken', 'steal_egg', 'blind_goat', 'xoc_dia'].includes(gameMode)) {
                  setGameMode('gameshow_live');
                }
              }}
              className={`px-3 sm:px-4 py-1.5 text-xs font-bold rounded-xl transition-all ${
                viewTab === 'game' && !['catch_duck', 'catch_chicken', 'steal_egg', 'blind_goat', 'xoc_dia'].includes(gameMode)
                  ? 'bg-amber-500 text-white shadow-xs'
                  : 'text-slate-600 dark:text-slate-400 hover:text-slate-900'
              }`}
            >
              🎬 10 Gameshow Truyền Hình Live
            </button>
            <button
              onClick={() => {
                setViewTab('game');
                if (!['catch_duck', 'catch_chicken', 'steal_egg', 'blind_goat', 'xoc_dia'].includes(gameMode)) {
                  setGameMode('catch_duck');
                }
              }}
              className={`px-3 sm:px-4 py-1.5 text-xs font-bold rounded-xl transition-all ${
                viewTab === 'game' && ['catch_duck', 'catch_chicken', 'steal_egg', 'blind_goat', 'xoc_dia'].includes(gameMode)
                  ? 'bg-emerald-600 text-white shadow-xs'
                  : 'text-slate-600 dark:text-slate-400 hover:text-slate-900'
              }`}
            >
              🌾 5 Trò Chơi Dân Gian 3D
            </button>
            <button
              onClick={() => {
                setViewTab('camera');
                setGameMode('camera_gesture');
                sound.playSparkle();
              }}
              className={`px-3 sm:px-4 py-1.5 text-xs font-bold rounded-xl transition-all flex items-center gap-1.5 ${
                viewTab === 'camera' || (viewTab === 'game' && gameMode === 'camera_gesture')
                  ? 'bg-rose-500 text-white shadow-md shadow-rose-500/30'
                  : 'text-slate-600 dark:text-slate-400 hover:text-slate-900'
              }`}
            >
              <span>🖐️</span>
              <span>Tương tác Camera (Cử chỉ tay)</span>
            </button>
            <button
              onClick={() => setViewTab('seating')}
              className={`px-3 sm:px-4 py-1.5 text-xs font-bold rounded-xl transition-all flex items-center gap-1.5 ${
                viewTab === 'seating'
                  ? 'bg-indigo-600 text-white shadow-xs'
                  : 'text-slate-600 dark:text-slate-400 hover:text-slate-900'
              }`}
            >
              <LayoutGrid className="w-3.5 h-3.5" />
              <span>Sơ đồ chỗ ngồi</span>
            </button>
          </div>
        )}

        {/* Game Mode Selector Sub-Pills */}
        {!isProjectorMode && viewTab === 'game' && (
          <div className="flex flex-wrap items-center justify-center gap-1.5 sm:gap-2 mb-4 max-w-5xl px-2">
            {!['catch_duck', 'catch_chicken', 'steal_egg', 'blind_goat', 'xoc_dia'].includes(gameMode) ? (
              // 10 Live Professional Gameshows
              [
                { id: 'gameshow_live', label: '1. Gameshow TV', icon: '🏆' },
                { id: 'lottery_drum', label: '2. Lồng quay 3D', icon: '🎰' },
                { id: 'wheel_3d', label: '3. Vòng quay 3D', icon: '🎡' },
                { id: 'sealed_envelope', label: '4. Phong bì mật', icon: '✉️' },
                { id: 'high_speed_reel', label: '5. Bảng cuộn LED', icon: '⚡' },
                { id: 'countdown_stage', label: '6. Đếm ngược 3-2-1', icon: '⏱️' },
                { id: 'hologram_card', label: '7. Hologram 3D', icon: '💎' },
                { id: 'virtual_mc', label: '8. MC ảo AI', icon: '🎙️' },
                { id: 'gashapon_machine', label: '9. Máy Gashapon', icon: '🔮' },
                { id: 'camera_gesture', label: '10. Camera cử chỉ', icon: '📷' },
              ].map((m) => (
                <button
                  key={m.id}
                  onClick={() => {
                    setGameMode(m.id as GameMode);
                    sound.playSpinTick(1.2);
                  }}
                  className={`px-3 py-1.5 rounded-xl text-xs font-bold flex items-center gap-1.5 transition-all ${
                    gameMode === m.id || (m.id === 'gameshow_live' && gameMode === 'gameshow') || (m.id === 'wheel_3d' && gameMode === 'wheel')
                      ? 'bg-amber-500 text-white shadow-md shadow-amber-500/30 scale-105 ring-2 ring-amber-300'
                      : 'bg-white/80 dark:bg-slate-800/80 text-slate-700 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-700 border border-slate-200 dark:border-slate-700'
                  }`}
                >
                  <span>{m.icon}</span>
                  <span>{m.label}</span>
                </button>
              ))
            ) : (
              // 5 3D Folk Games
              [
                { id: 'catch_duck', label: 'Bắt vịt', icon: '🦆' },
                { id: 'catch_chicken', label: 'Bắt gà', icon: '🐔' },
                { id: 'steal_egg', label: 'Trộm trứng', icon: '🥚' },
                { id: 'blind_goat', label: 'Bịt mắt bắt dê', icon: '🐐' },
                { id: 'xoc_dia', label: 'Xóc đĩa', icon: '🎲' },
              ].map((m) => (
                <button
                  key={m.id}
                  onClick={() => {
                    setGameMode(m.id as GameMode);
                    sound.playSpinTick(1.2);
                  }}
                  className={`px-3 py-1.5 rounded-xl text-xs font-bold flex items-center gap-1.5 transition-all ${
                    gameMode === m.id
                      ? 'bg-emerald-600 text-white shadow-md shadow-emerald-500/30 scale-105 ring-2 ring-emerald-300'
                      : 'bg-white/80 dark:bg-slate-800/80 text-slate-700 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-700 border border-slate-200 dark:border-slate-700'
                  }`}
                >
                  <span>{m.icon}</span>
                  <span>{m.label}</span>
                </button>
              ))
            )}
          </div>
        )}

        {/* Main Stage Display (Current Mode, Seating, or Camera Gesture) */}
        <div className="w-full flex-1 flex flex-col items-center justify-center relative my-auto">
          {viewTab === 'seating' ? (
            <SeatingMap
              students={students}
              onSelectStudent={(st) => {
                setCurrentSelectedStudent(st);
                setShowWinnerModal(true);
              }}
            />
          ) : viewTab === 'camera' ? (
            <CameraGestureMode
              students={callMode === 'no_repeat' ? uncalledStudents : students}
              isPicking={isPicking}
              selectedStudent={currentSelectedStudent}
              onTriggerPick={triggerPick}
              onPickEnd={handlePickAnimationEnd}
            />
          ) : (
            <>
              {/* 1. Gameshow truyền hình trực tiếp */}
              {(gameMode === 'gameshow_live' || gameMode === 'gameshow') && (
                <StageGameshow
                  students={callMode === 'no_repeat' ? uncalledStudents : students}
                  isPicking={isPicking}
                  selectedStudent={currentSelectedStudent}
                  onPickEnd={handlePickAnimationEnd}
                  theme={theme}
                />
              )}

              {/* 2. Máy rút thăm điện tử 3D */}
              {gameMode === 'lottery_drum' && (
                <LotteryDrum3D
                  students={callMode === 'no_repeat' ? uncalledStudents : students}
                  isPicking={isPicking}
                  selectedStudent={currentSelectedStudent}
                  onPickEnd={handlePickAnimationEnd}
                  duration={settings.duration}
                />
              )}

              {/* 3. Vòng quay vật lý mô phỏng 3D */}
              {(gameMode === 'wheel_3d' || gameMode === 'wheel') && (
                <LuckyWheel
                  students={callMode === 'no_repeat' ? uncalledStudents : students}
                  isSpinning={isPicking}
                  selectedStudent={currentSelectedStudent}
                  onSpinEnd={handlePickAnimationEnd}
                  theme={theme}
                />
              )}

              {/* 4. Phong bì niêm phong bí mật */}
              {gameMode === 'sealed_envelope' && (
                <SealedEnvelope
                  isPicking={isPicking}
                  selectedStudent={currentSelectedStudent}
                  onPickEnd={handlePickAnimationEnd}
                  duration={settings.duration}
                />
              )}

              {/* 5. Bảng tên cuộn tốc độ cao */}
              {gameMode === 'high_speed_reel' && (
                <HighSpeedReel
                  students={callMode === 'no_repeat' ? uncalledStudents : students}
                  isPicking={isPicking}
                  selectedStudent={currentSelectedStudent}
                  onPickEnd={handlePickAnimationEnd}
                  duration={settings.duration}
                />
              )}

              {/* 6. Đếm ngược sân khấu 3-2-1 */}
              {gameMode === 'countdown_stage' && (
                <CountdownStage
                  students={callMode === 'no_repeat' ? uncalledStudents : students}
                  isPicking={isPicking}
                  selectedStudent={currentSelectedStudent}
                  onPickEnd={handlePickAnimationEnd}
                  duration={settings.duration}
                />
              )}

              {/* 7. Thẻ tên hologram 3D */}
              {gameMode === 'hologram_card' && (
                <HologramCard3D
                  students={callMode === 'no_repeat' ? uncalledStudents : students}
                  isPicking={isPicking}
                  selectedStudent={currentSelectedStudent}
                  onPickEnd={handlePickAnimationEnd}
                  duration={settings.duration}
                />
              )}

              {/* 8. MC ảo công bố kết quả */}
              {gameMode === 'virtual_mc' && (
                <VirtualMCHost
                  isPicking={isPicking}
                  selectedStudent={currentSelectedStudent}
                  onPickEnd={handlePickAnimationEnd}
                  enableTTS={settings.enableTTS}
                />
              )}

              {/* 9. Máy viên nang bí mật Gashapon 3D */}
              {gameMode === 'gashapon_machine' && (
                <GashaponMachine3D
                  students={callMode === 'no_repeat' ? uncalledStudents : students}
                  isPicking={isPicking}
                  selectedStudent={currentSelectedStudent}
                  onPickEnd={handlePickAnimationEnd}
                  duration={settings.duration}
                />
              )}

              {/* 10. Chọn tên bằng camera / cử chỉ */}
              {gameMode === 'camera_gesture' && (
                <CameraGestureMode
                  students={callMode === 'no_repeat' ? uncalledStudents : students}
                  isPicking={isPicking}
                  selectedStudent={currentSelectedStudent}
                  onTriggerPick={triggerPick}
                  onPickEnd={handlePickAnimationEnd}
                />
              )}

              {/* 5 Trò Chơi Dân Gian 3D (Three.js) */}
              {gameMode === 'catch_duck' && (
                <CatchDuck3D
                  students={callMode === 'no_repeat' ? uncalledStudents : students}
                  isPicking={isPicking}
                  selectedStudent={currentSelectedStudent}
                  onPickEnd={handlePickAnimationEnd}
                />
              )}

              {gameMode === 'catch_chicken' && (
                <CatchChicken3D
                  students={callMode === 'no_repeat' ? uncalledStudents : students}
                  isPicking={isPicking}
                  selectedStudent={currentSelectedStudent}
                  onPickEnd={handlePickAnimationEnd}
                />
              )}

              {gameMode === 'steal_egg' && (
                <StealEgg3D
                  students={callMode === 'no_repeat' ? uncalledStudents : students}
                  isPicking={isPicking}
                  selectedStudent={currentSelectedStudent}
                  onPickEnd={handlePickAnimationEnd}
                />
              )}

              {gameMode === 'blind_goat' && (
                <BlindGoat3D
                  students={callMode === 'no_repeat' ? uncalledStudents : students}
                  isPicking={isPicking}
                  selectedStudent={currentSelectedStudent}
                  onPickEnd={handlePickAnimationEnd}
                />
              )}

              {gameMode === 'xoc_dia' && (
                <XocDia3D
                  students={callMode === 'no_repeat' ? uncalledStudents : students}
                  isPicking={isPicking}
                  selectedStudent={currentSelectedStudent}
                  onPickEnd={handlePickAnimationEnd}
                />
              )}

              {/* Legacy fallback modes */}
              {gameMode === 'gift' && (
                <MysteryGift
                  students={callMode === 'no_repeat' ? uncalledStudents : students}
                  isPicking={isPicking}
                  selectedStudent={currentSelectedStudent}
                  onPickEnd={handlePickAnimationEnd}
                  theme={theme}
                />
              )}
              {gameMode === 'rocket' && (
                <KnowledgeRocket
                  isPicking={isPicking}
                  selectedStudent={currentSelectedStudent}
                  onPickEnd={handlePickAnimationEnd}
                />
              )}
              {gameMode === 'magic_hat' && (
                <MagicHat
                  isPicking={isPicking}
                  selectedStudent={currentSelectedStudent}
                  onPickEnd={handlePickAnimationEnd}
                />
              )}
              {gameMode === 'bubbles' && (
                <LuckyBubbles
                  students={callMode === 'no_repeat' ? uncalledStudents : students}
                  isPicking={isPicking}
                  selectedStudent={currentSelectedStudent}
                  onPickEnd={handlePickAnimationEnd}
                />
              )}
              {gameMode === 'treasure' && (
                <TreasureMap
                  isPicking={isPicking}
                  selectedStudent={currentSelectedStudent}
                  onPickEnd={handlePickAnimationEnd}
                />
              )}
              {gameMode === 'robot' && (
                <SmartRobot
                  students={callMode === 'no_repeat' ? uncalledStudents : students}
                  isPicking={isPicking}
                  selectedStudent={currentSelectedStudent}
                  onPickEnd={handlePickAnimationEnd}
                />
              )}
            </>
          )}
        </div>

        {/* Primary Call Action Button & Live Counters Strip */}
        <div className="w-full max-w-xl mx-auto flex flex-col items-center gap-3 my-4">
          <div className="w-full flex items-center justify-center gap-2 sm:gap-3 max-w-lg">
            {/* Main "GỌI TÊN NGAY!" CTA with Suspense Vibration Effect */}
            <button
              onClick={() => triggerPick(pickCount)}
              disabled={isPicking || totalStudents === 0}
              className={`flex-1 py-4 sm:py-5 px-6 sm:px-8 rounded-3xl font-black text-xl sm:text-2xl tracking-wider text-white shadow-2xl transition-all duration-150 transform select-none ${
                isPicking
                  ? 'bg-gradient-to-r from-orange-600 via-rose-600 to-amber-600 animate-vibrate shadow-rose-500/60 ring-4 ring-rose-400 scale-98 cursor-wait'
                  : 'bg-gradient-to-r from-amber-500 via-orange-500 to-amber-600 hover:from-amber-600 hover:to-orange-600 hover:scale-105 active:scale-95 shadow-amber-500/50 ring-4 ring-amber-300 animate-idle-shake'
              } flex items-center justify-center gap-3`}
            >
              <Play className={`w-7 h-7 fill-white ${isPicking ? 'animate-spin' : ''}`} />
              <span>{isPicking ? 'ĐANG QUAY TÊN...' : 'GỌI TÊN NGAY!'}</span>
              <Sparkles className="w-6 h-6 text-yellow-200 animate-pulse" />
            </button>

            {/* Quick Confetti & Praise Button ("Pháo tay khen ngợi học sinh") */}
            <button
              onClick={(e) => handlePraiseConfetti(e)}
              className="py-3.5 sm:py-4 px-3 sm:px-4 rounded-3xl bg-gradient-to-b from-pink-500 via-rose-500 to-amber-500 hover:from-pink-600 hover:to-amber-600 active:scale-90 text-white font-black shadow-lg shadow-pink-500/30 ring-3 ring-pink-300/60 transition-all flex flex-col items-center justify-center gap-0.5 shrink-0"
              title="Pháo tay khen ngợi học sinh tức thì tại vị trí chuột (không cần gọi tên)!"
            >
              <span className="text-2xl sm:text-3xl animate-bounce">👏</span>
              <span className="text-[10px] sm:text-xs font-black uppercase tracking-wider text-yellow-100">Pháo tay</span>
            </button>
          </div>

          <span className="text-[11px] font-medium text-slate-500 dark:text-slate-400">
            Mẹo: Nhấn phím <kbd className="px-1.5 py-0.5 rounded bg-slate-200 dark:bg-slate-800 font-mono text-[10px]">Space</kbd> hoặc <kbd className="px-1.5 py-0.5 rounded bg-slate-200 dark:bg-slate-800 font-mono text-[10px]">Enter</kbd> trên bàn phím để gọi tên ngay!
          </span>

          {/* Classroom Stats & Rule Toggle */}
          <div className="w-full flex flex-wrap items-center justify-between gap-3 p-3 bg-white/80 dark:bg-slate-900/80 rounded-2xl border border-slate-200 dark:border-slate-800 backdrop-blur-xs text-xs">
            {/* Rule mode picker: No repeat vs Allow repeat */}
            <div className="flex items-center gap-2">
              <span className="text-slate-500 font-semibold">Quy tắc:</span>
              <button
                onClick={() => setCallMode(callMode === 'no_repeat' ? 'allow_repeat' : 'no_repeat')}
                className={`px-3 py-1 rounded-lg font-bold transition-all ${
                  callMode === 'no_repeat'
                    ? 'bg-emerald-500 text-white shadow-xs'
                    : 'bg-slate-200 dark:bg-slate-800 text-slate-700 dark:text-slate-300'
                }`}
                title="Bấm để đổi chế độ gọi tên"
              >
                {callMode === 'no_repeat' ? 'Không lặp tên' : 'Cho phép gọi trùng'}
              </button>
            </div>

            {/* Counters */}
            <div className="flex items-center gap-4 font-semibold text-slate-600 dark:text-slate-300">
              <div>
                Tổng số: <strong className="text-slate-900 dark:text-white">{totalStudents}</strong>
              </div>
              <div>·</div>
              <div>
                Đã gọi: <strong className="text-emerald-600 dark:text-emerald-400">{calledCount}</strong>
              </div>
              <div>·</div>
              <div>
                Còn lại: <strong className="text-amber-600 dark:text-amber-400">{remainingCount}</strong>
              </div>
            </div>

            {/* Quick Reset Round */}
            <button
              onClick={handleResetRound}
              className="p-1.5 text-slate-500 hover:text-amber-500 rounded-lg hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors"
              title="Bắt đầu lượt mới (đặt lại trạng thái chưa gọi)"
            >
              <RotateCcw className="w-4 h-4" />
            </button>
          </div>
        </div>
      </main>

      {/* Screen-Wide Physics Fireworks Particle System & Celebration Overlay */}
      <FireworksOverlay
        isActive={isConfettiActive}
        speed={settings.fireworksSpeed || 'normal'}
        duration={settings.fireworksDuration || 5}
        onComplete={() => setIsConfettiActive(false)}
        onUpdateSettings={(newSpeed, newDuration) => {
          setSettings((prev) => ({
            ...prev,
            fireworksSpeed: newSpeed,
            fireworksDuration: newDuration,
          }));
        }}
        showControls={true}
      />

      <ConfettiOverlay
        isActive={isConfettiActive}
        duration={(settings.fireworksDuration || 5) * 1000}
        onComplete={() => {}}
      />

      {/* Modals & Drawers */}
      <WinnerModal
        isOpen={showWinnerModal}
        student={currentSelectedStudent}
        students={currentSelectedStudents}
        totalStudents={totalStudents}
        calledCount={calledCount}
        remainingCount={remainingCount}
        callNumber={history.length}
        enableTTS={settings.enableTTS}
        voiceURI={settings.voiceURI}
        voiceRate={settings.voiceRate}
        voicePitch={settings.voicePitch}
        fireworksSpeed={settings.fireworksSpeed || 'normal'}
        fireworksDuration={settings.fireworksDuration || 5}
        onUpdateFireworksSettings={(newSpeed, newDuration) => {
          setSettings((prev) => ({
            ...prev,
            fireworksSpeed: newSpeed,
            fireworksDuration: newDuration,
          }));
        }}
        onNext={() => triggerPick(pickCount)}
        onUndo={handleUndoLastCall}
        onResetRound={handleResetRound}
        onClose={() => {
          setShowWinnerModal(false);
          setIsConfettiActive(false);
        }}
      />

      <StudentManagerModal
        isOpen={showManagerModal}
        students={students}
        onUpdateStudents={(newSts) => setStudents(newSts)}
        onClose={() => setShowManagerModal(false)}
      />

      <HistoryDrawer
        isOpen={showHistoryDrawer}
        history={history}
        students={students}
        onUndoLast={handleUndoLastCall}
        onResetRound={handleResetRound}
        onClearHistory={() => setHistory([])}
        onClose={() => setShowHistoryDrawer(false)}
      />

      <SettingsModal
        isOpen={showSettingsModal}
        settings={settings}
        onUpdateSettings={setSettings}
        onClose={() => setShowSettingsModal(false)}
      />

      {/* Floating praise badges (displayed upon clicking "Pháo tay") */}
      {praiseBadges.map((badge) => (
        <div
          key={badge.id}
          style={{ left: badge.x, top: badge.y }}
          className="fixed z-[999999] pointer-events-none transform -translate-x-1/2 -translate-y-full px-4 py-2 rounded-2xl bg-gradient-to-r from-amber-400 via-pink-500 to-rose-500 text-white font-black text-base shadow-2xl shadow-pink-500/50 border-2 border-white animate-launch-up whitespace-nowrap flex items-center gap-1.5"
        >
          <span>{badge.text}</span>
        </div>
      ))}
    </div>
  );
}
