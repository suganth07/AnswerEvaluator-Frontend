import React, { useState, useEffect } from 'react';
import {
  View,
  StyleSheet,
  Alert,
  ScrollView,
  Image,
  TouchableOpacity,
  Dimensions,
  Text,
  RefreshControl,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { StatusBar } from 'expo-status-bar';
import { TextInput, Button, ActivityIndicator, Chip } from 'react-native-paper';
import { LinearGradient } from 'expo-linear-gradient';
import { Ionicons } from '@expo/vector-icons';
import * as ImagePicker from 'expo-image-picker';
import { useTheme } from '../context/ThemeContext';
import { router } from 'expo-router';

const { width } = Dimensions.get('window');
const API_BASE_URL = process.env.EXPO_PUBLIC_API_URL;


interface Paper {
  id: number;
  name: string;
  question_count: number;
  uploaded_at: string;
  total_pages?: number;
  question_type?: string;
}

interface ImageInfo {
  uri: string;
  width: number;
  height: number;
}

export default function StudentSubmissionScreen() {
  const { theme, isDarkMode } = useTheme();
  const [studentName, setStudentName] = useState('');
  const [rollNo, setRollNo] = useState('');
  const [selectedPaper, setSelectedPaper] = useState<Paper | null>(null);
  const [selectedImages, setSelectedImages] = useState<ImageInfo[]>([]);
  const [submitting, setSubmitting] = useState(false);
  const [loading, setLoading] = useState(true);
  const [papers, setPapers] = useState<Paper[]>([]);
  const [refreshing, setRefreshing] = useState(false);
  const [currentStep, setCurrentStep] = useState(1);
  const [currentPage, setCurrentPage] = useState(1); // Track current page being uploaded
  const [pageImages, setPageImages] = useState<{[key: number]: ImageInfo}>({}); // Store images by page number

  useEffect(() => {
    loadPapers();
  }, []);

  useEffect(() => {
    setSelectedImages([]);
    setPageImages({});
    setCurrentPage(1);
  }, [selectedPaper]);

  const loadPapers = async () => {
    try {
      const response = await fetch(`${API_BASE_URL}/api/papers/public`);
      const data = await response.json();
      setPapers(data);
    } catch (error) {
      console.log('Error loading papers:', error);
      Alert.alert('Error', 'Failed to load papers');
    } finally {
      setLoading(false);
    }
  };

  const onRefresh = async () => {
    setRefreshing(true);
    await loadPapers();
    setRefreshing(false);
  };

  const getQuestionTypeInfo = (questionType: string) => {
    switch (questionType) {
      case 'omr':
        return {
          label: 'OMR (Fill Circles)',
          color: '#6366F1',
          icon: 'radio-button-off',
          instruction: 'Fill the circles completely for your chosen answers',
        };
      case 'traditional':
        return {
          label: 'Traditional (Mark with ✓)',
          color: '#10B981',
          icon: 'checkmark-circle-outline',
          instruction: 'Mark your chosen answers with ✓ or clear marks',
        };
      case 'mixed':
        return {
          label: 'Mixed (OMR + Traditional)',
          color: '#F59E0B',
          icon: 'list-outline',
          instruction: 'Follow the specific format for each question type',
        };
      case 'fill_blanks':
        return {
          label: 'Fill in the Blanks',
          color: '#8B5CF6',
          icon: 'create-outline',
          instruction: 'Write your answers clearly in the blank spaces provided',
        };
      default:
        return {
          label: 'Traditional (Mark with ✓)',
          color: '#10B981',
          icon: 'checkmark-circle-outline',
          instruction: 'Mark your chosen answers with ✓ or clear marks',
        };
    }
  };

  const selectImages = async () => {
    const { status } = await ImagePicker.requestMediaLibraryPermissionsAsync();
    if (status !== 'granted') {
      Alert.alert('Permission needed', 'Sorry, we need camera roll permissions to make this work!');
      return;
    }

    const isMultiPage = selectedPaper && (selectedPaper.total_pages || 1) > 1;

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
        newPageImages[currentPage] = result.assets[0] as ImageInfo;
        setPageImages(newPageImages);
        
        // Update selectedImages array for backward compatibility
        const imagesArray = [];
        for (let i = 1; i <= (selectedPaper.total_pages || 1); i++) {
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
        setSelectedImages([result.assets[0] as ImageInfo]);
        if (currentStep < 4) setCurrentStep(4);
      }
    }
  };

  const takePhoto = async () => {
    const { status } = await ImagePicker.requestCameraPermissionsAsync();
    if (status !== 'granted') {
      Alert.alert('Permission needed', 'Sorry, we need camera permissions to make this work!');
      return;
    }

    const result = await ImagePicker.launchCameraAsync({
      allowsEditing: true,
      aspect: [3, 4],
      quality: 0.8,
    });

    if (!result.canceled && result.assets[0]) {
      const isMultiPage = selectedPaper && (selectedPaper.total_pages || 1) > 1;

      if (isMultiPage) {
        // For multi-page, store image for current page
        const newPageImages = { ...pageImages };
        newPageImages[currentPage] = result.assets[0] as ImageInfo;
        setPageImages(newPageImages);
        
        // Update selectedImages array for backward compatibility
        const imagesArray = [];
        for (let i = 1; i <= (selectedPaper.total_pages || 1); i++) {
          if (newPageImages[i]) {
            imagesArray.push(newPageImages[i]);
          }
        }
        setSelectedImages(imagesArray);
      } else {
        // For single-page, replace existing image
        setSelectedImages([result.assets[0] as ImageInfo]);
      }
      if (currentStep < 4) setCurrentStep(4);
    }
  };

  const showImagePicker = () => {
    const isMultiPage = selectedPaper && (selectedPaper.total_pages || 1) > 1;
    const maxPages = selectedPaper?.total_pages || 1;

    Alert.alert(
      'Select Answer Sheet',
      isMultiPage 
        ? `Upload Page ${currentPage} of ${maxPages} for this question paper.`
        : 'Choose how you want to select your answer sheet',
      [
        { text: 'Take Photo', onPress: takePhoto },
        { text: 'Gallery', onPress: selectImages },
        { text: 'Cancel', style: 'cancel' },
      ]
    );
  };

  const goToNextPage = () => {
    const maxPages = selectedPaper?.total_pages || 1;
    if (currentPage < maxPages) {
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
      Alert.alert('Error', 'Please enter your name');
      return;
    }

    if (!rollNo.trim()) {
      Alert.alert('Error', 'Please enter your roll number');
      return;
    }

    if (!selectedPaper) {
      Alert.alert('Error', 'Please select a paper');
      return;
    }

    if (selectedImages.length === 0) {
      Alert.alert('Error', 'Please select your answer sheet image(s)');
      return;
    }

    const isMultiPage = (selectedPaper?.total_pages || 1) > 1;
    if (isMultiPage) {
      const { uploadedCount, maxPages, isComplete } = getAllUploadedPages();
      if (!isComplete) {
        Alert.alert(
          'Incomplete Upload',
          `This question paper has ${maxPages} pages, but you have only uploaded ${uploadedCount} page(s). Please upload all ${maxPages} pages before submitting.`,
          [{ text: 'OK' }]
        );
        return;
      }
    }

    setSubmitting(true);
    try {
      const formData = new FormData();
      formData.append('studentName', studentName.trim());
      formData.append('rollNo', rollNo.trim());
      formData.append('paperId', selectedPaper.id.toString());

      if (isMultiPage) {
        // Use pageImages to maintain correct page order
        for (let pageNum = 1; pageNum <= (selectedPaper?.total_pages || 1); pageNum++) {
          const pageImage = pageImages[pageNum];
          if (pageImage) {
            const imageFile = {
              uri: pageImage.uri,
              type: 'image/jpeg',
              name: `answer-sheet-page-${pageNum}.jpg`,
            } as any;

            formData.append('answerSheets', imageFile);
          }
        }
      } else {
        const imageFile = {
          uri: selectedImages[0].uri,
          type: 'image/jpeg',
          name: 'answer-sheet.jpg',
        } as any;

        formData.append('answerSheet', imageFile);
      }

      const response = await fetch(`${API_BASE_URL}/api/submissions/submit`, {
        method: 'POST',
        body: formData,
        headers: {
          'Content-Type': 'multipart/form-data',
        },
      });

      const result = await response.json();

      if (response.ok) {
        Alert.alert(
          'Submission Complete!',
          `Your answer sheet has been submitted successfully and is pending evaluation!\n\nStudent: ${result.studentName}\nRoll Number: ${rollNo}\nPaper: ${result.paperName}\n\nStatus: Pending Evaluation\n\nYour submission will be evaluated by the admin. The system will verify your roll number matches the question paper before processing.`,
          [
            {
              text: 'Submit Another',
              onPress: () => {
                setStudentName('');
                setRollNo('');
                setSelectedPaper(null);
                setSelectedImages([]);
                setPageImages({});
                setCurrentPage(1);
                setCurrentStep(1);
              },
            },
            {
              text: 'Done',
              onPress: () => {
                router.back();
              },
            },
          ]
        );
      } else {
        throw new Error(result.error || 'Submission failed');
      }
    } catch (error: any) {
      Alert.alert('Submission Failed', error.message || 'Failed to submit answers');
    } finally {
      setSubmitting(false);
    }
  };

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'short',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
    });
  };

  const getStepStatus = (step: number) => {
    if (step === 1) return studentName.trim() && rollNo.trim() ? 'completed' : 'current';
    if (step === 2) {
      return selectedPaper
        ? 'completed'
        : currentStep >= 2
        ? 'current'
        : 'pending';
    }
    if (step === 3) {
      return selectedImages.length > 0
        ? 'completed'
        : currentStep >= 3
        ? 'current'
        : 'pending';
    }
    if (step === 4) {
      return currentStep >= 4 ? 'current' : 'pending';
    }
    return 'pending';
  };

  const canSubmit = () => {
    return (
      studentName.trim() &&
      rollNo.trim() &&
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
        case 'completed':
          return '#10B981';
        case 'current':
          return '#6366F1';
        default:
          return isDarkMode ? '#374151' : '#E5E7EB';
      }
    };

    return (
      <View style={styles.stepContainer}>
        <View
          style={[styles.stepIndicator, { backgroundColor: getStatusColor() }]}
        >
          {status === 'completed' ? (
            <Ionicons name="checkmark" size={16} color="white" />
          ) : (
            <Text
              style={[
                styles.stepNumber,
                {
                  color:
                    status === 'current'
                      ? 'white'
                      : isDarkMode
                      ? '#9CA3AF'
                      : '#6B7280',
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

  if (loading) {
    return (
      <View
        style={[styles.container, { backgroundColor: theme.colors.background }]}
      >
        <StatusBar
          style="light"
          backgroundColor={isDarkMode ? '#1F2937' : '#6366F1'}
        />
        <LinearGradient
          colors={isDarkMode ? ['#1F2937', '#111827'] : ['#6366F1', '#8B5CF6']}
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
        backgroundColor={isDarkMode ? '#1F2937' : '#6366F1'}
      />
      {/* Header */}
      <LinearGradient
        colors={isDarkMode ? ['#1F2937', '#111827'] : ['#6366F1', '#8B5CF6']}
        style={styles.header}
      >
        <SafeAreaView edges={['top']}>
          <View style={styles.headerContent}>
            <TouchableOpacity
              onPress={() => router.back()}
              style={styles.backButton}
            >
              <Ionicons name="arrow-back" size={24} color="white" />
            </TouchableOpacity>
            <View style={styles.headerTextContainer}>
              <Text style={styles.headerTitle}>Answer Sheet Submission</Text>
              
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
            title="Enter Details"
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

      <ScrollView 
        style={styles.content} 
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
        {/* Step 1: Student Details */}
        <View
          style={[styles.stepCard, { backgroundColor: theme.colors.surface }]}
        >
          <View style={styles.stepHeader}>
            <View
              style={[
                styles.stepIcon,
                {
                  backgroundColor:
                    getStepStatus(1) === 'completed' ? '#10B981' : '#6366F1',
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
              if (text.trim() && rollNo.trim() && currentStep < 2) {
                setCurrentStep(2);
              }
            }}
            style={styles.textInput}
            mode="outlined"
            placeholder="e.g., John Smith"
            disabled={submitting}
            theme={{ colors: { primary: '#6366F1' } }}
          />
          
          <TextInput
            label="Roll Number"
            value={rollNo}
            onChangeText={(text) => {
              setRollNo(text);
              if (text.trim() && studentName.trim() && currentStep < 2) {
                setCurrentStep(2);
              }
            }}
            style={styles.textInput}
            mode="outlined"
            placeholder="e.g., 2021001"
            disabled={submitting}
            theme={{ colors: { primary: '#6366F1' } }}
          />
          
          <View style={styles.infoNote}>
            <Ionicons name="information-circle" size={16} color="#6366F1" />
            <Text style={[styles.infoText, { color: theme.colors.onSurfaceVariant }]}>
              Your roll number will be verified against the question paper during evaluation
            </Text>
          </View>
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
                      getStepStatus(2) === 'completed' ? '#10B981' : '#6366F1',
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
                  color={isDarkMode ? '#6B7280' : '#9CA3AF'}
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
                  { backgroundColor: isDarkMode ? '#1F2937' : '#F8FAFC' },
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
                            selectedPaper.question_type || 'traditional'
                          ).color,
                          fontSize: 10,
                        }}
                        style={[
                          styles.typeChip,
                          {
                            borderColor: getQuestionTypeInfo(
                              selectedPaper.question_type || 'traditional'
                            ).color,
                          },
                        ]}
                      >
                        {
                          getQuestionTypeInfo(
                            selectedPaper.question_type || 'traditional'
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
                      {selectedPaper.question_count || 0} questions •{' '}
                      {selectedPaper.total_pages || 1} page
                      {(selectedPaper.total_pages || 1) > 1 ? 's' : ''}
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
                          selectedPaper.question_type || 'traditional'
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
                      { backgroundColor: isDarkMode ? '#1F2937' : '#F8FAFC' },
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
                        {paper.question_count || 0} questions •{' '}
                        {formatDate(paper.uploaded_at).split(',')[0]}
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
                      getStepStatus(3) === 'completed' ? '#10B981' : '#6366F1',
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
                {selectedPaper && (selectedPaper.total_pages || 1) > 1 ? 's' : ''}
              </Text>
            </View>

            {selectedPaper && (selectedPaper.total_pages || 1) > 1 ? (
              // Multi-page interface with page-by-page upload
              <View style={styles.multiPageInterface}>
                {/* Page Progress Indicator */}
                <View style={styles.pageProgress}>
                  <ScrollView horizontal showsHorizontalScrollIndicator={false}>
                    {Array.from({ length: selectedPaper.total_pages || 1 }, (_, index) => {
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
                          backgroundColor: currentPage < (selectedPaper.total_pages || 1) ? '#6366F1' : isDarkMode ? '#374151' : '#E5E7EB',
                        }
                      ]}
                      onPress={goToNextPage}
                      disabled={currentPage >= (selectedPaper.total_pages || 1) || submitting}
                    >
                      <Text
                        style={[
                          styles.navButtonText,
                          { 
                            color: currentPage < (selectedPaper.total_pages || 1) ? 'white' : isDarkMode ? '#9CA3AF' : '#6B7280'
                          }
                        ]}
                      >
                        Next
                      </Text>
                      <Ionicons 
                        name="chevron-forward" 
                        size={20} 
                        color={currentPage < (selectedPaper.total_pages || 1) ? 'white' : isDarkMode ? '#9CA3AF' : '#6B7280'} 
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
                  { borderColor: isDarkMode ? '#374151' : '#E5E7EB' },
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
                  {(selectedPaper?.total_pages || 1) > 1 ? 's' : ''}
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
                    : 'Take a photo or select from gallery'}
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
              <View style={[styles.stepIcon, { backgroundColor: '#6366F1' }]}>
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
                  {rollNo}
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
                  {selectedImages.length > 1 ? 's' : ''} uploaded
                </Text>
              </View>
            </View>

            <LinearGradient
              colors={
                !canSubmit() ? ['#9CA3AF', '#6B7280'] : ['#6366F1', '#8B5CF6']
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
                      color={!canSubmit() ? '#D1D5DB' : 'white'}
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
  header: {
    paddingHorizontal: 20,
    paddingVertical: 20,
    paddingTop: 60,
    paddingBottom: 30,
  },
  headerContent: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  backButton: {
    marginRight: 15,
    padding: 8,
  },
  headerTextContainer: {
    flex: 1,
  },
  headerTitle: {
    color: 'white',
    fontSize: 24,
    fontWeight: '700',
    marginBottom: 4,
  },
  headerSubtitle: {
    color: 'rgba(255, 255, 255, 0.8)',
    fontSize: 14,
  },
  loadingGradient: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    paddingHorizontal: 20,
  },
  loadingText: {
    color: 'white',
    fontSize: 16,
    marginTop: 16,
  },
  progressContainer: {
    paddingHorizontal: 20,
    paddingVertical: 15,
    borderBottomWidth: 1,
    borderBottomColor: 'rgba(0,0,0,0.1)',
  },
  progressScroll: {
    flexGrow: 0,
  },
  stepContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    marginRight: 30,
  },
  stepIndicator: {
    width: 32,
    height: 32,
    borderRadius: 16,
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 8,
  },
  stepNumber: {
    fontSize: 14,
    fontWeight: '600',
  },
  stepTitle: {
    fontSize: 12,
    fontWeight: '500',
    maxWidth: 80,
  },
  content: {
    flex: 1,
    paddingHorizontal: 20,
  },
  stepCard: {
    borderRadius: 16,
    padding: 20,
    marginVertical: 12,
    elevation: 2,
    shadowColor: '#000',
    shadowOffset: {
      width: 0,
      height: 2,
    },
    shadowOpacity: 0.1,
    shadowRadius: 3.84,
  },
  stepHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 16,
  },
  stepIcon: {
    width: 36,
    height: 36,
    borderRadius: 18,
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 12,
  },
  stepCardTitle: {
    fontSize: 18,
    fontWeight: '600',
    flex: 1,
  },
  textInput: {
    marginBottom: 8,
  },
  emptyState: {
    alignItems: 'center',
    paddingVertical: 32,
  },
  emptyText: {
    fontSize: 16,
    marginTop: 12,
    textAlign: 'center',
  },
  selectedPaper: {
    borderRadius: 12,
    padding: 16,
    borderWidth: 1,
    borderColor: '#10B981',
  },
  selectedPaperContent: {
    flex: 1,
  },
  selectedPaperName: {
    fontSize: 16,
    fontWeight: '600',
    marginBottom: 8,
  },
  selectedPaperInfo: {
    marginBottom: 12,
  },
  metaRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 6,
  },
  typeChip: {
    height: 24,
  },
  paperMeta: {
    fontSize: 13,
  },
  instructionBanner: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: 'rgba(99, 102, 241, 0.1)',
    padding: 10,
    borderRadius: 8,
    marginTop: 8,
  },
  instructionText: {
    fontSize: 12,
    color: '#6366F1',
    marginLeft: 6,
    flex: 1,
  },
  changePaperBtn: {
    padding: 8,
    marginLeft: 12,
  },
  papersList: {
    gap: 12,
  },
  paperItem: {
    borderRadius: 12,
    padding: 16,
    borderWidth: 1,
    borderColor: 'rgba(99, 102, 241, 0.2)',
  },
  paperItemContent: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  paperName: {
    fontSize: 16,
    fontWeight: '600',
    marginBottom: 4,
    flex: 1,
    marginRight: 12,
  },
  paperDetails: {
    fontSize: 13,
    flex: 1,
    marginRight: 12,
  },
  imagesPreview: {
    alignItems: 'center',
  },
  imagePreview: {
    marginRight: 16,
    alignItems: 'center',
  },
  previewImage: {
    width: 80,
    height: 100,
    borderRadius: 8,
    backgroundColor: '#f5f5f5',
  },
  pageLabel: {
    fontSize: 12,
    fontWeight: '500',
    marginBottom: 6,
  },
  changeImagesBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    marginTop: 16,
    padding: 8,
  },
  changeImagesText: {
    color: '#6366F1',
    marginLeft: 6,
    fontSize: 14,
    fontWeight: '500',
  },
  uploadArea: {
    alignItems: 'center',
    paddingVertical: 40,
    paddingHorizontal: 20,
    borderWidth: 2,
    borderStyle: 'dashed',
    borderRadius: 16,
  },
  uploadTitle: {
    fontSize: 18,
    fontWeight: '600',
    marginTop: 16,
    marginBottom: 8,
    textAlign: 'center',
  },
  uploadSubtitle: {
    fontSize: 14,
    textAlign: 'center',
    lineHeight: 20,
  },
  reviewSection: {
    gap: 12,
  },
  reviewItem: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: 8,
    borderBottomWidth: 1,
    borderBottomColor: 'rgba(0,0,0,0.1)',
  },
  reviewLabel: {
    fontSize: 14,
    fontWeight: '500',
  },
  reviewValue: {
    fontSize: 14,
    fontWeight: '600',
    flex: 1,
    textAlign: 'right',
    marginLeft: 16,
  },
  submitButton: {
    borderRadius: 16,
    marginTop: 20,
    elevation: 3,
    shadowColor: '#000',
    shadowOffset: {
      width: 0,
      height: 2,
    },
    shadowOpacity: 0.25,
    shadowRadius: 3.84,
  },
  submitButtonDisabled: {
    elevation: 0,
    shadowOpacity: 0,
  },
  submitButtonContent: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 16,
    paddingHorizontal: 24,
  },
  submitText: {
    color: 'white',
    fontSize: 16,
    fontWeight: '600',
    marginLeft: 8,
  },
  submitTextDisabled: {
    color: '#D1D5DB',
  },
  bottomSpacing: {
    height: 40,
  },
  infoNote: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: 'rgba(99, 102, 241, 0.1)',
    padding: 12,
    borderRadius: 8,
    marginTop: 8,
  },
  infoText: {
    fontSize: 12,
    marginLeft: 8,
    flex: 1,
    lineHeight: 16,
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
