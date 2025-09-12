import React, { useState, useEffect } from "react";
import {
  View,
  StyleSheet,
  FlatList,
  Alert,
  RefreshControl,
} from "react-native";
import {
  Card,
  Title,
  Paragraph,
  Button,
  FAB,
  ActivityIndicator,
  Chip,
  Appbar,
  IconButton,
} from "react-native-paper";
import { useAuth } from "../../context/AuthContext";
import { useTheme } from "../../context/ThemeContext";
import { paperService } from "../../services/api";
import { router } from "expo-router";

interface Paper {
  id: number;
  name: string;
  uploaded_at: string;
  question_count: number;
  total_pages: number;
  question_type: string;
}

export default function TestsScreen() {
  const [papers, setPapers] = useState<Paper[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const { logout, user } = useAuth();
  const { theme, isDarkMode, toggleTheme } = useTheme();

  useEffect(() => {
    fetchPapers();
  }, []);

  const fetchPapers = async () => {
    try {
      const data = await paperService.getAll();
      setPapers(data);
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

  const viewPaperDetails = (paper: Paper) => {
    router.push({
      pathname: "/result",
      params: {
        paperId: paper.id,
        paperName: paper.name,
        isAdmin: "true",
      },
    });
  };

  const viewQuestions = (paper: Paper) => {
    router.push({
      pathname: "/questions",
      params: {
        paperId: paper.id,
        paperName: paper.name,
      },
    });
  };

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString("en-US", {
      year: "numeric",
      month: "short",
      day: "numeric",
      hour: "2-digit",
      minute: "2-digit",
    });
  };

  const getQuestionTypeInfo = (questionType: string) => {
    switch (questionType) {
      case "omr":
        return { label: "OMR", color: "#2196F3", icon: "circle-outline" };
      case "traditional":
        return {
          label: "Traditional",
          color: "#4CAF50",
          icon: "text-box-outline",
        };
      case "mixed":
        return {
          label: "Mixed",
          color: "#FF9800",
          icon: "format-list-bulleted",
        };
      default:
        return {
          label: "Traditional",
          color: "#4CAF50",
          icon: "text-box-outline",
        };
    }
  };

  const renderPaper = ({ item }: { item: Paper }) => {
    const questionTypeInfo = getQuestionTypeInfo(item.question_type);

    return (
      <Card
        style={[styles.paperCard, { backgroundColor: theme.colors.surface }]}
        onPress={() => viewPaperDetails(item)}
      >
        <Card.Content>
          <View style={styles.paperHeader}>
            <Title
              style={[styles.paperTitle, { color: theme.colors.onSurface }]}
            >
              {item.name}
            </Title>
            <View style={styles.chipsContainer}>
              <Chip
                mode="outlined"
                textStyle={[styles.chipText, { color: questionTypeInfo.color }]}
                style={[styles.chip, { borderColor: questionTypeInfo.color }]}
                icon={questionTypeInfo.icon}
              >
                {questionTypeInfo.label}
              </Chip>
              <Chip
                mode="outlined"
                textStyle={[
                  styles.chipText,
                  { color: theme.colors.onSurfaceVariant },
                ]}
                style={styles.chip}
              >
                {item.question_count} Questions
              </Chip>
            </View>
          </View>

          <Paragraph
            style={[styles.paperDate, { color: theme.colors.onSurfaceVariant }]}
          >
            Uploaded: {formatDate(item.uploaded_at)}
          </Paragraph>

          {item.total_pages && item.total_pages > 1 && (
            <Paragraph
              style={[
                styles.paperPages,
                { color: theme.colors.onSurfaceVariant },
              ]}
            >
              📄 {item.total_pages} pages
            </Paragraph>
          )}

          <View style={styles.paperActions}>
            <Button
              mode="outlined"
              onPress={() => viewQuestions(item)}
              style={styles.actionButton}
              icon="format-list-bulleted"
            >
              View Questions
            </Button>
            <Button
              mode="outlined"
              onPress={() => viewPaperDetails(item)}
              style={styles.actionButton}
              icon="account-group"
            >
              View Submissions
            </Button>
          </View>
        </Card.Content>
      </Card>
    );
  };

  if (loading) {
    return (
      <View
        style={[
          styles.loadingContainer,
          { backgroundColor: theme.colors.background },
        ]}
      >
        <ActivityIndicator size="large" color={theme.colors.primary} />
        <Paragraph
          style={[styles.loadingText, { color: theme.colors.onSurfaceVariant }]}
        >
          Loading tests...
        </Paragraph>
      </View>
    );
  }

  return (
    <View
      style={[styles.container, { backgroundColor: theme.colors.background }]}
    >
      {/* Header */}
      <View style={[styles.header, { backgroundColor: theme.colors.surface }]}>
        <View>
          <Title
            style={[styles.welcomeText, { color: theme.colors.onSurface }]}
          >
            Test Management
          </Title>
          <Paragraph
            style={[
              styles.headerSubtitle,
              { color: theme.colors.onSurfaceVariant },
            ]}
          >
            Manage your question papers and view submissions
          </Paragraph>
        </View>
      </View>

      {/* Papers List */}
      <FlatList
        data={papers}
        renderItem={renderPaper}
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
            <Title
              style={[
                styles.emptyTitle,
                { color: theme.colors.onSurfaceVariant },
              ]}
            >
              No Tests Yet
            </Title>
            <Paragraph
              style={[
                styles.emptyText,
                { color: theme.colors.onSurfaceVariant },
              ]}
            >
              Upload your first question paper to get started
            </Paragraph>
          </View>
        }
      />

      {/* Floating Action Button */}
      <FAB
        style={[styles.fab, { backgroundColor: theme.colors.primary }]}
        icon="plus"
        label="Upload Paper"
        onPress={() => router.push("/upload")}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  header: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "flex-start",
    padding: 20,
    elevation: 2,
    paddingTop: 60, // Account for status bar
  },
  welcomeText: {
    fontSize: 24,
    fontWeight: "bold",
  },
  headerSubtitle: {
    marginTop: 4,
  },
  listContainer: {
    padding: 20,
    paddingBottom: 100,
  },
  paperCard: {
    marginBottom: 15,
    elevation: 3,
  },
  paperHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "flex-start",
    marginBottom: 8,
  },
  paperTitle: {
    flex: 1,
    fontSize: 18,
    fontWeight: "bold",
  },
  chipsContainer: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: 5,
  },
  chip: {
    marginLeft: 5,
  },
  chipText: {
    fontSize: 12,
  },
  paperDate: {
    fontSize: 14,
    marginBottom: 5,
  },
  paperPages: {
    fontSize: 14,
    marginBottom: 15,
    fontStyle: "italic",
  },
  paperActions: {
    flexDirection: "row",
    justifyContent: "flex-end",
    gap: 10,
  },
  actionButton: {
    flex: 1,
  },
  fab: {
    position: "absolute",
    margin: 20,
    right: 0,
    bottom: 0,
  },
  loadingContainer: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
  },
  loadingText: {
    marginTop: 10,
  },
  emptyContainer: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
    paddingTop: 100,
  },
  emptyTitle: {
    fontSize: 20,
    marginBottom: 10,
  },
  emptyText: {
    textAlign: "center",
    paddingHorizontal: 40,
  },
});
