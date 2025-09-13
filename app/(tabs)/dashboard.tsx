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
import { Text, Avatar } from "react-native-paper";
import { useAuth } from "../../context/AuthContext";
import { useTheme } from "../../context/ThemeContext";
import { paperService, submissionService } from "../../services/api";
import { router } from "expo-router";
import { Ionicons } from "@expo/vector-icons";
import { LinearGradient } from "expo-linear-gradient";

const { width } = Dimensions.get("window");

interface DashboardStats {
  totalPapers: number;
  totalSubmissions: number;
  totalQuestions: number;
  averageScore: number;
  recentPapers: Array<{
    id: number;
    name: string;
    uploaded_at: string;
    question_count: number;
  }>;
  recentActivity: Array<{
    type: "paper_upload" | "submission";
    title: string;
    subtitle: string;
    timestamp: string;
    icon: string;
  }>;
}

export default function DashboardScreen() {
  const [stats, setStats] = useState<DashboardStats>({
    totalPapers: 0,
    totalSubmissions: 0,
    totalQuestions: 0,
    averageScore: 0,
    recentPapers: [],
    recentActivity: [],
  });
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const { user } = useAuth();
  const { theme, isDarkMode } = useTheme();

  useEffect(() => {
    fetchDashboardData();
  }, []);

  const fetchDashboardData = async () => {
    try {
      setLoading(true);

      // Fetch papers data
      const papersData = await paperService.getAll();

      // Calculate basic stats
      const totalPapers = papersData.length;
      const totalQuestions = papersData.reduce((sum: number, paper: any) => {
        const questionCount = parseInt(paper.question_count) || 0;
        return sum + questionCount;
      }, 0);

      // Fetch submissions for all papers to get total count
      let totalSubmissions = 0;
      for (const paper of papersData) {
        try {
          const submissions = await submissionService.getByPaperId(paper.id);
          totalSubmissions += submissions.length;
        } catch (error) {
          console.error(`Error fetching submissions for paper ${paper.id}:`, error);
          // Continue with other papers
        }
      }

      const recentPapers = papersData
        .sort(
          (a: any, b: any) =>
            new Date(b.uploaded_at).getTime() -
            new Date(a.uploaded_at).getTime()
        )
        .slice(0, 3);

      // Generate recent activity
      const recentActivity = [
        ...papersData.slice(0, 2).map((paper: any) => ({
          type: "paper_upload" as const,
          title: `Paper "${paper.name}" uploaded`,
          subtitle: `${paper.question_count || 0} questions`,
          timestamp: paper.uploaded_at,
          icon: "document-text",
        })),
      ].sort(
        (a, b) =>
          new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime()
      );

      setStats({
        totalPapers,
        totalSubmissions,
        totalQuestions,
        averageScore: 0, // We can calculate this later if needed
        recentPapers,
        recentActivity,
      });
    } catch (error: any) {
      console.error("Error fetching dashboard data:", error);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  const onRefresh = () => {
    setRefreshing(true);
    fetchDashboardData();
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

  const getGreeting = () => {
    const hour = new Date().getHours();
    if (hour < 12) return "Good Morning";
    if (hour < 17) return "Good Afternoon";
    return "Good Evening";
  };

  // Quick Upload Card Component
  const QuickUploadCard = () => (
    <TouchableOpacity onPress={() => router.push("/upload")}>
      <LinearGradient
        colors={isDarkMode ? ["#6366F1", "#8B5CF6"] : ["#6366F1", "#8B5CF6"]}
        style={styles.premiumCard}
        start={{ x: 0, y: 0 }}
        end={{ x: 1, y: 1 }}
      >
        <View style={styles.premiumContent}>
          <View style={styles.premiumTextContainer}>
            <Text variant="headlineSmall" style={styles.premiumTitle}>
              Quick Upload
            </Text>
            <Text variant="bodyMedium" style={styles.premiumSubtitle}>
              Upload and scan test papers instantly for quick evaluation
            </Text>
          </View>
          <View style={styles.premiumIconContainer}>
            <LinearGradient
              colors={["rgba(255,255,255,0.2)", "rgba(255,255,255,0.1)"]}
              style={styles.premiumIcon}
            >
              <Ionicons name="cloud-upload" size={24} color="white" />
            </LinearGradient>
          </View>
        </View>
        <TouchableOpacity
          style={styles.upgradeButton}
          onPress={() => router.push("/upload")}
        >
          <Text style={styles.upgradeButtonText}>Upload Now</Text>
          <Ionicons name="arrow-forward" size={16} color="#6366F1" />
        </TouchableOpacity>
      </LinearGradient>
    </TouchableOpacity>
  );

  // Feature Card Component
  const FeatureCard = ({
    title,
    subtitle,
    icon,
    onPress,
    isLarge = false,
  }: {
    title: string;
    subtitle: string;
    icon: string;
    onPress: () => void;
    isLarge?: boolean;
  }) => (
    <TouchableOpacity
      onPress={onPress}
      style={[
        styles.featureCard,
        { backgroundColor: theme.colors.surface },
        isLarge ? styles.featureCardLarge : styles.featureCardSmall,
      ]}
    >
      <View style={styles.featureContent}>
        <View
          style={[
            styles.featureIcon,
            { backgroundColor: isDarkMode ? "#374151" : "#F3F4F6" },
          ]}
        >
          <Ionicons
            name={icon as any}
            size={24}
            color={theme.colors.onSurface}
          />
        </View>
        <Text
          variant="titleMedium"
          style={[styles.featureTitle, { color: theme.colors.onSurface }]}
        >
          {title}
        </Text>
        <Text
          variant="bodySmall"
          style={[
            styles.featureSubtitle,
            { color: theme.colors.onSurfaceVariant },
          ]}
        >
          {subtitle}
        </Text>
      </View>
    </TouchableOpacity>
  );

  // Quick Stats Component
  const QuickStats = () => (
    <View style={styles.quickStatsContainer}>
      <View
        style={[
          styles.quickStatCard,
          { backgroundColor: theme.colors.surface },
        ]}
      >
        <Text
          variant="headlineMedium"
          style={[styles.statNumber, { color: theme.colors.onSurface }]}
        >
          {stats.totalPapers}
        </Text>
        <Text
          variant="bodySmall"
          style={[styles.statLabel, { color: theme.colors.onSurfaceVariant }]}
        >
          Total Tests
        </Text>
      </View>
      {/* <View
        style={[
          styles.quickStatCard,
          { backgroundColor: theme.colors.surface },
        ]}
      >
        <Text
          variant="headlineMedium"
          style={[styles.statNumber, { color: theme.colors.onSurface }]}
        >
          {stats.totalQuestions}
        </Text>
        <Text
          variant="bodySmall"
          style={[styles.statLabel, { color: theme.colors.onSurfaceVariant }]}
        >
          Questions
        </Text>
      </View> */}
      <View
        style={[
          styles.quickStatCard,
          { backgroundColor: theme.colors.surface },
        ]}
      >
        <Text
          variant="headlineMedium"
          style={[styles.statNumber, { color: theme.colors.onSurface }]}
        >
          {stats.totalSubmissions}
        </Text>
        <Text
          variant="bodySmall"
          style={[styles.statLabel, { color: theme.colors.onSurfaceVariant }]}
        >
          Submissions
        </Text>
      </View>
    </View>
  );

  // Recent Activity List
  const RecentActivityList = () => (
    <View
      style={[
        styles.activityListContainer,
        { backgroundColor: theme.colors.surface },
      ]}
    >
      {stats.recentPapers.map((paper, index) => (
        <TouchableOpacity
          key={paper.id}
          onPress={() =>
            router.push({
              pathname: "/questions",
              params: { paperId: paper.id, paperName: paper.name },
            })
          }
          style={styles.activityListItem}
        >
          <View
            style={[
              styles.activityItemIcon,
              { backgroundColor: isDarkMode ? "#374151" : "#F3F4F6" },
            ]}
          >
            <Ionicons
              name="document-text"
              size={20}
              color={theme.colors.onSurface}
            />
          </View>
          <View style={styles.activityItemContent}>
            <Text
              variant="bodyMedium"
              style={[
                styles.activityItemTitle,
                { color: theme.colors.onSurface },
              ]}
            >
              {paper.name}
            </Text>
            <Text
              variant="bodySmall"
              style={[
                styles.activityItemSubtitle,
                { color: theme.colors.onSurfaceVariant },
              ]}
            >
              {paper.question_count} questions
            </Text>
          </View>
          <Text
            variant="bodySmall"
            style={[
              styles.activityItemTime,
              { color: theme.colors.onSurfaceVariant },
            ]}
          >
            {formatDate(paper.uploaded_at)}
          </Text>
        </TouchableOpacity>
      ))}
    </View>
  );

  return (
    <SafeAreaView
      style={[styles.safeArea, { backgroundColor: theme.colors.background }]}
      edges={["top", "left", "right"]}
    >
      <ScrollView
        style={[styles.container, { backgroundColor: theme.colors.background }]}
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
        {/* Header */}
        <View style={styles.header}>
          <View style={styles.headerContent}>
            <View style={styles.userSection}>
              <Text
                variant="headlineSmall"
                style={[styles.greeting, { color: theme.colors.onSurface }]}
              >
                Hello,
              </Text>
              <Text
                variant="headlineLarge"
                style={[styles.username, { color: theme.colors.onSurface }]}
              >
                {user?.username || "Admin"}
              </Text>
              <Text
                variant="bodyMedium"
                style={[
                  styles.subtitle,
                  { color: theme.colors.onSurfaceVariant },
                ]}
              >
                Manage your tests and submissions efficiently
              </Text>
            </View>
            <TouchableOpacity
              style={[
                styles.avatarContainer,
                { backgroundColor: theme.colors.surface },
              ]}
              onPress={() => router.push("/settings")}
            >
              <Avatar.Text
                size={36}
                label={(user?.username || "AD").substring(0, 2).toUpperCase()}
                style={{ backgroundColor: theme.colors.primary }}
              />
            </TouchableOpacity>
          </View>
        </View>

        {/* Quick Upload Card */}
        <View style={styles.section}>
          <QuickUploadCard />
        </View>

        {/* Quick Stats */}
        <View style={styles.section}>
          <QuickStats />
        </View>

        {/* Features Section */}
        <View style={styles.section}>
          <View style={styles.sectionHeader}>
            <Text
              variant="headlineSmall"
              style={[styles.sectionTitle, { color: theme.colors.onSurface }]}
            >
              Features
            </Text>
            <TouchableOpacity>
              <Ionicons
                name="chevron-forward"
                size={20}
                color={theme.colors.onSurfaceVariant}
              />
            </TouchableOpacity>
          </View>

          {/* Feature Tags */}
          <ScrollView
            horizontal
            showsHorizontalScrollIndicator={false}
            style={styles.featureTags}
          >
            <TouchableOpacity
              style={[styles.featureTag, styles.featureTagActive]}
            >
              <Text style={styles.featureTagActiveText}>Upload Test</Text>
            </TouchableOpacity>
            <TouchableOpacity
              style={[
                styles.featureTag,
                { backgroundColor: isDarkMode ? "#374151" : "#F3F4F6" },
              ]}
            >
              <Text
                style={[
                  styles.featureTagText,
                  { color: theme.colors.onSurface },
                ]}
              >
                Analysis
              </Text>
            </TouchableOpacity>
          </ScrollView>

          {/* Feature Cards Grid */}
          <View style={styles.featureGrid}>
            <FeatureCard
              title="Upload Test"
              subtitle="Scan and analyze product ingredients instantly"
              icon="cloud-upload-outline"
              onPress={() => router.push("/upload")}
              isLarge={true}
            />
            <FeatureCard
              title="Analytics"
              subtitle="Generate personalized analytics routines"
              icon="bar-chart-outline"
              onPress={() => router.push("/(tabs)/tests")}
              isLarge={true}
            />
          </View>
        </View>

        {/* Recent Activity */}
        {(stats.recentPapers.length > 0 || stats.recentActivity.length > 0) && (
          <View style={styles.section}>
            <View style={styles.sectionHeader}>
              <Text
                variant="headlineSmall"
                style={[styles.sectionTitle, { color: theme.colors.onSurface }]}
              >
                Recent Activity
              </Text>
              <TouchableOpacity onPress={() => router.push("/(tabs)/tests")}>
                <Text
                  variant="bodySmall"
                  style={{ color: theme.colors.primary }}
                >
                  See all
                </Text>
              </TouchableOpacity>
            </View>
            <RecentActivityList />
          </View>
        )}

        {/* Bottom Navigation Spacer */}
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
  header: {
    paddingHorizontal: 20,
    paddingTop: 10,
  },
  headerContent: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "flex-start",
  },
  userSection: {
    flex: 1,
  },
  greeting: {
    fontWeight: "400",
    marginBottom: 4,
  },
  username: {
    fontWeight: "700",
    marginBottom: 8,
  },
  subtitle: {
    fontSize: 14,
    lineHeight: 20,
  },
  avatarContainer: {
    width: 48,
    height: 48,
    borderRadius: 24,
    justifyContent: "center",
    alignItems: "center",
  },
  section: {
    paddingHorizontal: 20,
    marginBottom: 24,
  },
  sectionHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: 16,
  },
  sectionTitle: {
    fontWeight: "600",
  },
  premiumCard: {
    borderRadius: 16,
    padding: 20,
    marginTop: 24,
  },
  premiumContent: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "flex-start",
    marginBottom: 20,
  },
  premiumTextContainer: {
    flex: 1,
    paddingRight: 16,
  },
  premiumTitle: {
    color: "white",
    fontWeight: "700",
    marginBottom: 8,
  },
  premiumSubtitle: {
    color: "rgba(255,255,255,0.9)",
    lineHeight: 20,
  },
  premiumIconContainer: {
    alignItems: "center",
  },
  premiumIcon: {
    width: 48,
    height: 48,
    borderRadius: 24,
    justifyContent: "center",
    alignItems: "center",
  },
  upgradeButton: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: "white",
    paddingHorizontal: 20,
    paddingVertical: 12,
    borderRadius: 25,
    alignSelf: "flex-start",
  },
  upgradeButtonText: {
    color: "#6366F1",
    fontWeight: "600",
    marginRight: 8,
  },
  quickStatsContainer: {
    flexDirection: "row",
    justifyContent: "space-between",
    gap: 12,
  },
  quickStatCard: {
    flex: 1,
    padding: 16,
    borderRadius: 12,
    alignItems: "center",
  },
  statNumber: {
    fontWeight: "700",
    marginBottom: 4,
  },
  statLabel: {
    fontSize: 12,
    textAlign: "center",
  },
  featureTags: {
    marginBottom: 16,
  },
  featureTag: {
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderRadius: 20,
    marginRight: 12,
  },
  featureTagActive: {
    backgroundColor: "white",
  },
  featureTagActiveText: {
    color: "#000",
    fontWeight: "500",
  },
  featureTagText: {
    fontWeight: "500",
  },
  featureGrid: {
    flexDirection: "row",
    gap: 12,
  },
  featureCard: {
    padding: 20,
    borderRadius: 16,
    flex: 1,
  },
  featureCardLarge: {
    minHeight: 140,
  },
  featureCardSmall: {
    minHeight: 120,
  },
  featureContent: {
    flex: 1,
    justifyContent: "space-between",
  },
  featureIcon: {
    width: 48,
    height: 48,
    borderRadius: 24,
    justifyContent: "center",
    alignItems: "center",
    marginBottom: 12,
  },
  featureTitle: {
    fontWeight: "600",
    marginBottom: 8,
  },
  featureSubtitle: {
    fontSize: 12,
    lineHeight: 16,
  },
  activityListContainer: {
    borderRadius: 16,
    paddingVertical: 8,
  },
  activityListItem: {
    flexDirection: "row",
    alignItems: "center",
    paddingHorizontal: 16,
    paddingVertical: 12,
  },
  activityItemIcon: {
    width: 40,
    height: 40,
    borderRadius: 20,
    justifyContent: "center",
    alignItems: "center",
    marginRight: 12,
  },
  activityItemContent: {
    flex: 1,
  },
  activityItemTitle: {
    fontWeight: "500",
    marginBottom: 2,
  },
  activityItemSubtitle: {
    fontSize: 12,
  },
  activityItemTime: {
    fontSize: 12,
  },
  bottomSpacer: {
    height: 100,
  },
});
