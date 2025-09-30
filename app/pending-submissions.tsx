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

const { width } = Dimensions.get("window");

interface PendingSubmission {
  fileId?: string;
  submissionId?: number;
  fileName: string;
  studentName: string;
  rollNo: string;
  uploadedAt: string;
  paperName: string;
  source: 'drive' | 'database' | 'minio';
  imageUrl?: string;
  totalPages?: number;
  pages?: Array<{
    pageNumber: number;
    fileId?: string;
    fileName: string;
    submissionId?: number;
    imageUrl?: string;
    uploadedAt: string;
  }>;
}

export default function PendingSubmissionsScreen() {
  const params = useLocalSearchParams();
  const paperId = params.paperId as string;
  const paperName = params.paperName as string;
  
  const [pendingSubmissions, setPendingSubmissions] = useState<PendingSubmission[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [evaluating, setEvaluating] = useState<string | null>(null);
  const { theme, isDarkMode } = useTheme();
  const url = process.env.EXPO_PUBLIC_API_URL;


  useEffect(() => {
    fetchPendingSubmissions();
  }, [paperId]);

  const fetchPendingSubmissions = async () => {
    try {
      setLoading(true);

      const response = await fetch(`${url}/api/submissions/pending-files/${paperId}`);

      if (response.ok) {
        const data = await response.json();
        setPendingSubmissions(data.pendingSubmissions || []);
      } else {
        throw new Error('Failed to fetch pending submissions');
      }
    } catch (error: any) {
      console.error("Error fetching pending submissions:", error);
      Alert.alert("Error", "Failed to load pending submissions");
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  const onRefresh = () => {
    setRefreshing(true);
    fetchPendingSubmissions();
  };

  const handleEvaluate = async (submission: PendingSubmission) => {
    try {
      const submissionKey = submission.fileId || submission.submissionId?.toString() || submission.fileName;
      setEvaluating(submissionKey);
      console.log('Starting evaluation for submission:', submission);

      const requestBody = {
        paperId: paperId,
        studentName: submission.studentName,
        rollNo: submission.rollNo,
        source: submission.source,
        // Handle multi-page submissions
        ...(submission.totalPages && submission.totalPages > 1 
          ? { 
              pages: submission.pages,
              fileName: `${submission.studentName}_${submission.totalPages}_pages`
            }
          : submission.source === 'drive'
            ? { fileId: submission.fileId, fileName: submission.fileName }
            : { submissionId: submission.submissionId, imageUrl: submission.imageUrl }
        )
      };

      console.log('Evaluation request body:', requestBody);

      const response = await fetch(`${url}/api/submissions/evaluate-pending`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(requestBody),
      });

      if (response.ok) {
        const result = await response.json();
        console.log('Evaluation result:', result);
        Alert.alert(
          "Evaluation Complete",
          `${submission.studentName} scored ${result.score}/${result.maxPossibleScore || result.totalQuestions} (${result.percentage.toFixed(1)}%)`,
          [
            {
              text: "View Results",
              onPress: () => {
                router.push({
                  pathname: '/result',
                  params: {
                    submissionId: result.submissionId.toString(),
                    studentName: submission.studentName,
                    paperName: paperName,
                    score: result.score.toString(),
                    total: (result.maxPossibleScore || result.totalQuestions).toString(),
                    percentage: result.percentage.toString()
                  }
                });
              }
            },
            { 
              text: "OK", 
              style: "default",
              onPress: () => {
                // Refresh the list to remove evaluated submission
                fetchPendingSubmissions();
              }
            }
          ]
        );
      } else {
        const errorData = await response.json().catch(() => ({}));
        console.error('Evaluation failed:', response.status, errorData);
        throw new Error(errorData.error || `Evaluation failed with status ${response.status}`);
      }
    } catch (error: any) {
      console.error("Evaluation error:", error);
      Alert.alert(
        "Evaluation Failed", 
        error.message || "Failed to evaluate submission. Please try again.",
        [
          { text: "OK", style: "default" },
          { text: "Retry", onPress: () => handleEvaluate(submission) }
        ]
      );
    } finally {
      setEvaluating(null);
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

  const PendingSubmissionCard = ({ submission }: { submission: PendingSubmission }) => {
    const submissionKey = submission.fileId || submission.submissionId?.toString() || submission.fileName;
    const isEvaluating = evaluating === submissionKey;

    return (
      <Card style={[styles.submissionCard, { backgroundColor: theme.colors.surface }]}>
        <Card.Content style={styles.cardContent}>
          <View style={styles.cardHeader}>
            <View style={styles.studentInfo}>
              <Avatar.Text
                size={48}
                label={submission.studentName ? submission.studentName.substring(0, 2).toUpperCase() : 'NA'}
                style={[styles.studentAvatar, { backgroundColor: '#F59E0B' }]}
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
                  Uploaded: {formatDate(submission.uploadedAt)}
                </Text>
              </View>
            </View>
            
            <View style={styles.statusBadge}>
              <Ionicons name="time-outline" size={16} color="#F59E0B" />
              <Text style={[styles.statusText, { color: '#F59E0B' }]}>
                Pending
              </Text>
            </View>
          </View>

          <View style={styles.submissionDetails}>
            <Chip 
              mode="outlined"
              textStyle={{ color: submission.source === 'drive' ? '#2196F3' : '#9C27B0', fontSize: 12 }}
              style={[styles.sourceChip, {
                borderColor: submission.source === 'drive' ? '#2196F3' : '#9C27B0'
              }]}
              compact
              icon={submission.source === 'minio' || submission.source === 'drive' ? 'cloud' : 'database'}
            >
              {submission.source === 'minio' || submission.source === 'drive' ? 'MinIO Storage' : 'Database'}
            </Chip>
            {submission.totalPages && submission.totalPages > 1 ? (
              <Chip 
                mode="outlined"
                textStyle={{ color: '#FF6B35', fontSize: 12 }}
                style={[styles.sourceChip, { borderColor: '#FF6B35', marginLeft: 8 }]}
                compact
                icon="file-multiple"
              >
                {submission.totalPages} Pages
              </Chip>
            ) : null}
            <Text
              variant="bodySmall"
              style={[styles.fileName, { color: theme.colors.onSurfaceVariant }]}
              numberOfLines={1}
            >
              {submission.totalPages && submission.totalPages > 1 
                ? `${submission.studentName} - ${submission.totalPages} page submission`
                : submission.fileName}
            </Text>
          </View>

          <View style={styles.cardFooter}>
            <Button
              mode="contained"
              onPress={() => handleEvaluate(submission)}
              disabled={isEvaluating}
              loading={isEvaluating}
              style={[styles.evaluateButton, { backgroundColor: '#F59E0B' }]}
              contentStyle={styles.buttonContent}
              labelStyle={styles.buttonLabel}
              icon="play-circle-outline"
            >
              {isEvaluating 
                ? `Evaluating ${submission.totalPages && submission.totalPages > 1 ? `${submission.totalPages} pages...` : '...'}`
                : `Evaluate ${submission.totalPages && submission.totalPages > 1 ? `${submission.totalPages} Pages` : 'Now'}`}
            </Button>
          </View>
        </Card.Content>
      </Card>
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
            Loading pending submissions...
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
        colors={["#F59E0B", "#D97706"]}
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
              Yet to be Evaluated
            </Text>
            <Text variant="bodyLarge" style={styles.headerSubtitle}>
              {paperName} • {pendingSubmissions.length} student{pendingSubmissions.length === 1 ? '' : 's'} pending
              {pendingSubmissions.some(s => s.totalPages && s.totalPages > 1) && 
                ` (${pendingSubmissions.reduce((total, s) => total + (s.totalPages || 1), 0)} total pages)`}
            </Text>
          </View>
          <View style={styles.headerIcon}>
            <Ionicons name="time-outline" size={32} color="white" />
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
        {pendingSubmissions.length > 0 ? (
          <>
            <Text variant="titleMedium" style={[styles.sectionTitle, { color: theme.colors.onSurface }]}>
              {pendingSubmissions.some(s => s.totalPages && s.totalPages > 1) 
                ? 'Students awaiting evaluation (multi-page submissions consolidated)'
                : 'Submissions awaiting evaluation'}
            </Text>
            {pendingSubmissions
              .sort((a, b) => new Date(b.uploadedAt).getTime() - new Date(a.uploadedAt).getTime())
              .map((submission, index) => (
                <PendingSubmissionCard
                  key={submission.fileId || submission.submissionId || index}
                  submission={submission}
                />
              ))}
          </>
        ) : (
          <View style={styles.emptyState}>
            <Ionicons
              name="checkmark-circle-outline"
              size={80}
              color={theme.colors.onSurfaceVariant}
              style={{ opacity: 0.5 }}
            />
            <Text
              variant="headlineSmall"
              style={[styles.emptyStateTitle, { color: theme.colors.onSurface }]}
            >
              All caught up!
            </Text>
            <Text
              variant="bodyMedium"
              style={[styles.emptyStateSubtitle, { color: theme.colors.onSurfaceVariant }]}
            >
              No submissions are pending evaluation at the moment.
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
    backgroundColor: "#FFF3CD",
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 12,
    gap: 4,
  },
  statusText: {
    fontSize: 12,
    fontWeight: "600",
  },
  submissionDetails: {
    flexDirection: "row",
    alignItems: "center",
    marginBottom: 16,
    gap: 12,
  },
  sourceChip: {
    marginRight: 0,
  },
  fileName: {
    flex: 1,
    fontSize: 12,
  },
  cardFooter: {
    alignItems: "center",
  },
  evaluateButton: {
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
});