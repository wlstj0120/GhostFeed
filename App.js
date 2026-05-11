import { NavigationContainer } from '@react-navigation/native';
import { createBottomTabNavigator } from '@react-navigation/bottom-tabs';
import { Text } from 'react-native';
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

  if (onboardingDone === null) return null;

  if (!onboardingDone) {
    return <OnboardingScreen onDone={() => setOnboardingDone(true)} />;
  }

  return (
    <NavigationContainer>
      <Tab.Navigator
        screenOptions={({ route }) => ({
          tabBarIcon: ({ color }) => {
            const icons = {
              '홈': '🏠',
              '편향지도': '🗺️',
              '파괴': '💥',
              '리포트': '📊',
            };
            return <Text style={{ fontSize: 20 }}>{icons[route.name]}</Text>;
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