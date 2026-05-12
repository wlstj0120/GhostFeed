import {
  StyleSheet,
  Text,
  View,
  ScrollView,
  ActivityIndicator,
  TouchableOpacity,
  Share,
} from 'react-native';

import { useState, useCallback } from 'react';
import { useFocusEffect } from '@react-navigation/native';
import { getWeeklyReport } from '../api/ghostApi';

const COLORS = {
  background: '#f6f8fc',
  card: '#ffffff',
  primary: '#5b6cff',
  mint: '#00c2a8',
  orange: '#ffb84d',
  red: '#ff6b81',

  text: '#111827',
  sub: '#6b7280',
  soft: '#9ca3af',
  border: '#edf1f7',
};

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
        .catch(() => {
          setLoading(false);
        });
    }, [])
  );

  const handleShare = async () => {
    if (!report) return;

    const categoryText = report.categories
      .map(cat => `• ${cat.name}: ${cat.percent}%`)
      .join('\n');

    const message = `
👻 Ghost Feed 주간 리포트

📊 편향 점수: ${report.biasScore}점
🌱 다양성 지수: ${report.diversity}%
🔍 총 분석 횟수: ${report.totalAnalyzed}회

📌 카테고리 분석
${categoryText}

${
  report.biasScore >= 70
    ? '⚠️ 알고리즘 편향이 강한 상태예요!'
    : report.biasScore >= 40
    ? '🟡 편향이 줄어들고 있어요!'
    : '✅ 다양한 콘텐츠를 소비 중이에요!'
}
    `.trim();

    try {
      await Share.share({ message });
    } catch (e) {
      console.log(e);
    }
  };

  if (loading) {
    return (
      <View style={styles.center}>
        <ActivityIndicator
          size="large"
          color={COLORS.orange}
        />

        <Text style={styles.loadingText}>
          리포트 불러오는 중...
        </Text>
      </View>
    );
  }

  if (!report || report.categories.length === 0) {
    return (
      <View style={styles.center}>
        <Text style={styles.emptyEmoji}>📊</Text>

        <Text style={styles.emptyTitle}>
          아직 분석 데이터가 없어요
        </Text>

        <Text style={styles.emptySub}>
          홈 화면에서 URL을 먼저 분석해보세요
        </Text>
      </View>
    );
  }

  const getBiasComment = score => {
    if (score >= 70) {
      return {
        text: '알고리즘 편향이 강한 상태예요',
        color: COLORS.red,
      };
    }

    if (score >= 40) {
      return {
        text: '편향이 점점 줄어드는 중이에요',
        color: COLORS.orange,
      };
    }

    return {
      text: '다양한 콘텐츠를 소비하고 있어요',
      color: COLORS.mint,
    };
  };

  const biasComment = getBiasComment(report.biasScore);

  return (
    <ScrollView
      style={styles.container}
      showsVerticalScrollIndicator={false}
    >
      {/* 헤더 */}
      <View style={styles.header}>
        <View>
          <Text style={styles.title}>
            주간 리포트
          </Text>

          <Text style={styles.sub}>
            이번 주 알고리즘 분석 결과
          </Text>
        </View>

        <TouchableOpacity
          style={styles.shareBtn}
          onPress={handleShare}
          activeOpacity={0.8}
        >
          <Text style={styles.shareText}>
            공유
          </Text>
        </TouchableOpacity>
      </View>

      {/* 편향 점수 */}
      <View style={styles.scoreCard}>
        <Text style={styles.scoreLabel}>
          알고리즘 편향 점수
        </Text>

        <Text style={styles.scoreNum}>
          {report.biasScore}
        </Text>

        <Text style={styles.scoreSub}>
          100점에 가까울수록 편향 상태
        </Text>

        <View
          style={[
            styles.commentBadge,
            {
              backgroundColor:
                biasComment.color + '18',
            },
          ]}
        >
          <Text
            style={[
              styles.commentText,
              { color: biasComment.color },
            ]}
          >
            {biasComment.text}
          </Text>
        </View>
      </View>

      {/* 통계 */}
      <View style={styles.statsRow}>
        <View style={styles.statCard}>
          <Text style={styles.statValue}>
            {report.diversity}%
          </Text>

          <Text style={styles.statLabel}>
            다양성 지수
          </Text>
        </View>

        <View style={styles.statCard}>
          <Text style={styles.statValue}>
            {report.totalAnalyzed}
          </Text>

          <Text style={styles.statLabel}>
            총 분석 횟수
          </Text>
        </View>
      </View>

      {/* 카테고리 */}
      <View style={styles.section}>
        <Text style={styles.sectionTitle}>
          카테고리 분석
        </Text>

        {report.categories.map((cat, i) => {
          const colors = [
            '#5b6cff',
            '#00c2a8',
            '#ff6b81',
            '#ffb84d',
            '#8b5cf6',
            '#06b6d4',
            '#22c55e',
          ];

          const color =
            colors[i % colors.length];

          return (
            <View
              key={cat.name}
              style={styles.categoryRow}
            >
              <View style={styles.categoryTop}>
                <Text style={styles.categoryName}>
                  {cat.name}
                </Text>

                <Text style={styles.categoryPercent}>
                  {cat.percent}%
                </Text>
              </View>

              <View style={styles.barBg}>
                <View
                  style={[
                    styles.barFill,
                    {
                      width: `${cat.percent}%`,
                      backgroundColor: color,
                    },
                  ]}
                />
              </View>
            </View>
          );
        })}
      </View>

      {/* 변화 그래프 */}
      {report.history &&
        report.history.length > 1 && (
          <View style={styles.historyCard}>
            <Text style={styles.sectionTitle}>
              편향 점수 변화
            </Text>

            <View style={styles.historyRow}>
              {report.history.map(
                (score, i) => (
                  <View
                    key={i}
                    style={styles.historyItem}
                  >
                    <View
                      style={[
                        styles.historyBar,
                        {
                          height: `${score}%`,
                          backgroundColor:
                            score >= 70
                              ? COLORS.red
                              : score >= 40
                              ? COLORS.orange
                              : COLORS.mint,
                        },
                      ]}
                    />

                    <Text
                      style={styles.historyScore}
                    >
                      {score}
                    </Text>
                  </View>
                )
              )}
            </View>
          </View>
        )}

      {/* 하단 카드 */}
      <View style={styles.tipCard}>
        <Text style={styles.tipTitle}>
          🌱 다양성 지수
        </Text>

        <Text style={styles.tipValue}>
          {report.diversity}%
        </Text>

        <Text style={styles.tipSub}>
          추천 콘텐츠를 꾸준히 탐색하면
          다양성이 더 높아져요
        </Text>
      </View>

      <View style={{ height: 120 }} />
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: COLORS.background,
    paddingHorizontal: 20,
  },

  center: {
    flex: 1,
    backgroundColor: COLORS.background,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 30,
  },

  loadingText: {
    marginTop: 14,
    fontSize: 14,
    color: COLORS.sub,
    fontWeight: '600',
  },

  emptyEmoji: {
    fontSize: 52,
    marginBottom: 14,
  },

  emptyTitle: {
    fontSize: 20,
    fontWeight: '800',
    color: COLORS.text,
    marginBottom: 8,
  },

  emptySub: {
    fontSize: 14,
    color: COLORS.sub,
    textAlign: 'center',
    lineHeight: 22,
  },

  header: {
    marginTop: 72,
    marginBottom: 28,

    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },

  title: {
    fontSize: 32,
    fontWeight: '800',
    color: COLORS.text,
  },

  sub: {
    fontSize: 14,
    color: COLORS.sub,
    marginTop: 6,
  },

  shareBtn: {
    backgroundColor: '#fff4dd',

    paddingHorizontal: 16,
    paddingVertical: 10,

    borderRadius: 14,
  },

  shareText: {
    color: COLORS.orange,
    fontWeight: '700',
    fontSize: 13,
  },

  scoreCard: {
    backgroundColor: COLORS.card,

    borderRadius: 28,

    paddingVertical: 34,
    paddingHorizontal: 24,

    alignItems: 'center',

    marginBottom: 18,

    shadowColor: '#000',
    shadowOffset: {
      width: 0,
      height: 10,
    },
    shadowOpacity: 0.04,
    shadowRadius: 20,

    elevation: 3,
  },

  scoreLabel: {
    fontSize: 14,
    color: COLORS.sub,
    marginBottom: 10,
    fontWeight: '600',
  },

  scoreNum: {
    fontSize: 68,
    fontWeight: '900',
    color: COLORS.orange,
    lineHeight: 78,
  },

  scoreSub: {
    fontSize: 13,
    color: COLORS.soft,
    marginTop: 4,
  },

  commentBadge: {
    marginTop: 18,

    paddingHorizontal: 16,
    paddingVertical: 10,

    borderRadius: 20,
  },

  commentText: {
    fontSize: 13,
    fontWeight: '700',
  },

  statsRow: {
    flexDirection: 'row',
    gap: 14,
    marginBottom: 24,
  },

  statCard: {
    flex: 1,

    backgroundColor: COLORS.card,

    borderRadius: 22,

    paddingVertical: 24,

    alignItems: 'center',

    shadowColor: '#000',
    shadowOffset: {
      width: 0,
      height: 6,
    },
    shadowOpacity: 0.03,
    shadowRadius: 12,

    elevation: 2,
  },

  statValue: {
    fontSize: 28,
    fontWeight: '800',
    color: COLORS.text,
    marginBottom: 6,
  },

  statLabel: {
    fontSize: 12,
    color: COLORS.sub,
  },

  section: {
    backgroundColor: COLORS.card,

    borderRadius: 24,

    padding: 22,

    marginBottom: 20,

    shadowColor: '#000',
    shadowOffset: {
      width: 0,
      height: 6,
    },
    shadowOpacity: 0.03,
    shadowRadius: 12,

    elevation: 2,
  },

  sectionTitle: {
    fontSize: 17,
    fontWeight: '800',
    color: COLORS.text,
    marginBottom: 20,
  },

  categoryRow: {
    marginBottom: 18,
  },

  categoryTop: {
    flexDirection: 'row',
    justifyContent: 'space-between',

    marginBottom: 8,
  },

  categoryName: {
    fontSize: 14,
    color: COLORS.text,
    fontWeight: '700',
  },

  categoryPercent: {
    fontSize: 13,
    color: COLORS.sub,
    fontWeight: '700',
  },

  barBg: {
    height: 10,
    backgroundColor: '#eef2f7',
    borderRadius: 10,
    overflow: 'hidden',
  },

  barFill: {
    height: 10,
    borderRadius: 10,
  },

  historyCard: {
    backgroundColor: COLORS.card,

    borderRadius: 24,

    padding: 22,

    marginBottom: 20,

    shadowColor: '#000',
    shadowOffset: {
      width: 0,
      height: 6,
    },
    shadowOpacity: 0.03,
    shadowRadius: 12,

    elevation: 2,
  },

  historyRow: {
    flexDirection: 'row',
    alignItems: 'flex-end',

    height: 120,

    gap: 8,
  },

  historyItem: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'flex-end',
  },

  historyBar: {
    width: '100%',
    borderRadius: 8,
    minHeight: 12,
  },

  historyScore: {
    fontSize: 11,
    color: COLORS.sub,
    marginTop: 6,
    fontWeight: '600',
  },

  tipCard: {
    backgroundColor: '#eefcf9',

    borderRadius: 26,

    padding: 24,

    alignItems: 'center',

    marginBottom: 20,
  },

  tipTitle: {
    fontSize: 15,
    color: COLORS.mint,
    fontWeight: '700',
    marginBottom: 8,
  },

  tipValue: {
    fontSize: 44,
    fontWeight: '900',
    color: COLORS.mint,
    marginBottom: 8,
  },

  tipSub: {
    fontSize: 13,
    color: COLORS.sub,
    textAlign: 'center',
    lineHeight: 22,
  },
});