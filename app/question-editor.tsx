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
  Dimensions,
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
  Chip,
  ActivityIndicator,
} from "react-native-paper";
import { useTheme } from "../context/ThemeContext";
import { questionService } from "../services/api";
import { router, useLocalSearchParams } from "expo-router";
import { Ionicons } from "@expo/vector-icons";
import { LinearGradient } from "expo-linear-gradient";

const { width } = Dimensions.get("window");

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

interface QuestionWeightages {
  A?: number;
  B?: number;
  C?: number;
  D?: number;
  E?: number;
  F?: number;
  G?: number;
  H?: number;
  [key: string]: number | undefined;
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
    weightages: {} as QuestionWeightages, // Add weightages support
    points_per_blank: 1, // Add total marks/points support
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
          if (value) {
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
        initializedRef.current = true;
        
        if (params.questionData) {
          const question = JSON.parse(params.questionData as string);
          
          // Convert options if they exist and have numeric keys
          let convertedOptions = {};
          if (question.options) {
            convertedOptions = convertNumericKeysToAlphabetic(question.options);
          }
          
          // Handle correct answers - support both single and multiple
          let correctAnswers: string[] = [];
          let singleCorrectAnswer = "";
          let hasMultipleCorrect = false;
          
          // First check if we have correct_options (multiple correct answers)
          if (question.correct_options && Array.isArray(question.correct_options)) {
            correctAnswers = question.correct_options;
            hasMultipleCorrect = correctAnswers.length > 1;
          } else if (question.correct_option) {
            // Check if correct_option contains comma-separated values
            if (question.correct_option.includes(',')) {
              correctAnswers = question.correct_option.split(',').map((opt: string) => opt.trim());
              hasMultipleCorrect = correctAnswers.length > 1;
            } else {
              correctAnswers = [question.correct_option];
              singleCorrectAnswer = question.correct_option;
            }
          }
          
          // Check if we need to convert numeric answers to alphabetic
          const optionEntries = Object.entries(question.options || {});
          const hasNumericKeys = optionEntries.some(([key]) => /^\d+$/.test(key));
          
          if (hasNumericKeys) {
            correctAnswers = convertCorrectAnswersToAlphabetic(correctAnswers, true);
            singleCorrectAnswer = correctAnswers[0] || "";
          }

          setFormData({
            question_number: question.question_number?.toString() || "",
            question_text: question.question_text || "",
            correct_option: singleCorrectAnswer,
            correct_options: correctAnswers,
            page_number: question.page_number?.toString() || "1",
            question_type: question.question_type || "traditional",
            options: convertedOptions,
            weightages: question.weightages || {},
            points_per_blank: question.points_per_blank || 1,
          });
          
          setHasOptions(Object.keys(convertedOptions).length > 0);
          setIsMultipleCorrect(hasMultipleCorrect);
        }
      } catch (error) {
        console.error("Error parsing question data:", error);
        Alert.alert("Error", "Failed to load question data");
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

    // Validate total marks/points
    if (!formData.points_per_blank || formData.points_per_blank <= 0) {
      newErrors.points_per_blank = "Total marks must be greater than 0";
    }

    // Validate correct answers based on single/multiple mode
    if (isMultipleCorrect) {
      // For multiple correct mode, validate the correct_options array
      const validCorrectOptions = formData.correct_options.filter(opt => opt.trim());
      if (validCorrectOptions.length === 0) {
        newErrors.correct_option = "At least one correct answer is required";
      } else {
        // Validate that all correct answers exist in options (if options are provided)
        if (hasOptions && Object.keys(formData.options).length > 0) {
          const optionKeys = Object.keys(formData.options);
          const invalidAnswers = validCorrectOptions.filter(answer => !optionKeys.includes(answer.toUpperCase()));
          if (invalidAnswers.length > 0) {
            newErrors.correct_option = `Correct answer(s) must match available options: ${invalidAnswers.join(', ')}`;
          }
        }
      }
    } else {
      if (!formData.correct_option) {
        newErrors.correct_option = "Correct answer is required";
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

    // Only validate option matching for single correct mode with traditional options
    if (hasOptions && !isMultipleCorrect && (formData.question_type === "omr" || formData.question_type === "traditional" || formData.question_type === "mixed")) {
      const optionKeys = Object.keys(formData.options);
      if (optionKeys.length === 0) {
        newErrors.options = "At least one option is required";
      } else {
        // Check if correct_option matches any of the option keys
        if (formData.correct_option && !optionKeys.includes(formData.correct_option.toUpperCase())) {
          newErrors.correct_option = `Correct answer must match one of the available options: ${optionKeys.join(', ')}`;
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
        points_per_blank: Number(formData.points_per_blank),
        weightages: formData.weightages,
        options:
          hasOptions && !isMultipleCorrect && Object.keys(formData.options).length > 0
            ? formData.options
            : null,
      };

      // Add correct answer(s) based on mode
      if (isMultipleCorrect) {
        const validCorrectOptions = formData.correct_options.filter(opt => opt.trim());
        questionPayload.correct_option = validCorrectOptions.join(',');
        questionPayload.correct_options = validCorrectOptions;
        questionPayload.question_format = 'multiple_choice';
      } else {
        questionPayload.correct_option = formData.correct_option;
        questionPayload.question_format = hasOptions ? 'multiple_choice' : 'text';
      }

      if (mode === "add") {
        await questionService.createQuestion({
          ...questionPayload,
          paper_id: Number(paperId),
        });
        Alert.alert("Success", "Question added successfully");
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

  const updateWeightage = (key: string, weight: number) => {
    setFormData((prev) => ({
      ...prev,
      weightages: {
        ...prev.weightages,
        [key]: weight,
      },
    }));
    // Clear weightages error
    if (errors.weightages) {
      setErrors((prev) => ({ ...prev, weightages: "" }));
    }
  };

  const calculateTotalWeightage = () => {
    if (isMultipleCorrect) {
      const total = formData.correct_options.reduce((sum, option) => {
        return sum + (formData.weightages[option] || 0);
      }, 0);
      return Math.round(total * 100) / 100;
    }
    return 0;
  };

  const removeOption = (key: string) => {
    setFormData((prev) => {
      const newOptions = { ...prev.options };
      delete newOptions[key];
      return { ...prev, options: newOptions };
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
      Alert.alert("Limit Reached", "Maximum 8 options allowed");
    }
  };

  // Functions for handling multiple correct answers
  const toggleCorrectOption = (option: string) => {
    if (!isMultipleCorrect) return;
    
    const currentCorrectOptions = [...formData.correct_options];
    const index = currentCorrectOptions.indexOf(option);
    
    if (index > -1) {
      // Remove if already selected
      currentCorrectOptions.splice(index, 1);
    } else {
      // Add if not selected
      currentCorrectOptions.push(option);
    }
    
    setFormData(prev => ({ ...prev, correct_options: currentCorrectOptions }));
    
    // Clear error for correct options
    if (errors.correct_option) {
      setErrors(prev => ({ ...prev, correct_option: "" }));
    }
  };

  const handleSingleCorrectChange = (value: string) => {
    setFormData(prev => ({ ...prev, correct_option: value }));
    // Clear error for correct option
    if (errors.correct_option) {
      setErrors(prev => ({ ...prev, correct_option: "" }));
    }
  };

  const handleMultipleCorrectToggle = (enabled: boolean) => {
    setIsMultipleCorrect(enabled);
    
    if (enabled) {
      // Convert single correct answer to array
      if (formData.correct_option) {
        setFormData(prev => ({
          ...prev,
          correct_options: [formData.correct_option],
          // Initialize weightages for the correct option
          weightages: {
            ...prev.weightages,
            [formData.correct_option]: prev.weightages[formData.correct_option] || 1
          }
        }));
      }
    } else {
      // Convert array back to single value
      const firstCorrect = formData.correct_options[0] || "";
      setFormData(prev => ({
        ...prev,
        correct_option: firstCorrect,
        correct_options: [],
        weightages: {} // Clear weightages for single mode
      }));
    }
    
    // Clear any existing errors
    setErrors(prev => ({ ...prev, correct_option: "", weightages: "" }));
  };

  const getQuestionTypeInfo = (questionType: string) => {
    switch (questionType) {
      case "omr":
        return {
          label: "OMR",
          color: "#6366F1",
          backgroundColor: "rgba(99, 102, 241, 0.1)",
          icon: "radio-button-on",
          description: "Multiple choice with OMR scanning"
        };
      case "traditional":
        return {
          label: "Traditional",
          color: "#8B5CF6",
          backgroundColor: "rgba(139, 92, 246, 0.1)",
          icon: "text-box",
          description: "Standard written questions"
        };
      case "mixed":
        return {
          label: "Mixed",
          color: "#10B981",
          backgroundColor: "rgba(16, 185, 129, 0.1)",
          icon: "layers",
          description: "Combination of formats"
        };
      case "fill_blanks":
        return {
          label: "Fill Blanks",
          color: "#F59E0B",
          backgroundColor: "rgba(245, 158, 11, 0.1)",
          icon: "pencil",
          description: "Fill in the blanks questions"
        };
      default:
        return {
          label: "Traditional",
          color: "#8B5CF6",
          backgroundColor: "rgba(139, 92, 246, 0.1)",
          icon: "text-box",
          description: "Standard written questions"
        };
    }
  };

  const renderBasicInfoSection = () => {
    return (
      <View style={[styles.sectionCard, { backgroundColor: theme.colors.surface }]}>
        <View style={styles.sectionHeader}>
          <Ionicons name="information-circle" size={24} color="#6366F1" />
          <Text variant="titleLarge" style={[styles.sectionTitle, { color: theme.colors.onSurface }]}>
            Basic Information
          </Text>
        </View>
        
        <View style={styles.formRow}>
          <View style={styles.halfInput}>
            <TextInput
              label="Question Number"
              value={formData.question_number}
              onChangeText={(value) => updateFormData("question_number", value)}
              keyboardType="numeric"
              mode="outlined"
              error={!!errors.question_number}
              style={styles.input}
            />
            <HelperText type="error" visible={!!errors.question_number}>
              {errors.question_number}
            </HelperText>
          </View>
          
          <View style={styles.halfInput}>
            <TextInput
              label="Page Number"
              value={formData.page_number}
              onChangeText={(value) => updateFormData("page_number", value)}
              keyboardType="numeric"
              mode="outlined"
              error={!!errors.page_number}
              style={styles.input}
            />
            <HelperText type="error" visible={!!errors.page_number}>
              {errors.page_number}
            </HelperText>
          </View>
        </View>

        <TextInput
          label="Total Marks/Points"
          value={formData.points_per_blank.toString()}
          onChangeText={(value) => updateFormData("points_per_blank", value)}
          keyboardType="numeric"
          mode="outlined"
          error={!!errors.points_per_blank}
          style={styles.input}
        />
        <HelperText type="error" visible={!!errors.points_per_blank}>
          {errors.points_per_blank}
        </HelperText>
      </View>
    );
  };

  const renderQuestionTypeSection = () => {
    const typeInfo = getQuestionTypeInfo(formData.question_type);
    
    return (
      <View style={[styles.sectionCard, { backgroundColor: theme.colors.surface }]}>
        <View style={styles.sectionHeader}>
          <Ionicons name="layers" size={24} color="#6366F1" />
          <Text variant="titleLarge" style={[styles.sectionTitle, { color: theme.colors.onSurface }]}>
            Question Type
          </Text>
        </View>
        
        <View style={styles.typeSelector}>
          <ScrollView horizontal showsHorizontalScrollIndicator={false} style={styles.typeScroll}>
            {questionTypes.map((type) => {
              const isSelected = formData.question_type === type.value;
              const info = getQuestionTypeInfo(type.value);
              
              return (
                <TouchableOpacity
                  key={type.value}
                  style={[
                    styles.typeCard,
                    {
                      backgroundColor: isSelected ? info.backgroundColor : theme.colors.surfaceVariant,
                      borderColor: isSelected ? info.color : 'transparent',
                      borderWidth: isSelected ? 2 : 0,
                    }
                  ]}
                  onPress={() => updateFormData("question_type", type.value)}
                >
                  <Ionicons 
                    name={info.icon as any} 
                    size={24} 
                    color={isSelected ? info.color : theme.colors.onSurfaceVariant} 
                  />
                  <Text 
                    variant="titleMedium" 
                    style={[
                      styles.typeTitle, 
                      { color: isSelected ? info.color : theme.colors.onSurfaceVariant }
                    ]}
                  >
                    {info.label}
                  </Text>
                  <Text 
                    variant="bodySmall" 
                    style={[
                      styles.typeDescription, 
                      { color: isSelected ? info.color : theme.colors.onSurfaceVariant }
                    ]}
                  >
                    {info.description}
                  </Text>
                </TouchableOpacity>
              );
            })}
          </ScrollView>
        </View>

        <View style={[styles.selectedTypeInfo, { backgroundColor: typeInfo.backgroundColor }]}>
          <Ionicons name={typeInfo.icon as any} size={20} color={typeInfo.color} />
          <Text style={[styles.selectedTypeText, { color: typeInfo.color }]}>
            Selected: {typeInfo.label}
          </Text>
        </View>
      </View>
    );
  };

  const renderQuestionTextSection = () => {
    return (
      <View style={[styles.sectionCard, { backgroundColor: theme.colors.surface }]}>
        <View style={styles.sectionHeader}>
          <Ionicons name="text" size={24} color="#6366F1" />
          <Text variant="titleLarge" style={[styles.sectionTitle, { color: theme.colors.onSurface }]}>
            Question Text
          </Text>
        </View>
        
        <TextInput
          label="Question Text (Optional)"
          value={formData.question_text}
          onChangeText={(value) => updateFormData("question_text", value)}
          multiline
          numberOfLines={4}
          mode="outlined"
          style={styles.textArea}
          placeholder="Enter the question text here..."
        />
        <HelperText type="info">
          Leave blank if question text is in the scanned image
        </HelperText>
      </View>
    );
  };

  const renderOptionsSection = () => {
    // Don't show options section for fill-in-the-blanks questions
    if (formData.question_type === "fill_blanks") return null;

    return (
      <View style={[styles.sectionCard, { backgroundColor: theme.colors.surface }]}>
        <View style={styles.sectionHeader}>
          <Ionicons name="list" size={24} color="#6366F1" />
          <Text variant="titleLarge" style={[styles.sectionTitle, { color: theme.colors.onSurface }]}>
            Answer Options
          </Text>
        </View>

        <View style={styles.optionsToggleContainer}>
          <View>
            <Text style={[styles.optionsToggleLabel, { color: theme.colors.onSurface }]}>
              Has Multiple Choice Options
            </Text>
            <HelperText type="info" style={styles.optionsToggleHelper}>
              Enable if this question has predefined answer choices (A, B, C, D)
            </HelperText>
          </View>
          <Switch
            value={hasOptions}
            onValueChange={setHasOptions}
          />
        </View>

        {hasOptions && (
          <>
            {/* Multiple Correct Toggle */}
            <View style={styles.multipleCorrectToggle}>
              <View style={styles.toggleHeader}>
                <Text style={[styles.toggleLabel, { color: theme.colors.onSurface }]}>
                  Multiple Correct Answers
                </Text>
                <Switch
                  value={isMultipleCorrect}
                  onValueChange={handleMultipleCorrectToggle}
                />
              </View>
              <HelperText type="info">
                Enable if this question has more than one correct answer
              </HelperText>
            </View>

            {/* Options List */}
            <View style={styles.optionsList}>
              {Object.keys(formData.options).length > 0 ? (
                Object.entries(formData.options).map(([key, value]) => (
                  <View key={key} style={styles.optionContainer}>
                    <View style={styles.optionInputContainer}>
                      <TextInput
                        label={`Option ${key}`}
                        value={value || ""}
                        onChangeText={(text) => updateOption(key, text)}
                        mode="outlined"
                        style={styles.optionInput}
                        right={
                          <TextInput.Icon
                            icon="close"
                            onPress={() => removeOption(key)}
                          />
                        }
                      />
                    </View>
                    
                    {/* Correct Answer Selector */}
                    <View style={styles.correctAnswerSelector}>
                      {isMultipleCorrect ? (
                        <TouchableOpacity
                          style={[
                            styles.checkboxContainer,
                            {
                              borderColor: formData.correct_options.includes(key) 
                                ? "#10B981" : theme.colors.outline,
                              backgroundColor: formData.correct_options.includes(key) 
                                ? "#10B981" : "transparent"
                            }
                          ]}
                          onPress={() => toggleCorrectOption(key)}
                        >
                          {formData.correct_options.includes(key) && (
                            <Ionicons name="checkmark" size={16} color="white" />
                          )}
                        </TouchableOpacity>
                      ) : (
                        <TouchableOpacity
                          style={[
                            styles.radioContainer,
                            {
                              borderColor: formData.correct_option === key 
                                ? "#10B981" : theme.colors.outline
                            }
                          ]}
                          onPress={() => handleSingleCorrectChange(key)}
                        >
                          {formData.correct_option === key && (
                            <View style={[styles.radioInner, { backgroundColor: "#10B981" }]} />
                          )}
                        </TouchableOpacity>
                      )}
                      <Text style={[styles.correctLabel, { color: theme.colors.onSurfaceVariant }]}>
                        {isMultipleCorrect ? "Correct" : "Correct"}
                      </Text>
                    </View>

                    {/* Weightage Input for Multiple Correct */}
                    {isMultipleCorrect && formData.correct_options.includes(key) && (
                      <View style={styles.weightageContainer}>
                        <Text style={[styles.weightageLabel, { color: theme.colors.onSurfaceVariant }]}>
                          Weight:
                        </Text>
                        <TextInput
                          value={(formData.weightages[key] || 0).toString()}
                          onChangeText={(text) => updateWeightage(key, parseFloat(text) || 0)}
                          keyboardType="numeric"
                          mode="outlined"
                          style={styles.weightageInput}
                        />
                      </View>
                    )}
                  </View>
                ))
              ) : (
                <Text style={[styles.emptyOptions, { color: theme.colors.onSurfaceVariant }]}>
                  No options added yet. Tap "Add Option" to create answer choices.
                </Text>
              )}
            </View>

            {/* Add Option Button */}
            <TouchableOpacity
              style={[styles.addOptionButton, { borderColor: theme.colors.primary }]}
              onPress={addNewOption}
            >
              <Ionicons name="add-circle-outline" size={20} color={theme.colors.primary} />
              <Text style={[styles.addOptionText, { color: theme.colors.primary }]}>
                Add Option
              </Text>
            </TouchableOpacity>

            {/* Correct Answers Preview */}
            <View style={styles.correctAnswersPreview}>
              <Text style={[styles.previewLabel, { color: theme.colors.onSurface }]}>
                {isMultipleCorrect ? "Correct Answers:" : "Correct Answer:"}
              </Text>
              
              {isMultipleCorrect ? (
                <View style={styles.correctAnswersContainer}>
                  {formData.correct_options.length > 0 ? (
                    formData.correct_options.map((option) => (
                      <View 
                        key={option}
                        style={[styles.correctAnswerChip, { backgroundColor: "#10B981" }]}
                      >
                        <Text style={styles.correctAnswerChipText}>
                          {option}
                        </Text>
                      </View>
                    ))
                  ) : (
                    <Text style={[styles.noSelectionText, { color: theme.colors.onSurfaceVariant }]}>
                      No correct answers selected
                    </Text>
                  )}
                </View>
              ) : (
                <View style={[styles.correctAnswerChip, { backgroundColor: "#10B981" }]}>
                  <Text style={[styles.singleCorrectAnswer, { color: "white" }]}>
                    {formData.correct_option || "None selected"}
                  </Text>
                </View>
              )}

              {/* Weightage Validation for Multiple Correct */}
              {isMultipleCorrect && formData.correct_options.length > 0 && (
                <View 
                  style={[
                    styles.weightValidationContainer,
                    {
                      backgroundColor: calculateTotalWeightage() === formData.points_per_blank 
                        ? "rgba(16, 185, 129, 0.1)" 
                        : "rgba(245, 158, 11, 0.1)",
                      borderColor: calculateTotalWeightage() === formData.points_per_blank 
                        ? "#10B981" 
                        : "#F59E0B"
                    }
                  ]}
                >
                  <Ionicons 
                    name={calculateTotalWeightage() === formData.points_per_blank ? "checkmark-circle" : "warning"} 
                    size={20} 
                    color={calculateTotalWeightage() === formData.points_per_blank ? "#10B981" : "#F59E0B"}
                  />
                  <Text 
                    style={[
                      styles.weightValidationText,
                      {
                        color: calculateTotalWeightage() === formData.points_per_blank 
                          ? "#10B981" 
                          : "#F59E0B"
                      }
                    ]}
                  >
                    Total Weight: {calculateTotalWeightage()} / {formData.points_per_blank}
                  </Text>
                </View>
              )}
            </View>

            {/* Error Display */}
            <HelperText type="error" visible={!!errors.correct_option}>
              {errors.correct_option}
            </HelperText>
          </>
        )}

        {/* Correct Answer for Non-Options Questions */}
        {!hasOptions && (
          <View style={styles.correctOptionsOnlySection}>
            <Text style={[styles.correctOptionsTitle, { color: theme.colors.onSurface }]}>
              Correct Answer
            </Text>
            <TextInput
              label="Correct Answer"
              value={formData.correct_option}
              onChangeText={handleSingleCorrectChange}
              mode="outlined"
              error={!!errors.correct_option}
              style={styles.correctOptionInput}
              placeholder="Enter the correct answer..."
            />
            <HelperText type="error" visible={!!errors.correct_option}>
              {errors.correct_option}
            </HelperText>
          </View>
        )}
      </View>
    );
  };

  return (
    <SafeAreaView style={[styles.safeArea, { backgroundColor: theme.colors.background }]}>
      <StatusBar barStyle="light-content" backgroundColor="#6366F1" />

      {/* Enhanced Header with Gradient */}
      <LinearGradient colors={["#6366F1", "#8B5CF6"]} style={styles.headerGradient}>
        <View style={styles.headerContent}>
          <View style={styles.headerTop}>
            <TouchableOpacity style={styles.backButton} onPress={() => router.back()}>
              <Ionicons name="arrow-back" size={24} color="white" />
            </TouchableOpacity>
            <TouchableOpacity 
              style={[styles.saveButton, { opacity: loading ? 0.7 : 1 }]} 
              onPress={handleSave}
              disabled={loading}
            >
              {loading ? (
                <ActivityIndicator size="small" color="white" />
              ) : (
                <Ionicons name="checkmark" size={24} color="white" />
              )}
            </TouchableOpacity>
          </View>
          <View style={styles.headerInfo}>
            <Text style={styles.modernHeaderTitle}>
              {mode === "add" ? "Add Question" : "Edit Question"}
            </Text>
            <Text style={styles.modernHeaderSubtitle}>{paperName}</Text>
          </View>
        </View>
      </LinearGradient>

      <KeyboardAvoidingView
        style={styles.container}
        behavior={Platform.OS === "ios" ? "padding" : "height"}
        keyboardVerticalOffset={Platform.OS === "ios" ? 0 : 20}
      >
        <ScrollView style={styles.scrollView} contentContainerStyle={styles.scrollContent}>
          {renderBasicInfoSection()}
          {renderQuestionTypeSection()}
          {renderQuestionTextSection()}
          {renderOptionsSection()}

          {/* Action Buttons */}
          <View style={styles.actionButtonsContainer}>
            <TouchableOpacity
              style={[styles.modernActionButton, styles.cancelActionButton, { borderColor: theme.colors.outline }]}
              onPress={() => router.back()}
            >
              <Text style={[styles.actionButtonText, { color: theme.colors.onSurfaceVariant }]}>
                Cancel
              </Text>
            </TouchableOpacity>
            
            <View style={styles.saveActionButton}>
              <LinearGradient
                colors={["#6366F1", "#8B5CF6"]}
                style={styles.actionButtonGradient}
              >
                <TouchableOpacity
                  style={{ flexDirection: "row", alignItems: "center", justifyContent: "center", flex: 1 }}
                  onPress={handleSave}
                  disabled={loading}
                >
                  {loading && <ActivityIndicator size="small" color="white" style={{ marginRight: 8 }} />}
                  <Text style={[styles.actionButtonText, { color: "white" }]}>
                    {loading ? "Saving..." : mode === "add" ? "Add Question" : "Update Question"}
                  </Text>
                </TouchableOpacity>
              </LinearGradient>
            </View>
          </View>

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
  modernHeaderTitle: {
    color: "white",
    fontSize: 28,
    fontWeight: "700",
    marginBottom: 4,
  },
  modernHeaderSubtitle: {
    color: "rgba(255,255,255,0.8)",
    fontSize: 16,
  },
  scrollView: {
    flex: 1,
  },
  scrollContent: {
    paddingHorizontal: 20,
    paddingTop: 8,
  },
  sectionCard: {
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
  sectionHeader: {
    flexDirection: "row",
    alignItems: "center",
    marginBottom: 16,
  },
  sectionTitle: {
    marginLeft: 12,
    fontWeight: "600",
  },
  formRow: {
    flexDirection: "row",
    gap: 12,
  },
  halfInput: {
    flex: 1,
  },
  input: {
    marginBottom: 8,
  },
  textArea: {
    marginBottom: 8,
  },
  typeSelector: {
    marginBottom: 16,
  },
  typeScroll: {
    marginBottom: 12,
  },
  typeCard: {
    padding: 16,
    borderRadius: 12,
    marginRight: 12,
    minWidth: 120,
    alignItems: "center",
  },
  typeTitle: {
    marginTop: 8,
    marginBottom: 4,
    fontWeight: "600",
  },
  typeDescription: {
    textAlign: "center",
    fontSize: 12,
    lineHeight: 16,
  },
  selectedTypeInfo: {
    flexDirection: "row",
    alignItems: "center",
    padding: 12,
    borderRadius: 8,
    gap: 8,
  },
  selectedTypeText: {
    fontWeight: "500",
  },
  optionsToggleContainer: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    marginBottom: 16,
  },
  optionsToggleLabel: {
    fontSize: 16,
    fontWeight: "500",
  },
  optionsToggleHelper: {
    marginTop: -8,
    marginBottom: 0,
  },
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
  optionsList: {
    marginBottom: 16,
  },
  optionContainer: {
    marginBottom: 16,
    padding: 16,
    backgroundColor: "rgba(0,0,0,0.02)",
    borderRadius: 12,
    gap: 12,
  },
  optionInputContainer: {
    flex: 1,
  },
  optionInput: {
    marginBottom: 0,
  },
  correctAnswerSelector: {
    alignItems: "center",
    gap: 4,
  },
  checkboxContainer: {
    width: 24,
    height: 24,
    borderRadius: 4,
    borderWidth: 2,
    justifyContent: "center",
    alignItems: "center",
  },
  radioContainer: {
    width: 24,
    height: 24,
    borderRadius: 12,
    borderWidth: 2,
    justifyContent: "center",
    alignItems: "center",
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
  weightageContainer: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
  },
  weightageLabel: {
    fontWeight: "500",
    fontSize: 14,
  },
  weightageInput: {
    width: 80,
    height: 40,
  },
  addOptionButton: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    paddingVertical: 16,
    borderWidth: 2,
    borderStyle: "dashed",
    borderRadius: 12,
    marginBottom: 16,
    gap: 8,
  },
  addOptionText: {
    fontWeight: "500",
    fontSize: 16,
  },
  correctAnswersPreview: {
    padding: 16,
    borderRadius: 12,
    backgroundColor: "rgba(139, 92, 246, 0.1)",
  },
  previewLabel: {
    fontSize: 16,
    fontWeight: "600",
    marginBottom: 12,
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
    alignItems: "center",
  },
  correctAnswerChipText: {
    color: "white",
    fontSize: 14,
    fontWeight: "600",
  },
  noSelectionText: {
    fontStyle: "italic",
  },
  singleCorrectAnswer: {
    fontSize: 16,
    fontWeight: "700",
  },
  weightValidationContainer: {
    flexDirection: "row",
    alignItems: "center",
    padding: 12,
    borderRadius: 8,
    borderWidth: 1,
    gap: 8,
    marginTop: 12,
  },
  weightValidationText: {
    fontSize: 14,
    fontWeight: "500",
    flex: 1,
  },
  emptyOptions: {
    textAlign: "center",
    fontStyle: "italic",
    paddingVertical: 20,
  },
  correctOptionsOnlySection: {
    marginTop: 8,
  },
  correctOptionsTitle: {
    fontSize: 16,
    fontWeight: "600",
    marginBottom: 8,
  },
  correctOptionInput: {
    marginBottom: 8,
  },
  actionButtonsContainer: {
    flexDirection: "row",
    gap: 12,
    marginTop: 20,
    paddingHorizontal: 0,
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
  },
  saveActionButton: {
    flex: 1,
    borderRadius: 12,
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
  bottomSpacing: {
    height: 40,
  },
});