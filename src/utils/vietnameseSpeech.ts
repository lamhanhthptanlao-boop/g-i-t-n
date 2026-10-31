/**
 * High-Fidelity Vietnamese Speech Synthesis Engine (Chế độ đọc Tiếng Việt có dấu chuẩn)
 * Handles NFC normalization, tone preservation (sắc, huyền, hỏi, ngã, nặng),
 * prosody phrasing, standard Google & Microsoft voice presets, and dynamic browser detection.
 */

export interface VietnameseVoiceInfo {
  voice: SpeechSynthesisVoice;
  displayName: string;
  dialect: 'Bắc' | 'Nam' | 'Toàn quốc';
  isNeural: boolean;
  provider: 'Google' | 'Microsoft' | 'Apple' | 'Khác';
}

export interface StandardVoicePreset {
  id: string; // Preset ID or explicit voiceURI
  name: string;
  provider: 'Google' | 'Microsoft' | 'Apple' | 'Hệ thống';
  description: string;
  dialect: 'Bắc' | 'Nam' | 'Toàn quốc';
  gender: 'Nữ' | 'Nam' | 'Tự động';
  badge: string;
  matchingKeywords: string[];
}

/**
 * Curated list of Google & Microsoft standard Vietnamese voice presets
 * so teachers can select their favorite voice even before voices are fully loaded by the browser.
 */
export const STANDARD_VIETNAMESE_VOICE_PRESETS: StandardVoicePreset[] = [
  {
    id: '',
    name: '✨ Tự động (Ưu tiên giọng chuẩn tự nhiên nhất)',
    provider: 'Hệ thống',
    description: 'Tự động phát hiện và chọn giọng Microsoft Natural hoặc Google Tiếng Việt tốt nhất',
    dialect: 'Toàn quốc',
    gender: 'Tự động',
    badge: 'Tự động',
    matchingKeywords: [],
  },
  {
    id: 'Microsoft HoaiMy Online (Natural) - Vietnamese (Vietnam)',
    name: '👩 Microsoft Hoài My (Online Natural)',
    provider: 'Microsoft',
    description: 'Giọng nữ Bắc chuẩn, ngữ điệu truyền cảm, trong trẻo trên Edge & Windows 10/11',
    dialect: 'Bắc',
    gender: 'Nữ',
    badge: 'Edge / Windows',
    matchingKeywords: ['hoaimy', 'hoài my', 'hoai my'],
  },
  {
    id: 'Microsoft NamMinh Online (Natural) - Vietnamese (Vietnam)',
    name: '👨 Microsoft Nam Minh (Online Natural)',
    provider: 'Microsoft',
    description: 'Giọng nam Bắc chuẩn, dõng dạc, ấm áp, uy nghiêm trên Edge & Windows 10/11',
    dialect: 'Bắc',
    gender: 'Nam',
    badge: 'Edge / Windows',
    matchingKeywords: ['namminh', 'nam minh'],
  },
  {
    id: 'Google tiếng Việt',
    name: '🌐 Google Tiếng Việt (Chuẩn rõ dấu)',
    provider: 'Google',
    description: 'Giọng chuẩn của Google Chrome & Android, phát âm tròn vành rõ từng dấu câu',
    dialect: 'Toàn quốc',
    gender: 'Nữ',
    badge: 'Chrome / Android',
    matchingKeywords: ['google tiếng việt', 'google tieng viet', 'google vi-vn', 'vi-vn-x-vic'],
  },
  {
    id: 'Linh',
    name: '🍎 Apple Linh (macOS / iOS)',
    provider: 'Apple',
    description: 'Giọng đọc tiếng Việt tích hợp tự nhiên trên máy Mac, iPad và iPhone',
    dialect: 'Nam',
    gender: 'Nữ',
    badge: 'Apple Mac/iOS',
    matchingKeywords: ['linh', 'mai'],
  },
  {
    id: 'vi-VN',
    name: '🇻🇳 Bộ đọc Tiếng Việt chuẩn hệ điều hành (vi-VN)',
    provider: 'Hệ thống',
    description: 'Sử dụng bộ giải mã âm vị tiếng Việt chuẩn có sẵn của hệ điều hành',
    dialect: 'Toàn quốc',
    gender: 'Tự động',
    badge: 'Chuẩn vi-VN',
    matchingKeywords: ['vi-vn', 'vi_vn', 'vietnam', 'vietnamese'],
  },
];

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
      lang.startsWith('vi') ||
      lang.includes('vn') ||
      name.includes('vietnam') ||
      name.includes('tiếng việt') ||
      name.includes('tieng viet') ||
      name.includes('hoaimy') ||
      name.includes('namminh') ||
      name.includes('linh') ||
      name.includes('mai') ||
      name.includes('an (vietnamese)');

    if (!isVi) return;

    let dialect: 'Bắc' | 'Nam' | 'Toàn quốc' = 'Toàn quốc';
    if (name.includes('hoaimy') || name.includes('namminh') || name.includes('hanoi') || name.includes('bắc')) {
      dialect = 'Bắc';
    } else if (name.includes('saigon') || name.includes('nam') && !name.includes('vietnam') && !name.includes('namminh')) {
      dialect = 'Nam';
    }

    const isNeural =
      name.includes('online') ||
      name.includes('natural') ||
      name.includes('google') ||
      name.includes('neural') ||
      name.includes('hoaimy') ||
      name.includes('namminh');

    let provider: 'Google' | 'Microsoft' | 'Apple' | 'Khác' = 'Khác';
    if (name.includes('google')) {
      provider = 'Google';
    } else if (name.includes('microsoft')) {
      provider = 'Microsoft';
    } else if (name.includes('apple') || name.includes('linh')) {
      provider = 'Apple';
    }

    // Create user-friendly display name
    let displayName = v.name;
    if (name.includes('hoaimy')) {
      displayName = '👩 Microsoft Hoài My (Nữ - Giọng Bắc Chuẩn Tự Nhiên)';
    } else if (name.includes('namminh')) {
      displayName = '👨 Microsoft Nam Minh (Nam - Giọng Bắc Chuẩn Tự Nhiên)';
    } else if (name.includes('google') && (lang.includes('vi') || name.includes('tiếng việt') || name.includes('tieng viet'))) {
      displayName = '🌐 Google Tiếng Việt (Chuẩn Rõ Dấu)';
    } else if (name.includes('linh')) {
      displayName = '🍎 Apple Linh (Nữ - Giọng Chuẩn iOS/macOS)';
    } else if (name.includes('mai')) {
      displayName = '🍎 Apple Mai (Nữ - Giọng Chuẩn iOS/macOS)';
    }

    viVoices.push({
      voice: v,
      displayName,
      dialect,
      isNeural,
      provider,
    });
  });

  // Sort: Neural voices first, then Microsoft/Google, then others
  return viVoices.sort((a, b) => {
    if (a.isNeural && !b.isNeural) return -1;
    if (!a.isNeural && b.isNeural) return 1;
    return a.displayName.localeCompare(b.displayName);
  });
}

