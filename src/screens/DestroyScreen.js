import {
  StyleSheet, Text, View, FlatList, TouchableOpacity,
  Image, Linking, Modal, TextInput, ActivityIndicator,
} from 'react-native';
import { useState, useCallback, useRef } from 'react';
import { useFocusEffect } from '@react-navigation/native';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { getAntiKeywords, getAlgorithmTrend } from '../api/ghostApi';

const GOAL_KEY = 'weekly_goal';
// ✅ 플랫폼별 watched 키 분리
const WATCHED_YOUTUBE_KEY = 'watched_youtube';
const WATCHED_REDDIT_KEY = 'watched_reddit';

function TrendAlertBanner({ trend }) {
  if (!trend) return null;
  const algoChange = trend.algorithm_change;
  const catSpike = trend.category_spike;
  if (!algoChange?.message && !catSpike?.detected) return null;
  const isUrgent = algoChange?.alert_level === 'warning' || catSpike?.detected;

  return (
    <View style={[styles.trendBanner, isUrgent && styles.trendBannerUrgent]}>
      <View style={styles.trendBannerHeader}>
        <Text style={styles.trendBannerIcon}>{isUrgent ? '🚨' : '📡'}</Text>
        <Text style={[styles.trendBannerTitle, isUrgent && styles.trendBannerTitleUrgent]}>
          {isUrgent ? '알고리즘 변화 감지!' : '알고리즘 추적 중'}
        </Text>
        <View style={[styles.trendLevelBadge, { backgroundColor: isUrgent ? '#ff3b30' : '#3182f6' }]}>
          <Text style={styles.trendLevelText}>{isUrgent ? '주의' : '정상'}</Text>
        </View>
      </View>
      {algoChange?.message && <Text style={styles.trendBannerMsg}>{algoChange.message}</Text>}
      {catSpike?.detected && catSpike?.message && (
        <Text style={[styles.trendBannerMsg, { marginTop: 4 }]}>{catSpike.message}</Text>
      )}
      <View style={styles.trendStats}>
        <View style={styles.trendStat}>
          <Text style={styles.trendStatValue}>{trend.current_bias}</Text>
          <Text style={styles.trendStatLabel}>현재 편향</Text>
        </View>
        <View style={styles.trendStat}>
          <Text style={[styles.trendStatValue, { color: algoChange?.recent_change > 0 ? '#ff3b30' : '#34c759' }]}>
            {algoChange?.recent_change > 0 ? '+' : ''}{algoChange?.recent_change ?? 0}
          </Text>
          <Text style={styles.trendStatLabel}>최근 변화</Text>
        </View>
        <View style={styles.trendStat}>
          <Text style={[styles.trendStatValue, {
            color: algoChange?.trend === '상승' ? '#ff3b30' : algoChange?.trend === '하락' ? '#34c759' : '#6b7280'
          }]}>
            {algoChange?.trend === '상승' ? '📈' : algoChange?.trend === '하락' ? '📉' : '➡️'} {algoChange?.trend ?? '안정'}
          </Text>
          <Text style={styles.trendStatLabel}>추세</Text>
        </View>
      </View>
    </View>
  );
}

