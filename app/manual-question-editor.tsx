import React, { useState, useEffect } from "react";
import {
  View,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  TextInput,
  Alert,
  KeyboardAvoidingView,
  Platform,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { Text, Card, Button, Switch, Chip } from "react-native-paper";
import { useTheme } from "../context/ThemeContext";
import { router, useLocalSearchParams } from "expo-router";
import { Ionicons } from "@expo/vector-icons";
import { LinearGradient } from "expo-linear-gradient";
import { manualTestService } from "../services/api";

interface Option {
  id: string;
  text: string;
  isCorrect: boolean;
  weight: number;
}

interface Question {
  questionNumber: number;
  questionText: string;
  isMultipleChoice: boolean;
  options: Option[];
  totalMarks: number;
  singleCorrectAnswer?: string; // For non-multiple choice questions
}

export default function ManualQuestionEditorScreen() {
  const params = useLocalSearchParams();
  const testName = params.testName as string;
  const testTotalMarks = parseFloat(params.totalMarks as string) || 0;
  const totalQuestions = parseInt(params.totalQuestions as string);
  const currentQuestionNumber = parseInt(params.currentQuestion as string);
  
  const [question, setQuestion] = useState<Question>({
    questionNumber: currentQuestionNumber,
    questionText: `Question ${currentQuestionNumber}`, // Auto-generated
    isMultipleChoice: true,
    options: [
      { id: "A", text: "A", isCorrect: true, weight: 1 },
    ],
    totalMarks: 1,
    singleCorrectAnswer: "",
  });

  const [allQuestions, setAllQuestions] = useState<Question[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const { theme, isDarkMode } = useTheme();

  // Calculate total marks from all questions
  const calculateRunningTotal = () => {
    const otherQuestions = allQuestions.filter(q => q.questionNumber !== currentQuestionNumber);
    const otherQuestionsTotal = otherQuestions.reduce((sum, q) => sum + q.totalMarks, 0);
    return otherQuestionsTotal + question.totalMarks;
  };

  const runningTotal = calculateRunningTotal();
  const isMarksValid = Math.abs(runningTotal - testTotalMarks) < 0.01;
  const remainingMarks = testTotalMarks - (runningTotal - question.totalMarks);

  useEffect(() => {
    // Load saved questions if any
    const savedQuestions = JSON.parse(params.questions as string || "[]");
    setAllQuestions(savedQuestions);
    
    // If editing existing question, load it
    if (savedQuestions.length >= currentQuestionNumber) {
      const existingQuestion = savedQuestions[currentQuestionNumber - 1];
      if (existingQuestion) {
        setQuestion(existingQuestion);
      }
    }
  }, []);

  const addOption = () => {
    if (question.options.length >= 6) return;
    
    const newOptionId = String.fromCharCode(65 + question.options.length); // A, B, C, D, E, F
    const currentCorrectOptions = question.options.filter(opt => opt.isCorrect);
    const defaultWeight = currentCorrectOptions.length === 0 ? question.totalMarks : 0;
    
    const newOption = { 
      id: newOptionId, 
      text: newOptionId, // Default to the option letter
      isCorrect: true, 
      weight: defaultWeight 
    };
    
    setQuestion(prev => ({
      ...prev,
      options: [...prev.options, newOption]
    }));
  };

  const removeOption = (optionId: string) => {
    const correctOptions = question.options.filter(opt => opt.isCorrect);
    if (correctOptions.length <= 1) {
      Alert.alert("Cannot Remove", "You must have at least one correct option");
      return;
    }
    
    setQuestion(prev => {
      const filteredOptions = prev.options.filter(opt => opt.id !== optionId);
      return {
        ...prev,
        options: filteredOptions.map((opt, index) => ({
          ...opt,
          id: String.fromCharCode(65 + index) // Reassign A, B, C...
        }))
      };
    });
  };

  const updateOption = (optionId: string, field: keyof Option, value: any) => {
    setQuestion(prev => ({
      ...prev,
      options: prev.options.map(opt =>
        opt.id === optionId ? { ...opt, [field]: value } : { ...opt }
      )
    }));
  };

  const toggleCorrectAnswer = (optionId: string) => {
    setQuestion(prev => {
      const updatedOptions = prev.options.map(opt => 
        opt.id === optionId ? { ...opt, isCorrect: !opt.isCorrect } : { ...opt }
      );
      
      // Auto-adjust weights for single correct answer
      const correctOptions = updatedOptions.filter(opt => opt.isCorrect);
      if (correctOptions.length === 1) {
        // Single correct answer: set weight to total marks
        const finalOptions = updatedOptions.map(opt => 
          opt.isCorrect ? { ...opt, weight: prev.totalMarks } : { ...opt }
        );
        return { ...prev, options: finalOptions };
      }
      
      return { ...prev, options: updatedOptions };
    });
  };

  const calculateTotalWeight = () => {
    if (!question.options) return 0;
    
    const total = question.options
      .filter(opt => opt && opt.isCorrect)
      .reduce((sum, opt) => sum + (opt.weight || 0), 0);
    return Math.round(total * 100) / 100; // Round to 2 decimal places
  };

  const autoDistributeMarks = () => {
    if (!question.options) return;
    
    const correctOptions = question.options.filter(opt => opt && opt.isCorrect);
    if (correctOptions.length === 0) return;
    
    // Calculate equal distribution
    const marksPerOption = Math.round((question.totalMarks / correctOptions.length) * 100) / 100;
    
    // Update all correct options with distributed marks
    setQuestion(prev => ({
      ...prev,
      options: prev.options.map(opt => 
        opt.isCorrect ? { ...opt, weight: marksPerOption } : { ...opt }
      )
    }));
  };

  const validateQuestion = () => {
    if (question.totalMarks <= 0) {
      Alert.alert("Error", "Total marks should be greater than 0");
      return false;
    }

    if (question.isMultipleChoice) {
      if (!question.options || !Array.isArray(question.options)) {
        Alert.alert("Error", "Invalid options data");
        return false;
      }
      
      const correctOptions = question.options.filter(opt => opt && opt.isCorrect);
      
      if (correctOptions.length === 0) {
        Alert.alert("Error", "Please add at least one correct option");
        return false;
      }

      const hasEmptyOptions = correctOptions.some(opt => !opt.text || !opt.text.trim());
      if (hasEmptyOptions) {
        Alert.alert("Error", "Please fill in all correct option texts");
        return false;
      }

      // Always check weight sum for correct options
      const totalWeight = calculateTotalWeight();
      const roundedTotalWeight = Math.round(totalWeight * 100) / 100; // Round to 2 decimal places
      const roundedTotalMarks = Math.round(question.totalMarks * 100) / 100;
      
      if (Math.abs(roundedTotalWeight - roundedTotalMarks) > 0.01) {
        Alert.alert(
          "Weight Mismatch",
          `Total weightage of correct options (${roundedTotalWeight}) must equal total marks (${roundedTotalMarks})`
        );
        return false;
      }
    } else {
      // For non-multiple choice, check if correct answer is provided
      if (!question.singleCorrectAnswer?.trim()) {
        Alert.alert("Error", "Please enter the correct answer");
        return false;
      }
    }

    return true;
  };

  const saveAndNext = () => {
    if (!validateQuestion()) return;

    console.log(`💾 Saving question ${currentQuestionNumber}:`, JSON.stringify(question, null, 2));

    // Update allQuestions array
    const updatedQuestions = [...allQuestions];
    updatedQuestions[currentQuestionNumber - 1] = question;
    setAllQuestions(updatedQuestions);

    console.log(`📋 Updated questions array:`, updatedQuestions.map(q => ({
      questionNumber: q.questionNumber,
      optionsCount: q.options.length,
      correctOptions: q.options.filter(opt => opt.isCorrect).map(opt => ({ id: opt.id, text: opt.text }))
    })));

    if (currentQuestionNumber < totalQuestions) {
      // Go to next question
      router.push({
        pathname: "/manual-question-editor",
        params: {
          testName,
          totalMarks: testTotalMarks.toString(),
          totalQuestions: totalQuestions.toString(),
          currentQuestion: (currentQuestionNumber + 1).toString(),
          questions: JSON.stringify(updatedQuestions),
        },
      });
    } else {
      // Finished all questions - save test
      saveTest(updatedQuestions);
    }
  };

  const saveTest = async (questions: Question[]) => {
    try {
      setIsLoading(true);
      console.log('🔄 Saving manual test...');
      
      // Validate total marks before saving
      const calculatedTotal = questions.reduce((sum, q) => sum + q.totalMarks, 0);
      if (Math.abs(calculatedTotal - testTotalMarks) > 0.01) {
        Alert.alert(
          "Marks Validation Failed",
          `The sum of all question marks (${calculatedTotal}) must equal the total test marks (${testTotalMarks}). Please adjust the marks for individual questions.`
        );
        setIsLoading(false);
        return;
      }
      
      const testData = {
        testName,
        totalMarks: testTotalMarks,
        questions: questions.map(q => ({
          questionNumber: q.questionNumber,
          questionText: q.questionText,
          isMultipleChoice: q.isMultipleChoice,
          options: q.options,
          totalMarks: q.totalMarks,
          singleCorrectAnswer: q.singleCorrectAnswer
        }))
      };

      console.log('📤 Test data:', JSON.stringify(testData, null, 2));
      
      // Additional debugging - log each question's options
      testData.questions.forEach((q, index) => {
        console.log(`📝 Question ${index + 1} options:`, q.options);
        console.log(`   Correct options:`, q.options.filter(opt => opt.isCorrect));
      });
      
      const result = await manualTestService.create(testData);
      console.log('✅ Test created successfully:', result);
      
      Alert.alert(
        "Test Created Successfully!",
        `"${testName}" has been created with ${questions.length} questions.`,
        [
          {
            text: "OK",
            onPress: () => router.push("/(tabs)/tests")
          }
        ]
      );
    } catch (error: any) {
      console.error('❌ Error saving test:', error);
      Alert.alert(
        "Error", 
        error.response?.data?.error || error.message || "Failed to save test. Please try again."
      );
    } finally {
      setIsLoading(false);
    }
  };

  const goToPrevious = () => {
    if (currentQuestionNumber > 1) {
      // Save current question first
      const updatedQuestions = [...allQuestions];
      updatedQuestions[currentQuestionNumber - 1] = question;
      
      router.push({
        pathname: "/manual-question-editor",
        params: {
          testName,
          totalMarks: testTotalMarks.toString(),
          totalQuestions: totalQuestions.toString(),
          currentQuestion: (currentQuestionNumber - 1).toString(),
          questions: JSON.stringify(updatedQuestions),
        },
      });
    }
  };

  const OptionEditor = ({ option, index }: { option: Option; index: number }) => (
    <View style={[styles.optionContainer, { backgroundColor: theme.colors.surface }]}>
      <View style={styles.optionHeader}>
        <View style={styles.optionLeft}>
          <View
            style={[
              styles.optionBadge,
              {
                backgroundColor: option.isCorrect ? theme.colors.primary : theme.colors.surfaceVariant,
              },
            ]}
          >
            <Text
              variant="labelMedium"
              style={{
                color: option.isCorrect ? "white" : theme.colors.onSurfaceVariant,
                fontWeight: "600",
              }}
            >
              {option.id}
            </Text>
          </View>
          <TouchableOpacity
            style={[
              styles.correctToggle,
              { backgroundColor: option.isCorrect ? theme.colors.primary + "20" : "transparent" },
            ]}
            onPress={() => toggleCorrectAnswer(option.id)}
          >
            <Ionicons
              name={option.isCorrect ? "checkmark-circle" : "checkmark-circle-outline"}
              size={20}
              color={option.isCorrect ? theme.colors.primary : theme.colors.onSurfaceVariant}
            />
            <Text
              variant="bodySmall"
              style={{
                color: option.isCorrect ? theme.colors.primary : theme.colors.onSurfaceVariant,
                marginLeft: 6,
              }}
            >
              {option.isCorrect ? "Correct" : "Mark as correct"}
            </Text>
          </TouchableOpacity>
        </View>
        
        {question.options.length > 2 && (
          <TouchableOpacity
            style={styles.removeButton}
            onPress={() => removeOption(option.id)}
          >
            <Ionicons name="close-circle" size={20} color="#EF4444" />
          </TouchableOpacity>
        )}
      </View>

      <TextInput
        style={[
          styles.optionInput,
          {
            backgroundColor: isDarkMode ? "#374151" : "#F9FAFB",
            color: theme.colors.onSurface,
            borderColor: option.isCorrect ? theme.colors.primary : theme.colors.outline,
            borderWidth: option.isCorrect ? 2 : 1,
          },
        ]}
        value={option.text}
        onChangeText={(text) => updateOption(option.id, "text", text)}
        placeholder={`Option ${option.id} text`}
        placeholderTextColor={theme.colors.onSurfaceVariant}
        multiline
      />

      {option.isCorrect && (
        <View style={styles.weightContainer}>
          <Text variant="labelMedium" style={[styles.weightLabel, { color: theme.colors.onSurface }]}>
            Weight (Marks):
          </Text>
          <TextInput
            style={[
              styles.weightInput,
              {
                backgroundColor: isDarkMode ? "#374151" : "#F9FAFB",
                color: theme.colors.onSurface,
                borderColor: theme.colors.primary,
              },
            ]}
            value={option.weight.toString()}
            onChangeText={(text) => {
              // Allow empty input for better UX
              if (text === '') {
                updateOption(option.id, "weight", 0);
                return;
              }
              
              // Allow decimal input including starting with dot
              const weight = parseFloat(text);
              if (!isNaN(weight) && weight >= 0) {
                updateOption(option.id, "weight", weight);
              }
            }}
            keyboardType="numeric"
            placeholder="1"
          />
        </View>
      )}
    </View>
  );

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
            <Text variant="headlineMedium" style={styles.headerTitle}>
              Question {currentQuestionNumber} of {totalQuestions}
            </Text>
            <Text variant="bodyLarge" style={styles.headerSubtitle}>
              {testName}
            </Text>
          </View>
          <View style={styles.progressContainer}>
            <Text variant="bodySmall" style={styles.progressText}>
              {Math.round((currentQuestionNumber / totalQuestions) * 100)}%
            </Text>
            <View style={styles.progressBar}>
              <View
                style={[
                  styles.progressFill,
                  { width: `${(currentQuestionNumber / totalQuestions) * 100}%` }
                ]}
              />
            </View>
          </View>
        </View>
      </LinearGradient>

      <KeyboardAvoidingView
        style={styles.container}
        behavior={Platform.OS === "ios" ? "padding" : "height"}
      >
        <ScrollView
          style={styles.scrollContainer}
          contentContainerStyle={styles.scrollContent}
          showsVerticalScrollIndicator={false}
        >
          {/* Question Text */}
          <Card style={[styles.card, { backgroundColor: theme.colors.surface }]}>
            <View style={styles.cardContent}>
              <View style={styles.sectionHeader}>
                <Ionicons name="help-circle-outline" size={24} color={theme.colors.primary} />
                <Text variant="titleLarge" style={[styles.sectionTitle, { color: theme.colors.onSurface }]}>
                  Question Text
                </Text>
              </View>
              <TextInput
                style={[
                  styles.questionInput,
                  {
                    backgroundColor: isDarkMode ? "#374151" : "#F9FAFB",
                    color: theme.colors.onSurface,
                    borderColor: theme.colors.outline,
                  },
                ]}
                value={question.questionText}
                onChangeText={(text) => setQuestion(prev => ({ ...prev, questionText: text }))}
                placeholder="Enter your question here..."
                placeholderTextColor={theme.colors.onSurfaceVariant}
                multiline
                numberOfLines={3}
              />
            </View>
          </Card>

          {/* Question Type */}
          <Card style={[styles.card, { backgroundColor: theme.colors.surface }]}>
            <View style={styles.cardContent}>
              <View style={styles.sectionHeader}>
                <Ionicons name="list-outline" size={24} color={theme.colors.primary} />
                <Text variant="titleLarge" style={[styles.sectionTitle, { color: theme.colors.onSurface }]}>
                  Question Type & Marks
                </Text>
              </View>
              
              <View style={styles.typeToggleContainer}>
                <View style={styles.switchRow}>
                  <Text variant="bodyLarge" style={{ color: theme.colors.onSurface }}>
                    Multiple Choice Question
                  </Text>
                  <Switch
                    value={question.isMultipleChoice}
                    onValueChange={(value) => setQuestion(prev => ({ ...prev, isMultipleChoice: value }))}
                    thumbColor={theme.colors.primary}
                  />
                </View>
                
                <View style={styles.marksContainer}>
                  <Text variant="labelLarge" style={[styles.marksLabel, { color: theme.colors.onSurface }]}>
                    Total Marks for this Question:
                  </Text>
                  <TextInput
                    style={[
                      styles.marksInput,
                      {
                        backgroundColor: isDarkMode ? "#374151" : "#F9FAFB",
                        color: theme.colors.onSurface,
                        borderColor: theme.colors.outline,
                      },
                    ]}
                    value={question.totalMarks.toString()}
                    onChangeText={(text) => {
                      // Allow empty input for better UX
                      if (text === '') {
                        setQuestion(prev => ({ ...prev, totalMarks: 0 }));
                        return;
                      }
                      
                      // Allow decimal input
                      const marks = parseFloat(text);
                      if (!isNaN(marks) && marks >= 0) {
                        setQuestion(prev => {
                          const newState = { ...prev, totalMarks: marks };
                          
                          // Auto-adjust single correct answer weight
                          if (prev.isMultipleChoice && prev.options) {
                            const correctOptions = prev.options.filter(opt => opt && opt.isCorrect);
                            if (correctOptions.length === 1) {
                              newState.options = prev.options.map(opt => 
                                opt.isCorrect ? { ...opt, weight: marks } : { ...opt }
                              );
                            }
                          }
                          
                          return newState;
                        });
                      }
                    }}
                    keyboardType="numeric"
                    placeholder="Enter marks for this question"
                  />
                  
                  {/* Marks Validation Display */}
                  <View style={styles.validationContainer}>
                    <Text 
                      variant="bodySmall" 
                      style={[
                        styles.validationText, 
                        { color: isMarksValid ? theme.colors.outline : '#f44336' }
                      ]}
                    >
                      Running Total: {runningTotal}/{testTotalMarks} marks
                    </Text>
                    {!isMarksValid && (
                      <Text 
                        variant="bodySmall" 
                        style={[styles.validationWarning, { color: '#f44336' }]}
                      >
                        ⚠ Remaining: {remainingMarks.toFixed(2)} marks for other questions
                      </Text>
                    )}
                    {isMarksValid && allQuestions.length + 1 === totalQuestions && (
                      <Text 
                        variant="bodySmall" 
                        style={[styles.validationSuccess, { color: '#4caf50' }]}
                      >
                        ✅ Total marks allocation is complete!
                      </Text>
                    )}
                  </View>
                </View>

                {/* Single Correct Answer Input (for non-multiple choice) */}
                {!question.isMultipleChoice && (
                  <View style={styles.marksContainer}>
                    <Text variant="labelLarge" style={[styles.marksLabel, { color: theme.colors.onSurface }]}>
                      Correct Answer:
                    </Text>
                    <TextInput
                      style={[
                        styles.marksInput,
                        {
                          backgroundColor: isDarkMode ? "#374151" : "#F9FAFB",
                          color: theme.colors.onSurface,
                          borderColor: theme.colors.outline,
                        },
                      ]}
                      value={question.singleCorrectAnswer || ''}
                      onChangeText={(text) => setQuestion(prev => ({ ...prev, singleCorrectAnswer: text }))}
                      placeholder="Enter the correct answer"
                      multiline
                    />
                  </View>
                )}
              </View>
            </View>
          </Card>

          {/* Correct Options (only for multiple choice) */}
          {question.isMultipleChoice && (
            <Card style={[styles.card, { backgroundColor: theme.colors.surface }]}>
              <View style={styles.cardContent}>
                <View style={styles.sectionHeader}>
                  <Ionicons name="checkmark-circle-outline" size={24} color={theme.colors.primary} />
                  <Text variant="titleLarge" style={[styles.sectionTitle, { color: theme.colors.onSurface }]}>
                    Correct Options
                  </Text>
                  <View style={styles.headerRight}>
                    <TouchableOpacity
                      style={[styles.autoDistributeButton, { backgroundColor: theme.colors.primary + "20", borderColor: theme.colors.primary }]}
                      onPress={autoDistributeMarks}
                    >
                      <Ionicons name="shuffle-outline" size={14} color={theme.colors.primary} />
                      <Text style={[styles.autoDistributeText, { color: theme.colors.primary }]}>
                        Auto Distribute
                      </Text>
                    </TouchableOpacity>
                    <Chip
                      mode="outlined"
                      compact
                      style={[styles.weightChip, { backgroundColor: theme.colors.primary + "20" }]}
                      textStyle={{ color: theme.colors.primary, fontSize: 12 }}
                    >
                      Weight: {calculateTotalWeight()}/{question.totalMarks}
                    </Chip>
                  </View>
                </View>
                
                <Text variant="bodyMedium" style={[styles.sectionDescription, { color: theme.colors.onSurfaceVariant }]}>
                  Enter only the correct options for this question with their weightages.
                  Use "Auto Distribute" to evenly distribute marks among all correct options.
                </Text>

                {/* Display existing correct options */}
                {question.options && question.options.filter(opt => opt && opt.isCorrect).map((option, index) => (
                  <View key={`${option.id}-${index}`} style={[styles.correctOptionContainer, { backgroundColor: theme.colors.primary + "10" }]}>
                    <View style={styles.correctOptionHeader}>
                      <View style={styles.correctOptionBadge}>
                        <Ionicons name="checkmark-circle" size={16} color={theme.colors.primary} />
                        <Text style={[styles.correctOptionLabel, { color: theme.colors.primary }]}>
                          Correct Option {index + 1}
                        </Text>
                      </View>
                      {question.options.filter(opt => opt && opt.isCorrect).length > 1 && (
                        <TouchableOpacity
                          style={styles.removeCorrectOption}
                          onPress={() => removeOption(option.id)}
                        >
                          <Ionicons name="close-circle" size={18} color="#EF4444" />
                        </TouchableOpacity>
                      )}
                    </View>

                    {/* Option Text Input */}
                    <View style={styles.correctOptionInputGroup}>
                      <Text style={[styles.correctOptionInputLabel, { color: theme.colors.onSurface }]}>
                        Correct Answer (A, B, C, D, etc.):
                      </Text>
                      <TextInput
                        style={[
                          styles.correctOptionInput,
                          {
                            backgroundColor: isDarkMode ? "#374151" : "#F9FAFB",
                            color: theme.colors.onSurface,
                            borderColor: theme.colors.primary,
                            borderWidth: 2,
                          },
                        ]}
                        value={option.text || ""}
                        onChangeText={(text) => {
                          // Directly update the option text without any complex logic
                          updateOption(option.id, "text", text);
                        }}
                        placeholder="Enter A, B, C, D or full answer text"
                        placeholderTextColor={theme.colors.onSurfaceVariant}
                        multiline
                      />
                    </View>

                    {/* Weightage Input */}
                    <View style={styles.correctOptionInputGroup}>
                      <Text style={[styles.correctOptionInputLabel, { color: theme.colors.onSurface }]}>
                        Weightage (Marks):
                      </Text>
                      <TextInput
                        style={[
                          styles.weightageInput,
                          {
                            backgroundColor: isDarkMode ? "#374151" : "#F9FAFB",
                            color: theme.colors.onSurface,
                            borderColor: theme.colors.primary,
                            borderWidth: 2,
                          },
                        ]}
                        value={option.weight?.toString() || "0"}
                        onChangeText={(text) => {
                          // Handle weight input more carefully
                          if (text === '') {
                            updateOption(option.id, "weight", 0);
                            return;
                          }
                          
                          // Allow decimal numbers
                          const numericValue = parseFloat(text);
                          if (!isNaN(numericValue) && numericValue >= 0) {
                            updateOption(option.id, "weight", numericValue);
                          } else if (text.match(/^\d*\.?\d*$/)) {
                            // Allow typing decimal points and partial numbers
                            updateOption(option.id, "weight", parseFloat(text) || 0);
                          }
                        }}
                        keyboardType="decimal-pad"
                        placeholder="Enter marks (e.g., 0.5, 1, 2.5)"
                        placeholderTextColor={theme.colors.onSurfaceVariant}
                      />
                    </View>
                  </View>
                ))}

                {/* Add New Correct Option Button */}
                <TouchableOpacity
                  style={[styles.addCorrectOptionButton, { borderColor: theme.colors.primary }]}
                  onPress={addOption}
                >
                  <Ionicons name="add-circle-outline" size={20} color={theme.colors.primary} />
                  <Text style={[styles.addCorrectOptionText, { color: theme.colors.primary }]}>
                    Add Another Correct Option
                  </Text>
                </TouchableOpacity>

                {/* Weightage Validation Summary */}
                {question.options && question.options.filter(opt => opt && opt.isCorrect).length > 0 && (
                  <View style={[styles.weightValidationContainer, { 
                    backgroundColor: Math.abs(calculateTotalWeight() - question.totalMarks) <= 0.01 ? theme.colors.primary + "10" : "#FEF2F2",
                    borderColor: Math.abs(calculateTotalWeight() - question.totalMarks) <= 0.01 ? theme.colors.primary : "#F87171"
                  }]}>
                    <Ionicons 
                      name={Math.abs(calculateTotalWeight() - question.totalMarks) <= 0.01 ? "checkmark-circle" : "warning"} 
                      size={16} 
                      color={Math.abs(calculateTotalWeight() - question.totalMarks) <= 0.01 ? theme.colors.primary : "#F87171"} 
                    />
                    <Text style={[styles.weightValidationText, { 
                      color: Math.abs(calculateTotalWeight() - question.totalMarks) <= 0.01 ? theme.colors.primary : "#F87171" 
                    }]}>
                      {Math.abs(calculateTotalWeight() - question.totalMarks) <= 0.01
                        ? `✓ Perfect! Total weightage matches marks (${question.totalMarks})`
                        : `⚠ Total weightage (${calculateTotalWeight()}) should equal total marks (${question.totalMarks})`
                      }
                    </Text>
                  </View>
                )}
              </View>
            </Card>
          )}

          <View style={styles.bottomSpacer} />
        </ScrollView>

        {/* Navigation Buttons */}
        <View style={[styles.navigationContainer, { backgroundColor: theme.colors.surface }]}>
          <TouchableOpacity
            style={[
              styles.navButton,
              styles.previousButton,
              { opacity: currentQuestionNumber > 1 && !isLoading ? 1 : 0.5 },
            ]}
            onPress={goToPrevious}
            disabled={currentQuestionNumber <= 1 || isLoading}
          >
            <Ionicons name="arrow-back" size={20} color={theme.colors.onSurface} />
            <Text style={[styles.navButtonText, { color: theme.colors.onSurface }]}>
              Previous
            </Text>
          </TouchableOpacity>

          <TouchableOpacity
            style={[styles.nextButton, { opacity: isLoading ? 0.7 : 1 }]}
            onPress={saveAndNext}
            disabled={isLoading}
          >
            <LinearGradient
              colors={["#6366F1", "#8B5CF6"]}
              style={styles.nextButtonGradient}
              start={{ x: 0, y: 0 }}
              end={{ x: 1, y: 1 }}
            >
              {isLoading ? (
                <>
                  <View style={styles.loadingSpinner}>
                    <Text style={[styles.nextButtonText, { marginRight: 8 }]}>
                      {currentQuestionNumber === totalQuestions ? "Creating Test..." : "Saving..."}
                    </Text>
                  </View>
                </>
              ) : (
                <>
                  <Text style={styles.nextButtonText}>
                    {currentQuestionNumber === totalQuestions ? "Finish Test" : "Save & Next"}
                  </Text>
                  <Ionicons 
                    name={currentQuestionNumber === totalQuestions ? "checkmark" : "arrow-forward"} 
                    size={20} 
                    color="white" 
                  />
                </>
              )}
            </LinearGradient>
          </TouchableOpacity>
        </View>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safeArea: {
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
    marginRight: 12,
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
  progressContainer: {
    alignItems: "flex-end",
    minWidth: 60,
  },
  progressText: {
    color: "white",
    fontSize: 12,
    marginBottom: 4,
  },
  progressBar: {
    width: 60,
    height: 4,
    backgroundColor: "rgba(255,255,255,0.3)",
    borderRadius: 2,
  },
  progressFill: {
    height: "100%",
    backgroundColor: "white",
    borderRadius: 2,
  },
  container: {
    flex: 1,
  },
  scrollContainer: {
    flex: 1,
  },
  scrollContent: {
    paddingHorizontal: 20,
    paddingTop: 20,
  },
  card: {
    marginBottom: 20,
    borderRadius: 16,
    elevation: 2,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.1,
    shadowRadius: 3,
  },
  cardContent: {
    padding: 20,
  },
  sectionHeader: {
    flexDirection: "row",
    alignItems: "center",
    marginBottom: 12,
  },
  sectionTitle: {
    fontWeight: "600",
    marginLeft: 12,
    flex: 1,
  },
  headerRight: {
    flexDirection: "row",
    alignItems: "center",
  },
  sectionDescription: {
    marginBottom: 16,
    lineHeight: 20,
  },
  questionInput: {
    borderWidth: 1,
    borderRadius: 12,
    paddingHorizontal: 16,
    paddingVertical: 12,
    fontSize: 16,
    textAlignVertical: "top",
    minHeight: 80,
  },
  typeToggleContainer: {
    gap: 16,
  },
  switchRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
  },
  marksContainer: {
    flexDirection: "row",
    alignItems: "center",
    gap: 12,
  },
  marksLabel: {
    fontWeight: "500",
  },
  marksInput: {
    borderWidth: 1,
    borderRadius: 8,
    paddingHorizontal: 12,
    paddingVertical: 8,
    fontSize: 16,
    width: 80,
    textAlign: "center",
  },
  weightChip: {
    height: 28,
  },
  optionContainer: {
    borderRadius: 12,
    padding: 16,
    marginBottom: 12,
    borderWidth: 1,
    borderColor: "rgba(0,0,0,0.1)",
  },
  optionHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: 12,
  },
  optionLeft: {
    flexDirection: "row",
    alignItems: "center",
    flex: 1,
  },
  optionBadge: {
    width: 32,
    height: 32,
    borderRadius: 16,
    justifyContent: "center",
    alignItems: "center",
    marginRight: 12,
  },
  correctToggle: {
    flexDirection: "row",
    alignItems: "center",
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 12,
  },
  removeButton: {
    padding: 4,
  },
  optionInput: {
    borderWidth: 1,
    borderRadius: 8,
    paddingHorizontal: 12,
    paddingVertical: 8,
    fontSize: 16,
    marginBottom: 8,
  },
  weightContainer: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
  },
  weightLabel: {
    fontWeight: "500",
  },
  weightInput: {
    borderWidth: 1,
    borderRadius: 6,
    paddingHorizontal: 8,
    paddingVertical: 4,
    fontSize: 14,
    width: 60,
    textAlign: "center",
  },
  addOptionButton: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    paddingVertical: 12,
    borderWidth: 2,
    borderStyle: "dashed",
    borderRadius: 8,
    marginTop: 8,
    gap: 8,
  },
  addOptionText: {
    fontWeight: "500",
  },
  navigationContainer: {
    flexDirection: "row",
    paddingHorizontal: 20,
    paddingVertical: 16,
    gap: 12,
    borderTopWidth: 1,
    borderTopColor: "rgba(0,0,0,0.1)",
  },
  navButton: {
    flex: 1,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    paddingVertical: 12,
    borderRadius: 12,
    gap: 8,
  },
  previousButton: {
    backgroundColor: "transparent",
    borderWidth: 1,
    borderColor: "rgba(0,0,0,0.2)",
  },
  navButtonText: {
    fontSize: 16,
    fontWeight: "500",
  },
  nextButton: {
    flex: 2,
    borderRadius: 12,
    overflow: "hidden",
  },
  nextButtonGradient: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    paddingVertical: 12,
    gap: 8,
  },
  nextButtonText: {
    color: "white",
    fontSize: 16,
    fontWeight: "600",
  },
  bottomSpacer: {
    height: 20,
  },
  // Correct Options Styles
  correctOptionContainer: {
    marginBottom: 16,
    padding: 16,
    borderRadius: 12,
    borderWidth: 2,
  },
  correctOptionHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: 12,
  },
  correctOptionBadge: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
  },
  correctOptionLabel: {
    fontSize: 14,
    fontWeight: "600",
  },
  removeCorrectOption: {
    padding: 4,
  },
  correctOptionInputGroup: {
    marginBottom: 12,
  },
  correctOptionInputLabel: {
    fontSize: 14,
    fontWeight: "500",
    marginBottom: 6,
  },
  correctOptionInput: {
    borderWidth: 1,
    borderRadius: 8,
    padding: 12,
    fontSize: 16,
    minHeight: 48,
  },
  weightageInput: {
    borderWidth: 1,
    borderRadius: 8,
    padding: 12,
    fontSize: 16,
    height: 48,
  },
  addCorrectOptionButton: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    paddingVertical: 12,
    borderWidth: 2,
    borderStyle: "dashed",
    borderRadius: 8,
    marginBottom: 16,
    gap: 8,
  },
  addCorrectOptionText: {
    fontWeight: "500",
  },
  weightValidationContainer: {
    flexDirection: "row",
    alignItems: "center",
    padding: 12,
    borderRadius: 8,
    borderWidth: 1,
    gap: 8,
  },
  weightValidationText: {
    fontSize: 14,
    fontWeight: "500",
    flex: 1,
  },
  loadingSpinner: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
  },
  autoDistributeButton: {
    flexDirection: "row",
    alignItems: "center",
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 12,
    borderWidth: 1,
    marginRight: 8,
    gap: 4,
  },
  autoDistributeText: {
    fontSize: 11,
    fontWeight: "500",
  },
  validationContainer: {
    marginTop: 8,
    padding: 8,
    backgroundColor: 'rgba(128, 128, 128, 0.1)',
    borderRadius: 6,
  },
  validationText: {
    fontSize: 12,
    fontWeight: "500",
  },
  validationWarning: {
    fontSize: 11,
    fontWeight: "500",
    marginTop: 4,
  },
  validationSuccess: {
    fontSize: 11,
    fontWeight: "500",
    marginTop: 4,
  },
});