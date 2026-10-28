import React, { useState, useEffect } from 'react';
import { Student } from '../../types';
import { sound } from '../../utils/soundEffects';
import { Bot, Cpu, Zap, Sparkles } from 'lucide-react';

interface SmartRobotProps {
  students: Student[];
  isPicking: boolean;
  selectedStudent: Student | null;
  onPickEnd: () => void;
}

const ROBOT_QUOTES = [
  'Bíp bíp! Đang quét toàn bộ danh sách lớp học...',
  'Phân tích chỉ số năng lượng và trí tuệ...',
  'Phát hiện tín hiệu tỏa sáng đặc biệt...',
  'Đã khóa mục tiêu ngôi sao lớp học!',
];

export const SmartRobot: React.FC<SmartRobotProps> = ({
  students,
  isPicking,
  selectedStudent,
  onPickEnd,
}) => {
  const [robotStatus, setRobotStatus] = useState<string>('Robot AI đang sẵn sàng');
  const [analyzingName, setAnalyzingName] = useState<string>('');
  const [isLocked, setIsLocked] = useState<boolean>(false);

  useEffect(() => {
    if (!isPicking || !selectedStudent) {
      setRobotStatus('Robot AI đang sẵn sàng');
      setIsLocked(false);
      setAnalyzingName('');
      return;
    }

    setIsLocked(false);
    sound.playRobotScan();

    let step = 0;
    const interval = setInterval(() => {
      const qIdx = Math.min(ROBOT_QUOTES.length - 1, Math.floor(step / 4));
      setRobotStatus(ROBOT_QUOTES[qIdx]);

      const randomName = students[Math.floor(Math.random() * students.length)]?.name || 'Học sinh';
      setAnalyzingName(randomName);
      sound.playSpinTick(1.5 + (step % 5) * 0.1);
      step++;

      if (step > 15) {
        clearInterval(interval);
        setRobotStatus('🎯 ĐÃ XÁC ĐỊNH NGÔI SAO!');
        setAnalyzingName(selectedStudent.name);
        setIsLocked(true);
        sound.playWinnerFanfare();

        setTimeout(() => {
          onPickEnd();
        }, 1500);
      }
    }, 110);

    return () => clearInterval(interval);
  }, [isPicking, selectedStudent, students, onPickEnd]);

  return (
    <div className="relative w-full max-w-xl mx-auto flex flex-col items-center justify-center p-6 bg-slate-900 rounded-3xl border border-cyan-500/40 shadow-2xl min-h-[360px] overflow-hidden text-center">
      {/* Scanning Laser Beam overlay */}
      {isPicking && !isLocked && (
        <div className="absolute inset-x-0 h-1 bg-cyan-400 shadow-[0_0_15px_#22d3ee] animate-bounce pointer-events-none z-10" />
      )}

      {/* Cute Robot Character Icon */}
      <div className="relative mb-4">
        <div
          className={`w-24 h-24 rounded-3xl bg-gradient-to-tr from-cyan-600 to-blue-500 flex items-center justify-center border-2 border-cyan-300 shadow-lg shadow-cyan-500/30 transition-transform duration-300 ${
            isPicking ? 'animate-pulse scale-105' : ''
          }`}
        >
          <Bot className="w-14 h-14 text-white" />
        </div>
        <div className="absolute -top-1 -right-1 w-5 h-5 rounded-full bg-emerald-400 border-2 border-slate-900 flex items-center justify-center">
          <Zap className="w-3 h-3 text-slate-900" />
        </div>
      </div>

      {/* Robot Status & Dialog */}
      <div className="flex items-center gap-2 text-cyan-400 text-xs font-mono font-bold tracking-wider mb-2">
        <Cpu className="w-4 h-4 animate-spin" />
        <span>{robotStatus}</span>
      </div>

      {/* Hologram Name Area */}
      <div className="w-full max-w-md p-5 bg-cyan-950/40 border border-cyan-400/40 rounded-2xl backdrop-blur">
        {isLocked && selectedStudent ? (
          <div className="animate-fade-in flex flex-col items-center">
            <div className="flex items-center gap-1.5 text-xs text-amber-300 font-bold mb-1">
              <Sparkles className="w-4 h-4" />
              <span>KẾT QUẢ QUÉT THÀNH CÔNG</span>
            </div>
            <span className="text-3xl sm:text-4xl font-black text-cyan-200 drop-shadow-[0_0_20px_#22d3ee]">
              {selectedStudent.name}
            </span>
          </div>
        ) : (
          <div className="min-h-[50px] flex items-center justify-center text-slate-400 text-base font-semibold font-mono">
            {analyzingName || 'Chờ tín hiệu quét...'}
          </div>
        )}
      </div>
    </div>
  );
};
