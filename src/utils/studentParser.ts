import { Student } from '../types';

export const DEFAULT_STUDENTS: string[] = [
  'Nguyễn Minh Anh',
  'Trần Quốc Bảo',
  'Lê Ngọc Hà',
  'Phạm Gia Huy',
  'Hoàng Khánh Linh',
  'Võ Đức Minh',
  'Đặng Thảo Nguyên',
  'Bùi Tuấn Kiệt',
  'Ngô Phương Vy',
  'Đỗ Quang Khải',
  'Vũ Thu Trang',
  'Hồ Hoàng Nam',
  'Dương Bảo Châu',
  'Lý Hải Đăng',
  'Mai Quỳnh Anh',
  'Phan Thanh Tùng',
];

export const MC_CHEER_QUOTES: string[] = [
  '🐾 Meo meo! Ms. Mèo chúc mừng ngôi sao may mắn của lớp hôm nay!',
  '✨ Ms. Mèo vung đũa sao thần kỳ... Xin chúc mừng bạn!',
  '🐱 Meow! Điểm 10 tri thức đang chờ đón bạn tỏa sáng!',
  '🐾 Ms. Mèo vẫy đuôi khen ngợi, bạn đã xuất sắc lên sóng!',
  '🌟 Vũ trụ tri thức và cô giáo Ms. Mèo đã gọi tên bạn!',
  '🎉 Cả lớp cùng dành một tràng pháo tay meo meo thật to nào!',
  ' Micro đã sẵn sàng, Ms. Mèo mời bạn tự tin bước lên sân khấu!',
  '💖 Chúc mừng bạn! Ms. Mèo tin bạn sẽ trả lời xuất sắc 10 điểm!',
];

export interface ParseOptions {
  dedupMode: 'keep' | 'remove' | 'rename';
  stripNumbers: boolean;
  selectedColumnIndex?: number;
}

export function parsePastedStudentList(
  rawText: string,
  options: ParseOptions = { dedupMode: 'rename', stripNumbers: true }
): { students: Student[]; detectedColumns: string[][]; duplicatesFound: number } {
  if (!rawText || !rawText.trim()) {
    return { students: [], detectedColumns: [], duplicatesFound: 0 };
  }

  const lines = rawText
    .split(/\r?\n/)
    .map((l) => l.trim())
    .filter((l) => l.length > 0);

  // Check if lines contain tabular columns (tab or comma separated)
  const rows = lines.map((line) => {
    if (line.includes('\t')) {
      return line.split('\t').map((c) => c.trim());
    } else if (line.includes(',') && !line.includes('Nguyễn') && line.split(',').length >= 2) {
      return line.split(',').map((c) => c.trim());
    }
    return [line];
  });

  // Extract candidate names from row
  const rawNames: string[] = [];
  rows.forEach((row) => {
    let cell = '';
    if (options.selectedColumnIndex !== undefined && row[options.selectedColumnIndex] !== undefined) {
      cell = row[options.selectedColumnIndex];
    } else {
      // Auto-detect name column: find the longest text column or column with spaces
      const nameCol = row.reduce((best, curr) => {
        // Exclude purely numeric columns
        if (/^\d+$/.test(curr)) return best;
        return curr.length > best.length ? curr : best;
      }, row[0] || '');
      cell = nameCol;
    }

    if (!cell) return;

    // Remove leading numbering like "1. ", "01 - ", "1/ " if enabled
    let cleaned = cell;
    if (options.stripNumbers) {
      cleaned = cleaned.replace(/^(\d+[\.\-\/\)\s]+)/, '').trim();
    }

    if (cleaned.length > 0) {
      rawNames.push(cleaned);
    }
  });

  // Handle duplicates
  const nameCounts = new Map<string, number>();
  let duplicatesFound = 0;
  rawNames.forEach((name) => {
    const count = nameCounts.get(name) || 0;
    if (count > 0) duplicatesFound++;
    nameCounts.set(name, count + 1);
  });

  const finalNames: string[] = [];
  const tracker = new Map<string, number>();

  rawNames.forEach((name) => {
    const total = nameCounts.get(name) || 1;
    if (options.dedupMode === 'remove') {
      if (!finalNames.includes(name)) {
        finalNames.push(name);
      }
    } else if (options.dedupMode === 'rename' && total > 1) {
      const occurrence = (tracker.get(name) || 0) + 1;
      tracker.set(name, occurrence);
      finalNames.push(`${name} (${occurrence})`);
    } else {
      finalNames.push(name);
    }
  });

  const students: Student[] = finalNames.map((name, idx) => ({
    id: `student_${Date.now()}_${idx}_${Math.random().toString(36).substring(2, 7)}`,
    name,
    called: false,
    callCount: 0,
    seatRow: Math.floor(idx / 6),
    seatCol: idx % 6,
  }));

  return {
    students,
    detectedColumns: rows.length > 0 && rows[0].length > 1 ? rows.slice(0, 5) : [],
    duplicatesFound,
  };
}

export function exportStudentsToCSV(students: Student[], includeStats = true): string {
  const header = includeStats ? 'STT,Họ và tên,Đã gọi,Số lần gọi\n' : 'STT,Họ và tên\n';
  const rows = students.map((s, i) => {
    const safeName = `"${s.name.replace(/"/g, '""')}"`;
    if (includeStats) {
      return `${i + 1},${safeName},${s.called ? 'Có' : 'Chưa'},${s.callCount}`;
    }
    return `${i + 1},${safeName}`;
  });
  return '\uFEFF' + header + rows.join('\n'); // Add UTF-8 BOM so Excel opens Vietnamese properly
}
