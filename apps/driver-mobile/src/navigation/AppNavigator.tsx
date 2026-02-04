import React from 'react';
import {createStackNavigator} from '@react-navigation/stack';
import {createBottomTabNavigator} from '@react-navigation/bottom-tabs';
import Icon from 'react-native-vector-icons/MaterialIcons';

import LoginScreen from '@/screens/auth/LoginScreen';
import RouteScreen from '@/screens/route/RouteScreen';
import DeliveryScreen from '@/screens/delivery/DeliveryScreen';
import ProfileScreen from '@/screens/profile/ProfileScreen';
import ParcelDetailsScreen from '@/screens/delivery/ParcelDetailsScreen';
import NavigationScreen from '@/screens/route/NavigationScreen';

import {useAppSelector} from '@/store/hooks';
import {RootStackParamList, TabParamList} from '@/types/navigation';

const Stack = createStackNavigator<RootStackParamList>();
const Tab = createBottomTabNavigator<TabParamList>();

const TabNavigator: React.FC = () => {
  return (
    <Tab.Navigator
      screenOptions={({route}) => ({
        tabBarIcon: ({focused, color, size}) => {
          let iconName: string;

          switch (route.name) {
            case 'Route':
              iconName = 'route';
              break;
            case 'Deliveries':
              iconName = 'local-shipping';
              break;
            case 'Profile':
              iconName = 'person';
              break;
            default:
              iconName = 'help';
          }

          return <Icon name={iconName} size={size} color={color} />;
        },
        tabBarActiveTintColor: '#2196F3',
        tabBarInactiveTintColor: 'gray',
        headerShown: false,
      })}>
      <Tab.Screen 
        name="Route" 
        component={RouteScreen}
        options={{title: 'My Route'}}
      />
      <Tab.Screen 
        name="Deliveries" 
        component={DeliveryScreen}
        options={{title: 'Deliveries'}}
      />
      <Tab.Screen 
        name="Profile" 
        component={ProfileScreen}
        options={{title: 'Profile'}}
      />
    </Tab.Navigator>
  );
};

const AppNavigator: React.FC = () => {
  const isAuthenticated = useAppSelector(state => state.auth.isAuthenticated);

  return (
    <Stack.Navigator screenOptions={{headerShown: false}}>
      {!isAuthenticated ? (
        <Stack.Screen name="Login" component={LoginScreen} />
      ) : (
        <>
          <Stack.Screen name="Main" component={TabNavigator} />
          <Stack.Screen 
            name="ParcelDetails" 
            component={ParcelDetailsScreen}
            options={{
              headerShown: true,
              title: 'Parcel Details',
            }}
          />
          <Stack.Screen 
            name="Navigation" 
            component={NavigationScreen}
            options={{
              headerShown: true,
              title: 'Navigation',
            }}
          />
        </>
      )}
    </Stack.Navigator>
  );
};

export default AppNavigator;