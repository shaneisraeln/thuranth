import React, {useEffect, useState} from 'react';
import {
  View,
  StyleSheet,
  ScrollView,
  RefreshControl,
  Alert,
  Modal,
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
  TextInput,
  RadioButton,
} from 'react-native-paper';
import {useNavigation} from '@react-navigation/native';
import Icon from 'react-native-vector-icons/MaterialIcons';

import {useAppSelector, useAppDispatch} from '@/store/hooks';
import {DeliveryService} from '@/services/DeliveryService';
import {startDelivery, cancelDelivery} from '@/store/slices/deliverySlice';

const DeliveryScreen: React.FC = () => {
  const navigation = useNavigation();
  const dispatch = useAppDispatch();
  const [refreshing, setRefreshing] = useState(false);
  const [deliveryService] = useState(() => DeliveryService.getInstance());
  const [showCompletionModal, setShowCompletionModal] = useState(false);
  const [showFailureModal, setShowFailureModal] = useState(false);
  const [selectedParcel, setSelectedParcel] = useState<any>(null);
  const [completionData, setCompletionData] = useState({
    signature: '',
    photo: '',
    recipientName: '',
    notes: '',
  });
  const [failureData, setFailureData] = useState({
    reason: 'recipient_unavailable',
    notes: '',
  });

  const {
    assignedParcels,
    completedDeliveries,
    currentParcel,
    deliveryInProgress,
    loading,
    error,
  } = useAppSelector(state => state.delivery);

  const {isOnline, pendingActions} = useAppSelector(state => state.offline);

  useEffect(() => {
    loadParcels();
  }, []);

  const loadParcels = async () => {
    try {
      await deliveryService.fetchAssignedParcels();
    } catch (error) {
      console.error('Error loading parcels:', error);
    }
  };

  const handleRefresh = async () => {
    setRefreshing(true);
    await loadParcels();
    setRefreshing(false);
  };

  const handleStartDelivery = (parcel: any) => {
    dispatch(startDelivery(parcel));
    navigation.navigate('ParcelDetails', {parcelId: parcel.id});
  };

  const handlePickupParcel = async (parcel: any) => {
    try {
      await deliveryService.pickupParcel(parcel.id);
      Alert.alert('Success', 'Parcel picked up successfully');
    } catch (error) {
      Alert.alert('Error', 'Failed to record parcel pickup');
    }
  };

  const handleCompleteDelivery = (parcel: any) => {
    setSelectedParcel(parcel);
    setShowCompletionModal(true);
  };

  const handleFailDelivery = (parcel: any) => {
    setSelectedParcel(parcel);
    setShowFailureModal(true);
  };

  const submitDeliveryCompletion = async () => {
    if (!selectedParcel) return;

    try {
      await deliveryService.completeDelivery({
        parcelId: selectedParcel.id,
        signature: completionData.signature,
        photo: completionData.photo,
        recipientName: completionData.recipientName,
        notes: completionData.notes,
      });

      setShowCompletionModal(false);
      setSelectedParcel(null);
      setCompletionData({signature: '', photo: '', recipientName: '', notes: ''});
      
      Alert.alert('Success', 'Delivery completed successfully');
    } catch (error) {
      Alert.alert('Error', 'Failed to complete delivery');
    }
  };

  const submitDeliveryFailure = async () => {
    if (!selectedParcel) return;

    try {
      await deliveryService.failDelivery({
        parcelId: selectedParcel.id,
        reason: failureData.reason,
        notes: failureData.notes,
        attemptedAt: new Date().toISOString(),
      });

      setShowFailureModal(false);
      setSelectedParcel(null);
      setFailureData({reason: 'recipient_unavailable', notes: ''});
      
      Alert.alert('Delivery Failed', 'Delivery failure recorded');
    } catch (error) {
      Alert.alert('Error', 'Failed to record delivery failure');
    }
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

  const getStatusIcon = (status: string) => {
    switch (status) {
      case 'assigned': return 'assignment';
      case 'picked_up': return 'local-shipping';
      case 'in_transit': return 'directions-car';
      case 'delivered': return 'check-circle';
      case 'failed': return 'error';
      default: return 'help';
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
      return `Overdue by ${Math.abs(diffHours)}h`;
    } else if (diffHours < 24) {
      return `${diffHours}h remaining`;
    } else {
      return date.toLocaleDateString();
    }
  };

  const pendingParcels = assignedParcels.filter(p => p.status !== 'delivered' && p.status !== 'failed');
  const urgentParcels = pendingParcels.filter(p => p.priority === 'urgent' || new Date(p.slaDeadline) < new Date(Date.now() + 2 * 60 * 60 * 1000));

  return (
    <View style={styles.container}>
      {/* Status Bar */}
      <Card style={styles.statusCard}>
        <Card.Content>
          <View style={styles.statusRow}>
            <View style={styles.statusItem}>
              <Text style={styles.statusLabel}>Pending</Text>
              <Text style={styles.statusValue}>{pendingParcels.length}</Text>
            </View>
            <View style={styles.statusItem}>
              <Text style={styles.statusLabel}>Completed</Text>
              <Text style={styles.statusValue}>{completedDeliveries.length}</Text>
            </View>
            <View style={styles.statusItem}>
              <Text style={styles.statusLabel}>Urgent</Text>
              <Text style={[styles.statusValue, {color: '#F44336'}]}>{urgentParcels.length}</Text>
            </View>
            <View style={styles.statusItem}>
              <View style={styles.offlineIndicator}>
                <Icon 
                  name={isOnline ? 'wifi' : 'wifi-off'} 
                  size={16} 
                  color={isOnline ? '#4CAF50' : '#F44336'} 
                />
                <Text style={[styles.statusLabel, {color: isOnline ? '#4CAF50' : '#F44336'}]}>
                  {isOnline ? 'Online' : 'Offline'}
                </Text>
                {pendingActions.length > 0 && (
                  <Chip size={12} style={styles.pendingChip}>
                    {pendingActions.length}
                  </Chip>
                )}
              </View>
            </View>
          </View>
        </Card.Content>
      </Card>

      <ScrollView
        style={styles.parcelList}
        refreshControl={
          <RefreshControl refreshing={refreshing} onRefresh={handleRefresh} />
        }
      >
        {loading && (
          <View style={styles.loadingContainer}>
            <ActivityIndicator size="large" />
            <Text style={styles.loadingText}>Loading parcels...</Text>
          </View>
        )}

        {error && (
          <Card style={styles.errorCard}>
            <Card.Content>
              <Text style={styles.errorText}>{error}</Text>
            </Card.Content>
          </Card>
        )}

        {/* Urgent Parcels */}
        {urgentParcels.length > 0 && (
          <Card style={styles.sectionCard}>
            <Card.Content>
              <Title style={styles.urgentTitle}>🚨 Urgent Deliveries</Title>
              {urgentParcels.map((parcel) => (
                <List.Item
                  key={parcel.id}
                  title={parcel.recipientName}
                  description={`${parcel.deliveryAddress} • ${formatDeadline(parcel.slaDeadline)}`}
                  left={() => (
                    <View style={styles.parcelInfo}>
                      <Icon
                        name={getStatusIcon(parcel.status)}
                        size={24}
                        color={getStatusColor(parcel.status)}
                      />
                      <Chip
                        style={[styles.priorityChip, {backgroundColor: getPriorityColor(parcel.priority)}]}
                        textStyle={styles.priorityText}
                      >
                        {parcel.priority.toUpperCase()}
                      </Chip>
                    </View>
                  )}
                  right={() => (
                    <View style={styles.actionButtons}>
                      {parcel.status === 'assigned' && (
                        <Button
                          mode="outlined"
                          compact
                          onPress={() => handlePickupParcel(parcel)}
                          style={styles.actionButton}
                        >
                          Pickup
                        </Button>
                      )}
                      {(parcel.status === 'picked_up' || parcel.status === 'in_transit') && (
                        <>
                          <Button
                            mode="contained"
                            compact
                            onPress={() => handleCompleteDelivery(parcel)}
                            style={styles.actionButton}
                          >
                            Complete
                          </Button>
                          <Button
                            mode="outlined"
                            compact
                            onPress={() => handleFailDelivery(parcel)}
                            style={styles.actionButton}
                          >
                            Fail
                          </Button>
                        </>
                      )}
                    </View>
                  )}
                  onPress={() => navigation.navigate('ParcelDetails', {parcelId: parcel.id})}
                  style={[styles.parcelItem, styles.urgentItem]}
                />
              ))}
            </Card.Content>
          </Card>
        )}

        {/* Regular Pending Parcels */}
        {pendingParcels.filter(p => !urgentParcels.includes(p)).length > 0 && (
          <Card style={styles.sectionCard}>
            <Card.Content>
              <Title>Pending Deliveries</Title>
              {pendingParcels.filter(p => !urgentParcels.includes(p)).map((parcel) => (
                <List.Item
                  key={parcel.id}
                  title={parcel.recipientName}
                  description={`${parcel.deliveryAddress} • ${formatDeadline(parcel.slaDeadline)}`}
                  left={() => (
                    <View style={styles.parcelInfo}>
                      <Icon
                        name={getStatusIcon(parcel.status)}
                        size={24}
                        color={getStatusColor(parcel.status)}
                      />
                      <Chip
                        style={[styles.priorityChip, {backgroundColor: getPriorityColor(parcel.priority)}]}
                        textStyle={styles.priorityText}
                      >
                        {parcel.priority.toUpperCase()}
                      </Chip>
                    </View>
                  )}
                  right={() => (
                    <View style={styles.actionButtons}>
                      {parcel.status === 'assigned' && (
                        <Button
                          mode="outlined"
                          compact
                          onPress={() => handlePickupParcel(parcel)}
                          style={styles.actionButton}
                        >
                          Pickup
                        </Button>
                      )}
                      {(parcel.status === 'picked_up' || parcel.status === 'in_transit') && (
                        <>
                          <Button
                            mode="contained"
                            compact
                            onPress={() => handleCompleteDelivery(parcel)}
                            style={styles.actionButton}
                          >
                            Complete
                          </Button>
                          <Button
                            mode="outlined"
                            compact
                            onPress={() => handleFailDelivery(parcel)}
                            style={styles.actionButton}
                          >
                            Fail
                          </Button>
                        </>
                      )}
                    </View>
                  )}
                  onPress={() => navigation.navigate('ParcelDetails', {parcelId: parcel.id})}
                  style={styles.parcelItem}
                />
              ))}
            </Card.Content>
          </Card>
        )}

        {/* Completed Deliveries */}
        {completedDeliveries.length > 0 && (
          <Card style={styles.sectionCard}>
            <Card.Content>
              <Title>Completed Today</Title>
              {completedDeliveries.slice(0, 5).map((parcel) => (
                <List.Item
                  key={parcel.id}
                  title={parcel.recipientName}
                  description={`${parcel.deliveryAddress} • Completed`}
                  left={() => (
                    <Icon
                      name={getStatusIcon(parcel.status)}
                      size={24}
                      color={getStatusColor(parcel.status)}
                    />
                  )}
                  right={() => (
                    <Chip mode="outlined" textStyle={styles.completedChip}>
                      ✓ Done
                    </Chip>
                  )}
                  onPress={() => navigation.navigate('ParcelDetails', {parcelId: parcel.id})}
                  style={[styles.parcelItem, styles.completedItem]}
                />
              ))}
            </Card.Content>
          </Card>
        )}

        {assignedParcels.length === 0 && !loading && (
          <Card style={styles.emptyCard}>
            <Card.Content>
              <View style={styles.emptyContainer}>
                <Icon name="local-shipping" size={48} color="#BDBDBD" />
                <Text style={styles.emptyText}>No deliveries assigned</Text>
                <Text style={styles.emptySubtext}>
                  You will receive notifications when parcels are assigned to you
                </Text>
              </View>
            </Card.Content>
          </Card>
        )}
      </ScrollView>

      {/* Delivery Completion Modal */}
      <Modal
        visible={showCompletionModal}
        onDismiss={() => setShowCompletionModal(false)}
        contentContainerStyle={styles.modalContainer}
      >
        <Card>
          <Card.Content>
            <Title>Complete Delivery</Title>
            <Text style={styles.modalSubtitle}>
              {selectedParcel?.recipientName} - {selectedParcel?.deliveryAddress}
            </Text>
            
            <TextInput
              label="Recipient Name"
              value={completionData.recipientName}
              onChangeText={(text) => setCompletionData({...completionData, recipientName: text})}
              mode="outlined"
              style={styles.modalInput}
            />
            
            <TextInput
              label="Delivery Notes (Optional)"
              value={completionData.notes}
              onChangeText={(text) => setCompletionData({...completionData, notes: text})}
              mode="outlined"
              multiline
              numberOfLines={3}
              style={styles.modalInput}
            />
            
            <View style={styles.modalButtons}>
              <Button
                mode="outlined"
                onPress={() => setShowCompletionModal(false)}
                style={styles.modalButton}
              >
                Cancel
              </Button>
              <Button
                mode="contained"
                onPress={submitDeliveryCompletion}
                style={styles.modalButton}
              >
                Complete
              </Button>
            </View>
          </Card.Content>
        </Card>
      </Modal>

      {/* Delivery Failure Modal */}
      <Modal
        visible={showFailureModal}
        onDismiss={() => setShowFailureModal(false)}
        contentContainerStyle={styles.modalContainer}
      >
        <Card>
          <Card.Content>
            <Title>Delivery Failed</Title>
            <Text style={styles.modalSubtitle}>
              {selectedParcel?.recipientName} - {selectedParcel?.deliveryAddress}
            </Text>
            
            <Text style={styles.radioLabel}>Reason for failure:</Text>
            <RadioButton.Group
              onValueChange={(value) => setFailureData({...failureData, reason: value})}
              value={failureData.reason}
            >
              <RadioButton.Item label="Recipient unavailable" value="recipient_unavailable" />
              <RadioButton.Item label="Wrong address" value="wrong_address" />
              <RadioButton.Item label="Refused delivery" value="refused_delivery" />
              <RadioButton.Item label="Access denied" value="access_denied" />
              <RadioButton.Item label="Other" value="other" />
            </RadioButton.Group>
            
            <TextInput
              label="Additional Notes"
              value={failureData.notes}
              onChangeText={(text) => setFailureData({...failureData, notes: text})}
              mode="outlined"
              multiline
              numberOfLines={3}
              style={styles.modalInput}
            />
            
            <View style={styles.modalButtons}>
              <Button
                mode="outlined"
                onPress={() => setShowFailureModal(false)}
                style={styles.modalButton}
              >
                Cancel
              </Button>
              <Button
                mode="contained"
                onPress={submitDeliveryFailure}
                style={styles.modalButton}
                buttonColor="#F44336"
              >
                Record Failure
              </Button>
            </View>
          </Card.Content>
        </Card>
      </Modal>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#F5F5F5',
  },
  statusCard: {
    margin: 16,
    marginBottom: 8,
  },
  statusRow: {
    flexDirection: 'row',
    justifyContent: 'space-around',
  },
  statusItem: {
    alignItems: 'center',
  },
  statusLabel: {
    fontSize: 12,
    color: '#666',
    marginBottom: 4,
  },
  statusValue: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#2196F3',
  },
  offlineIndicator: {
    alignItems: 'center',
    position: 'relative',
  },
  pendingChip: {
    position: 'absolute',
    top: -8,
    right: -8,
    backgroundColor: '#F44336',
    minWidth: 16,
    height: 16,
  },
  parcelList: {
    flex: 1,
  },
  sectionCard: {
    margin: 16,
    marginTop: 8,
  },
  urgentTitle: {
    color: '#F44336',
  },
  parcelItem: {
    paddingVertical: 8,
    borderBottomWidth: 1,
    borderBottomColor: '#E0E0E0',
  },
  urgentItem: {
    backgroundColor: '#FFEBEE',
  },
  completedItem: {
    opacity: 0.7,
  },
  parcelInfo: {
    alignItems: 'center',
    marginRight: 8,
  },
  priorityChip: {
    marginTop: 4,
    height: 20,
  },
  priorityText: {
    fontSize: 10,
    color: 'white',
  },
  actionButtons: {
    flexDirection: 'row',
    gap: 4,
  },
  actionButton: {
    minWidth: 70,
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
  modalContainer: {
    margin: 20,
  },
  modalSubtitle: {
    color: '#666',
    marginBottom: 16,
  },
  modalInput: {
    marginBottom: 16,
  },
  radioLabel: {
    fontSize: 16,
    fontWeight: 'bold',
    marginBottom: 8,
  },
  modalButtons: {
    flexDirection: 'row',
    justifyContent: 'flex-end',
    gap: 8,
    marginTop: 16,
  },
  modalButton: {
    minWidth: 100,
  },
});

export default DeliveryScreen;