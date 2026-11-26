import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import {
  Award,
  CheckCircle2,
  ChevronDown,
  ChevronUp,
  Edit3,
  Gift,
  Home,
  Maximize,
  Minimize,
  Music,
  Play,
  Plus,
  RotateCcw,
  SkipForward,
  Sparkles,
  Star,
  Trash2,
  Trophy,
  Users,
  Volume2,
  VolumeX,
  X,
} from 'lucide-react';
import { CallMode, ChristmasChallenge, ChristmasMiniGameId, Student } from '../../types';
import { sound } from '../../utils/soundEffects';
import { launchMiniConfettiBurst } from '../../utils/celebrationEffects';
import { formatMultiStudentCallSpeech, formatStudentCallSpeech } from '../../utils/vietnameseSpeech';
import { ChristmasScene3D } from './ChristmasScene3D';
import { ChristmasFallbackScene } from './ChristmasFallbackScene';
import { santaSleighReindeerImg } from '../../assets/images';
import {
  CHRISTMAS_CHALLENGES_STORAGE_KEY,
  CHRISTMAS_STARS_STORAGE_KEY,
  DEFAULT_CHRISTMAS_CHALLENGES,
  loadChristmasChallenges,
  loadChristmasStars,
} from './christmasChallenges';

interface ChristmasMagicModeProps {
  students: Student[];
  activeClassName: string;
  callMode: CallMode;
  onToggleCallMode: () => void;
  onMarkCalled: (chosen: Student[], miniGameLabel: string) => void;
  onResetRound: () => void;
  onOpenStudentManager: () => void;
  onBackToHome: () => void;
  enableTTS: boolean;
  onlySpeakName: boolean;
  voiceURI?: string;
  voiceRate?: number;
  voicePitch?: number;
}

const MINI_GAMES: Array<{ id: ChristmasMiniGameId; label: string; shortLabel: string; icon: string }> = [
  { id: 'village', label: "1. Santa's Village", shortLabel: 'Village', icon: '🏘️' },
  { id: 'tree', label: '2. Christmas Tree', shortLabel: 'Tree', icon: '🎄' },
  { id: 'santa_gift', label: "3. Santa's Gift", shortLabel: 'Gift', icon: '🎁' },
  { id: 'mystery_gift', label: '4. Mystery Gift', shortLabel: 'Mystery', icon: '🪄' },
  { id: 'star_rewards', label: '5. Star Rewards', shortLabel: 'Stars', icon: '⭐' },
];

