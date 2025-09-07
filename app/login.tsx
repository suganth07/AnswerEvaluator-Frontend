import React, { useState, useEffect } from 'react';
import {
  View,
  StyleSheet,
  Alert,
  KeyboardAvoidingView,
  Platform,
  ScrollView,
} from 'react-native';
import {
  TextInput,
  Button,
  Card,
  Title,
  Paragraph,
  ActivityIndicator,
  Divider,
} from 'react-native-paper';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { useAuth } from '../context/AuthContext';
import { useTheme } from '../context/ThemeContext';
import { authService } from '../services/api';
import { router } from 'expo-router';

export default function LoginScreen() {
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const [showPassword, setShowPassword] = useState(false);
  const { login } = useAuth();
  const { theme } = useTheme();

    useEffect(() => {
    // Clear any existing auth state on login page mount
    const clearAuthOnMount = async () => {
      try {
        await AsyncStorage.clear();
        console.log('Auth cleared on login mount');
      } catch (error) {
        console.error('Error clearing auth:', error);
      }
    };
    clearAuthOnMount();
  }, []);

  const handleAdminLogin = async () => {
    if (!username || !password) {
      Alert.alert('Error', 'Please enter both username and password');
      return;
    }

    setLoading(true);
    try {
      const response = await authService.login(username, password);
      await login(response.token, response.admin);
      Alert.alert('Success', 'Login successful!');
      router.replace('/(tabs)/dashboard');
    } catch (error: any) {
      Alert.alert(
        'Login Failed',
        error.response?.data?.error || 'An error occurred during login'
      );
    } finally {
      setLoading(false);
    }
  };

  const continueAsStudent = () => {
    router.push('/student-submission');
  };

  return (
    <KeyboardAvoidingView 
      style={[styles.container, { backgroundColor: theme.colors.background }]}
      behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
    >
      <ScrollView contentContainerStyle={styles.scrollContainer}>
        {/* Logo/Header Section */}
        <View style={styles.header}>
          <View style={styles.logoContainer}>
            <Title style={[styles.appTitle, { color: theme.colors.primary }]}>
              Answer Evaluator
            </Title>
            <Paragraph style={[styles.appSubtitle, { color: theme.colors.onSurfaceVariant }]}>
              Automated answer sheet evaluation system
            </Paragraph>
          </View>
        </View>

        {/* Admin Login Card */}
        <Card style={[styles.card, { backgroundColor: theme.colors.surface }]}>
          <Card.Content>
            <Title style={[styles.cardTitle, { color: theme.colors.onSurface }]}>
              Admin Login
            </Title>
            
            <TextInput
              label="Admin Username"
              value={username}
              onChangeText={setUsername}
              style={styles.input}
              mode="outlined"
              autoCapitalize="none"
              disabled={loading}
              theme={{ colors: { primary: theme.colors.primary } }}
            />
            
            <TextInput
              label="Password"
              value={password}
              onChangeText={setPassword}
              secureTextEntry={!showPassword}
              style={styles.input}
              mode="outlined"
              disabled={loading}
              theme={{ colors: { primary: theme.colors.primary } }}
              right={
                <TextInput.Icon
                  icon={showPassword ? 'eye-off' : 'eye'}
                  onPress={() => setShowPassword(!showPassword)}
                />
              }
            />
            
            <Button
              mode="contained"
              onPress={handleAdminLogin}
              style={[styles.loginButton, { backgroundColor: theme.colors.primary }]}
              disabled={loading}
              contentStyle={styles.buttonContent}
            >
              {loading ? <ActivityIndicator color="white" /> : 'Login as Admin'}
            </Button>

            {/* Demo Credentials */}
            <View style={[styles.demoContainer, { backgroundColor: theme.colors.primaryContainer }]}>
              <Paragraph style={[styles.demoText, { color: theme.colors.primary }]}>
                Demo: admin / 123
              </Paragraph>
            </View>
          </Card.Content>
        </Card>

        {/* Divider */}
        <View style={styles.dividerContainer}>
          <Divider style={[styles.divider, { backgroundColor: theme.colors.outline }]} />
          <Paragraph style={[styles.dividerText, { color: theme.colors.onSurfaceVariant }]}>
            OR
          </Paragraph>
          <Divider style={[styles.divider, { backgroundColor: theme.colors.outline }]} />
        </View>

        {/* Student Section */}
        <Card style={[styles.card, { backgroundColor: theme.colors.surface }]}>
          <Card.Content>
            <Title style={[styles.cardTitle, { color: theme.colors.onSurface }]}>
              Student Portal
            </Title>
            <Paragraph style={[styles.description, { color: theme.colors.onSurfaceVariant }]}>
              Submit your answer sheet for evaluation without login
            </Paragraph>
            
            <Button
              mode="outlined"
              onPress={continueAsStudent}
              style={[styles.studentButton, { borderColor: theme.colors.primary }]}
              contentStyle={styles.buttonContent}
              textColor={theme.colors.primary}
            >
              Continue as Student
            </Button>
          </Card.Content>
        </Card>
      </ScrollView>
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  scrollContainer: {
    flexGrow: 1,
    padding: 20,
    justifyContent: 'center',
  },
  header: {
    alignItems: 'center',
    marginBottom: 40,
  },
  logoContainer: {
    alignItems: 'center',
    padding: 20,
  },
  appTitle: {
    fontSize: 32,
    fontWeight: 'bold',
    marginBottom: 8,
  },
  appSubtitle: {
    fontSize: 16,
    textAlign: 'center',
  },
  card: {
    marginBottom: 20,
    elevation: 4,
    borderRadius: 12,
  },
  cardTitle: {
    fontSize: 20,
    fontWeight: 'bold',
    marginBottom: 20,
    textAlign: 'center',
  },
  input: {
    marginBottom: 15,
  },
  loginButton: {
    marginTop: 10,
    paddingVertical: 5,
    borderRadius: 8,
  },
  studentButton: {
    marginTop: 10,
    paddingVertical: 5,
    borderRadius: 8,
  },
  buttonContent: {
    paddingVertical: 8,
  },
  description: {
    textAlign: 'center',
    marginBottom: 15,
    lineHeight: 20,
  },
  demoContainer: {
    marginTop: 15,
    padding: 10,
    borderRadius: 8,
    alignItems: 'center',
  },
  demoText: {
    fontSize: 12,
    fontFamily: 'monospace',
  },
  dividerContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    marginVertical: 20,
  },
  divider: {
    flex: 1,
    height: 1,
  },
  dividerText: {
    marginHorizontal: 15,
    fontSize: 14,
    fontWeight: 'bold',
  },
});
