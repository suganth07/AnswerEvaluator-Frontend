import React, { useState, useEffect } from "react";
import {
  View,
  StyleSheet,
  ScrollView,
  RefreshControl,
  TouchableOpacity,
  Dimensions,
  Alert,
  FlatList,
  Linking,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { Text, Card, Avatar, Chip, ActivityIndicator } from "react-native-paper";
import { useTheme } from "../context/ThemeContext";
import { paperService, submissionService } from "../services/api";
import { router, useLocalSearchParams } from "expo-router";
import { Ionicons, MaterialCommunityIcons } from "@expo/vector-icons";
import { LinearGradient } from "expo-linear-gradient";
import { PieChart } from "react-native-chart-kit";

const { width } = Dimensions.get("window");

interface Paper {
  id: number;
  name: string;
  uploaded_at: string;
  question_count: number;
  question_type: string;
}

interface Submission {
  id: number;
  paper_id: number;
  student_name: string;
  roll_no: string; // Add roll_no field
  score: number | null | undefined;
  total_questions: number | null | undefined;
  percentage: number | null | undefined;
  evaluation_method: string;
  submitted_at: string;
}

export default function TestSubmissionsScreen() {
  const params = useLocalSearchParams();
  const paperId = params.paperId as string;
  const paperName = params.paperName as string;
  
  const [paper, setPaper] = useState<Paper | null>(null);
  const [submissions, setSubmissions] = useState<Submission[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const { theme, isDarkMode } = useTheme();

  useEffect(() => {
    if (paperId) {
      fetchTestSubmissions();
    }
  }, [paperId]);

  const fetchTestSubmissions = async () => {
    try {
      setLoading(true);
      
      // Fetch paper details
      const paperData = await paperService.getDetails(paperId);
      setPaper(paperData);
      
      // Fetch submissions for this specific test
      const submissionsData = await submissionService.getByPaperId(parseInt(paperId));
      setSubmissions(submissionsData || []);
      
    } catch (error: any) {
      console.error("Error fetching test submissions:", error);
      Alert.alert("Error", "Failed to load test submissions");
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  const onRefresh = () => {
    setRefreshing(true);
    fetchTestSubmissions();
  };

  const exportToExcel = async () => {
    try {
      if (!paperId || !paper) {
        Alert.alert("Error", "Paper information not available");
        return;
      }

      // Show loading alert
      Alert.alert("Exporting", "Generating Excel file...");

      const url = process.env.EXPO_PUBLIC_API_URL;
      const downloadUrl = `${url}/submissions/export-excel/${paperId}`;

      // For web/mobile, we can open the download URL directly
      const supported = await Linking.canOpenURL(downloadUrl);
      if (supported) {
        await Linking.openURL(downloadUrl);
        Alert.alert("Success", "Excel file download started! Check your downloads folder.");
      } else {
        Alert.alert("Error", "Cannot open download link");
      }
    } catch (error: any) {
      console.error("Error exporting to Excel:", error);
      Alert.alert("Error", "Failed to export submissions to Excel");
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

  const safePercentage = (value: any): number => {
    if (value === null || value === undefined || value === '') return 0;
    const num = Number(value);
    return isNaN(num) ? 0 : num;
  };

  // Calculate score distribution for pie chart
  const calculateScoreDistribution = () => {
    if (submissions.length === 0) {
      return [
        { name: "No Data", population: 100, color: "#E5E7EB", legendFontColor: isDarkMode ? "#E5E7EB" : "#374151", legendFontSize: 12 }
      ];
    }

    let excellent = 0;  // 90-100%
    let good = 0;       // 70-89%
    let average = 0;    // 50-69%
    let poor = 0;       // 0-49%

    submissions.forEach(submission => {
      const percentage = safePercentage(submission.percentage);
      if (percentage >= 90) {
        excellent++;
      } else if (percentage >= 70) {
        good++;
      } else if (percentage >= 50) {
        average++;
      } else {
        poor++;
      }
    });

    const total = submissions.length;
    const data = [];

    if (excellent > 0) {
      data.push({
        name: `Excellent (${excellent})`,
        population: Math.round((excellent / total) * 100),
        color: "#22C55E", // Green
        legendFontColor: isDarkMode ? "#E5E7EB" : "#374151",
        legendFontSize: 12
      });
    }

    if (good > 0) {
      data.push({
        name: `Good (${good})`,
        population: Math.round((good / total) * 100),
        color: "#3B82F6", // Blue
        legendFontColor: isDarkMode ? "#E5E7EB" : "#374151",
        legendFontSize: 12
      });
    }

    if (average > 0) {
      data.push({
        name: `Average (${average})`,
        population: Math.round((average / total) * 100),
        color: "#F59E0B", // Yellow/Orange
        legendFontColor: isDarkMode ? "#E5E7EB" : "#374151",
        legendFontSize: 12
      });
    }

    if (poor > 0) {
      data.push({
        name: `Poor (${poor})`,
        population: Math.round((poor / total) * 100),
        color: "#EF4444", // Red
        legendFontColor: isDarkMode ? "#E5E7EB" : "#374151",
        legendFontSize: 12
      });
    }

    return data.length > 0 ? data : [
      { name: "No Data", population: 100, color: "#E5E7EB", legendFontColor: isDarkMode ? "#E5E7EB" : "#374151", legendFontSize: 12 }
    ];
  };

  const getScoreColor = (percentage: number) => {
    if (percentage >= 90) return "#22C55E"; // Green - Excellent
    if (percentage >= 70) return "#3B82F6"; // Blue - Good
    if (percentage >= 50) return "#F59E0B"; // Orange - Average
    return "#EF4444"; // Red - Poor
  };

  const getScoreLabel = (percentage: number) => {
    if (percentage >= 90) return "Excellent";
    if (percentage >= 70) return "Good";
    if (percentage >= 50) return "Average";
    return "Poor";
  };

  const getEvaluationMethodIcon = (method: string) => {
    switch (method) {
      case "omr_detection":
        return "scan-outline";
      case "fill_blanks_ai":
        return "create-outline";
      case "gemini_vision":
        return "eye-outline";
      case "manual_test":
        return "calculator-outline"; // Weightage-based evaluation
      default:
        return "document-text-outline";
    }
  };

  const getEvaluationMethodLabel = (method: string) => {
    switch (method) {
      case "omr_detection":
        return "OMR";
      case "fill_blanks_ai":
        return "Fill Blanks";
      case "gemini_vision":
        return "AI Vision";
      case "manual_test":
        return "Weightage"; // Clear indicator for weightage-based tests
      default:
        return "Traditional";
    }
  };

  // NEW: Helper to detect if this is a weightage-based test
  const isWeightageBasedTest = (): boolean => {
    return submissions.some(sub => sub.evaluation_method === "manual_test");
  };

  // NEW: Get evaluation method color for better distinction
  const getEvaluationMethodColor = (method: string): string => {
    switch (method) {
      case "manual_test":
        return "#2196F3"; // Blue for weightage-based
      case "omr_detection":
        return "#4CAF50"; // Green for OMR
      case "fill_blanks_ai":
        return "#FF9800"; // Orange for AI
      case "gemini_vision":
        return "#9C27B0"; // Purple for Vision AI
      default:
        return "#757575"; // Gray for traditional
    }
  };

  const handleSubmissionPress = (submission: Submission) => {
    router.push({
      pathname: "/submission-detail",
      params: {
        submissionId: submission.id,
        rollNo: submission.roll_no || 'unknown',
        paperName: paper?.name || paperName,
        score: submission.score || 0,
        totalQuestions: submission.total_questions || 0,
        percentage: safePercentage(submission.percentage).toFixed(1)
      }
    });
  };

  // Statistics Summary Component
  const StatsSummary = () => {
    const totalStudents = submissions.length;
    const averageScore = totalStudents > 0 
      ? submissions.reduce((sum, sub) => sum + safePercentage(sub.percentage), 0) / totalStudents
      : 0;
    const passRate = totalStudents > 0 
      ? (submissions.filter(sub => safePercentage(sub.percentage) >= 50).length / totalStudents) * 100
      : 0;
    
    // NEW: Weightage-based test specific stats
    const weightageSubmissions = submissions.filter(sub => sub.evaluation_method === "manual_test");
    const hasWeightageTests = weightageSubmissions.length > 0;
    
    const excellentRate = totalStudents > 0 
      ? (submissions.filter(sub => safePercentage(sub.percentage) >= 80).length / totalStudents) * 100
      : 0;

    return (
      <View>
        {hasWeightageTests && (
          <View style={[styles.weightageTestBanner, { backgroundColor: 'rgba(33, 150, 243, 0.1)' }]}>
            <Ionicons name="information-circle" size={20} color="#2196F3" />
            <View style={styles.bannerTextContainer}>
              <Text style={[styles.bannerTitle, { color: '#1976D2' }]}>
                Weightage-Based Evaluation
              </Text>
              <Text style={[styles.bannerSubtitle, { color: '#1976D2' }]}>
                {weightageSubmissions.length}/{totalStudents} submissions use advanced scoring
              </Text>
            </View>
          </View>
        )}
        
        <View style={styles.statsContainer}>
          <View style={[styles.statCard, { backgroundColor: theme.colors.surface }]}>
            <Text variant="titleLarge" style={[styles.statNumber, { color: theme.colors.onSurface }]}>
              {totalStudents}
            </Text>
            <Text variant="bodySmall" style={[styles.statLabel, { color: theme.colors.onSurfaceVariant }]}>
              Total Students
            </Text>
          </View>
          <View style={[styles.statCard, { backgroundColor: theme.colors.surface }]}>
            <Text variant="titleLarge" style={[styles.statNumber, { color: theme.colors.onSurface }]}>
              {averageScore.toFixed(1)}%
            </Text>
            <Text variant="bodySmall" style={[styles.statLabel, { color: theme.colors.onSurfaceVariant }]}>
              Average Score
            </Text>
          </View>
          <View style={[styles.statCard, { backgroundColor: theme.colors.surface }]}>
            <Text variant="titleLarge" style={[styles.statNumber, { color: theme.colors.onSurface }]}>
              {hasWeightageTests ? excellentRate.toFixed(1) : passRate.toFixed(1)}%
            </Text>
            <Text variant="bodySmall" style={[styles.statLabel, { color: theme.colors.onSurfaceVariant }]}>
              {hasWeightageTests ? 'Excellence Rate (80%+)' : 'Pass Rate (50%+)'}
            </Text>
          </View>
        </View>
      </View>
    );
  };

  // Performance Chart Component
  const PerformanceChart = () => {
    const chartData = calculateScoreDistribution();
    
    if (submissions.length === 0) {
      return (
        <View style={[styles.chartCard, { backgroundColor: theme.colors.surface }]}>
          <Text variant="titleMedium" style={[styles.chartTitle, { color: theme.colors.onSurface }]}>
            Performance Distribution
          </Text>
          <View style={styles.noDataContainer}>
            <Ionicons name="analytics-outline" size={48} color={theme.colors.onSurfaceVariant} style={{ opacity: 0.5 }} />
            <Text variant="bodyMedium" style={{ color: theme.colors.onSurfaceVariant, marginTop: 12 }}>
              No submissions data available
            </Text>
          </View>
        </View>
      );
    }

    return (
      <View style={[styles.chartCard, { backgroundColor: theme.colors.surface }]}>
        <Text variant="titleMedium" style={[styles.chartTitle, { color: theme.colors.onSurface }]}>
          Performance Distribution ({submissions.length} students)
        </Text>
        <View style={styles.chartWrapper}>
          <PieChart
            data={chartData}
            width={width - 80}
            height={200}
            chartConfig={{
              backgroundGradientFrom: theme.colors.surface,
              backgroundGradientTo: theme.colors.surface,
              color: (opacity = 1) => `rgba(99, 102, 241, ${opacity})`,
              strokeWidth: 2,
              barPercentage: 0.5,
              useShadowColorFromDataset: false,
            }}
            accessor="population"
            backgroundColor="transparent"
            paddingLeft="15"
            center={[10, 0]}
            absolute
          />
        </View>
      </View>
    );
  };

  // Submission Card Component
  const SubmissionCard = ({ item, index }: { item: Submission; index: number }) => {
    const percentage = safePercentage(item.percentage);
    const scoreColor = getScoreColor(percentage);
    const scoreLabel = getScoreLabel(percentage);

    return (
      <TouchableOpacity
        style={[styles.submissionCard, { backgroundColor: theme.colors.surface }]}
        onPress={() => handleSubmissionPress(item)}
        activeOpacity={0.7}
      >
        <View style={styles.submissionHeader}>
          <View style={styles.studentInfo}>
            <View style={[styles.rankBadge, { backgroundColor: scoreColor + '20' }]}>
              <Text variant="labelSmall" style={[styles.rankText, { color: scoreColor }]}>
                #{index + 1}
              </Text>
            </View>
            <Avatar.Text
              size={40}
              label={item.roll_no && item.roll_no !== 'unknown' ? item.roll_no.substring(0, 2).toUpperCase() : 'RN'}
              style={[styles.studentAvatar, { backgroundColor: theme.colors.primary }]}
              labelStyle={{ fontSize: 14, color: theme.colors.onPrimary }}
            />
            <View style={styles.studentDetails}>
              <Text
                variant="titleSmall"
                style={[styles.studentName, { color: theme.colors.onSurface }]}
                numberOfLines={1}
              >
                Roll: {item.roll_no && item.roll_no !== 'unknown' ? item.roll_no : 'Unknown'}
              </Text>
              <Text
                variant="bodySmall"
                style={[styles.submissionTime, { color: theme.colors.onSurfaceVariant }]}
              >
                {formatDate(item.submitted_at)}
              </Text>
            </View>
          </View>
          
          <View style={styles.scoreSection}>
            <View style={[styles.scoreBadge, { backgroundColor: scoreColor + '20' }]}>
              <Text variant="labelMedium" style={[styles.scoreText, { color: scoreColor }]}>
                {item.score || 0}/{item.total_questions || 0}
              </Text>
            </View>
            <Text variant="headlineSmall" style={[styles.percentageText, { color: scoreColor }]}>
              {percentage.toFixed(1)}%
            </Text>
            <Text variant="bodySmall" style={[styles.scoreLabel, { color: scoreColor }]}>
              {scoreLabel}
            </Text>
          </View>
        </View>

        <View style={styles.submissionFooter}>
          <Chip
            mode="outlined"
            compact
            style={[
              styles.methodChip, 
              { 
                backgroundColor: item.evaluation_method === "manual_test" 
                  ? 'rgba(33, 150, 243, 0.1)' 
                  : (isDarkMode ? "#374151" : "#F3F4F6"),
                borderColor: item.evaluation_method === "manual_test" ? '#2196F3' : 'transparent'
              }
            ]}
            textStyle={{ 
              fontSize: 10,
              color: item.evaluation_method === "manual_test" ? '#2196F3' : theme.colors.onSurfaceVariant,
              fontWeight: item.evaluation_method === "manual_test" ? 'bold' : 'normal'
            }}
            icon={() => (
              <Ionicons
                name={getEvaluationMethodIcon(item.evaluation_method) as any}
                size={12}
                color={item.evaluation_method === "manual_test" ? '#2196F3' : theme.colors.onSurfaceVariant}
              />
            )}
          >
            {getEvaluationMethodLabel(item.evaluation_method)}
            {item.evaluation_method === "manual_test" && " ⚡"}
          </Chip>
          
          <Ionicons
            name="chevron-forward"
            size={16}
            color={theme.colors.onSurfaceVariant}
          />
        </View>
      </TouchableOpacity>
    );
  };

  if (loading) {
    return (
      <SafeAreaView
        style={[styles.safeArea, { backgroundColor: theme.colors.background }]}
        edges={["top", "left", "right"]}
      >
        <View style={styles.loadingContainer}>
          <ActivityIndicator size="large" color={theme.colors.primary} />
          <Text
            variant="bodyLarge"
            style={[styles.loadingText, { color: theme.colors.onSurface }]}
          >
            Loading submissions...
          </Text>
        </View>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView
      style={[styles.safeArea, { backgroundColor: theme.colors.background }]}
      edges={["top", "left", "right"]}
    >
      {/* Header */}
      <LinearGradient
        colors={isDarkMode ? ["#1F2937", "#111827"] : ["#6366F1", "#8B5CF6"]}
        style={styles.headerGradient}
      >
        <View style={styles.headerContent}>
          <TouchableOpacity
            style={styles.backButton}
            onPress={() => router.back()}
          >
            <Ionicons name="arrow-back" size={24} color="white" />
          </TouchableOpacity>
          <View style={styles.headerTextContainer}>
            <Text variant="headlineMedium" style={styles.headerTitle}>
              {paper?.name || paperName}
            </Text>
            <Text variant="bodyLarge" style={styles.headerSubtitle}>
              Test Submissions & Results
            </Text>
          </View>
          <TouchableOpacity
            style={styles.exportButton}
            onPress={exportToExcel}
          >
            <MaterialCommunityIcons name="microsoft-excel" size={24} color="white" />
          </TouchableOpacity>
        </View>
      </LinearGradient>

      <FlatList
        data={submissions}
        renderItem={({ item, index }) => <SubmissionCard item={item} index={index} />}
        keyExtractor={(item) => item.id.toString()}
        contentContainerStyle={styles.listContainer}
        refreshControl={
          <RefreshControl
            refreshing={refreshing}
            onRefresh={onRefresh}
            colors={[theme.colors.primary]}
            tintColor={theme.colors.primary}
          />
        }
        ListHeaderComponent={
          <View>
            <StatsSummary />
            <PerformanceChart />
            {submissions.length > 0 && (
              <View style={styles.listHeader}>
                <View style={styles.listTitleContainer}>
                  <Text variant="titleMedium" style={[styles.listTitle, { color: theme.colors.onSurface }]}>
                    Student Results ({submissions.length})
                  </Text>
                  {isWeightageBasedTest() && (
                    <Chip 
                      mode="outlined" 
                      compact
                      style={[styles.weightageIndicator, { borderColor: '#2196F3' }]}
                      textStyle={{ color: '#2196F3', fontSize: 10, fontWeight: 'bold' }}
                      icon={() => <Ionicons name="calculator-outline" size={12} color="#2196F3" />}
                    >
                      WEIGHTAGE-BASED
                    </Chip>
                  )}
                </View>
                <Text variant="bodySmall" style={[styles.listSubtitle, { color: theme.colors.onSurfaceVariant }]}>
                  {isWeightageBasedTest() 
                    ? "This test uses advanced weightage-based scoring • Tap to view detailed results"
                    : "Tap to view detailed results"
                  }
                </Text>
              </View>
            )}
          </View>
        }
        ListEmptyComponent={
          submissions.length === 0 ? (
            <View style={styles.emptyState}>
              <Ionicons
                name="people-outline"
                size={80}
                color={theme.colors.onSurfaceVariant}
                style={{ opacity: 0.5 }}
              />
              <Text
                variant="headlineSmall"
                style={[styles.emptyStateTitle, { color: theme.colors.onSurface }]}
              >
                No Submissions Yet
              </Text>
              <Text
                variant="bodyMedium"
                style={[styles.emptyStateSubtitle, { color: theme.colors.onSurfaceVariant }]}
              >
                Students haven't submitted answers for this test yet. Share the test with students to start receiving submissions.
              </Text>
            </View>
          ) : null
        }
        showsVerticalScrollIndicator={false}
      />
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safeArea: {
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
  exportButton: {
    padding: 8,
    marginLeft: 12,
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
  listContainer: {
    paddingHorizontal: 20,
    paddingBottom: 100,
  },
  statsContainer: {
    flexDirection: "row",
    justifyContent: "space-between",
    marginVertical: 20,
    gap: 12,
  },
  statCard: {
    flex: 1,
    padding: 16,
    borderRadius: 12,
    alignItems: "center",
    elevation: 2,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.1,
    shadowRadius: 3,
  },
  statNumber: {
    fontWeight: "700",
    marginBottom: 4,
  },
  statLabel: {
    fontSize: 12,
    textAlign: "center",
  },
  chartCard: {
    padding: 20,
    borderRadius: 16,
    marginBottom: 24,
    elevation: 2,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.1,
    shadowRadius: 3,
  },
  chartTitle: {
    fontWeight: "600",
    marginBottom: 16,
    textAlign: "center",
  },
  chartWrapper: {
    alignItems: "center",
  },
  noDataContainer: {
    alignItems: "center",
    paddingVertical: 40,
  },
  listHeader: {
    marginBottom: 16,
  },
  listTitle: {
    fontWeight: "600",
    marginBottom: 4,
  },
  listSubtitle: {
    fontSize: 14,
  },
  submissionCard: {
    marginBottom: 12,
    padding: 16,
    borderRadius: 12,
    elevation: 2,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.1,
    shadowRadius: 3,
  },
  submissionHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: 12,
  },
  studentInfo: {
    flexDirection: "row",
    alignItems: "center",
    flex: 1,
  },
  rankBadge: {
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 12,
    marginRight: 12,
  },
  rankText: {
    fontSize: 12,
    fontWeight: "600",
  },
  studentAvatar: {
    marginRight: 12,
  },
  studentDetails: {
    flex: 1,
  },
  studentName: {
    fontWeight: "600",
    marginBottom: 2,
  },
  submissionTime: {
    fontSize: 12,
  },
  scoreSection: {
    alignItems: "center",
    marginLeft: 16,
  },
  scoreBadge: {
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 6,
    marginBottom: 4,
  },
  scoreText: {
    fontSize: 12,
    fontWeight: "600",
  },
  percentageText: {
    fontWeight: "700",
    marginBottom: 2,
  },
  scoreLabel: {
    fontSize: 10,
    fontWeight: "600",
  },
  submissionFooter: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
  },
  methodChip: {
    height: 28,
  },
  emptyState: {
    alignItems: "center",
    paddingVertical: 60,
    paddingHorizontal: 20,
  },
  emptyStateTitle: {
    marginTop: 20,
    fontWeight: "600",
    textAlign: "center",
  },
  emptyStateSubtitle: {
    marginTop: 8,
    textAlign: "center",
    lineHeight: 20,
  },
  
  // NEW: Styles for evaluation method indicators
  listTitleContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 4,
  },
  weightageIndicator: {
    backgroundColor: 'rgba(33, 150, 243, 0.1)',
    borderWidth: 1,
    height: 24,
  },
  
  // NEW: Banner styles for weightage-based test info
  weightageTestBanner: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 16,
    margin: 16,
    borderRadius: 12,
    borderLeftWidth: 4,
    borderLeftColor: '#2196F3',
  },
  bannerTextContainer: {
    marginLeft: 12,
    flex: 1,
  },
  bannerTitle: {
    fontSize: 14,
    fontWeight: 'bold',
    marginBottom: 2,
  },
  bannerSubtitle: {
    fontSize: 12,
    opacity: 0.8,
  },
});