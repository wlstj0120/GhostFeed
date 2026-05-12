import {
  StyleSheet,
  Text,
  View,
  ScrollView,
  ActivityIndicator,
} from 'react-native';

import { useState, useCallback } from 'react';
import { useFocusEffect } from '@react-navigation/native';
import { getWeeklyReport } from '../api/ghostApi';

const COLORS = [
  '#3182f6',
  '#7b61ff',
  '#ff5c7a',
  '#00c896',
  '#ffb84d',
  '#ff7a59',
  '#22c55e',
];

const ZONE_POSITIONS = [
  { x: 10, y: 12 },
  { x: 58, y: 10 },
  { x: 12, y: 58 },
  { x: 58, y: 58 },
  { x: 35, y: 32 },
  { x: 70, y: 38 },
  { x: 18, y: 38 },
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
        .catch(() => {
          setLoading(false);
        });
    }, [])
  );

  if (loading) {
    return (
      <View style={styles.center}>
        <ActivityIndicator
          size="large"
          color="#3182f6"
        />

        <Text style={styles.loadingText}>
          편향 지도를 불러오는 중...
        </Text>
      </View>
    );
  }

  if (categories.length === 0) {
    return (
      <View style={styles.center}>
        <Text style={styles.emptyEmoji}>🗺️</Text>

        <Text style={styles.emptyTitle}>
          아직 분석 데이터가 없어요
        </Text>

        <Text style={styles.emptySub}>
          홈 화면에서 URL을 먼저 분석해보세요
        </Text>
      </View>
    );
  }

  const maxPercent = Math.max(
    ...categories.map(c => c.percent)
  );

  const dominantCat = categories.find(
    c => c.percent === maxPercent
  );

  return (
    <ScrollView
      style={styles.container}
      showsVerticalScrollIndicator={false}
    >
      <Text style={styles.pageTitle}>
        편향 지도
      </Text>

      <Text style={styles.pageSub}>
        내 알고리즘이 어떤 콘텐츠에
        집중되어 있는지 확인해보세요
      </Text>

      {dominantCat && (
        <View style={styles.mainCard}>
          <View>
            <Text style={styles.mainCardLabel}>
              가장 많이 소비한 콘텐츠
            </Text>

            <Text style={styles.mainCardTitle}>
              {dominantCat.name}
            </Text>
          </View>

          <View style={styles.percentBadge}>
            <Text style={styles.percentText}>
              {dominantCat.percent}%
            </Text>
          </View>
        </View>
      )}

      <View style={styles.mapCard}>
        <View style={styles.gridVertical} />
        <View style={styles.gridHorizontal} />

        {categories.map((c, i) => {
          const size = Math.max(
            45,
            Math.min(95, c.percent * 0.9 + 25)
          );

          const color =
            COLORS[i % COLORS.length];

          const pos =
            ZONE_POSITIONS[i] || {
              x: 20,
              y: 20,
            };

          return (
            <View
              key={c.name}
              style={[
                styles.bubble,
                {
                  left: `${pos.x}%`,
                  top: `${pos.y}%`,
                  width: size,
                  height: size,
                  borderRadius: size / 2,
                  backgroundColor: color,
                  borderWidth:
                    c.percent === maxPercent
                      ? 4
                      : 2,
                  borderColor: '#fff',
                },
              ]}
            >
              <Text
                style={[
                  styles.bubbleText,
                  {
                    fontSize:
                      size > 75 ? 12 : 10,
                  },
                ]}
              >
                {c.name.split('·')[0]}
              </Text>

              <Text
                style={[
                  styles.bubblePercent,
                  {
                    fontSize:
                      size > 75 ? 14 : 11,
                  },
                ]}
              >
                {c.percent}%
              </Text>
            </View>
          );
        })}
      </View>

      <View style={styles.sectionCard}>
        <Text style={styles.sectionTitle}>
          카테고리 분포
        </Text>

        {[...categories]
          .sort((a, b) => b.percent - a.percent)
          .map((c, i) => {
            const color =
              COLORS[
                categories.indexOf(c) %
                  COLORS.length
              ];

            return (
              <View
                key={c.name}
                style={styles.row}
              >
                <View
                  style={[
                    styles.dot,
                    {
                      backgroundColor: color,
                    },
                  ]}
                />

                <Text style={styles.rowName}>
                  {c.name}
                </Text>

                <View style={styles.barBg}>
                  <View
                    style={[
                      styles.barFill,
                      {
                        width: `${c.percent}%`,
                        backgroundColor: color,
                      },
                    ]}
                  />
                </View>

                <Text style={styles.rowPercent}>
                  {c.percent}%
                </Text>
              </View>
            );
          })}
      </View>

      {report && (
        <View style={styles.summaryCard}>
          <Text style={styles.summaryTitle}>
            분석 요약
          </Text>

          <View style={styles.summaryRow}>
            <Text style={styles.summaryLabel}>
              총 분석 콘텐츠
            </Text>

            <Text style={styles.summaryValue}>
              {report.totalAnalyzed}개
            </Text>
          </View>

          <View style={styles.summaryRow}>
            <Text style={styles.summaryLabel}>
              편향 점수
            </Text>

            <Text style={styles.summaryValue}>
              {report.biasScore}점
            </Text>
          </View>

          <View style={styles.summaryRow}>
            <Text style={styles.summaryLabel}>
              다양성 지수
            </Text>

            <Text style={styles.summaryValue}>
              {report.diversity}%
            </Text>
          </View>
        </View>
      )}

      <View style={{ height: 40 }} />
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#f6f8fb',
    paddingHorizontal: 20,
  },

  center: {
    flex: 1,
    backgroundColor: '#f6f8fb',
    justifyContent: 'center',
    alignItems: 'center',
    paddingHorizontal: 30,
  },

  loadingText: {
    marginTop: 14,
    color: '#6b7280',
    fontSize: 14,
    fontWeight: '600',
  },

  emptyEmoji: {
    fontSize: 60,
    marginBottom: 14,
  },

  emptyTitle: {
    fontSize: 22,
    fontWeight: '800',
    color: '#111827',
    marginBottom: 10,
  },

  emptySub: {
    fontSize: 14,
    color: '#6b7280',
    textAlign: 'center',
    lineHeight: 22,
  },

  pageTitle: {
    fontSize: 32,
    fontWeight: '800',
    color: '#111827',
    marginTop: 70,
    marginBottom: 10,
  },

  pageSub: {
    fontSize: 15,
    color: '#6b7280',
    lineHeight: 24,
    marginBottom: 24,
  },

  mainCard: {
    backgroundColor: '#ffffff',
    borderRadius: 24,
    padding: 22,
    marginBottom: 20,

    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',

    shadowColor: '#000',
    shadowOpacity: 0.05,
    shadowRadius: 12,
    elevation: 4,
  },

  mainCardLabel: {
    fontSize: 13,
    color: '#9ca3af',
    marginBottom: 6,
  },

  mainCardTitle: {
    fontSize: 24,
    fontWeight: '800',
    color: '#111827',
  },

  percentBadge: {
    backgroundColor: '#3182f6',
    paddingHorizontal: 18,
    paddingVertical: 12,
    borderRadius: 18,
  },

  percentText: {
    color: '#fff',
    fontSize: 18,
    fontWeight: '800',
  },

  mapCard: {
    height: 340,
    backgroundColor: '#ffffff',
    borderRadius: 28,
    marginBottom: 22,

    position: 'relative',
    overflow: 'hidden',

    shadowColor: '#000',
    shadowOpacity: 0.05,
    shadowRadius: 12,
    elevation: 4,
  },

  gridVertical: {
    position: 'absolute',
    left: '50%',
    top: 0,
    bottom: 0,
    width: 1,
    backgroundColor: '#eef2f7',
  },

  gridHorizontal: {
    position: 'absolute',
    top: '50%',
    left: 0,
    right: 0,
    height: 1,
    backgroundColor: '#eef2f7',
  },

  bubble: {
    position: 'absolute',
    justifyContent: 'center',
    alignItems: 'center',
  },

  bubbleText: {
    color: '#fff',
    fontWeight: '700',
    textAlign: 'center',
  },

  bubblePercent: {
    color: '#fff',
    fontWeight: '800',
    marginTop: 2,
  },

  sectionCard: {
    backgroundColor: '#ffffff',
    borderRadius: 24,
    padding: 22,
    marginBottom: 20,

    shadowColor: '#000',
    shadowOpacity: 0.05,
    shadowRadius: 12,
    elevation: 4,
  },

  sectionTitle: {
    fontSize: 18,
    fontWeight: '800',
    color: '#111827',
    marginBottom: 20,
  },

  row: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 18,
  },

  dot: {
    width: 10,
    height: 10,
    borderRadius: 5,
    marginRight: 10,
  },

  rowName: {
    width: 80,
    fontSize: 13,
    color: '#374151',
    fontWeight: '600',
  },

  barBg: {
    flex: 1,
    height: 10,
    backgroundColor: '#eef2f7',
    borderRadius: 10,
    marginHorizontal: 10,
    overflow: 'hidden',
  },

  barFill: {
    height: 10,
    borderRadius: 10,
  },

  rowPercent: {
    width: 42,
    fontSize: 13,
    color: '#6b7280',
    fontWeight: '700',
    textAlign: 'right',
  },

  summaryCard: {
    backgroundColor: '#ffffff',
    borderRadius: 24,
    padding: 22,

    shadowColor: '#000',
    shadowOpacity: 0.05,
    shadowRadius: 12,
    elevation: 4,
  },

  summaryTitle: {
    fontSize: 18,
    fontWeight: '800',
    color: '#111827',
    marginBottom: 18,
  },

  summaryRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: 14,
  },

  summaryLabel: {
    fontSize: 14,
    color: '#6b7280',
  },

  summaryValue: {
    fontSize: 15,
    fontWeight: '700',
    color: '#111827',
  },
});