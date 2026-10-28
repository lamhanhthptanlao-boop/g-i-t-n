import React, { useState } from 'react';
import { CallHistoryItem, Student } from '../types';
import {
  X,
  History,
  RotateCcw,
  RefreshCw,
  Trash2,
  Download,
  CheckCircle2,
} from 'lucide-react';

interface HistoryDrawerProps {
  isOpen: boolean;
  history: CallHistoryItem[];
  students: Student[];
  onUndoLast: () => void;
  onResetRound: () => void;
  onClearHistory: () => void;
  onClose: () => void;
}

export const HistoryDrawer: React.FC<HistoryDrawerProps> = ({
  isOpen,
  history,
  students,
  onUndoLast,
  onResetRound,
  onClearHistory,
  onClose,
}) => {
  const [showConfirmClear, setShowConfirmClear] = useState<boolean>(false);

  if (!isOpen) return null;

  const total = students.length;
  const called = students.filter((s) => s.called).length;
  const remaining = total - called;

  const handleExportHistoryCSV = () => {
    const header = 'Lượt,Họ và tên,Thời gian,Chế độ\n';
    const rows = history.map((item) => {
      const timeStr = new Date(item.timestamp).toLocaleTimeString('vi-VN');
      const safeName = `"${item.studentName.replace(/"/g, '""')}"`;
      return `${item.order},${safeName},${timeStr},${item.mode}`;
    });

    const csvContent = '\uFEFF' + header + rows.join('\n');
    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.setAttribute('download', `lich_su_goi_ten_${new Date().toISOString().slice(0, 10)}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  return (
    <div className="fixed inset-0 z-50 flex justify-end bg-slate-950/60 backdrop-blur-xs animate-fade-in">
      <div className="relative w-full max-w-md bg-white dark:bg-slate-900 h-full shadow-2xl flex flex-col border-l border-slate-200 dark:border-slate-800">
        {/* Header */}
        <div className="flex items-center justify-between p-5 border-b border-slate-100 dark:border-slate-800">
          <div className="flex items-center gap-2.5">
            <div className="w-9 h-9 rounded-xl bg-indigo-100 dark:bg-indigo-950/50 flex items-center justify-center text-indigo-600 dark:text-indigo-400">
              <History className="w-5 h-5" />
            </div>
            <div>
              <h2 className="text-base font-bold text-slate-900 dark:text-white">
                Lịch Sử Gọi Tên
              </h2>
              <span className="text-xs text-slate-500">
                Đã thực hiện {history.length} lượt gọi
              </span>
            </div>
          </div>

          <button
            onClick={onClose}
            className="p-1.5 text-slate-400 hover:text-slate-600 dark:hover:text-white rounded-lg hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Progress Summary Card */}
        <div className="p-4 bg-slate-50 dark:bg-slate-800/50 border-b border-slate-100 dark:border-slate-800">
          <div className="flex justify-between text-xs font-semibold text-slate-600 dark:text-slate-300 mb-2">
            <span>Tiến độ lớp học</span>
            <span>{total > 0 ? Math.round((called / total) * 100) : 0}%</span>
          </div>
          <div className="w-full h-2 rounded-full bg-slate-200 dark:bg-slate-700 overflow-hidden">
            <div
              className="h-full bg-gradient-to-r from-emerald-500 to-teal-400 rounded-full transition-all duration-300"
              style={{ width: `${total > 0 ? (called / total) * 100 : 0}%` }}
            />
          </div>
          <div className="flex justify-between items-center mt-3 text-xs">
            <span className="text-slate-500">
              Đã gọi: <strong className="text-emerald-600 dark:text-emerald-400">{called}</strong>
            </span>
            <span className="text-slate-500">
              Còn lại: <strong className="text-amber-600 dark:text-amber-400">{remaining}</strong>
            </span>
            <span className="text-slate-500">
              Tổng số: <strong className="text-slate-900 dark:text-white">{total}</strong>
            </span>
          </div>
        </div>

        {/* Tool actions */}
        <div className="flex items-center justify-between p-3 border-b border-slate-100 dark:border-slate-800 bg-white dark:bg-slate-900 gap-2">
          <button
            onClick={onUndoLast}
            disabled={history.length === 0}
            className="flex-1 py-1.5 px-2.5 rounded-lg bg-slate-100 hover:bg-slate-200 dark:bg-slate-800 dark:hover:bg-slate-700 disabled:opacity-40 text-slate-700 dark:text-slate-200 text-xs font-semibold flex items-center justify-center gap-1.5 transition-colors"
          >
            <RotateCcw className="w-3.5 h-3.5" />
            <span>Hoàn tác</span>
          </button>

          <button
            onClick={onResetRound}
            className="flex-1 py-1.5 px-2.5 rounded-lg bg-amber-50 hover:bg-amber-100 dark:bg-amber-950/40 dark:hover:bg-amber-900/60 text-amber-700 dark:text-amber-300 text-xs font-semibold flex items-center justify-center gap-1.5 transition-colors"
          >
            <RefreshCw className="w-3.5 h-3.5" />
            <span>Lượt mới</span>
          </button>

          <button
            onClick={handleExportHistoryCSV}
            disabled={history.length === 0}
            className="p-1.5 rounded-lg bg-slate-100 hover:bg-slate-200 dark:bg-slate-800 disabled:opacity-40 text-slate-600 dark:text-slate-300"
            title="Xuất lịch sử CSV"
          >
            <Download className="w-4 h-4" />
          </button>

          <button
            onClick={() => setShowConfirmClear(true)}
            disabled={history.length === 0}
            className="p-1.5 rounded-lg bg-rose-50 hover:bg-rose-100 dark:bg-rose-950/50 disabled:opacity-40 text-rose-600"
            title="Xóa lịch sử"
          >
            <Trash2 className="w-4 h-4" />
          </button>
        </div>

        {/* History List */}
        <div className="flex-1 overflow-y-auto p-4 space-y-2">
          {history.length === 0 ? (
            <div className="py-12 text-center text-slate-400 text-xs">
              Chưa có lượt gọi nào trong phiên này.
            </div>
          ) : (
            history.map((item) => (
              <div
                key={item.id}
                className="flex items-center justify-between p-3 rounded-xl bg-slate-50 dark:bg-slate-800/50 border border-slate-100 dark:border-slate-800 hover:border-amber-300 transition-colors"
              >
                <div className="flex items-center gap-3">
                  <span className="w-7 h-7 rounded-full bg-amber-100 dark:bg-amber-950 text-amber-600 dark:text-amber-400 font-bold text-xs flex items-center justify-center">
                    #{item.order}
                  </span>
                  <div>
                    <span className="font-bold text-sm text-slate-900 dark:text-white block">
                      {item.studentName}
                    </span>
                    <span className="text-[11px] text-slate-400">
                      {new Date(item.timestamp).toLocaleTimeString('vi-VN')}
                    </span>
                  </div>
                </div>

                <div className="flex items-center gap-1.5 text-emerald-600 text-xs font-semibold">
                  <CheckCircle2 className="w-4 h-4" />
                </div>
              </div>
            ))
          )}
        </div>

        {/* Confirmation Clear Dialog */}
        {showConfirmClear && (
          <div className="absolute inset-0 z-50 bg-slate-950/70 backdrop-blur-xs flex items-center justify-center p-4">
            <div className="bg-white dark:bg-slate-900 rounded-2xl p-5 max-w-xs w-full text-center border border-slate-200 dark:border-slate-800">
              <h3 className="text-sm font-bold text-slate-900 dark:text-white">
                Xóa sạch lịch sử gọi?
              </h3>
              <p className="text-xs text-slate-500 mt-1">
                Lịch sử của các lượt đã gọi sẽ bị xóa. Trạng thái học sinh vẫn được giữ nguyên.
              </p>
              <div className="flex justify-center gap-2 mt-4">
                <button
                  onClick={() => setShowConfirmClear(false)}
                  className="px-3 py-1.5 text-xs font-semibold rounded-lg bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300"
                >
                  Hủy
                </button>
                <button
                  onClick={() => {
                    onClearHistory();
                    setShowConfirmClear(false);
                  }}
                  className="px-3 py-1.5 text-xs font-bold rounded-lg bg-rose-600 hover:bg-rose-700 text-white"
                >
                  Xác nhận
                </button>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};
