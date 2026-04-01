import { StyleSheet, Text, View, FlatList, TouchableOpacity, Image, Linking } from 'react-native';
import { useState, useEffect } from 'react';
import { getAntiKeywords } from '../api/ghostApi';

export default function DestroyScreen() {
  const [keywords, setKeywords] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    getAntiKeywords()
      .then(data => {
        setKeywords(data.keywords);
        setLoading(false);
      })
      .catch(() => setLoading(false));
  }, []);

  if (loading) {
    return (
      <View style={styles.center}>
        <Text style={styles.loadingText}>AI 분석 중...</Text>
      </View>
    );
  }

  return (
    <FlatList
      style={styles.container}
      data={keywords}
      keyExtractor={i => i.videoId}
      ListHeaderComponent={
        <View>
          <Text style={styles.title}>💥 알고리즘 파괴</Text>
          <Text style={styles.sub}>당신이 평생 안 볼 것 같은 영상들</Text>
        </View>
      }
      renderItem={({ item }) => (
        <TouchableOpacity
          style={styles.card}
          onPress={() => Linking.openURL(item.url)}
        >
          <Image source={{ uri: item.thumbnail }} style={styles.thumbnail} />
          <View style={styles.cardBody}>
            <View style={styles.badge}>
              <Text style={styles.badgeText}>#{item.keyword}</Text>
            </View>
            <Text style={styles.videoTitle} numberOfLines={2}>{item.title}</Text>
            <Text style={styles.watchText}>▶ 유튜브에서 보기</Text>
          </View>
        </TouchableOpacity>
      )}
    />
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#0a0a0f', padding: 20 },
  center: { flex: 1, backgroundColor: '#0a0a0f', alignItems: 'center', justifyContent: 'center' },
  loadingText: { color: '#00f5c8', fontSize: 16 },
  title: { fontSize: 28, fontWeight: '800', color: '#00f5c8', marginTop: 50 },
  sub: { fontSize: 13, color: '#666', marginBottom: 24 },
  card: { backgroundColor: '#111118', borderRadius: 14, marginBottom: 16,
          borderWidth: 0.5, borderColor: 'rgba(0,245,200,.2)', overflow: 'hidden' },
  thumbnail: { width: '100%', height: 180 },
  cardBody: { padding: 14 },
  badge: { backgroundColor: 'rgba(255,60,172,.15)', borderRadius: 20,
           paddingHorizontal: 10, paddingVertical: 4, alignSelf: 'flex-start', marginBottom: 8 },
  badgeText: { fontSize: 11, color: '#ff3cac', fontWeight: '600' },
  videoTitle: { fontSize: 14, color: '#fff', fontWeight: '600', lineHeight: 20, marginBottom: 8 },
  watchText: { fontSize: 12, color: '#00f5c8' },
});