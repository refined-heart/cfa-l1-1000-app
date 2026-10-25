import Storage from 'expo-sqlite/kv-store';

const KEY = 'cfa1000_progress_v1';

export const EMPTY_PROGRESS = {
  answers: {},
  wrong: {},
  mastered: {},
  favorites: {},
};

export async function loadProgress() {
  try {
    const raw = await Storage.getItem(KEY);
    if (!raw) return EMPTY_PROGRESS;
    return { ...EMPTY_PROGRESS, ...JSON.parse(raw) };
  } catch (e) {
    return EMPTY_PROGRESS;
  }
}

export async function saveProgress(progress) {
  await Storage.setItem(KEY, JSON.stringify(progress));
}

export async function clearProgress() {
  await Storage.removeItem(KEY);
}
