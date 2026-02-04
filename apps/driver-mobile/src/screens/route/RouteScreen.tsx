import React, {useEffect, useState} from 'react';
import {
  View,
  StyleSheet,
  ScrollView,
  RefreshControl,
  Alert,
  Linking,
} from 'react-native';
import {
  Text,
  Card,
  Title,
  Button,
  List,
  Chip,
  FAB,
  ActivityIndicator,
} from 'react-native-paper';
import MapView, {Marker, Polyline, PROVIDER_GOOGLE} from 'react-native-maps';
import Icon from 'react-native-vector-icons/MaterialIcons';
import {useNavigation} from '@react-navigation/native';

import {useAppSelector, useAppDispatch} from '@/store/hooks';
import {RouteService} from '@/services/RouteService';
import {completeRoutePoint} from '@/store/slices/routeSlice';

const RouteScreen: React.FC = () => {
  const navigation = useNavigation();
  const dispatch = useAppDispatch();
  const [refreshing, setRefreshing] = useState(false);
  const [routeService] = useState(() => RouteService.getInstance());

  const {
    optimizedRoute,
    currentLocation,
    routeDistance,
    routeDuration,
    loading,
    error,
  } = useAppSelector(state => state.route);

  const {currentLocation: userLocation} = useAppSelector(state => state.location);

  useEffect(() => {
    loadRoute();
  }, []);

  const loadRoute = async () => {
    try {
      await routeService.fetchCurrentRoute();
    } catch (error) {
      console.error('Error loading route:', error);
    }
  };

  const handleRefresh = async () => {
    setRefreshing(true);
    await loadRoute();
    setRefreshing(false);
  };

  const handleNavigateToPoint = async (point: any) => {
    try {
      // Calculate ETA first
      const eta = await routeService.calculateETA(point.location);
      
      Alert.alert(
        'Navigate to Destination',
        `${point.address}\n\nEstimated time: ${eta ? Math.round(eta.duration / 60) : '?'} minutes`,
        [
          {text: 'Cancel', style: 'cancel'},
          {
            text: 'Google Maps',
            onPress: () => openInGoogleMaps(point.location, point.address),
          },
          {
            text: 'In-App Navigation',
            onPress: () => navigation.navigate('Navigation', {
              destination: {
                latitude: point.location.latitude,
                longitude: point.location.longitude,
                address: point.address,
              },
            }),
          },
        ]
      );
    } catch (error) {
      console.error('Error navigating to point:', error);
      Alert.alert('Error', 'Failed to calculate navigation route');
    }
  };

  const openInGoogleMaps = (location: {latitude: number; longitude: number}, address: string) => {
    const url = `https://www.google.com/maps/dir/?api=1&destination=${location.latitude},${location.longitude}`;
    Linking.openURL(url).catch(err => {
      console.error('Error opening Google Maps:', err);
      Alert.alert('Error', 'Could not open Google Maps');
    });
  };

  const handleCompletePoint = (pointId: string) => {
    Alert.alert(
      'Complete Stop',
      'Mark this stop as completed?',
      [
        {text: 'Cancel', style: 'cancel'},
        {
          text: 'Complete',
          onPress: () => {
            dispatch(completeRoutePoint(pointId));
            // Re-optimize route after completion
            routeService.optimizeCurrentRoute();
          },
        },
      ]
    );
  };

  const getPointIcon = (type: 'pickup' | 'delivery', completed: boolean) => {
    if (completed) return 'check-circle';
    return type === 'pickup' ? 'arrow-upward' : 'arrow-downward';
  };

  const getPointColor = (type: 'pickup' | 'delivery', completed: boolean) => {
    if (completed) return '#4CAF50';
    return type === 'pickup' ? '#2196F3' : '#FF9800';
  };

  const formatDuration = (seconds: number) => {
    const hours = Math.floor(seconds / 3600);
    const minutes = Math.floor((seconds % 3600) / 60);
    
    if (hours > 0) {
      return `${hours}h ${minutes}m`;
    }
    return `${minutes}m`;
  };

  const formatDistance = (meters: number) => {
    if (meters >= 1000) {
      return `${(meters / 1000).toFixed(1)} km`;
    }
    return `${meters} m`;
  };

  const pendingPoints = optimizedRoute.filter(point => !point.completed);
  const completedPoints = optimizedRoute.filter(point => point.completed);

  return (
    <View style={styles.container}>
      {/* Route Summary Card */}
      <Card style={styles.summaryCard}>
        <Card.Content>
          <View style={styles.summaryRow}>
            <View style={styles.summaryItem}>
              <Text style={styles.summaryLabel}>Stops Remaining</Text>
              <Text style={styles.summaryValue}>{pendingPoints.length}</Text>
            </View>
            <View style={styles.summaryItem}>
              <Text style={styles.summaryLabel}>Distance</Text>
              <Text style={styles.summaryValue}>
                {routeDistance > 0 ? formatDistance(routeDistance) : '--'}
              </Text>
            </View>
            <View style={styles.summaryItem}>
              <Text style={styles.summaryLabel}>ETA</Text>
              <Text style={styles.summaryValue}>
                {routeDuration > 0 ? formatDuration(routeDuration) : '--'}
              </Text>
            </View>
          </View>
        </Card.Content>
      </Card>

      {/* Map View */}
      {userLocation && (
        <Card style={styles.mapCard}>
          <MapView
            provider={PROVIDER_GOOGLE}
            style={styles.map}
            initialRegion={{
              latitude: userLocation.latitude,
              longitude: userLocation.longitude,
              latitudeDelta: 0.01,
              longitudeDelta: 0.01,
            }}
            showsUserLocation={true}
            showsMyLocationButton={true}
          >
            {/* Current location marker */}
            <Marker
              coordinate={userLocation}
              title="Your Location"
              pinColor="blue"
            />
            
            {/* Route point markers */}
            {optimizedRoute.map((point, index) => (
              <Marker
                key={point.id}
                coordinate={point.location}
                title={`${point.type === 'pickup' ? 'Pickup' : 'Delivery'} - ${point.address}`}
                description={`Sequence: ${point.sequence}`}
                pinColor={point.completed ? 'green' : (point.type === 'pickup' ? 'blue' : 'orange')}
              />
            ))}
          </MapView>
        </Card>
      )}

      {/* Route Points List */}
      <ScrollView
        style={styles.routeList}
        refreshControl={
          <RefreshControl refreshing={refreshing} onRefresh={handleRefresh} />
        }
      >
        {loading && (
          <View style={styles.loadingContainer}>
            <ActivityIndicator size="large" />
            <Text style={styles.loadingText}>Loading route...</Text>
          </View>
        )}

        {error && (
          <Card style={styles.errorCard}>
            <Card.Content>
              <Text style={styles.errorText}>{error}</Text>
            </Card.Content>
          </Card>
        )}

        {/* Pending Stops */}
        {pendingPoints.length > 0 && (
          <Card style={styles.sectionCard}>
            <Card.Content>
              <Title>Upcoming Stops</Title>
              {pendingPoints.map((point, index) => (
                <List.Item
                  key={point.id}
                  title={point.address}
                  description={`${point.type === 'pickup' ? 'Pickup' : 'Delivery'} • ETA: ${point.estimatedTime}`}
                  left={() => (
                    <View style={styles.sequenceContainer}>
                      <Text style={styles.sequenceNumber}>{index + 1}</Text>
                      <Icon
                        name={getPointIcon(point.type, point.completed)}
                        size={24}
                        color={getPointColor(point.type, point.completed)}
                      />
                    </View>
                  )}
                  right={() => (
                    <View style={styles.actionButtons}>
                      <Button
                        mode="outlined"
                        compact
                        onPress={() => handleNavigateToPoint(point)}
                        style={styles.actionButton}
                      >
                        Navigate
                      </Button>
                      <Button
                        mode="contained"
                        compact
                        onPress={() => handleCompletePoint(point.id)}
                        style={styles.actionButton}
                      >
                        Complete
                      </Button>
                    </View>
                  )}
                  style={styles.routeItem}
                />
              ))}
            </Card.Content>
          </Card>
        )}

        {/* Completed Stops */}
        {completedPoints.length > 0 && (
          <Card style={styles.sectionCard}>
            <Card.Content>
              <Title>Completed Stops</Title>
              {completedPoints.map((point) => (
                <List.Item
                  key={point.id}
                  title={point.address}
                  description={`${point.type === 'pickup' ? 'Pickup' : 'Delivery'} • Completed`}
                  left={() => (
                    <Icon
                      name={getPointIcon(point.type, point.completed)}
                      size={24}
                      color={getPointColor(point.type, point.completed)}
                    />
                  )}
                  right={() => (
                    <Chip mode="outlined" textStyle={styles.completedChip}>
                      ✓ Done
                    </Chip>
                  )}
                  style={[styles.routeItem, styles.completedItem]}
                />
              ))}
            </Card.Content>
          </Card>
        )}

        {optimizedRoute.length === 0 && !loading && (
          <Card style={styles.emptyCard}>
            <Card.Content>
              <View style={styles.emptyContainer}>
                <Icon name="route" size={48} color="#BDBDBD" />
                <Text style={styles.emptyText}>No route assigned</Text>
                <Text style={styles.emptySubtext}>
                  You will receive notifications when parcels are assigned to your route
                </Text>
              </View>
            </Card.Content>
          </Card>
        )}
      </ScrollView>

      {/* Optimize Route FAB */}
      {pendingPoints.length > 1 && (
        <FAB
          style={styles.fab}
          icon="route"
          label="Optimize Route"
          onPress={() => routeService.optimizeCurrentRoute()}
        />
      )}
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#F5F5F5',
  },
  summaryCard: {
    margin: 16,
    marginBottom: 8,
  },
  summaryRow: {
    flexDirection: 'row',
    justifyContent: 'space-around',
  },
  summaryItem: {
    alignItems: 'center',
  },
  summaryLabel: {
    fontSize: 12,
    color: '#666',
    marginBottom: 4,
  },
  summaryValue: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#2196F3',
  },
  mapCard: {
    margin: 16,
    marginTop: 8,
    marginBottom: 8,
    height: 200,
  },
  map: {
    flex: 1,
    borderRadius: 8,
  },
  routeList: {
    flex: 1,
  },
  sectionCard: {
    margin: 16,
    marginTop: 8,
  },
  routeItem: {
    paddingVertical: 8,
    borderBottomWidth: 1,
    borderBottomColor: '#E0E0E0',
  },
  completedItem: {
    opacity: 0.7,
  },
  sequenceContainer: {
    alignItems: 'center',
    marginRight: 8,
  },
  sequenceNumber: {
    fontSize: 12,
    fontWeight: 'bold',
    color: '#2196F3',
    marginBottom: 4,
  },
  actionButtons: {
    flexDirection: 'row',
    gap: 8,
  },
  actionButton: {
    minWidth: 80,
  },
  completedChip: {
    color: '#4CAF50',
  },
  loadingContainer: {
    alignItems: 'center',
    padding: 32,
  },
  loadingText: {
    marginTop: 16,
    color: '#666',
  },
  errorCard: {
    margin: 16,
    backgroundColor: '#FFEBEE',
  },
  errorText: {
    color: '#F44336',
    textAlign: 'center',
  },
  emptyCard: {
    margin: 16,
  },
  emptyContainer: {
    alignItems: 'center',
    padding: 32,
  },
  emptyText: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#666',
    marginTop: 16,
  },
  emptySubtext: {
    fontSize: 14,
    color: '#999',
    textAlign: 'center',
    marginTop: 8,
  },
  fab: {
    position: 'absolute',
    margin: 16,
    right: 0,
    bottom: 0,
  },
});

export default RouteScreen;