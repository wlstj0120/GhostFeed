import { StyleSheet, Text, View, ScrollView, ActivityIndicator, TouchableOpacity, Share, Dimensions } from 'react-native';
import { useState, useCallback } from 'react';
import { useFocusEffect, useNavigation } from '@react-navigation/native';
import { getYoutubeReport, getRedditReport } from '../api/ghostApi';
import Svg, { Path, Circle, Text as SvgText } from 'react-native-svg';

const { width: SCREEN_WIDTH } = Dimensions.get('window');

const COLORS = {
  background: '#f6f8fc', card: '#ffffff',
  primary: '#3182f6', mint: '#00c2a8', orange: '#ffb84d', red: '#ff6b81',
  reddit: '#ff4500', redditLight: '#fff3ee',
  text: '#111827', sub: '#6b7280', soft: '#9ca3af', border: '#edf1f7',
};

const CAT_COLORS = [
  '#3182f6', '#7b61ff', '#ff5c7a', '#00c896',
  '#ffb84d', '#ff7a59', '#22c55e', '#06b6d4',
  '#f43f5e', '#a855f7', '#84cc16', '#f97316',
];

// 편향 점수 → 4단계 (기준 상향 조정)
function getBiasWarning(score) {
  if (score >= 73) return {
    level: '위험', emoji: '🔴',
    title: '심각한 필터버블 상태예요!',
    message: '알고리즘이 당신을 완전히 장악했어요.\n지금 바로 파괴 탭에서 탈출해보세요!',
    bgColor: '#fff0f0', borderColor: '#ff6b81', textColor: '#c0392b',
    gaugeColor: '#ff3b30', showButton: true,
  };
  if (score >= 61) return {
    level: '경고', emoji: '🟠',
    title: '알고리즘에 갇히고 있어요',
    message: '편향이 위험 수준에 가까워지고 있어요.\n다양한 콘텐츠를 탐색해보세요.',
    bgColor: '#fff8ee', borderColor: '#ffb84d', textColor: '#d68910',
    gaugeColor: '#ff9500', showButton: true,
  };
  if (score >= 41) return {
    level: '주의', emoji: '🟡',
    title: '편향이 조금 감지됩니다',
    message: '아직 심각하지 않지만 주의가 필요해요.\n새로운 장르를 탐색해보는 건 어떨까요?',
    bgColor: '#fffde7', borderColor: '#f9ca24', textColor: '#b7950b',
    gaugeColor: '#ffcc00', showButton: false,
  };
  return {
    level: '양호', emoji: '🟢',
    title: '다양한 콘텐츠를 소비하고 있어요!',
    message: '훌륭해요! 알고리즘 편향에서 자유로운 상태예요.',
    bgColor: '#eefcf9', borderColor: '#00c2a8', textColor: '#0e8c7a',
    gaugeColor: '#34c759', showButton: false,
  };
}

// 반원 게이지 컴포넌트
function SemiGauge({ score, color }) {
  const SIZE = 200;
  const CX = SIZE / 2;
  const CY = SIZE / 2 + 10;
  const R = 78;
  const STROKE = 14;

  // 반원 호 경로 (좌→우, 아래쪽 반원)
  const bgPath = `M ${CX - R} ${CY} A ${R} ${R} 0 0 1 ${CX + R} ${CY}`;

  // 진행률 (0~1), score는 0~85 기준
  const pct = Math.min(score / 85, 1);
  const angle = Math.PI * pct; // 0 ~ π
  const ex = CX - R * Math.cos(angle);
  const ey = CY - R * Math.sin(angle);
  const largeArc = pct > 0.5 ? 1 : 0;
  const fgPath = pct <= 0 ? '' : `M ${CX - R} ${CY} A ${R} ${R} 0 ${largeArc} 1 ${ex} ${ey}`;

  return (
    <Svg width={SIZE} height={SIZE / 2 + 30}>
      {/* 배경 반원 */}
      <Path d={bgPath} fill="none" stroke="#eef2f7" strokeWidth={STROKE} strokeLinecap="round" />
      {/* 진행 반원 */}
      {fgPath ? (
        <Path d={fgPath} fill="none" stroke={color} strokeWidth={STROKE} strokeLinecap="round" />
      ) : null}
      {/* 점수 텍스트 */}
      <SvgText x={CX} y={CY + 4} textAnchor="middle" fontSize={36} fontWeight="900" fill={color}>
        {score}
      </SvgText>
      <SvgText x={CX} y={CY + 22} textAnchor="middle" fontSize={12} fontWeight="600" fill="#9ca3af">
        / 85점
      </SvgText>
      {/* 좌우 라벨 */}
      <SvgText x={CX - R - 2} y={CY + 18} textAnchor="middle" fontSize={10} fill="#9ca3af">0</SvgText>
      <SvgText x={CX + R + 2} y={CY + 18} textAnchor="middle" fontSize={10} fill="#9ca3af">85</SvgText>
    </Svg>
  );
}

