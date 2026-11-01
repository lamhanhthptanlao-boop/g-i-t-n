import React, { useState, useEffect, useRef, useMemo, useCallback } from 'react';
import { Student } from '../../types';
import { sound } from '../../utils/soundEffects';
import { formatStudentCallSpeech } from '../../utils/vietnameseSpeech';
import {
  Volume2,
  VolumeX,
  Maximize2,
  Minimize2,
  Pause,
  Play,
  RotateCcw,
  Sparkles,
  Users,
  Flame,
  Award,
  Plus,
  Trash2,
  Check,
} from 'lucide-react';

interface SleepingDogModeProps {
  students: Student[];
  isPicking: boolean;
  selectedStudent: Student | null;
  selectedStudents?: Student[];
  onTriggerPick: (count?: number) => void;
  onPickEnd: () => void;
  duration?: number;
  enableTTS?: boolean;
  onlySpeakName?: boolean;
  voiceURI?: string;
  voiceRate?: number;
  voicePitch?: number;
  onUpdateStudents?: (newStudents: Student[]) => void;
}

type DogPhase = 'idle_tiptoe' | 'chase_right' | 'chase_left' | 'caught_winner';

// Coordinates of the 20 tiptoeing students in the schoolyard scene (image_ae87ed81.png)
const TIPTOE_STUDENT_POSITIONS = [
  // Top row (back row)
  { x: 26.61, y: 48.15, rot: -1 },
  { x: 34.19, y: 47.51, rot: 1 },
  { x: 42.92, y: 47.19, rot: -1 },
  { x: 50.61, y: 47.45, rot: 2 },
  { x: 58.12, y: 47.90, rot: -1 },
  { x: 66.62, y: 48.53, rot: 1 },
  { x: 74.08, y: 48.15, rot: -2 },
  // Middle row
  { x: 30.59, y: 54.53, rot: 1 },
  { x: 38.86, y: 53.64, rot: -1 },
  { x: 46.06, y: 53.83, rot: 2 },
  { x: 54.59, y: 54.27, rot: -2 },
  { x: 62.37, y: 54.08, rot: 1 },
  { x: 70.79, y: 54.15, rot: -1 },
  { x: 78.91, y: 54.27, rot: 2 },
  // Front row
  { x: 25.96, y: 60.40, rot: -1 },
  { x: 34.26, y: 60.65, rot: 1 },
  { x: 42.46, y: 60.33, rot: -2 },
  { x: 50.54, y: 60.27, rot: 2 },
  { x: 58.42, y: 61.42, rot: -1 },
  { x: 66.23, y: 60.08, rot: 1 },
];

// Positions of running students during chase right (image_ea559153.png)
const CHASE_RIGHT_POSITIONS = [
  { x: 56.55, y: 53.05, rot: 2 },
  { x: 68.15, y: 53.72, rot: -2 },
  { x: 72.05, y: 49.73, rot: 1 },
  { x: 78.79, y: 49.80, rot: -1 },
  { x: 77.22, y: 54.78, rot: 2 },
  { x: 77.14, y: 57.77, rot: -2 },
  { x: 73.35, y: 59.96, rot: 1 },
  { x: 77.76, y: 61.22, rot: -1 },
  { x: 57.35, y: 64.61, rot: 1 },
  { x: 61.18, y: 64.54, rot: -1 },
  { x: 64.28, y: 63.88, rot: 2 },
  { x: 69.22, y: 70.32, rot: -1 },
  { x: 62.67, y: 72.31, rot: 2 },
  { x: 74.92, y: 68.59, rot: -2 },
  { x: 89.97, y: 54.45, rot: 1 },
];

// Positions of running students during chase left (image_b81b0f14.png)
const CHASE_LEFT_POSITIONS = [
  { x: 10.41, y: 52.05, rot: -2 },
  { x: 26.14, y: 52.62, rot: 1 },
  { x: 31.69, y: 53.59, rot: -1 },
  { x: 36.31, y: 50.38, rot: 2 },
  { x: 40.25, y: 52.82, rot: -2 },
  { x: 43.79, y: 50.96, rot: 1 },
  { x: 52.97, y: 49.87, rot: -1 },
  { x: 25.94, y: 75.10, rot: 2 },
  { x: 51.00, y: 73.56, rot: -1 },
];

