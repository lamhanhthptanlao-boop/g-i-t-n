import React, { useState } from 'react';
import { Student } from '../types';
import {
  parsePastedStudentList,
  exportStudentsToCSV,
  DEFAULT_STUDENTS,
} from '../utils/studentParser';
import {
  X,
  ClipboardPaste,
  UserPlus,
  Trash2,
  Edit2,
  Copy,
  Download,
  Upload,
  Check,
  Search,
  Sparkles,
} from 'lucide-react';

interface StudentManagerModalProps {
  isOpen: boolean;
  students: Student[];
  onUpdateStudents: (newStudents: Student[]) => void;
  onClose: () => void;
}

export const StudentManagerModal: React.FC<StudentManagerModalProps> = ({
  isOpen,
  students,
  onUpdateStudents,
  onClose,
}) => {
  const [activeTab, setActiveTab] = useState<'paste' | 'manage'>('paste');
  const [pasteText, setPasteText] = useState<string>('');
  const [dedupMode, setDedupMode] = useState<'keep' | 'remove' | 'rename'>('rename');
  const [stripNumbers, setStripNumbers] = useState<boolean>(true);
  const [importMode, setImportMode] = useState<'replace' | 'append'>('replace');
  const [selectedColIndex, setSelectedColIndex] = useState<number>(0);
  const [detectedColumnsPreview, setDetectedColumnsPreview] = useState<string[][]>([]);

  // Search & Edit states
  const [searchQuery, setSearchQuery] = useState<string>('');
  const [editingStudentId, setEditingStudentId] = useState<string | null>(null);
  const [editingName, setEditingName] = useState<string>('');
  const [newStudentName, setNewStudentName] = useState<string>('');
  const [copySuccess, setCopySuccess] = useState<boolean>(false);
  const [showConfirmClear, setShowConfirmClear] = useState<boolean>(false);

  // Inspect paste text changes to see if multiple columns are present
  const handlePasteChange = (text: string) => {
    setPasteText(text);
    const parsed = parsePastedStudentList(text, { dedupMode, stripNumbers });
    setDetectedColumnsPreview(parsed.detectedColumns);
  };

  const handleImportPasted = () => {
    if (!pasteText.trim()) return;

    const parsed = parsePastedStudentList(pasteText, {
      dedupMode,
      stripNumbers,
      selectedColumnIndex: detectedColumnsPreview.length > 0 ? selectedColIndex : undefined,
    });

    if (parsed.students.length === 0) return;

    if (importMode === 'replace') {
      onUpdateStudents(parsed.students);
    } else {
      // Append mode
      onUpdateStudents([...students, ...parsed.students]);
    }

    setPasteText('');
    setActiveTab('manage');
  };

  const handleLoadSample = (count = 16) => {
    let sampleNames = [...DEFAULT_STUDENTS];
    if (count > 16) {
      // expand sample up to 40
      const extra = [
        'Vũ Minh Khôi', 'Trịnh Bảo Ngọc', 'Phan Gia Hân', 'Lê Tuấn Hưng',
        'Nguyễn Thùy Chi', 'Lâm Gia Bảo', 'Đoàn Nhật Minh', 'Mai Thanh Trúc',
        'Huỳnh Tấn Phát', 'Nguyễn Lan Hương', 'Trần Đình Trọng', 'Phạm Như Quỳnh',
        'Đỗ Duy Mạnh', 'Vũ Văn Thanh', 'Lê Văn Xuân', 'Bùi Tiến Dũng',
        'Lương Xuân Trường', 'Nguyễn Tuấn Anh', 'Nguyễn Phong Hồng Duy', 'Hà Đức Chinh',
        'Phan Văn Đức', 'Nguyễn Tiến Linh', 'Nguyễn Quang Hải', 'Đặng Văn Lâm'
      ];
      sampleNames = [...sampleNames, ...extra];
    }

    const newSts: Student[] = sampleNames.map((name, idx) => ({
      id: `sample_${Date.now()}_${idx}`,
      name,
      called: false,
      callCount: 0,
      seatRow: Math.floor(idx / 6),
      seatCol: idx % 6,
    }));

    onUpdateStudents(newSts);
    setActiveTab('manage');
  };

  const handleAddSingleStudent = (e: React.FormEvent) => {
    e.preventDefault();
    if (!newStudentName.trim()) return;

    const newStudent: Student = {
      id: `student_${Date.now()}_${Math.random().toString(36).substring(2, 6)}`,
      name: newStudentName.trim(),
      called: false,
      callCount: 0,
    };

    onUpdateStudents([...students, newStudent]);
    setNewStudentName('');
  };

  const handleSaveEdit = (id: string) => {
    if (!editingName.trim()) return;
    onUpdateStudents(
      students.map((s) => (s.id === id ? { ...s, name: editingName.trim() } : s))
    );
    setEditingStudentId(null);
  };

  const handleDeleteStudent = (id: string) => {
    onUpdateStudents(students.filter((s) => s.id !== id));
  };

  const handleClearAll = () => {
    onUpdateStudents([]);
    setShowConfirmClear(false);
  };

  const handleCopyList = () => {
    const text = students.map((s) => s.name).join('\n');
    navigator.clipboard.writeText(text);
    setCopySuccess(true);
    setTimeout(() => setCopySuccess(false), 2000);
  };

  const handleExportCSV = () => {
    const csvContent = exportStudentsToCSV(students, true);
    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.setAttribute('download', `danh_sach_lop_${new Date().toISOString().slice(0, 10)}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  const handleCSVUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = (evt) => {
      const content = evt.target?.result as string;
      if (content) {
        const parsed = parsePastedStudentList(content, { dedupMode, stripNumbers });
        if (parsed.students.length > 0) {
          if (importMode === 'replace') {
            onUpdateStudents(parsed.students);
          } else {
            onUpdateStudents([...students, ...parsed.students]);
          }
          setActiveTab('manage');
        }
      }
    };
    reader.readAsText(file);
    e.target.value = '';
  };

  if (!isOpen) return null;

  const filteredStudents = students.filter((s) =>
    s.name.toLowerCase().includes(searchQuery.toLowerCase())
  );

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-4 bg-slate-950/80 backdrop-blur-sm animate-fade-in">
      <div className="relative w-full max-w-2xl bg-white dark:bg-slate-900 rounded-3xl shadow-2xl border border-slate-200 dark:border-slate-800 flex flex-col max-h-[92vh] overflow-hidden">
        {/* Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-slate-100 dark:border-slate-800">
          <div className="flex items-center gap-3">
            <div className="w-11 h-11 rounded-xl overflow-hidden border border-amber-300 shadow-xs shrink-0 ring-2 ring-amber-400/20">
              <img
                src="/src/assets/images/cat_logo_cute_1793188309200.jpg"
                alt="Logo Mèo"
                className="w-full h-full object-cover"
              />
            </div>
            <div>
              <h2 className="text-lg font-bold text-slate-900 dark:text-white flex items-center gap-1.5">
                <span>Quản Lý Danh Sách Lớp</span>
                <span className="text-xs font-bold px-2 py-0.5 rounded-full bg-amber-100 dark:bg-amber-950/50 text-amber-600 dark:text-amber-400">
                  🐾 Ms. Mèo
                </span>
              </h2>
              <p className="text-xs text-slate-500 dark:text-slate-400">
                Hiện có <span className="font-bold text-amber-600 dark:text-amber-400">{students.length}</span> học sinh trong danh sách
              </p>
            </div>
          </div>

          <button
            onClick={onClose}
            className="p-2 text-slate-400 hover:text-slate-600 dark:hover:text-white rounded-lg hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Tab navigation */}
        <div className="flex border-b border-slate-100 dark:border-slate-800 px-6 bg-slate-50/50 dark:bg-slate-900/50">
          <button
            onClick={() => setActiveTab('paste')}
            className={`py-3 px-4 text-xs font-bold border-b-2 transition-colors flex items-center gap-2 ${
              activeTab === 'paste'
                ? 'border-amber-500 text-amber-600 dark:text-amber-400'
                : 'border-transparent text-slate-500 hover:text-slate-800 dark:hover:text-slate-300'
            }`}
          >
            <ClipboardPaste className="w-4 h-4" />
            <span>📋 Dán danh sách nhanh (Excel/Word)</span>
          </button>
          <button
            onClick={() => setActiveTab('manage')}
            className={`py-3 px-4 text-xs font-bold border-b-2 transition-colors flex items-center gap-2 ${
              activeTab === 'manage'
                ? 'border-amber-500 text-amber-600 dark:text-amber-400'
                : 'border-transparent text-slate-500 hover:text-slate-800 dark:hover:text-slate-300'
            }`}
          >
            <UserPlus className="w-4 h-4" />
            <span>Danh sách chi tiết ({students.length})</span>
          </button>
        </div>

        {/* Content Body */}
        <div className="p-6 overflow-y-auto flex-1 space-y-4">
          {activeTab === 'paste' ? (
            <div className="space-y-4">
              <div>
                <label className="block text-xs font-bold uppercase tracking-wider text-slate-700 dark:text-slate-300 mb-1.5">
                  📋 DÁN DANH SÁCH HỌC SINH VÀO ĐÂY (Mỗi dòng một học sinh)
                </label>
                <textarea
                  rows={8}
                  value={pasteText}
                  onChange={(e) => handlePasteChange(e.target.value)}
                  placeholder={`Nguyễn Minh Anh\nTrần Quốc Bảo\nLê Ngọc Hà\nPhạm Gia Huy\nHoàng Khánh Linh\nVõ Đức Minh`}
                  className="w-full p-3.5 text-sm rounded-xl border border-slate-300 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 text-slate-900 dark:text-white focus:outline-hidden focus:ring-2 focus:ring-amber-500 font-mono placeholder:text-slate-400"
                />
              </div>

              {/* Multi-column detection (Excel paste) */}
              {detectedColumnsPreview.length > 0 && detectedColumnsPreview[0].length > 1 && (
                <div className="p-3 bg-amber-50 dark:bg-amber-950/40 border border-amber-300 dark:border-amber-700 rounded-xl">
                  <span className="text-xs font-bold text-amber-800 dark:text-amber-300 block mb-1">
                    Phát hiện dữ liệu Excel có {detectedColumnsPreview[0].length} cột. Vui lòng chọn cột họ tên:
                  </span>
                  <div className="flex flex-wrap gap-2">
                    {detectedColumnsPreview[0].map((cell, idx) => (
                      <button
                        key={idx}
                        type="button"
                        onClick={() => setSelectedColIndex(idx)}
                        className={`px-3 py-1 text-xs font-medium rounded-lg border transition-all ${
                          selectedColIndex === idx
                            ? 'bg-amber-500 text-white border-amber-500 shadow-xs'
                            : 'bg-white dark:bg-slate-800 text-slate-700 dark:text-slate-200 border-slate-200 dark:border-slate-700'
                        }`}
                      >
                        Cột {idx + 1}: "{cell || `Cột ${idx + 1}`}"
                      </button>
                    ))}
                  </div>
                </div>
              )}

              {/* Parsing Settings */}
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 p-3 bg-slate-50 dark:bg-slate-800/60 rounded-xl text-xs">
                <div>
                  <span className="font-semibold text-slate-700 dark:text-slate-300 block mb-1">
                    Trùng lặp tên:
                  </span>
                  <select
                    value={dedupMode}
                    onChange={(e) => setDedupMode(e.target.value as 'keep' | 'remove' | 'rename')}
                    className="w-full p-2 rounded-lg border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-800 dark:text-slate-200"
                  >
                    <option value="rename">Đánh số phân biệt (A (1), A (2))</option>
                    <option value="keep">Giữ nguyên</option>
                    <option value="remove">Loại bỏ tên trùng</option>
                  </select>
                </div>

                <div>
                  <span className="font-semibold text-slate-700 dark:text-slate-300 block mb-1">
                    Kiểu nhập:
                  </span>
                  <select
                    value={importMode}
                    onChange={(e) => setImportMode(e.target.value as 'replace' | 'append')}
                    className="w-full p-2 rounded-lg border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-800 dark:text-slate-200"
                  >
                    <option value="replace">Thay thế toàn bộ</option>
                    <option value="append">Thêm vào danh sách cũ</option>
                  </select>
                </div>

                <div className="flex flex-col justify-end">
                  <label className="flex items-center gap-2 cursor-pointer p-2 rounded-lg hover:bg-slate-100 dark:hover:bg-slate-700">
                    <input
                      type="checkbox"
                      checked={stripNumbers}
                      onChange={(e) => setStripNumbers(e.target.checked)}
                      className="rounded text-amber-500 focus:ring-amber-500"
                    />
                    <span className="text-slate-700 dark:text-slate-300">Tự xóa số thứ tự đầu dòng</span>
                  </label>
                </div>
              </div>

              {/* Import Action Buttons */}
              <div className="flex flex-wrap items-center justify-between gap-3 pt-2">
                <div className="flex items-center gap-2">
                  <button
                    type="button"
                    onClick={() => handleLoadSample(16)}
                    className="px-3 py-2 text-xs font-semibold text-slate-600 dark:text-slate-300 bg-slate-100 dark:bg-slate-800 hover:bg-slate-200 dark:hover:bg-slate-700 rounded-lg flex items-center gap-1.5 transition-colors"
                  >
                    <Sparkles className="w-3.5 h-3.5 text-amber-500" />
                    <span>Nạp mẫu 16 bạn</span>
                  </button>

                  <button
                    type="button"
                    onClick={() => handleLoadSample(40)}
                    className="px-3 py-2 text-xs font-semibold text-slate-600 dark:text-slate-300 bg-slate-100 dark:bg-slate-800 hover:bg-slate-200 dark:hover:bg-slate-700 rounded-lg flex items-center gap-1.5 transition-colors"
                  >
                    <Sparkles className="w-3.5 h-3.5 text-indigo-500" />
                    <span>Nạp mẫu 40 bạn</span>
                  </button>
                </div>

                <button
                  type="button"
                  onClick={handleImportPasted}
                  disabled={!pasteText.trim()}
                  className="px-5 py-2.5 rounded-xl bg-amber-500 hover:bg-amber-600 disabled:opacity-50 text-white font-bold text-xs shadow-md shadow-amber-500/20 transition-all flex items-center gap-2"
                >
                  <ClipboardPaste className="w-4 h-4" />
                  <span>📥 NHẬP DANH SÁCH NGAY</span>
                </button>
              </div>
            </div>
          ) : (
            <div className="space-y-4">
              {/* Quick Add Single Student form */}
              <form onSubmit={handleAddSingleStudent} className="flex gap-2">
                <input
                  type="text"
                  value={newStudentName}
                  onChange={(e) => setNewStudentName(e.target.value)}
                  placeholder="Nhập tên học sinh mới (ví dụ: Lê Thuỳ Linh)..."
                  className="flex-1 p-2.5 text-sm rounded-xl border border-slate-300 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 text-slate-900 dark:text-white focus:outline-hidden focus:ring-2 focus:ring-amber-500"
                />
                <button
                  type="submit"
                  disabled={!newStudentName.trim()}
                  className="px-4 py-2.5 bg-amber-500 hover:bg-amber-600 disabled:opacity-50 text-white font-bold text-xs rounded-xl flex items-center gap-1.5 shadow-xs"
                >
                  <UserPlus className="w-4 h-4" />
                  <span>Thêm</span>
                </button>
              </form>

              {/* Search & Toolstrip */}
              <div className="flex flex-wrap items-center justify-between gap-3">
                <div className="relative flex-1 min-w-[200px]">
                  <Search className="w-4 h-4 absolute left-3 top-3 text-slate-400" />
                  <input
                    type="text"
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                    placeholder="Tìm kiếm học sinh..."
                    className="w-full pl-9 pr-3 py-2 text-xs rounded-lg border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 text-slate-800 dark:text-slate-200"
                  />
                </div>

                <div className="flex items-center gap-1.5 text-xs">
                  <button
                    onClick={handleCopyList}
                    className="p-2 rounded-lg bg-slate-100 hover:bg-slate-200 dark:bg-slate-800 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-300 flex items-center gap-1"
                    title="Sao chép toàn bộ danh sách"
                  >
                    {copySuccess ? <Check className="w-3.5 h-3.5 text-emerald-500" /> : <Copy className="w-3.5 h-3.5" />}
                    <span className="hidden sm:inline">Sao chép</span>
                  </button>

                  <button
                    onClick={handleExportCSV}
                    className="p-2 rounded-lg bg-slate-100 hover:bg-slate-200 dark:bg-slate-800 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-300 flex items-center gap-1"
                    title="Xuất file CSV"
                  >
                    <Download className="w-3.5 h-3.5" />
                    <span className="hidden sm:inline">Xuất CSV</span>
                  </button>

                  <label className="p-2 rounded-lg bg-slate-100 hover:bg-slate-200 dark:bg-slate-800 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-300 flex items-center gap-1 cursor-pointer">
                    <Upload className="w-3.5 h-3.5" />
                    <span className="hidden sm:inline">Nhập CSV</span>
                    <input
                      type="file"
                      accept=".csv,.txt"
                      onChange={handleCSVUpload}
                      className="hidden"
                    />
                  </label>

                  <button
                    onClick={() => setShowConfirmClear(true)}
                    className="p-2 rounded-lg bg-rose-50 hover:bg-rose-100 dark:bg-rose-950/50 text-rose-600 dark:text-rose-400 flex items-center gap-1"
                    title="Xóa toàn bộ danh sách"
                  >
                    <Trash2 className="w-3.5 h-3.5" />
                    <span className="hidden sm:inline">Xóa hết</span>
                  </button>
                </div>
              </div>

              {/* Students List Table */}
              <div className="border border-slate-200 dark:border-slate-800 rounded-xl overflow-hidden max-h-72 overflow-y-auto">
                <table className="w-full text-left text-xs">
                  <thead className="bg-slate-100 dark:bg-slate-800/80 text-slate-600 dark:text-slate-300 sticky top-0">
                    <tr>
                      <th className="py-2 px-3 w-12 text-center">STT</th>
                      <th className="py-2 px-3">Họ và tên</th>
                      <th className="py-2 px-3 w-28 text-center">Trạng thái</th>
                      <th className="py-2 px-3 w-20 text-right">Thao tác</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
                    {filteredStudents.length === 0 ? (
                      <tr>
                        <td colSpan={4} className="py-8 text-center text-slate-400">
                          Chưa có học sinh nào. Hãy dán danh sách hoặc thêm học sinh mới!
                        </td>
                      </tr>
                    ) : (
                      filteredStudents.map((st, idx) => (
                        <tr key={st.id} className="hover:bg-slate-50 dark:hover:bg-slate-800/50">
                          <td className="py-2 px-3 text-center text-slate-400 font-mono">
                            {idx + 1}
                          </td>
                          <td className="py-2 px-3 font-semibold text-slate-900 dark:text-white">
                            {editingStudentId === st.id ? (
                              <div className="flex items-center gap-1.5">
                                <input
                                  type="text"
                                  value={editingName}
                                  onChange={(e) => setEditingName(e.target.value)}
                                  className="p-1 text-xs border rounded bg-white dark:bg-slate-900 text-slate-900 dark:text-white flex-1"
                                  autoFocus
                                />
                                <button
                                  onClick={() => handleSaveEdit(st.id)}
                                  className="p-1 text-emerald-600 hover:text-emerald-700"
                                >
                                  <Check className="w-3.5 h-3.5" />
                                </button>
                                <button
                                  onClick={() => setEditingStudentId(null)}
                                  className="p-1 text-slate-400 hover:text-slate-600"
                                >
                                  <X className="w-3.5 h-3.5" />
                                </button>
                              </div>
                            ) : (
                              st.name
                            )}
                          </td>
                          <td className="py-2 px-3 text-center">
                            {st.called ? (
                              <span className="text-[11px] font-semibold text-emerald-600 dark:text-emerald-400 bg-emerald-50 dark:bg-emerald-950/60 px-2 py-0.5 rounded-full">
                                Đã gọi ({st.callCount})
                              </span>
                            ) : (
                              <span className="text-[11px] text-slate-400">Chưa gọi</span>
                            )}
                          </td>
                          <td className="py-2 px-3 text-right">
                            <div className="flex items-center justify-end gap-1">
                              <button
                                onClick={() => {
                                  setEditingStudentId(st.id);
                                  setEditingName(st.name);
                                }}
                                className="p-1 text-slate-400 hover:text-amber-500 rounded"
                                title="Sửa tên"
                              >
                                <Edit2 className="w-3.5 h-3.5" />
                              </button>
                              <button
                                onClick={() => handleDeleteStudent(st.id)}
                                className="p-1 text-slate-400 hover:text-rose-500 rounded"
                                title="Xóa học sinh"
                              >
                                <Trash2 className="w-3.5 h-3.5" />
                              </button>
                            </div>
                          </td>
                        </tr>
                      ))
                    )}
                  </tbody>
                </table>
              </div>
            </div>
          )}
        </div>

        {/* Clear All Confirmation Modal */}
        {showConfirmClear && (
          <div className="absolute inset-0 z-50 bg-slate-950/70 backdrop-blur-xs flex items-center justify-center p-4">
            <div className="bg-white dark:bg-slate-900 rounded-2xl p-5 max-w-sm w-full border border-rose-300 dark:border-rose-900 shadow-xl text-center">
              <div className="w-12 h-12 rounded-full bg-rose-100 dark:bg-rose-950 text-rose-600 mx-auto flex items-center justify-center mb-3">
                <Trash2 className="w-6 h-6" />
              </div>
              <h3 className="text-base font-bold text-slate-900 dark:text-white">
                Xóa toàn bộ học sinh?
              </h3>
              <p className="text-xs text-slate-500 dark:text-slate-400 mt-1">
                Thao tác này sẽ xóa sạch danh sách hiện tại. Thầy cô có chắc chắn muốn xóa?
              </p>
              <div className="flex justify-center gap-2 mt-4">
                <button
                  onClick={() => setShowConfirmClear(false)}
                  className="px-4 py-2 text-xs font-semibold rounded-lg bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300"
                >
                  Hủy bỏ
                </button>
                <button
                  onClick={handleClearAll}
                  className="px-4 py-2 text-xs font-bold rounded-lg bg-rose-600 hover:bg-rose-700 text-white"
                >
                  Xác nhận xóa
                </button>
              </div>
            </div>
          </div>
        )}

        {/* Footer */}
        <div className="px-6 py-3 border-t border-slate-100 dark:border-slate-800 bg-slate-50 dark:bg-slate-900/80 flex items-center justify-between">
          <span className="text-xs text-slate-500 dark:text-slate-400">
            Dữ liệu được lưu an toàn trong trình duyệt (không gửi lên máy chủ).
          </span>
          <button
            onClick={onClose}
            className="px-4 py-2 bg-slate-900 hover:bg-slate-800 dark:bg-slate-100 dark:hover:bg-white text-white dark:text-slate-900 text-xs font-bold rounded-xl transition-colors"
          >
            Đóng
          </button>
        </div>
      </div>
    </div>
  );
};
