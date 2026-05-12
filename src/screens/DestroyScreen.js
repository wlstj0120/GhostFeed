import {
  StyleSheet,
  Text,
  View,
  FlatList,
  TouchableOpacity,
  Image,
  Linking,
  Modal,
  TextInput,
} from 'react-native';
import { useState, useCallback, useRef } from 'react';
import { useFocusEffect } from '@react-navigation/native';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { getAntiKeywords } from '../api/ghostApi';

const GOAL_KEY = 'weekly_goal';
const WATCHED_KEY = 'watched';

export default function DestroyScreen({ route }) {
  const [keywords, setKeywords] = useState([]);
  const [loading, setLoading] = useState(true);
  const [watched, setWatched] = useState({});
  const [goal, setGoal] = useState(3);
  const [modalVisible, setModalVisible] = useState(false);
  const [inputGoal, setInputGoal] = useState('3');
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
          getAntiKeywords([])
            .then(data => {
              if (data.keywords && data.keywords.length > 0) {
                setKeywords(data.keywords);
              }
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
      const data = await AsyncStorage.getItem(WATCHED_KEY);
      if (data) setWatched(JSON.parse(data));
    } catch {
      try {
        const data = localStorage.getItem(WATCHED_KEY);
        if (data) setWatched(JSON.parse(data));
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

  const toggleWatched = async (videoId) => {
    const updated = { ...watched, [videoId]: !watched[videoId] };
    setWatched(updated);
    try {
      await AsyncStorage.setItem(WATCHED_KEY, JSON.stringify(updated));
    } catch {
      try { localStorage.setItem(WATCHED_KEY, JSON.stringify(updated)); } catch {}
    }
  };

  const handleWatch = (item) => {
    Linking.openURL(item.url);
    if (!watched[item.videoId]) toggleWatched(item.videoId);
  };

  const handleRefresh = () => {
    if (isFetching.current) return;
    isFetching.current = true;
    setLoading(true);
    const currentIds = keywords.map(k => k.videoId);
    setKeywords([]);
    getAntiKeywords(currentIds)
      .then(data => {
        if (data.keywords && data.keywords.length > 0) setKeywords(data.keywords);
        setLoading(false);
        isFetching.current = false;
      })
      .catch(() => {
        setLoading(false);
        isFetching.current = false;
      });
  };

  const watchedCount = Object.values(watched).filter(Boolean).length;
  const progress = Math.min(watchedCount / goal, 1);
  const isGoalReached = watchedCount >= goal;

  if (loading) {
    return (
      <View style={styles.center}>
        <Text style={styles.loadingEmoji}>💥</Text>
        <Text style={styles.loadingText}>AI 분석 중...</Text>
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
                <Text style={styles.pageSub}>평소엔 절대 안 볼 것 같은 영상들</Text>
              </View>
              <TouchableOpacity style={styles.refreshBtn} onPress={handleRefresh}>
                <Text style={styles.refreshText}>🔄 새로고침</Text>
              </TouchableOpacity>
            </View>

            <View style={[styles.goalCard, isGoalReached && styles.goalCardDone]}>
              <View style={styles.goalHeader}>
                <Text style={styles.goalTitle}>
                  {isGoalReached ? '🎉 이번 주 목표 달성!' : '🎯 이번 주 목표'}
                </Text>
                <TouchableOpacity
                  style={styles.goalEditBtn}
                  onPress={() => {
                    setInputGoal(String(goal));
                    setModalVisible(true);
                  }}
                >
                  <Text style={styles.goalEditText}>변경</Text>
                </TouchableOpacity>
              </View>
              <Text style={styles.goalCount}>{watchedCount} / {goal}개 시청</Text>
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
        renderItem={({ item }) => (
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
                  <Text style={styles.ytBadgeText}>▶ YouTube</Text>
                </View>
              </View>

              <Text style={styles.videoTitle} numberOfLines={2}>{item.title}</Text>

              <View style={styles.cardFooter}>
                <TouchableOpacity onPress={() => handleWatch(item)}>
                  <Text style={styles.watchText}>▶ 유튜브에서 보기</Text>
                </TouchableOpacity>
                <TouchableOpacity
                  style={[styles.checkBtn, watched[item.videoId] && styles.checkBtnDone]}
                  onPress={() => toggleWatched(item.videoId)}
                >
                  <Text style={styles.checkBtnText}>
                    {watched[item.videoId] ? '✅ 봤어요' : '👁 안봤어요'}
                  </Text>
                </TouchableOpacity>
              </View>
            </View>
          </View>
        )}
        ListFooterComponent={<View style={{ height: 40 }} />}
      />

      <Modal visible={modalVisible} transparent animationType="fade" onRequestClose={() => setModalVisible(false)}>
        <View style={styles.modalOverlay}>
          <View style={styles.modalBox}>
            <Text style={styles.modalTitle}>🎯 주간 목표 설정</Text>
            <Text style={styles.modalSub}>이번 주 몇 개의 영상을 볼까요? (1~10)</Text>
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
  header: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'flex-start', marginTop: 70, marginBottom: 20 },
  pageTitle: { fontSize: 32, fontWeight: '800', color: '#111827' },
  pageSub: { fontSize: 14, color: '#6b7280', marginTop: 6 },
  refreshBtn: { backgroundColor: '#ffffff', borderRadius: 20, paddingHorizontal: 14, paddingVertical: 8, shadowColor: '#000', shadowOpacity: 0.06, shadowRadius: 8, elevation: 2 },
  refreshText: { fontSize: 13, color: '#374151', fontWeight: '600' },
  goalCard: { backgroundColor: '#ffffff', borderRadius: 24, padding: 20, marginBottom: 24, shadowColor: '#000', shadowOpacity: 0.05, shadowRadius: 12, elevation: 3, borderWidth: 1.5, borderColor: '#ffe4ec' },
  goalCardDone: { borderColor: '#b2f5e4' },
  goalHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 10 },
  goalTitle: { fontSize: 15, fontWeight: '700', color: '#111827' },
  goalEditBtn: { backgroundColor: '#fff0f3', borderRadius: 20, paddingHorizontal: 12, paddingVertical: 5 },
  goalEditText: { fontSize: 12, color: '#ff5c7a', fontWeight: '700' },
  goalCount: { fontSize: 26, fontWeight: '800', color: '#ff5c7a', marginBottom: 12 },
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