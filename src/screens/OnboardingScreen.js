import React, { useState } from 'react';
import {
  StyleSheet, Text, View, TouchableOpacity,
  StatusBar, Dimensions,
} from 'react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';

const { width } = Dimensions.get('window');
const ONBOARDING_KEY = 'onboarding_done';

const steps = [
  { emoji: '👻', title: 'Ghost Feed', desc: '알고리즘이 만든\n콘텐츠 편향을 분석하고\n새로운 시야를 열어보세요.', color: '#6C63FF', bg: '#EEF2FF' },
  { emoji: '🔍', title: 'AI 편향 분석', desc: 'YouTube · Reddit 콘텐츠를 분석해\n어떤 카테고리에 치우쳐 있는지\n한눈에 보여줘요.', color: '#00B4D8', bg: '#E8F9FD' },
  { emoji: '💥', title: '알고리즘 파괴', desc: '평소 보지 않던 콘텐츠를 추천해\n더 다양한 관점을 경험할 수 있어요.', color: '#FF5C7A', bg: '#FFF1F4' },
  { emoji: '📊', title: '나만의 리포트', desc: '편향 점수와 다양성 지수를 통해\n나의 콘텐츠 소비 패턴을\n시각적으로 확인하세요.', color: '#FFB84D', bg: '#FFF7E8' },
];

export default function OnboardingScreen({ onDone }) {
  const [step, setStep] = useState(0);
  const [neverShow, setNeverShow] = useState(false);
  const current = steps[step];
  const isLast = step === steps.length - 1;

  const handleNext = () => {
    if (!isLast) {
      setStep(step + 1);
    } else {
      handleFinish();
    }
  };

  const handleFinish = async () => {
    if (neverShow) {
      try {
        await AsyncStorage.setItem(ONBOARDING_KEY, 'true');
      } catch {
        try { localStorage.setItem(ONBOARDING_KEY, 'true'); } catch {}
      }
    }
    onDone();
  };

  return (
    <View style={styles.container}>
      <StatusBar barStyle="dark-content" backgroundColor="#f6f7fb" />

      <View style={styles.skipWrap}>
        <TouchableOpacity onPress={handleFinish}>
          <Text style={styles.skipText}>건너뛰기</Text>
        </TouchableOpacity>
      </View>

      <View style={styles.centerArea}>
        <View style={[styles.emojiCard, { backgroundColor: current.bg }]}>
          <Text style={styles.emoji}>{current.emoji}</Text>
        </View>
        <Text style={[styles.title, { color: current.color }]}>{current.title}</Text>
        <Text style={styles.desc}>{current.desc}</Text>
      </View>

      <View style={styles.bottomArea}>
        {/* 다시 보지 않기 체크박스 - 마지막 스텝에서만 표시 */}
        {isLast && (
          <TouchableOpacity
            style={styles.checkRow}
            onPress={() => setNeverShow(!neverShow)}
            activeOpacity={0.7}
          >
            <View style={[styles.checkbox, neverShow && { backgroundColor: current.color, borderColor: current.color }]}>
              {neverShow && <Text style={styles.checkmark}>✓</Text>}
            </View>
            <Text style={styles.checkLabel}>다시 보지 않기</Text>
          </TouchableOpacity>
        )}

        <View style={styles.dotRow}>
          {steps.map((_, index) => (
            <View key={index} style={[styles.dot, index === step && { width: 28, backgroundColor: current.color }]} />
          ))}
        </View>

        <TouchableOpacity
          style={[styles.nextButton, { backgroundColor: current.color }]}
          onPress={handleNext}
          activeOpacity={0.85}
        >
          <Text style={styles.nextButtonText}>
            {isLast ? 'Ghost Feed 시작하기' : '다음'}
          </Text>
        </TouchableOpacity>
      </View>
    </View>
  );
}

export const checkOnboarding = async () => {
  try {
    const val = await AsyncStorage.getItem('onboarding_done');
    return val === 'true';
  } catch {
    try {
      return localStorage.getItem('onboarding_done') === 'true';
    } catch {
      return false;
    }
  }
};

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#f6f7fb', paddingHorizontal: 24 },
  skipWrap: { alignItems: 'flex-end', marginTop: 64 },
  skipText: { fontSize: 14, color: '#9ca3af', fontWeight: '600' },
  centerArea: { flex: 1, justifyContent: 'center', alignItems: 'center' },
  emojiCard: { width: width * 0.52, height: width * 0.52, borderRadius: 36, alignItems: 'center', justifyContent: 'center', marginBottom: 42 },
  emoji: { fontSize: 92 },
  title: { fontSize: 34, fontWeight: '800', marginBottom: 20, textAlign: 'center', letterSpacing: -1 },
  desc: { fontSize: 17, lineHeight: 30, color: '#6b7280', textAlign: 'center', paddingHorizontal: 8, fontWeight: '500' },
  bottomArea: { paddingBottom: 52 },
  checkRow: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', marginBottom: 20 },
  checkbox: { width: 22, height: 22, borderRadius: 6, borderWidth: 2, borderColor: '#d1d5db', backgroundColor: '#fff', alignItems: 'center', justifyContent: 'center', marginRight: 8 },
  checkmark: { color: '#fff', fontSize: 13, fontWeight: '800' },
  checkLabel: { fontSize: 14, color: '#6b7280', fontWeight: '600' },
  dotRow: { flexDirection: 'row', justifyContent: 'center', alignItems: 'center', marginBottom: 28 },
  dot: { width: 10, height: 10, borderRadius: 99, backgroundColor: '#d1d5db', marginHorizontal: 5 },
  nextButton: { height: 60, borderRadius: 20, alignItems: 'center', justifyContent: 'center', shadowColor: '#000', shadowOffset: { width: 0, height: 8 }, shadowOpacity: 0.08, shadowRadius: 16, elevation: 6 },
  nextButtonText: { color: '#fff', fontSize: 17, fontWeight: '800' },
});