export default function ReportScreen() {
  const [activeTab, setActiveTab] = useState('youtube');
  const [youtubeReport, setYoutubeReport] = useState(null);
  const [redditReport, setRedditReport] = useState(null);
  const [loading, setLoading] = useState(true);
  const navigation = useNavigation();

  useFocusEffect(
    useCallback(() => {
      setLoading(true);
      Promise.all([getYoutubeReport(), getRedditReport()])
        .then(([yt, rd]) => {
          setYoutubeReport(yt);
          setRedditReport(rd);
          setLoading(false);
        })
        .catch(() => setLoading(false));
    }, [])
  );

  const report = activeTab === 'youtube' ? youtubeReport : redditReport;
  const isReddit = activeTab === 'reddit';
  const accentColor = isReddit ? COLORS.reddit : COLORS.primary;

  const handleShare = async () => {
    if (!report) return;
    const categoryText = report.categories.map(cat => `• ${cat.name}: ${cat.percent}%`).join('\n');
    const platform = isReddit ? 'Reddit' : 'YouTube';
    const message = `👻 Ghost Feed ${platform} 주간 리포트\n\n📊 편향 점수: ${report.biasScore}점\n🌱 다양성 지수: ${report.diversity}%\n🔍 총 분석 횟수: ${report.totalAnalyzed}회\n\n📌 카테고리 분석\n${categoryText}`.trim();
    try { await Share.share({ message }); } catch (e) { console.log(e); }
  };

  if (loading) {
    return (
      <View style={styles.center}>
        <ActivityIndicator size="large" color={COLORS.orange} />
        <Text style={styles.loadingText}>리포트 불러오는 중...</Text>
      </View>
    );
  }

  const hasData = report && report.categories && report.categories.length > 0;
  const biasWarning = hasData ? getBiasWarning(report.biasScore) : null;

  return (
    <ScrollView style={styles.container} showsVerticalScrollIndicator={false}>

      {/* 헤더 */}
      <View style={styles.header}>
        <View>
          <Text style={styles.title}>주간 리포트</Text>
          <Text style={styles.sub}>이번 주 알고리즘 분석 결과</Text>
        </View>
        {hasData && (
          <TouchableOpacity style={styles.shareBtn} onPress={handleShare} activeOpacity={0.8}>
            <Text style={styles.shareText}>공유 ↗</Text>
          </TouchableOpacity>
        )}
      </View>

      {/* 플랫폼 탭 */}
      <View style={styles.tabBox}>
        <TouchableOpacity
          style={[styles.tabBtn, !isReddit && styles.tabBtnActive]}
          onPress={() => setActiveTab('youtube')}
        >
          <Text style={[styles.tabText, !isReddit && styles.tabTextActive]}>▶ YouTube</Text>
        </TouchableOpacity>
        <TouchableOpacity
          style={[styles.tabBtn, isReddit && styles.tabBtnActiveReddit]}
          onPress={() => setActiveTab('reddit')}
        >
          <Text style={[styles.tabText, isReddit && styles.tabTextActiveReddit]}>🤖 Reddit</Text>
        </TouchableOpacity>
      </View>

      {!hasData ? (
        <View style={styles.emptyBox}>
          <Text style={styles.emptyEmoji}>{isReddit ? '🤖' : '▶'}</Text>
          <Text style={styles.emptyTitle}>
            {isReddit ? 'Reddit' : 'YouTube'} 분석 데이터가 없어요
          </Text>
          <Text style={styles.emptySub}>
            {isReddit
              ? '홈에서 Reddit URL 또는 해시태그를 분석해보세요'
              : '홈에서 YouTube URL을 분석해보세요'}
          </Text>
        </View>
      ) : (
        <>
          {/* 편향 점수 카드 + 반원 게이지 */}
          <View style={[styles.scoreCard, isReddit && { borderColor: '#ffd9c0', borderWidth: 1.5 }]}>
            <Text style={styles.scoreLabel}>
              {isReddit ? 'Reddit' : 'YouTube'} 알고리즘 편향 점수
            </Text>
            <SemiGauge score={report.biasScore} color={biasWarning.gaugeColor} />
            <Text style={styles.scoreSub}>85점에 가까울수록 편향 상태</Text>
            <View style={[styles.commentBadge, { backgroundColor: biasWarning.borderColor + '20' }]}>
              <Text style={[styles.commentText, { color: biasWarning.textColor }]}>
                {biasWarning.emoji} {biasWarning.level} — {biasWarning.title}
              </Text>
            </View>
          </View>

          {/* 편향 경고 배너 */}
          <View style={[styles.warningCard, {
            backgroundColor: biasWarning.bgColor,
            borderColor: biasWarning.borderColor,
          }]}>
            <View style={styles.warningTop}>
              <Text style={styles.warningEmoji}>{biasWarning.emoji}</Text>
              <View style={{ flex: 1 }}>
                <View style={[styles.warningLevelBadge, { backgroundColor: biasWarning.borderColor }]}>
                  <Text style={styles.warningLevelText}>{biasWarning.level}</Text>
                </View>
                <Text style={[styles.warningTitle, { color: biasWarning.textColor }]}>
                  {biasWarning.title}
                </Text>
                <Text style={styles.warningMessage}>{biasWarning.message}</Text>
              </View>
            </View>
            {biasWarning.showButton && (
              <TouchableOpacity
                style={[styles.warningButton, { backgroundColor: biasWarning.borderColor }]}
                onPress={() => navigation.navigate('파괴')}
                activeOpacity={0.85}
              >
                <Text style={styles.warningButtonText}>👻 지금 바로 파괴하기</Text>
              </TouchableOpacity>
            )}
          </View>

          {/* 통계 3칸 */}
          <View style={styles.statsRow}>
            <View style={styles.statCard}>
              <Text style={[styles.statValue, { color: accentColor }]}>{report.diversity}%</Text>
              <Text style={styles.statLabel}>다양성 지수</Text>
            </View>
            <View style={styles.statCard}>
              <Text style={[styles.statValue, { color: COLORS.text }]}>{report.totalAnalyzed}</Text>
              <Text style={styles.statLabel}>총 분석 횟수</Text>
            </View>
            <View style={styles.statCard}>
              <Text style={[styles.statValue, { color: biasWarning.gaugeColor }]}>
                {report.categories?.length ?? 0}
              </Text>
              <Text style={styles.statLabel}>카테고리 수</Text>
            </View>
          </View>

          {/* 카테고리 분석 */}
          <View style={styles.section}>
            <Text style={styles.sectionTitle}>카테고리 분석</Text>
            {[...report.categories]
              .sort((a, b) => b.percent - a.percent)
              .map((cat, i) => {
                const origIdx = report.categories.findIndex(x => x.name === cat.name);
                const color = CAT_COLORS[origIdx % CAT_COLORS.length];
                const isTop = i === 0;
                return (
                  <View key={cat.name} style={[styles.categoryRow, isTop && styles.categoryRowTop]}>
                    <View style={styles.categoryTop}>
                      <View style={styles.categoryLeft}>
                        <View style={[styles.categoryDot, { backgroundColor: color }]} />
                        <Text style={[styles.categoryName, isTop && { color, fontWeight: '800' }]}>
                          {cat.name}
                        </Text>
                        {isTop && (
                          <View style={[styles.topBadge, { backgroundColor: color + '20' }]}>
                            <Text style={[styles.topBadgeText, { color }]}>TOP</Text>
                          </View>
                        )}
                      </View>
                      <Text style={[styles.categoryPercent, isTop && { color, fontWeight: '800' }]}>
                        {cat.percent}%
                      </Text>
                    </View>
                    <View style={styles.barBg}>
                      <View style={[styles.barFill, { width: `${cat.percent}%`, backgroundColor: color }]} />
                    </View>
                  </View>
                );
              })}
          </View>

          {/* 편향 점수 변화 히스토리 */}
          {report.history && report.history.length > 1 && (
            <View style={styles.historyCard}>
              <Text style={styles.sectionTitle}>편향 점수 변화</Text>
              <Text style={styles.sectionSub}>최근 분석 기록 추이</Text>
              <View style={styles.historyRow}>
                {report.history.map((score, i) => {
                  const maxH = 100;
                  const barH = Math.max(12, (score / 85) * maxH);
                  const barColor = score >= 71 ? '#ff3b30' : score >= 56 ? '#ff9500' : score >= 31 ? '#ffcc00' : '#34c759';
                  const isLast = i === report.history.length - 1;
                  return (
                    <View key={i} style={styles.historyItem}>
                      <Text style={[styles.historyScore, isLast && { color: barColor, fontWeight: '800' }]}>
                        {score}
                      </Text>
                      <View style={[styles.historyBar, {
                        height: barH,
                        backgroundColor: barColor,
                        opacity: isLast ? 1 : 0.5,
                      }]} />
                      <Text style={styles.historyIdx}>{i + 1}회</Text>
                    </View>
                  );
                })}
              </View>
            </View>
          )}

          {/* 다양성 + 조언 카드 */}
          <View style={[styles.tipCard, { backgroundColor: biasWarning.bgColor, borderColor: biasWarning.borderColor }]}>
            <Text style={[styles.tipTitle, { color: biasWarning.textColor }]}>
              🌱 다양성 지수
            </Text>
            <Text style={[styles.tipValue, { color: biasWarning.gaugeColor }]}>
              {report.diversity}%
            </Text>
            <Text style={styles.tipSub}>
              {isReddit
                ? 'Reddit에서 다양한 서브레딧을 탐색하면 지수가 높아져요'
                : '추천 콘텐츠를 꾸준히 탐색하면 다양성이 더 높아져요'}
            </Text>
          </View>
        </>
      )}
      <View style={{ height: 120 }} />
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: COLORS.background, paddingHorizontal: 20 },
  center: { flex: 1, backgroundColor: COLORS.background, alignItems: 'center', justifyContent: 'center' },
  loadingText: { marginTop: 14, fontSize: 14, color: COLORS.sub, fontWeight: '600' },

  header: { marginTop: 72, marginBottom: 20, flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  title: { fontSize: 32, fontWeight: '800', color: COLORS.text },
  sub: { fontSize: 14, color: COLORS.sub, marginTop: 6 },
  shareBtn: { backgroundColor: '#f0f4ff', paddingHorizontal: 16, paddingVertical: 10, borderRadius: 14 },
  shareText: { color: COLORS.primary, fontWeight: '700', fontSize: 13 },

  tabBox: { flexDirection: 'row', backgroundColor: '#e5e7eb', borderRadius: 14, padding: 4, marginBottom: 20 },
  tabBtn: { flex: 1, paddingVertical: 12, borderRadius: 10, alignItems: 'center' },
  tabBtnActive: { backgroundColor: '#ffffff' },
  tabBtnActiveReddit: { backgroundColor: '#ffffff' },
  tabText: { fontSize: 13, fontWeight: '700', color: '#6b7280' },
  tabTextActive: { color: '#3182f6' },
  tabTextActiveReddit: { color: '#ff4500' },

  emptyBox: { alignItems: 'center', paddingVertical: 60 },
  emptyEmoji: { fontSize: 52, marginBottom: 14 },
  emptyTitle: { fontSize: 20, fontWeight: '800', color: COLORS.text, marginBottom: 8 },
  emptySub: { fontSize: 14, color: COLORS.sub, textAlign: 'center', lineHeight: 22 },

  // 편향 점수 카드
  scoreCard: {
    backgroundColor: COLORS.card, borderRadius: 28,
    paddingVertical: 28, paddingHorizontal: 24,
    alignItems: 'center', marginBottom: 16,
    shadowColor: '#000', shadowOpacity: 0.04, shadowRadius: 20, elevation: 3,
  },
  scoreLabel: { fontSize: 14, color: COLORS.sub, marginBottom: 8, fontWeight: '600' },
  scoreSub: { fontSize: 12, color: COLORS.soft, marginTop: 4 },
  commentBadge: { marginTop: 14, paddingHorizontal: 16, paddingVertical: 10, borderRadius: 20 },
  commentText: { fontSize: 13, fontWeight: '700', textAlign: 'center' },

  // 경고 배너
  warningCard: { borderRadius: 22, padding: 20, marginBottom: 20, borderWidth: 1.5 },
  warningTop: { flexDirection: 'row', alignItems: 'flex-start', gap: 12 },
  warningEmoji: { fontSize: 28, marginTop: 2 },
  warningLevelBadge: { alignSelf: 'flex-start', paddingHorizontal: 10, paddingVertical: 3, borderRadius: 20, marginBottom: 6 },
  warningLevelText: { fontSize: 11, fontWeight: '800', color: '#fff' },
  warningTitle: { fontSize: 15, fontWeight: '800', marginBottom: 5 },
  warningMessage: { fontSize: 13, color: COLORS.sub, lineHeight: 20 },
  warningButton: { marginTop: 16, paddingVertical: 14, borderRadius: 16, alignItems: 'center' },
  warningButtonText: { color: '#fff', fontSize: 15, fontWeight: '800' },

  // 통계 3칸
  statsRow: { flexDirection: 'row', gap: 10, marginBottom: 20 },
  statCard: {
    flex: 1, backgroundColor: COLORS.card, borderRadius: 20, paddingVertical: 20,
    alignItems: 'center', shadowColor: '#000', shadowOpacity: 0.03, shadowRadius: 12, elevation: 2,
  },
  statValue: { fontSize: 24, fontWeight: '800', marginBottom: 4 },
  statLabel: { fontSize: 11, color: COLORS.sub, textAlign: 'center', fontWeight: '600' },

  // 카테고리
  section: {
    backgroundColor: COLORS.card, borderRadius: 24, padding: 22, marginBottom: 20,
    shadowColor: '#000', shadowOpacity: 0.03, shadowRadius: 12, elevation: 2,
  },
  sectionTitle: { fontSize: 17, fontWeight: '800', color: COLORS.text, marginBottom: 4 },
  sectionSub: { fontSize: 12, color: COLORS.soft, marginBottom: 16 },
  categoryRow: { marginBottom: 14 },
  categoryRowTop: { marginBottom: 18 },
  categoryTop: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 8 },
  categoryLeft: { flexDirection: 'row', alignItems: 'center', gap: 8 },
  categoryDot: { width: 8, height: 8, borderRadius: 4 },
  categoryName: { fontSize: 13, color: COLORS.text, fontWeight: '600' },
  topBadge: { paddingHorizontal: 7, paddingVertical: 2, borderRadius: 8 },
  topBadgeText: { fontSize: 10, fontWeight: '800' },
  categoryPercent: { fontSize: 13, color: COLORS.sub, fontWeight: '700' },
  barBg: { height: 10, backgroundColor: '#eef2f7', borderRadius: 10, overflow: 'hidden' },
  barFill: { height: 10, borderRadius: 10 },

  // 히스토리
  historyCard: {
    backgroundColor: COLORS.card, borderRadius: 24, padding: 22, marginBottom: 20,
    shadowColor: '#000', shadowOpacity: 0.03, shadowRadius: 12, elevation: 2,
  },
  historyRow: { flexDirection: 'row', alignItems: 'flex-end', height: 130, gap: 6, marginTop: 16 },
  historyItem: { flex: 1, alignItems: 'center', justifyContent: 'flex-end' },
  historyBar: { width: '100%', borderRadius: 8, minHeight: 12 },
  historyScore: { fontSize: 11, color: COLORS.sub, marginBottom: 4, fontWeight: '600' },
  historyIdx: { fontSize: 10, color: COLORS.soft, marginTop: 5 },

  // 다양성 카드
  tipCard: { borderRadius: 26, borderWidth: 1.5, padding: 24, alignItems: 'center', marginBottom: 20 },
  tipTitle: { fontSize: 15, fontWeight: '700', marginBottom: 8 },
  tipValue: { fontSize: 44, fontWeight: '900', marginBottom: 8 },
  tipSub: { fontSize: 13, color: COLORS.sub, textAlign: 'center', lineHeight: 22 },
});
