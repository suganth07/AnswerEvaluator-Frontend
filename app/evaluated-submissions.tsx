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
import { Text, Card, Avatar, Button, ActivityIndicator, Chip } from "react-native-paper";
import { useTheme } from "../context/ThemeContext";
import { router, useLocalSearchParams } from "expo-router";
import { Ionicons } from "@expo/vector-icons";
import { LinearGradient } from "expo-linear-gradient";
import { PieChart } from "react-native-chart-kit";

const { width } = Dimensions.get("window");

interface EvaluatedSubmission {
  id: number;
  paperId: number;
  studentName: string;
  rollNo: string;
  score: number;
  totalQuestions: number;
  percentage: number;
  evaluationStatus: string;
  evaluationMethod: string;
  submittedAt: string;
  paperName?: string;
}

export default function EvaluatedSubmissionsScreen() {
  const params = useLocalSearchParams();
  const paperId = params.paperId as string;
  const paperName = params.paperName as string;
  
  const [evaluatedSubmissions, setEvaluatedSubmissions] = useState<EvaluatedSubmission[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const { theme, isDarkMode } = useTheme();
  const url = process.env.EXPO_PUBLIC_API_URL;


  useEffect(() => {
    fetchEvaluatedSubmissions();
  }, [paperId]);

  const fetchEvaluatedSubmissions = async () => {
    try {
      setLoading(true);

      const apiUrl = `${url}/api/submissions/paper/${paperId}/status/evaluated`;
      console.log('Fetching evaluated submissions from:', apiUrl);

      const response = await fetch(apiUrl);

      if (response.ok) {
        const data = await response.json();
        console.log('Raw API response:', data);
        console.log('Submissions array:', data.submissions);
        
        // Ensure we have the latest data with proper field mapping
        const processedSubmissions = (data.submissions || []).map((submission: any, index: number) => {
          console.log(`Processing submission ${index}:`, submission);
          
          const processed = {
            id: submission.id,
            paperId: submission.paper_id || submission.paperId,
            studentName: submission.student_name || submission.studentName,
            rollNo: submission.roll_no || submission.rollNo,
            score: submission.score,
            totalQuestions: submission.total_questions || submission.totalQuestions,
            percentage: submission.percentage,
            evaluationStatus: submission.evaluation_status || submission.evaluationStatus,
            evaluationMethod: submission.evaluation_method || submission.evaluationMethod,
            submittedAt: submission.submitted_at || submission.submittedAt || submission.uploadedAt
          };
          
          console.log(`Processed submission ${index}:`, processed);
          return processed;
        });
        
        console.log('Final processed submissions:', processedSubmissions);
        setEvaluatedSubmissions(processedSubmissions);
      } else {
        console.error('API response not OK:', response.status, response.statusText);
        throw new Error('Failed to fetch evaluated submissions');
      }
    } catch (error: any) {
      console.error("Error fetching evaluated submissions:", error);
      Alert.alert("Error", "Failed to load evaluated submissions");
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  const onRefresh = () => {
    setRefreshing(true);
    fetchEvaluatedSubmissions();
  };

  const safePercentage = (value: any): number => {
    if (value === null || value === undefined || value === '') return 0;
    const num = Number(value);
    return isNaN(num) ? 0 : num;
  };

  // Calculate score distribution for pie chart
  const calculateScoreDistribution = (submissions: EvaluatedSubmission[]) => {
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
  const ScoreDistributionChart = ({ submissions }: { submissions: EvaluatedSubmission[] }) => {
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

  const getScoreColor = (percentage: number) => {
    if (percentage >= 80) return '#4caf50'; // Green
    if (percentage >= 60) return '#ff9800'; // Orange
    return '#f44336'; // Red
  };

  const getGrade = (percentage: number) => {
    if (percentage >= 90) return 'A+';
    if (percentage >= 80) return 'A';
    if (percentage >= 70) return 'B';
    if (percentage >= 60) return 'C';
    if (percentage >= 50) return 'D';
    return 'F';
  };

  const handleViewDetails = (submission: EvaluatedSubmission) => {
    const safePercentage = typeof submission.percentage === 'number' ? submission.percentage : 0;
    const safeScore = typeof submission.score === 'number' ? submission.score : 0;
    const safeTotalQuestions = typeof submission.totalQuestions === 'number' ? submission.totalQuestions : 0;
    
    router.push({
      pathname: '/result',
      params: {
        submissionId: submission.id.toString(),
        studentName: submission.studentName || 'Unknown Student',
        paperName: paperName || 'Unknown Paper',
        score: safeScore.toString(),
        total: safeTotalQuestions.toString(),
        percentage: safePercentage.toString()
      }
    });
  };

  const EvaluatedSubmissionCard = ({ submission }: { submission: EvaluatedSubmission }) => {
    // Ensure we have valid numbers with fallbacks
    const safePercentage = typeof submission.percentage === 'number' ? submission.percentage : 0;
    const safeScore = typeof submission.score === 'number' ? submission.score : 0;
    const safeTotalQuestions = typeof submission.totalQuestions === 'number' ? submission.totalQuestions : 0;
    
    return (
      <Card style={[styles.submissionCard, { backgroundColor: theme.colors.surface }]}>
        <Card.Content style={styles.cardContent}>
          <View style={styles.cardHeader}>
            <View style={styles.studentInfo}>
              <Avatar.Text
                size={48}
                label={submission.studentName ? submission.studentName.substring(0, 2).toUpperCase() : 'NA'}
                style={[styles.studentAvatar, { backgroundColor: getScoreColor(safePercentage) }]}
                labelStyle={{ fontSize: 16, color: 'white', fontWeight: '700' }}
              />
              <View style={styles.studentDetails}>
                <Text
                  variant="titleMedium"
                  style={[styles.studentName, { color: theme.colors.onSurface }]}
                  numberOfLines={1}
                >
                  {submission.studentName || 'Unknown Student'}
                </Text>
                <Text
                  variant="bodyMedium"
                  style={[styles.rollNumber, { color: theme.colors.primary }]}
                >
                  Roll Number: {submission.rollNo || 'N/A'}
                </Text>
                <Text
                  variant="bodySmall"
                  style={[styles.submissionTime, { color: theme.colors.onSurfaceVariant }]}
                >
                  Evaluated: {formatDate(submission.submittedAt)}
                </Text>
              </View>
            </View>
            
            <View style={styles.statusBadge}>
              <Ionicons name="checkmark-circle" size={16} color="#4caf50" />
              <Text style={[styles.statusText, { color: '#4caf50' }]}>
                Evaluated
              </Text>
            </View>
          </View>

          {/* Score Summary */}
          <View style={styles.scoreSection}>
            <View style={styles.scoreDisplay}>
              <Text variant="headlineSmall" style={[styles.scoreText, { color: getScoreColor(safePercentage) }]}>
                {safeScore}/{safeTotalQuestions}
              </Text>
              <Text variant="bodyMedium" style={[styles.scoreLabel, { color: theme.colors.onSurfaceVariant }]}>
                Questions Correct
              </Text>
            </View>
            
            <View style={styles.gradeSection}>
              <Text variant="headlineMedium" style={[styles.gradeText, { color: getScoreColor(safePercentage) }]}>
                {getGrade(safePercentage)}
              </Text>
              <Text variant="bodySmall" style={[styles.percentageText, { color: theme.colors.onSurfaceVariant }]}>
                {safePercentage.toFixed(1)}%
              </Text>
            </View>
          </View>

          {/* Progress Bar */}
          <View style={[styles.progressBar, { backgroundColor: theme.colors.outline }]}>
            <View 
              style={[
                styles.progressFill, 
                { 
                  width: `${Math.min(Math.max(safePercentage, 0), 100)}%`,
                  backgroundColor: getScoreColor(safePercentage)
                }
              ]} 
            />
          </View>

          {/* Performance Chips */}
          <View style={styles.chipsContainer}>
            <Chip 
              mode="outlined" 
              textStyle={{ color: '#4caf50', fontSize: 12 }}
              style={[styles.chip, { borderColor: '#4caf50' }]}
              compact
            >
              {safeScore} Correct
            </Chip>
            <Chip 
              mode="outlined"
              textStyle={{ color: '#f44336', fontSize: 12 }}
              style={[styles.chip, { borderColor: '#f44336' }]}
              compact
            >
              {Math.max(safeTotalQuestions - safeScore, 0)} Wrong
            </Chip>
            <Chip 
              mode="outlined"
              textStyle={{ color: getScoreColor(safePercentage), fontSize: 12 }}
              style={[styles.chip, { borderColor: getScoreColor(safePercentage) }]}
              compact
            >
              {getGrade(safePercentage)} Grade
            </Chip>
          </View>

          <View style={styles.cardFooter}>
            <Button
              mode="contained"
              onPress={() => handleViewDetails(submission)}
              style={[styles.detailsButton, { backgroundColor: theme.colors.primary }]}
              contentStyle={styles.buttonContent}
              labelStyle={styles.buttonLabel}
              icon="eye-outline"
            >
              View Details
            </Button>
          </View>
        </Card.Content>
      </Card>
    );
  };

  // Calculate summary statistics with safe handling
  const totalSubmissions = evaluatedSubmissions.length;
  const validSubmissions = evaluatedSubmissions.filter(sub => 
    typeof sub.percentage === 'number' && !isNaN(sub.percentage)
  );
  
  const averageScore = validSubmissions.length > 0 
    ? validSubmissions.reduce((sum, sub) => sum + safePercentage(sub.percentage), 0) / validSubmissions.length 
    : 0;
  
  const highestScore = validSubmissions.length > 0 
    ? Math.max(...validSubmissions.map(sub => safePercentage(sub.percentage))) 
    : 0;
  
  const passedStudents = validSubmissions.filter(sub => safePercentage(sub.percentage) >= 60).length;
  const passRate = validSubmissions.length > 0 ? (passedStudents / validSubmissions.length) * 100 : 0;

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
            Loading evaluated submissions...
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
        colors={["#4caf50", "#388e3c"]}
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
              Evaluated Submissions
            </Text>
            <Text variant="bodyLarge" style={styles.headerSubtitle}>
              {paperName} • {totalSubmissions} submissions
            </Text>
          </View>
          <View style={styles.headerIcon}>
            <Ionicons name="checkmark-circle" size={32} color="white" />
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
        {/* Score Distribution Chart */}
        {totalSubmissions > 0 && (
          <ScoreDistributionChart submissions={evaluatedSubmissions} />
        )}

        {/* Summary Statistics */}
        {totalSubmissions > 0 && (
          <Card style={[styles.summaryCard, { backgroundColor: theme.colors.surface }]}>
            <Card.Content>
              <Text variant="titleLarge" style={[styles.summaryTitle, { color: theme.colors.onSurface }]}>
                Class Performance Summary
              </Text>
              
              <View style={styles.statsGrid}>
                <View style={styles.statBox}>
                  <Text variant="headlineSmall" style={[styles.statValue, { color: '#2196f3' }]}>
                    {totalSubmissions}
                  </Text>
                  <Text variant="bodySmall" style={[styles.statLabel, { color: theme.colors.onSurfaceVariant }]}>
                    Total Students
                  </Text>
                </View>
                
                <View style={styles.statBox}>
                  <Text variant="headlineSmall" style={[styles.statValue, { color: '#4caf50' }]}>
                    {averageScore.toFixed(1)}%
                  </Text>
                  <Text variant="bodySmall" style={[styles.statLabel, { color: theme.colors.onSurfaceVariant }]}>
                    Average Score
                  </Text>
                </View>
                
                <View style={styles.statBox}>
                  <Text variant="headlineSmall" style={[styles.statValue, { color: '#ff9800' }]}>
                    {highestScore.toFixed(1)}%
                  </Text>
                  <Text variant="bodySmall" style={[styles.statLabel, { color: theme.colors.onSurfaceVariant }]}>
                    Highest Score
                  </Text>
                </View>
                
                <View style={styles.statBox}>
                  <Text variant="headlineSmall" style={[styles.statValue, { color: getScoreColor(passRate) }]}>
                    {passRate.toFixed(0)}%
                  </Text>
                  <Text variant="bodySmall" style={[styles.statLabel, { color: theme.colors.onSurfaceVariant }]}>
                    Pass Rate
                  </Text>
                </View>
              </View>
            </Card.Content>
          </Card>
        )}

        {evaluatedSubmissions.length > 0 ? (
          <>
            <Text variant="titleMedium" style={[styles.sectionTitle, { color: theme.colors.onSurface }]}>
              Student Results ({totalSubmissions} submissions)
            </Text>
            {evaluatedSubmissions
              .sort((a, b) => safePercentage(b.percentage) - safePercentage(a.percentage)) // Sort by score descending with safe handling
              .map((submission) => (
                <EvaluatedSubmissionCard
                  key={submission.id}
                  submission={submission}
                />
              ))}
          </>
        ) : (
          <View style={styles.emptyState}>
            <Ionicons
              name="document-text-outline"
              size={80}
              color={theme.colors.onSurfaceVariant}
              style={{ opacity: 0.5 }}
            />
            <Text
              variant="headlineSmall"
              style={[styles.emptyStateTitle, { color: theme.colors.onSurface }]}
            >
              No Submissions Found
            </Text>
            <Text
              variant="bodyMedium"
              style={[styles.emptyStateSubtitle, { color: theme.colors.onSurfaceVariant }]}
            >
              There are no evaluated submissions for this paper yet.
            </Text>
          </View>
        )}

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
    flexDirection: "row",
    alignItems: "center",
  },
  backButton: {
    padding: 8,
    marginRight: 16,
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
    fontSize: 14,
  },
  headerIcon: {
    opacity: 0.8,
  },
  scrollContent: {
    padding: 20,
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
  summaryCard: {
    marginBottom: 20,
    borderRadius: 16,
    elevation: 3,
    shadowColor: "#000",
    shadowOffset: {
      width: 0,
      height: 2,
    },
    shadowOpacity: 0.1,
    shadowRadius: 8,
  },
  summaryTitle: {
    fontWeight: "700",
    marginBottom: 20,
    textAlign: "center",
  },
  statsGrid: {
    flexDirection: "row",
    flexWrap: "wrap",
    justifyContent: "space-between",
  },
  statBox: {
    width: "48%",
    alignItems: "center",
    paddingVertical: 16,
    marginBottom: 16,
  },
  statValue: {
    fontWeight: "700",
    marginBottom: 4,
  },
  statLabel: {
    textAlign: "center",
    fontSize: 12,
  },
  sectionTitle: {
    fontWeight: "600",
    marginBottom: 16,
  },
  submissionCard: {
    marginBottom: 16,
    borderRadius: 16,
    elevation: 3,
    shadowColor: "#000",
    shadowOffset: {
      width: 0,
      height: 2,
    },
    shadowOpacity: 0.1,
    shadowRadius: 8,
  },
  cardContent: {
    padding: 20,
  },
  cardHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "flex-start",
    marginBottom: 16,
  },
  studentInfo: {
    flexDirection: "row",
    alignItems: "center",
    flex: 1,
  },
  studentAvatar: {
    marginRight: 16,
  },
  studentDetails: {
    flex: 1,
  },
  studentName: {
    fontWeight: "600",
    marginBottom: 4,
  },
  rollNumber: {
    fontWeight: "500",
    marginBottom: 4,
  },
  submissionTime: {
    fontSize: 12,
  },
  statusBadge: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: "#E8F5E8",
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 12,
    gap: 4,
  },
  statusText: {
    fontSize: 12,
    fontWeight: "600",
  },
  scoreSection: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: 16,
  },
  scoreDisplay: {
    flex: 1,
  },
  scoreText: {
    fontWeight: "700",
    marginBottom: 4,
  },
  scoreLabel: {
    fontSize: 14,
  },
  gradeSection: {
    alignItems: "center",
  },
  gradeText: {
    fontWeight: "700",
  },
  percentageText: {
    fontSize: 12,
  },
  progressBar: {
    height: 8,
    borderRadius: 4,
    overflow: "hidden",
    marginBottom: 16,
  },
  progressFill: {
    height: "100%",
    borderRadius: 4,
  },
  chipsContainer: {
    flexDirection: "row",
    flexWrap: "wrap",
    marginBottom: 16,
    gap: 8,
  },
  chip: {
    marginRight: 0,
  },
  cardFooter: {
    alignItems: "center",
  },
  detailsButton: {
    borderRadius: 12,
    minWidth: 160,
  },
  buttonContent: {
    paddingVertical: 8,
  },
  buttonLabel: {
    fontSize: 14,
    fontWeight: "600",
  },
  emptyState: {
    flex: 1,
    alignItems: "center",
    justifyContent: "center",
    paddingVertical: 80,
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