import React, { useState, useEffect } from 'react';
import { catLogo } from '../assets/images';
import { Student, SavedClass } from '../types';
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
  BookmarkCheck,
  FolderPlus,
  Save,
  Layers,
} from 'lucide-react';

interface StudentManagerModalProps {
  isOpen: boolean;
  students: Student[];
  savedClasses: SavedClass[];
  activeClassId: string;
  initialTab?: 'paste' | 'manage' | 'classes';
  onUpdateStudents: (newStudents: Student[]) => void;
  onSelectClass: (classId: string) => void;
  onSaveAsNewClass: (name: string, classStudents?: Student[]) => void;
  onRenameClass: (classId: string, newName: string) => void;
  onDeleteClass: (classId: string) => void;
  onClose: () => void;
}

export const StudentManagerModal: React.FC<StudentManagerModalProps> = ({
  isOpen,
  students,
  savedClasses,
  activeClassId,
  initialTab = 'paste',
  onUpdateStudents,
  onSelectClass,
  onSaveAsNewClass,
  onRenameClass,
  onDeleteClass,
  onClose,
}) => {
  const [activeTab, setActiveTab] = useState<'paste' | 'manage' | 'classes'>(initialTab);
  const [pasteText, setPasteText] = useState<string>('');
  const [dedupMode, setDedupMode] = useState<'keep' | 'remove' | 'rename'>('rename');
  const [stripNumbers, setStripNumbers] = useState<boolean>(true);
  const [importMode, setImportMode] = useState<'replace' | 'append'>('replace');
  const [importTargetMode, setImportTargetMode] = useState<'current' | 'new_class'>('current');
  const [importNewClassName, setImportNewClassName] = useState<string>('');
  const [selectedColIndex, setSelectedColIndex] = useState<number>(0);
  const [detectedColumnsPreview, setDetectedColumnsPreview] = useState<string[][]>([]);

  // Search & Edit states
  const [searchQuery, setSearchQuery] = useState<string>('');
  const [editingStudentId, setEditingStudentId] = useState<string | null>(null);
  const [editingName, setEditingName] = useState<string>('');
  const [newStudentName, setNewStudentName] = useState<string>('');
  const [copySuccess, setCopySuccess] = useState<boolean>(false);
  const [showConfirmClear, setShowConfirmClear] = useState<boolean>(false);

  // Saved Classes management states
  const [showSaveClassBox, setShowSaveClassBox] = useState<boolean>(false);
  const [newClassNameInput, setNewClassNameInput] = useState<string>('');
  const [saveBoxMode, setSaveBoxMode] = useState<'copy_current' | 'empty'>('copy_current');
  const [editingClassId, setEditingClassId] = useState<string | null>(null);
  const [editingClassName, setEditingClassName] = useState<string>('');
  const [confirmDeleteClassId, setConfirmDeleteClassId] = useState<string | null>(null);
  const [classNotice, setClassNotice] = useState<string | null>(null);

  const activeClass = savedClasses.find((c) => c.id === activeClassId) || savedClasses[0];

  useEffect(() => {
    if (isOpen && initialTab) {
      setActiveTab(initialTab);
    }
  }, [isOpen, initialTab]);

  const showNotice = (msg: string) => {
    setClassNotice(msg);
    setTimeout(() => {
      setClassNotice((prev) => (prev === msg ? null : prev));
    }, 2600);
  };

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

    if (importTargetMode === 'new_class') {
      const targetName =
        importNewClassName.trim() || `Lớp ${savedClasses.length + 1}`;
      onSaveAsNewClass(targetName, parsed.students);
      setImportNewClassName('');
      setImportTargetMode('current');
      showNotice(`Đã tạo và lưu lớp "${targetName}" (${parsed.students.length} học sinh)`);
    } else if (importMode === 'replace') {
      onUpdateStudents(parsed.students);
      showNotice(`Đã cập nhật danh sách vào "${activeClass?.name || 'Lớp hiện tại'}"`);
    } else {
      // Append mode
      onUpdateStudents([...students, ...parsed.students]);
      showNotice(`Đã thêm ${parsed.students.length} học sinh vào "${activeClass?.name || 'Lớp hiện tại'}"`);
    }

    setPasteText('');
    setActiveTab('manage');
  };

  const handleCreateOrSaveClass = (e?: React.FormEvent) => {
    if (e) e.preventDefault();
    const targetName =
      newClassNameInput.trim() || `Lớp ${savedClasses.length + 1}`;
    const initialList =
      saveBoxMode === 'copy_current'
        ? students.map((s, idx) => ({
            ...s,
            id: `student_${Date.now()}_${idx}_${Math.random().toString(36).substring(2, 5)}`,
          }))
        : [];
    onSaveAsNewClass(targetName, initialList);
    setNewClassNameInput('');
    setShowSaveClassBox(false);
    showNotice(
      saveBoxMode === 'copy_current'
        ? `Đã lưu lớp "${targetName}" (${initialList.length} học sinh)`
        : `Đã tạo lớp mới "${targetName}"`
    );
  };

  const handleSaveRenameClass = (classId: string) => {
    if (!editingClassName.trim()) return;
    onRenameClass(classId, editingClassName.trim());
    showNotice(`Đã đổi tên thành "${editingClassName.trim()}"`);
    setEditingClassId(null);
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
                src={catLogo}
                alt="Logo Mèo"
                className="w-full h-full object-cover"
              />
            </div>
            <div>
              <h2 className="text-lg font-bold text-slate-900 dark:text-white flex items-center gap-2">
                <span>Quản Lý Danh Sách &amp; Lưu Lớp</span>
              </h2>
              <p className="text-xs text-slate-500 dark:text-slate-400">
                Đang chọn: <span className="font-bold text-indigo-600 dark:text-indigo-400">{activeClass?.name || 'Lớp mặc định'}</span>
                <span aria-hidden="true" className="mx-1.5">·</span>
                <span className="font-bold text-amber-600 dark:text-amber-400 tabular-nums">{students.length}</span> học sinh
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

        {/* Saved Classes Quick Switcher & Save Strip */}
        <div className="px-6 py-2.5 bg-slate-50/90 dark:bg-slate-800/50 border-b border-slate-100 dark:border-slate-800 flex flex-col gap-2">
          <div className="flex flex-wrap items-center justify-between gap-2">
            <div className="flex items-center gap-1.5 flex-wrap">
              <span className="text-[11px] font-bold uppercase tracking-wider text-slate-500 dark:text-slate-400 mr-1">
                Lớp đã lưu:
              </span>
              {savedClasses.map((cls) => {
                const isActive = cls.id === activeClass?.id;
                return (
                  <button
                    key={cls.id}
                    type="button"
                    onClick={() => {
                      onSelectClass(cls.id);
                      showNotice(`Đã chuyển sang "${cls.name}"`);
                    }}
                    className={`px-2.5 py-1 rounded-lg text-xs font-bold transition-all whitespace-nowrap shrink-0 flex items-center gap-1.5 ${
                      isActive
                        ? 'bg-indigo-600 text-white shadow-xs'
                        : 'bg-white dark:bg-slate-800 text-slate-700 dark:text-slate-300 border border-slate-200 dark:border-slate-700 hover:border-indigo-400'
                    }`}
                  >
                    <span>{cls.name}</span>
                    <span className={`text-[10px] font-mono tabular-nums ${isActive ? 'text-indigo-100' : 'text-slate-400'}`}>
                      ({cls.students.length})
                    </span>
                  </button>
                );
              })}
            </div>

            <button
              type="button"
              onClick={() => {
                setSaveBoxMode('copy_current');
                setShowSaveClassBox((prev) => !prev);
              }}
              className="px-3 py-1 rounded-lg bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-bold shadow-xs transition-colors flex items-center gap-1.5 whitespace-nowrap shrink-0"
            >
              <FolderPlus className="w-3.5 h-3.5" />
              <span>Lưu thành lớp mới</span>
            </button>
          </div>

          {/* Inline Save Class Form */}
          {showSaveClassBox && (
            <form
              onSubmit={handleCreateOrSaveClass}
              className="p-2.5 rounded-xl bg-white dark:bg-slate-900 border border-emerald-300 dark:border-emerald-800 flex flex-wrap items-center gap-2 text-xs"
            >
              <input
                type="text"
                value={newClassNameInput}
                onChange={(e) => setNewClassNameInput(e.target.value)}
                placeholder="Nhập tên lớp (VD: 10A1, Lớp 6B)..."
                className="flex-1 min-w-[180px] px-3 py-1.5 rounded-lg border border-slate-300 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 text-slate-900 dark:text-white focus:outline-hidden focus:ring-2 focus:ring-emerald-500"
                autoFocus
              />
              <select
                value={saveBoxMode}
                onChange={(e) => setSaveBoxMode(e.target.value as 'copy_current' | 'empty')}
                className="px-2.5 py-1.5 rounded-lg border border-slate-300 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 text-slate-800 dark:text-slate-200"
              >
                <option value="copy_current">Lưu danh sách hiện tại ({students.length} HS)</option>
                <option value="empty">Tạo lớp trống mới</option>
              </select>
              <button
                type="submit"
                className="px-3.5 py-1.5 rounded-lg bg-emerald-600 hover:bg-emerald-700 text-white font-bold flex items-center gap-1"
              >
                <Save className="w-3.5 h-3.5" />
                <span>Lưu lớp</span>
              </button>
              <button
                type="button"
                onClick={() => setShowSaveClassBox(false)}
                className="px-2.5 py-1.5 rounded-lg bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-300 font-semibold"
              >
                Hủy
              </button>
            </form>
          )}

          {classNotice && (
            <div className="text-xs font-semibold text-emerald-700 dark:text-emerald-300 flex items-center gap-1.5">
              <Check className="w-3.5 h-3.5" />
              <span>{classNotice}</span>
            </div>
          )}
        </div>

        {/* Tab navigation */}
        <div className="flex border-b border-slate-100 dark:border-slate-800 px-6 bg-slate-50/50 dark:bg-slate-900/50 overflow-x-auto">
          <button
            onClick={() => setActiveTab('paste')}
            className={`py-3 px-4 text-xs font-bold border-b-2 transition-colors flex items-center gap-2 whitespace-nowrap shrink-0 ${
              activeTab === 'paste'
                ? 'border-amber-500 text-amber-600 dark:text-amber-400'
                : 'border-transparent text-slate-500 hover:text-slate-800 dark:hover:text-slate-300'
            }`}
          >
            <ClipboardPaste className="w-4 h-4" />
            <span>Dán danh sách nhanh</span>
          </button>
          <button
            onClick={() => setActiveTab('manage')}
            className={`py-3 px-4 text-xs font-bold border-b-2 transition-colors flex items-center gap-2 whitespace-nowrap shrink-0 ${
              activeTab === 'manage'
                ? 'border-amber-500 text-amber-600 dark:text-amber-400'
                : 'border-transparent text-slate-500 hover:text-slate-800 dark:hover:text-slate-300'
            }`}
          >
            <UserPlus className="w-4 h-4" />
            <span>Danh sách chi tiết ({students.length})</span>
          </button>
          <button
            onClick={() => setActiveTab('classes')}
            className={`py-3 px-4 text-xs font-bold border-b-2 transition-colors flex items-center gap-2 whitespace-nowrap shrink-0 ${
              activeTab === 'classes'
                ? 'border-indigo-500 text-indigo-600 dark:text-indigo-400'
                : 'border-transparent text-slate-500 hover:text-slate-800 dark:hover:text-slate-300'
            }`}
          >
            <Layers className="w-4 h-4" />
            <span>Lưu &amp; Quản lý lớp ({savedClasses.length})</span>
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
                    disabled={importTargetMode === 'new_class'}
                    className="w-full p-2 rounded-lg border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-800 dark:text-slate-200 disabled:opacity-50"
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

              {/* Target class save option during paste */}
              <div className="p-3 bg-indigo-50/70 dark:bg-indigo-950/30 border border-indigo-200 dark:border-indigo-900 rounded-xl text-xs flex flex-wrap items-center gap-3">
                <span className="font-bold text-indigo-900 dark:text-indigo-200">Lưu danh sách vào:</span>
                <label className="flex items-center gap-1.5 cursor-pointer font-medium text-slate-700 dark:text-slate-300">
                  <input
                    type="radio"
                    name="importTarget"
                    checked={importTargetMode === 'current'}
                    onChange={() => setImportTargetMode('current')}
                    className="text-indigo-600 focus:ring-indigo-500"
                  />
                  <span>Lớp hiện tại ({activeClass?.name || 'Lớp mặc định'})</span>
                </label>
                <label className="flex items-center gap-1.5 cursor-pointer font-medium text-slate-700 dark:text-slate-300">
                  <input
                    type="radio"
                    name="importTarget"
                    checked={importTargetMode === 'new_class'}
                    onChange={() => setImportTargetMode('new_class')}
                    className="text-indigo-600 focus:ring-indigo-500"
                  />
                  <span>Tạo &amp; lưu thành lớp mới</span>
                </label>
                {importTargetMode === 'new_class' && (
                  <input
                    type="text"
                    value={importNewClassName}
                    onChange={(e) => setImportNewClassName(e.target.value)}
                    placeholder={`Tên lớp mới (VD: Lớp ${savedClasses.length + 1})`}
                    className="flex-1 min-w-[180px] px-3 py-1.5 rounded-lg border border-indigo-300 dark:border-indigo-700 bg-white dark:bg-slate-900 text-slate-900 dark:text-white focus:outline-hidden focus:ring-2 focus:ring-indigo-500"
                  />
                )}
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
          ) : activeTab === 'manage' ? (
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
                    type="button"
                    onClick={() => {
                      setSaveBoxMode('copy_current');
                      setShowSaveClassBox(true);
                    }}
                    className="p-2 rounded-lg bg-emerald-50 hover:bg-emerald-100 dark:bg-emerald-950/50 text-emerald-700 dark:text-emerald-300 font-semibold flex items-center gap-1"
                    title="Lưu danh sách này thành lớp riêng"
                  >
                    <BookmarkCheck className="w-3.5 h-3.5" />
                    <span className="hidden sm:inline">Lưu lớp</span>
                  </button>

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
          ) : (
            <div className="space-y-4">
              {/* Save current list as a named class form */}
              <form
                onSubmit={handleCreateOrSaveClass}
                className="p-3.5 rounded-2xl bg-slate-50 dark:bg-slate-800/60 border border-slate-200 dark:border-slate-700 flex flex-col gap-2.5"
              >
                <div className="flex items-center justify-between">
                  <span className="text-xs font-bold text-slate-800 dark:text-slate-100 flex items-center gap-1.5">
                    <BookmarkCheck className="w-4 h-4 text-emerald-600" />
                    <span>Lưu lớp học mới vào trình duyệt</span>
                  </span>
                  <span className="text-[11px] text-slate-500 dark:text-slate-400">
                    Tự động lưu danh sách &amp; lượt gọi riêng từng lớp
                  </span>
                </div>
                <div className="flex flex-wrap gap-2">
                  <input
                    type="text"
                    value={newClassNameInput}
                    onChange={(e) => setNewClassNameInput(e.target.value)}
                    placeholder="Nhập tên lớp (VD: 10A1, Lớp 7C, Tổ 1)..."
                    className="flex-1 min-w-[200px] px-3 py-2 text-xs rounded-xl border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-900 text-slate-900 dark:text-white focus:outline-hidden focus:ring-2 focus:ring-indigo-500"
                  />
                  <select
                    value={saveBoxMode}
                    onChange={(e) => setSaveBoxMode(e.target.value as 'copy_current' | 'empty')}
                    className="px-3 py-2 text-xs rounded-xl border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-900 text-slate-800 dark:text-slate-200"
                  >
                    <option value="copy_current">Lưu danh sách hiện tại ({students.length} HS)</option>
                    <option value="empty">Tạo lớp trống mới</option>
                  </select>
                  <button
                    type="submit"
                    className="px-4 py-2 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-bold flex items-center gap-1.5 shadow-xs transition-colors"
                  >
                    <Save className="w-3.5 h-3.5" />
                    <span>Lưu lớp</span>
                  </button>
                </div>
              </form>

              {/* Saved Classes List */}
              <div className="border border-slate-200 dark:border-slate-800 rounded-xl overflow-hidden max-h-72 overflow-y-auto">
                <table className="w-full text-left text-xs">
                  <thead className="bg-slate-100 dark:bg-slate-800/80 text-slate-600 dark:text-slate-300 sticky top-0">
                    <tr>
                      <th className="py-2.5 px-3">Tên lớp</th>
                      <th className="py-2.5 px-3 w-24 text-center">Sĩ số</th>
                      <th className="py-2.5 px-3 w-28 text-center">Đã gọi</th>
                      <th className="py-2.5 px-3 w-48 text-right">Thao tác</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
                    {savedClasses.map((cls) => {
                      const isActive = cls.id === activeClass?.id;
                      const calledInClass = cls.students.filter((s) => s.called).length;
                      return (
                        <tr
                          key={cls.id}
                          className={
                            isActive
                              ? 'bg-indigo-50/70 dark:bg-indigo-950/30'
                              : 'hover:bg-slate-50 dark:hover:bg-slate-800/50'
                          }
                        >
                          <td className="py-2.5 px-3 font-semibold text-slate-900 dark:text-white">
                            {editingClassId === cls.id ? (
                              <div className="flex items-center gap-1.5">
                                <input
                                  type="text"
                                  value={editingClassName}
                                  onChange={(e) => setEditingClassName(e.target.value)}
                                  onKeyDown={(e) => {
                                    if (e.key === 'Enter') handleSaveRenameClass(cls.id);
                                    if (e.key === 'Escape') setEditingClassId(null);
                                  }}
                                  className="p-1 text-xs border rounded bg-white dark:bg-slate-900 text-slate-900 dark:text-white flex-1"
                                  autoFocus
                                />
                                <button
                                  type="button"
                                  onClick={() => handleSaveRenameClass(cls.id)}
                                  className="p-1 text-emerald-600 hover:text-emerald-700"
                                >
                                  <Check className="w-3.5 h-3.5" />
                                </button>
                                <button
                                  type="button"
                                  onClick={() => setEditingClassId(null)}
                                  className="p-1 text-slate-400 hover:text-slate-600"
                                >
                                  <X className="w-3.5 h-3.5" />
                                </button>
                              </div>
                            ) : (
                              <div className="flex items-center gap-2">
                                <span>{cls.name}</span>
                                {isActive && (
                                  <span className="text-[10px] font-bold text-indigo-600 dark:text-indigo-400">
                                    · Đang chọn
                                  </span>
                                )}
                              </div>
                            )}
                          </td>
                          <td className="py-2.5 px-3 text-center font-mono tabular-nums text-slate-700 dark:text-slate-300">
                            {cls.students.length} HS
                          </td>
                          <td className="py-2.5 px-3 text-center font-mono tabular-nums text-slate-500 dark:text-slate-400">
                            {calledInClass}/{cls.students.length}
                          </td>
                          <td className="py-2.5 px-3 text-right">
                            <div className="flex items-center justify-end gap-1.5">
                              {!isActive && (
                                <button
                                  type="button"
                                  onClick={() => {
                                    onSelectClass(cls.id);
                                    showNotice(`Đã mở lớp "${cls.name}"`);
                                  }}
                                  className="px-2.5 py-1 rounded-lg bg-indigo-600 hover:bg-indigo-700 text-white text-[11px] font-bold"
                                >
                                  Chọn lớp
                                </button>
                              )}
                              <button
                                type="button"
                                onClick={() => {
                                  setEditingClassId(cls.id);
                                  setEditingClassName(cls.name);
                                }}
                                className="p-1.5 text-slate-400 hover:text-amber-500 rounded-lg hover:bg-slate-100 dark:hover:bg-slate-800"
                                title="Đổi tên lớp"
                              >
                                <Edit2 className="w-3.5 h-3.5" />
                              </button>
                              <button
                                type="button"
                                onClick={() => {
                                  const copyName = `${cls.name} (Bản sao)`;
                                  const cloned = cls.students.map((s, idx) => ({
                                    ...s,
                                    id: `student_${Date.now()}_${idx}_${Math.random().toString(36).substring(2, 5)}`,
                                    called: false,
                                    callCount: 0,
                                  }));
                                  onSaveAsNewClass(copyName, cloned);
                                  showNotice(`Đã nhân bản thành "${copyName}"`);
                                }}
                                className="p-1.5 text-slate-400 hover:text-indigo-500 rounded-lg hover:bg-slate-100 dark:hover:bg-slate-800"
                                title="Nhân bản lớp (làm mới lượt gọi)"
                              >
                                <Copy className="w-3.5 h-3.5" />
                              </button>
                              {confirmDeleteClassId === cls.id ? (
                                <div className="flex items-center gap-1">
                                  <button
                                    type="button"
                                    onClick={() => {
                                      onDeleteClass(cls.id);
                                      setConfirmDeleteClassId(null);
                                      showNotice(`Đã xóa lớp "${cls.name}"`);
                                    }}
                                    className="px-2 py-0.5 rounded bg-rose-600 text-white text-[10px] font-bold"
                                  >
                                    Xóa
                                  </button>
                                  <button
                                    type="button"
                                    onClick={() => setConfirmDeleteClassId(null)}
                                    className="px-1.5 py-0.5 rounded bg-slate-200 dark:bg-slate-700 text-slate-700 dark:text-slate-200 text-[10px]"
                                  >
                                    Hủy
                                  </button>
                                </div>
                              ) : (
                                <button
                                  type="button"
                                  onClick={() => setConfirmDeleteClassId(cls.id)}
                                  className="p-1.5 text-slate-400 hover:text-rose-500 rounded-lg hover:bg-slate-100 dark:hover:bg-slate-800"
                                  title={
                                    savedClasses.length <= 1
                                      ? 'Làm mới lớp này'
                                      : 'Xóa lớp này'
                                  }
                                >
                                  <Trash2 className="w-3.5 h-3.5" />
                                </button>
                              )}
                            </div>
                          </td>
                        </tr>
                      );
                    })}
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
