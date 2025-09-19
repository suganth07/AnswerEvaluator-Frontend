import React, { useState, useEffect } from "react";
import {
  View,
  StyleSheet,
  ScrollView,
  RefreshControl,
  TouchableOpacity,
  Dimensions,
  Alert,
  TextInput,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { Text, Card, Avatar, Chip, ActivityIndicator, Button, IconButton } from "react-native-paper";
import { useTheme } from "../../context/ThemeContext";
import { paperService, submissionService } from "../../services/api";
import { router, useLocalSearchParams } from "expo-router";
import { Ionicons } from "@expo/vector-icons";
import { LinearGradient } from "expo-linear-gradient";

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
  roll_no: string;
  score: number | null | undefined;
  total_questions: number | null | undefined;
  percentage: number | null | undefined;
  evaluation_method: string;
  evaluation_status: string;
  submitted_at: string;
}

interface PaperWithSubmissions extends Paper {
  pendingSubmissions: Submission[];
  evaluatedSubmissions: Submission[];
}

export default function SubmissionsScreen() {
  const params = useLocalSearchParams();
  const paperId = params.paperId as string;
  
  const [papers, setPapers] = useState<PaperWithSubmissions[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [pendingSearch, setPendingSearch] = useState('');
  const [evaluatedSearch, setEvaluatedSearch] = useState('');
  const [evaluatingId, setEvaluatingId] = useState<number | null>(null);
  const { theme, isDarkMode } = useTheme();
  const url = process.env.EXPO_PUBLIC_API_URL;


  useEffect(() => {
    fetchSubmissionsData();
  }, [paperId]);

  const fetchSubmissionsData = async () => {
    try {
      setLoading(true);
      
      if (paperId) {
        // Fetch specific paper only
        const paper = await paperService.getDetails(paperId);
        
        // Fetch pending and evaluated submissions separately
        const pendingResponse = await fetch(`${url}/api/submissions/paper/${paperId}/status/pending`);
        const evaluatedResponse = await fetch(`${url}/api/submissions/paper/${paperId}/status/evaluated`);

        const pendingSubmissions = pendingResponse.ok ? await pendingResponse.json() : [];
        const evaluatedSubmissions = evaluatedResponse.ok ? await evaluatedResponse.json() : [];
        
        setPapers([{
          ...paper,
          pendingSubmissions: pendingSubmissions || [],
          evaluatedSubmissions: evaluatedSubmissions || []
        }]);
      } else {
        // Fetch all papers
        const papersData = await paperService.getAll();
        
        // Fetch submissions for each paper
        const papersWithSubmissions = await Promise.all(
          papersData.map(async (paper: Paper) => {
            try {
              const pendingResponse = await fetch(`${url}/api/submissions/paper/${paper.id}/status/pending`);
              const evaluatedResponse = await fetch(`${url}/api/submissions/paper/${paper.id}/status/evaluated`);

              const pendingSubmissions = pendingResponse.ok ? await pendingResponse.json() : [];
              const evaluatedSubmissions = evaluatedResponse.ok ? await evaluatedResponse.json() : [];
              
              return {
                ...paper,
                pendingSubmissions: pendingSubmissions || [],
                evaluatedSubmissions: evaluatedSubmissions || []
              };
            } catch (error) {
              console.error(`Error fetching submissions for paper ${paper.id}:`, error);
              return {
                ...paper,
                pendingSubmissions: [],
                evaluatedSubmissions: []
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

  const handleEvaluateSubmission = async (submissionId: number) => {
    setEvaluatingId(submissionId);
    
    try {
      const response = await fetch(`${url}/api/submissions/evaluate/${submissionId}`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        }
      });

      const result = await response.json();

      if (response.ok) {
        Alert.alert(
          'Evaluation Complete!',
          `Student: ${result.studentName}\nRoll No: ${result.rollNo}\nScore: ${result.score}/${result.totalQuestions} (${result.percentage}%)`,
          [{ text: 'OK', onPress: () => fetchSubmissionsData() }]
        );
      } else {
        if (result.error === 'Roll number mismatch') {
          Alert.alert(
            'Roll Number Mismatch',
            `${result.message}\n\nPaper Roll No: ${result.paperRollNo}\nEntered Roll No: ${result.enteredRollNo}`,
            [{ text: 'OK' }]
          );
        } else {
          throw new Error(result.error || 'Evaluation failed');
        }
      }
    } catch (error: any) {
      Alert.alert('Evaluation Failed', error.message || 'Failed to evaluate submission');
    } finally {
      setEvaluatingId(null);
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

  const getScoreColor = (percentage: number) => {
    if (percentage >= 80) return "#22C55E"; // Green
    if (percentage >= 60) return "#F59E0B"; // Yellow
    return "#EF4444"; // Red
  };

  const filterSubmissions = (submissions: Submission[], searchTerm: string) => {
    if (!searchTerm.trim()) return submissions;
    return submissions.filter(sub => 
      sub.roll_no?.toLowerCase().includes(searchTerm.toLowerCase()) ||
      sub.student_name?.toLowerCase().includes(searchTerm.toLowerCase())
    );
  };

  const PendingSubmissionCard = ({ submission, paper }: { submission: Submission; paper: Paper }) => (
    <View style={[styles.submissionCard, { backgroundColor: theme.colors.surface }]}>
      <View style={styles.submissionCardHeader}>
        <View style={styles.studentInfo}>
          <Avatar.Text
            size={36}
            label={submission.student_name ? submission.student_name.substring(0, 2).toUpperCase() : 'NA'}
            style={[styles.studentAvatar, { backgroundColor: '#F59E0B' }]}
            labelStyle={{ fontSize: 14, color: 'white' }}
          />
          <View style={styles.studentDetails}>
            <Text
              variant="titleSmall"
              style={[styles.studentName, { color: theme.colors.onSurface }]}
              numberOfLines={1}
            >
              {submission.student_name || 'Unknown Student'}
            </Text>
            <Text
              variant="bodySmall"
              style={[styles.rollNumber, { color: theme.colors.primary }]}
            >
              Roll: {submission.roll_no || 'N/A'}
            </Text>
            <Text
              variant="bodySmall"
              style={[styles.submissionTime, { color: theme.colors.onSurfaceVariant }]}
            >
              {formatDate(submission.submitted_at)}
            </Text>
          </View>
        </View>
        
        <View style={styles.actionContainer}>
          <Chip
            mode="outlined"
            compact
            style={[styles.statusChip, { backgroundColor: '#FEF3C7', borderColor: '#F59E0B' }]}
            textStyle={{ fontSize: 10, color: '#92400E' }}
          >
            Pending
          </Chip>
          <Button
            mode="contained"
            onPress={() => handleEvaluateSubmission(submission.id)}
            disabled={evaluatingId === submission.id}
            loading={evaluatingId === submission.id}
            style={[styles.evaluateButton, { backgroundColor: theme.colors.primary }]}
            labelStyle={{ fontSize: 12 }}
          >
            {evaluatingId === submission.id ? 'Evaluating...' : 'Evaluate'}
          </Button>
        </View>
      </View>
    </View>
  );

  const EvaluatedSubmissionCard = ({ submission, paper }: { submission: Submission; paper: Paper }) => (
    <TouchableOpacity
      onPress={() => router.push({
        pathname: "/submission-detail",
        params: {
          submissionId: submission.id,
          studentName: submission.student_name,
          paperName: paper.name,
          score: submission.score || 0,
          totalQuestions: submission.total_questions || 0,
          percentage: safePercentage(submission.percentage).toFixed(1)
        }
      })}
      style={[styles.submissionCard, { backgroundColor: theme.colors.surface }]}
    >
      <View style={styles.submissionCardHeader}>
        <View style={styles.studentInfo}>
          <Avatar.Text
            size={36}
            label={submission.student_name ? submission.student_name.substring(0, 2).toUpperCase() : 'NA'}
            style={[styles.studentAvatar, { backgroundColor: theme.colors.primary }]}
            labelStyle={{ fontSize: 14, color: theme.colors.onPrimary }}
          />
          <View style={styles.studentDetails}>
            <Text
              variant="titleSmall"
              style={[styles.studentName, { color: theme.colors.onSurface }]}
              numberOfLines={1}
            >
              {submission.student_name || 'Unknown Student'}
            </Text>
            <Text
              variant="bodySmall"
              style={[styles.rollNumber, { color: theme.colors.primary }]}
            >
              Roll: {submission.roll_no || 'N/A'}
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
          <Chip
            mode="outlined"
            compact
            style={[styles.statusChip, { backgroundColor: '#D1FAE5', borderColor: '#10B981' }]}
            textStyle={{ fontSize: 10, color: '#047857' }}
          >
            Evaluated
          </Chip>
        </View>
      </View>
    </TouchableOpacity>
  );

  const SubmissionsSection = ({ 
    title, 
    submissions, 
    searchValue, 
    onSearchChange, 
    type 
  }: { 
    title: string; 
    submissions: Submission[]; 
    searchValue: string; 
    onSearchChange: (value: string) => void; 
    type: 'pending' | 'evaluated';
  }) => {
    const filteredSubmissions = filterSubmissions(submissions, searchValue);
    
    return (
      <View style={styles.sectionContainer}>
        <View style={styles.sectionHeader}>
          <Text variant="titleLarge" style={[styles.sectionTitle, { color: theme.colors.onSurface }]}>
            {title} ({submissions.length})
          </Text>
          
          <View style={styles.searchContainer}>
            <TextInput
              style={[styles.searchInput, { 
                backgroundColor: theme.colors.surface,
                borderColor: theme.colors.outline,
                color: theme.colors.onSurface
              }]}
              placeholder="Search by roll number or name..."
              placeholderTextColor={theme.colors.onSurfaceVariant}
              value={searchValue}
              onChangeText={onSearchChange}
            />
            <IconButton
              icon="magnify"
              size={20}
              iconColor={theme.colors.onSurfaceVariant}
              style={styles.searchIcon}
            />
          </View>
        </View>

        <View style={styles.submissionsContainer}>
          {filteredSubmissions.length > 0 ? (
            filteredSubmissions
              .sort((a, b) => new Date(b.submitted_at).getTime() - new Date(a.submitted_at).getTime())
              .map((submission) => (
                type === 'pending' ? (
                  <PendingSubmissionCard
                    key={submission.id}
                    submission={submission}
                    paper={papers[0]}
                  />
                ) : (
                  <EvaluatedSubmissionCard
                    key={submission.id}
                    submission={submission}
                    paper={papers[0]}
                  />
                )
              ))
          ) : searchValue.trim() ? (
            <View style={styles.emptySubmissions}>
              <Ionicons
                name="search-outline"
                size={48}
                color={theme.colors.onSurfaceVariant}
                style={{ opacity: 0.5 }}
              />
              <Text
                variant="bodyLarge"
                style={[styles.emptyText, { color: theme.colors.onSurfaceVariant }]}
              >
                No submissions found for "{searchValue}"
              </Text>
            </View>
          ) : (
            <View style={styles.emptySubmissions}>
              <Ionicons
                name={type === 'pending' ? "time-outline" : "checkmark-circle-outline"}
                size={48}
                color={theme.colors.onSurfaceVariant}
                style={{ opacity: 0.5 }}
              />
              <Text
                variant="bodyLarge"
                style={[styles.emptyText, { color: theme.colors.onSurfaceVariant }]}
              >
                No {type} submissions
              </Text>
            </View>
          )}
        </View>
      </View>
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
          {paperId && (
            <TouchableOpacity
              style={styles.backButton}
              onPress={() => router.back()}
            >
              <Ionicons name="arrow-back" size={24} color="white" />
            </TouchableOpacity>
          )}
          <View style={styles.headerTextContainer}>
            <Text variant="headlineLarge" style={styles.headerTitle}>
              {paperId && papers[0] ? `${papers[0].name}` : "Submissions"}
            </Text>
            <Text variant="bodyLarge" style={styles.headerSubtitle}>
              {paperId ? "Manage and evaluate student submissions" : "View all student submissions and results"}
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
        {papers.length > 0 && papers[0] ? (
          <>
            {/* Pending Submissions Section */}
            <SubmissionsSection
              title="Pending Evaluation"
              submissions={papers[0].pendingSubmissions || []}
              searchValue={pendingSearch}
              onSearchChange={setPendingSearch}
              type="pending"
            />

            {/* Evaluated Submissions Section */}
            <SubmissionsSection
              title="Evaluated"
              submissions={papers[0].evaluatedSubmissions || []}
              searchValue={evaluatedSearch}
              onSearchChange={setEvaluatedSearch}
              type="evaluated"
            />
          </>
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
  rollNumber: {
    fontSize: 12,
    fontWeight: "500",
  },
  submissionTime: {
    fontSize: 12,
  },
  actionContainer: {
    alignItems: "center",
    marginLeft: 16,
  },
  statusChip: {
    height: 24,
    marginBottom: 8,
  },
  evaluateButton: {
    marginTop: 4,
    minWidth: 80,
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
  sectionContainer: {
    marginBottom: 24,
    marginHorizontal: 16,
  },
  sectionHeader: {
    marginBottom: 16,
  },
  sectionTitle: {
    fontWeight: "700",
    marginBottom: 12,
  },
  searchContainer: {
    position: "relative",
    marginTop: 8,
  },
  searchInput: {
    height: 44,
    paddingHorizontal: 16,
    paddingRight: 50,
    borderRadius: 12,
    borderWidth: 1,
    fontSize: 14,
  },
  searchIcon: {
    position: "absolute",
    right: 4,
    top: 2,
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