function RedditCard({ item, watched, onWatch, onToggle }) {
  const hasThumb = item.thumbnail && item.thumbnail.startsWith('http');
  return (
    <View style={[styles.card, watched[item.videoId] && styles.cardWatched, styles.redditCard]}>
      <View style={styles.redditHeader}>
        <View style={styles.redditIconWrap}>
          <Text style={styles.redditIcon}>🤖</Text>
        </View>
        <View style={{ flex: 1 }}>
          <Text style={styles.redditHeaderTitle}>r/{item.subreddit || item.keyword}</Text>
          <Text style={styles.redditHeaderSub}>Reddit 커뮤니티</Text>
        </View>
        {item.score > 0 && (
          <View style={styles.scoreWrap}>
            <Text style={styles.scoreText}>⬆️ {item.score.toLocaleString()}</Text>
          </View>
        )}
      </View>
      {hasThumb ? (
        <TouchableOpacity onPress={() => onWatch(item)} activeOpacity={0.9}>
          <Image source={{ uri: item.thumbnail }} style={styles.redditThumbnail} />
          {watched[item.videoId] && (
            <View style={styles.watchedOverlay}>
              <Text style={styles.watchedOverlayText}>✅ 확인 완료</Text>
            </View>
          )}
        </TouchableOpacity>
      ) : (
        <TouchableOpacity style={styles.redditBanner} onPress={() => onWatch(item)} activeOpacity={0.9}>
          <Text style={styles.redditBannerEmoji}>💬</Text>
          <Text style={styles.redditBannerText}>r/{item.subreddit || item.keyword}</Text>
        </TouchableOpacity>
      )}
      <View style={styles.cardBody}>
        <View style={styles.topRow}>
          <View style={[styles.badge, styles.redditBadge]}>
            <Text style={[styles.badgeText, styles.redditBadgeText]}>r/{item.subreddit || item.keyword}</Text>
          </View>
          <View style={[styles.ytBadge, styles.redditTypeBadge]}>
            <Text style={[styles.ytBadgeText, styles.redditTypeBadgeText]}>🤖 Reddit</Text>
          </View>
        </View>
        <Text style={styles.videoTitle} numberOfLines={2}>{item.title}</Text>
        <View style={styles.cardFooter}>
          <TouchableOpacity onPress={() => onWatch(item)}>
            <Text style={[styles.watchText, styles.redditWatchText]}>🤖 Reddit에서 보기</Text>
          </TouchableOpacity>
          <TouchableOpacity
            style={[styles.checkBtn, watched[item.videoId] && styles.checkBtnDone]}
            onPress={() => onToggle(item.videoId)}
          >
            <Text style={styles.checkBtnText}>{watched[item.videoId] ? '✅ 봤어요' : '👁 안봤어요'}</Text>
          </TouchableOpacity>
        </View>
      </View>
    </View>
  );
}

