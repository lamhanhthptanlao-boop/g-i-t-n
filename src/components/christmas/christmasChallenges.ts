import { ChristmasChallenge } from '../../types';

export const DEFAULT_CHRISTMAS_CHALLENGES: ChristmasChallenge[] = [
  { id: 'xmas_c1', text: 'Name five Christmas words.' },
  { id: 'xmas_c2', text: 'Sing a short Christmas song.' },
  { id: 'xmas_c3', text: 'Make a sentence using the present simple.' },
  { id: 'xmas_c4', text: 'Describe your favorite Christmas activity.' },
  { id: 'xmas_c5', text: 'Give three wishes to your classmates.' },
  { id: 'xmas_c6', text: 'Answer: What would you like for Christmas?' },
  { id: 'xmas_c7', text: 'Spell the word CHRISTMAS.' },
  { id: 'xmas_c8', text: 'Name three things you can see at Christmas.' },
  { id: 'xmas_c9', text: 'Make a sentence with the word GIFT.' },
  { id: 'xmas_c10', text: 'Say Merry Christmas in a funny voice.' },
];

export const CHRISTMAS_CHALLENGES_STORAGE_KEY = 'classroom_magic_xmas_challenges';
export const CHRISTMAS_STARS_STORAGE_KEY = 'classroom_magic_xmas_stars';

export function loadChristmasChallenges(): ChristmasChallenge[] {
  try {
    const raw = localStorage.getItem(CHRISTMAS_CHALLENGES_STORAGE_KEY);
    if (raw) {
      const parsed = JSON.parse(raw);
      if (Array.isArray(parsed) && parsed.length > 0) {
        return parsed;
      }
    }
  } catch {
    // Fallback
  }
  return DEFAULT_CHRISTMAS_CHALLENGES;
}

export function loadChristmasStars(): Record<string, number> {
  try {
    const raw = localStorage.getItem(CHRISTMAS_STARS_STORAGE_KEY);
    if (raw) {
      const parsed = JSON.parse(raw);
      if (parsed && typeof parsed === 'object') {
        return parsed;
      }
    }
  } catch {
    // Fallback
  }
  return {};
}