export const ChristmasMagicMode: React.FC<ChristmasMagicModeProps> = ({
  students,
  activeClassName,
  callMode,
  onToggleCallMode,
  onMarkCalled,
  onResetRound,
  onOpenStudentManager,
  onBackToHome,
  enableTTS,
  onlySpeakName,
  voiceURI,
  voiceRate = 0.96,
  voicePitch = 1.02,
}) => {
  const rootRef = useRef<HTMLDivElement | null>(null);
  const pickTimerRef = useRef<number | null>(null);

  const [miniGame, setMiniGame] = useState<ChristmasMiniGameId>('village');
  const [useFallback2D, setUseFallback2D] = useState(false);
  const [isFullscreen, setIsFullscreen] = useState(false);
  const [dockCollapsed, setDockCollapsed] = useState(false);

  // Audio state
  const musicUserPausedRef = useRef(false);
  const [isMusicOn, setIsMusicOn] = useState(() => sound.isChristmasBgmActive());
  const [musicVolume, setMusicVolume] = useState(() => sound.getChristmasMusicVolume());
  const [isSfxMuted, setIsSfxMuted] = useState(() => sound.getMuted());

  // Random picker state
  const [pickCount, setPickCount] = useState(1);
  const [isPicking, setIsPicking] = useState(false);
  const [selectedStudents, setSelectedStudents] = useState<Student[]>([]);
  const [isGiftOpened, setIsGiftOpened] = useState(false);
  const [sleighPassKey, setSleighPassKey] = useState(0);

  // Game 4: Mystery Gift state + Challenge CRUD
  const [challenges, setChallenges] = useState<ChristmasChallenge[]>(() => loadChristmasChallenges());
  const [openedMysteryBox, setOpenedMysteryBox] = useState<number | null>(null);
  const [activeChallenge, setActiveChallenge] = useState<ChristmasChallenge | null>(null);
  const [showChallengeModal, setShowChallengeModal] = useState(false);
  const [newChallengeText, setNewChallengeText] = useState('');
  const [editingChallengeId, setEditingChallengeId] = useState<string | null>(null);
  const [editingChallengeText, setEditingChallengeText] = useState('');

  // Game 5: Star Rewards state (never auto-awards stars!)
  const [starsMap, setStarsMap] = useState<Record<string, number>>(() => loadChristmasStars());
  const [pendingRewardStudents, setPendingRewardStudents] = useState<Student[]>([]);
  const [starBurstKey, setStarBurstKey] = useState(0);
  const [rewardBanner, setRewardBanner] = useState<string | null>(null);

  // Continuous CSS snowfall overlay particles with randomized sizes & natural speeds
  const overlaySnowflakes = useMemo(() => {
    const glyphs = ['❄', '❅', '❆'];
    return Array.from({ length: 48 }, (_, idx) => {
      const isCrystal = idx % 3 === 0;
      const size = isCrystal
        ? 12 + Math.floor(Math.random() * 14) // 12px - 25px crystal flakes
        : 4 + Math.floor(Math.random() * 7); // 4px - 10px soft snow orbs
      return {
        id: idx,
        isCrystal,
        glyph: glyphs[idx % glyphs.length],
        size,
        left: `${(Math.random() * 98 + 1).toFixed(2)}%`,
        duration: `${(7.5 + Math.random() * 8.5).toFixed(2)}s`,
        delay: `${-(Math.random() * 15).toFixed(2)}s`,
        opacity: Number((0.42 + Math.random() * 0.5).toFixed(2)),
      };
    });
  }, []);

  // Persist challenges & stars
  useEffect(() => {
    localStorage.setItem(CHRISTMAS_CHALLENGES_STORAGE_KEY, JSON.stringify(challenges));
  }, [challenges]);

  useEffect(() => {
    localStorage.setItem(CHRISTMAS_STARS_STORAGE_KEY, JSON.stringify(starsMap));
  }, [starsMap]);

  // Auto-start Christmas medley BGM on mount if not muted
  useEffect(() => {
    if (!sound.getMuted() && !sound.isChristmasBgmActive() && !musicUserPausedRef.current) {
      sound.startChristmasBGM();
    }
    setIsMusicOn(sound.isChristmasBgmActive());

    return () => {
      if (pickTimerRef.current) {
        window.clearTimeout(pickTimerRef.current);
      }
      sound.stopChristmasBGM();
    };
  }, []);

  // Track fullscreen changes
  useEffect(() => {
    const onFsChange = () => {
      setIsFullscreen(Boolean(document.fullscreenElement));
    };
    document.addEventListener('fullscreenchange', onFsChange);
    return () => document.removeEventListener('fullscreenchange', onFsChange);
  }, []);

  const uncalledStudents = useMemo(() => students.filter((s) => !s.called), [students]);
  const calledCount = students.length - uncalledStudents.length;

  const handleToggleFullscreen = () => {
    if (!document.fullscreenElement) {
      (rootRef.current || document.documentElement)
        .requestFullscreen()
        .catch(() => {});
    } else {
      document.exitFullscreen().catch(() => {});
    }
  };

  const handleToggleMusic = () => {
    if (isSfxMuted) {
      sound.setMuted(false);
      setIsSfxMuted(false);
    }
    const active = sound.toggleChristmasBGM();
    musicUserPausedRef.current = !active;
    setIsMusicOn(active);
  };

  const handleVolumeChange = (val: number) => {
    setMusicVolume(val);
    sound.setChristmasMusicVolume(val);
  };

  const handleToggleSfx = () => {
    const next = !isSfxMuted;
    sound.setMuted(next);
    setIsSfxMuted(next);
    if (next) setIsMusicOn(false);
  };

  const handleExitHome = () => {
    if (pickTimerRef.current) {
      window.clearTimeout(pickTimerRef.current);
      pickTimerRef.current = null;
    }
    sound.stopChristmasBGM();
    setIsMusicOn(false);
    if (document.fullscreenElement) {
      document.exitFullscreen().catch(() => {});
    }
    onBackToHome();
  };

  const speakSelectedNames = useCallback(
    (chosen: Student[]) => {
      if (!enableTTS || chosen.length === 0) return;
      if (chosen.length === 1) {
        sound.speakVirtualMC(
          formatStudentCallSpeech(chosen[0].name, onlySpeakName),
          voiceURI,
          voiceRate,
          voicePitch
        );
      } else {
        sound.speakVirtualMC(
          formatMultiStudentCallSpeech(
            chosen.map((s) => s.name),
            onlySpeakName
          ),
          voiceURI,
          voiceRate,
          voicePitch
        );
      }
    },
    [enableTTS, onlySpeakName, voiceURI, voiceRate, voicePitch]
  );

  // Core random picker shared across Christmas mini-games (uses live classroom roster!)
  const startChristmasPick = useCallback(
    (targetMiniGame: ChristmasMiniGameId = miniGame) => {
      if (isPicking) return;
      if (students.length === 0) {
        onOpenStudentManager();
        return;
      }

      let pool = callMode === 'no_repeat' ? [...uncalledStudents] : [...students];
      if (pool.length === 0) {
        onResetRound();
        pool = students.map((s) => ({ ...s, called: false }));
        sound.playSparkle();
      }

      const count = Math.max(1, Math.min(pickCount, pool.length));
      const shuffled = [...pool].sort(() => Math.random() - 0.5);
      const chosen = shuffled.slice(0, count);

      // Ensure Christmas BGM plays on interaction unless user manually paused it
      if (!musicUserPausedRef.current && !sound.getMuted() && !sound.isChristmasBgmActive()) {
        sound.startChristmasBGM();
        setIsMusicOn(sound.isChristmasBgmActive());
      }

      setIsPicking(true);
      setSelectedStudents([]);
      setIsGiftOpened(false);
      setOpenedMysteryBox(null);
      setActiveChallenge(null);
      setRewardBanner(null);
      setSleighPassKey((k) => k + 1);

      // Gentle sleigh-bell take-off shimmer & chime ticks
      sound.playChristmasSleighFly();

      // Synchronized 3.6s sleigh fly-past across ALL Christmas mini-games
      const spinDuration = 3600;
      if (pickTimerRef.current) window.clearTimeout(pickTimerRef.current);

      pickTimerRef.current = window.setTimeout(() => {
        setIsPicking(false);
        setSelectedStudents(chosen);
        setPendingRewardStudents(chosen);
        if (targetMiniGame === 'santa_gift') {
          setIsGiftOpened(true);
        }

        // Sound + Confetti celebration
        sound.playChristmasBell();
        launchMiniConfettiBurst(window.innerWidth / 2, window.innerHeight * 0.42);
        speakSelectedNames(chosen);

        const gameLabel =
          MINI_GAMES.find((m) => m.id === targetMiniGame)?.label || 'Christmas Magic';
        onMarkCalled(chosen, `🎄 ${gameLabel}`);
      }, spinDuration);
    },
    [
      isPicking,
      miniGame,
      students,
      callMode,
      uncalledStudents,
      pickCount,
      onOpenStudentManager,
      onResetRound,
      onMarkCalled,
      speakSelectedNames,
    ]
  );

  // Game 4: Student picks 1 of 3 Mystery Gift Boxes
  const handlePickMysteryBox = (boxIdx: number) => {
    if (challenges.length === 0) {
      setShowChallengeModal(true);
      return;
    }
    const randomChallenge = challenges[Math.floor(Math.random() * challenges.length)];
    setOpenedMysteryBox(boxIdx);
    setActiveChallenge(randomChallenge);
    sound.playChristmasBell();
    launchMiniConfettiBurst(window.innerWidth / 2, window.innerHeight * 0.48);
  };

  // Game 5: Teacher explicitly confirms challenge completion to award +1 star
  const handleConfirmStarReward = () => {
    if (pendingRewardStudents.length === 0) return;
    setStarsMap((prev) => {
      const next = { ...prev };
      pendingRewardStudents.forEach((st) => {
        next[st.id] = (next[st.id] || 0) + 1;
      });
      return next;
    });
    setStarBurstKey((k) => k + 1);
    sound.playChristmasStarReward();
    launchMiniConfettiBurst(window.innerWidth / 2, window.innerHeight * 0.45);
    const names = pendingRewardStudents.map((s) => s.name).join(', ');
    setRewardBanner(`⭐ Đã cộng +1 sao cho ${names}!`);
    setPendingRewardStudents([]);
  };

  const handleSkipReward = () => {
    setPendingRewardStudents([]);
    setRewardBanner('Đã bỏ qua lượt thưởng sao.');
  };

  const adjustStudentStars = (studentId: string, delta: number) => {
    setStarsMap((prev) => {
      const current = prev[studentId] || 0;
      return { ...prev, [studentId]: Math.max(0, current + delta) };
    });
    if (delta > 0) {
      sound.playChristmasStarReward();
      setStarBurstKey((k) => k + 1);
    } else {
      sound.playSpinTick(0.8);
    }
  };

  // Challenge CRUD handlers
  const handleAddChallenge = () => {
    const trimmed = newChallengeText.trim();
    if (!trimmed) return;
    setChallenges((prev) => [
      ...prev,
      { id: `xmas_c_${Date.now()}_${Math.random().toString(36).slice(2, 5)}`, text: trimmed },
    ]);
    setNewChallengeText('');
    sound.playSparkle();
  };

  const handleSaveEditChallenge = () => {
    if (!editingChallengeId) return;
    const trimmed = editingChallengeText.trim();
    if (!trimmed) return;
    setChallenges((prev) =>
      prev.map((c) => (c.id === editingChallengeId ? { ...c, text: trimmed } : c))
    );
    setEditingChallengeId(null);
    setEditingChallengeText('');
    sound.playSpinTick(1.1);
  };

  const handleDeleteChallenge = (id: string) => {
    setChallenges((prev) => prev.filter((c) => c.id !== id));
    sound.playSpinTick(0.85);
  };

  const leaderboard = useMemo(() => {
    return [...students]
      .map((s) => ({
        student: s,
        stars: starsMap[s.id] || 0,
      }))
      .sort((a, b) => {
        if (b.stars !== a.stars) return b.stars - a.stars;
        if (b.student.callCount !== a.student.callCount) {
          return b.student.callCount - a.student.callCount;
        }
        return a.student.name.localeCompare(b.student.name, 'vi');
      });
  }, [students, starsMap]);

  const handleSwitchMiniGame = (nextGame: ChristmasMiniGameId) => {
    setMiniGame(nextGame);
    if (nextGame === 'village' || nextGame === 'tree' || nextGame === 'santa_gift') {
      setSelectedStudents([]);
      setSleighPassKey(0);
    }
    if (nextGame !== 'santa_gift') {
      setIsGiftOpened(false);
    }
    sound.playSpinTick(1.15);
  };

  return (
    <div
      ref={rootRef}
      className="fixed inset-0 z-40 overflow-hidden bg-[#09152e] text-white flex flex-col select-none"
    >
      {/* Background 3D WebGL Scene or CSS Parallax Fallback */}
      {useFallback2D ? (
        <ChristmasFallbackScene
          miniGame={miniGame}
          students={students}
          isPicking={isPicking}
          selectedStudents={selectedStudents}
          isGiftOpened={isGiftOpened}
          starBurstKey={starBurstKey}
        />
      ) : (
        <ChristmasScene3D
          miniGame={miniGame}
          students={students}
          isPicking={isPicking}
          selectedStudents={selectedStudents}
          isGiftOpened={isGiftOpened}
          starBurstKey={starBurstKey}
          onWebGLUnavailable={() => setUseFallback2D(true)}
        />
      )}

      {/* Flying Santa & Reindeer Transparent PNG:
          - On START / OPEN GIFT / PICK across ALL mini-games: glides smoothly across the top sky in 3.6s,
            and ONLY when the sleigh finishes flying past does the chosen student's name appear!
          - When idle in Mystery Gift / Star Rewards: softly cruises as an ambient holiday backdrop. */}
      {isPicking && sleighPassKey > 0 ? (
        <div
          key={`sleigh-pass-${sleighPassKey}`}
          aria-hidden="true"
          className="absolute top-14 sm:top-16 left-0 z-[18] pointer-events-none animate-xmas-santa-pass will-change-transform select-none"
        >
          <img
            src={santaSleighReindeerImg}
            alt="Santa Claus flying on a sleigh pulled by reindeer"
            referrerPolicy="no-referrer"
            className="w-56 sm:w-72 md:w-84 h-auto object-contain drop-shadow-[0_12px_22px_rgba(253,224,71,0.42)]"
          />
        </div>
      ) : (
        (miniGame === 'mystery_gift' || miniGame === 'star_rewards') && (
          <div
            aria-hidden="true"
            className="absolute top-14 left-0 z-[12] pointer-events-none animate-xmas-santa will-change-transform select-none opacity-85"
          >
            <img
              src={santaSleighReindeerImg}
              alt="Santa Claus flying on a sleigh pulled by reindeer"
              referrerPolicy="no-referrer"
              className="w-48 sm:w-64 md:w-72 h-auto object-contain drop-shadow-[0_10px_18px_rgba(0,0,0,0.5)]"
            />
          </div>
        )
      )}

      {/* CSS Snowfall Overlay Layer (uses existing xmasSnowFall keyframes) */}
      <div
        aria-hidden="true"
        className="absolute inset-0 z-[15] pointer-events-none overflow-hidden"
      >
        {overlaySnowflakes.map((flake) =>
          flake.isCrystal ? (
            <span
              key={flake.id}
              style={{
                left: flake.left,
                top: 0,
                fontSize: `${flake.size}px`,
                lineHeight: 1,
                opacity: flake.opacity,
                animationDuration: flake.duration,
                animationDelay: flake.delay,
              }}
              className="absolute text-white/95 drop-shadow-[0_0_6px_rgba(255,255,255,0.85)] animate-xmas-snow will-change-transform"
            >
              {flake.glyph}
            </span>
          ) : (
            <span
              key={flake.id}
              style={{
                left: flake.left,
                top: 0,
                width: `${flake.size}px`,
                height: `${flake.size}px`,
                opacity: flake.opacity,
                animationDuration: flake.duration,
                animationDelay: flake.delay,
              }}
              className="absolute rounded-full bg-white shadow-[0_0_8px_rgba(255,255,255,0.9)] animate-xmas-snow will-change-transform"
            />
          )
        )}
      </div>

      {/* TOP HUD BAR (Zero backdrop-blur for smooth WebGL performance) */}
      <header className="relative z-20 w-full px-3 sm:px-5 pt-3 flex flex-wrap items-center justify-between gap-2 pointer-events-none">
        <div className="flex items-center gap-2 pointer-events-auto">
          <button
            onClick={handleExitHome}
            className="flex items-center gap-1.5 px-3.5 py-2 rounded-xl bg-rose-700 hover:bg-rose-600 border border-rose-400/60 text-white font-black text-xs shadow-lg transition-all active:scale-95"
          >
            <Home className="w-4 h-4" />
            <span>BACK TO HOME</span>
          </button>

          <div className="hidden md:flex items-center gap-2 px-3.5 py-2 rounded-xl bg-[#0b1733]/92 border border-amber-300/35 shadow-lg">
            <span className="text-base">🎄</span>
            <div>
              <p className="text-xs font-black tracking-wide text-amber-200 leading-none">
                CHRISTMAS MAGIC
              </p>
              <p className="text-[10px] font-semibold text-sky-200/80 mt-0.5">
                {activeClassName} · {students.length} HS ({uncalledStudents.length} chưa gọi)
              </p>
            </div>
          </div>
        </div>

        {/* Audio, Roster, Scene Mode & Fullscreen Controls */}
        <div className="flex items-center gap-1.5 sm:gap-2 pointer-events-auto flex-wrap">
          {/* Christmas BGM Toggle + Volume */}
          <div className="flex items-center gap-1.5 px-2.5 py-1.5 rounded-xl bg-[#0b1733]/92 border border-slate-600/60 shadow-lg">
            <button
              onClick={handleToggleMusic}
              className={`flex items-center gap-1 px-2 py-1 rounded-lg text-xs font-bold transition-colors ${
                isMusicOn
                  ? 'bg-emerald-600 text-white'
                  : 'bg-slate-800 text-slate-200 hover:bg-slate-700'
              }`}
              title={isMusicOn ? 'Tắt nhạc Noel' : 'Bật nhạc nền Noel'}
            >
              <Music className="w-3.5 h-3.5" />
              <span className="hidden sm:inline">{isMusicOn ? 'Nhạc: BẬT' : 'Nhạc Noel'}</span>
            </button>
            <input
              type="range"
              min={0}
              max={1}
              step={0.05}
              value={musicVolume}
              onChange={(e) => handleVolumeChange(parseFloat(e.target.value))}
              aria-label="Âm lượng nhạc Noel"
              className="w-14 sm:w-20 accent-amber-400 cursor-pointer"
            />
          </div>

          {/* SFX Mute */}
          <button
            onClick={handleToggleSfx}
            className={`p-2 rounded-xl border shadow-lg transition-colors ${
              isSfxMuted
                ? 'bg-rose-900/95 border-rose-400 text-rose-100'
                : 'bg-[#0b1733]/92 border-slate-600/60 text-slate-100 hover:border-amber-300'
            }`}
            title={isSfxMuted ? 'Bật hiệu ứng âm thanh' : 'Tắt âm thanh'}
          >
            {isSfxMuted ? <VolumeX className="w-4 h-4" /> : <Volume2 className="w-4 h-4" />}
          </button>

          {/* Manage Roster / Switch Class */}
          <button
            onClick={onOpenStudentManager}
            className="flex items-center gap-1.5 px-3 py-2 rounded-xl bg-indigo-700 hover:bg-indigo-600 border border-indigo-400/50 text-xs font-bold shadow-lg"
            title="Chỉnh sửa danh sách học sinh hoặc đổi lớp"
          >
            <Users className="w-4 h-4" />
            <span className="hidden sm:inline">Lớp ({students.length})</span>
          </button>

          {/* 3D / 2D Fallback Toggle */}
          <button
            onClick={() => setUseFallback2D((v) => !v)}
            className="px-2.5 py-2 rounded-xl bg-[#0b1733]/92 hover:bg-slate-800 border border-slate-600/60 text-[11px] font-bold text-sky-200 shadow-lg"
            title="Chuyển đổi cảnh 3D WebGL hoặc 2D Parallax"
          >
            {useFallback2D ? '2D CSS' : '3D WebGL'}
          </button>

          {/* Fullscreen */}
          <button
            onClick={handleToggleFullscreen}
            className="flex items-center gap-1 px-2.5 py-2 rounded-xl bg-[#0b1733]/92 hover:bg-slate-800 border border-slate-600/60 text-xs font-bold shadow-lg"
            title="Toàn màn hình"
          >
            {isFullscreen ? <Minimize className="w-4 h-4" /> : <Maximize className="w-4 h-4" />}
            <span className="hidden lg:inline">FULL SCREEN</span>
          </button>
        </div>
      </header>

      {/* CENTER OVERLAY LAYER (Displays Winner Spotlight / Game 4 Mystery / Game 5 Leaderboard) */}
      <main className="relative z-10 flex-1 flex flex-col items-center justify-between px-4 py-2 pointer-events-none overflow-hidden">
        {/* Top Floating Winner Spotlight Banner for Games 1, 2, 3 */}
        {(miniGame === 'village' || miniGame === 'tree' || miniGame === 'santa_gift') && (
          <div className="w-full max-w-2xl flex flex-col items-center mt-1 pointer-events-auto">
            {isPicking ? (
              <div className="px-6 py-3 rounded-2xl bg-[#0b1733]/95 border-2 border-amber-300 shadow-2xl flex items-center gap-3">
                <Sparkles className="w-5 h-5 text-amber-300 animate-spin" />
                <span className="text-base sm:text-xl font-black text-amber-100 tracking-wide">
                  {miniGame === 'santa_gift'
                    ? '🛷🎁 Ông già Noel đang bay qua & mở hộp quà... Chờ đón tên nhé!'
                    : miniGame === 'tree'
                    ? '🛷🎄 Ông già Noel đang bay qua cây thông... Chờ đón tên nhé!'
                    : '🛷🎅 Ông già Noel & tuần lộc đang bay qua làng... Chờ đón tên nhé!'}
                </span>
              </div>
            ) : selectedStudents.length > 0 ? (
              <div className="w-full max-w-xl px-5 py-3.5 rounded-3xl bg-[#0b1733]/95 border-2 border-amber-300 shadow-[0_12px_45px_rgba(0,0,0,0.65)] text-center animate-fade-in">
                <p className="text-[11px] font-black uppercase tracking-widest text-amber-300 mb-1">
                  {miniGame === 'santa_gift' && isGiftOpened
                    ? '🎁 QUÀ TẶNG TỪ ÔNG GIÁ NOEL 🎁'
                    : '✨ CHRISTMAS LUCKY STUDENT ✨'}
                </p>
                <div className="flex flex-wrap items-center justify-center gap-2">
                  {selectedStudents.map((st) => (
                    <span
                      key={st.id}
                      className="px-4 py-1.5 rounded-2xl bg-gradient-to-r from-rose-600 to-red-700 border border-amber-300 text-2xl sm:text-3xl font-black text-yellow-100 shadow-lg"
                    >
                      {st.name}
                    </span>
                  ))}
                </div>
                <div className="mt-2.5 flex flex-wrap items-center justify-center gap-2">
                  <button
                    onClick={() => handleSwitchMiniGame('mystery_gift')}
                    className="px-3.5 py-1.5 rounded-xl bg-amber-400 hover:bg-amber-300 text-slate-950 font-black text-xs flex items-center gap-1.5 shadow-md transition-transform active:scale-95"
                  >
                    <Gift className="w-3.5 h-3.5" />
                    <span>Mở Hộp Quà Thử Thách (Game 4)</span>
                  </button>
                  <button
                    onClick={() => handleSwitchMiniGame('star_rewards')}
                    className="px-3.5 py-1.5 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-white font-black text-xs flex items-center gap-1.5 shadow-md transition-transform active:scale-95"
                  >
                    <Star className="w-3.5 h-3.5" />
                    <span>Chấm Sao Thưởng (Game 5)</span>
                  </button>
                </div>
              </div>
            ) : (
              <div className="px-4 py-2 rounded-2xl bg-[#0b1733]/88 border border-sky-300/35 text-xs sm:text-sm font-bold text-sky-100 shadow-lg">
                {miniGame === 'village' &&
                  '🏘️ Nhấn START — khi xe trượt tuyết Ông già Noel bay qua, tên bạn may mắn sẽ xuất hiện!'}
                {miniGame === 'tree' &&
                  '🎄 Nhấn START — khi xe trượt tuyết bay qua cây thông, quả châu & tên bạn may mắn sẽ phát sáng!'}
                {miniGame === 'santa_gift' &&
                  '🎁 Nhấn OPEN GIFT — khi xe trượt tuyết Ông già Noel bay qua, hộp quà sẽ mở & hiện tên!'}
              </div>
            )}
          </div>
        )}

        {/* GAME 4: MYSTERY CHRISTMAS GIFT OVERLAY */}
        {miniGame === 'mystery_gift' && (
          <div className="w-full max-w-4xl my-auto p-4 sm:p-6 rounded-3xl bg-[#0b1733]/94 border-2 border-amber-300/60 shadow-[0_24px_64px_rgba(0,0,0,0.72)] pointer-events-auto animate-fade-in">
            <div className="flex flex-wrap items-center justify-between gap-2 mb-4">
              <div>
                <h2 className="text-lg sm:text-2xl font-black text-amber-200 flex items-center gap-2">
                  <span>🪄 MYSTERY CHRISTMAS GIFT</span>
                </h2>
                <p className="text-xs sm:text-sm text-sky-200 font-semibold mt-0.5">
                  {selectedStudents.length > 0 ? (
                    <>
                      Học sinh được chọn:{' '}
                      <span className="text-yellow-300 font-black">
                        {selectedStudents.map((s) => s.name).join(', ')}
                      </span>{' '}
                      — Hãy chọn 1 trong 3 hộp quà bí ẩn!
                    </>
                  ) : (
                    'Chọn học sinh trước hoặc nhấn PICK STUDENT, sau đó chọn 1 hộp quà bí ẩn!'
                  )}
                </p>
              </div>
              <div className="flex items-center gap-2">
                <button
                  onClick={() => startChristmasPick('mystery_gift')}
                  disabled={isPicking}
                  className="px-3 py-2 rounded-xl bg-rose-600 hover:bg-rose-500 text-white font-black text-xs flex items-center gap-1.5 shadow-md"
                >
                  <Play className="w-3.5 h-3.5 fill-white" />
                  <span>PICK STUDENT</span>
                </button>
                <button
                  onClick={() => setShowChallengeModal(true)}
                  className="px-3 py-2 rounded-xl bg-slate-800 hover:bg-slate-700 border border-slate-500 text-amber-200 font-bold text-xs flex items-center gap-1.5"
                >
                  <Edit3 className="w-3.5 h-3.5" />
                  <span>Sửa thử thách ({challenges.length})</span>
                </button>
              </div>
            </div>

            {/* 3 Mystery Gift Boxes */}
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 sm:gap-4 my-3">
              {[0, 1, 2].map((boxIdx) => {
                const isThisOpened = openedMysteryBox === boxIdx;
                const boxColors = [
                  'from-rose-600 to-red-800 border-amber-300',
                  'from-emerald-600 to-green-800 border-amber-300',
                  'from-indigo-600 to-blue-800 border-amber-300',
                ];
                return (
                  <button
                    key={boxIdx}
                    onClick={() => handlePickMysteryBox(boxIdx)}
                    className={`group relative p-5 rounded-2xl bg-gradient-to-br ${boxColors[boxIdx]} border-2 shadow-xl transition-all duration-300 flex flex-col items-center justify-center gap-2 ${
                      isThisOpened
                        ? 'scale-105 ring-4 ring-yellow-300 shadow-[0_0_36px_rgba(253,224,71,0.55)]'
                        : 'hover:-translate-y-1.5 hover:scale-[1.03]'
                    }`}
                  >
                    <span className="text-5xl sm:text-6xl transition-transform group-hover:scale-110">
                      {isThisOpened ? '✨' : '🎁'}
                    </span>
                    <span className="text-sm sm:text-base font-black text-amber-100">
                      Hộp Quà Bí Ẩn #{boxIdx + 1}
                    </span>
                    <span className="text-[11px] font-semibold text-white/85">
                      {isThisOpened ? 'Đã mở!' : 'Bấm để mở thử thách'}
                    </span>
                  </button>
                );
              })}
            </div>

            {/* Revealed Challenge Card */}
            {activeChallenge && (
              <div className="mt-4 p-4 sm:p-5 rounded-2xl bg-slate-900 border-2 border-amber-300 text-center animate-fade-in">
                <p className="text-[11px] font-black uppercase tracking-widest text-amber-300 mb-1">
                  🎯 ENGLISH CHRISTMAS CHALLENGE
                </p>
                <p className="text-xl sm:text-3xl font-black text-white leading-snug">
                  {activeChallenge.text}
                </p>
                <div className="mt-4 flex flex-wrap items-center justify-center gap-2.5">
                  <button
                    onClick={() => handlePickMysteryBox(openedMysteryBox ?? 0)}
                    className="px-4 py-2 rounded-xl bg-slate-800 hover:bg-slate-700 border border-slate-600 text-xs font-bold text-slate-100"
                  >
                    🔄 Đổi câu thử thách khác
                  </button>
                  <button
                    onClick={() => handleSwitchMiniGame('star_rewards')}
                    className="px-4 py-2 rounded-xl bg-amber-400 hover:bg-amber-300 text-slate-950 font-black text-xs flex items-center gap-1.5 shadow-lg"
                  >
                    <Star className="w-4 h-4 fill-slate-950" />
                    <span>Chấm kết quả & Nhận sao (Game 5)</span>
                  </button>
                </div>
              </div>
            )}
          </div>
        )}

        {/* GAME 5: CHRISTMAS STAR REWARDS & LEADERBOARD */}
        {miniGame === 'star_rewards' && (
          <div className="w-full max-w-4xl my-auto p-4 sm:p-5 rounded-3xl bg-[#0b1733]/94 border-2 border-amber-300/60 shadow-[0_24px_64px_rgba(0,0,0,0.72)] pointer-events-auto animate-fade-in flex flex-col max-h-[68vh]">
            <div className="flex flex-wrap items-center justify-between gap-2 mb-3">
              <div>
                <h2 className="text-lg sm:text-2xl font-black text-amber-200 flex items-center gap-2">
                  <Trophy className="w-6 h-6 text-amber-300" />
                  <span>CHRISTMAS STAR REWARDS</span>
                </h2>
                <p className="text-xs text-sky-200 font-semibold">
                  Chỉ cộng sao khi giáo viên xác nhận học sinh hoàn thành nhiệm vụ.
                </p>
              </div>
              <button
                onClick={() => {
                  setStarsMap({});
                  setRewardBanner('Đã đặt lại toàn bộ số sao.');
                }}
                className="px-3 py-1.5 rounded-xl bg-slate-800 hover:bg-slate-700 border border-slate-600 text-xs font-bold text-slate-200"
              >
                Đặt lại bảng sao
              </button>
            </div>

            {/* Pending Teacher Confirmation Panel (Never auto-awards!) */}
            {pendingRewardStudents.length > 0 ? (
              <div className="p-3.5 rounded-2xl bg-slate-900 border-2 border-amber-300 mb-3 flex flex-wrap items-center justify-between gap-3">
                <div>
                  <p className="text-[11px] font-black uppercase tracking-wider text-amber-300">
                    Chờ giáo viên xác nhận kết quả
                  </p>
                  <p className="text-base sm:text-xl font-black text-white">
                    {pendingRewardStudents.map((s) => s.name).join(', ')}
                  </p>
                </div>
                <div className="flex flex-wrap items-center gap-2">
                  <button
                    onClick={handleConfirmStarReward}
                    className="px-4 py-2 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-white font-black text-xs flex items-center gap-1.5 shadow-lg"
                  >
                    <CheckCircle2 className="w-4 h-4" />
                    <span>Xác nhận hoàn thành (+1 ⭐)</span>
                  </button>
                  <button
                    onClick={handleSkipReward}
                    className="px-3 py-2 rounded-xl bg-slate-700 hover:bg-slate-600 text-white font-bold text-xs flex items-center gap-1"
                  >
                    <SkipForward className="w-3.5 h-3.5" />
                    <span>Bỏ qua</span>
                  </button>
                  <button
                    onClick={() => startChristmasPick('star_rewards')}
                    disabled={isPicking}
                    className="px-3 py-2 rounded-xl bg-rose-600 hover:bg-rose-500 text-white font-bold text-xs flex items-center gap-1"
                  >
                    <RotateCcw className="w-3.5 h-3.5" />
                    <span>Chọn lại</span>
                  </button>
                </div>
              </div>
            ) : (
              <div className="mb-3 px-3.5 py-2.5 rounded-xl bg-slate-900/90 border border-slate-700 flex flex-wrap items-center justify-between gap-2 text-xs">
                <span className="text-amber-200 font-bold">
                  {rewardBanner ||
                    'Bạn có thể cộng/trừ sao thủ công cho từng học sinh bên dưới hoặc chọn bạn mới.'}
                </span>
                <button
                  onClick={() => startChristmasPick('village')}
                  className="px-3 py-1.5 rounded-lg bg-rose-600 hover:bg-rose-500 text-white font-black text-xs"
                >
                  🎲 Quay học sinh mới
                </button>
              </div>
            )}

            {/* Live Student Leaderboard */}
            <div className="flex-1 overflow-y-auto pr-1 space-y-1.5">
              {leaderboard.map(({ student, stars }, idx) => (
                <div
                  key={student.id}
                  className={`flex items-center justify-between gap-2 px-3 py-2 rounded-xl border ${
                    idx === 0 && stars > 0
                      ? 'bg-amber-950/75 border-amber-400'
                      : 'bg-slate-900/90 border-slate-700/80'
                  }`}
                >
                  <div className="flex items-center gap-2.5 min-w-0">
                    <span
                      className={`w-7 h-7 rounded-lg flex items-center justify-center font-black text-xs shrink-0 ${
                        idx === 0
                          ? 'bg-amber-400 text-slate-950'
                          : idx === 1
                          ? 'bg-slate-300 text-slate-950'
                          : idx === 2
                          ? 'bg-orange-400 text-slate-950'
                          : 'bg-slate-800 text-slate-300'
                      }`}
                    >
                      {idx + 1}
                    </span>
                    <div className="min-w-0">
                      <p className="text-sm font-extrabold text-white truncate">{student.name}</p>
                      <p className="text-[10px] text-slate-400 font-semibold">
                        Đã gọi: {student.callCount} lần
                      </p>
                    </div>
                  </div>

                  <div className="flex items-center gap-2 shrink-0">
                    <div className="flex items-center gap-1 px-2.5 py-1 rounded-lg bg-slate-800 border border-amber-400/40">
                      <Star className="w-4 h-4 text-amber-300 fill-amber-300" />
                      <span className="text-sm font-black text-amber-200 tabular-nums">
                        {stars}
                      </span>
                    </div>
                    <button
                      onClick={() => adjustStudentStars(student.id, -1)}
                      disabled={stars === 0}
                      className="w-7 h-7 rounded-lg bg-slate-800 hover:bg-slate-700 disabled:opacity-35 text-slate-200 font-black text-sm"
                      title="Trừ 1 sao"
                    >
                      -
                    </button>
                    <button
                      onClick={() => adjustStudentStars(student.id, 1)}
                      className="px-2.5 h-7 rounded-lg bg-amber-400 hover:bg-amber-300 text-slate-950 font-black text-xs flex items-center gap-1"
                      title="Cộng thủ công +1 sao"
                    >
                      <Award className="w-3.5 h-3.5" />
                      <span>+1 ⭐</span>
                    </button>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}

        <div />
      </main>

      {/* COLLAPSIBLE BOTTOM CONTROL DOCK */}
      <footer className="relative z-20 w-full px-3 sm:px-5 pb-3 flex flex-col items-center pointer-events-none">
        <button
          onClick={() => setDockCollapsed((c) => !c)}
          className="pointer-events-auto mb-1.5 px-3 py-1 rounded-t-xl bg-[#0b1733]/92 border border-b-0 border-slate-600/60 text-[11px] font-bold text-sky-200 flex items-center gap-1 hover:text-white"
        >
          {dockCollapsed ? (
            <>
              <ChevronUp className="w-3.5 h-3.5" />
              <span>Hiện bảng điều khiển Noel</span>
            </>
          ) : (
            <>
              <ChevronDown className="w-3.5 h-3.5" />
              <span>Thu gọn bảng điều khiển</span>
            </>
          )}
        </button>

        {!dockCollapsed && (
          <div className="pointer-events-auto w-full max-w-5xl p-2.5 sm:p-3 rounded-2xl bg-[#0b1733]/95 border border-amber-300/40 shadow-[0_12px_40px_rgba(0,0,0,0.7)] flex flex-col gap-2.5">
            {/* Row 1: 5 Christmas Mini-Game Tabs */}
            <div className="flex flex-wrap items-center justify-center gap-1.5">
              {MINI_GAMES.map((mg) => {
                const active = miniGame === mg.id;
                return (
                  <button
                    key={mg.id}
                    onClick={() => handleSwitchMiniGame(mg.id)}
                    className={`px-3 py-1.5 rounded-xl text-xs font-extrabold flex items-center gap-1.5 transition-all ${
                      active
                        ? 'bg-gradient-to-r from-rose-600 to-red-700 text-yellow-100 border border-amber-300 shadow-md scale-[1.03]'
                        : 'bg-slate-800/90 hover:bg-slate-700 text-slate-200 border border-slate-700'
                    }`}
                  >
                    <span>{mg.icon}</span>
                    <span className="hidden sm:inline">{mg.label}</span>
                    <span className="sm:hidden">{mg.shortLabel}</span>
                  </button>
                );
              })}
            </div>

            {/* Row 2: Main Action CTA + Pick Count + No-Repeat + Reset */}
            <div className="flex flex-wrap items-center justify-between gap-2 pt-1 border-t border-slate-700/70">
              {/* Left: Pick Count & No-repeat Rule */}
              <div className="flex flex-wrap items-center gap-2 text-xs">
                <div className="flex items-center gap-1 bg-slate-900 px-2 py-1 rounded-xl border border-slate-700">
                  <span className="text-slate-300 font-bold">Số HS:</span>
                  {[1, 2, 3, 4, 5].map((num) => (
                    <button
                      key={num}
                      onClick={() => setPickCount(num)}
                      disabled={isPicking}
                      className={`w-6 h-6 rounded-lg font-black transition-colors ${
                        pickCount === num
                          ? 'bg-amber-400 text-slate-950'
                          : 'text-slate-300 hover:bg-slate-800'
                      }`}
                    >
                      {num}
                    </button>
                  ))}
                </div>

                <button
                  onClick={onToggleCallMode}
                  className={`px-2.5 py-1.5 rounded-xl font-bold border transition-colors ${
                    callMode === 'no_repeat'
                      ? 'bg-emerald-700 border-emerald-400 text-white'
                      : 'bg-slate-800 border-slate-600 text-slate-200'
                  }`}
                >
                  {callMode === 'no_repeat' ? 'Không lặp tên' : 'Cho phép trùng'}
                </button>
              </div>

              {/* Center: Primary START / OPEN GIFT / PICK AGAIN CTA */}
              <div className="flex items-center gap-2">
                <button
                  onClick={() => startChristmasPick(miniGame)}
                  disabled={isPicking}
                  className={`px-6 py-2.5 rounded-2xl font-black text-sm sm:text-base tracking-wide text-white shadow-xl flex items-center gap-2 transition-all active:scale-95 ${
                    isPicking
                      ? 'bg-amber-600 cursor-wait'
                      : 'bg-gradient-to-r from-emerald-600 via-green-600 to-emerald-500 hover:from-emerald-500 hover:to-green-400 ring-2 ring-amber-300/70'
                  }`}
                >
                  {miniGame === 'santa_gift' ? (
                    <>
                      <Gift className="w-5 h-5" />
                      <span>{isPicking ? 'OPENING...' : 'OPEN GIFT'}</span>
                    </>
                  ) : (
                    <>
                      <Play className="w-4 h-4 fill-white" />
                      <span>
                        {isPicking
                          ? 'PICKING...'
                          : selectedStudents.length > 0
                          ? 'PICK AGAIN'
                          : 'START'}
                      </span>
                    </>
                  )}
                </button>
              </div>

              {/* Right: Counters & Reset Round */}
              <div className="flex items-center gap-2 text-xs">
                <span className="text-sky-200 font-bold tabular-nums">
                  Đã gọi: <strong className="text-emerald-300">{calledCount}</strong>/{students.length}
                </span>
                <button
                  onClick={() => {
                    onResetRound();
                    setSelectedStudents([]);
                    setPendingRewardStudents([]);
                    setIsGiftOpened(false);
                  }}
                  className="px-2.5 py-1.5 rounded-xl bg-slate-800 hover:bg-slate-700 border border-slate-600 text-slate-100 font-bold flex items-center gap-1"
                  title="Làm mới lượt gọi (Reset)"
                >
                  <RotateCcw className="w-3.5 h-3.5" />
                  <span>RESET</span>
                </button>
              </div>
            </div>
          </div>
        )}
      </footer>

      {/* TEACHER CHALLENGE MANAGER MODAL (Add / Edit / Delete / Reset 10 Challenges) */}
      {showChallengeModal && (
        <div className="fixed inset-0 z-50 bg-slate-950/85 flex items-center justify-center p-4">
          <div className="w-full max-w-2xl rounded-3xl bg-[#0d1b3d] border-2 border-amber-300/60 shadow-2xl p-5 flex flex-col max-h-[85vh]">
            <div className="flex items-center justify-between gap-2 mb-3">
              <h3 className="text-lg font-black text-amber-200 flex items-center gap-2">
                <Gift className="w-5 h-5" />
                <span>Quản lý Thử thách Mystery Gift</span>
              </h3>
              <button
                onClick={() => setShowChallengeModal(false)}
                className="p-1.5 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-200"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {/* Add New Challenge */}
            <div className="flex gap-2 mb-3">
              <input
                type="text"
                value={newChallengeText}
                onChange={(e) => setNewChallengeText(e.target.value)}
                onKeyDown={(e) => {
                  if (e.key === 'Enter') handleAddChallenge();
                }}
                placeholder="Nhập thử thách tiếng Anh mới..."
                className="flex-1 px-3 py-2 rounded-xl bg-slate-900 border border-slate-600 text-sm text-white focus:outline-hidden focus:border-amber-400"
              />
              <button
                onClick={handleAddChallenge}
                className="px-4 py-2 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-white font-black text-xs flex items-center gap-1"
              >
                <Plus className="w-4 h-4" />
                <span>Thêm</span>
              </button>
            </div>

            {/* Challenge List */}
            <div className="flex-1 overflow-y-auto space-y-2 pr-1">
              {challenges.map((c, idx) => (
                <div
                  key={c.id}
                  className="flex items-center justify-between gap-2 p-2.5 rounded-xl bg-slate-900 border border-slate-700"
                >
                  {editingChallengeId === c.id ? (
                    <div className="flex-1 flex items-center gap-2">
                      <input
                        type="text"
                        value={editingChallengeText}
                        onChange={(e) => setEditingChallengeText(e.target.value)}
                        onKeyDown={(e) => {
                          if (e.key === 'Enter') handleSaveEditChallenge();
                        }}
                        className="flex-1 px-2.5 py-1.5 rounded-lg bg-slate-800 border border-amber-400 text-sm text-white"
                        autoFocus
                      />
                      <button
                        onClick={handleSaveEditChallenge}
                        className="px-3 py-1.5 rounded-lg bg-amber-400 text-slate-950 font-black text-xs"
                      >
                        Lưu
                      </button>
                      <button
                        onClick={() => setEditingChallengeId(null)}
                        className="px-2.5 py-1.5 rounded-lg bg-slate-700 text-slate-200 font-bold text-xs"
                      >
                        Hủy
                      </button>
                    </div>
                  ) : (
                    <>
                      <span className="text-sm font-semibold text-slate-100">
                        <strong className="text-amber-300 mr-1.5">{idx + 1}.</strong>
                        {c.text}
                      </span>
                      <div className="flex items-center gap-1.5 shrink-0">
                        <button
                          onClick={() => {
                            setEditingChallengeId(c.id);
                            setEditingChallengeText(c.text);
                          }}
                          className="p-1.5 rounded-lg bg-slate-800 hover:bg-slate-700 text-sky-300"
                          title="Sửa thử thách"
                        >
                          <Edit3 className="w-3.5 h-3.5" />
                        </button>
                        <button
                          onClick={() => handleDeleteChallenge(c.id)}
                          className="p-1.5 rounded-lg bg-slate-800 hover:bg-rose-700 text-rose-300"
                          title="Xóa thử thách"
                        >
                          <Trash2 className="w-3.5 h-3.5" />
                        </button>
                      </div>
                    </>
                  )}
                </div>
              ))}
            </div>

            <div className="mt-3 pt-3 border-t border-slate-700 flex items-center justify-between">
              <button
                onClick={() => setChallenges(DEFAULT_CHRISTMAS_CHALLENGES)}
                className="px-3 py-1.5 rounded-xl bg-slate-800 hover:bg-slate-700 text-xs font-bold text-amber-200"
              >
                Khôi phục 10 thử thách mặc định
              </button>
              <button
                onClick={() => setShowChallengeModal(false)}
                className="px-4 py-2 rounded-xl bg-amber-400 hover:bg-amber-300 text-slate-950 font-black text-xs"
              >
                Xong
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
