import { StyleSheet, Text, View, TextInput, TouchableOpacity, Alert, ActivityIndicator, ScrollView, StatusBar } from 'react-native';
import { useState, useEffect, useCallback } from 'react';
import { useFocusEffect } from '@react-navigation/native';
import { analyzePost, getAntiKeywords, loadHistory, clearHistory } from '../api/ghostApi';
import * as Linking from 'expo-linking';

export default function HomeScreen({ navigation }) {
  const [url, setUrl] = useState('');
  const [loading, setLoading] = useState(false);
  const [history, setHistory] = useState([]);

  useEffect(() => {
    const subscription = Linking.addEventListener('url', ({ url: incomingUrl }) => {
      const extracted = extractUrl(incomingUrl);
      if (extracted) setUrl(extracted);
    });
    Linking.getInitialURL().then((initialUrl) => {
      if (initialUrl) {
        const extracted = extractUrl(initialUrl);
        if (extracted) setUrl(extracted);
      }
    });
    return () => subscription.remove();
  }, []);

  useFocusEffect(
    useCallback(() => {
      loadHistory().then(setHistory);
    }, [])
  );

  const extractUrl = (rawUrl) => {
    try {
      if (rawUrl.includes('localhost:8081/http')) {
        return rawUrl.split('localhost:8081/')[1];
      }
      if (rawUrl.startsWith('http://localhost:8081') || rawUrl.startsWith('https://localhost:8081')) {
        return null;
      }
      const parsed = Linking.parse(rawUrl);
      if (parsed.queryParams?.url) return parsed.queryParams.url;
      if (rawUrl.startsWith('http')) return rawUrl;
    } catch {
      return null;
    }
    return null;
  };

  const handleAnalyze = async () => {
    if (!url.trim()) {
      Alert.alert('알림', 'URL을 입력해주세요!');
      return;
    }
    setLoading(true);
    try {
      await analyzePost(url);
      await getAntiKeywords();
      loadHistory().then(setHistory);
      navigation.navigate('파괴');
    } catch (e) {
      Alert.alert('오류', '서버 연결 실패. 백엔드 서버가 실행 중인지 확인해주세요.');
    } finally {
      setLoading(false);
    }
  };

  const handleClearHistory = () => {
  setHistory([]);
  clearHistory();
  try { localStorage.removeItem('history'); } catch {}
};


  const formatDate = (iso) => {
    const d = new Date(iso);
    return `${d.getMonth() + 1}/${d.getDate()} ${d.getHours()}:${String(d.getMinutes()).padStart(2, '0')}`;
  };

  const shortenUrl = (u) => {
    try {
      const { hostname } = new URL(u);
      return hostname;
    } catch {
      return u.slice(0, 30) + '...';
    }
  };

  return (
    <ScrollView style={styles.container} showsVerticalScrollIndicator={false}>
      <StatusBar barStyle="light-content" />

      <View style={styles.header}>
        <Text style={styles.emoji}>👻</Text>
        <Text style={styles.title}>Ghost Feed</Text>
        <Text style={styles.tagline}>당신의 알고리즘 편향을 파괴하세요</Text>
      </View>

      <View style={styles.card}>
        <Text style={styles.cardLabel}>분석할 URL</Text>
        <TextInput
          style={styles.input}
          placeholder="https://youtube.com/watch?v=..."
          placeholderTextColor="#444"
          value={url}
          onChangeText={setUrl}
          autoCapitalize="none"
          keyboardType="url"
        />
        <TouchableOpacity
          style={[styles.btn, loading && styles.btnDisabled]}
          onPress={handleAnalyze}
          disabled={loading}
          activeOpacity={0.8}
        >
          {loading ? (
            <View style={styles.btnInner}>
              <ActivityIndicator color="#fff" size="small" />
              <Text style={styles.btnText}>  분석 중...</Text>
            </View>
          ) : (
            <Text style={styles.btnText}>🔍 알고리즘 분석하기</Text>
          )}
        </TouchableOpacity>
      </View>

      {history.length > 0 && (
        <View style={styles.historyBox}>
          <View style={styles.historyHeader}>
            <Text style={styles.historyTitle}>📋 분석 히스토리</Text>
            <TouchableOpacity onPress={handleClearHistory}>
              <Text style={styles.clearBtn}>전체 삭제</Text>
            </TouchableOpacity>
          </View>
          {history.slice(0, 5).map((item, i) => (
            <TouchableOpacity
              key={i}
              style={styles.historyItem}
              onPress={() => setUrl(item.url)}
              activeOpacity={0.7}
            >
              <View style={styles.historyDot} />
              <View style={styles.historyContent}>
                <Text style={styles.historyUrl}>{shortenUrl(item.url)}</Text>
                <Text style={styles.historyDate}>{formatDate(item.date)}</Text>
              </View>
              <Text style={styles.historyArrow}>↩</Text>
            </TouchableOpacity>
          ))}
          {history.length > 5 && (
            <Text style={styles.moreText}>+ {history.length - 5}개 더 있음</Text>
          )}
        </View>
      )}

      <View style={styles.steps}>
        <Text style={styles.stepsTitle}>사용 방법</Text>
        <View style={styles.step}>
          <View style={styles.stepNum}><Text style={styles.stepNumText}>1</Text></View>
          <Text style={styles.stepText}>SNS나 유튜브에서 링크 복사</Text>
        </View>
        <View style={styles.step}>
          <View style={styles.stepNum}><Text style={styles.stepNumText}>2</Text></View>
          <Text style={styles.stepText}>위 입력창에 붙여넣기</Text>
        </View>
        <View style={styles.step}>
          <View style={styles.stepNum}><Text style={styles.stepNumText}>3</Text></View>
          <Text style={styles.stepText}>AI가 편향 분석 후 반대 영상 추천</Text>
        </View>
      </View>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#0a0a0f', padding: 24 },
  header: { alignItems: 'center', marginTop: 70, marginBottom: 36 },
  emoji: { fontSize: 52, marginBottom: 8 },
  title: { fontSize: 38, fontWeight: '800', color: '#ff3cac', letterSpacing: -1, marginBottom: 6 },
  tagline: { fontSize: 13, color: '#555', textAlign: 'center' },
  card: { backgroundColor: '#111118', borderRadius: 16, padding: 20, borderWidth: 0.5, borderColor: '#222', marginBottom: 20 },
  cardLabel: { fontSize: 12, color: '#666', marginBottom: 10, fontWeight: '600' },
  input: { backgroundColor: '#0a0a0f', borderRadius: 10, padding: 14, color: '#fff', fontSize: 14, borderWidth: 0.5, borderColor: '#333', marginBottom: 14 },
  btn: { backgroundColor: '#ff3cac', borderRadius: 12, padding: 16, alignItems: 'center' },
  btnDisabled: { backgroundColor: '#7a1d54' },
  btnInner: { flexDirection: 'row', alignItems: 'center' },
  btnText: { color: '#fff', fontWeight: '700', fontSize: 16 },
  historyBox: { backgroundColor: '#111118', borderRadius: 16, padding: 16, borderWidth: 0.5, borderColor: '#222', marginBottom: 20 },
  historyHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 12 },
  historyTitle: { fontSize: 13, fontWeight: '700', color: '#fff' },
  clearBtn: { fontSize: 11, color: '#ff3cac' },
  historyItem: { flexDirection: 'row', alignItems: 'center', paddingVertical: 10, borderBottomWidth: 0.5, borderBottomColor: '#1a1a2e' },
  historyDot: { width: 6, height: 6, borderRadius: 3, backgroundColor: '#ff3cac', marginRight: 10 },
  historyContent: { flex: 1 },
  historyUrl: { fontSize: 13, color: '#ccc', fontWeight: '600' },
  historyDate: { fontSize: 11, color: '#444', marginTop: 2 },
  historyArrow: { fontSize: 14, color: '#333' },
  moreText: { fontSize: 11, color: '#444', textAlign: 'center', marginTop: 8 },
  steps: { marginBottom: 40 },
  stepsTitle: { fontSize: 12, color: '#444', fontWeight: '600', marginBottom: 12 },
  step: { flexDirection: 'row', alignItems: 'center', marginBottom: 10 },
  stepNum: { width: 22, height: 22, borderRadius: 11, backgroundColor: 'rgba(255,60,172,0.15)', borderWidth: 0.5, borderColor: '#ff3cac', alignItems: 'center', justifyContent: 'center', marginRight: 12 },
  stepNumText: { fontSize: 11, color: '#ff3cac', fontWeight: '700' },
  stepText: { fontSize: 13, color: '#666' },
});