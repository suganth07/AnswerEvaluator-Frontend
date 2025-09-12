import React, { useState, useEffect, useRef } from "react";
import {
  View,
  StyleSheet,
  ScrollView,
  Alert,
  SafeAreaView,
  StatusBar,
  KeyboardAvoidingView,
  Platform,
} from "react-native";
import {
  Card,
  TextInput,
  Button,
  Appbar,
  Surface,
  Text,
  SegmentedButtons,
  Switch,
  List,
  Divider,
  HelperText,
} from "react-native-paper";
import { useTheme } from "../context/ThemeContext";
import { questionService } from "../services/api";
import { router, useLocalSearchParams } from "expo-router";

interface QuestionOptions {
  A?: string;
  B?: string;
  C?: string;
  D?: string;
  [key: string]: string | undefined;
}

export default function QuestionEditorScreen() {
  const [formData, setFormData] = useState({
    question_number: "",
    question_text: "",
    correct_option: "",
    page_number: "1",
    question_type: "traditional",
    options: {} as QuestionOptions,
  });
  const [hasOptions, setHasOptions] = useState(false);
  const [loading, setLoading] = useState(false);
  const [errors, setErrors] = useState<{ [key: string]: string }>({});
  const initializedRef = useRef(false);

  const { theme, isDarkMode } = useTheme();
  const params = useLocalSearchParams();

  const mode = params.mode as string; // 'add' or 'edit'
  const questionId = params.questionId as string;
  const paperId = params.paperId as string;
  const paperName = params.paperName as string;

  useEffect(() => {
    if (mode === "edit" && questionId && !initializedRef.current) {
      try {
        const questionData = params.questionData
          ? JSON.parse(params.questionData as string)
          : null;
        if (questionData) {
          setFormData({
            question_number: questionData.question_number.toString(),
            question_text: questionData.question_text || "",
            correct_option: questionData.correct_option,
            page_number: questionData.page_number.toString(),
            question_type: questionData.question_type,
            options: questionData.options || {},
          });
          setHasOptions(
            questionData.options && Object.keys(questionData.options).length > 0
          );
          initializedRef.current = true;
        }
      } catch (error) {
        console.error("Error parsing question data:", error);
        Alert.alert("Error", "Invalid question data provided");
        router.back();
      }
    }
  }, [mode, questionId, params.questionData]); // Safe to use params.questionData now since we have the ref guard

  const questionTypes = [
    { value: "traditional", label: "Traditional" },
    { value: "omr", label: "OMR" },
    { value: "mixed", label: "Mixed" },
  ];

  const validateForm = () => {
    const newErrors: { [key: string]: string } = {};

    if (!formData.question_number) {
      newErrors.question_number = "Question number is required";
    } else if (
      isNaN(Number(formData.question_number)) ||
      Number(formData.question_number) <= 0
    ) {
      newErrors.question_number = "Question number must be a positive number";
    }

    if (!formData.correct_option) {
      newErrors.correct_option = "Correct option is required";
    }

    if (!formData.page_number) {
      newErrors.page_number = "Page number is required";
    } else if (
      isNaN(Number(formData.page_number)) ||
      Number(formData.page_number) <= 0
    ) {
      newErrors.page_number = "Page number must be a positive number";
    }

    if (hasOptions) {
      const optionKeys = Object.keys(formData.options);
      if (optionKeys.length === 0) {
        newErrors.options =
          "At least one option is required when options are enabled";
      } else {
        const correctOptionExists = optionKeys.includes(
          formData.correct_option.toUpperCase()
        );
        if (!correctOptionExists) {
          newErrors.correct_option =
            "Correct option must match one of the provided options";
        }
      }
    }

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleSave = async () => {
    if (!validateForm()) {
      Alert.alert("Validation Error", "Please fix the errors in the form");
      return;
    }

    setLoading(true);
    try {
      const questionPayload = {
        ...formData,
        question_number: Number(formData.question_number),
        page_number: Number(formData.page_number),
        options:
          hasOptions && Object.keys(formData.options).length > 0
            ? formData.options
            : null,
      };

      if (mode === "add") {
        await questionService.createQuestion({
          ...questionPayload,
          paper_id: Number(paperId),
        });
        Alert.alert("Success", "Question created successfully");
      } else {
        await questionService.updateQuestion(questionId, questionPayload);
        Alert.alert("Success", "Question updated successfully");
      }

      router.back();
    } catch (error: any) {
      Alert.alert(
        "Error",
        error.response?.data?.error || `Failed to ${mode} question`
      );
    } finally {
      setLoading(false);
    }
  };

  const updateFormData = (field: string, value: string) => {
    setFormData((prev) => ({ ...prev, [field]: value }));
    // Clear error for this field when user starts typing
    if (errors[field]) {
      setErrors((prev) => ({ ...prev, [field]: "" }));
    }
  };

  const updateOption = (key: string, value: string) => {
    setFormData((prev) => ({
      ...prev,
      options: {
        ...prev.options,
        [key]: value,
      },
    }));
    // Clear options error
    if (errors.options) {
      setErrors((prev) => ({ ...prev, options: "" }));
    }
  };

  const removeOption = (key: string) => {
    setFormData((prev) => {
      const newOptions = { ...prev.options };
      delete newOptions[key];
      return {
        ...prev,
        options: newOptions,
      };
    });
  };

  const addNewOption = () => {
    const existingKeys = Object.keys(formData.options);
    const availableKeys = ["A", "B", "C", "D", "E", "F", "G", "H"];
    const nextKey = availableKeys.find((key) => !existingKeys.includes(key));

    if (nextKey) {
      updateOption(nextKey, "");
    } else {
      Alert.alert("Limit Reached", "Maximum 8 options allowed");
    }
  };

  const renderOptionsSection = () => {
    if (!hasOptions) return null;

    return (
      <Card
        style={[styles.sectionCard, { backgroundColor: theme.colors.surface }]}
        elevation={2}
      >
        <Card.Content>
          <View style={styles.sectionHeader}>
            <Text
              variant="titleMedium"
              style={[styles.sectionTitle, { color: theme.colors.onSurface }]}
            >
              Answer Options
            </Text>
            <Button mode="outlined" onPress={addNewOption} icon="plus" compact>
              Add Option
            </Button>
          </View>

          {errors.options ? (
            <HelperText type="error" visible={true}>
              {errors.options}
            </HelperText>
          ) : null}

          <Divider
            style={[
              styles.sectionDivider,
              { backgroundColor: theme.colors.outline },
            ]}
          />

          {Object.entries(formData.options).map(([key, value]) => (
            <View key={key} style={styles.optionRow}>
              <TextInput
                label={`Option ${key}`}
                value={value}
                onChangeText={(text) => updateOption(key, text)}
                style={styles.optionInput}
                mode="outlined"
                right={
                  <TextInput.Icon
                    icon="close"
                    onPress={() => removeOption(key)}
                  />
                }
              />
            </View>
          ))}

          {Object.keys(formData.options).length === 0 && (
            <Text
              variant="bodyMedium"
              style={[
                styles.emptyOptions,
                { color: theme.colors.onSurfaceVariant },
              ]}
            >
              No options added yet. Click "Add Option" to get started.
            </Text>
          )}
        </Card.Content>
      </Card>
    );
  };

  return (
    <SafeAreaView
      style={[styles.safeArea, { backgroundColor: theme.colors.surface }]}
    >
      <StatusBar
        barStyle={isDarkMode ? "light-content" : "dark-content"}
        backgroundColor={theme.colors.surface}
      />

      {/* Header */}
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
            title={mode === "add" ? "Add Question" : "Edit Question"}
            subtitle={paperName}
            titleStyle={[styles.headerTitle, { color: theme.colors.onSurface }]}
            subtitleStyle={[
              styles.headerSubtitle,
              { color: theme.colors.onSurfaceVariant },
            ]}
          />
          <Appbar.Action
            icon="content-save"
            onPress={handleSave}
            disabled={loading}
            iconColor={theme.colors.primary}
          />
        </Appbar.Header>
      </Surface>

      <KeyboardAvoidingView
        style={styles.container}
        behavior={Platform.OS === "ios" ? "padding" : "height"}
      >
        <ScrollView
          style={[
            styles.scrollView,
            { backgroundColor: theme.colors.background },
          ]}
          contentContainerStyle={styles.scrollContent}
          showsVerticalScrollIndicator={false}
        >
          {/* Basic Information */}
          <Card
            style={[
              styles.sectionCard,
              { backgroundColor: theme.colors.surface },
            ]}
            elevation={2}
          >
            <Card.Content>
              <Text
                variant="titleMedium"
                style={[styles.sectionTitle, { color: theme.colors.onSurface }]}
              >
                Basic Information
              </Text>
              <Divider
                style={[
                  styles.sectionDivider,
                  { backgroundColor: theme.colors.outline },
                ]}
              />

              <View style={styles.formRow}>
                <TextInput
                  label="Question Number *"
                  value={formData.question_number}
                  onChangeText={(text) =>
                    updateFormData("question_number", text)
                  }
                  keyboardType="numeric"
                  mode="outlined"
                  style={[styles.halfInput, styles.marginRight]}
                  error={!!errors.question_number}
                />
                <TextInput
                  label="Page Number *"
                  value={formData.page_number}
                  onChangeText={(text) => updateFormData("page_number", text)}
                  keyboardType="numeric"
                  mode="outlined"
                  style={styles.halfInput}
                  error={!!errors.page_number}
                />
              </View>

              {errors.question_number ? (
                <HelperText type="error" visible={true}>
                  {errors.question_number}
                </HelperText>
              ) : null}

              {errors.page_number ? (
                <HelperText type="error" visible={true}>
                  {errors.page_number}
                </HelperText>
              ) : null}
            </Card.Content>
          </Card>

          {/* Question Type */}
          <Card
            style={[
              styles.sectionCard,
              { backgroundColor: theme.colors.surface },
            ]}
            elevation={2}
          >
            <Card.Content>
              <Text
                variant="titleMedium"
                style={[styles.sectionTitle, { color: theme.colors.onSurface }]}
              >
                Question Type
              </Text>
              <Divider
                style={[
                  styles.sectionDivider,
                  { backgroundColor: theme.colors.outline },
                ]}
              />

              <SegmentedButtons
                value={formData.question_type}
                onValueChange={(value) =>
                  updateFormData("question_type", value)
                }
                buttons={questionTypes}
                style={styles.segmentedButtons}
              />
            </Card.Content>
          </Card>

          {/* Question Text */}
          <Card
            style={[
              styles.sectionCard,
              { backgroundColor: theme.colors.surface },
            ]}
            elevation={2}
          >
            <Card.Content>
              <Text
                variant="titleMedium"
                style={[styles.sectionTitle, { color: theme.colors.onSurface }]}
              >
                Question Text
              </Text>
              <Divider
                style={[
                  styles.sectionDivider,
                  { backgroundColor: theme.colors.outline },
                ]}
              />

              <TextInput
                label="Question Text (Optional)"
                value={formData.question_text}
                onChangeText={(text) => updateFormData("question_text", text)}
                mode="outlined"
                multiline
                numberOfLines={4}
                placeholder="Enter the question text here..."
                style={styles.textArea}
              />
            </Card.Content>
          </Card>

          {/* Correct Answer & Options */}
          <Card
            style={[
              styles.sectionCard,
              { backgroundColor: theme.colors.surface },
            ]}
            elevation={2}
          >
            <Card.Content>
              <View style={styles.sectionHeader}>
                <Text
                  variant="titleMedium"
                  style={[
                    styles.sectionTitle,
                    { color: theme.colors.onSurface },
                  ]}
                >
                  Answer Configuration
                </Text>
                <View style={styles.switchContainer}>
                  <Text
                    variant="bodyMedium"
                    style={{ color: theme.colors.onSurface }}
                  >
                    Has Options
                  </Text>
                  <Switch
                    value={hasOptions}
                    onValueChange={setHasOptions}
                    color={theme.colors.primary}
                  />
                </View>
              </View>

              <Divider
                style={[
                  styles.sectionDivider,
                  { backgroundColor: theme.colors.outline },
                ]}
              />

              <TextInput
                label="Correct Answer *"
                value={formData.correct_option}
                onChangeText={(text) =>
                  updateFormData("correct_option", text.toUpperCase())
                }
                mode="outlined"
                placeholder={
                  hasOptions ? "A, B, C, D..." : "Enter correct answer"
                }
                style={styles.input}
                error={!!errors.correct_option}
              />

              {errors.correct_option ? (
                <HelperText type="error" visible={true}>
                  {errors.correct_option}
                </HelperText>
              ) : null}
            </Card.Content>
          </Card>

          {/* Options Section */}
          {renderOptionsSection()}

          {/* Action Buttons */}
          <Card
            style={[
              styles.sectionCard,
              { backgroundColor: theme.colors.surface },
            ]}
            elevation={2}
          >
            <Card.Content>
              <View style={styles.actionButtons}>
                <Button
                  mode="outlined"
                  onPress={() => router.back()}
                  style={styles.cancelButton}
                  disabled={loading}
                >
                  Cancel
                </Button>
                <Button
                  mode="contained"
                  onPress={handleSave}
                  loading={loading}
                  style={styles.saveButton}
                  icon="content-save"
                >
                  {mode === "add" ? "Create" : "Update"}
                </Button>
              </View>
            </Card.Content>
          </Card>

          {/* Bottom Spacing */}
          <View style={styles.bottomSpacing} />
        </ScrollView>
      </KeyboardAvoidingView>
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
  scrollView: {
    flex: 1,
  },
  scrollContent: {
    paddingHorizontal: 16,
    paddingTop: 8,
  },
  sectionCard: {
    marginBottom: 16,
    borderRadius: 12,
    overflow: "hidden",
  },
  sectionHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: 8,
  },
  sectionTitle: {
    fontWeight: "600",
  },
  sectionDivider: {
    height: 1,
    marginBottom: 16,
    opacity: 0.2,
  },
  formRow: {
    flexDirection: "row",
    gap: 12,
  },
  halfInput: {
    flex: 1,
  },
  marginRight: {
    marginRight: 6,
  },
  input: {
    marginBottom: 8,
  },
  textArea: {
    marginBottom: 8,
  },
  segmentedButtons: {
    marginBottom: 8,
  },
  switchContainer: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
  },
  optionRow: {
    marginBottom: 8,
  },
  optionInput: {
    marginBottom: 8,
  },
  emptyOptions: {
    textAlign: "center",
    fontStyle: "italic",
    paddingVertical: 20,
  },
  actionButtons: {
    flexDirection: "row",
    gap: 12,
    marginTop: 8,
  },
  cancelButton: {
    flex: 1,
  },
  saveButton: {
    flex: 1,
  },
  bottomSpacing: {
    height: 40,
  },
});