export const SleepingDogMode: React.FC<SleepingDogModeProps> = ({
  students,
  isPicking,
  selectedStudent,
  selectedStudents,
  onTriggerPick,
  onPickEnd,
  duration = 4,
  enableTTS = true,
  onlySpeakName = true,
  voiceURI,
  voiceRate,
  voicePitch,
  onUpdateStudents,
}) => {
  const [phase, setPhase] = useState<DogPhase>('idle_tiptoe');
  const [isPaused, setIsPaused] = useState<boolean>(false);
  const [isFullscreen, setIsFullscreen] = useState<boolean>(false);
  const [isSoundMuted, setIsSoundMuted] = useState<boolean>(false);
  const [showRosterModal, setShowRosterModal] = useState<boolean>(false);
  const [speedMode, setSpeedMode] = useState<'fast' | 'normal' | 'dramatic'>('normal');

  // Input states for class roster editing
  const [newStudentName, setNewStudentName] = useState<string>('');
  const [newStudentGender, setNewStudentGender] = useState<'male' | 'female'>('male');
  const [bulkTextInput, setBulkTextInput] = useState<string>('');

  const containerRef = useRef<HTMLDivElement | null>(null);
  const snoreIntervalRef = useRef<ReturnType<typeof setInterval> | null>(null);

  // Active student pool (students with present !== false)
  const activeStudents = useMemo(() => {
    return students.filter((s) => s.present !== false);
  }, [students]);

  // Winner list
  const winnersList =
    selectedStudents && selectedStudents.length > 0
      ? selectedStudents
      : selectedStudent
      ? [selectedStudent]
      : [];

  // Snoring audio effect in tiptoe phase
  useEffect(() => {
    if (phase === 'idle_tiptoe' && !isPicking && !isPaused && !isSoundMuted) {
      sound.playDogSnore();
      snoreIntervalRef.current = setInterval(() => {
        sound.playDogSnore();
      }, 4500);
      return () => {
        if (snoreIntervalRef.current) clearInterval(snoreIntervalRef.current);
      };
    }
  }, [phase, isPicking, isPaused, isSoundMuted]);

  // Main animation timeline when isPicking starts
  useEffect(() => {
    if (!isPicking) {
      if (phase !== 'caught_winner') {
        setPhase('idle_tiptoe');
      }
      return;
    }

    // Step 0: Start sneaking
    setPhase('idle_tiptoe');
    sound.playDogSnore();

    const speedMultiplier = speedMode === 'fast' ? 0.65 : speedMode === 'dramatic' ? 1.4 : 1.0;
    const totalDurationMs = Math.max(3800, (duration || 4) * 1000 * speedMultiplier);

    // Step 1: Dog barks & chases right!
    const tChaseRight = setTimeout(() => {
      sound.playDogBark();
      sound.playSlippersDrop();
      setPhase('chase_right');
    }, 900);

    // Step 2: Turnaround, chase left!
    const tChaseLeft = setTimeout(() => {
      sound.playDogBark();
      sound.playSlippersDrop();
      setPhase('chase_left');
    }, totalDurationMs * 0.45);

    // Step 3: Caught winner! Cha Cha Cha dance celebration!
    const tCatch = setTimeout(() => {
      setPhase('caught_winner');
      sound.playChaChaCha();
      sound.playSparkle();

      // Read winner name complying strictly with "5. CHỈ ĐỌC TÊN"
      if (enableTTS && selectedStudent) {
        setTimeout(() => {
          const speech = formatStudentCallSpeech(selectedStudent.name, onlySpeakName);
          sound.speakVirtualMC(speech, voiceURI, voiceRate || 0.96, voicePitch || 1.02);
        }, 600);
      }

      // Finish picking animation
      setTimeout(() => {
        onPickEnd();
      }, 2600);
    }, totalDurationMs);

    return () => {
      clearTimeout(tChaseRight);
      clearTimeout(tChaseLeft);
      clearTimeout(tCatch);
    };
  }, [isPicking, duration, speedMode, selectedStudent, enableTTS, onlySpeakName, voiceURI, voiceRate, voicePitch, onPickEnd]);

  // Fullscreen toggle
  const toggleFullscreen = () => {
    if (!containerRef.current) return;
    if (!document.fullscreenElement) {
      containerRef.current.requestFullscreen().then(() => setIsFullscreen(true)).catch(() => {});
    } else {
      document.exitFullscreen().then(() => setIsFullscreen(false)).catch(() => {});
    }
  };

  // Base background image for each phase
  const currentSceneImage = useMemo(() => {
    switch (phase) {
      case 'idle_tiptoe':
        return '/public/assets/aistudio/image_ae87ed81.png';
      case 'chase_right':
        return '/public/assets/aistudio/image_ea559153.png';
      case 'chase_left':
        return '/public/assets/aistudio/image_b81b0f14.png';
      case 'caught_winner':
        return '/public/assets/aistudio/image_98cca7b5.png';
      default:
        return '/public/assets/aistudio/image_ae87ed81.png';
    }
  }, [phase]);

  // Handlers for modifying class roster
  const handleAddStudent = () => {
    if (!newStudentName.trim() || !onUpdateStudents) return;
    const newSt: Student = {
      id: `student_${Date.now()}_${Math.random().toString(36).substr(2, 4)}`,
      name: newStudentName.trim(),
      called: false,
      callCount: 0,
      gender: newStudentGender,
      present: true,
    };
    onUpdateStudents([...students, newSt]);
    setNewStudentName('');
    sound.playSparkle();
  };

  const handleBulkAdd = () => {
    if (!bulkTextInput.trim() || !onUpdateStudents) return;
    const names = bulkTextInput
      .split('\n')
      .map((n) => n.trim())
      .filter((n) => n.length > 0);
    if (names.length === 0) return;

    const newItems: Student[] = names.map((name, i) => ({
      id: `student_${Date.now()}_${i}`,
      name,
      called: false,
      callCount: 0,
      present: true,
      gender: i % 2 === 0 ? 'male' : 'female',
    }));
    onUpdateStudents(newItems);
    setBulkTextInput('');
    sound.playSparkle();
  };

  const handleTogglePresent = (id: string) => {
    if (!onUpdateStudents) return;
    onUpdateStudents(
      students.map((s) => (s.id === id ? { ...s, present: s.present === false ? true : false } : s))
    );
  };

  const handleToggleGender = (id: string) => {
    if (!onUpdateStudents) return;
    onUpdateStudents(
      students.map((s) => (s.id === id ? { ...s, gender: s.gender === 'female' ? 'male' : 'female' } : s))
    );
  };

  const handleDeleteStudent = (id: string) => {
    if (!onUpdateStudents) return;
    onUpdateStudents(students.filter((s) => s.id !== id));
  };

  return (
    <div
      ref={containerRef}
      className="relative w-full max-w-5xl mx-auto rounded-3xl overflow-hidden shadow-2xl border-4 border-amber-300 dark:border-amber-500 bg-slate-900 select-none flex flex-col"
      style={{ aspectRatio: '16/9' }}
    >
      {/* 1. Base Photographic Scene Plate from Original Assets */}
      <img
        src={currentSceneImage}
        alt="Mực ơi đừng dậy"
        className="absolute inset-0 w-full h-full object-cover pointer-events-none transition-opacity duration-300"
      />

      {/* 2. LIVE CHARACTER ANIMATIONS & PARTICLES LAYER */}

      {/* A. TIPTOE PHASE (Cả lớp rón rén & Chú Mực ngủ khò) */}
      {phase === 'idle_tiptoe' && (
        <div className="absolute inset-0 pointer-events-none overflow-hidden z-10">
          {/* Sneaking Tiptoe Bobbing Motion Container */}
          <div className="absolute inset-0 animate-tiptoe">
            {/* Dynamic Name Badges Overlay: Directly on top of every student with real class names */}
            {TIPTOE_STUDENT_POSITIONS.map((pos, idx) => {
              const student = activeStudents[idx % activeStudents.length];
              if (!student) return null;
              return (
                <div
                  key={`tiptoe_${student.id || idx}`}
                  style={{
                    left: `${pos.x}%`,
                    top: `${pos.y}%`,
                    transform: `translate(-50%, -50%) rotate(${pos.rot}deg)`,
                  }}
                  className={`absolute z-20 px-2 sm:px-2.5 py-0.5 rounded-full text-[9px] sm:text-[11px] font-extrabold shadow-md border whitespace-nowrap transition-transform hover:scale-110 flex items-center gap-1 ${
                    student.called
                      ? 'bg-amber-100 text-amber-900 border-amber-400'
                      : 'bg-white text-slate-900 border-slate-300'
                  }`}
                >
                  <span>{student.name}</span>
                  {student.called && <span className="text-amber-500 text-[10px]">★</span>}
                </div>
              );
            })}

            {/* Sweat drops popping around students */}
            {[
              { x: 32, y: 52 },
              { x: 44, y: 58 },
              { x: 55, y: 55 },
              { x: 68, y: 59 },
              { x: 76, y: 51 },
            ].map((drop, i) => (
              <div
                key={`sweat_${i}`}
                style={{ left: `${drop.x}%`, top: `${drop.y}%` }}
                className="absolute text-cyan-400 text-xs sm:text-sm animate-ping opacity-75"
              >
                💦
              </div>
            ))}
          </div>

          {/* Dog Mực Snoring "Zzz" Bubble Particles rising from the dog (at bottom left) */}
          <div className="absolute left-[31.5%] top-[74%] flex flex-col items-center">
            <span className="text-blue-500 font-black text-xs sm:text-sm animate-snore font-mono">
              Zzz
            </span>
            <span
              style={{ animationDelay: '0.8s' }}
              className="text-blue-400 font-bold text-[10px] sm:text-xs animate-snore font-mono"
            >
              z
            </span>
          </div>

          {/* Gentle falling hoa phượng leaves */}
          {[
            { left: '15%', delay: '0s', dur: '4s' },
            { left: '35%', delay: '1.2s', dur: '5s' },
            { left: '60%', delay: '2.5s', dur: '4.5s' },
            { left: '80%', delay: '0.6s', dur: '4.8s' },
          ].map((leaf, i) => (
            <div
              key={`leaf_${i}`}
              style={{
                left: leaf.left,
                animation: `tiptoeBob ${leaf.dur} ease-in-out infinite`,
                animationDelay: leaf.delay,
              }}
              className="absolute top-12 text-rose-500 text-xs opacity-70"
            >
              🌸
            </div>
          ))}
        </div>
      )}

      {/* B. CHASE RIGHT PHASE (Mực thức giấc & rượt đuổi qua phải) */}
      {phase === 'chase_right' && (
        <div className="absolute inset-0 pointer-events-none overflow-hidden z-10">
          {/* Running Students Container with Sprint Vibration */}
          <div className="absolute inset-0 animate-sprint-panic">
            {/* Dynamic Name Badges on Running Students */}
            {CHASE_RIGHT_POSITIONS.map((pos, idx) => {
              const student = activeStudents[idx % activeStudents.length];
              if (!student) return null;
              return (
                <div
                  key={`chase_r_${student.id || idx}`}
                  style={{
                    left: `${pos.x}%`,
                    top: `${pos.y}%`,
                    transform: `translate(-50%, -50%) rotate(${pos.rot}deg)`,
                  }}
                  className="absolute z-20 px-2 py-0.5 rounded-full text-[9px] sm:text-[11px] font-black bg-white text-slate-900 border-2 border-amber-400 shadow-lg whitespace-nowrap"
                >
                  <span>{student.name}</span>
                </div>
              );
            })}

            {/* Spraying Tears from Students' Eyes */}
            {[
              { x: 60, y: 55 },
              { x: 70, y: 58 },
              { x: 80, y: 54 },
            ].map((t, i) => (
              <div
                key={`tear_${i}`}
                style={{ left: `${t.x}%`, top: `${t.y}%` }}
                className="absolute text-cyan-300 text-sm animate-tear-spray font-bold"
              >
                💧💧
              </div>
            ))}
          </div>

          {/* Dog Mực Furious Gallop Animation Overlay */}
          <div className="absolute left-[31%] top-[65%] animate-dog-gallop">
            {/* Breath puff */}
            <div className="absolute -right-6 top-0 text-white font-black text-sm animate-ping">
              💨
            </div>
            {/* Dust cloud behind dog */}
            <div className="absolute -left-6 bottom-0 text-amber-200/80 text-xs animate-bounce">
              💨💨
            </div>
          </div>

          {/* Tumbling Dép Lào (Blue Plastic Flip-Flops flying) */}
          <div className="absolute left-[52%] top-[72%] animate-slipper text-base sm:text-xl">
            🩴
          </div>
          <div
            style={{ animationDelay: '0.3s' }}
            className="absolute left-[65%] top-[74%] animate-slipper text-base sm:text-xl"
          >
            🩴
          </div>
        </div>
      )}

      {/* C. CHASE LEFT PHASE (Cả lớp quay đầu chạy qua trái) */}
      {phase === 'chase_left' && (
        <div className="absolute inset-0 pointer-events-none overflow-hidden z-10">
          {/* Running Students Container with Sprint Vibration */}
          <div className="absolute inset-0 animate-sprint-panic">
            {/* Dynamic Name Badges on Running Students */}
            {CHASE_LEFT_POSITIONS.map((pos, idx) => {
              const student = activeStudents[idx % activeStudents.length];
              if (!student) return null;
              return (
                <div
                  key={`chase_l_${student.id || idx}`}
                  style={{
                    left: `${pos.x}%`,
                    top: `${pos.y}%`,
                    transform: `translate(-50%, -50%) rotate(${pos.rot}deg)`,
                  }}
                  className="absolute z-20 px-2 py-0.5 rounded-full text-[9px] sm:text-[11px] font-black bg-white text-slate-900 border-2 border-amber-400 shadow-lg whitespace-nowrap"
                >
                  <span>{student.name}</span>
                </div>
              );
            })}

            {/* Spraying Tears */}
            {[
              { x: 20, y: 56 },
              { x: 35, y: 58 },
              { x: 45, y: 55 },
            ].map((t, i) => (
              <div
                key={`tear_l_${i}`}
                style={{ left: `${t.x}%`, top: `${t.y}%` }}
                className="absolute text-cyan-300 text-sm animate-tear-spray font-bold"
              >
                💧💧
              </div>
            ))}
          </div>

          {/* Dog Mực Galloping Left */}
          <div className="absolute left-[68%] top-[63%] animate-dog-gallop">
            <div className="absolute -left-6 top-0 text-white font-black text-sm animate-ping">
              💨
            </div>
            <div className="absolute -right-6 bottom-0 text-amber-200/80 text-xs animate-bounce">
              💨💨
            </div>
          </div>

          {/* Bouncing Slippers */}
          <div className="absolute left-[40%] top-[73%] animate-slipper text-base sm:text-xl">
            🩴
          </div>
        </div>
      )}

      {/* D. CAUGHT WINNER PHASE (Vũ Điệu Cha Cha Cha Cùng Chú Mực) */}
      {phase === 'caught_winner' && (
        <div className="absolute inset-0 pointer-events-none overflow-hidden z-10">
          {/* 1. Student in Tree Badge (Top Left Tree) */}
          <div
            style={{ left: '14.66%', top: '22.24%' }}
            className="absolute z-30 -translate-x-1/2 -translate-y-1/2 px-2.5 py-0.5 rounded-full text-[10px] sm:text-xs font-black bg-white text-slate-900 border-2 border-rose-400 shadow-lg whitespace-nowrap animate-bounce"
          >
            <span>{activeStudents[1]?.name || 'Học sinh'}</span>
            <span className="ml-1 text-xs">😭</span>
          </div>

          {/* 2. Caught Dancing Student & Dog Mực dancing the Cha Cha Cha */}
          <div
            style={{ left: '47.83%', top: '58.41%' }}
            className="absolute z-30 -translate-x-1/2 -translate-y-1/2 animate-chachacha flex flex-col items-center"
          >
            {/* Dynamic Name Badge on Top of Dancing Student */}
            <div className="px-3.5 sm:px-5 py-1 sm:py-1.5 rounded-full text-xs sm:text-sm font-black bg-gradient-to-r from-amber-400 via-yellow-300 to-amber-500 text-indigo-950 border-2 border-white shadow-2xl whitespace-nowrap flex items-center gap-1.5 ring-4 ring-yellow-400/40">
              <span>👑 {winnersList[0]?.name || selectedStudent?.name || activeStudents[0]?.name || 'Học sinh'}</span>
              <span className="text-yellow-700 font-black">★</span>
            </div>

            {/* High-five paw spark */}
            <div className="absolute right-[30%] top-[40%] text-amber-300 text-lg sm:text-2xl animate-ping">
              ✨
            </div>
          </div>

          {/* Floating Musical Notes */}
          <div className="absolute left-[56%] top-[42%] flex items-center gap-2 text-pink-500 font-bold text-base sm:text-xl animate-bounce">
            <span>🎵</span>
            <span>🎶</span>
            <span className="text-amber-400 animate-spin">✨</span>
          </div>

          {/* Interactive Bouncing Rubber Chicken */}
          <div
            onClick={() => sound.playApplausePopper()}
            className="absolute left-[31%] top-[79%] pointer-events-auto cursor-pointer text-xl sm:text-2xl hover:scale-125 transition-transform"
            title="Bấm vào chú gà cao su kêu chít chít!"
          >
            🐔
          </div>
        </div>
      )}

      {/* 3. Top Header Bar with game controls */}
      <div className="absolute top-2.5 sm:top-4 inset-x-2.5 sm:inset-x-4 z-30 flex items-center justify-between pointer-events-none">
        {/* Title badge */}
        <div className="pointer-events-auto flex items-center gap-2 px-3.5 py-1.5 rounded-full bg-slate-900/85 backdrop-blur-md border border-amber-300/60 shadow-lg text-white">
          <span className="text-lg animate-bounce">🐕</span>
          <div className="flex flex-col">
            <span className="text-xs sm:text-sm font-black text-amber-300 uppercase tracking-wide flex items-center gap-1.5">
              <span>Mực Ơi Đừng Dậy!</span>
              <span className="px-1.5 py-0.2 rounded bg-rose-500 text-white text-[9px] font-black uppercase">
                HOT
              </span>
            </span>
            <span className="text-[10px] text-slate-300 hidden sm:inline">
              {phase === 'idle_tiptoe'
                ? 'Suỵt... cả lớp rón rén đi qua chú Mực!'
                : phase === 'caught_winner'
                ? '🎉 Chú Mực đã bắt được bạn lên bảng trả bài!'
                : '😱 Chú Mực tỉnh giấc rượt bắt học sinh!'}
            </span>
          </div>
        </div>

        {/* Action button cluster */}
        <div className="pointer-events-auto flex items-center gap-1.5 sm:gap-2">
          {/* Class Roster Button */}
          <button
            onClick={() => setShowRosterModal(true)}
            className="px-2.5 sm:px-3 py-1.5 rounded-xl bg-amber-500 hover:bg-amber-600 text-white text-xs font-bold shadow-md flex items-center gap-1 transition-all active:scale-95"
            title="Đổi danh sách học sinh theo lớp của bạn"
          >
            <Users className="w-3.5 h-3.5" />
            <span className="hidden sm:inline">Lớp: {activeStudents.length} bạn</span>
          </button>

          {/* Fullscreen Button */}
          <button
            onClick={toggleFullscreen}
            className="p-1.5 sm:p-2 rounded-xl bg-white/90 hover:bg-white text-slate-800 shadow-md transition-all active:scale-95"
            title="Toàn màn hình"
          >
            {isFullscreen ? <Minimize2 className="w-4 h-4" /> : <Maximize2 className="w-4 h-4" />}
          </button>

          {/* Sound Mute Toggle */}
          <button
            onClick={() => {
              const nextMute = !isSoundMuted;
              setIsSoundMuted(nextMute);
              sound.setMuted(nextMute);
            }}
            className="p-1.5 sm:p-2 rounded-xl bg-white/90 hover:bg-white text-slate-800 shadow-md transition-all active:scale-95"
            title="Bật / Tắt âm thanh"
          >
            {isSoundMuted ? (
              <VolumeX className="w-4 h-4 text-rose-500" />
            ) : (
              <Volume2 className="w-4 h-4 text-indigo-600" />
            )}
          </button>

          {/* Pause / Resume Button */}
          <button
            onClick={() => setIsPaused(!isPaused)}
            className="px-2.5 sm:px-3 py-1.5 rounded-xl bg-white/90 hover:bg-white text-slate-800 text-xs font-bold shadow-md flex items-center gap-1 transition-all active:scale-95"
          >
            {isPaused ? (
              <Play className="w-3.5 h-3.5 text-emerald-600" />
            ) : (
              <Pause className="w-3.5 h-3.5 text-amber-600" />
            )}
            <span className="hidden sm:inline">{isPaused ? 'Tiếp tục' : 'Tạm dừng'}</span>
          </button>

          {/* End / Trigger Round */}
          <button
            onClick={() => {
              if (isPicking) {
                setPhase('caught_winner');
                sound.playChaChaCha();
                onPickEnd();
              } else {
                onTriggerPick(1);
              }
            }}
            className="px-3 sm:px-4 py-1.5 rounded-xl bg-gradient-to-r from-red-600 to-rose-600 hover:from-red-700 hover:to-rose-700 text-white text-xs font-black shadow-lg shadow-rose-600/30 transition-all active:scale-95 flex items-center gap-1"
          >
            <Flame className="w-3.5 h-3.5 text-yellow-300 animate-pulse" />
            <span>{isPicking ? 'Kết thúc ngay' : 'Bắt đầu gọi tên'}</span>
          </button>
        </div>
      </div>

      {/* 4. Bottom Control Bar (Speed settings & Play prompt) */}
      <div className="absolute bottom-2.5 sm:bottom-4 inset-x-4 z-20 flex items-center justify-between pointer-events-none">
        {/* Speed Selector */}
        <div className="pointer-events-auto flex items-center gap-1 bg-slate-900/85 backdrop-blur px-2.5 py-1 rounded-full border border-white/20 text-xs text-white">
          <span className="text-[10px] text-slate-300 font-semibold hidden sm:inline">
            Tốc độ rượt:
          </span>
          {[
            { id: 'fast', label: 'Nhanh (~15s)' },
            { id: 'normal', label: 'Bình thường (~25s)' },
            { id: 'dramatic', label: 'Kịch tính (~35s)' },
          ].map((sp) => (
            <button
              key={sp.id}
              onClick={() => setSpeedMode(sp.id as 'fast' | 'normal' | 'dramatic')}
              className={`px-2 py-0.5 rounded-full text-[10px] font-bold transition-all ${
                speedMode === sp.id
                  ? 'bg-amber-500 text-white shadow-xs'
                  : 'text-slate-300 hover:text-white'
              }`}
            >
              {sp.label}
            </button>
          ))}
        </div>

        {/* Start Game Trigger Button when idle */}
        {!isPicking && phase !== 'caught_winner' && (
          <button
            onClick={() => onTriggerPick(1)}
            className="pointer-events-auto px-5 sm:px-7 py-2.5 sm:py-3 rounded-2xl bg-gradient-to-r from-amber-500 via-orange-500 to-red-500 hover:from-amber-600 hover:to-red-600 text-white font-black text-sm sm:text-base shadow-xl shadow-orange-500/40 ring-4 ring-yellow-300/50 flex items-center gap-2 transform hover:scale-105 active:scale-95 transition-all animate-bounce"
          >
            <Play className="w-5 h-5 fill-white" />
            <span>BẮT ĐẦU · {activeStudents.length} BẠN</span>
          </button>
        )}
      </div>

      {/* 5. Class Roster Settings Modal (Matching screenshot image_5f981d89.png) */}
      {showRosterModal && (
        <div className="absolute inset-0 z-50 bg-black/85 backdrop-blur-md p-3 sm:p-5 flex items-center justify-center animate-fade-in pointer-events-auto overflow-y-auto">
          <div className="relative w-full max-w-3xl bg-gradient-to-b from-[#1b3d2f] to-[#10261d] text-white rounded-3xl p-5 sm:p-6 border-4 border-amber-500 shadow-2xl flex flex-col max-h-[92%] overflow-hidden my-auto">
            {/* Modal Title */}
            <div className="flex items-start justify-between border-b border-emerald-700/60 pb-3 mb-3">
              <div>
                <h2 className="text-xl sm:text-2xl font-black text-amber-400 flex items-center gap-2">
                  <span>Mực ơi đừng dậy!</span>
                  <span className="text-sm font-semibold text-emerald-200">
                    · Tùy chọn tên theo danh sách lớp
                  </span>
                </h2>
                <p className="text-xs text-emerald-200/90 mt-0.5">
                  Cả lớp rón rén đi qua chú Mực đang ngủ... lỡ đánh thức Mực là bị rượt! Bạn nào bị Mực bắt được sẽ lên bảng trả bài.
                </p>
              </div>
              <button
                onClick={() => setShowRosterModal(false)}
                className="w-8 h-8 rounded-full bg-emerald-800/80 hover:bg-emerald-700 text-emerald-200 hover:text-white flex items-center justify-center font-bold text-sm"
              >
                ✕
              </button>
            </div>

            {/* Quick Add Row & Excel Paste */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-3 mb-3 text-xs">
              {/* Single Add */}
              <div className="p-3 bg-emerald-950/60 rounded-2xl border border-emerald-700/50 flex flex-col gap-2">
                <span className="font-bold text-amber-300">Ghi tên vào sổ:</span>
                <div className="flex items-center gap-2">
                  <input
                    type="text"
                    value={newStudentName}
                    onChange={(e) => setNewStudentName(e.target.value)}
                    onKeyDown={(e) => e.key === 'Enter' && handleAddStudent()}
                    placeholder="VD: Nguyễn Minh Anh"
                    className="flex-1 px-3 py-1.5 rounded-xl bg-slate-900/90 border border-emerald-600 text-white placeholder-slate-400 text-xs focus:outline-none focus:ring-2 focus:ring-amber-400"
                  />
                  <button
                    onClick={() => setNewStudentGender(newStudentGender === 'male' ? 'female' : 'male')}
                    className={`px-2.5 py-1.5 rounded-xl font-bold text-[11px] border transition-all ${
                      newStudentGender === 'male'
                        ? 'bg-blue-600 border-blue-400 text-white'
                        : 'bg-pink-600 border-pink-400 text-white'
                    }`}
                  >
                    {newStudentGender === 'male' ? 'Nam' : 'Nữ'}
                  </button>
                  <button
                    onClick={handleAddStudent}
                    className="px-3.5 py-1.5 rounded-xl bg-amber-500 hover:bg-amber-600 text-white font-bold text-xs shadow-md transition-all active:scale-95"
                  >
                    Thêm
                  </button>
                </div>
              </div>

              {/* Bulk paste */}
              <div className="p-3 bg-emerald-950/60 rounded-2xl border border-emerald-700/50 flex flex-col gap-2">
                <div className="flex items-center justify-between">
                  <span className="font-bold text-amber-300">Hoặc dán cả lớp (mỗi dòng 1 tên):</span>
                  <button
                    onClick={handleBulkAdd}
                    className="px-2 py-0.5 rounded bg-emerald-600 hover:bg-emerald-500 text-white font-bold text-[10px]"
                  >
                    Thêm cả danh sách
                  </button>
                </div>
                <textarea
                  rows={2}
                  value={bulkTextInput}
                  onChange={(e) => setBulkTextInput(e.target.value)}
                  placeholder="Nguyễn Minh Anh&#10;Trần Gia Bảo&#10;Lê Ngọc Châu"
                  className="w-full px-2 py-1 rounded-xl bg-slate-900/90 border border-emerald-600 text-white placeholder-slate-400 text-xs resize-none focus:outline-none focus:ring-2 focus:ring-amber-400"
                />
              </div>
            </div>

            {/* Sĩ số & Quick Action Toolbar */}
            <div className="flex flex-wrap items-center justify-between gap-2 mb-2 text-xs">
              <div className="flex items-center gap-2">
                <span className="font-bold text-amber-300">Sĩ số:</span>
                <span className="px-2.5 py-0.5 rounded-full bg-emerald-900 border border-emerald-600 text-white font-mono font-bold">
                  {activeStudents.length}/{students.length} học sinh
                </span>
                <span className="text-[11px] text-emerald-300">
                  · còn {students.filter((s) => !s.called && s.present !== false).length} chưa gọi
                </span>
              </div>

              <div className="flex items-center gap-2 text-[11px]">
                <button
                  onClick={() => {
                    if (onUpdateStudents) {
                      onUpdateStudents(students.map((s) => ({ ...s, called: false })));
                      sound.playSparkle();
                    }
                  }}
                  className="text-amber-300 hover:underline font-bold"
                >
                  Làm mới lượt gọi
                </button>
                <span>·</span>
                <button
                  onClick={() => {
                    if (onUpdateStudents && confirm('Bạn có chắc muốn xóa tất cả học sinh để nhập mới?')) {
                      onUpdateStudents([]);
                    }
                  }}
                  className="text-rose-400 hover:underline font-bold"
                >
                  Xóa hết
                </button>
              </div>
            </div>

            {/* Instruction strip */}
            <div className="p-2 rounded-xl bg-amber-400/10 border border-amber-400/30 text-[11px] text-amber-200 mb-2.5">
              💡 Bấm <strong>Nam / Nữ</strong> để đổi nhân vật · Bấm <strong>Có mặt / Vắng</strong> để chuyển trạng thái · Tên trên ảnh sẽ tự động hiển thị theo danh sách này!
            </div>

            {/* Student Badge Grid */}
            <div className="flex-1 overflow-y-auto grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-2 pr-1 mb-3">
              {students.map((st, idx) => (
                <div
                  key={st.id}
                  className={`p-2 rounded-xl border flex items-center justify-between gap-2 transition-all ${
                    st.present === false
                      ? 'bg-slate-900/60 border-slate-700 text-slate-500 opacity-60'
                      : st.called
                      ? 'bg-amber-950/40 border-amber-500 text-amber-200'
                      : 'bg-emerald-950/70 border-emerald-600/50 text-emerald-100 hover:border-emerald-400'
                  }`}
                >
                  <div className="flex items-center gap-1.5 min-w-0 flex-1">
                    <span className="w-6 h-6 rounded-full bg-emerald-800 text-[10px] font-black flex items-center justify-center shrink-0">
                      {idx + 1}
                    </span>
                    <span className="text-xs font-bold truncate">{st.name}</span>
                    {st.called && <span className="text-amber-400 text-xs">★</span>}
                  </div>

                  <div className="flex items-center gap-1 shrink-0">
                    {/* Gender toggle */}
                    <button
                      onClick={() => handleToggleGender(st.id)}
                      className={`text-[10px] px-1.5 py-0.5 rounded font-bold ${
                        st.gender === 'female'
                          ? 'bg-pink-700/80 text-pink-100'
                          : 'bg-blue-700/80 text-blue-100'
                      }`}
                      title="Đổi Nam / Nữ"
                    >
                      {st.gender === 'female' ? 'Nữ' : 'Nam'}
                    </button>

                    {/* Attendance toggle */}
                    <button
                      onClick={() => handleTogglePresent(st.id)}
                      className={`text-[10px] px-1.5 py-0.5 rounded font-bold ${
                        st.present === false
                          ? 'bg-slate-800 text-slate-400'
                          : 'bg-emerald-600 text-white'
                      }`}
                    >
                      {st.present === false ? 'Vắng' : 'Có mặt'}
                    </button>

                    {/* Delete button */}
                    <button
                      onClick={() => handleDeleteStudent(st.id)}
                      className="p-1 text-slate-400 hover:text-rose-400 transition-colors"
                      title="Xóa học sinh này"
                    >
                      <Trash2 className="w-3 h-3" />
                    </button>
                  </div>
                </div>
              ))}
            </div>

            {/* Modal Footer */}
            <div className="flex items-center justify-between pt-3 border-t border-emerald-700/60">
              <span className="text-xs text-emerald-300">
                ★ đã lên bảng · Đang chọn sẵn <strong>{activeStudents.length} bạn</strong>
              </span>
              <button
                onClick={() => {
                  setShowRosterModal(false);
                  onTriggerPick(1);
                }}
                className="px-6 py-2 rounded-xl bg-gradient-to-r from-amber-500 to-orange-500 hover:from-amber-600 hover:to-orange-600 text-white font-black text-xs shadow-lg transition-all active:scale-95 flex items-center gap-1.5"
              >
                <Play className="w-4 h-4 fill-white" />
                <span>Bắt đầu · {activeStudents.length} bạn</span>
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
