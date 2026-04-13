import { StyleSheet, Text, View, ScrollView, ActivityIndicator, TouchableOpacity, Share } from 'react-native';
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

  const handleShare = async () => {
    if (!report) return;

    const categoryText = report.categories
      .map(cat => `  ${cat.name}: ${cat.percent}%`)
      .join('\n');

    const message = `
👻 Ghost Feed 알고리즘 분석 결과

📊 편향 점수: ${report.biasScore} / 100
🌱 다양성 지수: ${report.diversity}%
🔍 총 분석 횟수: ${report.totalAnalyzed}회

📌 카테고리별 편향도
${categoryText}

${report.biasScore >= 70
  ? '⚠️ 알고리즘에 많이 갇혀있어요! 파괴가 필요해요.'
  : report.biasScore >= 40
  ? '🟡 편향이 있지만 개선 중이에요!'
  : '✅ 다양한 콘텐츠를 소비하고 있어요!'}

👻 Ghost Feed로 나의 알고리즘 편향을 파괴해보세요!
    `.trim();

    try {
      await Share.share({ message });
    } catch (e) {
      console.error('공유 실패', e);
    }
  };

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

  const getBiasComment = (score) => {
    if (score >= 70) return { text: '⚠️ 알고리즘에 갇혀있어요!', color: '#ff3cac' };
    if (score >= 40) return { text: '🟡 편향이 있지만 개선 중!', color: '#ffb347' };
    return { text: '✅ 다양한 콘텐츠 소비 중!', color: '#00f5c8' };
  };

  const biasComment = getBiasComment(report.biasScore);

  return (
    <ScrollView style={styles.container}>
      <View style={styles.titleRow}>
        <View>
          <Text style={styles.title}>📊 주간 리포트</Text>
          <Text style={styles.sub}>이번 주 나의 알고리즘 편향</Text>
        </View>
        <TouchableOpacity style={styles.shareBtn} onPress={handleShare}>
          <Text style={styles.shareText}>📤 공유</Text>
        </TouchableOpacity>
      </View>

      <View style={styles.scoreCard}>
        <Text style={styles.scoreLabel}>편향 점수</Text>
        <Text style={styles.scoreNum}>{report.biasScore}</Text>
        <Text style={styles.scoreDesc}>/ 100 (높을수록 편향)</Text>
        <Text style={[styles.biasComment, { color: biasComment.color }]}>
          {biasComment.text}
        </Text>
      </View>

      <View style={styles.statsRow}>
        <View style={styles.statBox}>
          <Text style={styles.statNum}>{report.diversity}%</Text>
          <Text style={styles.statLabel}>다양성 지수</Text>
        </View>
        <View style={styles.statBox}>
          <Text style={styles.statNum}>{report.totalAnalyzed}회</Text>
          <Text style={styles.statLabel}>총 분석 횟수</Text>
        </View>
      </View>

      <Text style={styles.sectionTitle}>카테고리별 편향도</Text>
      {report.categories.map((cat, i) => {
        const colors = ['#ff3cac', '#7b5ea7', '#ffb347', '#00f5c8', '#4fc3f7', '#ff8a65', '#a5d6a7'];
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

      {report.history.length > 1 && (
        <View style={styles.historyCard}>
          <Text style={styles.sectionTitle}>편향 점수 변화</Text>
          <View style={styles.historyRow}>
            {report.history.map((score, i) => (
              <View key={i} style={styles.historyItem}>
                <View style={[styles.historyBar, {
                  height: `${score}%`,
                  backgroundColor: score >= 70 ? '#ff3cac' : score >= 40 ? '#ffb347' : '#00f5c8'
                }]} />
                <Text style={styles.historyScore}>{score}</Text>
              </View>
            ))}
          </View>
        </View>
      )}

      <View style={styles.tipCard}>
        <Text style={styles.tipText}>🌱 다양성 지수: {report.diversity}%</Text>
        <Text style={styles.tipSub}>파괴 키워드 탐색을 계속해보세요</Text>
      </View>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#0a0a0f', padding: 20 },
  center: { flex: 1, backgroundColor: '#0a0a0f', alignItems: 'center', justifyContent: 'center' },
  loadingText: { color: '#ffb347', marginTop: 12, fontSize: 14 },
  emptyText: { color: '#fff', fontSize: 18, fontWeight: '700' },
  emptySubText: { color: '#555', fontSize: 13, marginTop: 8 },
  titleRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'flex-start', marginTop: 50, marginBottom: 4 },
  title: { fontSize: 28, fontWeight: '800', color: '#ffb347' },
  sub: { fontSize: 13, color: '#666', marginBottom: 24 },
  shareBtn: { backgroundColor: 'rgba(255,179,71,0.15)', borderRadius: 20, paddingHorizontal: 14, paddingVertical: 8, borderWidth: 0.5, borderColor: 'rgba(255,179,71,.4)' },
  shareText: { fontSize: 13, color: '#ffb347', fontWeight: '600' },
  scoreCard: { backgroundColor: '#111118', borderRadius: 14, padding: 20, alignItems: 'center', marginBottom: 16, borderWidth: 0.5, borderColor: 'rgba(255,179,71,.2)' },
  scoreLabel: { fontSize: 13, color: '#888', marginBottom: 4 },
  scoreNum: { fontSize: 56, fontWeight: '800', color: '#ffb347' },
  scoreDesc: { fontSize: 12, color: '#555', marginBottom: 8 },
  biasComment: { fontSize: 14, fontWeight: '700' },
  statsRow: { flexDirection: 'row', gap: 12, marginBottom: 24 },
  statBox: { flex: 1, backgroundColor: '#111118', borderRadius: 12, padding: 16, alignItems: 'center', borderWidth: 0.5, borderColor: '#222' },
  statNum: { fontSize: 24, fontWeight: '800', color: '#fff', marginBottom: 4 },
  statLabel: { fontSize: 11, color: '#555' },
  sectionTitle: { fontSize: 14, fontWeight: '600', color: '#fff', marginBottom: 16 },
  gaugeRow: { flexDirection: 'row', alignItems: 'center', marginBottom: 14 },
  gaugeName: { width: 80, fontSize: 11, color: '#888' },
  gaugeBar: { flex: 1, height: 8, backgroundColor: '#1a1a2e', borderRadius: 4, marginHorizontal: 10 },
  gaugeFill: { height: 8, borderRadius: 4 },
  gaugePercent: { width: 36, fontSize: 12, color: '#888', textAlign: 'right' },
  historyCard: { backgroundColor: '#111118', borderRadius: 12, padding: 16, marginBottom: 16, borderWidth: 0.5, borderColor: '#222' },
  historyRow: { flexDirection: 'row', alignItems: 'flex-end', height: 80, gap: 6 },
  historyItem: { flex: 1, alignItems: 'center', justifyContent: 'flex-end' },
  historyBar: { width: '100%', borderRadius: 3, minHeight: 4 },
  historyScore: { fontSize: 9, color: '#555', marginTop: 3 },
  tipCard: { backgroundColor: 'rgba(0,245,200,.06)', borderRadius: 12, padding: 16, marginTop: 8, marginBottom: 40, borderWidth: 0.5, borderColor: 'rgba(0,245,200,.2)' },
  tipText: { fontSize: 14, fontWeight: '600', color: '#00f5c8' },
  tipSub: { fontSize: 12, color: '#555', marginTop: 4 },
});