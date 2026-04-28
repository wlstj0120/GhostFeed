import { NavigationContainer } from '@react-navigation/native';
import { createBottomTabNavigator } from '@react-navigation/bottom-tabs';
import { Ionicons } from '@expo/vector-icons';
import { useState, useEffect } from 'react';

import HomeScreen from './src/screens/HomeScreen';
import BiasMapScreen from './src/screens/BiasMapScreen';
import DestroyScreen from './src/screens/DestroyScreen';
import ReportScreen from './src/screens/ReportScreen';
import OnboardingScreen, { checkOnboarding } from './src/screens/OnboardingScreen';

const Tab = createBottomTabNavigator();

export default function App() {
  const [onboardingDone, setOnboardingDone] = useState(null);

  useEffect(() => {
    checkOnboarding().then(done => setOnboardingDone(done));
  }, []);

  if (onboardingDone === null) return null; // 로딩 중

  if (!onboardingDone) {
    return <OnboardingScreen onDone={() => setOnboardingDone(true)} />;
  }

  return (
    <NavigationContainer>
      <Tab.Navigator
        screenOptions={({ route }) => ({
          tabBarIcon: ({ color, size }) => {
            const icons = {
              '홈': 'home',
              '편향지도': 'map',
              '파괴': 'nuclear',
              '리포트': 'bar-chart',
            };
            return <Ionicons name={icons[route.name]} size={size} color={color} />;
          },
          tabBarActiveTintColor: '#ff3cac',
          tabBarInactiveTintColor: '#555',
          tabBarStyle: { backgroundColor: '#111118', borderTopColor: '#222' },
          headerShown: false,
        })}
      >
        <Tab.Screen name="홈" component={HomeScreen} />
        <Tab.Screen name="편향지도" component={BiasMapScreen} />
        <Tab.Screen name="파괴" component={DestroyScreen} />
        <Tab.Screen name="리포트" component={ReportScreen} />
      </Tab.Navigator>
    </NavigationContainer>
  );
}