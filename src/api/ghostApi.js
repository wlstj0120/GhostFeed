import axios from 'axios';
import AsyncStorage from '@react-native-async-storage/async-storage';

const BASE_URL = 'http://13.125.250.131:8000';
const api = axios.create({ baseURL: BASE_URL, timeout: 15000 });

export const getUserId = async () => {
  try {
    let userId = await AsyncStorage.getItem('userId');
    if (!userId) {
      userId = 'user_' + Date.now() + '_' + Math.random().toString(36).slice(2, 8);
      await AsyncStorage.setItem('userId', userId);
    }
    return userId;
  } catch {
    try {
      let userId = localStorage.getItem('userId');
      if (!userId) {
        userId = 'user_' + Date.now() + '_' + Math.random().toString(36).slice(2, 8);
        localStorage.setItem('userId', userId);
      }
      return userId;
    } catch {
      return 'user_default';
    }
  }
};

export const cleanUrl = (rawUrl) => {
  try {
    if (rawUrl.includes('localhost:8081/http')) {
      const realUrl = rawUrl.split('localhost:8081/')[1];
      if (realUrl) return realUrl;
    }
    return rawUrl;
  } catch {
    return rawUrl;
  }
};

export const analyzePost = async (url) => {
  const cleanedUrl = cleanUrl(url);
  const userId = await getUserId();
  const { data } = await api.post('/analyze', { url: cleanedUrl, user_id: userId });
  await saveHistory(cleanedUrl);
  return data;
};

export const selectCategories = async (categories) => {
  const userId = await getUserId();
  const { data } = await api.post('/select-categories', {
    categories,
    user_id: userId
  });
  return data;
};

export const getAntiKeywords = async (excludeIds = []) => {
  const userId = await getUserId();
  const excludeParam = excludeIds.length > 0 ? `?exclude=${excludeIds.join(',')}` : '';
  const { data } = await api.get(`/anti-keywords/${userId}${excludeParam}`);
  return data;
};

export const getWeeklyReport = async () => {
  const userId = await getUserId();
  const { data } = await api.get(`/report/${userId}`);
  return data;
};

export const saveHistory = async (url) => {
  try {
    const existing = await AsyncStorage.getItem('history');
    const history = existing ? JSON.parse(existing) : [];
    const newEntry = { url, date: new Date().toISOString() };
    const updated = [newEntry, ...history].slice(0, 50);
    await AsyncStorage.setItem('history', JSON.stringify(updated));
  } catch {
    try {
      const existing = localStorage.getItem('history');
      const history = existing ? JSON.parse(existing) : [];
      const newEntry = { url, date: new Date().toISOString() };
      const updated = [newEntry, ...history].slice(0, 50);
      localStorage.setItem('history', JSON.stringify(updated));
    } catch {}
  }
};

export const loadHistory = async () => {
  try {
    const existing = await AsyncStorage.getItem('history');
    if (existing) return JSON.parse(existing);
  } catch {}
  try {
    const existing = localStorage.getItem('history');
    return existing ? JSON.parse(existing) : [];
  } catch {}
  return [];
};

export const clearHistory = async () => {
  try {
    await AsyncStorage.removeItem('history');
  } catch {}
  try {
    localStorage.removeItem('history');
  } catch {}
};

export const resetUserData = async () => {
  const userId = await getUserId();
  await api.delete(`/reset/${userId}`);
};