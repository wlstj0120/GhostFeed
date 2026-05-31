import { NavigationContainer } from '@react-navigation/native';
import { createBottomTabNavigator } from '@react-navigation/bottom-tabs';
import { Text, View, StyleSheet } from 'react-native';
import { useState, useEffect, useRef } from 'react';
import { ShareIntentProvider, useShareIntent } from 'expo-share-intent';
import { SafeAreaProvider, useSafeAreaInsets } from 'react-native-safe-area-context';

import HomeScreen from './src/screens/HomeScreen';
import BiasMapScreen from './src/screens/BiasMapScreen';
import DestroyScreen from './src/screens/DestroyScreen';
import ReportScreen from './src/screens/ReportScreen';
import OnboardingScreen, { checkOnboarding } from './src/screens/OnboardingScreen';

const Tab = createBottomTabNavigator();

const COLORS = {
  background: '#f6f7fb', white: '#ffffff', primary: '#3182f6',
  pink: '#ff5c7a', text: '#111827', sub: '#9ca3af', border: '#e5e7eb',
};

function MainApp() {
  const [onboardingDone, setOnboardingDone] = useState(null);
  const [sharedUrl, setSharedUrl] = useState(null);
  const navigationRef = useRef(null);
  const insets = useSafeAreaInsets();

  // ✅ expo-share-intent 훅
  const { hasShareIntent, shareIntent, resetShareIntent, error } = useShareIntent();

  useEffect(() => {
    checkOnboarding()
      .then(done => setOnboardingDone(done))
      .catch(() => setOnboardingDone(true));
  }, []);

  // ✅ 공유 인텐트 처리
  useEffect(() => {
    if (!hasShareIntent || !shareIntent) return;

    console.log('shareIntent 수신:', shareIntent);

    let url = null;

    // 텍스트로 공유된 경우 (유튜브/레딧 공유하기)
    if (shareIntent.text) {
      const youtubeMatch = shareIntent.text.match(/(https?:\/\/(www\.)?(youtube\.com|youtu\.be)[^\s]+)/);
      const redditMatch = shareIntent.text.match(/(https?:\/\/(www\.|old\.)?reddit\.com[^\s]+)/);

      if (youtubeMatch) url = youtubeMatch[1];
      else if (redditMatch) url = redditMatch[1];
      else if (shareIntent.text.startsWith('http')) url = shareIntent.text.trim();
    }

    // webUrl로 공유된 경우
    if (!url && shareIntent.webUrl) {
      url = shareIntent.webUrl;
    }

    if (url) {
      console.log('공유 URL 감지:', url);
      setSharedUrl(url);
      // 홈 탭으로 이동
      setTimeout(() => {
        if (navigationRef.current) {
          navigationRef.current.navigate('홈');
        }
      }, 300);
    }

    resetShareIntent();
  }, [hasShareIntent, shareIntent]);

  if (onboardingDone === null) {
    return (
      <View style={styles.loadingContainer}>
        <Text style={styles.loadingText}>로딩중...</Text>
      </View>
    );
  }

  if (!onboardingDone) {
    return <OnboardingScreen onDone={() => setOnboardingDone(true)} />;
  }

  return (
    <NavigationContainer ref={navigationRef}>
      <Tab.Navigator
        screenOptions={({ route }) => ({
          headerShown: false,
          tabBarShowLabel: true,
          tabBarHideOnKeyboard: true,
          tabBarActiveTintColor: COLORS.primary,
          tabBarInactiveTintColor: COLORS.sub,
          tabBarStyle: {
            ...styles.tabBar,
            height: 60 + insets.bottom,
            paddingBottom: insets.bottom + 4,
          },
          tabBarLabelStyle: styles.tabLabel,
          tabBarIcon: ({ focused }) => {
            const icons = { '홈': '🏠', '편향지도': '🗺️', '파괴': '💥', '리포트': '📊' };
            return (
              <View style={[
                styles.iconWrapper,
                focused && styles.iconWrapperActive,
                route.name === '파괴' && focused && styles.destroyActive,
              ]}>
                <Text style={styles.iconText}>{icons[route.name]}</Text>
              </View>
            );
          },
        })}
      >
        <Tab.Screen name="홈">
          {(props) => (
            <HomeScreen
              {...props}
              sharedUrl={sharedUrl}
              onSharedUrlUsed={() => setSharedUrl(null)}
            />
          )}
        </Tab.Screen>
        <Tab.Screen name="편향지도" component={BiasMapScreen} />
        <Tab.Screen name="파괴" component={DestroyScreen} />
        <Tab.Screen name="리포트" component={ReportScreen} />
      </Tab.Navigator>
    </NavigationContainer>
  );
}

export default function App() {
  return (
    <SafeAreaProvider>
      <ShareIntentProvider>
        <MainApp />
      </ShareIntentProvider>
    </SafeAreaProvider>
  );
}

const styles = StyleSheet.create({
  loadingContainer: { flex: 1, backgroundColor: '#f6f7fb', justifyContent: 'center', alignItems: 'center' },
  loadingText: { fontSize: 16, fontWeight: '600', color: '#111827' },
  tabBar: {
    backgroundColor: '#ffffff', borderTopWidth: 1, borderTopColor: '#e5e7eb',
    shadowColor: '#000', shadowOffset: { width: 0, height: -2 }, shadowOpacity: 0.04,
    shadowRadius: 8, elevation: 8, paddingTop: 8,
  },
  tabLabel: { fontSize: 11, fontWeight: '700', marginBottom: 4 },
  iconWrapper: { width: 42, height: 42, borderRadius: 21, alignItems: 'center', justifyContent: 'center' },
  iconWrapperActive: { backgroundColor: 'rgba(49,130,246,0.12)' },
  destroyActive: { backgroundColor: 'rgba(255,92,122,0.14)' },
  iconText: { fontSize: 20 },
});
