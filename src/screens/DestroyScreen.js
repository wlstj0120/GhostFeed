import { StyleSheet, Text, View, FlatList, TouchableOpacity, Image, Linking, Modal, TextInput } from 'react-native';
import { useState, useCallback, useRef } from 'react';
import { useFocusEffect } from '@react-navigation/native';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { getAntiKeywords } from '../api/ghostApi';

const GOAL_KEY = 'weekly_goal';
const WATCHED_KEY = 'watched';

export default function DestroyScreen() {
  const [keywords, setKeywords] = useState([]);
  const [loading, setLoading] = useState(true);
  const [watched, setWatched] = useState({});
  const [goal, setGoal] = useState(3);
  const [modalVisible, setModalVisible] = useState(false);
  const [inputGoal, setInputGoal] = useState('3');
  const isFetching = useRef(false);

  useFocusEffect(
    useCallback(() => {
      loadWatched();
      loadGoal();
      if (keywords.length === 0 && !isFetching.current) {
        isFetching.current = true;
        setLoading(true);
        getAntiKeywords()
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
    }, [keywords.length])
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
    if (!watched[item.videoId]) {
      toggleWatched(item.videoId);
    }
  };

  const handleRefresh = () => {
    if (isFetching.current) return;
    isFetching.current = true;
    setLoading(true);
    setKeywords([]);
    getAntiKeywords()
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
  };

  const watchedCount = Object.values(watched).filter(Boolean).length;
  const progress = Math.min(watchedCount / goal, 1);
  const isGoalReached = watchedCount >= goal;

  if (loading) {
    return (
      <View style={styles.center}>
        <Text style={styles.loadingText}>AI 분석 중...</Text>
      </View>
    );
  }

  if (keywords.length === 0) {
    return (
      <View style={styles.center}>
        <Text style={styles.emptyText}>👻 아직 분석된 데이터가 없어요</Text>
        <Text style={styles.emptySubText}>홈에서 URL을 분석해보세요!</Text>
      </View>
    );
  }

  return (
    <>
      <FlatList
        style={styles.container}
        data={keywords}
        keyExtractor={i => i.videoId}
        ListHeaderComponent={
          <View>
            <View style={styles.titleRow}>
              <View>
                <Text style={styles.title}>💥 알고리즘 파괴</Text>
                <Text style={styles.sub}>당신이 평생 안 볼 것 같은 영상들</Text>
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
                  <Text style={styles.goalEditText}>목표 변경</Text>
                </TouchableOpacity>
              </View>
              <Text style={styles.goalCount}>{watchedCount} / {goal}개 시청</Text>
              <View style={styles.progressBar}>
                <View style={[styles.progressFill, {
                  width: `${progress * 100}%`,
                  backgroundColor: isGoalReached ? '#00f5c8' : '#ff3cac'
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
            <TouchableOpacity onPress={() => handleWatch(item)}>
              <Image source={{ uri: item.thumbnail }} style={styles.thumbnail} />
              {watched[item.videoId] && (
                <View style={styles.watchedOverlay}>
                  <Text style={styles.watchedOverlayText}>✅ 시청 완료</Text>
                </View>
              )}
            </TouchableOpacity>
            <View style={styles.cardBody}>
              <View style={styles.badge}>
                <Text style={styles.badgeText}>#{item.keyword}</Text>
              </View>
              <Text style={styles.videoTitle} numberOfLines={2}>{item.title}</Text>
              <View style={styles.cardFooter}>
                <TouchableOpacity onPress={() => handleWatch(item)}>
                  <Text style={styles.watchText}>▶ 유튜브에서 보기</Text>
                </TouchableOpacity>
                <View style={[styles.checkBtn, watched[item.videoId] && styles.checkBtnDone]}>
                  <Text style={styles.checkBtnText}>
                    {watched[item.videoId] ? '✅ 봤어요' : '👁 안봤어요'}
                  </Text>
                </View>
              </View>
            </View>
          </View>
        )}
      />

      <Modal
        visible={modalVisible}
        transparent
        animationType="fade"
        onRequestClose={() => setModalVisible(false)}
      >
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
              placeholderTextColor="#444"
            />
            <View style={styles.modalBtns}>
              <TouchableOpacity
                style={styles.modalCancelBtn}
                onPress={() => setModalVisible(false)}
              >
                <Text style={styles.modalCancelText}>취소</Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={styles.modalSaveBtn}
                onPress={() => saveGoal(inputGoal)}
              >
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
  container: { flex: 1, backgroundColor: '#0a0a0f', padding: 20 },
  center: { flex: 1, backgroundColor: '#0a0a0f', alignItems: 'center', justifyContent: 'center' },
  loadingText: { color: '#00f5c8', fontSize: 16 },
  emptyText: { color: '#fff', fontSize: 16, fontWeight: '700', marginBottom: 8 },
  emptySubText: { color: '#555', fontSize: 13 },
  titleRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'flex-start', marginTop: 50, marginBottom: 4 },
  title: { fontSize: 28, fontWeight: '800', color: '#00f5c8' },
  sub: { fontSize: 13, color: '#666', marginBottom: 16 },
  refreshBtn: { backgroundColor: 'rgba(0,245,200,0.1)', borderRadius: 20, paddingHorizontal: 12, paddingVertical: 6, borderWidth: 0.5, borderColor: 'rgba(0,245,200,.3)' },
  refreshText: { fontSize: 12, color: '#00f5c8' },
  goalCard: { backgroundColor: '#111118', borderRadius: 14, padding: 16, marginBottom: 20, borderWidth: 0.5, borderColor: 'rgba(255,60,172,.2)' },
  goalCardDone: { borderColor: 'rgba(0,245,200,.5)' },
  goalHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 8 },
  goalTitle: { fontSize: 14, fontWeight: '700', color: '#fff' },
  goalEditBtn: { backgroundColor: 'rgba(255,60,172,.1)', borderRadius: 20, paddingHorizontal: 10, paddingVertical: 4 },
  goalEditText: { fontSize: 11, color: '#ff3cac' },
  goalCount: { fontSize: 24, fontWeight: '800', color: '#ff3cac', marginBottom: 10 },
  progressBar: { height: 6, backgroundColor: '#1a1a2e', borderRadius: 3, marginBottom: 8 },
  progressFill: { height: 6, borderRadius: 3 },
  goalSub: { fontSize: 12, color: '#666' },
  card: { backgroundColor: '#111118', borderRadius: 14, marginBottom: 16, borderWidth: 0.5, borderColor: 'rgba(0,245,200,.2)', overflow: 'hidden' },
  cardWatched: { opacity: 0.6, borderColor: 'rgba(0,245,200,.5)' },
  thumbnail: { width: '100%', height: 180 },
  watchedOverlay: { position: 'absolute', top: 0, left: 0, right: 0, bottom: 0, backgroundColor: 'rgba(0,0,0,0.5)', alignItems: 'center', justifyContent: 'center' },
  watchedOverlayText: { color: '#00f5c8', fontSize: 18, fontWeight: '700' },
  cardBody: { padding: 14 },
  badge: { backgroundColor: 'rgba(255,60,172,.15)', borderRadius: 20, paddingHorizontal: 10, paddingVertical: 4, alignSelf: 'flex-start', marginBottom: 8 },
  badgeText: { fontSize: 11, color: '#ff3cac', fontWeight: '600' },
  videoTitle: { fontSize: 14, color: '#fff', fontWeight: '600', lineHeight: 20, marginBottom: 10 },
  cardFooter: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  watchText: { fontSize: 12, color: '#00f5c8' },
  checkBtn: { backgroundColor: 'rgba(255,255,255,0.05)', borderRadius: 20, paddingHorizontal: 12, paddingVertical: 6, borderWidth: 0.5, borderColor: '#333' },
  checkBtnDone: { backgroundColor: 'rgba(0,245,200,0.1)', borderColor: 'rgba(0,245,200,.4)' },
  checkBtnText: { fontSize: 11, color: '#aaa' },
  modalOverlay: { flex: 1, backgroundColor: 'rgba(0,0,0,0.7)', alignItems: 'center', justifyContent: 'center' },
  modalBox: { backgroundColor: '#111118', borderRadius: 16, padding: 24, width: '80%', borderWidth: 0.5, borderColor: '#333' },
  modalTitle: { fontSize: 18, fontWeight: '800', color: '#fff', marginBottom: 6 },
  modalSub: { fontSize: 12, color: '#666', marginBottom: 16 },
  modalInput: { backgroundColor: '#0a0a0f', borderRadius: 10, padding: 14, color: '#fff', fontSize: 24, fontWeight: '700', borderWidth: 0.5, borderColor: '#333', marginBottom: 16, textAlign: 'center' },
  modalBtns: { flexDirection: 'row', gap: 10 },
  modalCancelBtn: { flex: 1, backgroundColor: '#1a1a2e', borderRadius: 10, padding: 14, alignItems: 'center' },
  modalCancelText: { color: '#666', fontWeight: '600' },
  modalSaveBtn: { flex: 1, backgroundColor: '#ff3cac', borderRadius: 10, padding: 14, alignItems: 'center' },
  modalSaveText: { color: '#fff', fontWeight: '700' },
});