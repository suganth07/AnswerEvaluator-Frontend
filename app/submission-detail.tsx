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
  
  // NEW: Support for weightage-based evaluation
  questionNumber?: number;
  selectedOptions?: any;
  correctOptions?: any;
  partialScore?: number;
  maxPoints?: number;
  details?: string;
  weightageBreakdown?: Array<{ option: string; weight: number }>;
}

interface SubmissionDetail {
  id: number;
  student_name: string;
  roll_no?: string; // Add roll_no field
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
    rollNo,
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
        return " ";
      default:
        return "Traditional";
    }
  };

  // NEW: Helper functions for weightage-based evaluation
  const isWeightageBasedAnswer = (answer: Answer): boolean => {
    return !!(answer.weightageBreakdown && answer.weightageBreakdown.length > 0);
  };

  const isWeightageBasedSubmission = (): boolean => {
    return submission?.answers?.some(answer => isWeightageBasedAnswer(answer)) || false;
  };

  const formatWeightageBreakdown = (breakdown: Array<{ option: string; weight: number }>): string => {
    if (!breakdown || breakdown.length === 0) return '';
    return breakdown.map(item => `${item.option}(${item.weight})`).join(' + ');
  };

  const getAnswerScoreStatus = (answer: Answer): { status: 'perfect' | 'partial' | 'zero' | 'incorrect'; score: number; maxScore: number } => {
    if (isWeightageBasedAnswer(answer)) {
      const score = answer.partialScore || 0;
      const maxScore = answer.maxPoints || 1;
      
      if (score >= maxScore) return { status: 'perfect', score, maxScore };
      if (score > 0) return { status: 'partial', score, maxScore };
      return { status: 'zero', score, maxScore };
    } else {
      // Traditional evaluation
      return {
        status: answer.is_correct ? 'perfect' : 'incorrect',
        score: answer.is_correct ? 1 : 0,
        maxScore: 1
      };
    }
  };

  const renderAnswer = (answer: Answer, index: number) => {
    const isWeightageAnswer = isWeightageBasedAnswer(answer);
    const scoreStatus = getAnswerScoreStatus(answer);
    
    // Determine colors based on score status
    let statusColor: string;
    let statusIcon: string;
    let statusBg: string;
    
    switch (scoreStatus.status) {
      case 'perfect':
        statusColor = '#22C55E'; // Green
        statusIcon = 'checkmark-circle';
        statusBg = 'rgba(34, 197, 94, 0.1)';
        break;
      case 'partial':
        statusColor = '#F59E0B'; // Orange
        statusIcon = 'checkmark-circle-outline';
        statusBg = 'rgba(245, 158, 11, 0.1)';
        break;
      case 'zero':
        statusColor = '#DC2626'; // Red
        statusIcon = 'close-circle';
        statusBg = 'rgba(220, 38, 38, 0.1)';
        break;
      case 'incorrect':
        statusColor = '#EF4444'; // Red  
        statusIcon = 'close-circle';
        statusBg = 'rgba(239, 68, 68, 0.1)';
        break;
    }
    
    return (
      <Card
        key={answer.question_number || answer.questionNumber}
        style={[
          styles.answerCard,
          {
            backgroundColor: theme.colors.surface,
            borderLeftWidth: 4,
            borderLeftColor: statusColor,
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
                  { backgroundColor: statusBg },
                ]}
              >
                <Text
                  variant="labelMedium"
                  style={[
                    styles.questionNumber,
                    { color: statusColor },
                  ]}
                >
                  Q{answer.question_number || answer.questionNumber}
                </Text>
              </View>
              <Ionicons
                name={statusIcon as any}
                size={20}
                color={statusColor}
                style={styles.statusIcon}
              />
              {/* Score Badge for Weightage Questions */}
              {isWeightageAnswer && (
                <View style={[styles.scoreBadge, { backgroundColor: statusBg }]}>
                  <Text
                    variant="labelSmall"
                    style={{ color: statusColor, fontWeight: 'bold' }}
                  >
                    {scoreStatus.score}/{scoreStatus.maxScore}
                  </Text>
                </View>
              )}
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
            {/* Student Answer - Multiple Choice */}
            {(answer.selected_option !== null || answer.selectedOptions) && (
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
                    { backgroundColor: statusBg },
                  ]}
                >
                  <Text
                    variant="labelMedium"
                    style={[
                      styles.optionText,
                      { color: statusColor },
                    ]}
                  >
                    {answer.selectedOptions 
                      ? (Array.isArray(answer.selectedOptions) 
                          ? answer.selectedOptions.join(', ')
                          : answer.selectedOptions)
                      : answer.selected_option || "No Answer"
                    }
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
                  {answer.correctOptions 
                    ? (Array.isArray(answer.correctOptions) 
                        ? answer.correctOptions.join(', ')
                        : answer.correctOptions)
                    : answer.correct_option
                  }
                </Text>
              </View>
            </View>

            {/* Weightage Information */}
            {isWeightageAnswer && answer.weightageBreakdown && (
              <View style={styles.weightageSection}>
                <Text
                  variant="bodySmall"
                  style={[styles.answerLabel, { color: theme.colors.onSurfaceVariant }]}
                >
                  Weightage Breakdown:
                </Text>
                <View style={styles.weightageContainer}>
                  <Text
                    variant="labelMedium"
                    style={[styles.weightageText, { color: '#1976d2' }]}
                  >
                    {formatWeightageBreakdown(answer.weightageBreakdown)}
                  </Text>
                </View>
              </View>
            )}

            {/* Detailed Explanation */}
            {answer.details && (
              <View style={styles.explanationSection}>
                <Text
                  variant="bodySmall"
                  style={[styles.answerLabel, { color: theme.colors.onSurfaceVariant }]}
                >
                  Explanation:
                </Text>
                <Text
                  variant="bodySmall"
                  style={[
                    styles.explanationText,
                    { 
                      color: answer.details.includes('Wrong option') ? '#DC2626' : theme.colors.onSurface,
                      fontStyle: 'italic'
                    }
                  ]}
                >
                  {answer.details}
                </Text>
              </View>
            )}

            {/* Special Alert for Zero Marks due to Wrong Options */}
            {scoreStatus.status === 'zero' && answer.details?.includes('Wrong option') && (
              <View style={styles.zeroMarksAlert}>
                <Ionicons name="warning" size={16} color="#DC2626" />
                <Text
                  variant="bodySmall"
                  style={{ color: '#DC2626', marginLeft: 6, fontWeight: 'bold' }}
                >
                  Zero marks: Wrong option selected (No partial credit in weightage-based evaluation)
                </Text>
              </View>
            )}
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
    student_name: 'File Submission',
    roll_no: rollNo as string || 'Unknown',
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
              Roll: {submissionData.roll_no || params.rollNo || 'Unknown'}
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
              {isWeightageBasedSubmission() && (
                <Text style={{ color: '#2196f3', fontSize: 14 }}> • Weightage-Based</Text>
              )}
            </Text>

            {/* Weightage-based evaluation info */}
            {isWeightageBasedSubmission() && (
              <View style={styles.weightageInfoBanner}>
                <Ionicons name="information-circle" size={16} color="#2196f3" />
                <Text style={styles.weightageInfoText}>
                  This test uses weightage-based scoring. Wrong options result in zero marks.
                </Text>
              </View>
            )}

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
  
  // NEW: Styles for weightage-based evaluation
  weightageSection: {
    marginTop: 8,
    marginBottom: 8,
  },
  weightageContainer: {
    backgroundColor: '#e3f2fd',
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 8,
    marginTop: 4,
  },
  weightageText: {
    fontFamily: 'monospace',
    fontSize: 12,
    fontWeight: 'bold',
  },
  explanationSection: {
    marginTop: 12,
    paddingTop: 8,
    borderTopWidth: 1,
    borderTopColor: 'rgba(0,0,0,0.1)',
  },
  explanationText: {
    marginTop: 4,
    lineHeight: 18,
  },
  zeroMarksAlert: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: 'rgba(220, 38, 38, 0.1)',
    padding: 8,
    borderRadius: 6,
    marginTop: 8,
    borderLeftWidth: 3,
    borderLeftColor: '#DC2626',
  },
  weightageInfoBanner: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: 'rgba(33, 150, 243, 0.1)',
    padding: 12,
    borderRadius: 8,
    marginVertical: 12,
    borderLeftWidth: 3,
    borderLeftColor: '#2196f3',
  },
  weightageInfoText: {
    marginLeft: 8,
    color: '#1976d2',
    fontSize: 13,
    fontStyle: 'italic',
  },
});