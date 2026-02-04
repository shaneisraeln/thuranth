import React, {useEffect, useState} from 'react';
import {
  View,
  StyleSheet,
  ScrollView,
  Alert,
  Linking,
} from 'react-native';
import {
  Text,
  Card,
  Title,
  Button,
  Chip,
  Divider,
  List,
} from 'react-native-paper';
import {useRoute, useNavigation} from '@react-navigation/native';
import Icon from 'react-native-vector-icons/MaterialIcons';

import {useAppSelector} from '@/store/hooks';
import {DeliveryService} from '@/services/DeliveryService';
import {RouteService} from '@/services/RouteService';

interface ParcelDetailsParams {
  parcelId: string;
}

const ParcelDetailsScreen: React.FC = () => {
  const route = useRoute();
  const navigation = useNavigation();
  const {parcelId} = route.params as ParcelDetailsParams;
  
  const [parcel, setParcel] = useState<any>(null);
  const [eta, setEta] = useState<{duration: number; distance: number} | null>(null);
  const [deliveryService] = useState(() => DeliveryService.getInstance());
  const [routeService] = useState(() => RouteService.getInstance());

  const {currentLocation} = useAppSelector(state => state.location);

  useEffect(() => {
    loadParcelDetails();
    if (currentLocation) {
      calculateETA();
    }
  }, [parcelId, currentLocation]);

  const loadParcelDetails = () => {
    const parcelData = deliveryService.getParcelById(parcelId);
    setParcel(parcelData);
  };

  const calculateETA = async () => {
    if (!parcel || !currentLocation) return;

    try {
      // For simplicity, calculate ETA to delivery address
      // In a real app, you'd geocode the address first
      const etaData = await routeService.calculateETA({
        latitude: 0, // Would be geocoded from parcel.deliveryAddress
        longitude: 0,
      });
      setEta(etaData);
    } catch (error) {
      console.error('Error calculating ETA:', error);
    }
  };

  const handleCallRecipient = () => {
    if (parcel?.recipientPhone) {
      Linking.openURL(`tel:${parcel.recipientPhone}`);
    }
  };

  const handleNavigateToAddress = (address: string, type: 'pickup' | 'delivery') => {
    // In a real app, you'd geocode the address first
    navigation.navigate('Navigation', {
      destination: {
        latitude: 0, // Would be geocoded
        longitude: 0,
        address: address,
      },
    });
  };

  const handlePickup = async () => {
    if (!parcel) return;

    try {
      await deliveryService.pickupParcel(parcel.id);
      Alert.alert('Success', 'Parcel picked up successfully');
      loadParcelDetails(); // Refresh data
    } catch (error) {
      Alert.alert('Error', 'Failed to record parcel pickup');
    }
  };

  const handleStartDelivery = () => {
    if (!parcel) return;
    
    Alert.alert(
      'Start Delivery',
      'Navigate to delivery address?',
      [
        {text: 'Cancel', style: 'cancel'},
        {
          text: 'Navigate',
          onPress: () => handleNavigateToAddress(parcel.deliveryAddress, 'delivery'),
        },
      ]
    );
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'assigned': return '#2196F3';
      case 'picked_up': return '#FF9800';
      case 'in_transit': return '#9C27B0';
      case 'delivered': return '#4CAF50';
      case 'failed': return '#F44336';
      default: return '#757575';
    }
  };

  const getPriorityColor = (priority: string) => {
    switch (priority) {
      case 'urgent': return '#F44336';
      case 'high': return '#FF9800';
      case 'medium': return '#2196F3';
      case 'low': return '#4CAF50';
      default: return '#757575';
    }
  };

  const formatDeadline = (deadline: string) => {
    const date = new Date(deadline);
    const now = new Date();
    const diffHours = Math.floor((date.getTime() - now.getTime()) / (1000 * 60 * 60));
    
    if (diffHours < 0) {
      return {
        text: `Overdue by ${Math.abs(diffHours)}h`,
        color: '#F44336',
        urgent: true,
      };
    } else if (diffHours < 2) {
      return {
        text: `${diffHours}h remaining`,
        color: '#FF9800',
        urgent: true,
      };
    } else if (diffHours < 24) {
      return {
        text: `${diffHours}h remaining`,
        color: '#2196F3',
        urgent: false,
      };
    } else {
      return {
        text: date.toLocaleDateString(),
        color: '#4CAF50',
        urgent: false,
      };
    }
  };

  const formatDimensions = (dimensions: any) => {
    return `${dimensions.length} × ${dimensions.width} × ${dimensions.height} cm`;
  };

  if (!parcel) {
    return (
      <View style={styles.container}>
        <Card style={styles.card}>
          <Card.Content>
            <Text>Parcel not found</Text>
          </Card.Content>
        </Card>
      </View>
    );
  }

  const deadline = formatDeadline(parcel.slaDeadline);

  return (
    <ScrollView style={styles.container}>
      {/* Header Card */}
      <Card style={styles.headerCard}>
        <Card.Content>
          <View style={styles.headerRow}>
            <View style={styles.headerInfo}>
              <Title>{parcel.trackingNumber}</Title>
              <Text style={styles.recipientName}>{parcel.recipientName}</Text>
            </View>
            <View style={styles.headerChips}>
              <Chip
                style={[styles.statusChip, {backgroundColor: getStatusColor(parcel.status)}]}
                textStyle={styles.chipText}
              >
                {parcel.status.replace('_', ' ').toUpperCase()}
              </Chip>
              <Chip
                style={[styles.priorityChip, {backgroundColor: getPriorityColor(parcel.priority)}]}
                textStyle={styles.chipText}
              >
                {parcel.priority.toUpperCase()}
              </Chip>
            </View>
          </View>
          
          <View style={styles.deadlineContainer}>
            <Icon name="schedule" size={16} color={deadline.color} />
            <Text style={[styles.deadlineText, {color: deadline.color}]}>
              SLA: {deadline.text}
            </Text>
            {deadline.urgent && (
              <Icon name="warning" size={16} color="#F44336" />
            )}
          </View>
        </Card.Content>
      </Card>

      {/* Addresses Card */}
      <Card style={styles.card}>
        <Card.Content>
          <Title>Addresses</Title>
          
          <List.Item
            title="Pickup Address"
            description={parcel.pickupAddress}
            left={() => <Icon name="arrow-upward" size={24} color="#2196F3" />}
            right={() => (
              <Button
                mode="outlined"
                compact
                onPress={() => handleNavigateToAddress(parcel.pickupAddress, 'pickup')}
              >
                Navigate
              </Button>
            )}
            style={styles.addressItem}
          />
          
          <Divider style={styles.divider} />
          
          <List.Item
            title="Delivery Address"
            description={parcel.deliveryAddress}
            left={() => <Icon name="arrow-downward" size={24} color="#FF9800" />}
            right={() => (
              <Button
                mode="outlined"
                compact
                onPress={() => handleNavigateToAddress(parcel.deliveryAddress, 'delivery')}
              >
                Navigate
              </Button>
            )}
            style={styles.addressItem}
          />
        </Card.Content>
      </Card>

      {/* Contact Card */}
      <Card style={styles.card}>
        <Card.Content>
          <Title>Contact Information</Title>
          
          <List.Item
            title="Recipient"
            description={parcel.recipientName}
            left={() => <Icon name="person" size={24} color="#2196F3" />}
          />
          
          <List.Item
            title="Phone"
            description={parcel.recipientPhone}
            left={() => <Icon name="phone" size={24} color="#4CAF50" />}
            right={() => (
              <Button
                mode="contained"
                compact
                onPress={handleCallRecipient}
                icon="phone"
              >
                Call
              </Button>
            )}
          />
        </Card.Content>
      </Card>

      {/* Package Details Card */}
      <Card style={styles.card}>
        <Card.Content>
          <Title>Package Details</Title>
          
          <View style={styles.detailsGrid}>
            <View style={styles.detailItem}>
              <Text style={styles.detailLabel}>Weight</Text>
              <Text style={styles.detailValue}>{parcel.weight} kg</Text>
            </View>
            
            <View style={styles.detailItem}>
              <Text style={styles.detailLabel}>Dimensions</Text>
              <Text style={styles.detailValue}>{formatDimensions(parcel.dimensions)}</Text>
            </View>
          </View>
          
          {parcel.specialInstructions && (
            <>
              <Divider style={styles.divider} />
              <Text style={styles.instructionsLabel}>Special Instructions:</Text>
              <Text style={styles.instructionsText}>{parcel.specialInstructions}</Text>
            </>
          )}
        </Card.Content>
      </Card>

      {/* Proof of Delivery Card */}
      {parcel.proofOfDelivery && (
        <Card style={styles.card}>
          <Card.Content>
            <Title>Proof of Delivery</Title>
            
            <List.Item
              title="Delivered At"
              description={new Date(parcel.proofOfDelivery.timestamp).toLocaleString()}
              left={() => <Icon name="check-circle" size={24} color="#4CAF50" />}
            />
            
            {parcel.proofOfDelivery.recipientName && (
              <List.Item
                title="Received By"
                description={parcel.proofOfDelivery.recipientName}
                left={() => <Icon name="person-outline" size={24} color="#2196F3" />}
              />
            )}
            
            <List.Item
              title="Location"
              description={`${parcel.proofOfDelivery.location.latitude.toFixed(6)}, ${parcel.proofOfDelivery.location.longitude.toFixed(6)}`}
              left={() => <Icon name="location-on" size={24} color="#FF9800" />}
            />
          </Card.Content>
        </Card>
      )}

      {/* Action Buttons */}
      <Card style={styles.actionCard}>
        <Card.Content>
          <View style={styles.actionButtons}>
            {parcel.status === 'assigned' && (
              <Button
                mode="contained"
                onPress={handlePickup}
                style={styles.actionButton}
                icon="local-shipping"
              >
                Mark as Picked Up
              </Button>
            )}
            
            {(parcel.status === 'picked_up' || parcel.status === 'in_transit') && (
              <Button
                mode="contained"
                onPress={handleStartDelivery}
                style={styles.actionButton}
                icon="navigation"
              >
                Start Delivery
              </Button>
            )}
            
            <Button
              mode="outlined"
              onPress={() => navigation.goBack()}
              style={styles.actionButton}
              icon="arrow-left"
            >
              Back to Deliveries
            </Button>
          </View>
        </Card.Content>
      </Card>
    </ScrollView>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#F5F5F5',
  },
  headerCard: {
    margin: 16,
    marginBottom: 8,
  },
  headerRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    marginBottom: 12,
  },
  headerInfo: {
    flex: 1,
  },
  recipientName: {
    fontSize: 16,
    color: '#666',
    marginTop: 4,
  },
  headerChips: {
    alignItems: 'flex-end',
    gap: 8,
  },
  statusChip: {
    height: 28,
  },
  priorityChip: {
    height: 24,
  },
  chipText: {
    color: 'white',
    fontSize: 12,
    fontWeight: 'bold',
  },
  deadlineContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  deadlineText: {
    fontSize: 14,
    fontWeight: 'bold',
  },
  card: {
    margin: 16,
    marginTop: 8,
  },
  addressItem: {
    paddingVertical: 8,
  },
  divider: {
    marginVertical: 8,
  },
  detailsGrid: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginVertical: 8,
  },
  detailItem: {
    flex: 1,
  },
  detailLabel: {
    fontSize: 12,
    color: '#666',
    marginBottom: 4,
  },
  detailValue: {
    fontSize: 16,
    fontWeight: 'bold',
    color: '#333',
  },
  instructionsLabel: {
    fontSize: 14,
    fontWeight: 'bold',
    color: '#333',
    marginBottom: 8,
  },
  instructionsText: {
    fontSize: 14,
    color: '#666',
    fontStyle: 'italic',
  },
  actionCard: {
    margin: 16,
    marginTop: 8,
    marginBottom: 32,
  },
  actionButtons: {
    gap: 12,
  },
  actionButton: {
    paddingVertical: 8,
  },
});

export default ParcelDetailsScreen;