import {
  StyleSheet, Text, View, TextInput, TouchableOpacity,
  Alert, ActivityIndicator, ScrollView, StatusBar, Modal,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useState, useEffect, useCallback } from 'react';
import { useFocusEffect } from '@react-navigation/native';
import * as Clipboard from 'expo-clipboard';
import {
  analyzePost, loadHistory, clearHistory,
  selectCategories, analyzeHashtags, resetUserData,
} from '../api/ghostApi';

const CATEGORIES = [
  { id: '게임·엔터', label: '🎮 게임·엔터', color: '#ff5f95' },
  { id: '과학·기술', label: '🔬 과학·기술', color: '#7b61ff' },
  { id: '문화·예술', label: '🎨 문화·예술', color: '#ffb84d' },
  { id: '음식·여행', label: '🍜 음식·여행', color: '#00c896' },
  { id: '건강·라이프', label: '💪 건강·라이프', color: '#3b82f6' },
  { id: '정치·사회', label: '📰 정치·사회', color: '#ff7a59' },
  { id: '경제·경영', label: '💼 경제·경영', color: '#22c55e' },
];

const CAT_COLORS = [
  '#3182f6', '#7b61ff', '#ff5c7a', '#00c896',
  '#ffb84d', '#ff7a59', '#22c55e', '#06b6d4',
  '#f43f5e', '#a855f7', '#84cc16', '#f97316',
];

function isYoutubeUrl(url) {
  return url.includes('youtube.com') || url.includes('youtu.be');
}
function isRedditUrl(url) {
  return url.includes('reddit.com') || url.includes('redd.it');
}
function detectPlatform(url) {
  if (isYoutubeUrl(url)) return 'youtube';
  if (isRedditUrl(url)) return 'reddit';
  return null;
}

// ✅ 분석 결과 카테고리 카드 컴포넌트
function AnalysisResultCard({ result, onClose }) {
  if (!result) return null;
  const categories = result.categories || [];
  const topCat = categories[0];

  return (
    <View style={styles.resultCard}>
      <View style={styles.resultHeader}>
        <Text style={styles.resultTitle}>✅ 분석 완료!</Text>
        <TouchableOpacity onPress={onClose}>
          <Text style={styles.resultClose}>✕</Text>
        </TouchableOpacity>
      </View>

      {/* 분류된 카테고리 */}
      {topCat && (
        <View style={styles.resultTopCat}>
          <Text style={styles.resultTopCatLabel}>주요 카테고리</Text>
          <View style={[styles.resultTopCatBadge, { backgroundColor: CAT_COLORS[0] + '20' }]}>
            <Text style={[styles.resultTopCatText, { color: CAT_COLORS[0] }]}>
              {topCat.name} {topCat.percent}%
            </Text>
          </View>
        </View>
      )}

      {/* 카테고리 분포 바 */}
      {categories.slice(0, 5).map((cat, i) => {
        const color = CAT_COLORS[i % CAT_COLORS.length];
        return (
          <View key={cat.name} style={styles.resultRow}>
            <Text style={styles.resultCatName} numberOfLines={1}>{cat.name}</Text>
            <View style={styles.resultBarBg}>
              <View style={[styles.resultBarFill, { width: `${cat.percent}%`, backgroundColor: color }]} />
            </View>
            <Text style={[styles.resultCatPct, { color }]}>{cat.percent}%</Text>
          </View>
        );
      })}

      <Text style={styles.resultHint}>
        {result.source_type === 'reddit' ? '🤖 Reddit' : '▶ YouTube'} 콘텐츠로 분석됐어요
      </Text>
    </View>
  );
}