export default function DestroyScreen({ route }) {
  const [keywords, setKeywords] = useState([]);
  const [loading, setLoading] = useState(true);
  // ✅ 플랫폼별 watched 상태 분리
  const [watchedYoutube, setWatchedYoutube] = useState({});
  const [watchedReddit, setWatchedReddit] = useState({});
  const [goal, setGoal] = useState(3);
  const [modalVisible, setModalVisible] = useState(false);
  const [inputGoal, setInputGoal] = useState('3');
  const [trend, setTrend] = useState(null);
  const [sourceType, setSourceType] = useState('youtube'); // 현재 추천 타입
  const isFetching = useRef(false);
  const lastRefresh = useRef(null);

  useFocusEffect(
    useCallback(() => {
      loadWatched();
      loadGoal();
      const refresh = route?.params?.refresh;
      const shouldRefresh = refresh && refresh !== lastRefresh.current;
      if (shouldRefresh || keywords.length === 0) {
        if (shouldRefresh) lastRefresh.current = refresh;
        if (!isFetching.current) {
          isFetching.current = true;
          setLoading(true);
          setKeywords([]);
          Promise.all([
            getAntiKeywords([]),
            getAlgorithmTrend('youtube'),
          ])
            .then(([data, trendData]) => {
              if (data.keywords && data.keywords.length > 0) {
                setKeywords(data.keywords);
                // ✅ 소스 타입 감지 (youtube/reddit 혼합 시 다수 타입)
                const types = data.keywords.map(k => k.type || 'youtube');
                const redditCount = types.filter(t => t === 'reddit').length;
                setSourceType(redditCount > types.length / 2 ? 'reddit' : 'youtube');
              }
              setTrend(trendData);
              setLoading(false);
              isFetching.current = false;
            })
            .catch(() => {
              setLoading(false);
              isFetching.current = false;
            });
        }
      }
    }, [route?.params?.refresh, keywords.length])
  );

  const loadWatched = async () => {
    try {
      const yt = await AsyncStorage.getItem(WATCHED_YOUTUBE_KEY);
      const rd = await AsyncStorage.getItem(WATCHED_REDDIT_KEY);
      if (yt) setWatchedYoutube(JSON.parse(yt));
      if (rd) setWatchedReddit(JSON.parse(rd));
    } catch {
      try {
        const yt = localStorage.getItem(WATCHED_YOUTUBE_KEY);
        const rd = localStorage.getItem(WATCHED_REDDIT_KEY);
        if (yt) setWatchedYoutube(JSON.parse(yt));
        if (rd) setWatchedReddit(JSON.parse(rd));
      } catch {}
    }
  };

  const loadGoal = async () => {
    try {
      const data = await AsyncStorage.getItem(GOAL_KEY);
      if (data) setGoal(parseInt(data));
    } catch {
      try {
        const data = localStorage.getItem(GOAL_KEY);
        if (data) setGoal(parseInt(data));
      } catch {}
    }
  };

  const saveGoal = async (value) => {
    const num = Math.max(1, Math.min(10, parseInt(value) || 3));
    setGoal(num);
    setModalVisible(false);
    try {
      await AsyncStorage.setItem(GOAL_KEY, String(num));
    } catch {
      try { localStorage.setItem(GOAL_KEY, String(num)); } catch {}
    }
  };

  // ✅ 플랫폼별 watched 토글
  const toggleWatched = async (videoId, type) => {
    const isReddit = type === 'reddit';
    if (isReddit) {
      const updated = { ...watchedReddit, [videoId]: !watchedReddit[videoId] };
      setWatchedReddit(updated);
      try {
        await AsyncStorage.setItem(WATCHED_REDDIT_KEY, JSON.stringify(updated));
      } catch {
        try { localStorage.setItem(WATCHED_REDDIT_KEY, JSON.stringify(updated)); } catch {}
      }
    } else {
      const updated = { ...watchedYoutube, [videoId]: !watchedYoutube[videoId] };
      setWatchedYoutube(updated);
      try {
        await AsyncStorage.setItem(WATCHED_YOUTUBE_KEY, JSON.stringify(updated));
      } catch {
        try { localStorage.setItem(WATCHED_YOUTUBE_KEY, JSON.stringify(updated)); } catch {}
      }
    }
  };

  const handleWatch = (item) => {
    Linking.openURL(item.url);
    const isReddit = item.type === 'reddit';
    const watched = isReddit ? watchedReddit : watchedYoutube;
    if (!watched[item.videoId]) toggleWatched(item.videoId, item.type);
  };

  const handleRefresh = () => {
    if (isFetching.current) return;
    isFetching.current = true;
    setLoading(true);
    const currentIds = keywords.map(k => k.videoId);
    setKeywords([]);
    Promise.all([
      getAntiKeywords(currentIds),
      getAlgorithmTrend('youtube'),
    ])
      .then(([data, trendData]) => {
        if (data.keywords && data.keywords.length > 0) setKeywords(data.keywords);
        setTrend(trendData);
        setLoading(false);
        isFetching.current = false;
      })
      .catch(() => {
        setLoading(false);
        isFetching.current = false;
      });
  };

  // ✅ 현재 추천 타입에 맞는 watched만 카운트
  const getCurrentWatched = () => {
    if (keywords.length === 0) return {};
    // 현재 추천 목록의 타입별로 watched 합산
    const result = {};
    keywords.forEach(k => {
      const isReddit = k.type === 'reddit';
      const watched = isReddit ? watchedReddit : watchedYoutube;
      result[k.videoId] = watched[k.videoId] || false;
    });
    return result;
  };

  const currentWatched = getCurrentWatched();
  const watchedCount = Object.values(currentWatched).filter(Boolean).length;
  const progress = Math.min(watchedCount / goal, 1);
  const isGoalReached = watchedCount >= goal;

  if (loading) {
    return (
      <View style={styles.center}>
        <Text style={styles.loadingEmoji}>💥</Text>
        <Text style={styles.loadingText}>AI 분석 중...</Text>
        <ActivityIndicator style={{ marginTop: 12 }} color="#ff5c7a" />
      </View>
    );
  }

  if (keywords.length === 0) {
    return (
      <View style={styles.center}>
        <Text style={styles.emptyEmoji}>👻</Text>
        <Text style={styles.emptyTitle}>아직 분석 데이터가 없어요</Text>
        <Text style={styles.emptySub}>홈 화면에서 URL을 먼저 분석해보세요</Text>
      </View>
    );
  }

  return (
    <>
      <FlatList
        style={styles.container}
        data={keywords}
        keyExtractor={i => i.videoId}
        showsVerticalScrollIndicator={false}
        ListHeaderComponent={
          <View>
            <View style={styles.header}>
              <View>
                <Text style={styles.pageTitle}>알고리즘 파괴</Text>
                <Text style={styles.pageSub}>평소엔 절대 안 볼 것 같은 콘텐츠들</Text>
              </View>
              <TouchableOpacity style={styles.refreshBtn} onPress={handleRefresh}>
                <Text style={styles.refreshText}>🔄 새로고침</Text>
              </TouchableOpacity>
            </View>

            <TrendAlertBanner trend={trend} />

            {/* ✅ 플랫폼별 주간 목표 카드 */}
            <View style={[styles.goalCard, isGoalReached && styles.goalCardDone]}>
              <View style={styles.goalHeader}>
                <Text style={styles.goalTitle}>
                  {isGoalReached ? '🎉 이번 주 목표 달성!' : '🎯 이번 주 목표'}
                </Text>
                <TouchableOpacity
                  style={styles.goalEditBtn}
                  onPress={() => { setInputGoal(String(goal)); setModalVisible(true); }}
                >
                  <Text style={styles.goalEditText}>변경</Text>
                </TouchableOpacity>
              </View>

              {/* ✅ YouTube / Reddit 별도 카운트 표시 */}
              <View style={styles.goalPlatformRow}>
                <View style={styles.goalPlatformItem}>
                  <Text style={styles.goalPlatformCount}>
                    {Object.values(watchedYoutube).filter(Boolean).length}
                  </Text>
                  <Text style={styles.goalPlatformLabel}>▶ YouTube</Text>
                </View>
                <View style={styles.goalPlatformDivider} />
                <View style={styles.goalPlatformItem}>
                  <Text style={[styles.goalPlatformCount, { color: '#ff4500' }]}>
                    {Object.values(watchedReddit).filter(Boolean).length}
                  </Text>
                  <Text style={styles.goalPlatformLabel}>🤖 Reddit</Text>
                </View>
                <View style={styles.goalPlatformDivider} />
                <View style={styles.goalPlatformItem}>
                  <Text style={[styles.goalPlatformCount, { color: '#ff5c7a' }]}>
                    {watchedCount} / {goal}
                  </Text>
                  <Text style={styles.goalPlatformLabel}>현재 목표</Text>
                </View>
              </View>

              <View style={styles.progressBar}>
                <View style={[styles.progressFill, {
                  width: `${progress * 100}%`,
                  backgroundColor: isGoalReached ? '#00c896' : '#ff5c7a',
                }]} />
              </View>
              <Text style={styles.goalSub}>
                {isGoalReached
                  ? `다양성 +${watchedCount * 5}% 향상 완료! 🚀`
                  : `${goal - watchedCount}개 더 보면 목표 달성!`}
              </Text>
            </View>
          </View>
        }
        renderItem={({ item }) => {
          const isReddit = item.type === 'reddit';
          const watched = isReddit ? watchedReddit : watchedYoutube;

          if (isReddit) {
            return (
              <RedditCard
                item={item}
                watched={watched}
                onWatch={handleWatch}
                onToggle={(videoId) => toggleWatched(videoId, 'reddit')}
              />
            );
          }
          return (
            <View style={[styles.card, watched[item.videoId] && styles.cardWatched]}>
              <TouchableOpacity onPress={() => handleWatch(item)} activeOpacity={0.9}>
                <Image source={{ uri: item.thumbnail }} style={styles.thumbnail} />
                {watched[item.videoId] && (
                  <View style={styles.watchedOverlay}>
                    <Text style={styles.watchedOverlayText}>✅ 시청 완료</Text>
                  </View>
                )}
              </TouchableOpacity>
              <View style={styles.cardBody}>
                <View style={styles.topRow}>
                  <View style={styles.badge}>
                    <Text style={styles.badgeText}>#{item.keyword}</Text>
                  </View>
                  <View style={styles.ytBadge}>
                    <Text style={styles.ytBadgeText}>
                      {item.type === 'naver_news' ? '📰 뉴스' :
                       item.type === 'naver_blog' ? '📝 블로그' : '▶ YouTube'}
                    </Text>
                  </View>
                </View>
                <Text style={styles.videoTitle} numberOfLines={2}>{item.title}</Text>
                <View style={styles.cardFooter}>
                  <TouchableOpacity onPress={() => handleWatch(item)}>
                    <Text style={styles.watchText}>
                      {item.type === 'naver_news' ? '📰 뉴스 보기' :
                       item.type === 'naver_blog' ? '📝 블로그 보기' : '▶ 유튜브에서 보기'}
                    </Text>
                  </TouchableOpacity>
                  <TouchableOpacity
                    style={[styles.checkBtn, watched[item.videoId] && styles.checkBtnDone]}
                    onPress={() => toggleWatched(item.videoId, item.type || 'youtube')}
                  >
                    <Text style={styles.checkBtnText}>
                      {watched[item.videoId] ? '✅ 봤어요' : '👁 안봤어요'}
                    </Text>
                  </TouchableOpacity>
                </View>
              </View>
            </View>
          );
        }}
        ListFooterComponent={<View style={{ height: 40 }} />}
      />

      <Modal visible={modalVisible} transparent animationType="fade" onRequestClose={() => setModalVisible(false)}>
        <View style={styles.modalOverlay}>
          <View style={styles.modalBox}>
            <Text style={styles.modalTitle}>🎯 주간 목표 설정</Text>
            <Text style={styles.modalSub}>이번 주 몇 개의 콘텐츠를 볼까요? (1~10)</Text>
            <TextInput
              style={styles.modalInput}
              value={inputGoal}
              onChangeText={setInputGoal}
              keyboardType="number-pad"
              maxLength={2}
              placeholder="3"
              placeholderTextColor="#9ca3af"
            />
            <View style={styles.modalBtns}>
              <TouchableOpacity style={styles.modalCancelBtn} onPress={() => setModalVisible(false)}>
                <Text style={styles.modalCancelText}>취소</Text>
              </TouchableOpacity>
              <TouchableOpacity style={styles.modalSaveBtn} onPress={() => saveGoal(inputGoal)}>
                <Text style={styles.modalSaveText}>저장</Text>
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>
    </>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#f6f8fb', paddingHorizontal: 20 },
  center: { flex: 1, backgroundColor: '#f6f8fb', alignItems: 'center', justifyContent: 'center' },
  loadingEmoji: { fontSize: 52, marginBottom: 12 },
  loadingText: { fontSize: 15, fontWeight: '600', color: '#6b7280' },
  emptyEmoji: { fontSize: 52, marginBottom: 12 },
  emptyTitle: { fontSize: 20, fontWeight: '800', color: '#111827', marginBottom: 8 },
  emptySub: { fontSize: 14, color: '#6b7280', textAlign: 'center' },

  header: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'flex-start', marginTop: 70, marginBottom: 16 },
  pageTitle: { fontSize: 32, fontWeight: '800', color: '#111827' },
  pageSub: { fontSize: 14, color: '#6b7280', marginTop: 6 },
  refreshBtn: { backgroundColor: '#ffffff', borderRadius: 20, paddingHorizontal: 14, paddingVertical: 8, shadowColor: '#000', shadowOpacity: 0.06, shadowRadius: 8, elevation: 2 },
  refreshText: { fontSize: 13, color: '#374151', fontWeight: '600' },

  trendBanner: { backgroundColor: '#f0f7ff', borderRadius: 20, padding: 16, marginBottom: 16, borderWidth: 1.5, borderColor: '#bfdbfe' },
  trendBannerUrgent: { backgroundColor: '#fff5f5', borderColor: '#fca5a5' },
  trendBannerHeader: { flexDirection: 'row', alignItems: 'center', gap: 8, marginBottom: 8 },
  trendBannerIcon: { fontSize: 20 },
  trendBannerTitle: { flex: 1, fontSize: 14, fontWeight: '800', color: '#1e40af' },
  trendBannerTitleUrgent: { color: '#c0392b' },
  trendLevelBadge: { paddingHorizontal: 10, paddingVertical: 3, borderRadius: 20 },
  trendLevelText: { fontSize: 11, fontWeight: '800', color: '#fff' },
  trendBannerMsg: { fontSize: 13, color: '#374151', lineHeight: 20, marginBottom: 10 },
  trendStats: { flexDirection: 'row', gap: 8 },
  trendStat: { flex: 1, backgroundColor: '#fff', borderRadius: 12, paddingVertical: 10, alignItems: 'center' },
  trendStatValue: { fontSize: 18, fontWeight: '800', color: '#111827', marginBottom: 2 },
  trendStatLabel: { fontSize: 10, color: '#9ca3af', fontWeight: '600' },

  goalCard: { backgroundColor: '#ffffff', borderRadius: 24, padding: 20, marginBottom: 24, shadowColor: '#000', shadowOpacity: 0.05, shadowRadius: 12, elevation: 3, borderWidth: 1.5, borderColor: '#ffe4ec' },
  goalCardDone: { borderColor: '#b2f5e4' },
  goalHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 14 },
  goalTitle: { fontSize: 15, fontWeight: '700', color: '#111827' },
  goalEditBtn: { backgroundColor: '#fff0f3', borderRadius: 20, paddingHorizontal: 12, paddingVertical: 5 },
  goalEditText: { fontSize: 12, color: '#ff5c7a', fontWeight: '700' },

  // ✅ 플랫폼별 카운트 행
  goalPlatformRow: { flexDirection: 'row', marginBottom: 16, backgroundColor: '#f9fafb', borderRadius: 16, padding: 12 },
  goalPlatformItem: { flex: 1, alignItems: 'center' },
  goalPlatformCount: { fontSize: 22, fontWeight: '800', color: '#3182f6', marginBottom: 4 },
  goalPlatformLabel: { fontSize: 11, color: '#9ca3af', fontWeight: '600' },
  goalPlatformDivider: { width: 1, backgroundColor: '#e5e7eb', marginVertical: 4 },

  progressBar: { height: 8, backgroundColor: '#f3f4f6', borderRadius: 8, marginBottom: 10, overflow: 'hidden' },
  progressFill: { height: 8, borderRadius: 8 },
  goalSub: { fontSize: 13, color: '#6b7280' },

  card: { backgroundColor: '#ffffff', borderRadius: 22, marginBottom: 18, shadowColor: '#000', shadowOpacity: 0.05, shadowRadius: 12, elevation: 3, overflow: 'hidden' },
  cardWatched: { opacity: 0.6 },
  thumbnail: { width: '100%', height: 190 },
  watchedOverlay: { position: 'absolute', top: 0, left: 0, right: 0, bottom: 0, backgroundColor: 'rgba(0,0,0,0.45)', alignItems: 'center', justifyContent: 'center' },
  watchedOverlayText: { color: '#fff', fontSize: 18, fontWeight: '700' },
  cardBody: { padding: 16 },
  topRow: { flexDirection: 'row', alignItems: 'center', gap: 8, marginBottom: 10 },
  badge: { backgroundColor: '#fff0f3', borderRadius: 20, paddingHorizontal: 10, paddingVertical: 4 },
  badgeText: { fontSize: 12, color: '#ff5c7a', fontWeight: '600' },
  ytBadge: { backgroundColor: '#fff1f1', borderRadius: 20, paddingHorizontal: 10, paddingVertical: 4 },
  ytBadgeText: { fontSize: 12, color: '#ef4444', fontWeight: '600' },
  videoTitle: { fontSize: 15, color: '#111827', fontWeight: '600', lineHeight: 22, marginBottom: 14 },
  cardFooter: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  watchText: { fontSize: 13, color: '#3182f6', fontWeight: '600' },
  checkBtn: { backgroundColor: '#f3f4f6', borderRadius: 20, paddingHorizontal: 14, paddingVertical: 7 },
  checkBtnDone: { backgroundColor: '#e6faf5' },
  checkBtnText: { fontSize: 12, color: '#374151', fontWeight: '600' },

  redditCard: { borderWidth: 1.5, borderColor: '#ffd9c0' },
  redditHeader: { flexDirection: 'row', alignItems: 'center', gap: 10, padding: 14, paddingBottom: 10, backgroundColor: '#fff8f5' },
  redditIconWrap: { width: 38, height: 38, borderRadius: 19, backgroundColor: '#ffe8d6', alignItems: 'center', justifyContent: 'center' },
  redditIcon: { fontSize: 20 },
  redditHeaderTitle: { fontSize: 14, fontWeight: '800', color: '#ff4500' },
  redditHeaderSub: { fontSize: 12, color: '#ff6534', fontWeight: '600' },
  scoreWrap: { marginLeft: 'auto', backgroundColor: '#fff3ee', borderRadius: 20, paddingHorizontal: 10, paddingVertical: 4 },
  scoreText: { fontSize: 12, color: '#ff4500', fontWeight: '600' },
  redditThumbnail: { width: '100%', height: 200 },
  redditBanner: { height: 120, backgroundColor: '#fff3ee', alignItems: 'center', justifyContent: 'center', gap: 8 },
  redditBannerEmoji: { fontSize: 36 },
  redditBannerText: { fontSize: 16, fontWeight: '700', color: '#ff4500' },
  redditBadge: { backgroundColor: '#fff3ee' },
  redditBadgeText: { color: '#ff4500' },
  redditTypeBadge: { backgroundColor: '#fff8f5' },
  redditTypeBadgeText: { color: '#ff4500' },
  redditWatchText: { fontSize: 13, color: '#ff4500', fontWeight: '600' },

  modalOverlay: { flex: 1, backgroundColor: 'rgba(0,0,0,0.5)', alignItems: 'center', justifyContent: 'center' },
  modalBox: { backgroundColor: '#ffffff', borderRadius: 24, padding: 26, width: '82%', shadowColor: '#000', shadowOpacity: 0.1, shadowRadius: 20, elevation: 8 },
  modalTitle: { fontSize: 20, fontWeight: '800', color: '#111827', marginBottom: 6 },
  modalSub: { fontSize: 13, color: '#6b7280', marginBottom: 18 },
  modalInput: { backgroundColor: '#f3f4f6', borderRadius: 14, padding: 16, color: '#111827', fontSize: 26, fontWeight: '700', marginBottom: 18, textAlign: 'center' },
  modalBtns: { flexDirection: 'row', gap: 10 },
  modalCancelBtn: { flex: 1, backgroundColor: '#f3f4f6', borderRadius: 14, padding: 15, alignItems: 'center' },
  modalCancelText: { color: '#6b7280', fontWeight: '600' },
  modalSaveBtn: { flex: 1, backgroundColor: '#3182f6', borderRadius: 14, padding: 15, alignItems: 'center' },
  modalSaveText: { color: '#fff', fontWeight: '700' },
});
