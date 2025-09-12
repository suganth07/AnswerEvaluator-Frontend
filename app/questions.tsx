import React, { useState, useEffect } from "react";
import {
  View,
  StyleSheet,
  ScrollView,
  Alert,
  RefreshControl,
  SafeAreaView,
  StatusBar,
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
  Surface,
  Text,
  List,
  IconButton,
  Badge,
} from "react-native-paper";
import { useTheme } from "../context/ThemeContext";
import { questionService } from "../services/api";
import { router, useLocalSearchParams } from "expo-router";

interface Question {
  id: number;
  paper_id: number;
  question_number: number;
  question_text: string;
  correct_option: string;
  page_number: number;
  question_type: string;
  options: any;
}

interface QuestionsData {
  paper: {
    id: number;
    name: string;
  };
  questions: Question[];
  totalQuestions: number;
}

export default function QuestionsScreen() {
  const [questionsData, setQuestionsData] = useState<QuestionsData | null>(
    null
  );
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const { theme, isDarkMode } = useTheme();
  const params = useLocalSearchParams();
  const paperId = params.paperId as string;
  const paperName = params.paperName as string;

  useEffect(() => {
    if (paperId) {
      fetchQuestions();
    }
  }, [paperId]);

  const fetchQuestions = async () => {
    try {
      setLoading(true);
      const data = await questionService.getQuestionsByPaper(paperId);
      setQuestionsData(data);
    } catch (error: any) {
      Alert.alert(
        "Error",
        error.response?.data?.error || "Failed to fetch questions"
      );
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  const onRefresh = () => {
    setRefreshing(true);
    fetchQuestions();
  };

  const handleAddQuestion = () => {
    router.push({
      pathname: "/question-editor",
      params: {
        mode: "add",
        paperId: paperId,
        paperName: paperName,
      },
    });
  };

  const handleEditQuestion = (question: Question) => {
    router.push({
      pathname: "/question-editor",
      params: {
        mode: "edit",
        questionId: question.id.toString(),
        paperId: paperId,
        paperName: paperName,
        questionData: JSON.stringify(question),
      },
    });
  };

  const handleDeleteQuestion = (question: Question) => {
    Alert.alert(
      "Delete Question",
      `Are you sure you want to delete Question ${question.question_number}?`,
      [
        { text: "Cancel", style: "cancel" },
        {
          text: "Delete",
          style: "destructive",
          onPress: async () => {
            try {
              await questionService.deleteQuestion(question.id.toString());
              Alert.alert("Success", "Question deleted successfully");
              fetchQuestions(); // Refresh the list
            } catch (error: any) {
              Alert.alert(
                "Error",
                error.response?.data?.error || "Failed to delete question"
              );
            }
          },
        },
      ]
    );
  };

  const getQuestionTypeInfo = (questionType: string) => {
    switch (questionType) {
      case "omr":
        return {
          label: "OMR",
          color: theme.colors.primary,
          icon: "circle-outline",
        };
      case "traditional":
        return {
          label: "Traditional",
          color: theme.colors.secondary,
          icon: "text-box-outline",
        };
      case "mixed":
        return {
          label: "Mixed",
          color: theme.colors.tertiary,
          icon: "format-list-bulleted",
        };
      case "fill_blanks":
        return {
          label: "Fill Blanks",
          color: "#8B5CF6",
          icon: "pencil-outline",
        };
      default:
        return {
          label: "Traditional",
          color: theme.colors.secondary,
          icon: "text-box-outline",
        };
    }
  };

  const renderQuestion = (question: Question, index: number) => {
    const typeInfo = getQuestionTypeInfo(question.question_type);

    return (
      <Card
        key={question.id}
        style={[styles.questionCard, { backgroundColor: theme.colors.surface }]}
        elevation={2}
      >
        <Card.Content>
          <View style={styles.questionHeader}>
            <View style={styles.questionNumberContainer}>
              <Badge
                size={32}
                style={{ backgroundColor: theme.colors.primary }}
              >
                {question.question_number}
              </Badge>
              <View style={styles.questionMetadata}>
                <Chip
                  mode="outlined"
                  icon={typeInfo.icon}
                  textStyle={[styles.chipText, { color: typeInfo.color }]}
                  style={[styles.typeChip, { borderColor: typeInfo.color }]}
                  compact
                >
                  {typeInfo.label}
                </Chip>
                <Text
                  variant="bodySmall"
                  style={{ color: theme.colors.onSurfaceVariant }}
                >
                  Page {question.page_number}
                </Text>
              </View>
            </View>

            <View style={styles.questionActions}>
              <IconButton
                icon="pencil"
                iconColor={theme.colors.primary}
                size={20}
                onPress={() => handleEditQuestion(question)}
                style={styles.actionIcon}
              />
              <IconButton
                icon="delete"
                iconColor={theme.colors.error}
                size={20}
                onPress={() => handleDeleteQuestion(question)}
                style={styles.actionIcon}
              />
            </View>
          </View>

          {question.question_text && (
            <View style={styles.questionTextContainer}>
              <Text
                variant="bodyMedium"
                style={[styles.questionText, { color: theme.colors.onSurface }]}
              >
                {question.question_text}
              </Text>
            </View>
          )}

          <View style={styles.answerContainer}>
            <Text
              variant="bodySmall"
              style={[
                styles.answerLabel,
                { color: theme.colors.onSurfaceVariant },
              ]}
            >
              Correct Answer:
            </Text>
            <Chip
              mode="flat"
              textStyle={[
                styles.answerText,
                { color: theme.colors.onTertiary },
              ]}
              style={[
                styles.answerChip,
                { backgroundColor: theme.colors.tertiary },
              ]}
              compact
            >
              {question.correct_option}
            </Chip>
          </View>

          {question.options && typeof question.options === "object" && (
            <View style={styles.optionsContainer}>
              <Text
                variant="bodySmall"
                style={[
                  styles.optionsLabel,
                  { color: theme.colors.onSurfaceVariant },
                ]}
              >
                Options:
              </Text>
              <View style={styles.optionsList}>
                {Object.entries(question.options).map(([key, value]) => (
                  <Chip
                    key={key}
                    mode="outlined"
                    textStyle={[
                      styles.optionText,
                      { color: theme.colors.onSurfaceVariant },
                    ]}
                    style={styles.optionChip}
                    compact
                  >
                    {key}: {String(value)}
                  </Chip>
                ))}
              </View>
            </View>
          )}
        </Card.Content>
      </Card>
    );
  };

  if (loading) {
    return (
      <SafeAreaView
        style={[styles.safeArea, { backgroundColor: theme.colors.surface }]}
      >
        <StatusBar
          barStyle={isDarkMode ? "light-content" : "dark-content"}
          backgroundColor={theme.colors.surface}
        />
        <Surface
          style={[styles.header, { backgroundColor: theme.colors.surface }]}
          elevation={2}
        >
          <Appbar.Header style={styles.appbarHeader}>
            <Appbar.BackAction
              onPress={() => router.back()}
              iconColor={theme.colors.onSurface}
            />
            <Appbar.Content
              title="Questions"
              titleStyle={[
                styles.headerTitle,
                { color: theme.colors.onSurface },
              ]}
            />
          </Appbar.Header>
        </Surface>
        <View
          style={[
            styles.loadingContainer,
            { backgroundColor: theme.colors.background },
          ]}
        >
          <ActivityIndicator size="large" color={theme.colors.primary} />
          <Text
            variant="bodyLarge"
            style={[
              styles.loadingText,
              { color: theme.colors.onSurfaceVariant },
            ]}
          >
            Loading questions...
          </Text>
        </View>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView
      style={[styles.safeArea, { backgroundColor: theme.colors.surface }]}
    >
      <StatusBar
        barStyle={isDarkMode ? "light-content" : "dark-content"}
        backgroundColor={theme.colors.surface}
      />

      {/* Enhanced Header */}
      <Surface
        style={[styles.header, { backgroundColor: theme.colors.surface }]}
        elevation={2}
      >
        <Appbar.Header style={styles.appbarHeader}>
          <Appbar.BackAction
            onPress={() => router.back()}
            iconColor={theme.colors.onSurface}
          />
          <Appbar.Content
            title="Questions"
            subtitle={paperName}
            titleStyle={[styles.headerTitle, { color: theme.colors.onSurface }]}
            subtitleStyle={[
              styles.headerSubtitle,
              { color: theme.colors.onSurfaceVariant },
            ]}
          />
          <Appbar.Action
            icon="plus"
            onPress={handleAddQuestion}
            iconColor={theme.colors.primary}
          />
        </Appbar.Header>
      </Surface>

      <ScrollView
        style={[styles.container, { backgroundColor: theme.colors.background }]}
        contentContainerStyle={styles.scrollContent}
        showsVerticalScrollIndicator={false}
        refreshControl={
          <RefreshControl
            refreshing={refreshing}
            onRefresh={onRefresh}
            colors={[theme.colors.primary]}
            tintColor={theme.colors.primary}
          />
        }
      >
        {/* Paper Summary */}
        <Card
          style={[
            styles.summaryCard,
            { backgroundColor: theme.colors.surface },
          ]}
          elevation={3}
        >
          <Card.Content>
            <View style={styles.summaryHeader}>
              <View>
                <Text
                  variant="titleLarge"
                  style={[styles.paperTitle, { color: theme.colors.onSurface }]}
                >
                  {questionsData?.paper.name}
                </Text>
                <Text
                  variant="bodyMedium"
                  style={[
                    styles.questionCount,
                    { color: theme.colors.onSurfaceVariant },
                  ]}
                >
                  {questionsData?.totalQuestions || 0} Questions
                </Text>
              </View>
              <IconButton
                icon="format-list-bulleted"
                iconColor={theme.colors.primary}
                size={32}
                style={styles.summaryIcon}
              />
            </View>
          </Card.Content>
        </Card>

        {/* Questions List */}
        {questionsData?.questions && questionsData.questions.length > 0 ? (
          <View style={styles.questionsContainer}>
            <Text
              variant="titleMedium"
              style={[styles.sectionTitle, { color: theme.colors.onSurface }]}
            >
              All Questions
            </Text>
            {questionsData.questions.map((question, index) =>
              renderQuestion(question, index)
            )}
          </View>
        ) : (
          <Card
            style={[
              styles.emptyCard,
              { backgroundColor: theme.colors.surface },
            ]}
            elevation={1}
          >
            <Card.Content style={styles.emptyContainer}>
              <IconButton
                icon="format-list-bulleted"
                iconColor={theme.colors.onSurfaceVariant}
                size={64}
                style={styles.emptyIcon}
              />
              <Text
                variant="headlineSmall"
                style={[
                  styles.emptyTitle,
                  { color: theme.colors.onSurfaceVariant },
                ]}
              >
                No Questions Yet
              </Text>
              <Text
                variant="bodyLarge"
                style={[
                  styles.emptyText,
                  { color: theme.colors.onSurfaceVariant },
                ]}
              >
                Add your first question to get started
              </Text>
              <Button
                mode="contained"
                onPress={handleAddQuestion}
                style={styles.emptyButton}
                icon="plus"
              >
                Add Question
              </Button>
            </Card.Content>
          </Card>
        )}

        {/* Bottom Spacing */}
        <View style={styles.bottomSpacing} />
      </ScrollView>

      {/* Floating Action Button */}
      <FAB
        style={[styles.fab, { backgroundColor: theme.colors.primary }]}
        icon="plus"
        label="Add Question"
        onPress={handleAddQuestion}
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
    shadowColor: "#000",
    shadowOffset: {
      width: 0,
      height: 2,
    },
    shadowOpacity: 0.1,
    shadowRadius: 3.84,
    elevation: 3,
  },
  appbarHeader: {
    backgroundColor: "transparent",
  },
  headerTitle: {
    fontSize: 20,
    fontWeight: "600",
  },
  headerSubtitle: {
    fontSize: 14,
    opacity: 0.8,
  },
  scrollContent: {
    paddingHorizontal: 16,
    paddingTop: 8,
    paddingBottom: 100,
  },
  summaryCard: {
    marginBottom: 20,
    borderRadius: 16,
    overflow: "hidden",
  },
  summaryHeader: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
  },
  paperTitle: {
    fontWeight: "600",
    marginBottom: 4,
  },
  questionCount: {
    opacity: 0.8,
  },
  summaryIcon: {
    margin: 0,
  },
  sectionTitle: {
    fontWeight: "600",
    marginBottom: 12,
    paddingHorizontal: 4,
  },
  questionsContainer: {
    gap: 12,
  },
  questionCard: {
    borderRadius: 12,
    overflow: "hidden",
    marginBottom: 8,
  },
  questionHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "flex-start",
    marginBottom: 12,
  },
  questionNumberContainer: {
    flexDirection: "row",
    alignItems: "center",
    gap: 12,
    flex: 1,
  },
  questionMetadata: {
    gap: 4,
  },
  questionActions: {
    flexDirection: "row",
    gap: 4,
  },
  actionIcon: {
    margin: 0,
  },
  typeChip: {
    alignSelf: "flex-start",
  },
  chipText: {
    fontSize: 12,
  },
  questionTextContainer: {
    marginBottom: 12,
    paddingLeft: 8,
  },
  questionText: {
    lineHeight: 20,
  },
  answerContainer: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
    marginBottom: 12,
  },
  answerLabel: {
    fontWeight: "500",
  },
  answerChip: {
    alignSelf: "flex-start",
  },
  answerText: {
    fontSize: 12,
    fontWeight: "600",
  },
  optionsContainer: {
    gap: 8,
  },
  optionsLabel: {
    fontWeight: "500",
  },
  optionsList: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: 6,
  },
  optionChip: {
    alignSelf: "flex-start",
  },
  optionText: {
    fontSize: 11,
  },
  emptyCard: {
    borderRadius: 16,
    overflow: "hidden",
    marginTop: 40,
  },
  emptyContainer: {
    alignItems: "center",
    paddingVertical: 40,
    paddingHorizontal: 20,
  },
  emptyIcon: {
    margin: 0,
    marginBottom: 16,
  },
  emptyTitle: {
    textAlign: "center",
    marginBottom: 8,
  },
  emptyText: {
    textAlign: "center",
    marginBottom: 24,
    opacity: 0.8,
  },
  emptyButton: {
    marginTop: 8,
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
    marginTop: 16,
  },
  bottomSpacing: {
    height: 20,
  },
});
