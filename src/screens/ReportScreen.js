import { StyleSheet, Text, View, ScrollView, ActivityIndicator } from 'react-native';
import { useState, useCallback } from 'react';
import { useFocusEffect } from '@react-navigation/native';
import { getWeeklyReport } from '../api/ghostApi';

export default function ReportScreen() {
  const [report, setReport] = useState(null);
  const [loading, setLoading] = useState(true);

  useFocusEffect(
    useCallback(() => {
      setLoading(true);
      getWeeklyReport()
        .then(data => {
          setReport(data);
          setLoading(false);
        })
        .catch(() => setLoading(false));
    }, [])
  );

  if (loading) {
    return (
      <View style={styles.center}>
        <ActivityIndicator size="large" color="#ffb347" />
        <Text style={styles.loadingText}>리포트 불러오는 중...</Text>
      </View>
    );
  }

  if (!report || report.categories.length === 0) {
    return (
      <View style={styles.center}>
        <Text style={styles.emptyText}>📊 아직 분석된 데이터가 없어요</Text>
        <Text style={styles.emptySubText}>홈에서 URL을 분석해보세요!</Text>
      </View>
    );
  }

  return (
    <ScrollView style={styles.container}>
      <Text style={styles.title}>📊 주간 리포트</Text>
      <Text style={styles.sub}>이번 주 나의 알고리즘 편향</Text>

      <View style={styles.scoreCard}>
        <Text style={styles.scoreLabel}>편향 점수</Text>
        <Text style={styles.scoreNum}>{report.biasScore}</Text>
        <Text style={styles.scoreDesc}>/ 100 (높을수록 편향)</Text>
      </View>

      <Text style={styles.sectionTitle}>카테고리별 편향도</Text>
      {report.categories.map((cat, i) => {
        const colors = ['#ff3cac', '#7b5ea7', '#ffb347', '#00f5c8', '#4fc3f7'];
        const color = colors[i % colors.length];
        return (
          <View key={cat.name} style={styles.gaugeRow}>
            <Text style={styles.gaugeName}>{cat.name}</Text>
            <View style={styles.gaugeBar}>
              <View style={[styles.gaugeFill, { width: `${cat.percent}%`, backgroundColor: color }]} />
            </View>
            <Text style={styles.gaugePercent}>{cat.percent}%</Text>
          </View>
        );
      })}

      {report.history.length > 0 && (
        <View style={styles.tipCard}>
          <Text style={styles.tipText}>🌱 다양성 지수: {report.diversity}%</Text>
          <Text style={styles.tipSub}>파괴 키워드 탐색을 계속해보세요</Text>
        </View>
      )}
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#0a0a0f', padding: 20 },
  center: { flex: 1, backgroundColor: '#0a0a0f', alignItems: 'center', justifyContent: 'center' },
  loadingText: { color: '#ffb347', marginTop: 12, fontSize: 14 },
  emptyText: { color: '#fff', fontSize: 18, fontWeight: '700' },
  emptySubText: { color: '#555', fontSize: 13, marginTop: 8 },
  title: { fontSize: 28, fontWeight: '800', color: '#ffb347', marginTop: 50 },
  sub: { fontSize: 13, color: '#666', marginBottom: 24 },
  scoreCard: { backgroundColor: '#111118', borderRadius: 14, padding: 20,
               alignItems: 'center', marginBottom: 24, borderWidth: 0.5,
               borderColor: 'rgba(255,179,71,.2)' },
  scoreLabel: { fontSize: 13, color: '#888', marginBottom: 4 },
  scoreNum: { fontSize: 56, fontWeight: '800', color: '#ffb347' },
  scoreDesc: { fontSize: 12, color: '#555' },
  sectionTitle: { fontSize: 14, fontWeight: '600', color: '#fff', marginBottom: 16 },
  gaugeRow: { flexDirection: 'row', alignItems: 'center', marginBottom: 14 },
  gaugeName: { width: 80, fontSize: 12, color: '#888' },
  gaugeBar: { flex: 1, height: 8, backgroundColor: '#1a1a2e', borderRadius: 4, marginHorizontal: 10 },
  gaugeFill: { height: 8, borderRadius: 4 },
  gaugePercent: { width: 36, fontSize: 12, color: '#888', textAlign: 'right' },
  tipCard: { backgroundColor: 'rgba(0,245,200,.06)', borderRadius: 12, padding: 16,
             marginTop: 24, borderWidth: 0.5, borderColor: 'rgba(0,245,200,.2)' },
  tipText: { fontSize: 14, fontWeight: '600', color: '#00f5c8' },
  tipSub: { fontSize: 12, color: '#555', marginTop: 4 },
});