export default function HomeScreen({ navigation, sharedUrl, onSharedUrlUsed }) {
  const insets = useSafeAreaInsets();
  const [mode, setMode] = useState('youtube');
  const [youtubeUrl, setYoutubeUrl] = useState('');
  const [redditUrl, setRedditUrl] = useState('');
  const [loading, setLoading] = useState(false);
  const [history, setHistory] = useState([]);
  const [selectedCats, setSelectedCats] = useState([]);
  const [catLoading, setCatLoading] = useState(false);
  const [clipboardBanner, setClipboardBanner] = useState(null);
  const [analysisResult, setAnalysisResult] = useState(null); // ✅ 분석 결과
  const [resetModalVisible, setResetModalVisible] = useState(false); // ✅ 초기화 모달

  useFocusEffect(
    useCallback(() => {
      loadHistory().then(setHistory);
      checkClipboard();
    }, [])
  );

  const checkClipboard = async () => {
    try {
      const text = await Clipboard.getStringAsync();
      if (!text) return;
      const platform = detectPlatform(text.trim());
      if (!platform) return;
      if (platform === 'youtube' && youtubeUrl === text.trim()) return;
      if (platform === 'reddit' && redditUrl === text.trim()) return;
      setClipboardBanner({ url: text.trim(), platform });
    } catch {}
  };

  const applyClipboard = () => {
    if (!clipboardBanner) return;
    const { url, platform } = clipboardBanner;
    setMode(platform);
    if (platform === 'youtube') setYoutubeUrl(url);
    else if (platform === 'reddit') setRedditUrl(url);
    setClipboardBanner(null);
  };

  useEffect(() => {
    if (!sharedUrl) return;
    const platform = detectPlatform(sharedUrl);
    if (platform === 'youtube') {
      setMode('youtube');
      setYoutubeUrl(sharedUrl);
      setTimeout(() => autoAnalyze(sharedUrl, 'youtube'), 500);
    } else if (platform === 'reddit') {
      setMode('reddit');
      setRedditUrl(sharedUrl);
      setTimeout(() => autoAnalyze(sharedUrl, 'reddit'), 500);
    } else {
      setMode('youtube');
      setYoutubeUrl(sharedUrl);
    }
    onSharedUrlUsed?.();
  }, [sharedUrl]);

  const autoAnalyze = async (url, type) => {
    setLoading(true);
    try {
      const result = await analyzePost(url);
      loadHistory().then(setHistory);
      // ✅ 분석 결과 카드 표시
      if (result?.categories) setAnalysisResult(result);
      navigation.navigate('파괴', { refresh: Date.now() });
    } catch (e) {
      Alert.alert('오류', '서버 연결 실패');
    } finally {
      setLoading(false);
    }
  };

  const handleYoutubeAnalyze = async () => {
    if (!youtubeUrl.trim()) {
      Alert.alert('알림', 'YouTube URL을 입력해주세요');
      return;
    }
    if (!isYoutubeUrl(youtubeUrl)) {
      Alert.alert('알림', 'YouTube URL 형식이 아니에요\nyoutube.com 또는 youtu.be 링크를 입력해주세요');
      return;
    }
    setLoading(true);
    setAnalysisResult(null);
    try {
      const result = await analyzePost(youtubeUrl);
      loadHistory().then(setHistory);
      // ✅ 분석 결과 카드 표시 후 파괴 탭으로
      if (result?.categories) {
        setAnalysisResult(result);
      } else {
        navigation.navigate('파괴', { refresh: Date.now() });
      }
    } catch (e) {
      Alert.alert('오류', e.message || '서버 연결 실패');
    } finally {
      setLoading(false);
    }
  };

  const handleRedditAnalyze = async () => {
    if (!redditUrl.trim()) {
      Alert.alert('알림', 'Reddit URL을 입력해주세요');
      return;
    }
    if (!isRedditUrl(redditUrl)) {
      Alert.alert('알림', 'Reddit URL 형식이 아니에요\nreddit.com 링크를 입력해주세요');
      return;
    }
    setLoading(true);
    setAnalysisResult(null);
    try {
      const result = await analyzePost(redditUrl);
      loadHistory().then(setHistory);
      if (result?.categories) {
        setAnalysisResult(result);
      } else {
        navigation.navigate('파괴', { refresh: Date.now() });
      }
    } catch (e) {
      Alert.alert('오류', e.message || '서버 연결 실패');
    } finally {
      setLoading(false);
    }
  };

  const toggleCategory = (catId) => {
    setSelectedCats(prev => prev.includes(catId) ? prev.filter(c => c !== catId) : [...prev, catId]);
  };

  const handleCategoryAnalyze = async () => {
    if (selectedCats.length === 0) {
      Alert.alert('알림', '카테고리를 선택해주세요');
      return;
    }
    setCatLoading(true);
    try {
      await selectCategories(selectedCats);
      navigation.navigate('파괴', { refresh: Date.now() });
    } catch (e) {
      Alert.alert('오류', '서버 연결 실패');
    } finally {
      setCatLoading(false);
    }
  };

  const handleClearHistory = () => { setHistory([]); clearHistory(); };

  // ✅ 전체 데이터 초기화
  const handleResetAll = async () => {
    try {
      await resetUserData();
      await clearHistory();
      setHistory([]);
      setAnalysisResult(null);
      setResetModalVisible(false);
      Alert.alert('완료', '모든 분석 데이터가 초기화됐어요! 👻');
    } catch (e) {
      Alert.alert('오류', '초기화 실패. 서버를 확인해주세요.');
    }
  };

  const formatDate = (iso) => {
    const d = new Date(iso);
    return `${d.getMonth() + 1}/${d.getDate()} ${d.getHours()}:${String(d.getMinutes()).padStart(2, '0')}`;
  };

  const shortenUrl = (u) => {
    try { return new URL(u).hostname; }
    catch { return u.slice(0, 30) + '...'; }
  };

  return (
    <View style={styles.wrapper}>
      <StatusBar barStyle="dark-content" backgroundColor="#f6f8fb" />
      <ScrollView
        style={styles.container}
        showsVerticalScrollIndicator={false}
        contentContainerStyle={{ paddingBottom: insets.bottom + 80 }}
      >
        {/* 헤더 */}
        <View style={styles.header}>
          <View style={styles.logoCircle}>
            <Text style={styles.logoEmoji}>👻</Text>
          </View>
          <Text style={styles.title}>Ghost Feed</Text>
          <Text style={styles.subtitle}>알고리즘 편향을 분석하고{'\n'}새로운 콘텐츠를 발견해보세요</Text>
          {/* ✅ 데이터 초기화 버튼 */}
          <TouchableOpacity
            style={styles.resetBtn}
            onPress={() => setResetModalVisible(true)}
          >
            <Text style={styles.resetBtnText}>🗑 데이터 초기화</Text>
          </TouchableOpacity>
        </View>

        {/* 클립보드 감지 배너 */}
        {clipboardBanner && (
          <View style={[
            styles.clipboardBanner,
            clipboardBanner.platform === 'reddit' && styles.clipboardBannerReddit,
          ]}>
            <View style={{ flex: 1 }}>
              <Text style={[
                styles.clipboardBannerTitle,
                clipboardBanner.platform === 'reddit' && { color: '#c2410c' },
              ]}>
                {clipboardBanner.platform === 'reddit' ? '🤖 Reddit URL 감지!' : '▶ YouTube URL 감지!'}
              </Text>
              <Text style={styles.clipboardBannerUrl} numberOfLines={1}>{clipboardBanner.url}</Text>
            </View>
            <View style={styles.clipboardBannerButtons}>
              <TouchableOpacity
                style={[styles.clipboardApplyBtn, clipboardBanner.platform === 'reddit' && styles.clipboardApplyBtnReddit]}
                onPress={applyClipboard}
              >
                <Text style={styles.clipboardApplyText}>붙여넣기</Text>
              </TouchableOpacity>
              <TouchableOpacity style={styles.clipboardDismissBtn} onPress={() => setClipboardBanner(null)}>
                <Text style={styles.clipboardDismissText}>✕</Text>
              </TouchableOpacity>
            </View>
          </View>
        )}

        {/* ✅ 분석 결과 카드 */}
        {analysisResult && (
          <AnalysisResultCard
            result={analysisResult}
            onClose={() => {
              setAnalysisResult(null);
              navigation.navigate('파괴', { refresh: Date.now() });
            }}
          />
        )}

        {/* 탭 선택 */}
        <View style={styles.modeBox}>
          <TouchableOpacity
            style={[styles.modeButton, mode === 'youtube' && styles.modeButtonActive]}
            onPress={() => setMode('youtube')}
          >
            <Text style={[styles.modeButtonText, mode === 'youtube' && styles.modeButtonTextActive]}>▶ YouTube</Text>
          </TouchableOpacity>
          <TouchableOpacity
            style={[styles.modeButton, mode === 'reddit' && styles.modeButtonActiveReddit]}
            onPress={() => setMode('reddit')}
          >
            <Text style={[styles.modeButtonText, mode === 'reddit' && styles.modeButtonTextActiveReddit]}>🤖 Reddit</Text>
          </TouchableOpacity>
          <TouchableOpacity
            style={[styles.modeButton, mode === 'category' && styles.modeButtonActive]}
            onPress={() => setMode('category')}
          >
            <Text style={[styles.modeButtonText, mode === 'category' && styles.modeButtonTextActive]}>🎯 카테고리</Text>
          </TouchableOpacity>
        </View>

        {/* YouTube 탭 */}
        {mode === 'youtube' && (
          <View style={styles.card}>
            <View style={styles.cardTitleRow}>
              <Text style={styles.cardTitleEmoji}>▶</Text>
              <Text style={styles.cardTitle}>YouTube URL 분석</Text>
            </View>
            <Text style={styles.cardDesc}>유튜브 영상 URL을 붙여넣거나{'\n'}유튜브 앱에서 공유하기로 바로 분석하세요</Text>
            <TextInput
              style={styles.input}
              placeholder="https://youtube.com/watch?v=..."
              placeholderTextColor="#9ca3af"
              value={youtubeUrl}
              onChangeText={setYoutubeUrl}
              autoCapitalize="none"
            />
            <TouchableOpacity
              style={[styles.mainButton, loading && styles.disabledButton]}
              onPress={handleYoutubeAnalyze}
              disabled={loading}
            >
              {loading
                ? <ActivityIndicator color="#fff" />
                : <Text style={styles.mainButtonText}>분석 시작하기</Text>}
            </TouchableOpacity>
          </View>
        )}

        {/* Reddit 탭 */}
        {mode === 'reddit' && (
          <View style={[styles.card, styles.redditCard]}>
            <View style={styles.cardTitleRow}>
              <Text style={styles.cardTitleEmoji}>🤖</Text>
              <Text style={styles.cardTitle}>Reddit 분석</Text>
            </View>
            <Text style={styles.cardDesc}>Reddit 게시물 URL을 붙여넣거나{'\n'}Reddit 앱에서 공유하기로 바로 분석하세요</Text>
            <TextInput
              style={styles.input}
              placeholder="https://reddit.com/r/..."
              placeholderTextColor="#9ca3af"
              value={redditUrl}
              onChangeText={setRedditUrl}
              autoCapitalize="none"
            />
            <TouchableOpacity
              style={[styles.mainButton, styles.redditButton, loading && styles.disabledButton]}
              onPress={handleRedditAnalyze}
              disabled={loading}
            >
              {loading
                ? <ActivityIndicator color="#fff" />
                : <Text style={styles.mainButtonText}>분석 시작하기</Text>}
            </TouchableOpacity>
          </View>
        )}

        {/* 카테고리 탭 */}
        {mode === 'category' && (
          <View style={styles.card}>
            <View style={styles.cardTitleRow}>
              <Text style={styles.cardTitleEmoji}>🎯</Text>
              <Text style={styles.cardTitle}>자주 보는 콘텐츠 선택</Text>
            </View>
            <View style={styles.categoryWrap}>
              {CATEGORIES.map((cat) => {
                const selected = selectedCats.includes(cat.id);
                return (
                  <TouchableOpacity
                    key={cat.id}
                    style={[styles.categoryButton, selected && { backgroundColor: cat.color, borderColor: cat.color }]}
                    onPress={() => toggleCategory(cat.id)}
                  >
                    <Text style={[styles.categoryText, selected && { color: '#fff' }]}>{cat.label}</Text>
                  </TouchableOpacity>
                );
              })}
            </View>
            <TouchableOpacity
              style={[styles.mainButton, (catLoading || selectedCats.length === 0) && styles.disabledButton]}
              onPress={handleCategoryAnalyze}
              disabled={catLoading || selectedCats.length === 0}
            >
              {catLoading
                ? <ActivityIndicator color="#fff" />
                : <Text style={styles.mainButtonText}>추천 콘텐츠 받기</Text>}
            </TouchableOpacity>
          </View>
        )}

        {/* 최근 분석 기록 */}
        {history.length > 0 && (mode === 'youtube' || mode === 'reddit') && (
          <View style={styles.historyCard}>
            <View style={styles.historyHeader}>
              <Text style={styles.historyTitle}>최근 분석 기록</Text>
              <TouchableOpacity onPress={handleClearHistory}>
                <Text style={styles.deleteText}>전체 삭제</Text>
              </TouchableOpacity>
            </View>
            {history.slice(0, 5).map((item, i) => (
              <TouchableOpacity
                key={i}
                style={styles.historyItem}
                onPress={() => {
                  if (isRedditUrl(item.url)) {
                    setMode('reddit');
                    setRedditUrl(item.url);
                  } else {
                    setMode('youtube');
                    setYoutubeUrl(item.url);
                  }
                }}
              >
                <View style={[styles.historyDot, isRedditUrl(item.url) && styles.historyDotReddit]} />
                <View style={{ flex: 1 }}>
                  <Text style={styles.historyUrl}>{shortenUrl(item.url)}</Text>
                  <Text style={styles.historyDate}>{formatDate(item.date)}</Text>
                </View>
                <Text style={styles.historyType}>
                  {isRedditUrl(item.url) ? '🤖' : '▶'}
                </Text>
              </TouchableOpacity>
            ))}
          </View>
        )}

        <View style={styles.infoBox}>
          <Text style={styles.infoTitle}>Ghost Feed 사용 방법</Text>
          <View style={styles.infoRow}>
            <Text style={styles.infoEmoji}>1️⃣</Text>
            <Text style={styles.infoText}>YouTube 또는 Reddit 공유하기 버튼 → Ghost Feed 선택</Text>
          </View>
          <View style={styles.infoRow}>
            <Text style={styles.infoEmoji}>2️⃣</Text>
            <Text style={styles.infoText}>AI가 알고리즘 편향 자동 분석</Text>
          </View>
          <View style={styles.infoRow}>
            <Text style={styles.infoEmoji}>3️⃣</Text>
            <Text style={styles.infoText}>완전 반대 장르 콘텐츠 추천 제공</Text>
          </View>
        </View>

        <View style={{ height: 10 }} />
      </ScrollView>

      {/* ✅ 데이터 초기화 확인 모달 */}
      <Modal
        visible={resetModalVisible}
        transparent
        animationType="fade"
        onRequestClose={() => setResetModalVisible(false)}
      >
        <View style={styles.modalOverlay}>
          <View style={styles.modalBox}>
            <Text style={styles.modalEmoji}>🗑</Text>
            <Text style={styles.modalTitle}>데이터 초기화</Text>
            <Text style={styles.modalDesc}>
              모든 분석 기록과 편향 데이터가 삭제돼요.{'\n'}잘못 넣은 데이터를 지우고 싶을 때 사용하세요.
            </Text>
            <View style={styles.modalBtns}>
              <TouchableOpacity
                style={styles.modalCancelBtn}
                onPress={() => setResetModalVisible(false)}
              >
                <Text style={styles.modalCancelText}>취소</Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={styles.modalResetBtn}
                onPress={handleResetAll}
              >
                <Text style={styles.modalResetText}>초기화</Text>
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>
    </View>
  );
}

