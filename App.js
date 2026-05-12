import { NavigationContainer } from '@react-navigation/native';
import { createBottomTabNavigator } from '@react-navigation/bottom-tabs';
import { Text, View, StyleSheet } from 'react-native';
import { useState, useEffect } from 'react';

import HomeScreen from './src/screens/HomeScreen';
import BiasMapScreen from './src/screens/BiasMapScreen';
import DestroyScreen from './src/screens/DestroyScreen';
import ReportScreen from './src/screens/ReportScreen';
import OnboardingScreen, { checkOnboarding } from './src/screens/OnboardingScreen';

const Tab = createBottomTabNavigator();

const COLORS = {
  background: '#f6f7fb',
  white: '#ffffff',
  primary: '#3182f6',
  pink: '#ff5c7a',
  text: '#111827',
  sub: '#9ca3af',
  border: '#e5e7eb',
};

export default function App() {
  const [onboardingDone, setOnboardingDone] = useState(null);

  useEffect(() => {
    checkOnboarding()
      .then(done => setOnboardingDone(done))
      .catch(() => setOnboardingDone(true));
  }, []);

  if (onboardingDone === null) {
    return (
      <View style={styles.loadingContainer}>
        <Text style={styles.loadingText}>로딩중...</Text>
      </View>
    );
  }

  if (!onboardingDone) {
    return (
      <OnboardingScreen
        onDone={() => setOnboardingDone(true)}
      />
    );
  }

  return (
    <NavigationContainer>
      <Tab.Navigator
        screenOptions={({ route }) => ({
          headerShown: false,

          tabBarShowLabel: true,

          tabBarHideOnKeyboard: true,

          tabBarActiveTintColor: COLORS.primary,
          tabBarInactiveTintColor: COLORS.sub,

          tabBarStyle: styles.tabBar,

          tabBarLabelStyle: styles.tabLabel,

          tabBarIcon: ({ focused }) => {
            const icons = {
              홈: '🏠',
              편향지도: '🗺️',
              파괴: '💥',
              리포트: '📊',
            };

            return (
              <View
                style={[
                  styles.iconWrapper,
                  focused && styles.iconWrapperActive,
                  route.name === '파괴' &&
                    focused &&
                    styles.destroyActive,
                ]}
              >
                <Text style={styles.iconText}>
                  {icons[route.name]}
                </Text>
              </View>
            );
          },
        })}
      >
        <Tab.Screen
          name="홈"
          component={HomeScreen}
        />

        <Tab.Screen
          name="편향지도"
          component={BiasMapScreen}
        />

        <Tab.Screen
          name="파괴"
          component={DestroyScreen}
        />

        <Tab.Screen
          name="리포트"
          component={ReportScreen}
        />
      </Tab.Navigator>
    </NavigationContainer>
  );
}

const styles = StyleSheet.create({
  loadingContainer: {
    flex: 1,
    backgroundColor: '#f6f7fb',
    justifyContent: 'center',
    alignItems: 'center',
  },

  loadingText: {
    fontSize: 16,
    fontWeight: '600',
    color: '#111827',
  },

  tabBar: {
    height: 72,

    backgroundColor: '#ffffff',

    borderTopWidth: 1,
    borderTopColor: '#e5e7eb',

    shadowColor: '#000',

    shadowOffset: {
      width: 0,
      height: -2,
    },

    shadowOpacity: 0.04,
    shadowRadius: 8,

    elevation: 8,

    paddingTop: 8,
    paddingBottom: 10,
  },

  tabLabel: {
    fontSize: 11,
    fontWeight: '700',
    marginBottom: 4,
  },

  iconWrapper: {
    width: 42,
    height: 42,

    borderRadius: 21,

    alignItems: 'center',
    justifyContent: 'center',
  },

  iconWrapperActive: {
    backgroundColor: 'rgba(49,130,246,0.12)',
  },

  destroyActive: {
    backgroundColor: 'rgba(255,92,122,0.14)',
  },

  iconText: {
    fontSize: 20,
  },
});