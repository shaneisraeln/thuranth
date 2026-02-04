import messaging, {FirebaseMessagingTypes} from '@react-native-firebase/messaging';
import {Platform, Alert} from 'react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';

export class NotificationService {
  private static instance: NotificationService;
  private fcmToken: string | null = null;

  public static getInstance(): NotificationService {
    if (!NotificationService.instance) {
      NotificationService.instance = new NotificationService();
    }
    return NotificationService.instance;
  }

  public static async initialize(): Promise<void> {
    const instance = NotificationService.getInstance();
    await instance.requestPermission();
    await instance.getFCMToken();
    instance.setupMessageHandlers();
  }

  private async requestPermission(): Promise<boolean> {
    try {
      const authStatus = await messaging().requestPermission();
      const enabled =
        authStatus === messaging.AuthorizationStatus.AUTHORIZED ||
        authStatus === messaging.AuthorizationStatus.PROVISIONAL;

      if (!enabled) {
        console.warn('Push notification permission not granted');
        return false;
      }

      return true;
    } catch (error) {
      console.error('Error requesting notification permission:', error);
      return false;
    }
  }

  private async getFCMToken(): Promise<string | null> {
    try {
      const token = await messaging().getToken();
      this.fcmToken = token;
      
      // Store token for API registration
      await AsyncStorage.setItem('fcm_token', token);
      
      console.log('FCM Token:', token);
      return token;
    } catch (error) {
      console.error('Error getting FCM token:', error);
      return null;
    }
  }

  private setupMessageHandlers(): void {
    // Handle background messages
    messaging().setBackgroundMessageHandler(async (remoteMessage) => {
      console.log('Message handled in the background!', remoteMessage);
      this.handleNotification(remoteMessage);
    });

    // Handle foreground messages
    messaging().onMessage(async (remoteMessage) => {
      console.log('Message handled in the foreground!', remoteMessage);
      this.handleNotification(remoteMessage);
      
      // Show alert for foreground messages
      if (remoteMessage.notification) {
        Alert.alert(
          remoteMessage.notification.title || 'Notification',
          remoteMessage.notification.body || 'You have a new message',
          [
            {
              text: 'OK',
              onPress: () => this.handleNotificationPress(remoteMessage),
            },
          ]
        );
      }
    });

    // Handle notification opened app
    messaging().onNotificationOpenedApp((remoteMessage) => {
      console.log('Notification caused app to open from background state:', remoteMessage);
      this.handleNotificationPress(remoteMessage);
    });

    // Check whether an initial notification is available
    messaging()
      .getInitialNotification()
      .then((remoteMessage) => {
        if (remoteMessage) {
          console.log('Notification caused app to open from quit state:', remoteMessage);
          this.handleNotificationPress(remoteMessage);
        }
      });

    // Handle token refresh
    messaging().onTokenRefresh((token) => {
      console.log('FCM token refreshed:', token);
      this.fcmToken = token;
      AsyncStorage.setItem('fcm_token', token);
      // TODO: Send updated token to server
    });
  }

  private handleNotification(remoteMessage: FirebaseMessagingTypes.RemoteMessage): void {
    const {data, notification} = remoteMessage;
    
    // Handle different notification types
    switch (data?.type) {
      case 'new_parcel_assignment':
        this.handleNewParcelAssignment(data);
        break;
      case 'route_update':
        this.handleRouteUpdate(data);
        break;
      case 'delivery_reminder':
        this.handleDeliveryReminder(data);
        break;
      case 'system_message':
        this.handleSystemMessage(data);
        break;
      default:
        console.log('Unknown notification type:', data?.type);
    }
  }

  private handleNotificationPress(remoteMessage: FirebaseMessagingTypes.RemoteMessage): void {
    const {data} = remoteMessage;
    
    // Navigate to appropriate screen based on notification type
    switch (data?.type) {
      case 'new_parcel_assignment':
        // Navigate to deliveries screen
        break;
      case 'route_update':
        // Navigate to route screen
        break;
      case 'delivery_reminder':
        // Navigate to specific parcel details
        break;
      default:
        // Navigate to main screen
        break;
    }
  }

  private handleNewParcelAssignment(data: any): void {
    console.log('New parcel assignment:', data);
    // TODO: Update Redux store with new parcel
    // TODO: Update route optimization
  }

  private handleRouteUpdate(data: any): void {
    console.log('Route update:', data);
    // TODO: Update Redux store with new route
  }

  private handleDeliveryReminder(data: any): void {
    console.log('Delivery reminder:', data);
    // TODO: Show local notification or update UI
  }

  private handleSystemMessage(data: any): void {
    console.log('System message:', data);
    // TODO: Handle system-wide messages
  }

  public getFCMToken(): string | null {
    return this.fcmToken;
  }

  public async subscribeToTopic(topic: string): Promise<void> {
    try {
      await messaging().subscribeToTopic(topic);
      console.log(`Subscribed to topic: ${topic}`);
    } catch (error) {
      console.error(`Error subscribing to topic ${topic}:`, error);
    }
  }

  public async unsubscribeFromTopic(topic: string): Promise<void> {
    try {
      await messaging().unsubscribeFromTopic(topic);
      console.log(`Unsubscribed from topic: ${topic}`);
    } catch (error) {
      console.error(`Error unsubscribing from topic ${topic}:`, error);
    }
  }
}