/**
 * Intelligent voice matcher that connects user preferences or presets to actual browser voices.
 */
export function findBestMatchingVietnameseVoice(
  targetURI: string | undefined | null,
  allVoices: SpeechSynthesisVoice[]
): SpeechSynthesisVoice | undefined {
  if (!allVoices || allVoices.length === 0) return undefined;

  const viVoices = allVoices.filter((v) => {
    const l = v.lang.toLowerCase();
    const n = v.name.toLowerCase();
    return (
      l.startsWith('vi') ||
      l.includes('vn') ||
      n.includes('vietnam') ||
      n.includes('tiếng việt') ||
      n.includes('tieng viet') ||
      n.includes('hoaimy') ||
      n.includes('namminh') ||
      n.includes('linh')
    );
  });

  // 1. Direct match on voiceURI or name
  if (targetURI && targetURI !== 'auto') {
    const exactMatch = allVoices.find(
      (v) => v.voiceURI === targetURI || v.name === targetURI
    );
    if (exactMatch) return exactMatch;

    // Keyword matching for presets
    const lowerTarget = targetURI.toLowerCase();
    if (lowerTarget.includes('hoaimy') || lowerTarget.includes('hoài my')) {
      const match = viVoices.find((v) => v.name.toLowerCase().includes('hoaimy'));
      if (match) return match;
    }
    if (lowerTarget.includes('namminh') || lowerTarget.includes('nam minh')) {
      const match = viVoices.find((v) => v.name.toLowerCase().includes('namminh'));
      if (match) return match;
    }
    if (lowerTarget.includes('google')) {
      const match = viVoices.find((v) => v.name.toLowerCase().includes('google'));
      if (match) return match;
    }
    if (lowerTarget.includes('linh') || lowerTarget.includes('apple')) {
      const match = viVoices.find((v) => v.name.toLowerCase().includes('linh'));
      if (match) return match;
    }

    // Partial substring match
    const subMatch = viVoices.find(
      (v) =>
        v.voiceURI.toLowerCase().includes(lowerTarget) ||
        v.name.toLowerCase().includes(lowerTarget)
    );
    if (subMatch) return subMatch;
  }

  // 2. Default priority if targetURI is empty or preset didn't match directly:
  // Preference order: Microsoft Natural (Hoài My / Nam Minh) -> Google Tiếng Việt -> Apple Linh -> any vi voice
  if (viVoices.length > 0) {
    const bestNatural =
      viVoices.find((v) => v.name.includes('HoaiMy') || v.name.includes('Hoài My')) ||
      viVoices.find((v) => v.name.includes('NamMinh') || v.name.includes('Nam Minh')) ||
      viVoices.find((v) => v.name.includes('Google') || v.name.toLowerCase().includes('tiếng việt')) ||
      viVoices.find((v) => v.name.includes('Natural') || v.name.includes('Online')) ||
      viVoices.find((v) => v.name.includes('Linh')) ||
      viVoices[0];
    return bestNatural;
  }

  return undefined;
}
