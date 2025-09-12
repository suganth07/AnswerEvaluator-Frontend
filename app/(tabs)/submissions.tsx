import React, { useState, useEffect } from "react";
import {
  View,
  StyleSheet,
  ScrollView,
  RefreshControl,
  TouchableOpacity,
  Dimensions,
  Alert,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { Text, Card, Avatar, Chip, ActivityIndicator } from "react-native-paper";
import { useTheme } from "../../context/ThemeContext";
import { paperService, submissionService } from "../../services/api";
import { router, useLocalSearchParams } from "expo-router";
import { Ionicons } from "@expo/vector-icons";
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
  score: number | null | undefined;
  total_questions: number | null | undefined;
  percentage: number | null | undefined;
  evaluation_method: string;
  submitted_at: string;
}

interface PaperWithSubmissions extends Paper {
  submissions: Submission[];
}

export default function SubmissionsScreen() {
  const params = useLocalSearchParams();
  const paperId = params.paperId as string;
  
  const [papers, setPapers] = useState<PaperWithSubmissions[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const { theme, isDarkMode } = useTheme();

  useEffect(() => {
    fetchSubmissionsData();
  }, [paperId]);

  const fetchSubmissionsData = async () => {
    try {
      setLoading(true);
      
      if (paperId) {
        // Fetch specific paper only
        const paper = await paperService.getDetails(paperId);
        const submissions = await submissionService.getByPaperId(parseInt(paperId));
        
        setPapers([{
          ...paper,
          submissions: submissions || []
        }]);
      } else {
        // Fetch all papers
        const papersData = await paperService.getAll();
        
        // Fetch submissions for each paper
        const papersWithSubmissions = await Promise.all(
          papersData.map(async (paper: Paper) => {
            try {
              const submissions = await submissionService.getByPaperId(paper.id);
              return {
                ...paper,
                submissions: submissions || []
              };
            } catch (error) {
              console.error(`Error fetching submissions for paper ${paper.id}:`, error);
              return {
                ...paper,
                submissions: []
              };
            }
          })
        );
        
        setPapers(papersWithSubmissions);
      }
    } catch (error: any) {
      console.error("Error fetching submissions data:", error);
      Alert.alert("Error", "Failed to load submissions data");
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  const onRefresh = () => {
    setRefreshing(true);
    fetchSubmissionsData();
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
  const calculateScoreDistribution = (submissions: Submission[]) => {
    if (submissions.length === 0) {
      return [
        { name: "No Data", population: 100, color: "#E5E7EB", legendFontColor: isDarkMode ? "#E5E7EB" : "#374151", legendFontSize: 12 }
      ];
    }

    let lowScore = 0;   // 0-40%
    let midScore = 0;   // 40-80%
    let highScore = 0;  // 80-100%

    submissions.forEach(submission => {
      const percentage = safePercentage(submission.percentage);
      if (percentage < 40) {
        lowScore++;
      } else if (percentage < 80) {
        midScore++;
      } else {
        highScore++;
      }
    });

    const total = submissions.length;
    const data = [];

    if (lowScore > 0) {
      data.push({
        name: `0-40% (${lowScore})`,
        population: Math.round((lowScore / total) * 100),
        color: "#EF4444", // Red
        legendFontColor: isDarkMode ? "#E5E7EB" : "#374151",
        legendFontSize: 12
      });
    }

    if (midScore > 0) {
      data.push({
        name: `40-80% (${midScore})`,
        population: Math.round((midScore / total) * 100),
        color: "#F59E0B", // Yellow/Orange
        legendFontColor: isDarkMode ? "#E5E7EB" : "#374151",
        legendFontSize: 12
      });
    }

    if (highScore > 0) {
      data.push({
        name: `80-100% (${highScore})`,
        population: Math.round((highScore / total) * 100),
        color: "#22C55E", // Green
        legendFontColor: isDarkMode ? "#E5E7EB" : "#374151",
        legendFontSize: 12
      });
    }

    return data.length > 0 ? data : [
      { name: "No Data", population: 100, color: "#E5E7EB", legendFontColor: isDarkMode ? "#E5E7EB" : "#374151", legendFontSize: 12 }
    ];
  };

  // Score Distribution Chart Component
  const ScoreDistributionChart = ({ submissions }: { submissions: Submission[] }) => {
    const chartData = calculateScoreDistribution(submissions);
    
    if (submissions.length === 0) {
      return (
        <View style={[styles.noDataContainer, { backgroundColor: isDarkMode ? "rgba(255, 255, 255, 0.05)" : "rgba(99, 102, 241, 0.05)" }]}>
          <Text variant="bodyMedium" style={{ color: theme.colors.onSurface }}>
            No submissions data available for chart
          </Text>
        </View>
      );
    }

    return (
      <View style={[styles.chartContainer, { backgroundColor: isDarkMode ? "rgba(255, 255, 255, 0.05)" : "rgba(99, 102, 241, 0.05)" }]}>
        <Text variant="titleMedium" style={[styles.chartTitle, { color: theme.colors.onSurface }]}>
          Score Distribution ({submissions.length} students)
        </Text>
        <PieChart
          data={chartData}
          width={Math.min(width - 40, 350)}
          height={180}
          chartConfig={{
            backgroundGradientFrom: theme.colors.background,
            backgroundGradientTo: theme.colors.background,
            color: (opacity = 1) => `rgba(99, 102, 241, ${opacity})`,
            strokeWidth: 2,
            barPercentage: 0.5,
            useShadowColorFromDataset: false,
          }}
          accessor="population"
          backgroundColor="transparent"
          paddingLeft="15"
          center={[0, 0]}
          absolute
        />
      </View>
    );
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
        return "OMR";
      case "fill_blanks_ai":
        return "Fill Blanks";
      case "gemini_vision":
        return "AI Vision";
      default:
        return "Traditional";
    }
  };

  const handleSubmissionPress = (submission: Submission, paper: Paper) => {
    router.push({
      pathname: "/submission-detail",
      params: {
        submissionId: submission.id,
        studentName: submission.student_name,
        paperName: paper.name,
        score: submission.score || 0,
        totalQuestions: submission.total_questions || 0,
        percentage: safePercentage(submission.percentage).toFixed(1)
      }
    });
  };

  const SubmissionCard = ({ submission, paper }: { submission: Submission; paper: Paper }) => (
    <TouchableOpacity
      onPress={() => handleSubmissionPress(submission, paper)}
      style={[styles.submissionCard, { backgroundColor: theme.colors.surface }]}
    >
      <View style={styles.submissionCardHeader}>
        <View style={styles.studentInfo}>
          <Avatar.Text
            size={36}
            label={submission.student_name.substring(0, 2).toUpperCase()}
            style={[styles.studentAvatar, { backgroundColor: theme.colors.primary }]}
            labelStyle={{ fontSize: 14, color: theme.colors.onPrimary }}
          />
          <View style={styles.studentDetails}>
            <Text
              variant="titleSmall"
              style={[styles.studentName, { color: theme.colors.onSurface }]}
              numberOfLines={1}
            >
              {submission.student_name}
            </Text>
            <Text
              variant="bodySmall"
              style={[styles.submissionTime, { color: theme.colors.onSurfaceVariant }]}
            >
              {formatDate(submission.submitted_at)}
            </Text>
          </View>
        </View>
        
        <View style={styles.scoreContainer}>
          <View
            style={[
              styles.scoreBadge,
              { backgroundColor: `${getScoreColor(safePercentage(submission.percentage))}20` }
            ]}
          >
            <Text
              variant="labelMedium"
              style={[
                styles.scoreText,
                { color: getScoreColor(safePercentage(submission.percentage)) }
              ]}
            >
              {submission.score || 0}/{submission.total_questions || 0}
            </Text>
          </View>
          <Text
            variant="bodySmall"
            style={[
              styles.percentageText,
              { color: getScoreColor(safePercentage(submission.percentage)) }
            ]}
          >
            {safePercentage(submission.percentage).toFixed(1)}%
          </Text>
        </View>
      </View>

      <View style={styles.submissionFooter}>
        <Chip
          mode="outlined"
          compact
          style={[
            styles.methodChip,
            { backgroundColor: isDarkMode ? "#374151" : "#F3F4F6" }
          ]}
          textStyle={{ fontSize: 10 }}
          icon={() => (
            <Ionicons
              name={getEvaluationMethodIcon(submission.evaluation_method) as any}
              size={12}
              color={theme.colors.onSurfaceVariant}
            />
          )}
        >
          {getEvaluationMethodLabel(submission.evaluation_method)}
        </Chip>
        
        <Ionicons
          name="chevron-forward"
          size={16}
          color={theme.colors.onSurfaceVariant}
        />
      </View>
    </TouchableOpacity>
  );

  const PaperSection = ({ paper }: { paper: PaperWithSubmissions }) => (
    <View style={styles.paperSection}>
      {/* Paper Header */}
      <LinearGradient
        colors={isDarkMode ? ["#374151", "#1F2937"] : ["#6366F1", "#8B5CF6"]}
        style={styles.paperHeader}
        start={{ x: 0, y: 0 }}
        end={{ x: 1, y: 1 }}
      >
        <View style={styles.paperHeaderContent}>
          <View style={styles.paperInfo}>
            <Text variant="titleLarge" style={styles.paperTitle}>
              {paper.name}
            </Text>
            <Text variant="bodyMedium" style={styles.paperSubtitle}>
              {paper.question_count} Questions • {paper.question_type}
            </Text>
          </View>
          <View style={styles.paperStats}>
            <View style={styles.statItem}>
              <Text variant="titleMedium" style={styles.statNumber}>
                {paper.submissions.length}
              </Text>
              <Text variant="bodySmall" style={styles.statLabel}>
                Submissions
              </Text>
            </View>
          </View>
        </View>
      </LinearGradient>

      {/* Score Distribution Chart */}
      <ScoreDistributionChart submissions={paper.submissions} />

      {/* Submissions List */}
      <View
        style={[
          styles.submissionsContainer,
          { backgroundColor: theme.colors.background }
        ]}
      >
        {paper.submissions.length > 0 ? (
          paper.submissions
            .sort((a, b) => new Date(b.submitted_at).getTime() - new Date(a.submitted_at).getTime())
            .map((submission) => (
              <SubmissionCard
                key={submission.id}
                submission={submission}
                paper={paper}
              />
            ))
        ) : (
          <View style={styles.emptySubmissions}>
            <Ionicons
              name="document-outline"
              size={48}
              color={theme.colors.onSurfaceVariant}
              style={{ opacity: 0.5 }}
            />
            <Text
              variant="bodyLarge"
              style={[
                styles.emptyText,
                { color: theme.colors.onSurfaceVariant }
              ]}
            >
              No submissions yet
            </Text>
            <Text
              variant="bodySmall"
              style={[
                styles.emptySubtext,
                { color: theme.colors.onSurfaceVariant }
              ]}
            >
              Students haven't submitted answers for this test
            </Text>
          </View>
        )}
      </View>
    </View>
  );

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
          {paperId && (
            <TouchableOpacity
              style={styles.backButton}
              onPress={() => router.push("/(tabs)/submissions")}
            >
              <Ionicons name="arrow-back" size={24} color="white" />
            </TouchableOpacity>
          )}
          <View style={styles.headerTextContainer}>
            <Text variant="headlineLarge" style={styles.headerTitle}>
              {paperId && papers[0] ? `${papers[0].name} - Submissions` : "Submissions"}
            </Text>
            <Text variant="bodyLarge" style={styles.headerSubtitle}>
              {paperId ? "View student submissions for this test" : "View all student submissions and results"}
            </Text>
          </View>
        </View>
      </LinearGradient>

      <ScrollView
        style={[styles.container, { backgroundColor: theme.colors.background }]}
        contentContainerStyle={styles.scrollContent}
        refreshControl={
          <RefreshControl
            refreshing={refreshing}
            onRefresh={onRefresh}
            colors={[theme.colors.primary]}
            tintColor={theme.colors.primary}
          />
        }
        showsVerticalScrollIndicator={false}
      >
        {papers.length > 0 ? (
          papers.map((paper) => (
            <PaperSection key={paper.id} paper={paper} />
          ))
        ) : (
          <View style={styles.emptyState}>
            <Ionicons
              name="folder-open-outline"
              size={80}
              color={theme.colors.onSurfaceVariant}
              style={{ opacity: 0.5 }}
            />
            <Text
              variant="headlineSmall"
              style={[styles.emptyStateTitle, { color: theme.colors.onSurface }]}
            >
              No Tests Found
            </Text>
            <Text
              variant="bodyMedium"
              style={[
                styles.emptyStateSubtitle,
                { color: theme.colors.onSurfaceVariant }
              ]}
            >
              Create some tests first to see student submissions
            </Text>
            <TouchableOpacity
              style={[styles.createButton]}
              onPress={() => router.push("/upload")}
            >
              <LinearGradient
                colors={["#6366F1", "#8B5CF6"]}
                style={styles.createButtonGradient}
                start={{ x: 0, y: 0 }}
                end={{ x: 1, y: 1 }}
              >
                <Ionicons name="add" size={20} color="white" />
                <Text style={styles.createButtonText}>Create Test</Text>
              </LinearGradient>
            </TouchableOpacity>
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
    paddingHorizontal: 20,
    paddingTop: 16,
    paddingBottom: 24,
  },
  headerContent: {
    alignItems: "flex-start",
  },
  backButton: {
    padding: 8,
    marginBottom: 12,
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
  scrollContent: {
    paddingTop: 8,
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
  paperSection: {
    marginBottom: 24,
  },
  paperHeader: {
    borderTopLeftRadius: 16,
    borderTopRightRadius: 16,
    padding: 20,
  },
  paperHeaderContent: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "flex-start",
  },
  paperInfo: {
    flex: 1,
  },
  paperTitle: {
    color: "white",
    fontWeight: "700",
    marginBottom: 4,
  },
  paperSubtitle: {
    color: "rgba(255,255,255,0.8)",
    fontSize: 14,
  },
  paperStats: {
    alignItems: "center",
    marginLeft: 16,
  },
  statItem: {
    alignItems: "center",
  },
  statNumber: {
    color: "white",
    fontWeight: "700",
  },
  statLabel: {
    color: "rgba(255,255,255,0.8)",
    fontSize: 12,
  },
  submissionsContainer: {
    borderBottomLeftRadius: 16,
    borderBottomRightRadius: 16,
    paddingVertical: 8,
    marginHorizontal: 16,
    shadowColor: "#000",
    shadowOffset: {
      width: 0,
      height: 2,
    },
    shadowOpacity: 0.1,
    shadowRadius: 8,
    elevation: 3,
  },
  submissionCard: {
    marginHorizontal: 8,
    marginVertical: 4,
    padding: 16,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: "rgba(0,0,0,0.05)",
  },
  submissionCardHeader: {
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
  scoreContainer: {
    alignItems: "center",
    marginLeft: 16,
  },
  scoreBadge: {
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 6,
    marginBottom: 2,
  },
  scoreText: {
    fontSize: 12,
    fontWeight: "600",
  },
  percentageText: {
    fontSize: 14,
    fontWeight: "700",
  },
  submissionFooter: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
  },
  methodChip: {
    height: 28,
  },
  emptySubmissions: {
    alignItems: "center",
    paddingVertical: 32,
    paddingHorizontal: 20,
  },
  emptyText: {
    marginTop: 12,
    fontWeight: "600",
  },
  emptySubtext: {
    marginTop: 4,
    textAlign: "center",
    opacity: 0.7,
  },
  emptyState: {
    flex: 1,
    alignItems: "center",
    justifyContent: "center",
    paddingHorizontal: 20,
    paddingVertical: 60,
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
  createButton: {
    marginTop: 24,
    borderRadius: 12,
    overflow: "hidden",
  },
  createButtonGradient: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    paddingHorizontal: 24,
    paddingVertical: 14,
  },
  createButtonText: {
    color: "white",
    fontSize: 16,
    fontWeight: "600",
    marginLeft: 8,
  },
  bottomSpacer: {
    height: 100,
  },
  chartContainer: {
    borderRadius: 12,
    padding: 16,
    marginBottom: 16,
    marginHorizontal: 20,
    borderWidth: 1,
    borderColor: "rgba(99, 102, 241, 0.2)",
  },
  chartTitle: {
    fontWeight: "600",
    marginBottom: 12,
    textAlign: "center",
  },
  noDataContainer: {
    padding: 20,
    alignItems: "center",
    borderRadius: 12,
    marginBottom: 16,
    marginHorizontal: 20,
    borderWidth: 1,
    borderColor: "rgba(99, 102, 241, 0.2)",
  },
});