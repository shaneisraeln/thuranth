import React, {useState} from 'react';
import {View, StyleSheet, Alert} from 'react-native';
import {
  TextInput,
  Button,
  Text,
  Card,
  Title,
  ActivityIndicator,
} from 'react-native-paper';
import {useAppDispatch, useAppSelector} from '@/store/hooks';
import {loginStart, loginSuccess, loginFailure} from '@/store/slices/authSlice';

const LoginScreen: React.FC = () => {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const dispatch = useAppDispatch();
  const {loading, error} = useAppSelector(state => state.auth);

  const handleLogin = async () => {
    if (!email || !password) {
      Alert.alert('Error', 'Please enter both email and password');
      return;
    }

    dispatch(loginStart());

    try {
      // TODO: Replace with actual API call
      const response = await fetch(`${process.env.API_BASE_URL}/api/auth/login`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({email, password}),
      });

      if (!response.ok) {
        throw new Error('Login failed');
      }

      const data = await response.json();
      
      dispatch(loginSuccess({
        user: data.user,
        token: data.token,
        refreshToken: data.refreshToken,
      }));
    } catch (error) {
      dispatch(loginFailure('Login failed. Please check your credentials.'));
    }
  };

  return (
    <View style={styles.container}>
      <Card style={styles.card}>
        <Card.Content>
          <Title style={styles.title}>PDCP Driver</Title>
          <Text style={styles.subtitle}>Sign in to continue</Text>
          
          <TextInput
            label="Email"
            value={email}
            onChangeText={setEmail}
            mode="outlined"
            style={styles.input}
            keyboardType="email-address"
            autoCapitalize="none"
            disabled={loading}
          />
          
          <TextInput
            label="Password"
            value={password}
            onChangeText={setPassword}
            mode="outlined"
            style={styles.input}
            secureTextEntry
            disabled={loading}
          />
          
          {error && (
            <Text style={styles.error}>{error}</Text>
          )}
          
          <Button
            mode="contained"
            onPress={handleLogin}
            style={styles.button}
            disabled={loading}
          >
            {loading ? <ActivityIndicator color="white" /> : 'Sign In'}
          </Button>
        </Card.Content>
      </Card>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    justifyContent: 'center',
    padding: 20,
    backgroundColor: '#F5F5F5',
  },
  card: {
    padding: 20,
  },
  title: {
    textAlign: 'center',
    marginBottom: 8,
    fontSize: 24,
    fontWeight: 'bold',
  },
  subtitle: {
    textAlign: 'center',
    marginBottom: 32,
    color: '#666',
  },
  input: {
    marginBottom: 16,
  },
  button: {
    marginTop: 16,
    paddingVertical: 8,
  },
  error: {
    color: '#F44336',
    textAlign: 'center',
    marginTop: 8,
  },
});

export default LoginScreen;