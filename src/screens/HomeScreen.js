import {
  StyleSheet,
  Text,
  View,
  TextInput,
  TouchableOpacity,
  Alert,
  ActivityIndicator,
  ScrollView,
  StatusBar,
} from 'react-native';

import { useState, useEffect, useCallback } from 'react';
import { useFocusEffect } from '@react-navigation/native';
import {
  analyzePost,
  loadHistory,
  clearHistory,
  selectCategories,
} from '../api/ghostApi';

const CATEGORIES = [
  { id: '게임·엔터', label: '🎮 게임·엔터', color: '#ff5f95' },
  { id: '과학·기술', label: '🔬 과학·기술', color: '#7b61ff' },
  { id: '문화·예술', label: '🎨 문화·예술', color: '#ffb84d' },
  { id: '음식·여행', label: '🍜 음식·여행', color: '#00c896' },
  { id: '건강·라이프', label: '💪 건강·라이프', color: '#3b82f6' },
  { id: '정치·사회', label: '📰 정치·사회', color: '#ff7a59' },
  { id: '경제·경영', label: '💼 경제·경영', color: '#22c55e' },
];

export default function HomeScreen({ navigation }) {
  const [url, setUrl] = useState('');
  const [loading, setLoading] = useState(false);
  const [history, setHistory] = useState([]);
  const [selectedCats, setSelectedCats] = useState([]);
  const [catLoading, setCatLoading] = useState(false);
  const [mode, setMode] = useState('url');

  useFocusEffect(
    useCallback(() => {
      loadHistory().then(setHistory);
    }, [])
  );

  const handleAnalyze = async () => {
    if (!url.trim()) {
      Alert.alert('알림', 'URL을 입력해주세요');
      return;
    }

    setLoading(true);

    try {
      await analyzePost(url);
      loadHistory().then(setHistory);
      navigation.navigate('파괴', { refresh: Date.now() });
    } catch (e) {
      Alert.alert('오류', '서버 연결 실패');
    } finally {
      setLoading(false);
    }
  };

  const toggleCategory = (catId) => {
    setSelectedCats((prev) =>
      prev.includes(catId)
        ? prev.filter((c) => c !== catId)
        : [...prev, catId]
    );
  };

  const handleCategoryAnalyze = async () => {
    if (selectedCats.length === 0) {
      Alert.alert('알림', '카테고리를 선택해주세요');
      return;
    }

    setCatLoading(true);

    try {
      await selectCategories(selectedCats);
      navigation.navigate('파괴', { refresh: Date.now() });
    } catch (e) {
      Alert.alert('오류', '서버 연결 실패');
    } finally {
      setCatLoading(false);
    }
  };

  const handleClearHistory = () => {
    setHistory([]);
    clearHistory();
  };

  const formatDate = (iso) => {
    const d = new Date(iso);

    return `${d.getMonth() + 1}/${d.getDate()} ${d.getHours()}:${String(
      d.getMinutes()
    ).padStart(2, '0')}`;
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
    <View style={styles.wrapper}>
      <StatusBar barStyle="dark-content" backgroundColor="#f6f8fb" />

      <ScrollView
        style={styles.container}
        showsVerticalScrollIndicator={false}
      >
        <View style={styles.header}>
          <View style={styles.logoCircle}>
            <Text style={styles.logoEmoji}>👻</Text>
          </View>

          <Text style={styles.title}>Ghost Feed</Text>

          <Text style={styles.subtitle}>
            알고리즘 편향을 분석하고{'\n'}
            새로운 콘텐츠를 발견해보세요
          </Text>
        </View>

        <View style={styles.modeBox}>
          <TouchableOpacity
            style={[
              styles.modeButton,
              mode === 'url' && styles.modeButtonActive,
            ]}
            onPress={() => setMode('url')}
          >
            <Text
              style={[
                styles.modeButtonText,
                mode === 'url' && styles.modeButtonTextActive,
              ]}
            >
              URL 분석
            </Text>
          </TouchableOpacity>

          <TouchableOpacity
            style={[
              styles.modeButton,
              mode === 'category' && styles.modeButtonActive,
            ]}
            onPress={() => setMode('category')}
          >
            <Text
              style={[
                styles.modeButtonText,
                mode === 'category' && styles.modeButtonTextActive,
              ]}
            >
              카테고리 선택
            </Text>
          </TouchableOpacity>
        </View>

        {mode === 'url' && (
          <View style={styles.card}>
            <Text style={styles.cardTitle}>콘텐츠 URL 분석</Text>

            <TextInput
              style={styles.input}
              placeholder="유튜브 또는 콘텐츠 URL 입력"
              placeholderTextColor="#9ca3af"
              value={url}
              onChangeText={setUrl}
              autoCapitalize="none"
            />

            <TouchableOpacity
              style={[styles.mainButton, loading && styles.disabledButton]}
              onPress={handleAnalyze}
              disabled={loading}
            >
              {loading ? (
                <ActivityIndicator color="#fff" />
              ) : (
                <Text style={styles.mainButtonText}>
                  분석 시작하기
                </Text>
              )}
            </TouchableOpacity>
          </View>
        )}

        {mode === 'category' && (
          <View style={styles.card}>
            <Text style={styles.cardTitle}>
              자주 보는 콘텐츠 선택
            </Text>

            <View style={styles.categoryWrap}>
              {CATEGORIES.map((cat) => {
                const selected = selectedCats.includes(cat.id);

                return (
                  <TouchableOpacity
                    key={cat.id}
                    style={[
                      styles.categoryButton,
                      selected && {
                        backgroundColor: cat.color,
                        borderColor: cat.color,
                      },
                    ]}
                    onPress={() => toggleCategory(cat.id)}
                  >
                    <Text
                      style={[
                        styles.categoryText,
                        selected && { color: '#fff' },
                      ]}
                    >
                      {cat.label}
                    </Text>
                  </TouchableOpacity>
                );
              })}
            </View>

            <TouchableOpacity
              style={[
                styles.mainButton,
                (catLoading || selectedCats.length === 0) &&
                  styles.disabledButton,
              ]}
              onPress={handleCategoryAnalyze}
              disabled={catLoading || selectedCats.length === 0}
            >
              {catLoading ? (
                <ActivityIndicator color="#fff" />
              ) : (
                <Text style={styles.mainButtonText}>
                  추천 콘텐츠 받기
                </Text>
              )}
            </TouchableOpacity>
          </View>
        )}

        {history.length > 0 && mode === 'url' && (
          <View style={styles.historyCard}>
            <View style={styles.historyHeader}>
              <Text style={styles.historyTitle}>최근 분석 기록</Text>

              <TouchableOpacity onPress={handleClearHistory}>
                <Text style={styles.deleteText}>전체 삭제</Text>
              </TouchableOpacity>
            </View>

            {history.slice(0, 5).map((item, i) => (
              <TouchableOpacity
                key={i}
                style={styles.historyItem}
                onPress={() => setUrl(item.url)}
              >
                <View style={styles.historyDot} />

                <View style={{ flex: 1 }}>
                  <Text style={styles.historyUrl}>
                    {shortenUrl(item.url)}
                  </Text>

                  <Text style={styles.historyDate}>
                    {formatDate(item.date)}
                  </Text>
                </View>
              </TouchableOpacity>
            ))}
          </View>
        )}

        <View style={styles.infoBox}>
          <Text style={styles.infoTitle}>Ghost Feed 사용 방법</Text>

          <View style={styles.infoRow}>
            <Text style={styles.infoEmoji}>1️⃣</Text>
            <Text style={styles.infoText}>
              URL 또는 관심 카테고리를 입력
            </Text>
          </View>

          <View style={styles.infoRow}>
            <Text style={styles.infoEmoji}>2️⃣</Text>
            <Text style={styles.infoText}>
              AI가 알고리즘 편향 분석
            </Text>
          </View>

          <View style={styles.infoRow}>
            <Text style={styles.infoEmoji}>3️⃣</Text>
            <Text style={styles.infoText}>
              새로운 콘텐츠 추천 제공
            </Text>
          </View>
        </View>

        <View style={{ height: 40 }} />
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  wrapper: {
    flex: 1,
    backgroundColor: '#f6f8fb',
  },

  container: {
    flex: 1,
    paddingHorizontal: 20,
  },

  header: {
    alignItems: 'center',
    marginTop: 70,
    marginBottom: 30,
  },

  logoCircle: {
    width: 90,
    height: 90,
    borderRadius: 45,
    backgroundColor: '#ffffff',
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 16,
    shadowColor: '#000',
    shadowOpacity: 0.08,
    shadowRadius: 12,
    elevation: 4,
  },

  logoEmoji: {
    fontSize: 42,
  },

  title: {
    fontSize: 34,
    fontWeight: '800',
    color: '#111827',
    marginBottom: 10,
  },

  subtitle: {
    fontSize: 15,
    color: '#6b7280',
    textAlign: 'center',
    lineHeight: 24,
  },

  modeBox: {
    flexDirection: 'row',
    backgroundColor: '#e5e7eb',
    borderRadius: 14,
    padding: 4,
    marginBottom: 20,
  },

  modeButton: {
    flex: 1,
    paddingVertical: 14,
    borderRadius: 10,
    alignItems: 'center',
  },

  modeButtonActive: {
    backgroundColor: '#ffffff',
  },

  modeButtonText: {
    fontSize: 14,
    fontWeight: '700',
    color: '#6b7280',
  },

  modeButtonTextActive: {
    color: '#111827',
  },

  card: {
    backgroundColor: '#ffffff',
    borderRadius: 22,
    padding: 20,
    marginBottom: 20,
    shadowColor: '#000',
    shadowOpacity: 0.05,
    shadowRadius: 10,
    elevation: 3,
  },

  cardTitle: {
    fontSize: 18,
    fontWeight: '700',
    color: '#111827',
    marginBottom: 16,
  },

  input: {
    backgroundColor: '#f3f4f6',
    borderRadius: 14,
    padding: 16,
    fontSize: 15,
    color: '#111827',
    marginBottom: 16,
  },

  mainButton: {
    backgroundColor: '#3182f6',
    borderRadius: 16,
    paddingVertical: 16,
    alignItems: 'center',
  },

  disabledButton: {
    opacity: 0.5,
  },

  mainButtonText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: '700',
  },

  categoryWrap: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 10,
    marginBottom: 16,
  },

  categoryButton: {
    backgroundColor: '#f3f4f6',
    borderRadius: 20,
    paddingHorizontal: 14,
    paddingVertical: 10,
    borderWidth: 1,
    borderColor: '#e5e7eb',
  },

  categoryText: {
    fontSize: 13,
    color: '#374151',
    fontWeight: '600',
  },

  historyCard: {
    backgroundColor: '#ffffff',
    borderRadius: 22,
    padding: 20,
    marginBottom: 20,
    shadowColor: '#000',
    shadowOpacity: 0.05,
    shadowRadius: 10,
    elevation: 3,
  },

  historyHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: 14,
  },

  historyTitle: {
    fontSize: 17,
    fontWeight: '700',
    color: '#111827',
  },

  deleteText: {
    fontSize: 13,
    color: '#ef4444',
    fontWeight: '600',
  },

  historyItem: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 12,
    borderBottomWidth: 1,
    borderBottomColor: '#f3f4f6',
  },

  historyDot: {
    width: 10,
    height: 10,
    borderRadius: 5,
    backgroundColor: '#3182f6',
    marginRight: 12,
  },

  historyUrl: {
    fontSize: 14,
    fontWeight: '600',
    color: '#111827',
  },

  historyDate: {
    fontSize: 12,
    color: '#9ca3af',
    marginTop: 3,
  },

  infoBox: {
    backgroundColor: '#ffffff',
    borderRadius: 22,
    padding: 20,
    shadowColor: '#000',
    shadowOpacity: 0.05,
    shadowRadius: 10,
    elevation: 3,
  },

  infoTitle: {
    fontSize: 18,
    fontWeight: '700',
    color: '#111827',
    marginBottom: 16,
  },

  infoRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 14,
  },

  infoEmoji: {
    fontSize: 18,
    marginRight: 12,
  },

  infoText: {
    fontSize: 14,
    color: '#4b5563',
  },
});