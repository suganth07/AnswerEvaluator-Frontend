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
import { Text, Card, ActivityIndicator } from "react-native-paper";
import { useTheme } from "../../context/ThemeContext";
import { paperService } from "../../services/api";
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
      Alert.alert("Error", "Failed to load submissions data");
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  const fetchSubmissionCounts = async () => {
    try {
      // Fetch pending files count from Google Drive
      const pendingResponse = await fetch(`${url}/api/submissions/pending-files/${paperId}`);
      // Fetch evaluated submissions count from database
      const evaluatedResponse = await fetch(`${url}/api/submissions/paper/${paperId}/status/evaluated`);

      if (pendingResponse.ok) {
        const pendingData = await pendingResponse.json();
        setPendingCount(pendingData.pendingSubmissions?.length || 0);
      }
      
      if (evaluatedResponse.ok) {
        const evaluatedData = await evaluatedResponse.json();
        setEvaluatedCount(evaluatedData.submissions?.length || 0);
      }
    } catch (error) {
      console.error('Error fetching submission counts:', error);
    }
  };

  const onRefresh = () => {
    setRefreshing(true);
    fetchSubmissionsData();
  };

  const handleCardPress = (type: 'pending' | 'evaluated') => {
    if (!paperId || !paper) return;
    
    router.push({
      pathname: type === 'pending' ? '/pending-submissions' : '/evaluated-submissions',
      params: {
        paperId: paperId,
        paperName: paper.name
      }
    });
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
            <Text variant="headlineLarge" style={styles.headerTitle}>
              {paper?.name || "Submissions"}
            </Text>
            <Text variant="bodyLarge" style={styles.headerSubtitle}>
              Manage student submissions and evaluations
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
        <View style={styles.cardsContainer}>
          {/* Yet to be Evaluated Card */}
          <TouchableOpacity 
            style={styles.cardTouchable}
            onPress={() => handleCardPress('pending')}
            activeOpacity={0.7}
          >
            <LinearGradient
              colors={["#F59E0B", "#D97706"]}
              style={styles.cardGradient}
              start={{ x: 0, y: 0 }}
              end={{ x: 1, y: 1 }}
            >
              <View style={styles.cardContent}>
                <View style={styles.cardIcon}>
                  <Ionicons name="time-outline" size={48} color="white" />
                </View>
                <Text variant="headlineSmall" style={styles.cardTitle}>
                  Yet to be Evaluated
                </Text>
                <Text variant="bodyLarge" style={styles.cardSubtitle}>
                  {pendingCount} submissions pending evaluation
                </Text>
                <View style={styles.cardCountBadge}>
                  <Text variant="titleLarge" style={styles.cardCount}>
                    {pendingCount}
                  </Text>
                </View>
              </View>
            </LinearGradient>
          </TouchableOpacity>

          {/* Evaluated Card */}
          <TouchableOpacity 
            style={styles.cardTouchable}
            onPress={() => handleCardPress('evaluated')}
            activeOpacity={0.7}
          >
            <LinearGradient
              colors={["#10B981", "#059669"]}
              style={styles.cardGradient}
              start={{ x: 0, y: 0 }}
              end={{ x: 1, y: 1 }}
            >
              <View style={styles.cardContent}>
                <View style={styles.cardIcon}>
                  <Ionicons name="checkmark-circle-outline" size={48} color="white" />
                </View>
                <Text variant="headlineSmall" style={styles.cardTitle}>
                  Evaluated
                </Text>
                <Text variant="bodyLarge" style={styles.cardSubtitle}>
                  {evaluatedCount} submissions completed
                </Text>
                <View style={styles.cardCountBadge}>
                  <Text variant="titleLarge" style={styles.cardCount}>
                    {evaluatedCount}
                  </Text>
                </View>
              </View>
            </LinearGradient>
          </TouchableOpacity>
        </View>

        {/* Instructions */}
        <View style={styles.instructionsContainer}>
          <Text variant="titleMedium" style={[styles.instructionsTitle, { color: theme.colors.onSurface }]}>
            How it works:
          </Text>
          <Text variant="bodyMedium" style={[styles.instructionsText, { color: theme.colors.onSurfaceVariant }]}>
            • Tap "Yet to be Evaluated" to review and evaluate pending submissions
          </Text>
          <Text variant="bodyMedium" style={[styles.instructionsText, { color: theme.colors.onSurfaceVariant }]}>
            • Tap "Evaluated" to view completed results and analytics
          </Text>
          <Text variant="bodyMedium" style={[styles.instructionsText, { color: theme.colors.onSurfaceVariant }]}>
            • Pull down to refresh the submission counts
          </Text>
        </View>

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
    paddingTop: 24,
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
  cardsContainer: {
    paddingHorizontal: 20,
    gap: 20,
  },
  cardTouchable: {
    borderRadius: 20,
    overflow: "hidden",
    elevation: 8,
    shadowColor: "#000",
    shadowOffset: {
      width: 0,
      height: 4,
    },
    shadowOpacity: 0.3,
    shadowRadius: 8,
  },
  cardGradient: {
    padding: 24,
    minHeight: 180,
  },
  cardContent: {
    alignItems: "center",
    justifyContent: "center",
    flex: 1,
  },
  cardIcon: {
    marginBottom: 16,
    opacity: 0.9,
  },
  cardTitle: {
    color: "white",
    fontWeight: "700",
    textAlign: "center",
    marginBottom: 8,
  },
  cardSubtitle: {
    color: "rgba(255,255,255,0.8)",
    textAlign: "center",
    marginBottom: 16,
  },
  cardCountBadge: {
    backgroundColor: "rgba(255,255,255,0.2)",
    borderRadius: 20,
    paddingHorizontal: 16,
    paddingVertical: 8,
    minWidth: 50,
    alignItems: "center",
  },
  cardCount: {
    color: "white",
    fontWeight: "800",
  },
  instructionsContainer: {
    margin: 20,
    padding: 20,
    backgroundColor: "rgba(99, 102, 241, 0.05)",
    borderRadius: 16,
    borderWidth: 1,
    borderColor: "rgba(99, 102, 241, 0.1)",
  },
  instructionsTitle: {
    fontWeight: "600",
    marginBottom: 12,
  },
  instructionsText: {
    marginBottom: 8,
    lineHeight: 20,
  },
  bottomSpacer: {
    height: 100,
  },
});