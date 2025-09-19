import React, { useState, useEffect } from "react";
import {
  View,
  StyleSheet,
  FlatList,
  Alert,
  RefreshControl,
  TouchableOpacity,
  Dimensions,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { Text, ActivityIndicator, Avatar } from "react-native-paper";
import { useAuth } from "../../context/AuthContext";
import { useTheme } from "../../context/ThemeContext";
import { paperService } from "../../services/api";
import { router } from "expo-router";
import { Ionicons } from "@expo/vector-icons";
import { LinearGradient } from "expo-linear-gradient";

const { width } = Dimensions.get("window");

interface Paper {
  id: number;
  name: string;
  uploaded_at: string;
  question_count: number;
  total_pages: number;
  question_type: string;
  pendingCount?: number;
  evaluatedCount?: number;
}

export default function TestsScreen() {
  const [papers, setPapers] = useState<Paper[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const { logout, user } = useAuth();
  const { theme, isDarkMode, toggleTheme } = useTheme();
  const url=process.env.EXPO_PUBLIC_API_URL;

  useEffect(() => {
    fetchPapers();
  }, []);

  const fetchPapers = async () => {
    try {
      const data = await paperService.getAll();
      
      // Fetch submission counts for each paper
      const papersWithCounts = await Promise.all(
        data.map(async (paper: Paper) => {
          try {
            // Fetch pending submissions count
            const pendingResponse = await fetch(`${url}/api/submissions/pending-files/${paper.id}`);
            const evaluatedResponse = await fetch(`${url}/api/submissions/paper/${paper.id}/status/evaluated`);
            
            let pendingCount = 0;
            let evaluatedCount = 0;
            
            if (pendingResponse.ok) {
              const pendingData = await pendingResponse.json();
              pendingCount = pendingData.pendingSubmissions?.length || 0;
            }
            
            if (evaluatedResponse.ok) {
              const evaluatedData = await evaluatedResponse.json();
              evaluatedCount = evaluatedData.submissions?.length || 0;
            }
            
            return {
              ...paper,
              pendingCount,
              evaluatedCount
            };
          } catch (error) {
            console.error(`Error fetching counts for paper ${paper.id}:`, error);
            return {
              ...paper,
              pendingCount: 0,
              evaluatedCount: 0
            };
          }
        })
      );
      
      setPapers(papersWithCounts);
    } catch (error: any) {
      Alert.alert(
        "Error",
        error.response?.data?.error || "Failed to fetch papers"
      );
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  const onRefresh = () => {
    setRefreshing(true);
    fetchPapers();
  };

  const viewSubmissions = (paper: Paper) => {
    router.push({
      pathname: "/(tabs)/submissions",
      params: { 
        paperId: paper.id.toString(),
        paperName: paper.name
      }
    });
  };

  // const viewPaperDetails = (paper: Paper) => {
  //   router.push({
  //     pathname: "/result",
  //     params: {
  //       paperId: paper.id,
  //       paperName: paper.name,
  //       isAdmin: "true",
  //     },
  //   });
  // };

  const viewQuestions = (paper: Paper) => {
    router.push({
      pathname: "/questions",
      params: {
        paperId: paper.id,
        paperName: paper.name,
      },
    });
  };

  const deletePaper = (paper: Paper) => {
    Alert.alert(
      "Delete Test",
      `Are you sure you want to delete "${paper.name}"? This action cannot be undone and will remove all associated questions and submissions.`,
      [
        { text: "Cancel", style: "cancel" },
        {
          text: "Delete",
          style: "destructive",
          onPress: async () => {
            try {
              await paperService.delete(paper.id.toString());
              Alert.alert("Success", "Test deleted successfully");
              fetchPapers(); // Refresh the list
            } catch (error: any) {
              Alert.alert(
                "Error",
                error.response?.data?.error || "Failed to delete test"
              );
            }
          },
        },
      ]
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

  const getQuestionTypeInfo = (questionType: string) => {
    switch (questionType) {
      case "omr":
        return {
          label: "OMR",
          color: isDarkMode ? "#60A5FA" : "#3B82F6",
          icon: "radio-button-on" as const,
          bgColor: isDarkMode
            ? "rgba(96, 165, 250, 0.1)"
            : "rgba(59, 130, 246, 0.1)",
        };
      case "traditional":
        return {
          label: "Traditional",
          color: isDarkMode ? "#34D399" : "#10B981",
          icon: "document-text" as const,
          bgColor: isDarkMode
            ? "rgba(52, 211, 153, 0.1)"
            : "rgba(16, 185, 129, 0.1)",
        };
      case "mixed":
        return {
          label: "Mixed",
          color: isDarkMode ? "#FBBF24" : "#F59E0B",
          icon: "albums" as const,
          bgColor: isDarkMode
            ? "rgba(251, 191, 36, 0.1)"
            : "rgba(245, 158, 11, 0.1)",
        };
      case "fill_blanks":
        return {
          label: "Fill Blanks",
          color: isDarkMode ? "#A78BFA" : "#8B5CF6",
          icon: "create" as const,
          bgColor: isDarkMode
            ? "rgba(167, 139, 250, 0.1)"
            : "rgba(139, 92, 246, 0.1)",
        };
      default:
        return {
          label: "Traditional",
          color: isDarkMode ? "#34D399" : "#10B981",
          icon: "document-text" as const,
          bgColor: isDarkMode
            ? "rgba(52, 211, 153, 0.1)"
            : "rgba(16, 185, 129, 0.1)",
        };
    }
  };

  // Test Card Component
  const TestCard = ({ item }: { item: Paper }) => {
    const questionTypeInfo = getQuestionTypeInfo(item.question_type);

    return (
      <TouchableOpacity
        style={[styles.testCard, { backgroundColor: theme.colors.surface }]}
        // onPress={() => viewPaperDetails(item)}
        activeOpacity={0.7}
      >
        <View style={styles.cardHeader}>
          <View style={styles.cardTitleSection}>
            <Text
              variant="titleLarge"
              style={[styles.cardTitle, { color: theme.colors.onSurface }]}
              numberOfLines={2}
            >
              {item.name}
            </Text>
            <Text
              variant="bodySmall"
              style={[
                styles.cardDate,
                { color: theme.colors.onSurfaceVariant },
              ]}
            >
              {formatDate(item.uploaded_at)}
            </Text>
          </View>
          <View style={styles.cardHeaderIcons}>
            <TouchableOpacity
              style={[
                styles.deleteButton,
                { backgroundColor: isDarkMode ? "#DC2626" : "#EF4444" },
              ]}
              onPress={() => deletePaper(item)}
            >
              <Ionicons name="trash-outline" size={16} color="white" />
            </TouchableOpacity>
            <View
              style={[
                styles.typeIndicator,
                { backgroundColor: questionTypeInfo.bgColor },
              ]}
            >
              <Ionicons
                name={questionTypeInfo.icon}
                size={20}
                color={questionTypeInfo.color}
              />
            </View>
          </View>
        </View>

        <View style={styles.cardStats}>
          <View style={styles.statRow}>
            <View style={styles.statItem}>
              <Ionicons
                name="help-circle-outline"
                size={16}
                color={theme.colors.onSurfaceVariant}
              />
              <Text
                variant="bodySmall"
                style={[
                  styles.statText,
                  { color: theme.colors.onSurfaceVariant },
                ]}
              >
                {item.question_count} Questions
              </Text>
            </View>
            {item.total_pages && item.total_pages > 1 && (
              <View style={styles.statItem}>
                <Ionicons
                  name="document-outline"
                  size={16}
                  color={theme.colors.onSurfaceVariant}
                />
                <Text
                  variant="bodySmall"
                  style={[
                    styles.statText,
                    { color: theme.colors.onSurfaceVariant },
                  ]}
                >
                  {item.total_pages} Pages
                </Text>
              </View>
            )}
            <View
              style={[
                styles.typeChip,
                { backgroundColor: questionTypeInfo.bgColor },
              ]}
            >
              <Text
                variant="labelSmall"
                style={[styles.typeChipText, { color: questionTypeInfo.color }]}
              >
                {questionTypeInfo.label}
              </Text>
            </View>
          </View>
          
          {/* Submission Stats Row */}
          <View style={styles.submissionStatsRow}>
            <View style={styles.statItem}>
              <Ionicons
                name="time-outline"
                size={16}
                color="#F59E0B"
              />
              <Text
                variant="bodySmall"
                style={[
                  styles.statText,
                  { color: "#F59E0B" },
                ]}
              >
                {item.pendingCount || 0} Pending
              </Text>
            </View>
            <View style={styles.statItem}>
              <Ionicons
                name="checkmark-circle-outline"
                size={16}
                color="#10B981"
              />
              <Text
                variant="bodySmall"
                style={[
                  styles.statText,
                  { color: "#10B981" },
                ]}
              >
                {item.evaluatedCount || 0} Evaluated
              </Text>
            </View>
            <Text
              variant="bodySmall"
              style={[
                styles.totalSubmissionsText,
                { color: theme.colors.onSurfaceVariant },
              ]}
            >
              Total: {(item.pendingCount || 0) + (item.evaluatedCount || 0)} submissions
            </Text>
          </View>
        </View>

        <View style={styles.cardActions}>
          <TouchableOpacity
            style={[
              styles.actionButton,
              { backgroundColor: isDarkMode ? "#374151" : "#F3F4F6" },
            ]}
            onPress={() => viewQuestions(item)}
          >
            <Ionicons
              name="list-outline"
              size={16}
              color={theme.colors.onSurface}
            />
            <Text
              variant="bodySmall"
              style={[
                styles.actionButtonText,
                { color: theme.colors.onSurface },
              ]}
            >
              Questions
            </Text>
          </TouchableOpacity>
          <TouchableOpacity
            style={[styles.actionButton, styles.primaryActionButton]}
            onPress={() => viewSubmissions(item)}
          >
            <LinearGradient
              colors={["#6366F1", "#8B5CF6"]}
              style={styles.actionButtonGradient}
              start={{ x: 0, y: 0 }}
              end={{ x: 1, y: 1 }}
            >
              <Ionicons name="people-outline" size={16} color="white" />
              <Text
                variant="bodySmall"
                style={[styles.actionButtonText, { color: "white" }]}
              >
                Submissions
              </Text>
              {((item.pendingCount || 0) + (item.evaluatedCount || 0)) > 0 && (
                <View style={styles.submissionBadge}>
                  <Text style={styles.submissionBadgeText}>
                    {(item.pendingCount || 0) + (item.evaluatedCount || 0)}
                  </Text>
                </View>
              )}
            </LinearGradient>
          </TouchableOpacity>
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
            style={[
              styles.loadingText,
              { color: theme.colors.onSurfaceVariant },
            ]}
          >
            Loading your tests...
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
      <View style={styles.header}>
        <View style={styles.headerContent}>
          <View style={styles.headerTextSection}>
            <Text
              variant="headlineLarge"
              style={[styles.headerTitle, { color: theme.colors.onSurface }]}
            >
              Your Tests
            </Text>
            <Text
              variant="bodyMedium"
              style={[
                styles.headerSubtitle,
                { color: theme.colors.onSurfaceVariant },
              ]}
            >
              {papers.length} test{papers.length !== 1 ? "s" : ""} created
            </Text>
          </View>
          <View style={styles.headerButtonContainer}>
            <TouchableOpacity
              style={styles.headerAddButton}
              onPress={() => router.push("/upload")}
            >
              <LinearGradient
                colors={isDarkMode ? ["#6366F1", "#8B5CF6"] : ["#6366F1", "#8B5CF6"]}
                style={styles.headerAddButtonGradient}
                start={{ x: 0, y: 0 }}
                end={{ x: 1, y: 1 }}
              >
                <Ionicons name="cloud-upload" size={18} color="white" />
              </LinearGradient>
            </TouchableOpacity>
            <TouchableOpacity
              style={[styles.headerAddButton, { marginLeft: 8 }]}
              onPress={() => router.push("/manual-test-setup")}
            >
              <LinearGradient
                colors={isDarkMode ? ["#22C55E", "#16A34A"] : ["#22C55E", "#16A34A"]}
                style={styles.headerAddButtonGradient}
                start={{ x: 0, y: 0 }}
                end={{ x: 1, y: 1 }}
              >
                <Ionicons name="create" size={18} color="white" />
              </LinearGradient>
            </TouchableOpacity>
          </View>
          {/* <View style={styles.headerButtonContainer}>
            <TouchableOpacity
              style={styles.headerAddButton}
              onPress={() => router.push("/upload")}
            >
              <LinearGradient
                colors={isDarkMode ? ["#6366F1", "#8B5CF6"] : ["#6366F1", "#8B5CF6"]}
                style={styles.headerAddButtonGradient}
                start={{ x: 0, y: 0 }}
                end={{ x: 1, y: 1 }}
              >
                <Ionicons name="add" size={20} color="white" />
              </LinearGradient>
            </TouchableOpacity>
          </View> */}
        </View>
      </View>

      {/* Tests List */}
      <FlatList
        data={papers}
        renderItem={({ item }) => <TestCard item={item} />}
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
        ListEmptyComponent={
          <View style={styles.emptyContainer}>
            <View
              style={[
                styles.emptyIconContainer,
                { backgroundColor: isDarkMode ? "#374151" : "#F3F4F6" },
              ]}
            >
              <Ionicons
                name="document-text-outline"
                size={48}
                color={theme.colors.onSurfaceVariant}
              />
            </View>
            <Text
              variant="headlineSmall"
              style={[styles.emptyTitle, { color: theme.colors.onSurface }]}
            >
              No Tests Yet
            </Text>
            <Text
              variant="bodyMedium"
              style={[
                styles.emptyText,
                { color: theme.colors.onSurfaceVariant },
              ]}
            >
              Create your first test by uploading a question paper
            </Text>
            <TouchableOpacity
              style={[
                styles.emptyActionButton,
                { backgroundColor: theme.colors.primary },
              ]}
              onPress={() => router.push("/upload")}
            >
              <Ionicons name="add" size={20} color="white" />
              <Text
                variant="bodyMedium"
                style={[styles.emptyActionButtonText, { color: "white" }]}
              >
                Upload Test Paper
              </Text>
            </TouchableOpacity>
          </View>
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
  container: {
    flex: 1,
  },
  header: {
    paddingHorizontal: 20,
    paddingTop: 10,
    paddingBottom: 20,
  },
  headerContent: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
  },
  headerTextSection: {
    flex: 1,
  },
  headerTitle: {
    fontWeight: "700",
    marginBottom: 4,
  },
  headerSubtitle: {
    fontSize: 14,
    lineHeight: 20,
  },
  headerIconContainer: {
    width: 48,
    height: 48,
    borderRadius: 24,
    justifyContent: "center",
    alignItems: "center",
    elevation: 2,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
  },
  listContainer: {
    paddingHorizontal: 20,
    paddingBottom: 100,
  },
  testCard: {
    borderRadius: 16,
    padding: 20,
    marginBottom: 16,
    elevation: 3,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
  },
  cardHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "flex-start",
    marginBottom: 16,
  },
  cardTitleSection: {
    flex: 1,
    paddingRight: 12,
  },
  cardTitle: {
    fontWeight: "600",
    marginBottom: 4,
    fontSize: 18,
    lineHeight: 24,
  },
  cardDate: {
    fontSize: 13,
  },
  typeIndicator: {
    width: 44,
    height: 44,
    borderRadius: 22,
    justifyContent: "center",
    alignItems: "center",
  },
  cardHeaderIcons: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
  },
  deleteButton: {
    width: 40,
    height: 40,
    borderRadius: 16,
    justifyContent: "center",
    alignItems: "center",
  },
  cardStats: {
    marginBottom: 20,
  },
  statRow: {
    flexDirection: "row",
    alignItems: "center",
    flexWrap: "wrap",
    gap: 8,
    marginBottom: 8,
  },
  submissionStatsRow: {
    flexDirection: "row",
    alignItems: "center",
    flexWrap: "wrap",
    gap: 12,
    paddingTop: 8,
    borderTopWidth: 1,
    borderTopColor: "rgba(0,0,0,0.1)",
  },
  statItem: {
    flexDirection: "row",
    alignItems: "center",
    gap: 4,
  },
  statText: {
    fontSize: 13,
  },
  totalSubmissionsText: {
    fontSize: 12,
    fontStyle: "italic",
    marginLeft: "auto",
  },
  typeChip: {
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 12,
  },
  typeChipText: {
    fontSize: 12,
    fontWeight: "600",
  },
  cardActions: {
    flexDirection: "row",
    gap: 12,
  },
  actionButton: {
    flex: 1,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    paddingVertical: 12,
    paddingHorizontal: 16,
    borderRadius: 12,
    gap: 6,
  },
  actionButtonGradient: {
    flex: 1,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    paddingVertical: 12,
    paddingHorizontal: 16,
    borderRadius: 12,
    gap: 6,
  },
  primaryActionButton: {
    backgroundColor: "#6366F1",
    overflow: "hidden",
  },
  actionButtonText: {
    fontSize: 13,
    fontWeight: "500",
  },
  submissionBadge: {
    backgroundColor: "rgba(255,255,255,0.2)",
    borderRadius: 10,
    paddingHorizontal: 6,
    paddingVertical: 2,
    marginLeft: 4,
    minWidth: 20,
    alignItems: "center",
  },
  submissionBadgeText: {
    color: "white",
    fontSize: 11,
    fontWeight: "600",
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
  emptyContainer: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
    paddingTop: 80,
    paddingHorizontal: 20,
  },
  emptyIconContainer: {
    width: 96,
    height: 96,
    borderRadius: 48,
    justifyContent: "center",
    alignItems: "center",
    marginBottom: 24,
  },
  emptyTitle: {
    fontWeight: "600",
    marginBottom: 12,
    textAlign: "center",
  },
  emptyText: {
    textAlign: "center",
    lineHeight: 22,
    marginBottom: 32,
    paddingHorizontal: 20,
  },
  emptyActionButton: {
    flexDirection: "row",
    alignItems: "center",
    paddingHorizontal: 24,
    paddingVertical: 14,
    borderRadius: 25,
    gap: 8,
  },
  emptyActionButtonText: {
    fontWeight: "600",
  },
  headerAddButton: {
    width: 40,
    height: 40,
    borderRadius: 20,
    justifyContent: "center",
    alignItems: "center",
  },
  headerAddButtonGradient: {
    width: 40,
    height: 40,
    borderRadius: 20,
    justifyContent: "center",
    alignItems: "center",
  },
  headerButtonContainer: {
    flexDirection: "row",
    justifyContent: "center",
    alignItems: "center",
  },
});
