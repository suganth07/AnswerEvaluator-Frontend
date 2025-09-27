import React, { useState } from "react";
import {
  View,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  TextInput,
  Alert,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { Text, Card, Button, Chip } from "react-native-paper";
import { useTheme } from "../context/ThemeContext";
import { router } from "expo-router";
import { Ionicons } from "@expo/vector-icons";
import { LinearGradient } from "expo-linear-gradient";

export default function ManualTestSetupScreen() {
  const [testName, setTestName] = useState("");
  const [totalMarks, setTotalMarks] = useState("");
  const [numQuestions, setNumQuestions] = useState("");
  const [selectedPreset, setSelectedPreset] = useState<number | null>(null);
  const { theme, isDarkMode } = useTheme();

  const handleContinue = () => {
    if (!testName.trim()) {
      Alert.alert("Error", "Please enter a test name");
      return;
    }

    if (!totalMarks.trim()) {
      Alert.alert("Error", "Please enter total marks for the test");
      return;
    }

    const totalMarksNum = parseInt(totalMarks);
    if (!totalMarksNum || totalMarksNum < 1 || totalMarksNum > 10000) {
      Alert.alert("Error", "Please enter valid total marks (1-10000)");
      return;
    }

    const questionCount = selectedPreset || parseInt(numQuestions);
    if (!questionCount || questionCount < 1 || questionCount > 100) {
      Alert.alert("Error", "Please select a valid number of questions (1-100)");
      return;
    }

    // Navigate to question editor with test details
    router.push({
      pathname: "/manual-question-editor",
      params: {
        testName: testName.trim(),
        totalMarks: totalMarksNum.toString(),
        totalQuestions: questionCount.toString(),
        currentQuestion: "1",
      },
    });
  };

  return (
    <View style={styles.safeArea}>
      <LinearGradient
        colors={isDarkMode ? ["#1F2937", "#111827"] : ["#6366F1", "#8B5CF6"]}
        style={styles.fullScreenGradient}
      >
        <SafeAreaView
          style={styles.safeAreaContent}
          edges={["top", "left", "right"]}
        >
          {/* Header */}
          <View style={styles.headerGradient}>
            <View style={styles.headerContent}>
              <TouchableOpacity
                style={styles.backButton}
                onPress={() => router.back()}
              >
                <Ionicons name="arrow-back" size={24} color="white" />
              </TouchableOpacity>
              <View style={styles.headerTextContainer}>
                <Text variant="headlineMedium" style={styles.headerTitle}>
                  Create Manual Test
                </Text>
                <Text variant="bodyLarge" style={styles.headerSubtitle}>
                  Set up your test questions manually
                </Text>
              </View>
            </View>
          </View>

          <ScrollView
            style={[
              styles.container,
              { backgroundColor: theme.colors.background },
            ]}
            contentContainerStyle={styles.scrollContent}
            showsVerticalScrollIndicator={false}
          >
            {/* Test Name Section */}
            <Card
              style={[styles.card, { backgroundColor: theme.colors.surface }]}
            >
              <View style={styles.cardContent}>
                <View style={styles.sectionHeader}>
                  <Ionicons
                    name="create-outline"
                    size={24}
                    color={theme.colors.primary}
                  />
                  <Text
                    variant="titleLarge"
                    style={[
                      styles.sectionTitle,
                      { color: theme.colors.onSurface },
                    ]}
                  >
                    Test Details
                  </Text>
                </View>
                <Text
                  variant="bodyMedium"
                  style={[
                    styles.sectionDescription,
                    { color: theme.colors.onSurfaceVariant },
                  ]}
                >
                  Give your test a descriptive name that students will recognize
                </Text>

                <View style={styles.inputContainer}>
                  <Text
                    variant="labelLarge"
                    style={[
                      styles.inputLabel,
                      { color: theme.colors.onSurface },
                    ]}
                  >
                    Test Name *
                  </Text>
                  <TextInput
                    style={[
                      styles.textInput,
                      {
                        backgroundColor: isDarkMode ? "#374151" : "#F9FAFB",
                        color: theme.colors.onSurface,
                        borderColor: theme.colors.outline,
                      },
                    ]}
                    value={testName}
                    onChangeText={setTestName}
                    placeholder="e.g., Mathematics Quiz - Chapter 5"
                    placeholderTextColor={theme.colors.onSurfaceVariant}
                    maxLength={100}
                  />
                </View>
                
                {/* Total Marks */}
                <View style={styles.inputContainer}>
                  <Text
                    variant="labelLarge"
                    style={[
                      styles.inputLabel,
                      { color: theme.colors.onSurface },
                    ]}
                  >
                    Total Marks *
                  </Text>
                  <TextInput
                    style={[
                      styles.textInput,
                      {
                        backgroundColor: isDarkMode ? "#374151" : "#F9FAFB",
                        color: theme.colors.onSurface,
                        borderColor: theme.colors.outline,
                      },
                    ]}
                    value={totalMarks}
                    onChangeText={setTotalMarks}
                    placeholder="e.g., 100"
                    placeholderTextColor={theme.colors.onSurfaceVariant}
                    keyboardType="numeric"
                    maxLength={4}
                  />
                </View>
              </View>
            </Card>

            {/* Number of Questions Section */}
            <Card
              style={[styles.card, { backgroundColor: theme.colors.surface }]}
            >
              <View style={styles.cardContent}>
                <View style={styles.sectionHeader}>
                  <Ionicons
                    name="list-outline"
                    size={24}
                    color={theme.colors.primary}
                  />
                  <Text
                    variant="titleLarge"
                    style={[
                      styles.sectionTitle,
                      { color: theme.colors.onSurface },
                    ]}
                  >
                    Number of Questions
                  </Text>
                </View>
                <Text
                  variant="bodyMedium"
                  style={[
                    styles.sectionDescription,
                    { color: theme.colors.onSurfaceVariant },
                  ]}
                >
                  enter a custom number of questions
                </Text>

                {/* Custom Input */}
                <View style={styles.customInputSection}>
                  <View style={styles.inputContainer}>
                    <Text
                      variant="labelLarge"
                      style={[
                        styles.inputLabel,
                        { color: theme.colors.onSurface },
                      ]}
                    >
                      Custom Number of Questions
                    </Text>
                    <TextInput
                      style={[
                        styles.textInput,
                        {
                          backgroundColor: isDarkMode ? "#374151" : "#F9FAFB",
                          color: theme.colors.onSurface,
                          borderColor: theme.colors.outline,
                        },
                      ]}
                      value={numQuestions}
                      onChangeText={(text) => {
                        setNumQuestions(text);
                        setSelectedPreset(null);
                      }}
                      placeholder="Enter number (1-100)"
                      placeholderTextColor={theme.colors.onSurfaceVariant}
                      keyboardType="numeric"
                      maxLength={3}
                    />
                  </View>
                </View>
              </View>
            </Card>

            {/* Summary Section */}
            {(selectedPreset || numQuestions) && testName && totalMarks && (
              <Card
                style={[
                  styles.card,
                  styles.summaryCard,
                  { backgroundColor: theme.colors.surface },
                ]}
              >
                <View style={styles.cardContent}>
                  <View style={styles.sectionHeader}>
                    <Ionicons
                      name="checkmark-circle-outline"
                      size={24}
                      color={theme.colors.primary}
                    />
                    <Text
                      variant="titleLarge"
                      style={[
                        styles.sectionTitle,
                        { color: theme.colors.onSurface },
                      ]}
                    >
                      Test Summary
                    </Text>
                  </View>

                  <View style={styles.summaryDetails}>
                    <View style={styles.summaryRow}>
                      <Text
                        variant="bodyMedium"
                        style={{ color: theme.colors.onSurfaceVariant }}
                      >
                        Test Name:
                      </Text>
                      <Text
                        variant="bodyMedium"
                        style={[
                          styles.summaryValue,
                          { color: theme.colors.onSurface },
                        ]}
                      >
                        {testName}
                      </Text>
                    </View>
                    <View style={styles.summaryRow}>
                      <Text
                        variant="bodyMedium"
                        style={{ color: theme.colors.onSurfaceVariant }}
                      >
                        Questions:
                      </Text>
                      <Text
                        variant="bodyMedium"
                        style={[
                          styles.summaryValue,
                          { color: theme.colors.onSurface },
                        ]}
                      >
                        {selectedPreset || numQuestions} questions
                      </Text>
                    </View>
                    <View style={styles.summaryRow}>
                      <Text
                        variant="bodyMedium"
                        style={{ color: theme.colors.onSurfaceVariant }}
                      >
                        Type:
                      </Text>
                      <Chip
                        mode="outlined"
                        compact
                        style={[
                          styles.typeChip,
                          { backgroundColor: theme.colors.primary + "20" },
                        ]}
                        textStyle={{
                          color: theme.colors.primary,
                          fontSize: 12,
                        }}
                      >
                        Manual Entry
                      </Chip>
                    </View>
                  </View>
                </View>
              </Card>
            )}

            {/* Continue Button */}
            <TouchableOpacity
              style={[
                styles.continueButton,
                {
                  opacity:
                    (selectedPreset || numQuestions) && testName && totalMarks ? 1 : 0.5,
                },
              ]}
              onPress={handleContinue}
              disabled={!(selectedPreset || numQuestions) || !testName || !totalMarks}
            >
              <LinearGradient
                colors={["#6366F1", "#8B5CF6"]}
                style={styles.continueButtonGradient}
                start={{ x: 0, y: 0 }}
                end={{ x: 1, y: 1 }}
              >
                <Text style={styles.continueButtonText}>
                  Start Creating Questions
                </Text>
                <Ionicons name="arrow-forward" size={20} color="white" />
              </LinearGradient>
            </TouchableOpacity>

            {/* Bottom Spacing */}
            <View style={styles.bottomSpacer} />
          </ScrollView>
        </SafeAreaView>
      </LinearGradient>
    </View>
  );
}

const styles = StyleSheet.create({
  safeArea: {
    flex: 1,
  },
  fullScreenGradient: {
    flex: 1,
  },
  safeAreaContent: {
    flex: 1,
  },
  headerGradient: {
    paddingHorizontal: 20,
    paddingTop: 16,
    paddingBottom: 24,
  },
  headerContent: {
    flexDirection: "row",
    alignItems: "center",
  },
  backButton: {
    padding: 8,
    marginRight: 12,
    borderRadius: 20,
    backgroundColor: "rgba(255,255,255,0.2)",
  },
  headerTextContainer: {
    flex: 1,
  },
  headerTitle: {
    color: "white",
    fontWeight: "700",
    marginBottom: 4,
  },
  headerSubtitle: {
    color: "rgba(255,255,255,0.8)",
    fontSize: 16,
  },
  container: {
    flex: 1,
  },
  scrollContent: {
    paddingHorizontal: 20,
    paddingTop: 20,
  },
  card: {
    marginBottom: 20,
    borderRadius: 16,
    elevation: 2,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.1,
    shadowRadius: 3,
  },
  summaryCard: {
    borderWidth: 1,
    borderColor: "#6366F1",
  },
  cardContent: {
    padding: 20,
  },
  sectionHeader: {
    flexDirection: "row",
    alignItems: "center",
    marginBottom: 8,
  },
  sectionTitle: {
    fontWeight: "600",
    marginLeft: 12,
  },
  sectionDescription: {
    marginBottom: 20,
    lineHeight: 20,
  },
  inputContainer: {
    marginBottom: 16,
  },
  inputLabel: {
    marginBottom: 8,
    fontWeight: "500",
  },
  textInput: {
    borderWidth: 1,
    borderRadius: 12,
    paddingHorizontal: 16,
    paddingVertical: 12,
    fontSize: 16,
  },
  presetsContainer: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: 12,
    marginBottom: 20,
  },
  presetCard: {
    flex: 1,
    minWidth: "45%",
    padding: 16,
    borderRadius: 12,
    alignItems: "center",
    position: "relative",
  },
  presetIcon: {
    width: 48,
    height: 48,
    borderRadius: 24,
    justifyContent: "center",
    alignItems: "center",
    marginBottom: 12,
  },
  presetTitle: {
    fontWeight: "600",
    marginBottom: 4,
    textAlign: "center",
  },
  presetLabel: {
    fontSize: 12,
    textAlign: "center",
  },
  selectedIndicator: {
    position: "absolute",
    top: 8,
    right: 8,
  },
  customInputSection: {
    marginTop: 8,
  },
  dividerContainer: {
    flexDirection: "row",
    alignItems: "center",
    marginBottom: 20,
  },
  dividerLine: {
    flex: 1,
    height: 1,
  },
  dividerText: {
    marginHorizontal: 16,
    fontSize: 12,
  },
  summaryDetails: {
    gap: 12,
  },
  summaryRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
  },
  summaryValue: {
    fontWeight: "500",
  },
  typeChip: {
    height: 28,
  },
  continueButton: {
    marginTop: 20,
    borderRadius: 16,
    overflow: "hidden",
  },
  continueButtonGradient: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    paddingHorizontal: 24,
    paddingVertical: 16,
    gap: 8,
  },
  continueButtonText: {
    color: "white",
    fontSize: 16,
    fontWeight: "600",
  },
  bottomSpacer: {
    height: 40,
  },
});
