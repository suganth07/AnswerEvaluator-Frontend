import React, { useState, useEffect } from "react";
import {
  View,
  StyleSheet,
  ScrollView,
  Alert,
  RefreshControl,
  StatusBar,
  TouchableOpacity,
  Dimensions,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import {
  Text,
  Card,
  IconButton,
  Chip,
  Badge,
  Button,
  FAB,
  Surface,
  Appbar,
  ActivityIndicator,
} from "react-native-paper";
import { useTheme } from "../context/ThemeContext";
import { questionService } from "../services/api";
import { router, useLocalSearchParams } from "expo-router";
import { Ionicons } from "@expo/vector-icons";
import { LinearGradient } from "expo-linear-gradient";

const { width } = Dimensions.get("window");

interface Question {
  id: number;
  paper_id: number;
  question_number: number;
  question_text: string;
  question_format: string;
  correct_option: string;
  correct_options?: string[]; // Support for multiple correct answers
  page_number: number;
  question_type: string;
  options: any;
}

interface QuestionsData {
  paper: {
    id: number;
    name: string;
  };
  questions: Question[];
  totalQuestions: number;
}

export default function QuestionsScreen() {
  const [questionsData, setQuestionsData] = useState<QuestionsData | null>(
    null
  );
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const { theme, isDarkMode } = useTheme();
  const params = useLocalSearchParams();
  const paperId = params.paperId as string;
  const paperName = params.paperName as string;

  useEffect(() => {
    if (paperId) {
      fetchQuestions();
    }
  }, [paperId]);

  const fetchQuestions = async () => {
    try {
      setLoading(true);
      const data = await questionService.getQuestionsByPaper(paperId);
      setQuestionsData(data);
    } catch (error: any) {
      Alert.alert(
        "Error",
        error.response?.data?.error || "Failed to fetch questions"
      );
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  const onRefresh = () => {
    setRefreshing(true);
    fetchQuestions();
  };

  const handleAddQuestion = () => {
    router.push({
      pathname: "/question-editor",
      params: {
        mode: "add",
        paperId: paperId,
        paperName: paperName,
      },
    });
  };

  const handleEditQuestion = (question: Question) => {
    router.push({
      pathname: "/question-editor",
      params: {
        mode: "edit",
        questionId: question.id.toString(),
        paperId: paperId,
        paperName: paperName,
        questionData: JSON.stringify(question),
      },
    });
  };

  const handleDeleteQuestion = (question: Question) => {
    Alert.alert(
      "Delete Question",
      `Are you sure you want to delete Question ${question.question_number}?`,
      [
        { text: "Cancel", style: "cancel" },
        {
          text: "Delete",
          style: "destructive",
          onPress: async () => {
            try {
              await questionService.deleteQuestion(question.id.toString());
              Alert.alert("Success", "Question deleted successfully");
              fetchQuestions(); // Refresh the list
            } catch (error: any) {
              Alert.alert(
                "Error",
                error.response?.data?.error || "Failed to delete question"
              );
            }
          },
        },
      ]
    );
  };

  const getQuestionTypeInfo = (questionType: string) => {
    switch (questionType) {
      case "omr":
        return {
          label: "OMR",
          color: "#6366F1",
          backgroundColor: "rgba(99, 102, 241, 0.1)",
          icon: "radio-button-on",
        };
      case "traditional":
        return {
          label: "Traditional",
          color: "#8B5CF6",
          backgroundColor: "rgba(139, 92, 246, 0.1)",
          icon: "text-box",
        };
      case "mixed":
        return {
          label: "Mixed",
          color: "#10B981",
          backgroundColor: "rgba(16, 185, 129, 0.1)",
          icon: "layers",
        };
      case "fill_blanks":
        return {
          label: "Fill Blanks",
          color: "#F59E0B",
          backgroundColor: "rgba(245, 158, 11, 0.1)",
          icon: "pencil",
        };
      default:
        return {
          label: "Traditional",
          color: "#8B5CF6",
          backgroundColor: "rgba(139, 92, 246, 0.1)",
          icon: "text-box",
        };
    }
  };

  const formatDate = (dateString: string) => {
    const now = new Date();
    const date = new Date(dateString);
    const diffInHours = Math.floor(
      (now.getTime() - date.getTime()) / (1000 * 60 * 60)
    );

    if (diffInHours < 1) return "Just now";
    if (diffInHours < 24) return `${diffInHours}h ago`;
    if (diffInHours < 48) return "Yesterday";
    return date.toLocaleDateString("en-US", { month: "short", day: "numeric" });
  };

  // Quick Action Card Component
  const QuickActionCard = () => (
    <TouchableOpacity onPress={handleAddQuestion}>
      <LinearGradient
        colors={isDarkMode ? ["#6366F1", "#8B5CF6"] : ["#6366F1", "#8B5CF6"]}
        style={styles.quickActionCard}
        start={{ x: 0, y: 0 }}
        end={{ x: 1, y: 1 }}
      >
        <View style={styles.quickActionContent}>
          <View style={styles.quickActionTextContainer}>
            <Text variant="headlineSmall" style={styles.quickActionTitle}>
              Add New Question
            </Text>
            <Text variant="bodyMedium" style={styles.quickActionSubtitle}>
              Create questions for your test paper quickly and efficiently
            </Text>
          </View>
          <View style={styles.quickActionIconContainer}>
            <LinearGradient
              colors={["rgba(255,255,255,0.2)", "rgba(255,255,255,0.1)"]}
              style={styles.quickActionIcon}
            >
              <Ionicons name="add" size={24} color="white" />
            </LinearGradient>
          </View>
        </View>
        <TouchableOpacity
          style={styles.actionButton}
          onPress={handleAddQuestion}
        >
          <Text style={styles.actionButtonText}>Add Question</Text>
          <Ionicons name="arrow-forward" size={16} color="#6366F1" />
        </TouchableOpacity>
      </LinearGradient>
    </TouchableOpacity>
  );

  // Stats Card Component
  const StatsCard = () => (
    <View style={styles.statsContainer}>
      <View
        style={[styles.statCard, { backgroundColor: theme.colors.surface }]}
      >
        <Text
          variant="headlineMedium"
          style={[styles.statNumber, { color: theme.colors.onSurface }]}
        >
          {questionsData?.totalQuestions || 0}
        </Text>
        <Text
          variant="bodySmall"
          style={[styles.statLabel, { color: theme.colors.onSurfaceVariant }]}
        >
          Total Questions
        </Text>
      </View>
      <View
        style={[styles.statCard, { backgroundColor: theme.colors.surface }]}
      >
        <Text
          variant="headlineMedium"
          style={[styles.statNumber, { color: theme.colors.onSurface }]}
        >
          {questionsData?.questions?.filter((q) => q.options).length || 0}
        </Text>
        <Text
          variant="bodySmall"
          style={[styles.statLabel, { color: theme.colors.onSurfaceVariant }]}
        >
          With Options
        </Text>
      </View>
    </View>
  );

  const renderQuestion = (question: Question, index: number) => {
    const typeInfo = getQuestionTypeInfo(question.question_type);

    return (
      <View
        key={question.id}
        style={[styles.questionCard, { backgroundColor: theme.colors.surface }]}
      >
        <View style={styles.questionHeader}>
          <View style={styles.questionNumberBadge}>
            <LinearGradient
              colors={["#6366F1", "#8B5CF6"]}
              style={styles.numberGradient}
            >
              <Text style={styles.questionNumberText}>
                {question.question_number}
              </Text>
            </LinearGradient>
          </View>

          <View style={styles.questionMeta}>
            <View style={styles.questionMetaTop}>
              <View
                style={[
                  styles.typeChip,
                  {
                    backgroundColor: typeInfo.backgroundColor,
                  },
                ]}
              >
                <Ionicons
                  name={typeInfo.icon as any}
                  size={14}
                  color={typeInfo.color}
                  style={styles.typeIcon}
                />
                <Text style={[styles.typeLabel, { color: typeInfo.color }]}>
                  {typeInfo.label}
                </Text>
              </View>
              <Text
                variant="bodySmall"
                style={[
                  styles.pageNumber,
                  { color: theme.colors.onSurfaceVariant },
                ]}
              >
                Page {question.page_number}
              </Text>
            </View>
          </View>

          <View style={styles.questionActions}>
            <TouchableOpacity
              style={[
                styles.actionIcon,
                { backgroundColor: "rgba(99, 102, 241, 0.1)" },
              ]}
              onPress={() => handleEditQuestion(question)}
            >
              <Ionicons name="pencil" size={16} color="#6366F1" />
            </TouchableOpacity>
            <TouchableOpacity
              style={[
                styles.actionIcon,
                { backgroundColor: "rgba(239, 68, 68, 0.1)" },
              ]}
              onPress={() => handleDeleteQuestion(question)}
            >
              <Ionicons name="trash" size={16} color="#EF4444" />
            </TouchableOpacity>
          </View>
        </View>

        {question.question_text && (
          <View style={styles.questionTextContainer}>
            <Text
              variant="bodyLarge"
              style={[styles.questionText, { color: theme.colors.onSurface }]}
            >
              {question.question_text}
            </Text>
          </View>
        )}

        <View style={styles.answerSection}>
          <View style={styles.answerHeader}>
            <Text
              variant="bodySmall"
              style={[
                styles.answerLabel,
                { color: theme.colors.onSurfaceVariant },
              ]}
            >
              Correct Answer:
            </Text>
          </View>
          <View style={styles.answerContainer}>
            {(() => {
              // Handle both single and multiple correct answers
              let correctAnswers: string[] = [];

              // For multiple choice questions, prioritize correct_options
              if (question.question_format === "multiple_choice") {
                if (
                  question.correct_options &&
                  Array.isArray(question.correct_options) &&
                  question.correct_options.length > 0
                ) {
                  correctAnswers = question.correct_options;
                } else if (question.correct_option) {
                  // Fallback: split comma-separated values or use single value
                  correctAnswers = question.correct_option.includes(",")
                    ? question.correct_option
                        .split(",")
                        .map((opt) => opt.trim())
                    : [question.correct_option];
                }
              } else {
                // For non-multiple choice (text) questions, always use correct_option
                if (question.correct_option && question.correct_option.trim()) {
                  correctAnswers = [question.correct_option.trim()];
                }
              }

              if (correctAnswers.length === 0) {
                return (
                  <View
                    style={[
                      styles.answerChip,
                      { backgroundColor: "rgba(239, 68, 68, 0.1)" },
                    ]}
                  >
                    <Text style={[styles.answerText, { color: "#EF4444" }]}>
                      Not set
                    </Text>
                  </View>
                );
              }

              return correctAnswers.map(
                (answer: string, answerIndex: number) => (
                  <View
                    key={answerIndex}
                    style={[
                      styles.answerChip,
                      {
                        backgroundColor: "rgba(16, 185, 129, 0.1)",
                        marginRight: correctAnswers.length > 1 ? 8 : 0,
                      },
                    ]}
                  >
                    <Text style={[styles.answerText, { color: "#10B981" }]}>
                      {question.question_format === "multiple_choice"
                        ? answer.toUpperCase()
                        : answer}
                    </Text>
                  </View>
                )
              );
            })()}
          </View>
        </View>

        {question.options && typeof question.options === "object" && (
          <View style={styles.optionsSection}>
            <Text
              variant="bodySmall"
              style={[
                styles.optionsLabel,
                { color: theme.colors.onSurfaceVariant },
              ]}
            >
              Options:
            </Text>
            <View style={styles.optionsList}>
              {(() => {
                const options = question.options;

                // Handle different option formats
                if (Array.isArray(options)) {
                  return options.map((option: string, optionIndex: number) => {
                    const optionKey = String.fromCharCode(65 + optionIndex); // A, B, C, etc.
                    return (
                      <View
                        key={optionIndex}
                        style={[
                          styles.optionChip,
                          {
                            backgroundColor: isDarkMode ? "#374151" : "#F3F4F6",
                          },
                        ]}
                      >
                        <Text
                          style={[
                            styles.optionKey,
                            { color: theme.colors.primary },
                          ]}
                        >
                          {optionKey}:
                        </Text>
                        <Text
                          style={[
                            styles.optionText,
                            { color: theme.colors.onSurfaceVariant },
                          ]}
                          numberOfLines={2}
                        >
                          {option}
                        </Text>
                      </View>
                    );
                  });
                }

                // Handle object format
                return Object.entries(options)
                  .filter(
                    ([key, value]) =>
                      value && typeof value === "string" && value.trim()
                  )
                  .map(([key, value]) => (
                    <View
                      key={key}
                      style={[
                        styles.optionChip,
                        { backgroundColor: isDarkMode ? "#374151" : "#F3F4F6" },
                      ]}
                    >
                      <Text
                        style={[
                          styles.optionKey,
                          { color: theme.colors.primary },
                        ]}
                      >
                        {key.toUpperCase()}:
                      </Text>
                      <Text
                        style={[
                          styles.optionText,
                          { color: theme.colors.onSurfaceVariant },
                        ]}
                        numberOfLines={2}
                      >
                        {value as string}
                      </Text>
                    </View>
                  ));
              })()}
            </View>
          </View>
        )}
      </View>
    );
  };

  if (loading) {
    return (
      <SafeAreaView
        style={[styles.safeArea, { backgroundColor: "#6366F1" }]}
        edges={["top", "left", "right"]}
      >
        <StatusBar barStyle="light-content" backgroundColor="#6366F1" />

        {/* Header */}
        <LinearGradient
          colors={["#6366F1", "#8B5CF6"]}
          style={styles.headerGradient}
        >
          <View style={styles.headerContent}>
            <View style={styles.headerTop}>
              <TouchableOpacity
                style={styles.backButton}
                onPress={() => router.back()}
              >
                <Ionicons name="arrow-back" size={24} color="white" />
              </TouchableOpacity>
            </View>
            <View style={styles.headerInfo}>
              <Text style={styles.headerTitle}>Questions</Text>
              <Text style={styles.headerSubtitle}>Loading questions...</Text>
            </View>
          </View>
        </LinearGradient>

        <View
          style={[
            styles.loadingContainer,
            { backgroundColor: theme.colors.background },
          ]}
        >
          <ActivityIndicator size="large" color="#6366F1" />
          <Text
            variant="bodyLarge"
            style={[
              styles.loadingText,
              { color: theme.colors.onSurfaceVariant },
            ]}
          >
            Loading questions...
          </Text>
        </View>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView
      style={[styles.safeArea, { backgroundColor: "#6366F1" }]}
      edges={["top", "left", "right"]}
    >
      <StatusBar barStyle="light-content" backgroundColor="#6366F1" />

      {/* Enhanced Header with Gradient */}
      <LinearGradient
        colors={["#6366F1", "#8B5CF6"]}
        style={styles.headerGradient}
      >
        <View style={styles.headerContent}>
          <View style={styles.headerTop}>
            <TouchableOpacity
              style={styles.backButton}
              onPress={() => router.back()}
            >
              <Ionicons name="arrow-back" size={24} color="white" />
            </TouchableOpacity>
            <TouchableOpacity
              style={styles.addButton}
              onPress={handleAddQuestion}
            >
              <Ionicons name="add" size={24} color="white" />
            </TouchableOpacity>
          </View>
          <View style={styles.headerInfo}>
            <Text style={styles.headerTitle}>Questions</Text>
            <Text style={styles.headerSubtitle}>{paperName}</Text>
          </View>
        </View>
      </LinearGradient>

      <ScrollView
        style={[styles.container, { backgroundColor: theme.colors.background }]}
        contentContainerStyle={styles.scrollContent}
        showsVerticalScrollIndicator={false}
        refreshControl={
          <RefreshControl
            refreshing={refreshing}
            onRefresh={onRefresh}
            colors={["#6366F1"]}
            tintColor="#6366F1"
            progressViewOffset={20}
          />
        }
      >
        {/* Quick Action Card */}
        <View style={styles.section}>
          <QuickActionCard />
        </View>

        {/* Stats */}
        <View style={styles.section}>
          <StatsCard />
        </View>

        {/* Questions List */}
        {questionsData?.questions && questionsData.questions.length > 0 ? (
          <View style={styles.section}>
            <View style={styles.sectionHeader}>
              <Text
                variant="headlineSmall"
                style={[styles.sectionTitle, { color: theme.colors.onSurface }]}
              >
                All Questions
              </Text>
              <TouchableOpacity>
                <Ionicons
                  name="funnel-outline"
                  size={20}
                  color={theme.colors.onSurfaceVariant}
                />
              </TouchableOpacity>
            </View>

            <View style={styles.questionsContainer}>
              {questionsData.questions.map((question, index) =>
                renderQuestion(question, index)
              )}
            </View>
          </View>
        ) : (
          <View style={styles.section}>
            <View
              style={[
                styles.emptyCard,
                { backgroundColor: theme.colors.surface },
              ]}
            >
              <View style={styles.emptyContainer}>
                <LinearGradient
                  colors={[
                    "rgba(99, 102, 241, 0.1)",
                    "rgba(139, 92, 246, 0.1)",
                  ]}
                  style={styles.emptyIconContainer}
                >
                  <Ionicons
                    name="help-circle-outline"
                    size={64}
                    color="#6366F1"
                  />
                </LinearGradient>
                <Text
                  variant="headlineSmall"
                  style={[styles.emptyTitle, { color: theme.colors.onSurface }]}
                >
                  No Questions Yet
                </Text>
                <Text
                  variant="bodyLarge"
                  style={[
                    styles.emptyText,
                    { color: theme.colors.onSurfaceVariant },
                  ]}
                >
                  Create your first question to get started with this test paper
                </Text>
                <LinearGradient
                  colors={["#6366F1", "#8B5CF6"]}
                  style={styles.emptyButtonGradient}
                >
                  <TouchableOpacity
                    style={styles.emptyButton}
                    onPress={handleAddQuestion}
                  >
                    <Ionicons name="add" size={20} color="white" />
                    <Text style={styles.emptyButtonText}>
                      Add First Question
                    </Text>
                  </TouchableOpacity>
                </LinearGradient>
              </View>
            </View>
          </View>
        )}

        {/* Bottom Spacing */}
        <View style={styles.bottomSpacer} />
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
  headerGradient: {
    paddingTop: 20,
    paddingBottom: 24,
    paddingHorizontal: 20,
  },
  headerContent: {
    flex: 1,
  },
  headerTop: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: 16,
  },
  backButton: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: "rgba(255,255,255,0.2)",
    justifyContent: "center",
    alignItems: "center",
  },
  addButton: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: "rgba(255,255,255,0.2)",
    justifyContent: "center",
    alignItems: "center",
  },
  headerInfo: {
    alignItems: "flex-start",
  },
  headerTitle: {
    color: "white",
    fontSize: 28,
    fontWeight: "700",
    marginBottom: 4,
  },
  headerSubtitle: {
    color: "rgba(255,255,255,0.8)",
    fontSize: 16,
  },
  scrollContent: {
    paddingBottom: 100,
  },
  section: {
    paddingHorizontal: 20,
    marginBottom: 24,
  },
  sectionHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: 16,
  },
  sectionTitle: {
    fontWeight: "600",
  },
  quickActionCard: {
    borderRadius: 16,
    padding: 20,
    marginTop: 8,
  },
  quickActionContent: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "flex-start",
    marginBottom: 20,
  },
  quickActionTextContainer: {
    flex: 1,
    paddingRight: 16,
  },
  quickActionTitle: {
    color: "white",
    fontWeight: "700",
    marginBottom: 8,
  },
  quickActionSubtitle: {
    color: "rgba(255,255,255,0.9)",
    lineHeight: 20,
  },
  quickActionIconContainer: {
    alignItems: "center",
  },
  quickActionIcon: {
    width: 48,
    height: 48,
    borderRadius: 24,
    justifyContent: "center",
    alignItems: "center",
  },
  actionButton: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: "white",
    paddingHorizontal: 20,
    paddingVertical: 12,
    borderRadius: 25,
    alignSelf: "flex-start",
  },
  actionButtonText: {
    color: "#6366F1",
    fontWeight: "600",
    marginRight: 8,
  },
  statsContainer: {
    flexDirection: "row",
    justifyContent: "space-between",
    gap: 12,
  },
  statCard: {
    flex: 1,
    padding: 16,
    borderRadius: 12,
    alignItems: "center",
  },
  statNumber: {
    fontWeight: "700",
    marginBottom: 4,
  },
  statLabel: {
    fontSize: 12,
    textAlign: "center",
  },
  questionsContainer: {
    gap: 16,
  },
  questionCard: {
    borderRadius: 16,
    padding: 20,
    shadowColor: "#000",
    shadowOffset: {
      width: 0,
      height: 2,
    },
    shadowOpacity: 0.1,
    shadowRadius: 8,
    elevation: 3,
  },
  questionHeader: {
    flexDirection: "row",
    alignItems: "flex-start",
    marginBottom: 16,
    gap: 12,
  },
  questionNumberBadge: {
    shadowColor: "#000",
    shadowOffset: {
      width: 0,
      height: 2,
    },
    shadowOpacity: 0.2,
    shadowRadius: 4,
    elevation: 4,
  },
  numberGradient: {
    width: 40,
    height: 40,
    borderRadius: 20,
    justifyContent: "center",
    alignItems: "center",
  },
  questionNumberText: {
    color: "white",
    fontSize: 18,
    fontWeight: "700",
  },
  questionMeta: {
    flex: 1,
  },
  questionMetaTop: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
  },
  typeChip: {
    flexDirection: "row",
    alignItems: "center",
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 16,
    alignSelf: "flex-start",
  },
  typeIcon: {
    marginRight: 6,
  },
  typeLabel: {
    fontSize: 12,
    fontWeight: "600",
  },
  pageNumber: {
    fontSize: 12,
    fontWeight: "500",
  },
  questionActions: {
    flexDirection: "row",
    gap: 8,
  },
  actionIcon: {
    width: 32,
    height: 32,
    borderRadius: 16,
    justifyContent: "center",
    alignItems: "center",
  },
  questionTextContainer: {
    marginBottom: 16,
    padding: 16,
    backgroundColor: "rgba(0,0,0,0.02)",
    borderRadius: 12,
    borderLeftWidth: 3,
    borderLeftColor: "#6366F1",
  },
  questionText: {
    lineHeight: 24,
    fontWeight: "400",
  },
  answerSection: {
    marginBottom: 16,
  },
  answerHeader: {
    marginBottom: 8,
  },
  answerLabel: {
    fontWeight: "500",
    fontSize: 12,
    textTransform: "uppercase",
    letterSpacing: 0.5,
  },
  answerContainer: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: 8,
  },
  answerChip: {
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 16,
    alignSelf: "flex-start",
  },
  answerText: {
    fontSize: 14,
    fontWeight: "600",
  },
  optionsSection: {
    gap: 8,
  },
  optionsLabel: {
    fontWeight: "500",
    fontSize: 12,
    textTransform: "uppercase",
    letterSpacing: 0.5,
  },
  optionsList: {
    gap: 8,
  },
  optionChip: {
    flexDirection: "row",
    alignItems: "center",
    padding: 12,
    borderRadius: 12,
    gap: 8,
  },
  optionKey: {
    fontSize: 14,
    fontWeight: "700",
    minWidth: 24,
  },
  optionText: {
    fontSize: 14,
    flex: 1,
    lineHeight: 20,
  },
  emptyCard: {
    borderRadius: 16,
    padding: 40,
    alignItems: "center",
  },
  emptyContainer: {
    alignItems: "center",
  },
  emptyIconContainer: {
    width: 120,
    height: 120,
    borderRadius: 60,
    justifyContent: "center",
    alignItems: "center",
    marginBottom: 24,
  },
  emptyTitle: {
    textAlign: "center",
    marginBottom: 8,
    fontWeight: "600",
  },
  emptyText: {
    textAlign: "center",
    marginBottom: 32,
    lineHeight: 24,
  },
  emptyButtonGradient: {
    borderRadius: 25,
    overflow: "hidden",
  },
  emptyButton: {
    flexDirection: "row",
    alignItems: "center",
    paddingHorizontal: 24,
    paddingVertical: 12,
    gap: 8,
  },
  emptyButtonText: {
    color: "white",
    fontSize: 16,
    fontWeight: "600",
  },
  loadingContainer: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
  },
  loadingText: {
    marginTop: 16,
  },
  bottomSpacer: {
    height: 100,
  },
});
