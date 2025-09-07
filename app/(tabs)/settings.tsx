import React from 'react';
import {
  View,
  StyleSheet,
  ScrollView,
  Alert,
  Animated,
} from 'react-native';
import {
  Card,
  Title,
  Paragraph,
  List,
  Switch,
  Button,
  Appbar,
  Divider,
} from 'react-native-paper';
import { useAuth } from '../../context/AuthContext';
import { useTheme } from '../../context/ThemeContext';
import { router } from 'expo-router';

export default function SettingsScreen() {
  const { user, logout } = useAuth();
  const { theme, isDarkMode, toggleTheme } = useTheme();

  // Animation for theme toggle
  const animatedValue = React.useRef(new Animated.Value(isDarkMode ? 1 : 0)).current;

  React.useEffect(() => {
    Animated.timing(animatedValue, {
      toValue: isDarkMode ? 1 : 0,
      duration: 300,
      useNativeDriver: false,
    }).start();
  }, [isDarkMode]);

  const handleLogout = () => {
    Alert.alert(
      'Logout',
      'Are you sure you want to logout?',
      [
        { text: 'Cancel', style: 'cancel' },
        { 
          text: 'Logout', 
          style: 'destructive',
          onPress: async () => {
            await logout();
            router.replace('/login');
          }
        },
      ]
    );
  };

  return (
    <View style={[styles.container, { backgroundColor: theme.colors.background }]}>
      {/* Header */}
      <Appbar.Header style={{ backgroundColor: theme.colors.surface }}>
        <Appbar.BackAction 
          onPress={() => router.back()} 
          iconColor={theme.colors.onSurface}
        />
        <Appbar.Content 
          title="Settings" 
          titleStyle={{ color: theme.colors.onSurface }}
        />
      </Appbar.Header>

      <ScrollView style={styles.content}>
        {/* User Info */}
        <Card style={[styles.card, { backgroundColor: theme.colors.surface }]}>
          <Card.Content>
            <Title style={[styles.cardTitle, { color: theme.colors.onSurface }]}>
              Account Information
            </Title>
            <List.Item
              title="Username"
              description={user?.username || 'Admin'}
              left={() => <List.Icon icon="account" color={theme.colors.primary} />}
              titleStyle={{ color: theme.colors.onSurface }}
              descriptionStyle={{ color: theme.colors.onSurfaceVariant }}
            />
            <List.Item
              title="Role"
              description="Administrator"
              left={() => <List.Icon icon="shield-account" color={theme.colors.primary} />}
              titleStyle={{ color: theme.colors.onSurface }}
              descriptionStyle={{ color: theme.colors.onSurfaceVariant }}
            />
          </Card.Content>
        </Card>

        {/* Appearance Settings */}
        <Card style={[styles.card, { backgroundColor: theme.colors.surface }]}>
          <Card.Content>
            <Title style={[styles.cardTitle, { color: theme.colors.onSurface }]}>
              Appearance
            </Title>
            
            <List.Item
              title="Dark Mode"
              description={isDarkMode ? "Dark theme enabled" : "Light theme enabled"}
              left={() => (
                <Animated.View style={{
                  transform: [{
                    rotate: animatedValue.interpolate({
                      inputRange: [0, 1],
                      outputRange: ['0deg', '180deg'],
                    }),
                  }],
                }}>
                  <List.Icon 
                    icon={isDarkMode ? 'weather-night' : 'weather-sunny'} 
                    color={theme.colors.primary} 
                  />
                </Animated.View>
              )}
              right={() => (
                <Switch
                  value={isDarkMode}
                  onValueChange={toggleTheme}
                  color={theme.colors.primary}
                />
              )}
              titleStyle={{ color: theme.colors.onSurface }}
              descriptionStyle={{ color: theme.colors.onSurfaceVariant }}
              onPress={toggleTheme}
            />
          </Card.Content>
        </Card>

        {/* App Information */}
        <Card style={[styles.card, { backgroundColor: theme.colors.surface }]}>
          <Card.Content>
            <Title style={[styles.cardTitle, { color: theme.colors.onSurface }]}>
              App Information
            </Title>
            <List.Item
              title="Version"
              description="1.0.0"
              left={() => <List.Icon icon="information" color={theme.colors.primary} />}
              titleStyle={{ color: theme.colors.onSurface }}
              descriptionStyle={{ color: theme.colors.onSurfaceVariant }}
            />
            <List.Item
              title="Build"
              description="Answer Evaluator Pro"
              left={() => <List.Icon icon="package-variant" color={theme.colors.primary} />}
              titleStyle={{ color: theme.colors.onSurface }}
              descriptionStyle={{ color: theme.colors.onSurfaceVariant }}
            />
          </Card.Content>
        </Card>

        {/* Actions */}
        <Card style={[styles.card, { backgroundColor: theme.colors.surface }]}>
          <Card.Content>
            <Title style={[styles.cardTitle, { color: theme.colors.onSurface }]}>
              Actions
            </Title>
            
            <View style={styles.actionButtons}>
              <Button
                mode="contained"
                onPress={handleLogout}
                style={[styles.logoutButton, { backgroundColor: theme.colors.error }]}
                contentStyle={styles.buttonContent}
                icon="logout"
              >
                Logout
              </Button>
            </View>
          </Card.Content>
        </Card>

        {/* Footer Spacing */}
        <View style={styles.footer} />
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  content: {
    flex: 1,
    padding: 20,
  },
  card: {
    marginBottom: 20,
    elevation: 4,
    borderRadius: 12,
  },
  cardTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    marginBottom: 10,
  },
  actionButtons: {
    marginTop: 15,
  },
  logoutButton: {
    borderRadius: 8,
    marginTop: 10,
  },
  buttonContent: {
    paddingVertical: 8,
  },
  footer: {
    height: 100,
  },
});
