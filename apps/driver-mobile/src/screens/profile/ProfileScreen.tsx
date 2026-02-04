import React from 'react';
import {View, StyleSheet} from 'react-native';
import {Text, Card, Title, Button} from 'react-native-paper';
import {useAppDispatch, useAppSelector} from '@/store/hooks';
import {logout} from '@/store/slices/authSlice';

const ProfileScreen: React.FC = () => {
  const dispatch = useAppDispatch();
  const {user} = useAppSelector(state => state.auth);

  const handleLogout = () => {
    dispatch(logout());
  };

  return (
    <View style={styles.container}>
      <Card style={styles.card}>
        <Card.Content>
          <Title>Profile</Title>
          {user && (
            <>
              <Text style={styles.info}>Name: {user.name}</Text>
              <Text style={styles.info}>Email: {user.email}</Text>
              <Text style={styles.info}>Phone: {user.phone}</Text>
              <Text style={styles.info}>Vehicle ID: {user.vehicleId}</Text>
            </>
          )}
          
          <Button
            mode="contained"
            onPress={handleLogout}
            style={styles.logoutButton}
          >
            Logout
          </Button>
        </Card.Content>
      </Card>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    padding: 16,
    backgroundColor: '#F5F5F5',
  },
  card: {
    marginBottom: 16,
  },
  info: {
    marginBottom: 8,
    fontSize: 16,
  },
  logoutButton: {
    marginTop: 24,
  },
});

export default ProfileScreen;