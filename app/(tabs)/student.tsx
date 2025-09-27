import React, { useState, useEffect } from "react";
import {
  View,
  StyleSheet,
  Alert,
  ScrollView,
  Image,
  TouchableOpacity,
  Dimensions,
  Text,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { StatusBar } from "expo-status-bar";
import { TextInput, Button, ActivityIndicator, Chip } from "react-native-paper";
import { LinearGradient } from "expo-linear-gradient";
import { Ionicons } from "@expo/vector-icons";
import * as ImagePicker from "expo-image-picker";
import { paperService, submissionService } from "../../services/api";
import { useTheme } from "../../context/ThemeContext";
import { router } from "expo-router";

const { width } = Dimensions.get("window");

interface Paper {
  id: number;
  name: string;
  uploaded_at: string;
  question_count: number;
  total_pages: number;
  question_type: string;
  questions?: any[];
}

export default function StudentSubmissionScreen() {
  const [studentName, setStudentName] = useState("");
  const [rollNumber, setRollNumber] = useState("");
  const [papers, setPapers] = useState<Paper[]>([]);
  const [selectedPaper, setSelectedPaper] = useState<Paper | null>(null);
  const [selectedImages, setSelectedImages] = useState<any[]>([]);
  const [submitting, setSubmitting] = useState(false);
  const [loadingPapers, setLoadingPapers] = useState(true);
  const [currentStep, setCurrentStep] = useState(1);
  const [currentPage, setCurrentPage] = useState(1); // Track current page being uploaded
  const [pageImages, setPageImages] = useState<{[key: number]: any}>({}); // Store images by page number

  const { theme, isDarkMode } = useTheme();

  const getQuestionTypeInfo = (questionType: string) => {
    switch (questionType) {
      case "omr":
        return {
          label: "OMR (Fill Circles)",
          color: "#6366F1",
          icon: "radio-button-off",
          instruction: "Fill the circles completely for your chosen answers",
        };
      case "traditional":
        return {
          label: "Traditional (Mark with ✓)",
          color: "#10B981",
          icon: "checkmark-circle-outline",
          instruction: "Mark your chosen answers with ✓ or clear marks",
        };
      case "mixed":
        return {
          label: "Mixed (OMR + Traditional)",
          color: "#F59E0B",
          icon: "list-outline",
          instruction: "Follow the specific format for each question type",
        };
      case "fill_blanks":
        return {
          label: "Fill in the Blanks",
          color: "#8B5CF6",
          icon: "create-outline",
          instruction: "Write your answers clearly in the blank spaces provided",
        };
      default:
        return {
          label: "Traditional (Mark with ✓)",
          color: "#10B981",
          icon: "checkmark-circle-outline",
          instruction: "Mark your chosen answers with ✓ or clear marks",
        };
    }
  };

  useEffect(() => {
    loadPapers();
  }, []);

  // Reset images when paper selection changes
  useEffect(() => {
    setSelectedImages([]);
    setPageImages({});
    setCurrentPage(1);
  }, [selectedPaper]);

  const loadPapers = async () => {
    try {
      const response = await paperService.getAllPublic();
      console.log(
        "Papers loaded in student portal:",
        JSON.stringify(response, null, 2)
      );
      setPapers(response);
    } catch (error) {
      console.log("Error loading papers:", error);
      Alert.alert("Error", "Failed to load papers");
    } finally {
      setLoadingPapers(false);
    }
  };

  const selectImages = async () => {
    const { status } = await ImagePicker.requestMediaLibraryPermissionsAsync();
    if (status !== "granted") {
      Alert.alert(
        "Permission needed",
        "Sorry, we need camera roll permissions to make this work!"
      );
      return;
    }

    const isMultiPage = selectedPaper && selectedPaper.total_pages > 1;

    if (isMultiPage) {
      // For multi-page papers, select one image for current page
      const result = await ImagePicker.launchImageLibraryAsync({
        mediaTypes: ImagePicker.MediaTypeOptions.Images,
        allowsEditing: true,
        aspect: [3, 4],
        quality: 0.8,
      });

      if (!result.canceled && result.assets[0]) {
        const newPageImages = { ...pageImages };
        newPageImages[currentPage] = result.assets[0];
        setPageImages(newPageImages);
        
        // Update selectedImages array for backward compatibility
        const imagesArray = [];
        for (let i = 1; i <= selectedPaper.total_pages; i++) {
          if (newPageImages[i]) {
            imagesArray.push(newPageImages[i]);
          }
        }
        setSelectedImages(imagesArray);
        
        if (currentStep < 4) setCurrentStep(4);
      }
    } else {
      // For single-page papers, use original logic
      const result = await ImagePicker.launchImageLibraryAsync({
        mediaTypes: ImagePicker.MediaTypeOptions.Images,
        allowsEditing: true,
        aspect: [3, 4],
        quality: 0.8,
      });

      if (!result.canceled && result.assets[0]) {
        setSelectedImages([result.assets[0]]);
        if (currentStep < 4) setCurrentStep(4);
      }
    }
  };

  const takePhoto = async () => {
    const { status } = await ImagePicker.requestCameraPermissionsAsync();
    if (status !== "granted") {
      Alert.alert(
        "Permission needed",
        "Sorry, we need camera permissions to make this work!"
      );
      return;
    }

    const result = await ImagePicker.launchCameraAsync({
      allowsEditing: true,
      aspect: [3, 4],
      quality: 0.8,
    });

    if (!result.canceled && result.assets[0]) {
      const isMultiPage = selectedPaper && selectedPaper.total_pages > 1;

      if (isMultiPage) {
        // For multi-page, store image for current page
        const newPageImages = { ...pageImages };
        newPageImages[currentPage] = result.assets[0];
        setPageImages(newPageImages);
        
        // Update selectedImages array for backward compatibility
        const imagesArray = [];
        for (let i = 1; i <= selectedPaper.total_pages; i++) {
          if (newPageImages[i]) {
            imagesArray.push(newPageImages[i]);
          }
        }
        setSelectedImages(imagesArray);
      } else {
        // For single-page, replace existing image
        setSelectedImages([result.assets[0]]);
      }
      if (currentStep < 4) setCurrentStep(4);
    }
  };

  const showImagePicker = () => {
    const isMultiPage = selectedPaper && selectedPaper.total_pages > 1;
    const maxPages = selectedPaper?.total_pages || 1;

    Alert.alert(
      "Select Answer Sheet",
      isMultiPage
        ? `Upload Page ${currentPage} of ${maxPages} for this question paper.`
        : "Choose how you want to select your answer sheet",
      [
        { text: "Take Photo", onPress: takePhoto },
        { text: "Gallery", onPress: selectImages },
        { text: "Cancel", style: "cancel" },
      ]
    );
  };

  const goToNextPage = () => {
    if (currentPage < (selectedPaper?.total_pages || 1)) {
      setCurrentPage(currentPage + 1);
    }
  };

  const goToPreviousPage = () => {
    if (currentPage > 1) {
      setCurrentPage(currentPage - 1);
    }
  };

  const goToSpecificPage = (pageNumber: number) => {
    const maxPages = selectedPaper?.total_pages || 1;
    if (pageNumber >= 1 && pageNumber <= maxPages) {
      setCurrentPage(pageNumber);
    }
  };

  const isPageUploaded = (pageNumber: number) => {
    return pageImages[pageNumber] !== undefined;
  };

  const getAllUploadedPages = () => {
    const maxPages = selectedPaper?.total_pages || 1;
    const uploadedCount = Object.keys(pageImages).length;
    return { uploadedCount, maxPages, isComplete: uploadedCount === maxPages };
  };

  const submitAnswers = async () => {
    if (!studentName.trim()) {
      Alert.alert("Error", "Please enter your name");
      return;
    }

    if (!rollNumber.trim()) {
      Alert.alert("Error", "Please enter your roll number");
      return;
    }

    if (!selectedPaper) {
      Alert.alert("Error", "Please select a paper");
      return;
    }

    if (selectedImages.length === 0) {
      Alert.alert("Error", "Please select your answer sheet image(s)");
      return;
    }

    // Validate page count for multi-page papers
    const isMultiPage = selectedPaper.total_pages > 1;
    if (isMultiPage) {
      const { uploadedCount, maxPages, isComplete } = getAllUploadedPages();
      if (!isComplete) {
        Alert.alert(
          "Incomplete Upload",
          `This question paper has ${maxPages} pages, but you have only uploaded ${uploadedCount} page(s). Please upload all ${maxPages} pages before submitting.`,
          [{ text: "OK" }]
        );
        return;
      }
    }

    setSubmitting(true);
    try {
      const formData = new FormData();
      formData.append("studentName", studentName.trim());
      formData.append("rollNo", rollNumber.trim());
      formData.append("paperId", selectedPaper.id.toString());

      if (isMultiPage) {
        // Use pageImages to maintain correct page order
        for (let pageNum = 1; pageNum <= selectedPaper.total_pages; pageNum++) {
          const pageImage = pageImages[pageNum];
          if (pageImage) {
            const imageFile = {
              uri: pageImage.uri,
              type: "image/jpeg",
              name: `answer-sheet-page-${pageNum}.jpg`,
            } as any;

            formData.append("answerSheets", imageFile);
          }
        }
      } else {
        // For single-page papers, append single file
        const imageFile = {
          uri: selectedImages[0].uri,
          type: "image/jpeg",
          name: "answer-sheet.jpg",
        } as any;

        formData.append("answerSheet", imageFile);
      }

      const response = await submissionService.submit(formData);

      Alert.alert(
        "Submission Complete!",
        `Your answer sheet has been submitted and stored successfully!\n\nStudent: ${
          response.studentName
        }\nPaper: ${response.paperName}\nEvaluation: ${
          response.evaluationMethod || "Auto-detected"
        }\n\n${
          response.driveInfo?.uploadedToDrive
            ? "✓ Stored in Google Drive"
            : "⚠ Drive upload failed"
        }`,
        [
          {
            text: "Submit Another",
            onPress: () => {
              setStudentName("");
              setRollNumber("");
              setSelectedPaper(null);
              setSelectedImages([]);
              setPageImages({});
              setCurrentPage(1);
              setCurrentStep(1);
            },
          },
          {
            text: "Done",
            onPress: () => {
              router.back();
            },
          },
        ]
      );
    } catch (error: any) {
      Alert.alert(
        "Submission Failed",
        error.response?.data?.error || "Failed to submit answers"
      );
    } finally {
      setSubmitting(false);
    }
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

  const getStepStatus = (step: number) => {
    if (step === 1) return studentName.trim() && rollNumber.trim() ? "completed" : "current";
    if (step === 2) {
      return selectedPaper
        ? "completed"
        : currentStep >= 2
        ? "current"
        : "pending";
    }
    if (step === 3) {
      return selectedImages.length > 0
        ? "completed"
        : currentStep >= 3
        ? "current"
        : "pending";
    }
    if (step === 4) {
      return currentStep >= 4 ? "current" : "pending";
    }
    return "pending";
  };

  const canSubmit = () => {
    return (
      studentName.trim() &&
      rollNumber.trim() &&
      selectedPaper &&
      selectedImages.length > 0 &&
      !submitting
    );
  };

  const StepIndicator = ({
    step,
    title,
    status,
  }: {
    step: number;
    title: string;
    status: string;
  }) => {
    const getStatusColor = () => {
      switch (status) {
        case "completed":
          return "#10B981";
        case "current":
          return "#6366F1";
        default:
          return isDarkMode ? "#374151" : "#E5E7EB";
      }
    };

    return (
      <View style={styles.stepContainer}>
        <View
          style={[styles.stepIndicator, { backgroundColor: getStatusColor() }]}
        >
          {status === "completed" ? (
            <Ionicons name="checkmark" size={16} color="white" />
          ) : (
            <Text
              style={[
                styles.stepNumber,
                {
                  color:
                    status === "current"
                      ? "white"
                      : isDarkMode
                      ? "#9CA3AF"
                      : "#6B7280",
                },
              ]}
            >
              {step}
            </Text>
          )}
        </View>
        <Text style={[styles.stepTitle, { color: theme.colors.onSurface }]}>
          {title}
        </Text>
      </View>
    );
  };

  if (loadingPapers) {
    return (
      <View
        style={[styles.container, { backgroundColor: theme.colors.background }]}
      >
        <StatusBar
          style="light"
          backgroundColor={isDarkMode ? "#1F2937" : "#6366F1"}
        />
        <LinearGradient
          colors={isDarkMode ? ["#1F2937", "#111827"] : ["#6366F1", "#8B5CF6"]}
          style={styles.loadingGradient}
        >
          <ActivityIndicator size="large" color="white" />
          <Text style={styles.loadingText}>Loading available papers...</Text>
        </LinearGradient>
      </View>
    );
  }

  return (
    <View
      style={[styles.container, { backgroundColor: theme.colors.background }]}
    >
      <StatusBar
        style="light"
        backgroundColor={isDarkMode ? "#1F2937" : "#6366F1"}
      />
      {/* Header */}
      <LinearGradient
        colors={isDarkMode ? ["#1F2937", "#111827"] : ["#6366F1", "#8B5CF6"]}
        style={styles.header}
      >
        <SafeAreaView edges={["top"]}>
          <View style={styles.headerContent}>
            <TouchableOpacity
              onPress={() => router.back()}
              style={styles.backButton}
            >
              <Ionicons name="arrow-back" size={24} color="white" />
            </TouchableOpacity>
            <View style={styles.headerTextContainer}>
              <Text style={styles.headerTitle}>Answer Sheet Submission</Text>
              <Text style={styles.headerSubtitle}>
                Upload and get instant evaluation
              </Text>
            </View>
          </View>
        </SafeAreaView>
      </LinearGradient>

      {/* Progress Steps */}
      <View
        style={[
          styles.progressContainer,
          { backgroundColor: theme.colors.surface },
        ]}
      >
        <ScrollView
          horizontal
          showsHorizontalScrollIndicator={false}
          style={styles.progressScroll}
        >
          <StepIndicator
            step={1}
            title="Enter Name"
            status={getStepStatus(1)}
          />
          <StepIndicator
            step={2}
            title="Select Paper"
            status={getStepStatus(2)}
          />
          <StepIndicator
            step={3}
            title="Upload Image"
            status={getStepStatus(3)}
          />
          <StepIndicator step={4} title="Submit" status={getStepStatus(4)} />
        </ScrollView>
      </View>

      <ScrollView style={styles.content} showsVerticalScrollIndicator={false}>
        {/* Step 1: Student Name */}
        <View
          style={[styles.stepCard, { backgroundColor: theme.colors.surface }]}
        >
          <View style={styles.stepHeader}>
            <View
              style={[
                styles.stepIcon,
                {
                  backgroundColor:
                    getStepStatus(1) === "completed" ? "#10B981" : "#6366F1",
                },
              ]}
            >
              <Ionicons name="person" size={20} color="white" />
            </View>
            <Text
              style={[styles.stepCardTitle, { color: theme.colors.onSurface }]}
            >
              Enter Your Details
            </Text>
          </View>
          <TextInput
            label="Student Name"
            value={studentName}
            onChangeText={(text) => {
              setStudentName(text);
              if (text.trim() && rollNumber.trim() && currentStep < 2) {
                setCurrentStep(2);
              }
              // Don't reset currentStep when name is removed - just disable submit button
            }}
            style={styles.textInput}
            mode="outlined"
            placeholder="e.g., John Smith"
            disabled={submitting}
            theme={{ colors: { primary: "#6366F1" } }}
          />
          <TextInput
            label="Roll Number"
            value={rollNumber}
            onChangeText={(text) => {
              setRollNumber(text);
              if (studentName.trim() && text.trim() && currentStep < 2) {
                setCurrentStep(2);
              }
              // Don't reset currentStep when roll number is removed - just disable submit button
            }}
            style={styles.textInput}
            mode="outlined"
            placeholder="e.g., CSE001, 2023001"
            disabled={submitting}
            theme={{ colors: { primary: "#6366F1" } }}
          />
        </View>

        {/* Step 2: Paper Selection */}
        {currentStep >= 2 && (
          <View
            style={[styles.stepCard, { backgroundColor: theme.colors.surface }]}
          >
            <View style={styles.stepHeader}>
              <View
                style={[
                  styles.stepIcon,
                  {
                    backgroundColor:
                      getStepStatus(2) === "completed" ? "#10B981" : "#6366F1",
                  },
                ]}
              >
                <Ionicons name="document-text" size={20} color="white" />
              </View>
              <Text
                style={[
                  styles.stepCardTitle,
                  { color: theme.colors.onSurface },
                ]}
              >
                Select Question Paper
              </Text>
            </View>

            {papers.length === 0 ? (
              <View style={styles.emptyState}>
                <Ionicons
                  name="document-outline"
                  size={48}
                  color={isDarkMode ? "#6B7280" : "#9CA3AF"}
                />
                <Text
                  style={[
                    styles.emptyText,
                    { color: theme.colors.onSurfaceVariant },
                  ]}
                >
                  No question papers available
                </Text>
              </View>
            ) : selectedPaper ? (
              <View
                style={[
                  styles.selectedPaper,
                  { backgroundColor: isDarkMode ? "#1F2937" : "#F8FAFC" },
                ]}
              >
                <View style={styles.selectedPaperContent}>
                  <Text
                    style={[
                      styles.selectedPaperName,
                      { color: theme.colors.onSurface },
                    ]}
                    numberOfLines={2}
                  >
                    {selectedPaper.name}
                  </Text>
                  <View style={styles.selectedPaperInfo}>
                    <View style={styles.metaRow}>
                      <Chip
                        mode="outlined"
                        compact
                        textStyle={{
                          color: getQuestionTypeInfo(
                            selectedPaper.question_type || "traditional"
                          ).color,
                          fontSize: 10,
                        }}
                        style={[
                          styles.typeChip,
                          {
                            borderColor: getQuestionTypeInfo(
                              selectedPaper.question_type || "traditional"
                            ).color,
                          },
                        ]}
                      >
                        {
                          getQuestionTypeInfo(
                            selectedPaper.question_type || "traditional"
                          ).label
                        }
                      </Chip>
                    </View>
                    <Text
                      style={[
                        styles.paperMeta,
                        { color: theme.colors.onSurfaceVariant },
                      ]}
                      numberOfLines={1}
                    >
                      {selectedPaper.question_count || 0} questions •{" "}
                      {selectedPaper.total_pages || 1} page
                      {(selectedPaper.total_pages || 1) > 1 ? "s" : ""}
                    </Text>
                  </View>
                  <View style={styles.instructionBanner}>
                    <Ionicons
                      name="information-circle"
                      size={14}
                      color="#6366F1"
                    />
                    <Text style={styles.instructionText} numberOfLines={2}>
                      {
                        getQuestionTypeInfo(
                          selectedPaper.question_type || "traditional"
                        ).instruction
                      }
                    </Text>
                  </View>
                </View>
                <TouchableOpacity
                  onPress={() => setSelectedPaper(null)}
                  style={styles.changePaperBtn}
                  disabled={submitting}
                >
                  <Ionicons name="swap-horizontal" size={16} color="#6366F1" />
                </TouchableOpacity>
              </View>
            ) : (
              <View style={styles.papersList}>
                {papers.map((paper) => (
                  <TouchableOpacity
                    key={paper.id}
                    style={[
                      styles.paperItem,
                      { backgroundColor: isDarkMode ? "#1F2937" : "#F8FAFC" },
                    ]}
                    onPress={() => {
                      setSelectedPaper(paper);
                      if (currentStep < 3) setCurrentStep(3);
                    }}
                    disabled={submitting}
                  >
                    <View style={styles.paperItemContent}>
                      <Text
                        style={[
                          styles.paperName,
                          { color: theme.colors.onSurface },
                        ]}
                        numberOfLines={1}
                      >
                        {paper.name}
                      </Text>
                      <Text
                        style={[
                          styles.paperDetails,
                          { color: theme.colors.onSurfaceVariant },
                        ]}
                        numberOfLines={1}
                      >
                        {paper.question_count || 0} questions •{" "}
                        {formatDate(paper.uploaded_at).split(",")[0]}
                      </Text>
                    </View>
                    <Ionicons
                      name="chevron-forward"
                      size={20}
                      color="#6366F1"
                    />
                  </TouchableOpacity>
                ))}
              </View>
            )}
          </View>
        )}

        {/* Step 3: Upload Answer Sheets */}
        {currentStep >= 3 && (
          <View
            style={[styles.stepCard, { backgroundColor: theme.colors.surface }]}
          >
            <View style={styles.stepHeader}>
              <View
                style={[
                  styles.stepIcon,
                  {
                    backgroundColor:
                      getStepStatus(3) === "completed" ? "#10B981" : "#6366F1",
                  },
                ]}
              >
                <Ionicons name="camera" size={20} color="white" />
              </View>
              <Text
                style={[
                  styles.stepCardTitle,
                  { color: theme.colors.onSurface },
                ]}
              >
                Upload Answer Sheet
                {selectedPaper && selectedPaper.total_pages > 1 ? "s" : ""}
              </Text>
            </View>

            {selectedPaper && selectedPaper.total_pages > 1 ? (
              // Multi-page interface with page-by-page upload
              <View style={styles.multiPageInterface}>
                {/* Page Progress Indicator */}
                <View style={styles.pageProgress}>
                  <ScrollView horizontal showsHorizontalScrollIndicator={false}>
                    {Array.from({ length: selectedPaper.total_pages }, (_, index) => {
                      const pageNum = index + 1;
                      const isUploaded = isPageUploaded(pageNum);
                      const isCurrent = pageNum === currentPage;
                      
                      return (
                        <TouchableOpacity
                          key={pageNum}
                          style={[
                            styles.pageIndicator,
                            {
                              backgroundColor: isUploaded 
                                ? '#10B981' 
                                : isCurrent 
                                ? '#6366F1' 
                                : isDarkMode ? '#374151' : '#E5E7EB',
                              borderWidth: isCurrent ? 2 : 0,
                              borderColor: isCurrent ? '#8B5CF6' : 'transparent',
                            }
                          ]}
                          onPress={() => goToSpecificPage(pageNum)}
                          disabled={submitting}
                        >
                          {isUploaded ? (
                            <Ionicons name="checkmark" size={16} color="white" />
                          ) : (
                            <Text
                              style={[
                                styles.pageNumber,
                                { 
                                  color: isCurrent 
                                    ? 'white' 
                                    : isDarkMode ? '#9CA3AF' : '#6B7280'
                                }
                              ]}
                            >
                              {pageNum}
                            </Text>
                          )}
                        </TouchableOpacity>
                      );
                    })}
                  </ScrollView>
                </View>

                {/* Current Page Upload */}
                <View style={styles.currentPageSection}>
                  <Text style={[styles.currentPageTitle, { color: theme.colors.onSurface }]}>
                    Page {currentPage} of {selectedPaper.total_pages}
                  </Text>
                  
                  {pageImages[currentPage] ? (
                    <View style={styles.uploadedPagePreview}>
                      <Image
                        source={{ uri: pageImages[currentPage].uri }}
                        style={styles.uploadedPageImage}
                      />
                      <View style={styles.uploadedPageActions}>
                        <TouchableOpacity
                          onPress={showImagePicker}
                          style={styles.replaceImageBtn}
                          disabled={submitting}
                        >
                          <Ionicons name="refresh" size={16} color="#6366F1" />
                          <Text style={styles.replaceImageText}>Replace Page {currentPage}</Text>
                        </TouchableOpacity>
                      </View>
                    </View>
                  ) : (
                    <TouchableOpacity
                      style={[
                        styles.pageUploadArea,
                        { borderColor: isDarkMode ? '#374151' : '#E5E7EB' },
                      ]}
                      onPress={showImagePicker}
                      disabled={submitting}
                    >
                      <Ionicons name="camera-outline" size={40} color="#6366F1" />
                      <Text
                        style={[
                          styles.pageUploadTitle,
                          { color: theme.colors.onSurface },
                        ]}
                      >
                        Upload Page {currentPage}
                      </Text>
                      <Text
                        style={[
                          styles.pageUploadSubtitle,
                          { color: theme.colors.onSurfaceVariant },
                        ]}
                      >
                        Take a photo or select from gallery
                      </Text>
                    </TouchableOpacity>
                  )}

                  {/* Page Navigation */}
                  <View style={styles.pageNavigation}>
                    <TouchableOpacity
                      style={[
                        styles.navButton,
                        styles.prevButton,
                        {
                          backgroundColor: currentPage > 1 ? '#6366F1' : isDarkMode ? '#374151' : '#E5E7EB',
                        }
                      ]}
                      onPress={goToPreviousPage}
                      disabled={currentPage <= 1 || submitting}
                    >
                      <Ionicons 
                        name="chevron-back" 
                        size={20} 
                        color={currentPage > 1 ? 'white' : isDarkMode ? '#9CA3AF' : '#6B7280'} 
                      />
                      <Text
                        style={[
                          styles.navButtonText,
                          { 
                            color: currentPage > 1 ? 'white' : isDarkMode ? '#9CA3AF' : '#6B7280'
                          }
                        ]}
                      >
                        Previous
                      </Text>
                    </TouchableOpacity>

                    <TouchableOpacity
                      style={[
                        styles.navButton,
                        styles.nextButton,
                        {
                          backgroundColor: currentPage < selectedPaper.total_pages ? '#6366F1' : isDarkMode ? '#374151' : '#E5E7EB',
                        }
                      ]}
                      onPress={goToNextPage}
                      disabled={currentPage >= selectedPaper.total_pages || submitting}
                    >
                      <Text
                        style={[
                          styles.navButtonText,
                          { 
                            color: currentPage < selectedPaper.total_pages ? 'white' : isDarkMode ? '#9CA3AF' : '#6B7280'
                          }
                        ]}
                      >
                        Next
                      </Text>
                      <Ionicons 
                        name="chevron-forward" 
                        size={20} 
                        color={currentPage < selectedPaper.total_pages ? 'white' : isDarkMode ? '#9CA3AF' : '#6B7280'} 
                      />
                    </TouchableOpacity>
                  </View>
                  
                  {/* Upload Progress Summary */}
                  <View style={styles.uploadSummary}>
                    <View style={styles.summaryRow}>
                      <Text style={[styles.summaryLabel, { color: theme.colors.onSurfaceVariant }]}>
                        Progress:
                      </Text>
                      <Text style={[styles.summaryValue, { color: theme.colors.onSurface }]}>
                        {getAllUploadedPages().uploadedCount} of {selectedPaper.total_pages} pages uploaded
                      </Text>
                    </View>
                    {getAllUploadedPages().isComplete && (
                      <View style={styles.completeBanner}>
                        <Ionicons name="checkmark-circle" size={16} color="#10B981" />
                        <Text style={styles.completeText}>All pages uploaded! Ready to submit.</Text>
                      </View>
                    )}
                  </View>
                </View>
              </View>
            ) : selectedImages.length > 0 ? (
              // Single page interface (original)
              <View style={styles.imagesPreview}>
                <ScrollView horizontal showsHorizontalScrollIndicator={false}>
                  {selectedImages.map((image, index) => (
                    <View key={index} style={styles.imagePreview}>
                      <Image
                        source={{ uri: image.uri }}
                        style={styles.previewImage}
                      />
                      <Text
                        style={[
                          styles.pageLabel,
                          { color: theme.colors.onSurfaceVariant },
                        ]}
                      >
                        Page {index + 1}
                      </Text>
                    </View>
                  ))}
                </ScrollView>
                <TouchableOpacity
                  onPress={showImagePicker}
                  style={styles.changeImagesBtn}
                  disabled={submitting}
                >
                  <Ionicons name="refresh" size={16} color="#6366F1" />
                  <Text style={styles.changeImagesText}>Change Images</Text>
                </TouchableOpacity>
              </View>
            ) : (
              <TouchableOpacity
                style={[
                  styles.uploadArea,
                  { borderColor: isDarkMode ? "#374151" : "#E5E7EB" },
                ]}
                onPress={showImagePicker}
                disabled={submitting}
              >
                <Ionicons name="cloud-upload" size={48} color="#6366F1" />
                <Text
                  style={[
                    styles.uploadTitle,
                    { color: theme.colors.onSurface },
                  ]}
                >
                  Upload Answer Sheet
                  {(selectedPaper?.total_pages || 1) > 1 ? "s" : ""}
                </Text>
                <Text
                  style={[
                    styles.uploadSubtitle,
                    { color: theme.colors.onSurfaceVariant },
                  ]}
                >
                  {(selectedPaper?.total_pages || 1) > 1
                    ? `Select ${
                        selectedPaper?.total_pages || 1
                      } images for each page`
                    : "Take a photo or select from gallery"}
                </Text>
              </TouchableOpacity>
            )}
          </View>
        )}

        {/* Step 4: Submit */}
        {currentStep >= 4 && (
          <View
            style={[styles.stepCard, { backgroundColor: theme.colors.surface }]}
          >
            <View style={styles.stepHeader}>
              <View style={[styles.stepIcon, { backgroundColor: "#6366F1" }]}>
                <Ionicons name="checkmark-circle" size={20} color="white" />
              </View>
              <Text
                style={[
                  styles.stepCardTitle,
                  { color: theme.colors.onSurface },
                ]}
              >
                Review & Submit
              </Text>
            </View>

            <View style={styles.reviewSection}>
              <View style={styles.reviewItem}>
                <Text
                  style={[
                    styles.reviewLabel,
                    { color: theme.colors.onSurfaceVariant },
                  ]}
                >
                  Student
                </Text>
                <Text
                  style={[
                    styles.reviewValue,
                    { color: theme.colors.onSurface },
                  ]}
                >
                  {studentName}
                </Text>
              </View>
              <View style={styles.reviewItem}>
                <Text
                  style={[
                    styles.reviewLabel,
                    { color: theme.colors.onSurfaceVariant },
                  ]}
                >
                  Roll Number
                </Text>
                <Text
                  style={[
                    styles.reviewValue,
                    { color: theme.colors.onSurface },
                  ]}
                >
                  {rollNumber}
                </Text>
              </View>
              <View style={styles.reviewItem}>
                <Text
                  style={[
                    styles.reviewLabel,
                    { color: theme.colors.onSurfaceVariant },
                  ]}
                >
                  Paper
                </Text>
                <Text
                  style={[
                    styles.reviewValue,
                    { color: theme.colors.onSurface },
                  ]}
                >
                  {selectedPaper?.name}
                </Text>
              </View>
              <View style={styles.reviewItem}>
                <Text
                  style={[
                    styles.reviewLabel,
                    { color: theme.colors.onSurfaceVariant },
                  ]}
                >
                  Images
                </Text>
                <Text
                  style={[
                    styles.reviewValue,
                    { color: theme.colors.onSurface },
                  ]}
                >
                  {selectedImages.length} image
                  {selectedImages.length > 1 ? "s" : ""} uploaded
                </Text>
              </View>
            </View>

            <LinearGradient
              colors={
                !canSubmit() ? ["#9CA3AF", "#6B7280"] : ["#6366F1", "#8B5CF6"]
              }
              style={[
                styles.submitButton,
                !canSubmit() && styles.submitButtonDisabled,
              ]}
            >
              <TouchableOpacity
                onPress={submitAnswers}
                style={styles.submitButtonContent}
                disabled={!canSubmit()}
              >
                {submitting ? (
                  <>
                    <ActivityIndicator size="small" color="white" />
                    <Text style={styles.submitText}>Processing...</Text>
                  </>
                ) : (
                  <>
                    <Ionicons
                      name="send"
                      size={20}
                      color={!canSubmit() ? "#D1D5DB" : "white"}
                    />
                    <Text
                      style={[
                        styles.submitText,
                        !canSubmit() && styles.submitTextDisabled,
                      ]}
                    >
                      Submit Answer Sheet
                    </Text>
                  </>
                )}
              </TouchableOpacity>
            </LinearGradient>
          </View>
        )}

        <View style={styles.bottomSpacing} />
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  loadingGradient: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
    padding: 20,
  },
  loadingText: {
    color: "white",
    marginTop: 16,
    fontSize: 16,
    fontWeight: "500",
  },
  header: {
    paddingTop: 20,
    paddingBottom: 30,
    paddingHorizontal: 20,
  },
  headerContent: {
    flexDirection: "row",
    alignItems: "center",
  },
  backButton: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: "rgba(255,255,255,0.2)",
    justifyContent: "center",
    alignItems: "center",
    marginRight: 16,
  },
  headerTextContainer: {
    flex: 1,
  },
  headerTitle: {
    fontSize: 24,
    fontWeight: "bold",
    color: "white",
    marginBottom: 4,
  },
  headerSubtitle: {
    fontSize: 16,
    color: "rgba(255,255,255,0.8)",
  },
  progressContainer: {
    paddingVertical: 20,
    elevation: 2,
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
  },
  progressScroll: {
    paddingHorizontal: 20,
  },
  stepContainer: {
    alignItems: "center",
    marginRight: 24,
    minWidth: 80,
  },
  stepIndicator: {
    width: 32,
    height: 32,
    borderRadius: 16,
    justifyContent: "center",
    alignItems: "center",
    marginBottom: 8,
  },
  stepNumber: {
    fontSize: 14,
    fontWeight: "bold",
  },
  stepTitle: {
    fontSize: 12,
    fontWeight: "500",
    textAlign: "center",
  },
  content: {
    flex: 1,
    padding: 20,
  },
  stepCard: {
    borderRadius: 16,
    padding: 20,
    marginBottom: 20,
    elevation: 3,
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 8,
  },
  stepHeader: {
    flexDirection: "row",
    alignItems: "center",
    marginBottom: 16,
  },
  stepIcon: {
    width: 40,
    height: 40,
    borderRadius: 20,
    justifyContent: "center",
    alignItems: "center",
    marginRight: 12,
  },
  stepCardTitle: {
    fontSize: 18,
    fontWeight: "600",
    flex: 1,
  },
  textInput: {
    marginTop: 8,
  },
  emptyState: {
    alignItems: "center",
    padding: 40,
  },
  emptyText: {
    fontSize: 16,
    marginTop: 12,
    textAlign: "center",
  },
  selectedPaper: {
    borderRadius: 12,
    padding: 16,
    marginTop: 12,
    flexDirection: "row",
    alignItems: "center",
    borderWidth: 1,
    borderColor: "#6366F1",
  },
  selectedPaperContent: {
    flex: 1,
  },
  selectedPaperName: {
    fontSize: 16,
    fontWeight: "600",
    marginBottom: 8,
  },
  selectedPaperInfo: {
    marginBottom: 12,
  },
  metaRow: {
    marginBottom: 6,
  },
  typeChip: {
    alignSelf: "flex-start",
  },
  paperMeta: {
    fontSize: 13,
    marginTop: 4,
  },
  instructionBanner: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: "rgba(99, 102, 241, 0.1)",
    padding: 12,
    borderRadius: 8,
  },
  instructionText: {
    fontSize: 12,
    color: "#6366F1",
    marginLeft: 6,
    flex: 1,
    lineHeight: 16,
  },
  changePaperBtn: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    paddingVertical: 12,
    paddingHorizontal: 8,
    borderRadius: 8,
  },
  papersList: {
    marginTop: 12,
  },
  paperItem: {
    flexDirection: "row",
    alignItems: "center",
    padding: 16,
    borderRadius: 12,
    marginBottom: 12,
  },
  paperItemContent: {
    flex: 1,
  },
  paperName: {
    fontSize: 16,
    fontWeight: "600",
    marginBottom: 4,
  },
  paperDetails: {
    fontSize: 14,
  },
  uploadArea: {
    borderWidth: 2,
    borderStyle: "dashed",
    borderRadius: 12,
    padding: 40,
    alignItems: "center",
    marginTop: 12,
  },
  uploadTitle: {
    fontSize: 18,
    fontWeight: "600",
    marginTop: 12,
    marginBottom: 8,
  },
  uploadSubtitle: {
    fontSize: 14,
    textAlign: "center",
  },
  imagesPreview: {
    marginTop: 12,
  },
  imagePreview: {
    alignItems: "center",
    marginRight: 16,
    width: 100,
  },
  previewImage: {
    width: 100,
    height: 130,
    borderRadius: 8,
    marginBottom: 8,
  },
  pageLabel: {
    fontSize: 12,
    fontWeight: "500",
  },
  changeImagesBtn: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    marginTop: 16,
    paddingVertical: 12,
    paddingHorizontal: 16,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: "#6366F1",
  },
  changeImagesText: {
    color: "#6366F1",
    marginLeft: 8,
    fontWeight: "500",
  },
  reviewSection: {
    marginTop: 12,
    marginBottom: 24,
  },
  reviewItem: {
    flexDirection: "row",
    justifyContent: "space-between",
    paddingVertical: 12,
    borderBottomWidth: 1,
    borderBottomColor: "rgba(0,0,0,0.1)",
  },
  reviewLabel: {
    fontSize: 14,
    fontWeight: "500",
  },
  reviewValue: {
    fontSize: 14,
    fontWeight: "600",
    flex: 1,
    textAlign: "right",
  },
  submitButton: {
    borderRadius: 12,
    elevation: 4,
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 8,
  },
  submitButtonDisabled: {
    elevation: 1,
    shadowOpacity: 0.1,
    opacity: 0.7,
  },
  submitButtonContent: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    paddingVertical: 16,
    paddingHorizontal: 24,
  },
  submitText: {
    color: "white",
    fontSize: 16,
    fontWeight: "600",
    marginLeft: 8,
  },
  submitTextDisabled: {
    color: "#D1D5DB",
  },
  bottomSpacing: {
    height: 40,
  },
  // Multi-page upload styles
  multiPageInterface: {
    marginTop: 16,
  },
  pageProgress: {
    marginBottom: 20,
    paddingHorizontal: 4,
  },
  pageIndicator: {
    width: 36,
    height: 36,
    borderRadius: 18,
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 12,
  },
  pageNumber: {
    fontSize: 14,
    fontWeight: '600',
  },
  currentPageSection: {
    alignItems: 'center',
  },
  currentPageTitle: {
    fontSize: 18,
    fontWeight: '600',
    marginBottom: 16,
  },
  uploadedPagePreview: {
    alignItems: 'center',
    marginBottom: 20,
  },
  uploadedPageImage: {
    width: 120,
    height: 160,
    borderRadius: 12,
    backgroundColor: '#f5f5f5',
    marginBottom: 12,
  },
  uploadedPageActions: {
    alignItems: 'center',
  },
  replaceImageBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 8,
    paddingHorizontal: 16,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: '#6366F1',
  },
  replaceImageText: {
    color: '#6366F1',
    marginLeft: 6,
    fontSize: 14,
    fontWeight: '500',
  },
  pageUploadArea: {
    borderWidth: 2,
    borderStyle: 'dashed',
    borderRadius: 16,
    paddingVertical: 40,
    paddingHorizontal: 20,
    alignItems: 'center',
    marginBottom: 20,
    minHeight: 200,
    justifyContent: 'center',
  },
  pageUploadTitle: {
    fontSize: 16,
    fontWeight: '600',
    marginTop: 12,
    marginBottom: 6,
  },
  pageUploadSubtitle: {
    fontSize: 14,
    textAlign: 'center',
  },
  pageNavigation: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    width: '100%',
    marginBottom: 20,
  },
  navButton: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 12,
    paddingHorizontal: 20,
    borderRadius: 12,
    minWidth: 100,
    justifyContent: 'center',
  },
  prevButton: {
    marginRight: 8,
  },
  nextButton: {
    marginLeft: 8,
  },
  navButtonText: {
    fontSize: 14,
    fontWeight: '600',
    marginHorizontal: 4,
  },
  uploadSummary: {
    width: '100%',
    padding: 16,
    backgroundColor: 'rgba(99, 102, 241, 0.05)',
    borderRadius: 12,
    borderWidth: 1,
    borderColor: 'rgba(99, 102, 241, 0.2)',
  },
  summaryRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 8,
  },
  summaryLabel: {
    fontSize: 14,
    fontWeight: '500',
  },
  summaryValue: {
    fontSize: 14,
    fontWeight: '600',
  },
  completeBanner: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: 'rgba(16, 185, 129, 0.1)',
    paddingVertical: 8,
    paddingHorizontal: 12,
    borderRadius: 8,
    marginTop: 4,
  },
  completeText: {
    color: '#10B981',
    fontSize: 13,
    fontWeight: '600',
    marginLeft: 6,
  },
});