const styles = StyleSheet.create({
  wrapper: { flex: 1, backgroundColor: '#f6f8fb' },
  container: { flex: 1, paddingHorizontal: 20 },
  header: { alignItems: 'center', marginTop: 20, marginBottom: 30 },
  logoCircle: { width: 90, height: 90, borderRadius: 45, backgroundColor: '#ffffff', alignItems: 'center', justifyContent: 'center', marginBottom: 16, shadowColor: '#000', shadowOpacity: 0.08, shadowRadius: 12, elevation: 4 },
  logoEmoji: { fontSize: 42 },
  title: { fontSize: 34, fontWeight: '800', color: '#111827', marginBottom: 10 },
  subtitle: { fontSize: 15, color: '#6b7280', textAlign: 'center', lineHeight: 24, marginBottom: 14 },

  // ✅ 초기화 버튼
  resetBtn: { backgroundColor: '#fff0f0', borderRadius: 20, paddingHorizontal: 16, paddingVertical: 8, borderWidth: 1, borderColor: '#fecaca' },
  resetBtnText: { fontSize: 13, color: '#ef4444', fontWeight: '700' },

  // ✅ 분석 결과 카드
  resultCard: { backgroundColor: '#ffffff', borderRadius: 22, padding: 20, marginBottom: 20, shadowColor: '#000', shadowOpacity: 0.06, shadowRadius: 12, elevation: 4, borderWidth: 1.5, borderColor: '#bfdbfe' },
  resultHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 14 },
  resultTitle: { fontSize: 16, fontWeight: '800', color: '#111827' },
  resultClose: { fontSize: 16, color: '#9ca3af', fontWeight: '600', padding: 4 },
  resultTopCat: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginBottom: 14 },
  resultTopCatLabel: { fontSize: 13, color: '#6b7280', fontWeight: '600' },
  resultTopCatBadge: { paddingHorizontal: 12, paddingVertical: 6, borderRadius: 20 },
  resultTopCatText: { fontSize: 13, fontWeight: '800' },
  resultRow: { flexDirection: 'row', alignItems: 'center', marginBottom: 10 },
  resultCatName: { width: 80, fontSize: 12, color: '#374151', fontWeight: '600' },
  resultBarBg: { flex: 1, height: 8, backgroundColor: '#f3f4f6', borderRadius: 8, marginHorizontal: 8, overflow: 'hidden' },
  resultBarFill: { height: 8, borderRadius: 8 },
  resultCatPct: { width: 36, fontSize: 12, fontWeight: '700', textAlign: 'right' },
  resultHint: { fontSize: 12, color: '#9ca3af', marginTop: 10, textAlign: 'center' },

  clipboardBanner: { backgroundColor: '#EBF4FF', borderRadius: 16, padding: 14, marginBottom: 16, flexDirection: 'row', alignItems: 'center', borderWidth: 1, borderColor: '#BFDBFE' },
  clipboardBannerReddit: { backgroundColor: '#FFF3EE', borderColor: '#FFD0B5' },
  clipboardBannerTitle: { fontSize: 13, fontWeight: '700', color: '#1E40AF', marginBottom: 3 },
  clipboardBannerUrl: { fontSize: 11, color: '#6B7280' },
  clipboardBannerButtons: { flexDirection: 'row', alignItems: 'center', gap: 8, marginLeft: 10 },
  clipboardApplyBtn: { backgroundColor: '#3182f6', borderRadius: 10, paddingHorizontal: 14, paddingVertical: 8 },
  clipboardApplyBtnReddit: { backgroundColor: '#ff4500' },
  clipboardApplyText: { color: '#fff', fontSize: 12, fontWeight: '700' },
  clipboardDismissBtn: { padding: 6 },
  clipboardDismissText: { fontSize: 14, color: '#9CA3AF', fontWeight: '600' },

  modeBox: { flexDirection: 'row', backgroundColor: '#e5e7eb', borderRadius: 14, padding: 4, marginBottom: 20 },
  modeButton: { flex: 1, paddingVertical: 12, borderRadius: 10, alignItems: 'center' },
  modeButtonActive: { backgroundColor: '#ffffff' },
  modeButtonActiveReddit: { backgroundColor: '#ffffff' },
  modeButtonText: { fontSize: 11, fontWeight: '700', color: '#6b7280' },
  modeButtonTextActive: { color: '#111827' },
  modeButtonTextActiveReddit: { color: '#ff4500' },

  card: { backgroundColor: '#ffffff', borderRadius: 22, padding: 20, marginBottom: 20, shadowColor: '#000', shadowOpacity: 0.05, shadowRadius: 10, elevation: 3 },
  redditCard: { borderWidth: 1.5, borderColor: '#ffd9c0' },
  cardTitleRow: { flexDirection: 'row', alignItems: 'center', gap: 8, marginBottom: 6 },
  cardTitleEmoji: { fontSize: 20 },
  cardTitle: { fontSize: 18, fontWeight: '700', color: '#111827' },
  cardDesc: { fontSize: 13, color: '#6b7280', lineHeight: 20, marginBottom: 16 },
  input: { backgroundColor: '#f3f4f6', borderRadius: 14, padding: 16, fontSize: 14, color: '#111827', marginBottom: 16 },
  mainButton: { backgroundColor: '#3182f6', borderRadius: 16, paddingVertical: 16, alignItems: 'center' },
  redditButton: { backgroundColor: '#ff4500' },
  disabledButton: { opacity: 0.5 },
  mainButtonText: { color: '#fff', fontSize: 16, fontWeight: '700' },

  categoryWrap: { flexDirection: 'row', flexWrap: 'wrap', gap: 10, marginBottom: 16 },
  categoryButton: { backgroundColor: '#f3f4f6', borderRadius: 20, paddingHorizontal: 14, paddingVertical: 10, borderWidth: 1, borderColor: '#e5e7eb' },
  categoryText: { fontSize: 13, color: '#374151', fontWeight: '600' },

  historyCard: { backgroundColor: '#ffffff', borderRadius: 22, padding: 20, marginBottom: 20, shadowColor: '#000', shadowOpacity: 0.05, shadowRadius: 10, elevation: 3 },
  historyHeader: { flexDirection: 'row', justifyContent: 'space-between', marginBottom: 14 },
  historyTitle: { fontSize: 17, fontWeight: '700', color: '#111827' },
  deleteText: { fontSize: 13, color: '#ef4444', fontWeight: '600' },
  historyItem: { flexDirection: 'row', alignItems: 'center', paddingVertical: 12, borderBottomWidth: 1, borderBottomColor: '#f3f4f6' },
  historyDot: { width: 10, height: 10, borderRadius: 5, backgroundColor: '#3182f6', marginRight: 12 },
  historyDotReddit: { backgroundColor: '#ff4500' },
  historyUrl: { fontSize: 14, fontWeight: '600', color: '#111827' },
  historyDate: { fontSize: 12, color: '#9ca3af', marginTop: 3 },
  historyType: { fontSize: 16, marginLeft: 8 },

  infoBox: { backgroundColor: '#ffffff', borderRadius: 22, padding: 20, shadowColor: '#000', shadowOpacity: 0.05, shadowRadius: 10, elevation: 3 },
  infoTitle: { fontSize: 18, fontWeight: '700', color: '#111827', marginBottom: 16 },
  infoRow: { flexDirection: 'row', alignItems: 'flex-start', marginBottom: 14 },
  infoEmoji: { fontSize: 18, marginRight: 12 },
  infoText: { fontSize: 14, color: '#4b5563', flex: 1, lineHeight: 22 },

  // ✅ 초기화 모달
  modalOverlay: { flex: 1, backgroundColor: 'rgba(0,0,0,0.5)', alignItems: 'center', justifyContent: 'center' },
  modalBox: { backgroundColor: '#ffffff', borderRadius: 24, padding: 28, width: '82%', alignItems: 'center', shadowColor: '#000', shadowOpacity: 0.1, shadowRadius: 20, elevation: 8 },
  modalEmoji: { fontSize: 44, marginBottom: 12 },
  modalTitle: { fontSize: 20, fontWeight: '800', color: '#111827', marginBottom: 10 },
  modalDesc: { fontSize: 14, color: '#6b7280', textAlign: 'center', lineHeight: 22, marginBottom: 24 },
  modalBtns: { flexDirection: 'row', gap: 12, width: '100%' },
  modalCancelBtn: { flex: 1, backgroundColor: '#f3f4f6', borderRadius: 14, padding: 15, alignItems: 'center' },
  modalCancelText: { color: '#6b7280', fontWeight: '600' },
  modalResetBtn: { flex: 1, backgroundColor: '#ef4444', borderRadius: 14, padding: 15, alignItems: 'center' },
  modalResetText: { color: '#fff', fontWeight: '700' },
});
