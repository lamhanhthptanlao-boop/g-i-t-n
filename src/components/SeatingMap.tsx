import React from 'react';
import { Student } from '../types';
import { LayoutGrid, CheckCircle2, User } from 'lucide-react';

interface SeatingMapProps {
  students: Student[];
  onSelectStudent: (student: Student) => void;
  onClose?: () => void;
}

export const SeatingMap: React.FC<SeatingMapProps> = ({
  students,
  onSelectStudent,
}) => {
  // Organize students in classroom desk grid (default 5 rows x 6 desks)
  const rows = 5;
  const cols = 6;

  return (
    <div className="w-full max-w-4xl mx-auto p-4 sm:p-6 bg-white dark:bg-slate-900 rounded-3xl border border-slate-200 dark:border-slate-800 shadow-xl">
      <div className="flex items-center justify-between mb-4 border-b border-slate-100 dark:border-slate-800 pb-3">
        <div className="flex items-center gap-2">
          <LayoutGrid className="w-5 h-5 text-amber-500" />
          <h3 className="text-base font-bold text-slate-900 dark:text-white">
            Sơ Đồ Chỗ Ngồi Lớp Học
          </h3>
        </div>
        <div className="text-xs text-slate-500">
          Nhấn vào bàn học để chọn học sinh
        </div>
      </div>

      {/* Teacher Podium / Bục Giảng */}
      <div className="w-full max-w-xs mx-auto mb-6 py-2 bg-amber-500/10 border-2 border-dashed border-amber-400 rounded-xl text-center">
        <span className="text-xs font-bold uppercase tracking-wider text-amber-600 dark:text-amber-400">
          🧑‍🏫 BỤC GIẢNG & BẢNG LỚP HỌC
        </span>
      </div>

      {/* Desk Grid */}
      <div className="grid grid-cols-3 sm:grid-cols-6 gap-3 sm:gap-4">
        {[...Array(rows * cols)].map((_, idx) => {
          const student = students[idx];
          if (!student) {
            return (
              <div
                key={idx}
                className="h-20 rounded-xl border border-dashed border-slate-200 dark:border-slate-800 flex flex-col items-center justify-center text-slate-300 dark:text-slate-700 text-xs"
              >
                <span>Bàn #{idx + 1}</span>
                <span className="text-[10px] text-slate-400">(Trống)</span>
              </div>
            );
          }

          return (
            <div
              key={student.id}
              onClick={() => onSelectStudent(student)}
              className={`h-20 p-2 rounded-xl border-2 flex flex-col justify-between cursor-pointer transition-all hover:scale-105 shadow-xs ${
                student.called
                  ? 'bg-emerald-50 dark:bg-emerald-950/40 border-emerald-400 text-emerald-900 dark:text-emerald-200'
                  : 'bg-white dark:bg-slate-800 border-slate-200 dark:border-slate-700 hover:border-amber-400 text-slate-900 dark:text-white'
              }`}
            >
              <div className="flex items-center justify-between text-[10px] font-bold">
                <span className="text-slate-400">#{idx + 1}</span>
                {student.called ? (
                  <CheckCircle2 className="w-3.5 h-3.5 text-emerald-500" />
                ) : (
                  <User className="w-3.5 h-3.5 text-slate-400" />
                )}
              </div>

              <div className="font-bold text-xs leading-tight line-clamp-2">
                {student.name}
              </div>

              <div className="text-[9px] text-slate-400">
                {student.called ? `Đã gọi (${student.callCount})` : 'Chưa gọi'}
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
};
