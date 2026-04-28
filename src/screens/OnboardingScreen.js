import { StyleSheet, Text, View, TouchableOpacity, ScrollView } from 'react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';

const ONBOARDING_KEY = 'onboarding_done';

const steps = [
  {
    emoji: '👻',
    title: 'Ghost Feed란?',
    desc: '당신이 모르는 사이 유튜브·SNS 알고리즘이 당신을 특정 콘텐츠에 가두고 있어요. Ghost Feed는 그 편향을 파악하고 파괴해요.',
    color: '#ff3cac',
  },
  {
    emoji: '🔍',
    title: '어떻게 작동하나요?',
    desc: 'AI가 당신이 본 영상의 제목·설명·태그를 분석해서 어떤 카테고리에 편향되어 있는지 파악해요.',
    color: '#7b5ea7',
  },
  {
    emoji: '💥',
    title: '알고리즘 파괴',
    desc: '편향된 카테고리의 반대 방향 영상을 추천해드려요. 평소엔 절대 안 봤을 콘텐츠를 만나보세요!',
    color: '#00f5c8',
  },
  {
    emoji: '📊',
    title: '편향 리포트',
    desc: '내 알고리즘 편향 점수와 카테고리별 분포를 시각화해서 보여줘요. 다양성 지수를 높여보세요!',
    color: '#ffb347',
  },
];

export default function OnboardingScreen({ onDone }) {
  const [step, setStep] = React.useState(0);

  const handleNext = async () => {
    if (step < steps.length - 1) {
      setStep(step + 1);
    } else {
      try {
        await AsyncStorage.setItem(ONBOARDING_KEY, 'true');
      } catch {
        try { localStorage.setItem(ONBOARDING_KEY, 'true'); } catch {}
      }
      onDone();
    }
  };

  const current = steps[step];

  return (
    <View style={styles.container}>
      <View style={styles.skipRow}>
        <TouchableOpacity onPress={handleNext}>
          <Text style={styles.skip}>건너뛰기</Text>
        </TouchableOpacity>
      </View>

      <View style={styles.content}>
        <Text style={styles.emoji}>{current.emoji}</Text>
        <Text style={[styles.title, { color: current.color }]}>{current.title}</Text>
        <Text style={styles.desc}>{current.desc}</Text>
      </View>

      {/* 진행 점 */}
      <View style={styles.dots}>
        {steps.map((_, i) => (
          <View
            key={i}
            style={[styles.dot, i === step && { backgroundColor: current.color, width: 20 }]}
          />
        ))}
      </View>

      <TouchableOpacity
        style={[styles.btn, { backgroundColor: current.color }]}
        onPress={handleNext}
        activeOpacity={0.8}
      >
        <Text style={styles.btnText}>
          {step < steps.length - 1 ? '다음 →' : '시작하기 🚀'}
        </Text>
      </TouchableOpacity>
    </View>
  );
}

import React from 'react';

export const checkOnboarding = async () => {
  try {
    const done = await AsyncStorage.getItem(ONBOARDING_KEY);
    return done === 'true';
  } catch {
    try {
      return localStorage.getItem(ONBOARDING_KEY) === 'true';
    } catch {
      return false;
    }
  }
};

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#0a0a0f', padding: 24, justifyContent: 'space-between' },
  skipRow: { alignItems: 'flex-end', marginTop: 60 },
  skip: { fontSize: 13, color: '#444' },
  content: { flex: 1, alignItems: 'center', justifyContent: 'center', paddingHorizontal: 20 },
  emoji: { fontSize: 80, marginBottom: 32 },
  title: { fontSize: 28, fontWeight: '800', marginBottom: 20, textAlign: 'center' },
  desc: { fontSize: 16, color: '#888', lineHeight: 26, textAlign: 'center' },
  dots: { flexDirection: 'row', justifyContent: 'center', alignItems: 'center', gap: 8, marginBottom: 24 },
  dot: { width: 8, height: 8, borderRadius: 4, backgroundColor: '#333', transition: 'all 0.3s' },
  btn: { borderRadius: 14, padding: 18, alignItems: 'center', marginBottom: 40 },
  btnText: { color: '#fff', fontWeight: '800', fontSize: 17 },
});