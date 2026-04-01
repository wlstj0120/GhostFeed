import { StyleSheet, Text, View, ScrollView, ActivityIndicator } from 'react-native';
import { useState, useCallback } from 'react';
import { useFocusEffect } from '@react-navigation/native';
import { getWeeklyReport } from '../api/ghostApi';

const COLORS = ['#ff3cac', '#7b5ea7', '#ffb347', '#00f5c8', '#4fc3f7'];

export default function BiasMapScreen() {
  const [categories, setCategories] = useState([]);
  const [loading, setLoading] = useState(true);

  useFocusEffect(
    useCallback(() => {
      setLoading(true);
      getWeeklyReport()
        .then(data => {
          if (data.categories && data.categories.length > 0) {
            setCategories(data.categories);
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

  const positions = [
    { x: 25, y: 20 }, { x: 55, y: 40 },
    { x: 70, y: 15 }, { x: 15, y: 60 }, { x: 50, y: 65 },
  ];

  return (
    <ScrollView style={styles.container}>
      <Text style={styles.title}>🗺️ 편향 지도</Text>
      <Text style={styles.sub}>내가 갇혀 있는 알고리즘 공간</Text>

      <View style={styles.mapBox}>
        {categories.map((c, i) => {
          const size = Math.max(40, Math.min(80, c.percent));
          const color = COLORS[i % COLORS.length];
          const pos = positions[i] || { x: 30 + i * 10, y: 30 + i * 10 };
          return (
            <View key={c.name} style={[styles.bubble, {
              left: `${pos.x}%`, top: `${pos.y}%`,
              width: size, height: size,
              borderRadius: size / 2,
              backgroundColor: color + '33',
              borderColor: color,
            }]}>
              <Text style={[styles.bubbleText, { color }]}>{c.name}</Text>
            </View>
          );
        })}
      </View>

      <Text style={styles.sectionTitle}>클러스터 분석</Text>
      {categories.map((c, i) => {
        const color = COLORS[i % COLORS.length];
        return (
          <View key={c.name} style={styles.clusterRow}>
            <View style={[styles.dot, { backgroundColor: color }]} />
            <Text style={styles.clusterName}>{c.name}</Text>
            <View style={styles.clusterBar}>
              <View style={[styles.clusterFill, { width: `${c.percent}%`, backgroundColor: color }]} />
            </View>
            <Text style={styles.clusterPercent}>{c.percent}%</Text>
          </View>
        );
      })}
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#0a0a0f', padding: 20 },
  center: { flex: 1, backgroundColor: '#0a0a0f', alignItems: 'center', justifyContent: 'center' },
  loadingText: { color: '#7b5ea7', marginTop: 12, fontSize: 14 },
  title: { fontSize: 28, fontWeight: '800', color: '#7b5ea7', marginTop: 50 },
  sub: { fontSize: 13, color: '#666', marginBottom: 24 },
  mapBox: { width: '100%', height: 280, backgroundColor: '#111118',
            borderRadius: 16, marginBottom: 24, borderWidth: 0.5,
            borderColor: '#222', position: 'relative' },
  bubble: { position: 'absolute', borderWidth: 1,
            alignItems: 'center', justifyContent: 'center' },
  bubbleText: { fontSize: 9, fontWeight: '700', textAlign: 'center' },
  sectionTitle: { fontSize: 14, fontWeight: '600', color: '#fff', marginBottom: 16 },
  clusterRow: { flexDirection: 'row', alignItems: 'center', marginBottom: 14 },
  dot: { width: 8, height: 8, borderRadius: 4, marginRight: 8 },
  clusterName: { width: 72, fontSize: 12, color: '#888' },
  clusterBar: { flex: 1, height: 8, backgroundColor: '#1a1a2e', borderRadius: 4, marginHorizontal: 10 },
  clusterFill: { height: 8, borderRadius: 4 },
  clusterPercent: { width: 36, fontSize: 12, color: '#888', textAlign: 'right' },
});