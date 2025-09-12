import React, { useState, useEffect } from 'react';
import {
  View,
  StyleSheet,
  Alert,
  ScrollView,
  Image,
  FlatList,
} from 'react-native';
import {
  TextInput,
  Button,
  Card,
  Title,
  Paragraph,
  ActivityIndicator,
  List,                                     
  Divider,
  Chip,
  Appbar,
  IconButton,
} from 'react-native-paper';
import * as ImagePicker from 'expo-image-picker';
import { paperService, submissionService } from '../../services/api';
import { router } from 'expo-router';
import { useTheme } from '../../context/ThemeContext';

interface Paper {
  id: number;
  name: string;
  uploaded_at: string;
  question_count: number;
  total_pages: number;
  question_type: string;
}

export default function StudentSubmission() {
  const [studentName, setStudentName] = useState('');
  const [papers, setPapers] = useState<Paper[]>([]);
  const [selectedPaper, setSelectedPaper] = useState<Paper | null>(null);
  const [selectedImages, setSelectedImages] = useState<any[]>([]);
  const [submitting, setSubmitting] = useState(false);
  const [loadingPapers, setLoadingPapers] = useState(true);
  
  const { theme, isDarkMode, toggleTheme } = useTheme();

  useEffect(() => {
    loadPapers();
  }, []);

  // Reset images when paper selection changes
  useEffect(() => {
    setSelectedImages([]);
  }, [selectedPaper]);

  const getQuestionTypeInfo = (questionType: string) => {
    switch (questionType) {
      case 'omr':
        return { 
          label: 'OMR (Fill Circles)', 
          color: '#2196F3', 
          icon: 'circle-outline',
          instruction: 'Fill the circles completely for your chosen answers'
        };
      case 'traditional':
        return { 
          label: 'Traditional (Mark with ✓)', 
          color: '#4CAF50', 
          icon: 'text-box-outline',
          instruction: 'Mark your chosen answers with ✓ or clear marks'
        };
      case 'mixed':
        return { 
          label: 'Mixed (OMR + Traditional)', 
          color: '#FF9800', 
          icon: 'format-list-bulleted',
          instruction: 'Follow the specific format for each question type'
        };
      default:
        return { 
          label: 'Traditional (Mark with ✓)', 
          color: '#4CAF50', 
          icon: 'text-box-outline',
          instruction: 'Mark your chosen answers with ✓ or clear marks'
        };
    }
  };

  const loadPapers = async () => {
    try {
      const response = await paperService.getAll();
      setPapers(response);
    } catch (error) {
      Alert.alert('Error', 'Failed to load papers');
    } finally {
      setLoadingPapers(false);
    }
  };

  const selectImages = async () => {
    const { status } = await ImagePicker.requestMediaLibraryPermissionsAsync();
    if (status !== 'granted') {
      Alert.alert('Permission needed', 'Sorry, we need camera roll permissions to make this work!');
      return;
    }

    const isMultiPage = selectedPaper && selectedPaper.total_pages > 1;
    
    if (isMultiPage) {
      // For multi-page papers, allow multiple selection
      const result = await ImagePicker.launchImageLibraryAsync({
        mediaTypes: ImagePicker.MediaTypeOptions.Images,
        allowsMultipleSelection: true,
        selectionLimit: selectedPaper.total_pages,
        allowsEditing: false,
        quality: 0.8,
      });

      if (!result.canceled && result.assets) {
        setSelectedImages(result.assets);
      }
    } else {
      // For single-page papers, allow only one image
      const result = await ImagePicker.launchImageLibraryAsync({
        mediaTypes: ImagePicker.MediaTypeOptions.Images,
        allowsEditing: true,
        aspect: [3, 4],
        quality: 0.8,
      });

      if (!result.canceled && result.assets[0]) {
        setSelectedImages([result.assets[0]]);
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
      const isMultiPage = selectedPaper && selectedPaper.total_pages > 1;
      
      if (isMultiPage) {
        // For multi-page, add to existing images
        setSelectedImages(prev => [...prev, result.assets[0]]);
      } else {
        // For single-page, replace existing image
        setSelectedImages([result.assets[0]]);
      }
    }
  };

  const showImagePicker = () => {
    const isMultiPage = selectedPaper && selectedPaper.total_pages > 1;
    const maxPages = selectedPaper?.total_pages || 1;
    
    Alert.alert(
      'Select Answer Sheet',
      isMultiPage 
        ? `This question paper has ${maxPages} pages. You can select multiple images.`
        : 'Choose how you want to select your answer sheet',
      [
        { text: 'Take Photo', onPress: takePhoto },
        { text: isMultiPage ? 'Select Multiple' : 'Gallery', onPress: selectImages },
        { text: 'Cancel', style: 'cancel' },
      ]
    );
  };

  const submitAnswers = async () => {
    if (!studentName.trim()) {
      Alert.alert('Error', 'Please enter your name');
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

    // Validate page count for multi-page papers
    const isMultiPage = selectedPaper.total_pages > 1;
    if (isMultiPage && selectedImages.length !== selectedPaper.total_pages) {
      Alert.alert(
        'Page Count Mismatch',
        `This question paper has ${selectedPaper.total_pages} pages, but you selected ${selectedImages.length} image(s). Please select exactly ${selectedPaper.total_pages} images - one for each page.`,
        [{ text: 'OK' }]
      );
      return;
    }

    setSubmitting(true);
    try {
      const formData = new FormData();
      formData.append('studentName', studentName.trim());
      formData.append('paperId', selectedPaper.id.toString());
      
      if (isMultiPage) {
        // For multi-page papers, append multiple files
        selectedImages.forEach((image, index) => {
          const imageFile = {
            uri: image.uri,
            type: 'image/jpeg',
            name: `answer-sheet-page-${index + 1}.jpg`,
          } as any;
          
          formData.append('answerSheets', imageFile);
        });
      } else {
        // For single-page papers, append single file
        const imageFile = {
          uri: selectedImages[0].uri,
          type: 'image/jpeg',
          name: 'answer-sheet.jpg',
        } as any;
        
        formData.append('answerSheet', imageFile);
      }

      const response = await submissionService.submit(formData);
      
      // The backend now returns the data directly, not nested in a 'result' property
      const result = response;
      
      console.log('Frontend received response:', response);
      console.log('Frontend extracted result:', result);
      
      // Extract score and total from the score string format "2/3"
      const scoreMatch = result.score?.match(/(\d+)\/(\d+)/);
      const score = scoreMatch ? scoreMatch[1] : '0';
      const total = scoreMatch ? scoreMatch[2] : '0';
      const percentage = result.percentage || '0%';
      const submissionId = result.submissionId || null;  // Get the actual submission ID
      
      Alert.alert(
        'Submission Complete!',
        `Your answers have been evaluated.\n\nScore: ${score}/${total}\nPercentage: ${percentage}`,
        [
          {
            text: 'View Results',
            onPress: () => {
              // Only navigate to results if we have a valid submission ID
              if (submissionId) {
                router.push({
                  pathname: '/result',
                  params: { 
                    submissionId: submissionId.toString(),
                    studentName: studentName,
                    paperName: selectedPaper.name,
                    score: score,
                    total: total,
                    percentage: percentage
                  }
                });
              } else {
                Alert.alert('Info', 'Detailed results are not available, but your submission was recorded successfully.');
              }
            },
          },
          {
            text: 'Submit Another',
            onPress: () => {
              setStudentName('');
              setSelectedPaper(null);
              setSelectedImages([]);
            },
          },
        ]
      );
    } catch (error: any) {
      Alert.alert(
        'Submission Failed',
        error.response?.data?.error || 'Failed to submit answers'
      );
    } finally {
      setSubmitting(false);
    }
  };

  const removeImage = (index: number) => {
    setSelectedImages(prev => prev.filter((_, i) => i !== index));
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

  if (loadingPapers) {
    return (
      <View style={[styles.loadingContainer, { backgroundColor: theme.colors.background }]}>
        <ActivityIndicator size="large" color={theme.colors.primary} />
        <Paragraph style={[styles.loadingText, { color: theme.colors.onSurfaceVariant }]}>
          Loading papers...
        </Paragraph>
      </View>
    );
  }

  return (
    <View style={[styles.container, { backgroundColor: theme.colors.background }]}>
      {/* Simple Header */}
      <Appbar.Header style={{ backgroundColor: theme.colors.surface }}>
        <Appbar.Content 
          title="Student Portal" 
          titleStyle={{ color: theme.colors.onSurface }}
        />
      </Appbar.Header>

      <ScrollView style={styles.content}>
        <View style={[styles.headerContent, { backgroundColor: theme.colors.surface }]}>
          <View style={styles.headerRow}>
            <View style={styles.headerText}>
              <Title style={[styles.headerTitle, { color: theme.colors.onSurface }]}>
                Submit Answer Sheet
              </Title>
              <Paragraph style={[styles.headerSubtitle, { color: theme.colors.onSurfaceVariant }]}>
                Upload your answer sheet for automatic evaluation
              </Paragraph>
            </View>
            <IconButton
              icon={isDarkMode ? 'weather-sunny' : 'weather-night'}
              iconColor={theme.colors.onSurface}
              onPress={toggleTheme}
              style={styles.themeToggle}
            />
          </View>
        </View>

        <View style={styles.cardContainer}>
          {/* Instructions */}
          <Card style={[styles.instructionsCard, { backgroundColor: theme.colors.primaryContainer }]}>
            <Card.Content>
              <Title style={[styles.instructionsTitle, { color: theme.colors.onPrimaryContainer }]}>
                Submission Instructions
              </Title>
              <Paragraph style={[styles.instructionsText, { color: theme.colors.onPrimaryContainer }]}>
                • Select the correct question paper{'\n'}
                • Write your answers clearly on the sheet{'\n'}
                • Mark your chosen answers with ✓ or circles{'\n'}
                • Ensure good lighting and clear image{'\n'}
                • Keep the image straight and readable
              </Paragraph>
            </Card.Content>
          </Card>

          {/* Student Name */}
          <Card style={[styles.card, { backgroundColor: theme.colors.surface }]}>
            <Card.Content>
              <Title style={[styles.cardTitle, { color: theme.colors.onSurface }]}>
                Step 1: Enter Your Name
              </Title>
              <TextInput
                label="Student Name"
                value={studentName}
                onChangeText={setStudentName}
                style={styles.input}
                mode="outlined"
                placeholder="e.g., John Smith"
                disabled={submitting}
              />
            </Card.Content>
          </Card>

          {/* Paper Selection */}
          <Card style={[styles.card, { backgroundColor: theme.colors.surface }]}>
            <Card.Content>
              <Title style={[styles.cardTitle, { color: theme.colors.onSurface }]}>
                Step 2: Select Question Paper
              </Title>
              
              {papers.length === 0 ? (
                <View style={styles.noPapersContainer}>
                  <Paragraph style={[styles.noPapersText, { color: theme.colors.onSurfaceVariant }]}>
                    No question papers available yet.
                  </Paragraph>
                </View>
              ) : (
                <View>
                  {selectedPaper ? (
                    <View style={styles.selectedPaperContainer}>
                      <Card style={[styles.selectedPaperCard, { backgroundColor: theme.colors.secondaryContainer }]}>
                        <Card.Content>
                          <View style={styles.selectedPaperHeader}>
                            <Title style={[styles.selectedPaperTitle, { color: theme.colors.onSecondaryContainer }]}>
                              {selectedPaper.name}
                            </Title>
                            <View style={styles.selectedChipsContainer}>
                              <Chip 
                                mode="outlined" 
                                textStyle={{ color: getQuestionTypeInfo(selectedPaper.question_type || 'traditional').color, fontSize: 11 }}
                                style={{ borderColor: getQuestionTypeInfo(selectedPaper.question_type || 'traditional').color, marginBottom: 5 }}
                                icon={getQuestionTypeInfo(selectedPaper.question_type || 'traditional').icon}
                                compact
                              >
                                {getQuestionTypeInfo(selectedPaper.question_type || 'traditional').label}
                              </Chip>
                              <Chip mode="outlined" textStyle={{ color: theme.colors.onSecondaryContainer, fontSize: 11 }} compact>
                                {selectedPaper.question_count || 0} questions • {selectedPaper.total_pages || 1} page{(selectedPaper.total_pages || 1) > 1 ? 's' : ''}
                              </Chip>
                            </View>
                          </View>
                          <Paragraph style={[styles.selectedPaperDate, { color: theme.colors.onSecondaryContainer }]}>
                            Created: {formatDate(selectedPaper.uploaded_at)}
                          </Paragraph>
                          <View style={[styles.typeInstructionContainer, { backgroundColor: theme.colors.primaryContainer }]}>
                            <Paragraph style={[styles.typeInstructionText, { color: theme.colors.onPrimaryContainer }]}>
                              📝 {getQuestionTypeInfo(selectedPaper.question_type || 'traditional').instruction}
                            </Paragraph>
                          </View>
                          <Button
                            mode="outlined"
                            onPress={() => setSelectedPaper(null)}
                            style={styles.changePaperButton}
                            disabled={submitting}
                          >
                            Change Paper
                          </Button>
                        </Card.Content>
                      </Card>
                    </View>
                  ) : (
                    <FlatList
                      data={papers}
                      keyExtractor={(item) => item.id.toString()}
                      renderItem={({ item }) => (
                        <List.Item
                          title={item.name}
                          description={`${item.question_count || 0} questions • ${formatDate(item.uploaded_at)}`}
                          onPress={() => setSelectedPaper(item)}
                          style={styles.paperItem}
                          titleStyle={[styles.paperItemTitle, { color: theme.colors.onSurface }]}
                          descriptionStyle={{ color: theme.colors.onSurfaceVariant }}
                          right={() => <List.Icon icon="chevron-right" color={theme.colors.onSurfaceVariant} />}
                          disabled={submitting}
                        />
                      )}
                      ItemSeparatorComponent={() => <Divider />}
                      scrollEnabled={false}
                    />
                  )}
                </View>
              )}
            </Card.Content>
          </Card>

          {/* Answer Sheet Upload */}
          <Card style={[styles.card, { backgroundColor: theme.colors.surface }]}>
            <Card.Content>
              <Title style={[styles.cardTitle, { color: theme.colors.onSurface }]}>
                Step 3: Upload Answer Sheet{selectedPaper && selectedPaper.total_pages > 1 ? 's' : ''}
                {selectedPaper && selectedPaper.total_pages > 1 && (
                  <Paragraph style={[styles.pageRequirement, { color: theme.colors.onSurfaceVariant }]}>
                    {`\nRequired: ${selectedPaper.total_pages} page${selectedPaper.total_pages > 1 ? 's' : ''} (${selectedImages.length}/${selectedPaper.total_pages} selected)`}
                  </Paragraph>
                )}
              </Title>
              
              {selectedImages.length > 0 ? (
                <View>
                  <FlatList
                    data={selectedImages}
                    keyExtractor={(item, index) => index.toString()}
                    renderItem={({ item, index }) => (
                      <View style={[styles.imageItem, { backgroundColor: theme.colors.surface }]}>
                        <View style={styles.imageHeader}>
                          <Chip mode="outlined" style={styles.pageChip}>
                            Page {index + 1}
                          </Chip>
                          <IconButton
                            icon="close"
                            size={20}
                            onPress={() => removeImage(index)}
                            disabled={submitting}
                          />
                        </View>
                        <Image source={{ uri: item.uri }} style={styles.thumbnailImage} />
                        <Paragraph style={[styles.imageSize, { color: theme.colors.onSurfaceVariant }]}>
                          {item.width}x{item.height}
                        </Paragraph>
                      </View>
                    )}
                    horizontal
                    showsHorizontalScrollIndicator={false}
                    style={styles.imagesList}
                  />
                  
                  <View style={styles.imageActions}>
                    <Button
                      mode="outlined"
                      onPress={showImagePicker}
                      style={styles.addMoreButton}
                      disabled={submitting || !!(selectedPaper && selectedImages.length >= (selectedPaper.total_pages || 1))}
                    >
                      {selectedPaper && selectedPaper.total_pages > 1 && selectedImages.length < selectedPaper.total_pages 
                        ? `Add More (${selectedPaper.total_pages - selectedImages.length} needed)` 
                        : 'Change Images'}
                    </Button>
                    <Button
                      mode="text"
                      onPress={() => setSelectedImages([])}
                      disabled={submitting}
                    >
                      Clear All
                    </Button>
                  </View>
                  
                  {selectedPaper && selectedPaper.total_pages > 1 && selectedImages.length !== selectedPaper.total_pages && (
                    <View style={[styles.warningContainer, { backgroundColor: theme.colors.errorContainer }]}>
                      <Paragraph style={[styles.warningText, { color: theme.colors.onErrorContainer }]}>
                        ⚠️ Page count mismatch: This question paper has {selectedPaper.total_pages} pages, but you selected {selectedImages.length} image(s). 
                        Please select exactly {selectedPaper.total_pages} images.
                      </Paragraph>
                    </View>
                  )}
                </View>
              ) : (
                <View style={[styles.selectImageContainer, { borderColor: theme.colors.outline }]}>
                  <Paragraph style={[styles.selectImageText, { color: theme.colors.onSurfaceVariant }]}>
                    No answer sheet{selectedPaper && selectedPaper.total_pages > 1 ? 's' : ''} selected
                  </Paragraph>
                  {selectedPaper && selectedPaper.total_pages > 1 && (
                    <Paragraph style={[styles.selectHelpText, { color: theme.colors.onSurfaceVariant }]}>
                      This question paper has {selectedPaper.total_pages} pages. Please select {selectedPaper.total_pages} images.
                    </Paragraph>
                  )}
                  <Button
                    mode="contained"
                    onPress={showImagePicker}
                    style={styles.selectButton}
                    disabled={submitting || !selectedPaper}
                  >
                    Select Answer Sheet{selectedPaper && selectedPaper.total_pages > 1 ? 's' : ''}
                  </Button>
                </View>
              )}
            </Card.Content>
          </Card>

          {/* Submit Button */}
          <Card style={[styles.card, { backgroundColor: theme.colors.surface }]}>
            <Card.Content>
              <Title style={[styles.cardTitle, { color: theme.colors.onSurface }]}>
                Step 4: Submit for Evaluation
              </Title>
              
              <Button
                mode="contained"
                onPress={submitAnswers}
                style={[styles.submitButton, { backgroundColor: theme.colors.primary }]}
                disabled={submitting || !studentName.trim() || !selectedPaper || selectedImages.length === 0 || 
                  (selectedPaper && selectedPaper.total_pages > 1 && selectedImages.length !== selectedPaper.total_pages)}
                contentStyle={styles.submitButtonContent}
              >
                {submitting ? (
                  <>
                    <ActivityIndicator color="white" size="small" />
                    <Paragraph style={styles.submittingText}>  Evaluating...</Paragraph>
                  </>
                ) : (
                  'Submit Answer Sheet'
                )}
              </Button>
            </Card.Content>
          </Card>
        </View>
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  loadingText: {
    marginTop: 10,
  },
  content: {
    flex: 1,
  },
  headerContent: {
    padding: 20,
    paddingTop: 20,
    elevation: 2,
  },
  headerTitle: {
    fontSize: 24,
    fontWeight: 'bold',
  },
  headerSubtitle: {
    marginTop: 4,
  },
  headerRow: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    justifyContent: 'space-between',
  },
  headerText: {
    flex: 1,
  },
  themeToggle: {
    margin: 0,
  },
  cardContainer: {
    padding: 20,
  },
  instructionsCard: {
    marginBottom: 20,
    elevation: 2,
  },
  instructionsTitle: {
    marginBottom: 10,
  },
  instructionsText: {
    lineHeight: 20,
  },
  card: {
    marginBottom: 20,
    elevation: 3,
  },
  cardTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    marginBottom: 15,
  },
  input: {
    marginBottom: 10,
  },
  noPapersContainer: {
    alignItems: 'center',
    paddingVertical: 40,
  },
  noPapersText: {
    textAlign: 'center',
  },
  selectedPaperContainer: {
    marginVertical: 10,
  },
  selectedPaperCard: {
    elevation: 2,
  },
  selectedPaperHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    marginBottom: 8,
  },
  selectedPaperTitle: {
    flex: 1,
    marginRight: 10,
  },
  selectedChipsContainer: {
    flexDirection: 'column',
    alignItems: 'flex-end',
    gap: 5,
  },
  selectedPaperDate: {
    marginBottom: 15,
  },
  typeInstructionContainer: {
    padding: 12,
    borderRadius: 8,
    marginBottom: 15,
  },
  typeInstructionText: {
    fontSize: 14,
    fontWeight: '500',
    textAlign: 'center',
  },
  changePaperButton: {
    marginTop: 5,
  },
  paperItem: {
    paddingVertical: 12,
  },
  paperItemTitle: {
    fontWeight: 'bold',
  },
  imageContainer: {
    alignItems: 'center',
  },
  selectedImage: {
    width: '100%',
    height: 200,
    borderRadius: 8,
    marginBottom: 10,
    resizeMode: 'contain',
  },
  imageInfo: {
    marginBottom: 10,
    textAlign: 'center',
  },
  changeButton: {
    marginTop: 5,
  },
  selectImageContainer: {
    alignItems: 'center',
    paddingVertical: 40,
    borderWidth: 2,
    borderStyle: 'dashed',
    borderRadius: 8,
  },
  selectImageText: {
    marginBottom: 15,
  },
  selectButton: {
    paddingHorizontal: 20,
  },
  submitDescription: {
    marginBottom: 20,
    textAlign: 'center',
  },
  submitButton: {
    paddingVertical: 8,
  },
  submitButtonContent: {
    paddingVertical: 8,
    flexDirection: 'row',
    alignItems: 'center',
  },
  submittingText: {
    color: 'white',
    marginLeft: 8,
  },
  pageRequirement: {
    fontSize: 14,
    marginTop: 5,
  },
  imagesList: {
    marginBottom: 15,
  },
  imageItem: {
    width: 120,
    marginRight: 10,
    padding: 8,
    borderRadius: 8,
    elevation: 1,
  },
  imageHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 8,
  },
  pageChip: {
    height: 28,
  },
  thumbnailImage: {
    width: '100%',
    height: 80,
    borderRadius: 4,
    marginBottom: 5,
    resizeMode: 'cover',
  },
  imageSize: {
    fontSize: 10,
    textAlign: 'center',
  },
  imageActions: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginTop: 10,
  },
  addMoreButton: {
    flex: 1,
    marginRight: 10,
  },
  selectHelpText: {
    marginBottom: 20,
    textAlign: 'center',
    fontSize: 14,
  },
  warningContainer: {
    marginTop: 15,
    padding: 15,
    borderRadius: 8,
  },
  warningText: {
    textAlign: 'center',
    fontSize: 14,
    fontWeight: 'bold',
  },
});
