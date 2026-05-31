import { StyleSheet, Text, View, ScrollView, ActivityIndicator, TouchableOpacity, Dimensions } from 'react-native';
import { useState, useCallback } from 'react';
import { useFocusEffect } from '@react-navigation/native';
import { getYoutubeReport, getRedditReport } from '../api/ghostApi';
import Svg, { Circle, Line, Polygon, Text as SvgText, Defs, RadialGradient, Stop, G } from 'react-native-svg';

const { width: SCREEN_WIDTH } = Dimensions.get('window');
const CHART_SIZE = SCREEN_WIDTH - 48;
const CENTER = CHART_SIZE / 2;
const MAX_RADIUS = CENTER * 0.72;

const CAT_COLORS = [
  '#3182f6', '#7b61ff', '#ff5c7a', '#00c896',
  '#ffb84d', '#ff7a59', '#22c55e', '#06b6d4',
  '#f43f5e', '#a855f7', '#84cc16', '#f97316',
];

const BAR_COLORS = ['#3182f6', '#7b61ff', '#ff5c7a', '#00c896', '#ffb84d', '#ff7a59', '#22c55e', '#06b6d4', '#f43f5e', '#a855f7', '#84cc16', '#f97316'];

// 편향 점수 → 위험도 색상
function getBiasColor(score) {
  if (score >= 73) return '#ff3b30';
  if (score >= 61) return '#ff9500';
  if (score >= 41) return '#ffcc00';
  return '#34c759';
}

function getBiasLabel(score) {
  if (score >= 73) return { text: '심각한 편향', emoji: '🔴' };
  if (score >= 61) return { text: '편향 주의', emoji: '🟠' };
  if (score >= 41) return { text: '약한 편향', emoji: '🟡' };
  return { text: '균형 잡힌 소비', emoji: '🟢' };
}

