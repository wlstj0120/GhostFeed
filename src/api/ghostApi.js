import axios from 'axios';
import AsyncStorage from '@react-native-async-storage/async-storage';

const BASE_URL = 'https://district-managing-unripe.ngrok-free.dev';

// ✅ 향상된 axios 인스턴스 - timeout + retry 인터셉터
const api = axios.create({ baseURL: BASE_URL, timeout: 20000 });

// ✅ 자동 retry 인터셉터 (최대 2회 재시도)
api.interceptors.response.use(
  res => res,
  async err => {
    const config = err.config;
    if (!config || config.__retryCount >= 2) return Promise.reject(err);
    config.__retryCount = (config.__retryCount || 0) + 1;
    // 네트워크 오류 또는 5xx 서버 오류만 재시도
    const shouldRetry = !err.response || err.response.status >= 500;
    if (!shouldRetry) return Promise.reject(err);
    await new Promise(res => setTimeout(res, 1000 * config.__retryCount));
    console.log(`🔄 재시도 ${config.__retryCount}회 - ${config.url}`);
    return api(config);
  }
);

// ✅ 에러 메시지 파싱 헬퍼
const parseError = (err) => {
  if (err.code === 'ECONNABORTED') return '서버 응답 시간 초과';
  if (!err.response) return '서버에 연결할 수 없어요';
  if (err.response.status === 404) return '데이터를 찾을 수 없어요';
  if (err.response.status >= 500) return '서버 오류가 발생했어요';
  return '알 수 없는 오류';
};

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
  try {
    const { data } = await api.post('/analyze', { url: cleanedUrl, user_id: userId });
    await saveHistory(cleanedUrl);
    return data;
  } catch (err) {
    throw new Error(parseError(err));
  }
};

export const selectCategories = async (categories) => {
  const userId = await getUserId();
  try {
    const { data } = await api.post('/select-categories', { categories, user_id: userId });
    return data;
  } catch (err) {
    throw new Error(parseError(err));
  }
};

export const analyzeHashtags = async (tags) => {
  const userId = await getUserId();
  try {
    const { data } = await api.post('/analyze-hashtags', { hashtags: tags, user_id: userId });
    return data;
  } catch (err) {
    throw new Error(parseError(err));
  }
};

export const getAntiKeywords = async (excludeIds = []) => {
  const userId = await getUserId();
  const excludeParam = excludeIds.length > 0 ? `?exclude=${excludeIds.join(',')}` : '';
  try {
    const { data } = await api.get(`/anti-keywords/${userId}${excludeParam}`);
    return data;
  } catch (err) {
    throw new Error(parseError(err));
  }
};

// 전체 리포트
export const getWeeklyReport = async () => {
  const userId = await getUserId();
  try {
    const { data } = await api.get(`/report/${userId}?platform=all`);
    return data;
  } catch (err) {
    throw new Error(parseError(err));
  }
};

// 유튜브 전용 리포트
export const getYoutubeReport = async () => {
  const userId = await getUserId();
  try {
    const { data } = await api.get(`/report/${userId}?platform=youtube`);
    return data;
  } catch (err) {
    throw new Error(parseError(err));
  }
};

// Reddit 전용 리포트
export const getRedditReport = async () => {
  const userId = await getUserId();
  try {
    const { data } = await api.get(`/report/${userId}?platform=reddit`);
    return data;
  } catch (err) {
    throw new Error(parseError(err));
  }
};

// ✅ 1번: 실시간 알고리즘 변화 추적
export const getAlgorithmTrend = async (platform = 'youtube') => {
  const userId = await getUserId();
  try {
    const { data } = await api.get(`/trend/${userId}?platform=${platform}`);
    return data;
  } catch (err) {
    // 트렌드 API 실패시 null 반환 (앱 크래시 방지)
    console.log('트렌드 조회 실패:', parseError(err));
    return null;
  }
};

// ✅ XAI 설명 조회
export const getXaiExplanation = async (platform = 'youtube') => {
  const userId = await getUserId();
  try {
    const { data } = await api.get(`/xai/${userId}?platform=${platform}`);
    return data;
  } catch (err) {
    console.log('XAI 조회 실패:', parseError(err));
    return null;
  }
};

// ✅ 커뮤니티 편향 비교 조회
export const getCommunityComparison = async (platform = 'youtube') => {
  const userId = await getUserId();
  try {
    const { data } = await api.get(`/community/${userId}?platform=${platform}`);
    return data;
  } catch (err) {
    console.log('커뮤니티 비교 조회 실패:', parseError(err));
    return null;
  }
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
  try { await AsyncStorage.removeItem('history'); } catch {}
  try { localStorage.removeItem('history'); } catch {}
};

export const resetUserData = async () => {
  const userId = await getUserId();
  try {
    await api.delete(`/reset/${userId}`);
  } catch (err) {
    throw new Error(parseError(err));
  }
};
