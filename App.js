import { NavigationContainer } from '@react-navigation/native';
import { createBottomTabNavigator } from '@react-navigation/bottom-tabs';
import { Ionicons } from '@expo/vector-icons';

import HomeScreen from './src/screens/HomeScreen';
import BiasMapScreen from './src/screens/BiasMapScreen';
import DestroyScreen from './src/screens/DestroyScreen';
import ReportScreen from './src/screens/ReportScreen';

const Tab = createBottomTabNavigator();

export default function App() {
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