// 레이더 차트 컴포넌트
function RadarChart({ categories, biasScore, isReddit }) {
  // ✅ 카테고리 최소 3개 보장 (Android RadialGradient 크래시 방지)
  if (!categories || categories.length === 0) return null;
  if (categories.length < 3) return null;

  const n = categories.length;
  const angleStep = (2 * Math.PI) / n;
  // 12시 방향에서 시작 (-π/2)
  const startAngle = -Math.PI / 2;

  // 각 카테고리의 점 좌표 계산
  const getPoint = (index, radius) => {
    const angle = startAngle + index * angleStep;
    return {
      x: CENTER + radius * Math.cos(angle),
      y: CENTER + radius * Math.sin(angle),
    };
  };

  // 배경 그리드 (5단계)
  const gridLevels = [0.2, 0.4, 0.6, 0.8, 1.0];

  // 데이터 폴리곤 좌표
  const maxVal = Math.max(...categories.map(c => c.percent));
  const dataPoints = categories.map((c, i) => {
    const ratio = Math.min(c.percent / 100, 1);
    const r = ratio * MAX_RADIUS;
    return getPoint(i, r);
  });
  const polygonPoints = dataPoints.map(p => `${p.x},${p.y}`).join(' ');

  const accentColor = isReddit ? '#ff4500' : '#3182f6';
  const biasColor = getBiasColor(biasScore || 0);

  return (
    <View style={styles.radarWrapper}>
      <Svg width={CHART_SIZE} height={CHART_SIZE}>
        <Defs>
          <RadialGradient id="biasGrad" cx={CENTER} cy={CENTER} r={MAX_RADIUS} gradientUnits="userSpaceOnUse">
            <Stop offset="0%" stopColor={accentColor} stopOpacity="0.18" />
            <Stop offset="100%" stopColor={accentColor} stopOpacity="0.04" />
          </RadialGradient>
        </Defs>

        {/* 배경 그리드 링 */}
        {gridLevels.map((level, li) => {
          const pts = Array.from({ length: n }, (_, i) => {
            const p = getPoint(i, MAX_RADIUS * level);
            return `${p.x},${p.y}`;
          }).join(' ');
          return (
            <Polygon
              key={`grid-${li}`}
              points={pts}
              fill="none"
              stroke={li === 4 ? '#d1d5db' : '#e5e7eb'}
              strokeWidth={li === 4 ? 1.5 : 1}
              strokeDasharray={li === 4 ? undefined : '4,3'}
            />
          );
        })}

        {/* 축 라인 */}
        {categories.map((_, i) => {
          const outerPt = getPoint(i, MAX_RADIUS);
          return (
            <Line
              key={`axis-${i}`}
              x1={CENTER} y1={CENTER}
              x2={outerPt.x} y2={outerPt.y}
              stroke="#e5e7eb"
              strokeWidth={1}
            />
          );
        })}

        {/* 데이터 폴리곤 채우기 */}
        <Polygon
          points={polygonPoints}
          fill="url(#biasGrad)"
          stroke={accentColor}
          strokeWidth={2.5}
          strokeLinejoin="round"
        />

        {/* 데이터 포인트 원 */}
        {dataPoints.map((p, i) => {
          const isMax = categories[i].percent === maxVal;
          return (
            <G key={`dot-${i}`}>
              {isMax && (
                <Circle
                  cx={p.x} cy={p.y}
                  r={10}
                  fill={CAT_COLORS[i % CAT_COLORS.length]}
                  opacity={0.2}
                />
              )}
              <Circle
                cx={p.x} cy={p.y}
                r={isMax ? 6 : 4}
                fill={isMax ? CAT_COLORS[i % CAT_COLORS.length] : accentColor}
                stroke="#fff"
                strokeWidth={2}
              />
            </G>
          );
        })}

        {/* 카테고리 라벨 */}
        {categories.map((c, i) => {
          const labelRadius = MAX_RADIUS + 26;
          const p = getPoint(i, labelRadius);
          const isMax = c.percent === maxVal;
          // 텍스트 앵커 조정 (좌/우/중앙)
          const angle = startAngle + i * angleStep;
          const cos = Math.cos(angle);
          let anchor = 'middle';
          if (cos > 0.3) anchor = 'start';
          else if (cos < -0.3) anchor = 'end';

          return (
            <G key={`label-${i}`}>
              <SvgText
                x={p.x}
                y={p.y - 5}
                textAnchor={anchor}
                fontSize={isMax ? 11 : 10}
                fontWeight={isMax ? '800' : '600'}
                fill={isMax ? CAT_COLORS[i % CAT_COLORS.length] : '#6b7280'}
              >
                {c.name.split('·')[0]}
              </SvgText>
              <SvgText
                x={p.x}
                y={p.y + 8}
                textAnchor={anchor}
                fontSize={isMax ? 11 : 10}
                fontWeight="700"
                fill={isMax ? CAT_COLORS[i % CAT_COLORS.length] : '#9ca3af'}
              >
                {c.percent}%
              </SvgText>
            </G>
          );
        })}

        {/* 중앙 편향 점수 */}
        <Circle cx={CENTER} cy={CENTER} r={34} fill="#fff" stroke={biasColor} strokeWidth={3} />
        <SvgText x={CENTER} y={CENTER - 6} textAnchor="middle" fontSize={18} fontWeight="900" fill={biasColor}>
          {biasScore || 0}
        </SvgText>
        <SvgText x={CENTER} y={CENTER + 10} textAnchor="middle" fontSize={9} fontWeight="600" fill="#9ca3af">
          편향점수
        </SvgText>
      </Svg>
    </View>
  );
}

