import axios from 'axios';
import AsyncStorage from '@react-native-async-storage/async-storage';

const BASE_URL = 'http://localhost:8000';
const api = axios.create({ baseURL: BASE_URL, timeout: 15000 });

// 고유 userId 생성 및 저장
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

// localhost:8081/ 앞에 붙는 문제 자동 제거
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

// 게시물 분석 요청
export const analyzePost = async (url) => {
  const cleanedUrl = cleanUrl(url);
  const userId = await getUserId();
  const { data } = await api.post('/analyze', { url: cleanedUrl, user_id: userId });
  await saveHistory(cleanedUrl);
  return data;
};

// 반대 키워드 요청
export const getAntiKeywords = async () => {
  const userId = await getUserId();
  const { data } = await api.get(`/anti-keywords/${userId}`);
  return data;
};

// 주간 리포트
export const getWeeklyReport = async () => {
  const userId = await getUserId();
  const { data } = await api.get(`/report/${userId}`);
  return data;
};

// 히스토리 저장
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

// 히스토리 불러오기
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

// 히스토리 삭제
export const clearHistory = async () => {
  try {
    await AsyncStorage.removeItem('history');
  } catch {}
  try {
    localStorage.removeItem('history');
  } catch {}
};

// 데이터 초기화
export const resetUserData = async () => {
  const userId = await getUserId();
  await api.delete(`/reset/${userId}`);
};