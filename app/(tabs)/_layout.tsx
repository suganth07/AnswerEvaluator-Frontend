import { Tabs } from "expo-router";
import { Ionicons } from "@expo/vector-icons";
import { useTheme } from "../../context/ThemeContext";
import { View } from "react-native";

export default function TabsLayout() {
  const { theme, isDarkMode } = useTheme();

  // Professional colors that blend with the page
  const activeColor = "#6366F1"; // Subtle purple accent
  const inactiveColor = isDarkMode ? "rgba(255, 255, 255, 0.5)" : "rgba(0, 0, 0, 0.4)";
  const backgroundColor = isDarkMode 
    ? "#1E1E1E" // Dark theme: solid dark
    : "#FFFFFF"; // Light theme: solid white

  return (
    <Tabs
      screenOptions={{
        tabBarActiveTintColor: activeColor,
        tabBarInactiveTintColor: inactiveColor,
        tabBarStyle: {
          position: "absolute",
          bottom: 0,
          left: 0,
          right: 0,
          backgroundColor: backgroundColor,
          borderTopWidth: 0,
          elevation: 8,
          shadowColor: "#000",
          shadowOffset: { width: 0, height: -2 },
          shadowOpacity: isDarkMode ? 0.3 : 0.1,
          shadowRadius: 8,
          height: 65,
          paddingBottom: 10,
          paddingTop: 8,
        },
        headerShown: false,
        tabBarLabelStyle: {
          fontSize: 10,
          fontWeight: "500",
          marginTop: 1,
        },
        tabBarIconStyle: {
          marginTop: 2,
        },
      }}
    >
      <Tabs.Screen
        name="dashboard"
        options={{
          title: "Dashboard",
          tabBarIcon: ({ color, size, focused }) => (
            <View style={{ alignItems: "center" }}>
              <Ionicons 
                name={focused ? "analytics" : "analytics-outline"} 
                size={size + 2} 
                color={color} 
              />
            </View>
          ),
        }}
      />
      <Tabs.Screen
        name="tests"
        options={{
          title: "Tests",
          tabBarIcon: ({ color, size, focused }) => (
            <View style={{ alignItems: "center" }}>
              <Ionicons 
                name={focused ? "library" : "library-outline"} 
                size={size + 2} 
                color={color} 
              />
            </View>
          ),
        }}
      />
      <Tabs.Screen
        name="student"
        options={{
          title: "Student Portal",
          tabBarIcon: ({ color, size, focused }) => (
            <View style={{ alignItems: "center" }}>
              <Ionicons 
                name={focused ? "people" : "people-outline"} 
                size={size + 2} 
                color={color} 
              />
            </View>
          ),
        }}
      />
    </Tabs>
  );
}
