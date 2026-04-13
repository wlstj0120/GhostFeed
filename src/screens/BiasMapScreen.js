import { StyleSheet, Text, View, ScrollView, ActivityIndicator } from 'react-native';
import { useState, useCallback } from 'react';
import { useFocusEffect } from '@react-navigation/native';
import { getWeeklyReport } from '../api/ghostApi';

const COLORS = ['#ff3cac', '#7b5ea7', '#ffb347', '#00f5c8', '#4fc3f7', '#ff8a65', '#a5d6a7'];

// 카테고리별 고정 구역 위치 (편향도에 따라 크기만 변함)
const ZONE_POSITIONS = [
  { x: 10, y: 10 },  // 정치·사회 - 좌상단
  { x: 55, y: 8  },  // 과학·기술 - 우상단
  { x: 10, y: 55 },  // 경제·경영 - 좌하단
  { x: 55, y: 55 },  // 문화·예술 - 우하단
  { x: 30, y: 30 },  // 건강·라이프 - 중앙
  { x: 68, y: 35 },  // 게임·엔터 - 우중단
  { x: 15, y: 35 },  // 음식·여행 - 좌중단
];

export default function BiasMapScreen() {
  const [categories, setCategories] = useState([]);
  const [report, setReport] = useState(null);
  const [loading, setLoading] = useState(true);

  useFocusEffect(
    useCallback(() => {
      setLoading(true);
      getWeeklyReport()
        .then(data => {
          if (data.categories && data.categories.length > 0) {
            setCategories(data.categories);
            setReport(data);
          }
          setLoading(false);
        })
        .catch(() => setLoading(false));
    }, [])
  );

  if (loading) {
    return (
      <View style={styles.center}>
        <ActivityIndicator size="large" color="#7b5ea7" />
        <Text style={styles.loadingText}>지도 불러오는 중...</Text>
      </View>
    );
  }

  if (categories.length === 0) {
    return (
      <View style={styles.center}>
        <Text style={styles.emptyText}>🗺️ 아직 데이터가 없어요</Text>
        <Text style={styles.emptySubText}>홈에서 URL을 분석해보세요!</Text>
      </View>
    );
  }

  // 가장 높은 카테고리 찾기
  const maxPercent = Math.max(...categories.map(c => c.percent));
  const dominantCat = categories.find(c => c.percent === maxPercent);

  return (
    <ScrollView style={styles.container}>
      <Text style={styles.title}>🗺️ 편향 지도</Text>
      <Text style={styles.sub}>내가 갇혀 있는 알고리즘 공간</Text>

      {/* 지배적 카테고리 표시 */}
      {dominantCat && (
        <View style={styles.dominantCard}>
          <Text style={styles.dominantLabel}>가장 많이 소비한 콘텐츠</Text>
          <Text style={styles.dominantName}>{dominantCat.name}</Text>
          <Text style={styles.dominantPercent}>{dominantCat.percent}%</Text>
        </View>
      )}

      {/* 버블 지도 */}
      <View style={styles.mapBox}>
        {/* 배경 그리드 */}
        <View style={styles.gridLine1} />
        <View style={styles.gridLine2} />

        {categories.map((c, i) => {
          // 편향도에 따라 버블 크기 결정 (20~85px)
          const size = Math.max(20, Math.min(85, c.percent * 0.8 + 15));
          const color = COLORS[i % COLORS.length];
          const pos = ZONE_POSITIONS[i] || { x: 20 + (i * 15) % 60, y: 20 + (i * 20) % 60 };

          // 편향도 높을수록 더 불투명하게
          const opacity = 0.15 + (c.percent / 100) * 0.5;

          return (
            <View
              key={c.name}
              style={[styles.bubble, {
                left: `${pos.x}%`,
                top: `${pos.y}%`,
                width: size,
                height: size,
                borderRadius: size / 2,
                backgroundColor: color,
                opacity,
                borderColor: color,
                // 가장 높은 카테고리는 테두리 강조
                borderWidth: c.percent === maxPercent ? 2 : 1,
              }]}
            >
              <Text style={[styles.bubbleText, { fontSize: size > 50 ? 9 : 7 }]}>
                {c.name.split('·')[0]}
              </Text>
              <Text style={[styles.bubblePercent, { fontSize: size > 50 ? 10 : 8 }]}>
                {c.percent}%
              </Text>
            </View>
          );
        })}
      </View>

      {/* 클러스터 분석 */}
      <Text style={styles.sectionTitle}>클러스터 분석</Text>
      {[...categories]
        .sort((a, b) => b.percent - a.percent)
        .map((c, i) => {
          const color = COLORS[categories.indexOf(c) % COLORS.length];
          return (
            <View key={c.name} style={styles.clusterRow}>
              <View style={[styles.dot, { backgroundColor: color }]} />
              <Text style={styles.clusterName}>{c.name}</Text>
              <View style={styles.clusterBar}>
                <View style={[styles.clusterFill, {
                  width: `${c.percent}%`,
                  backgroundColor: color
                }]} />
              </View>
              <Text style={styles.clusterPercent}>{c.percent}%</Text>
            </View>
          );
        })}

      {/* 분석 요약 */}
      {report && (
        <View style={styles.summaryCard}>
          <Text style={styles.summaryTitle}>📊 분석 요약</Text>
          <Text style={styles.summaryText}>
            총 {report.totalAnalyzed}개 콘텐츠 분석{'\n'}
            편향 점수: {report.biasScore}점{'\n'}
            다양성 지수: {report.diversity}%
          </Text>
        </View>
      )}
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#0a0a0f', padding: 20 },
  center: { flex: 1, backgroundColor: '#0a0a0f', alignItems: 'center', justifyContent: 'center' },
  loadingText: { color: '#7b5ea7', marginTop: 12, fontSize: 14 },
  emptyText: { color: '#fff', fontSize: 16, fontWeight: '700', marginBottom: 8 },
  emptySubText: { color: '#555', fontSize: 13 },
  title: { fontSize: 28, fontWeight: '800', color: '#7b5ea7', marginTop: 50 },
  sub: { fontSize: 13, color: '#666', marginBottom: 16 },

  dominantCard: {
    backgroundColor: 'rgba(123,94,167,0.15)', borderRadius: 12, padding: 14,
    marginBottom: 16, borderWidth: 0.5, borderColor: 'rgba(123,94,167,.4)',
    flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between'
  },
  dominantLabel: { fontSize: 11, color: '#7b5ea7' },
  dominantName: { fontSize: 16, fontWeight: '800', color: '#fff' },
  dominantPercent: { fontSize: 20, fontWeight: '800', color: '#7b5ea7' },

  mapBox: {
    width: '100%', height: 300, backgroundColor: '#111118',
    borderRadius: 16, marginBottom: 24, borderWidth: 0.5,
    borderColor: '#222', position: 'relative', overflow: 'hidden'
  },
  gridLine1: {
    position: 'absolute', left: '50%', top: 0, bottom: 0,
    width: 0.5, backgroundColor: '#1a1a2e'
  },
  gridLine2: {
    position: 'absolute', top: '50%', left: 0, right: 0,
    height: 0.5, backgroundColor: '#1a1a2e'
  },
  bubble: {
    position: 'absolute', borderWidth: 1,
    alignItems: 'center', justifyContent: 'center',
  },
  bubbleText: { color: '#fff', fontWeight: '700', textAlign: 'center' },
  bubblePercent: { color: '#fff', fontWeight: '600', textAlign: 'center' },

  sectionTitle: { fontSize: 14, fontWeight: '600', color: '#fff', marginBottom: 16 },
  clusterRow: { flexDirection: 'row', alignItems: 'center', marginBottom: 14 },
  dot: { width: 8, height: 8, borderRadius: 4, marginRight: 8 },
  clusterName: { width: 72, fontSize: 12, color: '#888' },
  clusterBar: { flex: 1, height: 8, backgroundColor: '#1a1a2e', borderRadius: 4, marginHorizontal: 10 },
  clusterFill: { height: 8, borderRadius: 4 },
  clusterPercent: { width: 36, fontSize: 12, color: '#888', textAlign: 'right' },

  summaryCard: {
    backgroundColor: '#111118', borderRadius: 12, padding: 16,
    marginTop: 8, marginBottom: 40, borderWidth: 0.5, borderColor: '#222'
  },
  summaryTitle: { fontSize: 13, fontWeight: '700', color: '#7b5ea7', marginBottom: 8 },
  summaryText: { fontSize: 13, color: '#666', lineHeight: 22 },
});