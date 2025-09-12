import React, { useState, useEffect } from "react";
import {
  View,
  StyleSheet,
  ScrollView,
  SafeAreaView,
  StatusBar,
  TouchableOpacity,
  Alert,
} from "react-native";
import {
  Text,
  Card,
  ActivityIndicator,
  Chip,
  Divider,
} from "react-native-paper";
import { useTheme } from "../context/ThemeContext";
import { submissionService } from "../services/api";
import { router, useLocalSearchParams } from "expo-router";
import { Ionicons } from "@expo/vector-icons";
import { LinearGradient } from "expo-linear-gradient";

interface Answer {
  question_number: number;
  selected_option: string | null;
  text_answer: string | null;
  blank_answers: any;
  is_correct: boolean;
  question_text: string;
  correct_option: string;
}

interface SubmissionDetail {
  id: number;
  student_name: string;
  paper_name: string;
  score: number | null | undefined;
  total_questions: number | null | undefined;
  percentage: number | null | undefined;
  evaluation_method: string;
  submitted_at: string;
  answers: Answer[];
}

export default function SubmissionDetailScreen() {
  const [submission, setSubmission] = useState<SubmissionDetail | null>(null);
  const [loading, setLoading] = useState(true);
  const { theme, isDarkMode } = useTheme();
  const params = useLocalSearchParams();

  const {
    submissionId,
    studentName,
    paperName,
    score,
    totalQuestions,
    percentage,
  } = params;

  useEffect(() => {
    fetchSubmissionDetails();
  }, []);

  const fetchSubmissionDetails = async () => {
    try {
      setLoading(true);
      const details = await submissionService.getDetails(submissionId as string);
      setSubmission(details);
    } catch (error: any) {
      console.error("Error fetching submission details:", error);
      Alert.alert("Error", "Failed to load submission details");
    } finally {
      setLoading(false);
    }
  };

  const formatDate = (dateString: string) => {
    const date = new Date(dateString);
    return date.toLocaleDateString("en-US", {
      year: "numeric",
      month: "long",
      day: "numeric",
      hour: "2-digit",
      minute: "2-digit",
    });
  };

  const safePercentage = (value: any): number => {
    if (value === null || value === undefined || value === '') return 0;
    const num = Number(value);
    return isNaN(num) ? 0 : num;
  };

  const getScoreColor = (percentage: number) => {
    if (percentage >= 80) return "#22C55E"; // Green
    if (percentage >= 60) return "#F59E0B"; // Yellow
    return "#EF4444"; // Red
  };

  const getEvaluationMethodIcon = (method: string) => {
    switch (method) {
      case "omr_detection":
        return "scan-outline";
      case "fill_blanks_ai":
        return "create-outline";
      case "gemini_vision":
        return "eye-outline";
      default:
        return "document-text-outline";
    }
  };

  const getEvaluationMethodLabel = (method: string) => {
    switch (method) {
      case "omr_detection":
        return "OMR Detection";
      case "fill_blanks_ai":
        return "AI Fill Blanks";
      case "gemini_vision":
        return "AI Vision";
      default:
        return "Traditional";
    }
  };

  const renderAnswer = (answer: Answer, index: number) => {
    const isCorrect = answer.is_correct;
    const hasTextAnswer = answer.text_answer || answer.blank_answers;
    
    return (
      <Card
        key={answer.question_number}
        style={[
          styles.answerCard,
          {
            backgroundColor: theme.colors.surface,
            borderLeftWidth: 4,
            borderLeftColor: isCorrect ? "#22C55E" : "#EF4444",
          },
        ]}
      >
        <View style={styles.answerCardContent}>
          {/* Question Header */}
          <View style={styles.questionHeader}>
            <View style={styles.questionNumberContainer}>
              <View
                style={[
                  styles.questionNumberBadge,
                  {
                    backgroundColor: isCorrect
                      ? "rgba(34, 197, 94, 0.1)"
                      : "rgba(239, 68, 68, 0.1)",
                  },
                ]}
              >
                <Text
                  variant="labelMedium"
                  style={[
                    styles.questionNumber,
                    { color: isCorrect ? "#22C55E" : "#EF4444" },
                  ]}
                >
                  Q{answer.question_number}
                </Text>
              </View>
              <Ionicons
                name={isCorrect ? "checkmark-circle" : "close-circle"}
                size={20}
                color={isCorrect ? "#22C55E" : "#EF4444"}
                style={styles.statusIcon}
              />
            </View>
          </View>

          {/* Question Text */}
          {answer.question_text && (
            <View style={styles.questionTextContainer}>
              <Text
                variant="bodyMedium"
                style={[
                  styles.questionText,
                  { color: theme.colors.onSurface },
                ]}
              >
                {answer.question_text}
              </Text>
            </View>
          )}

          {/* Answer Details */}
          <View style={styles.answerDetails}>
            {/* Multiple Choice Answer */}
            {answer.selected_option !== null && (
              <View style={styles.answerRow}>
                <Text
                  variant="bodySmall"
                  style={[styles.answerLabel, { color: theme.colors.onSurfaceVariant }]}
                >
                  Student Answer:
                </Text>
                <View
                  style={[
                    styles.optionChip,
                    {
                      backgroundColor: isCorrect
                        ? "rgba(34, 197, 94, 0.1)"
                        : "rgba(239, 68, 68, 0.1)",
                    },
                  ]}
                >
                  <Text
                    variant="labelMedium"
                    style={[
                      styles.optionText,
                      { color: isCorrect ? "#22C55E" : "#EF4444" },
                    ]}
                  >
                    {answer.selected_option || "No Answer"}
                  </Text>
                </View>
              </View>
            )}


            {/* Correct Answer */}
            <View style={styles.answerRow}>
              <Text
                variant="bodySmall"
                style={[styles.answerLabel, { color: theme.colors.onSurfaceVariant }]}
              >
                Correct Answer:
              </Text>
              <View
                style={[
                  styles.correctAnswerChip,
                  { backgroundColor: "rgba(34, 197, 94, 0.1)" },
                ]}
              >
                <Text
                  variant="labelMedium"
                  style={[styles.correctAnswerText, { color: "#22C55E" }]}
                >
                  {answer.correct_option}
                </Text>
              </View>
            </View>
          </View>
        </View>
      </Card>
    );
  };

  if (loading) {
    return (
      <SafeAreaView
        style={[styles.safeArea, { backgroundColor: theme.colors.background }]}
      >
        <StatusBar
          barStyle={isDarkMode ? "light-content" : "dark-content"}
          backgroundColor={theme.colors.background}
        />
        <View style={styles.loadingContainer}>
          <ActivityIndicator size="large" color={theme.colors.primary} />
          <Text
            variant="bodyLarge"
            style={[styles.loadingText, { color: theme.colors.onSurface }]}
          >
            Loading submission details...
          </Text>
        </View>
      </SafeAreaView>
    );
  }

  const submissionData = submission || {
    student_name: studentName as string,
    paper_name: paperName as string,
    score: parseInt(score as string) || 0,
    total_questions: parseInt(totalQuestions as string) || 0,
    percentage: parseFloat(percentage as string) || 0,
    evaluation_method: "traditional",
    submitted_at: new Date().toISOString(),
    answers: [],
  };

  return (
    <SafeAreaView
      style={[styles.safeArea, { backgroundColor: theme.colors.background }]}
    >
      <StatusBar
        barStyle={isDarkMode ? "light-content" : "dark-content"}
        backgroundColor={theme.colors.background}
      />

      {/* Header */}
      <LinearGradient
        colors={isDarkMode ? ["#1F2937", "#111827"] : ["#6366F1", "#8B5CF6"]}
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

          <View style={styles.submissionInfo}>
            <Text variant="headlineMedium" style={styles.studentName}>
              {submissionData.student_name}
            </Text>
            <Text variant="bodyLarge" style={styles.paperName}>
              {submissionData.paper_name}
            </Text>
            
            {submission && (
              <Text variant="bodyMedium" style={styles.submissionTime}>
                Submitted {formatDate(submission.submitted_at)}
              </Text>
            )}
          </View>

          {/* Score Overview */}
          <View style={styles.scoreOverview}>
            <View style={styles.scoreSection}>
              <View
                style={[
                  styles.scoreBadge,
                  {
                    backgroundColor: `${getScoreColor(safePercentage(submissionData.percentage))}20`,
                  },
                ]}
              >
                <Text
                  variant="headlineLarge"
                  style={[
                    styles.scoreNumber,
                    { color: getScoreColor(safePercentage(submissionData.percentage)) }
                  ]}
                >
                  {submissionData.score || 0}/{submissionData.total_questions || 0}
                </Text>
              </View>
              <Text
                variant="titleLarge"
                style={[
                  styles.percentageText,
                  { color: getScoreColor(safePercentage(submissionData.percentage)) }
                ]}
              >
                {safePercentage(submissionData.percentage).toFixed(1)}%
              </Text>
            </View>

            {submission && (
              <Chip
                mode="outlined"
                style={[
                  styles.methodChip,
                  { backgroundColor: "rgba(255,255,255,0.1)" }
                ]}
                textStyle={{ color: "white", fontSize: 12 }}
                icon={() => (
                  <Ionicons
                    name={getEvaluationMethodIcon(submission.evaluation_method) as any}
                    size={14}
                    color="white"
                  />
                )}
              >
                {getEvaluationMethodLabel(submission.evaluation_method)}
              </Chip>
            )}
          </View>
        </View>
      </LinearGradient>

      {/* Answers List */}
      <ScrollView
        style={[styles.container, { backgroundColor: theme.colors.background }]}
        contentContainerStyle={styles.scrollContent}
        showsVerticalScrollIndicator={false}
      >
        {submission?.answers && submission.answers.length > 0 ? (
          <>
            <Text
              variant="titleLarge"
              style={[
                styles.answersHeader,
                { color: theme.colors.onSurface },
              ]}
            >
              Answer Details ({submission.answers.length} Questions)
            </Text>

            {submission.answers
              .sort((a, b) => a.question_number - b.question_number)
              .map((answer, index) => renderAnswer(answer, index))}
          </>
        ) : (
          <View style={styles.noAnswersContainer}>
            <Ionicons
              name="document-outline"
              size={64}
              color={theme.colors.onSurfaceVariant}
              style={{ opacity: 0.5 }}
            />
            <Text
              variant="titleMedium"
              style={[
                styles.noAnswersText,
                { color: theme.colors.onSurface },
              ]}
            >
              No detailed answers available
            </Text>
            <Text
              variant="bodyMedium"
              style={[
                styles.noAnswersSubtext,
                { color: theme.colors.onSurfaceVariant },
              ]}
            >
              This submission doesn't have detailed answer breakdowns
            </Text>
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
    paddingTop: 12,
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
    marginBottom: 20,
  },
  backButton: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: "rgba(255,255,255,0.2)",
    justifyContent: "center",
    alignItems: "center",
  },
  submissionInfo: {
    marginBottom: 24,
  },
  studentName: {
    color: "white",
    fontWeight: "700",
    marginBottom: 4,
  },
  paperName: {
    color: "rgba(255,255,255,0.9)",
    marginBottom: 8,
  },
  submissionTime: {
    color: "rgba(255,255,255,0.7)",
    fontSize: 14,
  },
  scoreOverview: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
  },
  scoreSection: {
    alignItems: "flex-start",
  },
  scoreBadge: {
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderRadius: 12,
    marginBottom: 8,
  },
  scoreNumber: {
    fontWeight: "700",
  },
  percentageText: {
    fontWeight: "600",
  },
  methodChip: {
    height: 32,
  },
  loadingContainer: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
    paddingHorizontal: 20,
  },
  loadingText: {
    marginTop: 16,
    textAlign: "center",
  },
  scrollContent: {
    paddingHorizontal: 16,
    paddingTop: 16,
  },
  answersHeader: {
    fontWeight: "600",
    marginBottom: 16,
  },
  answerCard: {
    marginBottom: 16,
    borderRadius: 12,
    overflow: "hidden",
  },
  answerCardContent: {
    padding: 16,
  },
  questionHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: 12,
  },
  questionNumberContainer: {
    flexDirection: "row",
    alignItems: "center",
  },
  questionNumberBadge: {
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 6,
    marginRight: 8,
  },
  questionNumber: {
    fontSize: 12,
    fontWeight: "600",
  },
  statusIcon: {
    marginLeft: 4,
  },
  questionTextContainer: {
    marginBottom: 16,
    paddingVertical: 8,
    paddingHorizontal: 12,
    backgroundColor: "rgba(0,0,0,0.02)",
    borderRadius: 8,
  },
  questionText: {
    lineHeight: 20,
  },
  answerDetails: {
    gap: 12,
  },
  answerRow: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
  },
  answerLabel: {
    flex: 1,
    fontWeight: "500",
  },
  optionChip: {
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 8,
    minWidth: 60,
    alignItems: "center",
  },
  optionText: {
    fontWeight: "600",
  },
  textAnswerContainer: {
    flex: 2,
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 8,
    borderWidth: 1,
  },
  textAnswer: {
    lineHeight: 18,
  },
  correctAnswerChip: {
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 8,
    alignItems: "center",
  },
  correctAnswerText: {
    fontWeight: "600",
  },
  noAnswersContainer: {
    alignItems: "center",
    paddingVertical: 60,
    paddingHorizontal: 20,
  },
  noAnswersText: {
    marginTop: 16,
    textAlign: "center",
    fontWeight: "600",
  },
  noAnswersSubtext: {
    marginTop: 8,
    textAlign: "center",
    lineHeight: 20,
  },
  bottomSpacer: {
    height: 40,
  },
});