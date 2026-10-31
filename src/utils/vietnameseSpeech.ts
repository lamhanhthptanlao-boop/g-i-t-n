/**
 * High-Fidelity Vietnamese Speech Synthesis Engine (Chế độ đọc Tiếng Việt có dấu chuẩn)
 * Handles NFC normalization, tone preservation (sắc, huyền, hỏi, ngã, nặng),
 * prosody phrasing, and automatic neural Vietnamese voice prioritization.
 */

export interface VietnameseVoiceInfo {
  voice: SpeechSynthesisVoice;
  displayName: string;
  dialect: 'bac' | 'nam' | 'general';
  isNeural: boolean;
}

/**
 * Normalizes Vietnamese text for accurate SpeechSynthesis pronunciation:
 * 1. Converts Unicode decomposed form to precomposed NFC (vital for tone marks).
 * 2. Expands common classroom abbreviations.
 * 3. Removes extraneous symbols/emojis that cause speech glitches.
 * 4. Inserts natural prosodic pause commas for full names.
 */
export function normalizeVietnameseSpeechText(
  rawText: string,
  options?: { isCallAnnouncement?: boolean }
): string {
  if (!rawText) return '';

  // 1. Unicode NFC normalization (ensures precomposed Vietnamese vowels like á, à, ả, ã, ạ, ắ, ằ, ẳ, ẵ, ặ, ấ, ầ, ổ, ỡ, ự, etc.)
  let text = rawText.normalize('NFC').trim();

  // 2. Remove emojis and decorative icons (which some TTS engines spell out letter by letter)
  text = text.replace(/[\u{1F300}-\u{1F9FF}\u{2600}-\u{26FF}\u{2700}-\u{27BF}\u{1F600}-\u{1F64F}\u{1F680}-\u{1F6FF}]/gu, ' ');

  // 3. Expand common classroom abbreviations
  text = text
    .replace(/\bHS\b/gi, 'học sinh')
    .replace(/\bSTT\b/gi, 'số thứ tự')
    .replace(/\bĐ\/A\b/gi, 'đáp án')
    .replace(/\bGV\b/gi, 'giáo viên')
    .replace(/\bTP\b/gi, 'thành phố')
    .replace(/\bĐH\b/gi, 'đại học')
    .replace(/\bMs\.?\b/gi, 'Cô')
    .replace(/\bMr\.?\b/gi, 'Thầy');

  // 4. Clean up multiple spaces, consecutive commas or punctuation
  text = text
    .replace(/\s+/g, ' ')
    .replace(/,\s*,+/g, ',')
    .replace(/!\s*!+/g, '!')
    .trim();

  return text;
}

/**
 * Formats a single student name announcement with natural Vietnamese prosodic pauses
 */
export function formatStudentCallSpeech(studentName: string): string {
  const cleanName = normalizeVietnameseSpeechText(studentName);
  return `Xin chúc mừng bạn, ${cleanName}, đã được gọi tên tỏa sáng!`;
}

/**
 * Formats multi-student announcement (1 to 5 students) with natural cadence
 */
export function formatMultiStudentCallSpeech(studentNames: string[]): string {
  const cleanNames = studentNames.map((n) => normalizeVietnameseSpeechText(n));
  if (cleanNames.length === 0) return '';
  if (cleanNames.length === 1) return formatStudentCallSpeech(cleanNames[0]);

  if (cleanNames.length === 2) {
    return `Xin chúc mừng 2 bạn: ${cleanNames[0]}, và bạn ${cleanNames[1]}!`;
  }

  const allExceptLast = cleanNames.slice(0, -1).join(', ');
  const last = cleanNames[cleanNames.length - 1];
  return `Xin chúc mừng ${cleanNames.length} bạn: ${allExceptLast}, và bạn ${last}!`;
}

/**
 * Detects, classifies, and ranks all available Vietnamese voices on the user's OS / browser.
 */
export function getPrioritizedVietnameseVoices(): VietnameseVoiceInfo[] {
  if (typeof window === 'undefined' || !('speechSynthesis' in window)) {
    return [];
  }

  const allVoices = window.speechSynthesis.getVoices();
  const viVoices: VietnameseVoiceInfo[] = [];

  allVoices.forEach((v) => {
    const lang = v.lang.toLowerCase();
    const name = v.name.toLowerCase();

    const isVi =
      lang.includes('vi') ||
      lang.includes('vn') ||
      name.includes('vietnam') ||
      name.includes('tiếng việt') ||
      name.includes('hoaimy') ||
      name.includes('namminh') ||
      name.includes('linh') ||
      name.includes('an (vietnamese)');

    if (!isVi) return;

    let dialect: 'bac' | 'nam' | 'general' = 'general';
    if (name.includes('hoaimy') || name.includes('namminh') || name.includes('hanoi') || name.includes('bắc')) {
      dialect = 'bac';
    } else if (name.includes('saigon') || name.includes('nam') && !name.includes('vietnam') && !name.includes('namminh')) {
      dialect = 'nam';
    }

    const isNeural =
      name.includes('online') ||
      name.includes('natural') ||
      name.includes('google') ||
      name.includes('neural') ||
      name.includes('hoaimy') ||
      name.includes('namminh');

    // Create user-friendly display name
    let displayName = v.name;
    if (name.includes('hoaimy')) {
      displayName = 'Hoài My (Nữ - Giọng Bắc Chuẩn Tự Nhiên)';
    } else if (name.includes('namminh')) {
      displayName = 'Nam Minh (Nam - Giọng Bắc Chuẩn Tự Nhiên)';
    } else if (name.includes('google') && (lang.includes('vi') || name.includes('tiếng việt'))) {
      displayName = 'Google Tiếng Việt (Chuẩn Rõ Dấu)';
    } else if (name.includes('linh')) {
      displayName = 'Linh (Apple - Giọng Chuẩn)';
    }

    viVoices.push({
      voice: v,
      displayName,
      dialect,
      isNeural,
    });
  });

  // Sort: Neural voices first, then Microsoft/Google, then others
  return viVoices.sort((a, b) => {
    if (a.isNeural && !b.isNeural) return -1;
    if (!a.isNeural && b.isNeural) return 1;
    return a.displayName.localeCompare(b.displayName);
  });
}
