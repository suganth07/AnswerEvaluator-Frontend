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
  TouchableOpacity,
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
import { Ionicons } from "@expo/vector-icons";
import { LinearGradient } from "expo-linear-gradient";

interface QuestionOptions {
  A?: string;
  B?: string;
  C?: string;
  D?: string;
  E?: string;
  F?: string;
  G?: string;
  H?: string;
  [key: string]: string | undefined;
}

export default function QuestionEditorScreen() {
  const [formData, setFormData] = useState({
    question_number: "",
    question_text: "",
    correct_option: "",
    correct_options: [] as string[], // Add support for multiple correct answers
    page_number: "1",
    question_type: "traditional",
    options: {} as QuestionOptions,
  });
  const [hasOptions, setHasOptions] = useState(false);
  const [isMultipleCorrect, setIsMultipleCorrect] = useState(false); // New state for multiple correct toggle

  // Utility function to convert numeric keys (0,1,2) to alphabetic keys (A,B,C)
  const convertNumericKeysToAlphabetic = (options: QuestionOptions | string[]): QuestionOptions => {
    const converted: QuestionOptions = {};
    const alphabetKeys = ['A', 'B', 'C', 'D', 'E', 'F', 'G', 'H'];
    
    // Handle array format (legacy): ["A", "B", "C", "D"]
    if (Array.isArray(options)) {
      options.forEach((option, index) => {
        if (index < alphabetKeys.length) {
          converted[alphabetKeys[index]] = option;
        }
      });
      return converted;
    }
    
    // Handle object format: {"0": "text", "1": "text"} or {"A": "text", "B": "text"}
    const entries = Object.entries(options);
    
    // Check if we have numeric keys
    const hasNumericKeys = entries.some(([key]) => /^\d+$/.test(key));
    
    if (hasNumericKeys) {
      // Sort entries by numeric value for proper conversion
      const sortedEntries = entries
        .filter(([key]) => /^\d+$/.test(key))
        .sort(([a], [b]) => parseInt(a) - parseInt(b));
      
      // Convert to alphabetic keys
      sortedEntries.forEach(([_, value], index) => {
        if (index < alphabetKeys.length) {
          converted[alphabetKeys[index]] = value;
        }
      });
      
      // Keep any existing alphabetic keys
      entries
        .filter(([key]) => /^[A-H]$/.test(key))
        .forEach(([key, value]) => {
          if (!converted[key]) {
            converted[key] = value;
          }
        });
      
      return converted;
    }
    
    // If no numeric keys, return the options as-is (already alphabetic)
    return options as QuestionOptions;
  };

  // Utility function to convert numeric correct answers to alphabetic
  const convertCorrectAnswersToAlphabetic = (correctAnswers: string[], hasNumericKeys: boolean): string[] => {
    if (!hasNumericKeys) return correctAnswers;
    
    const alphabetKeys = ['A', 'B', 'C', 'D', 'E', 'F', 'G', 'H'];
    return correctAnswers.map(answer => {
      const numericValue = parseInt(answer);
      if (!isNaN(numericValue) && numericValue < alphabetKeys.length) {
        return alphabetKeys[numericValue];
      }
      return answer.toUpperCase();
    });
  };
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
          // Parse correct_options if it exists and is a string
          let correctOptions: string[] = [];
          let isMultiple = false;
          
          if (questionData.correct_options) {
            try {
              correctOptions = typeof questionData.correct_options === 'string' 
                ? JSON.parse(questionData.correct_options)
                : questionData.correct_options;
              isMultiple = Array.isArray(correctOptions) && correctOptions.length > 1;
            } catch (e) {
              console.error('Error parsing correct_options:', e);
            }
          }
          
          // Convert options from numeric to alphabetic format for consistency
          const convertedOptions = convertNumericKeysToAlphabetic(questionData.options || {});
          const hasNumericKeys = Array.isArray(questionData.options) || 
                                Object.keys(questionData.options || {}).some(key => /^\d+$/.test(key));
          
          // Convert correct answers if necessary
          const convertedCorrectOptions = convertCorrectAnswersToAlphabetic(correctOptions, hasNumericKeys);
          const convertedCorrectOption = hasNumericKeys && questionData.correct_option && /^\d+$/.test(questionData.correct_option)
            ? convertCorrectAnswersToAlphabetic([questionData.correct_option], true)[0]
            : (questionData.correct_option || "").toUpperCase();
          
          setFormData({
            question_number: questionData.question_number.toString(),
            question_text: questionData.question_text || "",
            correct_option: convertedCorrectOption,
            correct_options: convertedCorrectOptions,
            page_number: questionData.page_number.toString(),
            question_type: questionData.question_type,
            options: convertedOptions,
          });
          setHasOptions(
            convertedOptions && Object.keys(convertedOptions).length > 0
          );
          setIsMultipleCorrect(isMultiple);
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
    { value: "fill_blanks", label: "Fill Blanks" },
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

    // Validate correct answers based on single/multiple mode
    if (isMultipleCorrect) {
      if (!formData.correct_options || formData.correct_options.length === 0) {
        newErrors.correct_option = "At least one correct option is required";
      }
    } else {
      if (!formData.correct_option) {
        newErrors.correct_option = "Correct option is required";
      }
    }

    if (!formData.page_number) {
      newErrors.page_number = "Page number is required";
    } else if (
      isNaN(Number(formData.page_number)) ||
      Number(formData.page_number) <= 0
    ) {
      newErrors.page_number = "Page number must be a positive number";
    }

    // Only validate option matching for question types that use multiple choice options
    if (hasOptions && (formData.question_type === "omr" || formData.question_type === "traditional" || formData.question_type === "mixed")) {
      const optionKeys = Object.keys(formData.options);
      if (optionKeys.length === 0) {
        newErrors.options =
          "At least one option is required when options are enabled";
      } else {
        // Validate correct answers match available options
        if (isMultipleCorrect) {
          const invalidOptions = formData.correct_options.filter(
            option => !optionKeys.includes(option.toUpperCase())
          );
          if (invalidOptions.length > 0) {
            newErrors.correct_option =
              `Invalid correct options: ${invalidOptions.join(', ')}. Must match available options: ${optionKeys.join(', ')}.`;
          }
        } else {
          const correctOptionExists = optionKeys.includes(
            formData.correct_option.toUpperCase()
          );
          if (!correctOptionExists && formData.correct_option) {
            newErrors.correct_option =
              `Correct option must match one of the provided options: ${optionKeys.join(', ')}`;
          }
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
      // Base payload
      const questionPayload: any = {
        question_number: Number(formData.question_number),
        question_text: formData.question_text,
        page_number: Number(formData.page_number),
        question_type: formData.question_type,
        options:
          hasOptions && Object.keys(formData.options).length > 0
            ? formData.options
            : null,
      };

      // Add correct answer(s) based on mode
      if (isMultipleCorrect) {
        questionPayload.correct_options = formData.correct_options;
      } else {
        questionPayload.correct_option = formData.correct_option;
      }

      if (mode === "add") {
        await questionService.createQuestion({
          ...questionPayload,
          paper_id: Number(paperId),
        });
        Alert.alert("Success", `Question created successfully with ${isMultipleCorrect ? 'multiple' : 'single'} correct answer${isMultipleCorrect ? 's' : ''}`);
      } else {
        await questionService.updateQuestion(questionId, questionPayload);
        Alert.alert("Success", `Question updated successfully with ${isMultipleCorrect ? 'multiple' : 'single'} correct answer${isMultipleCorrect ? 's' : ''}`);
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
    
    // Always use alphabetic sequence (A, B, C, D, E, F, G, H)
    const availableKeys = ["A", "B", "C", "D", "E", "F", "G", "H"];
    const nextKey = availableKeys.find((key) => !existingKeys.includes(key));

    if (nextKey) {
      updateOption(nextKey, "");
    } else {
      Alert.alert("Limit Reached", "Maximum 8 options allowed (A-H)");
    }
  };

  // Functions for handling multiple correct answers
  const toggleCorrectOption = (option: string) => {
    if (!isMultipleCorrect) return;
    
    const currentCorrectOptions = [...formData.correct_options];
    const index = currentCorrectOptions.indexOf(option);
    
    if (index > -1) {
      // Remove from correct options
      currentCorrectOptions.splice(index, 1);
    } else {
      // Add to correct options
      currentCorrectOptions.push(option);
    }
    
    setFormData(prev => ({ ...prev, correct_options: currentCorrectOptions }));
    
    // Clear error for correct options
    if (errors.correct_option) {
      setErrors((prev) => ({ ...prev, correct_option: "" }));
    }
  };

  const handleSingleCorrectChange = (value: string) => {
    setFormData(prev => ({ ...prev, correct_option: value }));
    // Clear error for correct option
    if (errors.correct_option) {
      setErrors((prev) => ({ ...prev, correct_option: "" }));
    }
  };

  const handleMultipleCorrectToggle = (enabled: boolean) => {
    setIsMultipleCorrect(enabled);
    
    if (enabled) {
      // Converting from single to multiple - add the single option to the array
      const singleOption = formData.correct_option;
      setFormData(prev => ({
        ...prev,
        correct_options: singleOption ? [singleOption] : [],
        correct_option: ""
      }));
    } else {
      // Converting from multiple to single - take the first option
      const firstOption = formData.correct_options.length > 0 ? formData.correct_options[0] : "";
      setFormData(prev => ({
        ...prev,
        correct_option: firstOption,
        correct_options: []
      }));
    }
    
    // Clear any existing errors
    setErrors(prev => ({ ...prev, correct_option: "" }));
  };

  const renderOptionsSection = () => {
    // Don't show options section for fill-in-the-blanks questions
    if (!hasOptions || formData.question_type === "fill_blanks") return null;

    return (
      <View
        style={[styles.modernCard, { backgroundColor: theme.colors.surface }]}
      >
        <View style={styles.cardHeader}>
          <Ionicons 
            name="list" 
            size={24} 
            color="#8B5CF6" 
            style={styles.cardIcon}
          />
          <Text
            variant="titleMedium"
            style={[styles.cardTitle, { color: theme.colors.onSurface }]}
          >
            Answer Options
          </Text>
          <Button mode="outlined" onPress={addNewOption} icon="plus" compact>
            Add Option
          </Button>
        </View>

        {/* Multiple Correct Toggle */}
        <View style={styles.multipleCorrectToggle}>
          <View style={styles.toggleHeader}>
            <Text
              variant="bodyLarge"
              style={[styles.toggleLabel, { color: theme.colors.onSurface }]}
            >
              Multiple Correct Answers
            </Text>
            <Switch
              value={isMultipleCorrect}
              onValueChange={handleMultipleCorrectToggle}
              color={theme.colors.primary}
            />
          </View>
          <HelperText type="info" visible={true}>
            {isMultipleCorrect 
              ? "Select multiple options as correct answers (e.g., Q2: A, C)" 
              : "Select only one correct answer"
            }
          </HelperText>
        </View>

        {errors.options ? (
          <HelperText type="error" visible={true}>
            {errors.options}
          </HelperText>
        ) : null}

        {Object.entries(formData.options).map(([key, value]) => (
          <View key={key} style={styles.optionRow}>
            <View style={styles.optionContainer}>
              <TextInput
                label={`Option ${key}`}
                placeholder={`Enter text for option ${key}`}
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
              
              {/* Correct Answer Selector */}
              <View style={styles.correctAnswerSelector}>
                {isMultipleCorrect ? (
                  <TouchableOpacity
                    style={[
                      styles.checkboxContainer,
                      {
                        backgroundColor: formData.correct_options.includes(key)
                          ? theme.colors.primary
                          : 'transparent',
                        borderColor: formData.correct_options.includes(key)
                          ? theme.colors.primary
                          : theme.colors.outline,
                      },
                    ]}
                    onPress={() => toggleCorrectOption(key)}
                  >
                    {formData.correct_options.includes(key) && (
                      <Ionicons
                        name="checkmark"
                        size={16}
                        color={theme.colors.onPrimary}
                      />
                    )}
                  </TouchableOpacity>
                ) : (
                  <TouchableOpacity
                    style={[
                      styles.radioContainer,
                      {
                        backgroundColor: formData.correct_option === key
                          ? theme.colors.primary
                          : 'transparent',
                        borderColor: formData.correct_option === key
                          ? theme.colors.primary
                          : theme.colors.outline,
                      },
                    ]}
                    onPress={() => handleSingleCorrectChange(key)}
                  >
                    {formData.correct_option === key && (
                      <View style={[styles.radioInner, { backgroundColor: theme.colors.onPrimary }]} />
                    )}
                  </TouchableOpacity>
                )}
                <Text
                  variant="bodySmall"
                  style={[
                    styles.correctLabel,
                    { 
                      color: (isMultipleCorrect && formData.correct_options.includes(key)) ||
                             (!isMultipleCorrect && formData.correct_option === key)
                        ? theme.colors.primary
                        : theme.colors.onSurfaceVariant
                    }
                  ]}
                >
                  {isMultipleCorrect ? 'Correct' : 'Correct'}
                </Text>
              </View>
            </View>
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

        {/* Selected Correct Answers Preview */}
        {Object.keys(formData.options).length > 0 && (
          <View style={styles.correctAnswersPreview}>
            <Text
              variant="bodyMedium"
              style={[styles.previewLabel, { color: theme.colors.onSurface }]}
            >
              Selected Correct Answer{isMultipleCorrect ? 's' : ''}:
            </Text>
            {isMultipleCorrect ? (
              <View style={styles.correctAnswersContainer}>
                {formData.correct_options.length > 0 ? (
                  formData.correct_options.map(option => (
                    <View key={option} style={[styles.correctAnswerChip, { backgroundColor: theme.colors.primary }]}>
                      <Text style={[styles.correctAnswerChipText, { color: theme.colors.onPrimary }]}>
                        {option}
                      </Text>
                    </View>
                  ))
                ) : (
                  <Text style={[styles.noSelectionText, { color: theme.colors.onSurfaceVariant }]}>
                    None selected
                  </Text>
                )}
              </View>
            ) : (
              <Text
                variant="bodyLarge"
                style={[
                  styles.singleCorrectAnswer,
                  { 
                    color: formData.correct_option 
                      ? theme.colors.primary 
                      : theme.colors.onSurfaceVariant 
                  }
                ]}
              >
                {formData.correct_option || 'None selected'}
              </Text>
            )}
          </View>
        )}
      </View>
    );
  };

  return (
    <SafeAreaView
      style={[styles.safeArea, { backgroundColor: theme.colors.background }]}
    >
      <StatusBar
        barStyle={isDarkMode ? "light-content" : "dark-content"}
        backgroundColor={theme.colors.background}
      />

      {/* Modern Header with Gradient */}
      <LinearGradient
        colors={isDarkMode ? ["#1F2937", "#111827"] : ["#6366F1", "#8B5CF6"]}
        style={styles.headerGradient}
      >
        <View style={styles.headerContent}>
          <View style={styles.headerTop}>
            <TouchableOpacity
              style={styles.backButton}
              onPress={() => router.back()}
            >
              <Ionicons name="arrow-back" size={24} color="white" />
            </TouchableOpacity>
            <TouchableOpacity
              style={styles.saveButton}
              onPress={handleSave}
              disabled={loading}
            >
              <Ionicons name="checkmark" size={20} color="white" />
            </TouchableOpacity>
          </View>
          <View style={styles.headerInfo}>
            <Text variant="headlineMedium" style={styles.modernHeaderTitle}>
              {mode === "add" ? "Add Question" : "Edit Question"}
            </Text>
            <Text variant="bodyMedium" style={styles.modernHeaderSubtitle}>
              {paperName}
            </Text>
          </View>
        </View>
      </LinearGradient>

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
          <View
            style={[
              styles.modernCard,
              { backgroundColor: theme.colors.surface },
            ]}
          >
            <View style={styles.cardHeader}>
              <Ionicons 
                name="information-circle" 
                size={24} 
                color={theme.colors.primary} 
                style={styles.cardIcon}
              />
              <Text
                variant="titleMedium"
                style={[styles.cardTitle, { color: theme.colors.onSurface }]}
              >
                Basic Information
              </Text>
            </View>

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

              {/* Question Type Indicator */}
              <View style={styles.questionTypeIndicator}>
                <Text variant="bodyMedium" style={[styles.questionTypeLabel, { color: theme.colors.onSurface }]}>
                  Question Type:
                </Text>
                <View style={[styles.questionTypeChip, { backgroundColor: theme.colors.primary }]}>
                  <Text variant="bodyMedium" style={[styles.questionTypeText, { color: theme.colors.onPrimary }]}>
                    {questionTypes.find(type => type.value === formData.question_type)?.label || "Traditional"}
                  </Text>
                </View>
              </View>
              <HelperText type="info" visible={true}>
                {formData.question_type === "omr" && "OMR: Uses bubble recognition for multiple choice answers"}
                {formData.question_type === "traditional" && "Traditional: Uses text recognition for handwritten answers"}
                {formData.question_type === "mixed" && "Mixed: Combines both OMR bubbles and handwritten text recognition"}
                {formData.question_type === "fill_blanks" && "Fill Blanks: Uses AI to evaluate fill-in-the-blank style answers"}
              </HelperText>
          </View>

          {/* Question Text */}
          <View
            style={[
              styles.modernCard,
              { backgroundColor: theme.colors.surface },
            ]}
          >
            <View style={styles.cardHeader}>
              <Ionicons 
                name="document-text" 
                size={24} 
                color={theme.colors.secondary} 
                style={styles.cardIcon}
              />
              <Text
                variant="titleMedium"
                style={[styles.cardTitle, { color: theme.colors.onSurface }]}
              >
                Question Text
              </Text>
            </View>

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
          </View>

          {/* Correct Answer & Options */}
          <View
            style={[
              styles.modernCard,
              { backgroundColor: theme.colors.surface },
            ]}
          >
            <View style={styles.cardHeader}>
              <Ionicons 
                name="checkmark-circle" 
                size={24} 
                color={theme.colors.tertiary} 
                style={styles.cardIcon}
              />
              <Text
                variant="titleMedium"
                style={[styles.cardTitle, { color: theme.colors.onSurface }]}
              >
                Answer Configuration
              </Text>
            </View>

            {/* Has Options Toggle - Make it more visible */}
            <View style={styles.optionsToggleContainer}>
              <Text
                variant="bodyLarge"
                style={[styles.optionsToggleLabel, { color: theme.colors.onSurface }]}
              >
                Has Options
              </Text>
              <Switch
                value={hasOptions}
                onValueChange={formData.question_type === "fill_blanks" ? undefined : setHasOptions}
                color={theme.colors.primary}
                disabled={formData.question_type === "fill_blanks"}
              />
            </View>
            <HelperText type="info" visible={true} style={styles.optionsToggleHelper}>
              {formData.question_type === "fill_blanks" 
                ? "Fill-in-the-blanks questions don't use multiple choice options"
                : hasOptions 
                  ? "Enable to add multiple choice options (A, B, C, D...)"
                  : "Disable for open-ended or text-based answers"
              }
            </HelperText>

            <TextInput
              label="Correct Answer *"
              value={isMultipleCorrect ? formData.correct_options.join(", ") : formData.correct_option}
              onChangeText={(text) => {
                if (formData.question_type === "fill_blanks") {
                  updateFormData("correct_option", text);
                } else if (isMultipleCorrect) {
                  // For multiple correct, parse comma-separated values
                  const options = text.split(",").map(opt => opt.trim().toUpperCase()).filter(opt => opt);
                  setFormData(prev => ({ ...prev, correct_options: options }));
                } else {
                  updateFormData("correct_option", text.toUpperCase());
                }
              }}
              mode="outlined"
              placeholder={
                formData.question_type === "fill_blanks" 
                  ? "Enter expected answer text" 
                  : isMultipleCorrect
                    ? "A, C, E (comma-separated)"
                    : hasOptions 
                      ? "A, B, C, D..." 
                      : "Enter correct answer"
              }
              style={styles.input}
              error={!!errors.correct_option}
              disabled={hasOptions && Object.keys(formData.options).length > 0} // Disable text input when options are available
            />

            <HelperText type={errors.correct_option ? "error" : "info"} visible={true}>
              {errors.correct_option || 
                (formData.question_type === "fill_blanks"
                  ? "For fill-in-the-blanks, enter the expected answer text"
                  : hasOptions && Object.keys(formData.options).length > 0
                    ? (isMultipleCorrect 
                        ? "Select multiple correct options using the checkboxes below"
                        : "Select the correct option using the radio buttons below")
                    : isMultipleCorrect
                      ? "Enter multiple correct answers separated by commas (e.g., A, C, E)"
                      : "Enter the correct answer")
              }
            </HelperText>
          </View>

          {/* Options Section */}
          {renderOptionsSection()}

          {/* Action Buttons */}
          <View style={styles.actionButtonsContainer}>
            <TouchableOpacity
              style={[
                styles.modernActionButton,
                styles.cancelActionButton,
                { backgroundColor: isDarkMode ? "#374151" : "#F3F4F6" },
              ]}
              onPress={() => router.back()}
              disabled={loading}
            >
              <Ionicons 
                name="close" 
                size={20} 
                color={theme.colors.onSurface} 
                style={{ marginRight: 8 }}
              />
              <Text style={[styles.actionButtonText, { color: theme.colors.onSurface }]}>
                Cancel
              </Text>
            </TouchableOpacity>
            <TouchableOpacity
              style={[
                styles.modernActionButton,
                styles.saveActionButton,
              ]}
              onPress={handleSave}
              disabled={loading}
            >
              <LinearGradient
                colors={["#6366F1", "#8B5CF6"]}
                style={styles.actionButtonGradient}
                start={{ x: 0, y: 0 }}
                end={{ x: 1, y: 1 }}
              >
                <Ionicons 
                  name="checkmark" 
                  size={20} 
                  color="white" 
                  style={{ marginRight: 8 }}
                />
                <Text style={[styles.actionButtonText, { color: "white" }]}>
                  {mode === "add" ? "Create" : "Update"}
                </Text>
              </LinearGradient>
            </TouchableOpacity>
          </View>

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
  optionsToggleContainer: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    marginBottom: 12,
    paddingVertical: 8,
    paddingHorizontal: 4,
  },
  optionsToggleLabel: {
    fontSize: 16,
    fontWeight: "500",
  },
  optionsToggleHelper: {
    marginTop: -8,
    marginBottom: 16,
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
  saveButtonOld: {
    flex: 1,
  },
  bottomSpacing: {
    height: 40,
  },
  questionTypeIndicator: {
    flexDirection: "row",
    alignItems: "center",
    gap: 12,
    marginTop: 16,
    paddingTop: 12,
    borderTopWidth: 1,
    borderTopColor: "rgba(0,0,0,0.1)",
  },
  questionTypeLabel: {
    fontWeight: "500",
  },
  questionTypeChip: {
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 16,
  },
  questionTypeText: {
    fontSize: 12,
    fontWeight: "600",
  },
  headerGradient: {
    paddingTop: 12,
    paddingBottom: 24,
    paddingHorizontal: 20,
  },
  headerContent: {
    flex: 1,
  },
  headerTop: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: 16,
  },
  backButton: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: "rgba(255,255,255,0.2)",
    justifyContent: "center",
    alignItems: "center",
  },
  saveButton: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: "rgba(255,255,255,0.2)",
    justifyContent: "center",
    alignItems: "center",
  },
  headerInfo: {
    alignItems: "flex-start",
  },
  headerTitleOld: {
    color: "white",
    fontWeight: "700",
    marginBottom: 4,
  },
  headerSubtitleOld: {
    color: "rgba(255,255,255,0.8)",
    fontSize: 14,
  },
  modernHeaderTitle: {
    color: "white",
    fontWeight: "700",
    marginBottom: 4,
  },
  modernHeaderSubtitle: {
    color: "rgba(255,255,255,0.8)",
    fontSize: 14,
  },
  modernCard: {
    backgroundColor: "white",
    borderRadius: 16,
    padding: 20,
    marginBottom: 16,
    shadowColor: "#000",
    shadowOffset: {
      width: 0,
      height: 2,
    },
    shadowOpacity: 0.1,
    shadowRadius: 8,
    elevation: 3,
  },
  cardHeader: {
    flexDirection: "row",
    alignItems: "center",
    marginBottom: 16,
  },
  cardIcon: {
    marginRight: 12,
  },
  cardTitle: {
    fontSize: 18,
    fontWeight: "600",
  },
  actionButtonsContainer: {
    flexDirection: "row",
    gap: 12,
    marginTop: 20,
    paddingHorizontal: 20,
  },
  modernActionButton: {
    flex: 1,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    paddingVertical: 16,
    borderRadius: 12,
  },
  cancelActionButton: {
    borderWidth: 1,
    borderColor: "rgba(0,0,0,0.1)",
  },
  saveActionButton: {
    overflow: "hidden",
  },
  actionButtonGradient: {
    flex: 1,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    paddingVertical: 16,
  },
  actionButtonText: {
    fontSize: 16,
    fontWeight: "600",
  },
  // New styles for multiple correct answers
  multipleCorrectToggle: {
    marginBottom: 16,
  },
  toggleHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: 4,
  },
  toggleLabel: {
    fontSize: 16,
    fontWeight: "500",
  },
  optionContainer: {
    flexDirection: "row",
    alignItems: "flex-start",
    gap: 12,
  },
  correctAnswerSelector: {
    alignItems: "center",
    justifyContent: "center",
    marginTop: 8,
    minWidth: 60,
  },
  checkboxContainer: {
    width: 24,
    height: 24,
    borderRadius: 4,
    borderWidth: 2,
    justifyContent: "center",
    alignItems: "center",
    marginBottom: 4,
  },
  radioContainer: {
    width: 24,
    height: 24,
    borderRadius: 12,
    borderWidth: 2,
    justifyContent: "center",
    alignItems: "center",
    marginBottom: 4,
  },
  radioInner: {
    width: 12,
    height: 12,
    borderRadius: 6,
  },
  correctLabel: {
    fontSize: 12,
    fontWeight: "500",
    textAlign: "center",
  },
  correctAnswersPreview: {
    marginTop: 16,
    padding: 12,
    borderRadius: 8,
    backgroundColor: "rgba(139, 92, 246, 0.1)",
  },
  previewLabel: {
    fontSize: 14,
    fontWeight: "600",
    marginBottom: 8,
  },
  correctAnswersContainer: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: 8,
  },
  correctAnswerChip: {
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 16,
    minWidth: 32,
    alignItems: "center",
  },
  correctAnswerChipText: {
    fontSize: 14,
    fontWeight: "600",
  },
  noSelectionText: {
    fontStyle: "italic",
  },
  singleCorrectAnswer: {
    fontSize: 18,
    fontWeight: "700",
  },
});
