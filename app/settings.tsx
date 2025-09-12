import React, { useRef, useEffect } from "react";
import {
  View,
  StyleSheet,
  ScrollView,
  Alert,
  Animated,
  SafeAreaView,
  StatusBar,
  Platform,
} from "react-native";
import {
  Card,
  Title,
  List,
  Switch,
  Button,
  Appbar,
  Surface,
  Text,
  Divider,
  Avatar,
} from "react-native-paper";
import { useAuth } from "./../context/AuthContext";
import { useTheme } from "./../context/ThemeContext";
import { router } from "expo-router";

export default function SettingsScreen() {
  const { user, logout } = useAuth();
  const { theme, isDarkMode, toggleTheme } = useTheme();

  const themeAnimationValue = useRef(
    new Animated.Value(isDarkMode ? 1 : 0)
  ).current;

  useEffect(() => {
    Animated.timing(themeAnimationValue, {
      toValue: isDarkMode ? 1 : 0,
      duration: 300,
      useNativeDriver: false,
    }).start();
  }, [isDarkMode, themeAnimationValue]);

  const handleLogout = () => {
    Alert.alert(
      "Confirm Logout",
      "Are you sure you want to sign out of your account?",
      [
        {
          text: "Cancel",
          style: "cancel",
        },
        {
          text: "Sign Out",
          style: "destructive",
          onPress: async () => {
            try {
              await logout();
              router.replace("/login");
            } catch (error) {
              Alert.alert("Error", "Failed to sign out. Please try again.");
            }
          },
        },
      ],
      { cancelable: true }
    );
  };

  const getInitials = (username?: string) => {
    if (!username) return "AD";
    return username.substring(0, 2).toUpperCase();
  };

  const renderAnimatedIcon = () => (
    <Animated.View
      style={{
        transform: [
          {
            rotate: themeAnimationValue.interpolate({
              inputRange: [0, 1],
              outputRange: ["0deg", "180deg"],
            }),
          },
        ],
      }}
    >
      <List.Icon
        icon={isDarkMode ? "weather-night" : "weather-sunny"}
        color={theme.colors.primary}
      />
    </Animated.View>
  );

  return (
    <SafeAreaView
      style={[styles.safeArea, { backgroundColor: theme.colors.surface }]}
    >
      <StatusBar
        barStyle={isDarkMode ? "light-content" : "dark-content"}
        backgroundColor={theme.colors.surface}
      />

      {/* Enhanced Header */}
      <Surface
        style={[styles.header, { backgroundColor: theme.colors.surface }]}
        elevation={2}
      >
        <Appbar.Header style={styles.appbarHeader}>
          <Appbar.BackAction
            onPress={() => router.back()}
            iconColor={theme.colors.onSurface}
          />
          <Appbar.Content
            title="Settings"
            titleStyle={[styles.headerTitle, { color: theme.colors.onSurface }]}
          />
        </Appbar.Header>
      </Surface>

      <ScrollView
        style={[styles.container, { backgroundColor: theme.colors.background }]}
        contentContainerStyle={styles.scrollContent}
        showsVerticalScrollIndicator={false}
      >
        {/* User Profile Section */}
        <Card
          style={[
            styles.profileCard,
            { backgroundColor: theme.colors.surface },
          ]}
          elevation={3}
        >
          <Card.Content style={styles.profileContent}>
            <View style={styles.profileHeader}>
              <Avatar.Text
                size={60}
                label={getInitials(user?.username)}
                style={{ backgroundColor: theme.colors.primary }}
                labelStyle={{
                  color: theme.colors.onPrimary,
                  fontSize: 20,
                  fontWeight: "bold",
                }}
              />
              <View style={styles.userInfo}>
                <Text
                  variant="headlineSmall"
                  style={[styles.username, { color: theme.colors.onSurface }]}
                >
                  {user?.username || "Administrator"}
                </Text>
                <Text
                  variant="bodyMedium"
                  style={[
                    styles.userRole,
                    { color: theme.colors.onSurfaceVariant },
                  ]}
                >
                  System Administrator
                </Text>
              </View>
            </View>
          </Card.Content>
        </Card>

        {/* Account Information */}
        <Card
          style={[
            styles.sectionCard,
            { backgroundColor: theme.colors.surface },
          ]}
          elevation={2}
        >
          <Card.Content>
            <Text
              variant="titleMedium"
              style={[styles.sectionTitle, { color: theme.colors.onSurface }]}
            >
              Account Information
            </Text>
            <Divider
              style={[
                styles.sectionDivider,
                { backgroundColor: theme.colors.outline },
              ]}
            />

            <List.Item
              title="Username"
              description={user?.username || "admin"}
              left={(props) => (
                <List.Icon
                  {...props}
                  icon="account-circle"
                  color={theme.colors.primary}
                />
              )}
              titleStyle={[
                styles.listItemTitle,
                { color: theme.colors.onSurface },
              ]}
              descriptionStyle={[
                styles.listItemDescription,
                { color: theme.colors.onSurfaceVariant },
              ]}
              style={styles.listItem}
            />

            <List.Item
              title="Role"
              description="Administrator"
              left={(props) => (
                <List.Icon
                  {...props}
                  icon="shield-account"
                  color={theme.colors.primary}
                />
              )}
              titleStyle={[
                styles.listItemTitle,
                { color: theme.colors.onSurface },
              ]}
              descriptionStyle={[
                styles.listItemDescription,
                { color: theme.colors.onSurfaceVariant },
              ]}
              style={styles.listItem}
            />

            <List.Item
              title="Status"
              description="Active"
              left={(props) => (
                <List.Icon
                  {...props}
                  icon="check-circle"
                  color={theme.colors.primary}
                />
              )}
              titleStyle={[
                styles.listItemTitle,
                { color: theme.colors.onSurface },
              ]}
              descriptionStyle={[
                styles.listItemDescription,
                { color: theme.colors.tertiary },
              ]}
              style={styles.listItem}
            />
          </Card.Content>
        </Card>

        {/* Appearance Settings */}
        <Card
          style={[
            styles.sectionCard,
            { backgroundColor: theme.colors.surface },
          ]}
          elevation={2}
        >
          <Card.Content>
            <Text
              variant="titleMedium"
              style={[styles.sectionTitle, { color: theme.colors.onSurface }]}
            >
              Appearance
            </Text>
            <Divider
              style={[
                styles.sectionDivider,
                { backgroundColor: theme.colors.outline },
              ]}
            />

            <List.Item
              title="Theme"
              description={
                isDarkMode ? "Dark mode active" : "Light mode active"
              }
              left={() => renderAnimatedIcon()}
              right={() => (
                <Switch
                  value={isDarkMode}
                  onValueChange={toggleTheme}
                  color={theme.colors.primary}
                />
              )}
              onPress={toggleTheme}
              titleStyle={[
                styles.listItemTitle,
                { color: theme.colors.onSurface },
              ]}
              descriptionStyle={[
                styles.listItemDescription,
                { color: theme.colors.onSurfaceVariant },
              ]}
              style={styles.listItem}
            />
          </Card.Content>
        </Card>

        {/* Application Information */}
        <Card
          style={[
            styles.sectionCard,
            { backgroundColor: theme.colors.surface },
          ]}
          elevation={2}
        >
          <Card.Content>
            <Text
              variant="titleMedium"
              style={[styles.sectionTitle, { color: theme.colors.onSurface }]}
            >
              Application
            </Text>
            <Divider
              style={[
                styles.sectionDivider,
                { backgroundColor: theme.colors.outline },
              ]}
            />

            <List.Item
              title="Version"
              description="1.0.0"
              left={(props) => (
                <List.Icon
                  {...props}
                  icon="information-outline"
                  color={theme.colors.primary}
                />
              )}
              titleStyle={[
                styles.listItemTitle,
                { color: theme.colors.onSurface },
              ]}
              descriptionStyle={[
                styles.listItemDescription,
                { color: theme.colors.onSurfaceVariant },
              ]}
              style={styles.listItem}
            />

            <List.Item
              title="Build"
              description="Answer Evaluator Pro"
              left={(props) => (
                <List.Icon
                  {...props}
                  icon="package-variant-closed"
                  color={theme.colors.primary}
                />
              )}
              titleStyle={[
                styles.listItemTitle,
                { color: theme.colors.onSurface },
              ]}
              descriptionStyle={[
                styles.listItemDescription,
                { color: theme.colors.onSurfaceVariant },
              ]}
              style={styles.listItem}
            />

            <List.Item
              title="Platform"
              description={Platform.OS === "ios" ? "iOS" : "Android"}
              left={(props) => (
                <List.Icon
                  {...props}
                  icon={Platform.OS === "ios" ? "apple" : "android"}
                  color={theme.colors.primary}
                />
              )}
              titleStyle={[
                styles.listItemTitle,
                { color: theme.colors.onSurface },
              ]}
              descriptionStyle={[
                styles.listItemDescription,
                { color: theme.colors.onSurfaceVariant },
              ]}
              style={styles.listItem}
            />
          </Card.Content>
        </Card>

        {/* Actions Section */}
        <Card
          style={[
            styles.sectionCard,
            { backgroundColor: theme.colors.surface },
          ]}
          elevation={2}
        >
          <Card.Content>
            <Text
              variant="titleMedium"
              style={[styles.sectionTitle, { color: theme.colors.onSurface }]}
            >
              Account Actions
            </Text>
            <Divider
              style={[
                styles.sectionDivider,
                { backgroundColor: theme.colors.outline },
              ]}
            />

            <View style={styles.actionContainer}>
              <Button
                mode="contained"
                onPress={handleLogout}
                icon="logout"
                style={[
                  styles.logoutButton,
                  { backgroundColor: theme.colors.error },
                ]}
                labelStyle={[
                  styles.logoutButtonLabel,
                  { color: theme.colors.onError },
                ]}
                contentStyle={styles.logoutButtonContent}
              >
                Sign Out
              </Button>
            </View>
          </Card.Content>
        </Card>

        {/* Bottom Spacing */}
        <View style={styles.bottomSpacing} />
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safeArea: {
    flex: 1,
  },
  container: {
    flex: 1,
  },
  header: {
    shadowColor: "#000",
    shadowOffset: {
      width: 0,
      height: 2,
    },
    shadowOpacity: 0.1,
    shadowRadius: 3.84,
    elevation: 3,
  },
  appbarHeader: {
    backgroundColor: "transparent",
  },
  headerTitle: {
    fontSize: 20,
    fontWeight: "600",
  },
  scrollContent: {
    paddingHorizontal: 16,
    paddingTop: 8,
    paddingBottom: 32,
  },
  profileCard: {
    marginBottom: 20,
    borderRadius: 16,
    overflow: "hidden",
  },
  profileContent: {
    paddingVertical: 20,
  },
  profileHeader: {
    flexDirection: "row",
    alignItems: "center",
    gap: 16,
  },
  userInfo: {
    flex: 1,
  },
  username: {
    fontWeight: "600",
    marginBottom: 4,
  },
  userRole: {
    opacity: 0.8,
  },
  sectionCard: {
    marginBottom: 16,
    borderRadius: 12,
    overflow: "hidden",
  },
  sectionTitle: {
    fontWeight: "600",
    marginBottom: 8,
    paddingHorizontal: 4,
  },
  sectionDivider: {
    height: 1,
    marginBottom: 8,
    opacity: 0.2,
  },
  listItem: {
    paddingHorizontal: 0,
    paddingVertical: 8,
  },
  listItemTitle: {
    fontSize: 16,
    fontWeight: "500",
  },
  listItemDescription: {
    fontSize: 14,
    opacity: 0.8,
  },
  actionContainer: {
    marginTop: 12,
    gap: 12,
  },
  logoutButton: {
    borderRadius: 12,
    paddingVertical: 4,
  },
  logoutButtonContent: {
    paddingVertical: 12,
    paddingHorizontal: 20,
  },
  logoutButtonLabel: {
    fontSize: 16,
    fontWeight: "600",
  },
  bottomSpacing: {
    height: 20,
  },
});
