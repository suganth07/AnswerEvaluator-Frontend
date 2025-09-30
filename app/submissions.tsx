import React, { useState, useEffect } from "react";
import {
  View,
  StyleSheet,
  ScrollView,
  RefreshControl,
  TouchableOpacity,
  Dimensions,
  Alert,
  StatusBar,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { Text, ActivityIndicator, Surface, Chip } from "react-native-paper";
import { useTheme } from "../context/ThemeContext";
import { paperService } from "../services/api";
import { router, useLocalSearchParams } from "expo-router";
import { Ionicons, MaterialCommunityIcons } from "@expo/vector-icons";
import { LinearGradient } from "expo-linear-gradient";
import * as FileSystem from 'expo-file-system/legacy';
import * as Sharing from 'expo-sharing';

const { width } = Dimensions.get("window");

interface Paper {
  id: number;
  name: string;
  uploaded_at: string;
  question_count: number;
  question_type: string;
}

export default function SubmissionsScreen() {
  const params = useLocalSearchParams();
  const paperId = params.paperId as string;

  const [paper, setPaper] = useState<Paper | null>(null);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [pendingCount, setPendingCount] = useState(0);
  const [evaluatedCount, setEvaluatedCount] = useState(0);
  const { theme, isDarkMode } = useTheme();
  const url = process.env.EXPO_PUBLIC_API_URL;

  useEffect(() => {
    fetchSubmissionsData();
  }, [paperId]);

  const fetchSubmissionsData = async () => {
    try {
      setLoading(true);

      if (paperId) {
        // Fetch paper details
        const paperData = await paperService.getDetails(paperId);
        setPaper(paperData);

        // Fetch submission counts
        await fetchSubmissionCounts();
      }
    } catch (error: any) {
      console.error("Error fetching submissions data:", error);
      Alert.alert(
        "Error",
        "Failed to load submissions data. Please try again."
      );
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  const exportToExcel = async () => {
    try {
      if (!paperId || !paper) {
        Alert.alert("Error", "Paper information not available");
        return;
      }

      // Show loading alert
      Alert.alert("Exporting", "Generating Excel file...", [{ text: "OK" }]);

      const apiUrl = process.env.EXPO_PUBLIC_API_URL;
      console.log('API URL:', apiUrl);
      console.log('Paper ID:', paperId);
      
      if (!apiUrl) {
        Alert.alert("Error", "API URL not configured. Please check environment settings.");
        return;
      }

      const downloadUrl = `${apiUrl}/api/submissions/export-excel/${paperId}`;
      console.log('Download URL:', downloadUrl);
      
      // Generate clean filename and use proper FileSystem path
      const fileName = `${paper.name.replace(/[^a-zA-Z0-9]/g, '_')}_submissions.xlsx`;
      
      // Use the proper document directory from FileSystem legacy API
      const fileUri = FileSystem.documentDirectory + fileName;
      console.log('File URI:', fileUri);

      // Download file directly to app storage using legacy API
      console.log('Starting download...');
      const downloadResult = await FileSystem.downloadAsync(downloadUrl, fileUri);
      console.log('Download result:', downloadResult);

      if (downloadResult.status === 200) {
        console.log('Download successful');
        // Check if sharing is available
        const isAvailable = await Sharing.isAvailableAsync();
        
        if (isAvailable) {
          // Share the file (this opens native share sheet)
          await Sharing.shareAsync(downloadResult.uri, {
            mimeType: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
            dialogTitle: 'Save Excel File',
          });
          
          Alert.alert("Success", "Excel file has been generated! Use the share options to save it.");
        } else {
          Alert.alert("Success", "Excel file has been downloaded to app storage.");
        }
      } else {
        console.log('Download failed with status:', downloadResult.status);
        throw new Error(`Failed to download file. Server returned status: ${downloadResult.status}`);
      }
    } catch (error: any) {
      console.error("Error exporting to Excel:", error);
      console.error("Error details:", error.message);
      
      let errorMessage = "Failed to export submissions to Excel.";
      
      if (error.message.includes("Network request failed")) {
        errorMessage += " Please check if the backend server is running and your internet connection.";
      } else if (error.message.includes("status:")) {
        errorMessage += ` Server error: ${error.message}`;
      } else {
        errorMessage += ` ${error.message}`;
      }
      
      Alert.alert("Error", errorMessage);
    }
  };

  const fetchSubmissionCounts = async () => {
    try {
      // Fetch pending files count from MinIO
      const pendingResponse = await fetch(
        `${url}/api/submissions/pending-files/${paperId}`
      );
      // Fetch evaluated submissions count from database
      const evaluatedResponse = await fetch(
        `${url}/api/submissions/paper/${paperId}/status/evaluated`
      );

      if (pendingResponse.ok) {
        const pendingData = await pendingResponse.json();
        setPendingCount(pendingData.pendingSubmissions?.length || 0);
      }

      if (evaluatedResponse.ok) {
        const evaluatedData = await evaluatedResponse.json();
        setEvaluatedCount(evaluatedData.submissions?.length || 0);
      }
    } catch (error) {
      console.error("Error fetching submission counts:", error);
    }
  };

  const onRefresh = () => {
    setRefreshing(true);
    fetchSubmissionsData();
  };

  const handleCardPress = (type: "pending" | "evaluated") => {
    if (!paperId || !paper) return;

    router.push({
      pathname:
        type === "pending" ? "/pending-submissions" : "/evaluated-submissions",
      params: {
        paperId: paperId,
        paperName: paper.name,
      },
    });
  };

  const formatDate = (dateString: string) => {
    try {
      const date = new Date(dateString);
      return date.toLocaleDateString("en-US", {
        year: "numeric",
        month: "short",
        day: "numeric",
      });
    } catch {
      return "N/A";
    }
  };

  const getCompletionPercentage = () => {
    const total = pendingCount + evaluatedCount;
    if (total === 0) return 0;
    return Math.round((evaluatedCount / total) * 100);
  };

  if (loading) {
    return (
      <SafeAreaView
        style={[styles.safeArea, { backgroundColor: theme.colors.background }]}
        edges={["top", "left", "right"]}
      >
        <StatusBar
          barStyle={isDarkMode ? "light-content" : "dark-content"}
          backgroundColor={theme.colors.background}
        />
        <View style={styles.loadingContainer}>
          <View style={styles.loadingContent}>
            <ActivityIndicator size="large" color={theme.colors.primary} />
            <Text
              variant="titleMedium"
              style={[styles.loadingText, { color: theme.colors.onSurface }]}
            >
              Loading submission data...
            </Text>
            <Text
              variant="bodyMedium"
              style={[
                styles.loadingSubtext,
                { color: theme.colors.onSurfaceVariant },
              ]}
            >
              Please wait while we fetch the latest information
            </Text>
          </View>
        </View>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView
      style={[styles.safeArea, { backgroundColor: theme.colors.background }]}
      edges={["top", "left", "right"]}
    >
      <StatusBar
        barStyle="light-content"
        backgroundColor={isDarkMode ? "#0F172A" : "#4F46E5"}
      />

      <View style={{ flex: 1 }}>
        {/* Modern Header */}
        <LinearGradient
          colors={
            isDarkMode
              ? ["#0F172A", "#1E293B", "#334155"]
              : ["#4F46E5", "#7C3AED", "#EC4899"]
          }
          style={styles.modernHeader}
          start={{ x: 0, y: 0 }}
          end={{ x: 1, y: 1 }}
        >
          <View style={styles.headerContainer}>
            <TouchableOpacity
              style={styles.modernBackButton}
              onPress={() => router.back()}
              activeOpacity={0.8}
            >
              <Ionicons name="chevron-back" size={24} color="white" />
            </TouchableOpacity>

            <View style={styles.headerInfo}>
              <Text variant="headlineSmall" style={styles.modernHeaderTitle}>
                Submission Center
              </Text>
              <Text variant="bodyLarge" style={styles.modernHeaderSubtitle}>
                {paper?.name || "Assessment Management"}
              </Text>
            </View>

            <TouchableOpacity
              style={styles.refreshButton}
              onPress={onRefresh}
              activeOpacity={0.8}
            >
              <MaterialCommunityIcons name="refresh" size={20} color="white" />
            </TouchableOpacity>
          </View>

          {/* Paper Info Card */}
          {paper && (
            <Surface style={styles.paperInfoCard} elevation={2}>
              <View style={styles.paperInfoContent}>
                <View style={styles.paperInfoLeft}>
                  <Text
                    variant="titleMedium"
                    style={[
                      styles.paperInfoTitle,
                      { color: theme.colors.onSurface },
                    ]}
                  >
                    {paper.name}
                  </Text>
                  <Text
                    variant="bodyMedium"
                    style={[
                      styles.paperInfoDate,
                      { color: theme.colors.onSurfaceVariant },
                    ]}
                  >
                    Created on {formatDate(paper.uploaded_at)}
                  </Text>
                </View>
                <View style={styles.paperInfoRight}></View>
              </View>
            </Surface>
          )}
        </LinearGradient>

        <ScrollView
          style={styles.scrollContainer}
          contentContainerStyle={styles.scrollContent}
          refreshControl={
            <RefreshControl
              refreshing={refreshing}
              onRefresh={onRefresh}
              colors={[theme.colors.primary]}
              tintColor={theme.colors.primary}
              progressBackgroundColor={theme.colors.surface}
            />
          }
          showsVerticalScrollIndicator={false}
        >
          <View style={styles.contentContainer}>
            {/* Statistics Overview */}
            <View style={styles.statsContainer}>
              <Text
                variant="titleLarge"
                style={[styles.sectionTitle, { color: theme.colors.onSurface }]}
              >
                Submission Overview
              </Text>

              <Surface
                style={[
                  styles.statsCard,
                  { backgroundColor: theme.colors.surface },
                ]}
                elevation={1}
              >
                <View style={styles.statsContent}>
                  <View style={styles.statItem}>
                    <Text
                      variant="headlineSmall"
                      style={[
                        styles.statNumber,
                        { color: theme.colors.primary },
                      ]}
                    >
                      {pendingCount + evaluatedCount}
                    </Text>
                    <Text
                      variant="bodyMedium"
                      style={[
                        styles.statLabel,
                        { color: theme.colors.onSurfaceVariant },
                      ]}
                    >
                      Total Submissions
                    </Text>
                  </View>

                  <View style={styles.statDivider} />

                  <View style={styles.statItem}>
                    <Text
                      variant="headlineSmall"
                      style={[styles.statNumber, { color: "#10B981" }]}
                    >
                      {getCompletionPercentage()}%
                    </Text>
                    <Text
                      variant="bodyMedium"
                      style={[
                        styles.statLabel,
                        { color: theme.colors.onSurfaceVariant },
                      ]}
                    >
                      Completed
                    </Text>
                  </View>
                </View>
              </Surface>
            </View>

            {/* Action Cards */}
            <View style={styles.actionCardsContainer}>
              <View style={styles.quickActionsHeader}>
                <Text
                  variant="titleLarge"
                  style={[styles.sectionTitle, { color: theme.colors.onSurface }]}
                >
                  Quick Actions
                </Text>
                <TouchableOpacity
                  style={styles.exportButton}
                  onPress={exportToExcel}
                >
                  <MaterialCommunityIcons name="microsoft-excel" size={24} color="white" />
                </TouchableOpacity>
              </View>
                    
              {/* Pending Evaluations Card */}
              <TouchableOpacity
                style={styles.modernCard}
                onPress={() => handleCardPress("pending")}
                activeOpacity={0.9}
              >
                <LinearGradient
                  colors={["#FF6B35", "#F7931E"]}
                  style={styles.modernCardGradient}
                  start={{ x: 0, y: 0 }}
                  end={{ x: 1, y: 0 }}
                >
                  <View style={styles.modernCardContent}>
                    <View style={styles.cardLeft}>
                      <View style={styles.modernCardIcon}>
                        <MaterialCommunityIcons
                          name="clock-outline"
                          size={28}
                          color="white"
                        />
                      </View>
                      <View style={styles.cardTextContent}>
                        <Text
                          variant="titleMedium"
                          style={styles.modernCardTitle}
                        >
                          Pending Evaluation
                        </Text>
                        <Text
                          variant="bodyMedium"
                          style={styles.modernCardSubtitle}
                        >
                          Review and evaluate submissions
                        </Text>
                      </View>
                    </View>

                    <View style={styles.cardRight}>
                      <View style={styles.countBadge}>
                        <Text variant="titleLarge" style={styles.countText}>
                          {pendingCount}
                        </Text>
                      </View>
                      <Ionicons
                        name="chevron-forward"
                        size={20}
                        color="rgba(255,255,255,0.8)"
                      />
                    </View>
                  </View>
                </LinearGradient>
              </TouchableOpacity>

              {/* Evaluated Submissions Card */}
              <TouchableOpacity
                style={styles.modernCard}
                onPress={() => handleCardPress("evaluated")}
                activeOpacity={0.9}
              >
                <LinearGradient
                  colors={["#10B981", "#059669"]}
                  style={styles.modernCardGradient}
                  start={{ x: 0, y: 0 }}
                  end={{ x: 1, y: 0 }}
                >
                  <View style={styles.modernCardContent}>
                    <View style={styles.cardLeft}>
                      <View style={styles.modernCardIcon}>
                        <MaterialCommunityIcons
                          name="check-circle-outline"
                          size={28}
                          color="white"
                        />
                      </View>
                      <View style={styles.cardTextContent}>
                        <Text
                          variant="titleMedium"
                          style={styles.modernCardTitle}
                        >
                          Evaluated Results
                        </Text>
                        <Text
                          variant="bodyMedium"
                          style={styles.modernCardSubtitle}
                        >
                          View completed evaluations
                        </Text>
                      </View>
                    </View>

                    <View style={styles.cardRight}>
                      <View style={styles.countBadge}>
                        <Text variant="titleLarge" style={styles.countText}>
                          {evaluatedCount}
                        </Text>
                      </View>
                      <Ionicons
                        name="chevron-forward"
                        size={20}
                        color="rgba(255,255,255,0.8)"
                      />
                    </View>
                  </View>
                </LinearGradient>
              </TouchableOpacity>
            </View>

            {/* Help & Info Section */}
            <Surface
              style={[
                styles.helpSection,
                { backgroundColor: theme.colors.surfaceVariant },
              ]}
              elevation={0}
            >
              <View style={styles.helpContent}>
                <View style={styles.helpHeader}>
                  <MaterialCommunityIcons
                    name="help-circle-outline"
                    size={24}
                    color={theme.colors.primary}
                  />
                  <Text
                    variant="titleMedium"
                    style={[
                      styles.helpTitle,
                      { color: theme.colors.onSurface },
                    ]}
                  >
                    How It Works
                  </Text>
                </View>

                <View style={styles.helpItems}>
                  <View style={styles.helpItem}>
                    <View
                      style={[
                        styles.helpItemIcon,
                        { backgroundColor: "#FF6B35" },
                      ]}
                    >
                      <Text style={styles.helpItemNumber}>1</Text>
                    </View>
                    <Text
                      variant="bodyMedium"
                      style={[
                        styles.helpItemText,
                        { color: theme.colors.onSurfaceVariant },
                      ]}
                    >
                      Tap "Pending Evaluation" to review submissions waiting for
                      assessment
                    </Text>
                  </View>

                  <View style={styles.helpItem}>
                    <View
                      style={[
                        styles.helpItemIcon,
                        { backgroundColor: "#10B981" },
                      ]}
                    >
                      <Text style={styles.helpItemNumber}>2</Text>
                    </View>
                    <Text
                      variant="bodyMedium"
                      style={[
                        styles.helpItemText,
                        { color: theme.colors.onSurfaceVariant },
                      ]}
                    >
                      View "Evaluated Results" for completed assessments and
                      analytics
                    </Text>
                  </View>

                  <View style={styles.helpItem}>
                    <View
                      style={[
                        styles.helpItemIcon,
                        { backgroundColor: theme.colors.primary },
                      ]}
                    >
                      <Text style={styles.helpItemNumber}>3</Text>
                    </View>
                    <Text
                      variant="bodyMedium"
                      style={[
                        styles.helpItemText,
                        { color: theme.colors.onSurfaceVariant },
                      ]}
                    >
                      Pull down to refresh and get the latest submission counts
                    </Text>
                  </View>
                </View>
              </View>
            </Surface>
          </View>
        </ScrollView>
      </View>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safeArea: {
    flex: 1,
  },
  modernHeader: {
    paddingTop: 16,
    paddingBottom: 20,
    paddingHorizontal: 20,
  },
  headerContainer: {
    flexDirection: "row",
    alignItems: "center",
    marginBottom: 20,
  },
  modernBackButton: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: "rgba(255,255,255,0.15)",
    alignItems: "center",
    justifyContent: "center",
    marginRight: 16,
  },
  headerInfo: {
    flex: 1,
  },
  exportButton: {
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 20,
    backgroundColor: "#28A745",
    elevation: 2,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.2,
    shadowRadius: 2,
    alignItems: 'center',
    justifyContent: 'center',
    minWidth: 40,
  },
  modernHeaderTitle: {
    color: "white",
    fontWeight: "700",
    marginBottom: 4,
  },
  modernHeaderSubtitle: {
    color: "rgba(255,255,255,0.85)",
    fontWeight: "400",
  },
  refreshButton: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: "rgba(255,255,255,0.15)",
    alignItems: "center",
    justifyContent: "center",
  },
  paperInfoCard: {
    borderRadius: 16,
    marginHorizontal: 4,
    marginBottom: 4,
  },
  paperInfoContent: {
    flexDirection: "row",
    padding: 16,
    alignItems: "center",
  },
  paperInfoLeft: {
    flex: 1,
  },
  paperInfoTitle: {
    fontWeight: "600",
    marginBottom: 4,
  },
  paperInfoDate: {
    fontSize: 13,
  },
  paperInfoRight: {
    alignItems: "flex-end",
  },
  questionChip: {
    height: 28,
  },
  typeChip: {
    height: 24,
  },
  scrollContainer: {
    flex: 1,
  },
  scrollContent: {
    paddingBottom: 32,
  },
  contentContainer: {
    paddingHorizontal: 20,
    paddingTop: 24,
  },
  loadingContainer: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
    paddingHorizontal: 40,
  },
  loadingContent: {
    alignItems: "center",
  },
  loadingText: {
    marginTop: 20,
    textAlign: "center",
    fontWeight: "600",
  },
  loadingSubtext: {
    marginTop: 8,
    textAlign: "center",
    fontSize: 14,
  },
  sectionTitle: {
    fontWeight: "700",
    marginBottom: 16,
    marginLeft: 4,
  },
  statsContainer: {
    marginBottom: 32,
  },
  statsCard: {
    borderRadius: 16,
    padding: 20,
  },
  statsContent: {
    flexDirection: "row",
    alignItems: "center",
  },
  statItem: {
    flex: 1,
    alignItems: "center",
  },
  statNumber: {
    fontWeight: "800",
    marginBottom: 4,
  },
  statLabel: {
    fontSize: 14,
    fontWeight: "500",
  },
  statDivider: {
    width: 1,
    height: 40,
    backgroundColor: "rgba(0,0,0,0.1)",
    marginHorizontal: 20,
  },
  actionCardsContainer: {
    marginBottom: 32,
  },
  quickActionsHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 16,
  },
  modernCard: {
    marginBottom: 16,
    borderRadius: 20,
    overflow: "hidden",
    elevation: 4,
    shadowColor: "#000",
    shadowOffset: {
      width: 0,
      height: 2,
    },
    shadowOpacity: 0.15,
    shadowRadius: 8,
  },
  modernCardGradient: {
    padding: 20,
  },
  modernCardContent: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
  },
  cardLeft: {
    flexDirection: "row",
    alignItems: "center",
    flex: 1,
  },
  modernCardIcon: {
    width: 48,
    height: 48,
    borderRadius: 24,
    backgroundColor: "rgba(255,255,255,0.2)",
    alignItems: "center",
    justifyContent: "center",
    marginRight: 16,
  },
  cardTextContent: {
    flex: 1,
  },
  modernCardTitle: {
    color: "white",
    fontWeight: "700",
    marginBottom: 4,
  },
  modernCardSubtitle: {
    color: "rgba(255,255,255,0.85)",
    fontSize: 14,
  },
  cardRight: {
    flexDirection: "row",
    alignItems: "center",
  },
  countBadge: {
    minWidth: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: "rgba(255,255,255,0.25)",
    alignItems: "center",
    justifyContent: "center",
    marginRight: 12,
  },
  countText: {
    color: "white",
    fontWeight: "800",
    fontSize: 16,
  },
  helpSection: {
    borderRadius: 16,
    padding: 20,
    marginBottom: 16,
  },
  helpContent: {
    // No additional styles needed
  },
  helpHeader: {
    flexDirection: "row",
    alignItems: "center",
    marginBottom: 16,
  },
  helpTitle: {
    fontWeight: "600",
    marginLeft: 8,
  },
  helpItems: {
    // No additional styles needed
  },
  helpItem: {
    flexDirection: "row",
    alignItems: "flex-start",
    marginBottom: 16,
  },
  helpItemIcon: {
    width: 28,
    height: 28,
    borderRadius: 14,
    alignItems: "center",
    justifyContent: "center",
    marginRight: 12,
    marginTop: 2,
  },
  helpItemNumber: {
    color: "white",
    fontSize: 14,
    fontWeight: "700",
  },
  helpItemText: {
    flex: 1,
    lineHeight: 20,
    fontSize: 14,
  },
});