export default function BiasMapScreen() {
  const [activeTab, setActiveTab] = useState('youtube');
  const [youtubeData, setYoutubeData] = useState(null);
  const [redditData, setRedditData] = useState(null);
  const [loading, setLoading] = useState(true);

  useFocusEffect(
    useCallback(() => {
      setLoading(true);
      Promise.all([getYoutubeReport(), getRedditReport()])
        .then(([yt, rd]) => {
          setYoutubeData(yt);
          setRedditData(rd);
          setLoading(false);
        })
        .catch(() => setLoading(false));
    }, [])
  );

  const isReddit = activeTab === 'reddit';
  const currentData = isReddit ? redditData : youtubeData;
  const categories = currentData?.categories || [];
  const report = currentData;
  const accentColor = isReddit ? '#ff4500' : '#3182f6';

  if (loading) {
    return (
      <View style={styles.center}>
        <ActivityIndicator size="large" color="#3182f6" />
        <Text style={styles.loadingText}>편향 지도를 불러오는 중...</Text>
      </View>
    );
  }

  const maxPercent = categories.length > 0 ? Math.max(...categories.map(c => c.percent)) : 0;
  const dominantCat = categories.find(c => c.percent === maxPercent);
  const biasLabel = report ? getBiasLabel(report.biasScore) : null;
  const biasColor = report ? getBiasColor(report.biasScore) : '#34c759';

  return (
    <ScrollView style={styles.container} showsVerticalScrollIndicator={false}>
      {/* 헤더 */}
      <Text style={styles.pageTitle}>편향 지도</Text>
      <Text style={styles.pageSub}>내 알고리즘이 어떤 콘텐츠에 집중되어 있는지 확인해보세요</Text>

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

      {categories.length === 0 ? (
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
          {/* 편향 경고 배너 */}
          {biasLabel && (
            <View style={[styles.biasBanner, { borderColor: biasColor, backgroundColor: biasColor + '12' }]}>
              <Text style={styles.biasBannerEmoji}>{biasLabel.emoji}</Text>
              <View style={{ flex: 1 }}>
                <Text style={[styles.biasBannerTitle, { color: biasColor }]}>{biasLabel.text}</Text>
                <Text style={styles.biasBannerSub}>
                  편향 점수 {report.biasScore}점 · 다양성 지수 {report.diversity}%
                </Text>
              </View>
            </View>
          )}

          {/* 가장 많이 소비한 카드 */}
          {dominantCat && (
            <View style={[styles.mainCard, { borderLeftColor: accentColor }]}>
              <View style={styles.mainCardLeft}>
                <Text style={styles.mainCardLabel}>가장 많이 소비한 콘텐츠</Text>
                <Text style={styles.mainCardTitle}>{dominantCat.name}</Text>
              </View>
              <View style={[styles.percentBadge, { backgroundColor: accentColor }]}>
                <Text style={styles.percentText}>{dominantCat.percent}%</Text>
              </View>
            </View>
          )}

          {/* 레이더 차트 - 카테고리 3개 이상일 때만 표시 */}
          {categories.length >= 3 ? (
            <View style={styles.radarCard}>
              <Text style={styles.sectionTitle}>콘텐츠 편향 레이더</Text>
              <Text style={styles.sectionSub}>중심에서 멀수록 해당 카테고리 소비가 많아요</Text>
              <RadarChart
                categories={categories}
                biasScore={report?.biasScore}
                isReddit={isReddit}
              />
            </View>
          ) : (
            <View style={styles.radarCard}>
              <Text style={styles.sectionTitle}>콘텐츠 편향 레이더</Text>
              <View style={styles.radarNotEnough}>
                <Text style={styles.radarNotEnoughEmoji}>📊</Text>
                <Text style={styles.radarNotEnoughText}>
                  레이더 차트는 3개 이상 분석 후 표시돼요
                </Text>
                <Text style={styles.radarNotEnoughSub}>
                  {isReddit ? 'Reddit' : 'YouTube'} 콘텐츠를 더 분석해보세요
                </Text>
              </View>
            </View>
          )}

          {/* 카테고리 분포 바차트 */}
          <View style={styles.sectionCard}>
            <Text style={styles.sectionTitle}>카테고리 분포</Text>
            {[...categories]
              .sort((a, b) => b.percent - a.percent)
              .map((c, i) => {
                const origIdx = categories.findIndex(x => x.name === c.name);
                const color = CAT_COLORS[origIdx % CAT_COLORS.length];
                const isTop = i === 0;
                return (
                  <View key={c.name} style={[styles.row, isTop && styles.rowTop]}>
                    <View style={[styles.rankBadge, { backgroundColor: isTop ? color : '#f3f4f6' }]}>
                      <Text style={[styles.rankText, { color: isTop ? '#fff' : '#9ca3af' }]}>
                        {i + 1}
                      </Text>
                    </View>
                    <Text style={[styles.rowName, isTop && { color: color, fontWeight: '800' }]}>
                      {c.name}
                    </Text>
                    <View style={styles.barBg}>
                      <View style={[
                        styles.barFill,
                        { width: `${c.percent}%`, backgroundColor: color },
                        isTop && styles.barFillTop,
                      ]} />
                    </View>
                    <Text style={[styles.rowPercent, isTop && { color: color, fontWeight: '800' }]}>
                      {c.percent}%
                    </Text>
                  </View>
                );
              })}
          </View>

          {/* 분석 요약 */}
          {report && (
            <View style={styles.summaryCard}>
              <Text style={styles.summaryTitle}>분석 요약</Text>
              <View style={styles.summaryGrid}>
                <View style={[styles.summaryItem, { backgroundColor: accentColor + '10' }]}>
                  <Text style={[styles.summaryValue, { color: accentColor }]}>{report.totalAnalyzed}</Text>
                  <Text style={styles.summaryLabel}>총 분석 콘텐츠</Text>
                </View>
                <View style={[styles.summaryItem, { backgroundColor: biasColor + '10' }]}>
                  <Text style={[styles.summaryValue, { color: biasColor }]}>{report.biasScore}</Text>
                  <Text style={styles.summaryLabel}>편향 점수</Text>
                </View>
                <View style={[styles.summaryItem, { backgroundColor: '#00c896' + '15' }]}>
                  <Text style={[styles.summaryValue, { color: '#00c896' }]}>{report.diversity}%</Text>
                  <Text style={styles.summaryLabel}>다양성 지수</Text>
                </View>
              </View>
            </View>
          )}
        </>
      )}
      <View style={{ height: 40 }} />
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#f6f8fb', paddingHorizontal: 20 },
  center: { flex: 1, backgroundColor: '#f6f8fb', justifyContent: 'center', alignItems: 'center' },
  loadingText: { marginTop: 14, color: '#6b7280', fontSize: 14, fontWeight: '600' },

  pageTitle: { fontSize: 32, fontWeight: '800', color: '#111827', marginTop: 70, marginBottom: 6 },
  pageSub: { fontSize: 14, color: '#6b7280', lineHeight: 22, marginBottom: 20 },

  tabBox: { flexDirection: 'row', backgroundColor: '#e5e7eb', borderRadius: 14, padding: 4, marginBottom: 20 },
  tabBtn: { flex: 1, paddingVertical: 12, borderRadius: 10, alignItems: 'center' },
  tabBtnActive: { backgroundColor: '#ffffff' },
  tabBtnActiveReddit: { backgroundColor: '#ffffff' },
  tabText: { fontSize: 13, fontWeight: '700', color: '#6b7280' },
  tabTextActive: { color: '#3182f6' },
  tabTextActiveReddit: { color: '#ff4500' },

  emptyBox: { alignItems: 'center', paddingVertical: 60 },
  emptyEmoji: { fontSize: 52, marginBottom: 14 },
  emptyTitle: { fontSize: 20, fontWeight: '800', color: '#111827', marginBottom: 8 },
  emptySub: { fontSize: 14, color: '#6b7280', textAlign: 'center', lineHeight: 22 },

  biasBanner: {
    flexDirection: 'row', alignItems: 'center', borderRadius: 18,
    borderWidth: 1.5, padding: 16, marginBottom: 16, gap: 12,
  },
  biasBannerEmoji: { fontSize: 28 },
  biasBannerTitle: { fontSize: 15, fontWeight: '800', marginBottom: 2 },
  biasBannerSub: { fontSize: 12, color: '#6b7280', fontWeight: '500' },

  mainCard: {
    backgroundColor: '#ffffff', borderRadius: 22, padding: 20, marginBottom: 16,
    flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center',
    shadowColor: '#000', shadowOpacity: 0.05, shadowRadius: 12, elevation: 4,
    borderLeftWidth: 4,
  },
  mainCardLeft: { flex: 1 },
  mainCardLabel: { fontSize: 12, color: '#9ca3af', marginBottom: 5, fontWeight: '600' },
  mainCardTitle: { fontSize: 22, fontWeight: '800', color: '#111827' },
  percentBadge: { paddingHorizontal: 16, paddingVertical: 10, borderRadius: 16, marginLeft: 12 },
  percentText: { color: '#fff', fontSize: 17, fontWeight: '800' },

  radarCard: {
    backgroundColor: '#ffffff', borderRadius: 28, paddingTop: 22, paddingHorizontal: 4,
    paddingBottom: 8, marginBottom: 20,
    shadowColor: '#000', shadowOpacity: 0.05, shadowRadius: 12, elevation: 4,
  },
  radarWrapper: { alignItems: 'center' },
  radarNotEnough: { alignItems: 'center', paddingVertical: 32, paddingHorizontal: 18 },
  radarNotEnoughEmoji: { fontSize: 40, marginBottom: 12 },
  radarNotEnoughText: { fontSize: 15, fontWeight: '700', color: '#374151', marginBottom: 6, textAlign: 'center' },
  radarNotEnoughSub: { fontSize: 13, color: '#9ca3af', textAlign: 'center' },
  sectionTitle: { fontSize: 17, fontWeight: '800', color: '#111827', marginBottom: 4, paddingHorizontal: 18 },
  sectionSub: { fontSize: 12, color: '#9ca3af', marginBottom: 16, paddingHorizontal: 18 },

  sectionCard: {
    backgroundColor: '#ffffff', borderRadius: 24, padding: 22, marginBottom: 20,
    shadowColor: '#000', shadowOpacity: 0.05, shadowRadius: 12, elevation: 4,
  },
  row: { flexDirection: 'row', alignItems: 'center', marginBottom: 14 },
  rowTop: { marginBottom: 18 },
  rankBadge: { width: 24, height: 24, borderRadius: 8, alignItems: 'center', justifyContent: 'center', marginRight: 10 },
  rankText: { fontSize: 12, fontWeight: '800' },
  rowName: { width: 76, fontSize: 12, color: '#374151', fontWeight: '600' },
  barBg: { flex: 1, height: 10, backgroundColor: '#eef2f7', borderRadius: 10, marginHorizontal: 8, overflow: 'hidden' },
  barFill: { height: 10, borderRadius: 10 },
  barFillTop: { shadowColor: '#000', shadowOpacity: 0.15, shadowRadius: 4 },
  rowPercent: { width: 40, fontSize: 12, color: '#6b7280', fontWeight: '700', textAlign: 'right' },

  summaryCard: {
    backgroundColor: '#ffffff', borderRadius: 24, padding: 22, marginBottom: 16,
    shadowColor: '#000', shadowOpacity: 0.05, shadowRadius: 12, elevation: 4,
  },
  summaryTitle: { fontSize: 17, fontWeight: '800', color: '#111827', marginBottom: 16 },
  summaryGrid: { flexDirection: 'row', gap: 10 },
  summaryItem: { flex: 1, borderRadius: 16, paddingVertical: 16, alignItems: 'center' },
  summaryValue: { fontSize: 26, fontWeight: '900', marginBottom: 4 },
  summaryLabel: { fontSize: 11, color: '#6b7280', fontWeight: '600', textAlign: 'center' },
});
