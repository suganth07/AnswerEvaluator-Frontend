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
}

export default function StudentSubmission() {
  const [studentName, setStudentName] = useState('');
  const [papers, setPapers] = useState<Paper[]>([]);
  const [selectedPaper, setSelectedPaper] = useState<Paper | null>(null);
  const [selectedImage, setSelectedImage] = useState<any>(null);
  const [submitting, setSubmitting] = useState(false);
  const [loadingPapers, setLoadingPapers] = useState(true);
  
  const { theme, isDarkMode, toggleTheme } = useTheme();

  useEffect(() => {
    loadPapers();
  }, []);

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

  const selectImage = async () => {
    const { status } = await ImagePicker.requestMediaLibraryPermissionsAsync();
    if (status !== 'granted') {
      Alert.alert('Permission needed', 'Sorry, we need camera roll permissions to make this work!');
      return;
    }

    const result = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: ImagePicker.MediaTypeOptions.Images,
      allowsEditing: true,
      aspect: [3, 4],
      quality: 0.8,
    });

    if (!result.canceled && result.assets[0]) {
      setSelectedImage(result.assets[0]);
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
      setSelectedImage(result.assets[0]);
    }
  };

  const showImagePicker = () => {
    Alert.alert(
      'Select Image',
      'Choose how you want to select your answer sheet',
      [
        { text: 'Camera', onPress: takePhoto },
        { text: 'Gallery', onPress: selectImage },
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

    if (!selectedImage) {
      Alert.alert('Error', 'Please select your answer sheet image');
      return;
    }

    setSubmitting(true);
    try {
      const formData = new FormData();
      formData.append('studentName', studentName.trim());
      formData.append('paperId', selectedPaper.id.toString());
      
      const imageFile = {
        uri: selectedImage.uri,
        type: 'image/jpeg',
        name: 'answer-sheet.jpg',
      } as any;
      
      formData.append('answerSheet', imageFile);

      const response = await submissionService.submit(formData);
      
      // Extract the result data from the response
      const result = response.result || response;
      
      console.log('Frontend received response:', response);
      console.log('Frontend extracted result:', result);
      
      Alert.alert(
        'Submission Complete!',
        `Your answers have been evaluated.\n\nScore: ${result.score}/${result.totalQuestions}\nPercentage: ${result.percentage}%`,
        [
          {
            text: 'View Results',
            onPress: () => {
              router.push({
                pathname: '/result',
                params: { 
                  submissionId: result.submissionId,
                  studentName: studentName,
                  paperName: selectedPaper.name,
                  score: result.score,
                  total: result.totalQuestions,
                  percentage: result.percentage
                }
              });
            },
          },
          {
            text: 'Submit Another',
            onPress: () => {
              setStudentName('');
              setSelectedPaper(null);
              setSelectedImage(null);
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
                            <Chip mode="outlined" textStyle={{ color: theme.colors.onSecondaryContainer }}>
                              {selectedPaper.question_count || 0} questions
                            </Chip>
                          </View>
                          <Paragraph style={[styles.selectedPaperDate, { color: theme.colors.onSecondaryContainer }]}>
                            Created: {formatDate(selectedPaper.uploaded_at)}
                          </Paragraph>
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
                Step 3: Upload Answer Sheet
              </Title>
              
              {selectedImage ? (
                <View style={styles.imageContainer}>
                  <Image source={{ uri: selectedImage.uri }} style={styles.selectedImage} />
                  <Paragraph style={[styles.imageInfo, { color: theme.colors.onSurfaceVariant }]}>
                    Answer sheet selected: {selectedImage.width}x{selectedImage.height}
                  </Paragraph>
                  <Button
                    mode="outlined"
                    onPress={showImagePicker}
                    style={styles.changeButton}
                    disabled={submitting}
                  >
                    Change Image
                  </Button>
                </View>
              ) : (
                <View style={[styles.selectImageContainer, { borderColor: theme.colors.outline }]}>
                  <Paragraph style={[styles.selectImageText, { color: theme.colors.onSurfaceVariant }]}>
                    No answer sheet selected
                  </Paragraph>
                  <Button
                    mode="contained"
                    onPress={showImagePicker}
                    style={styles.selectButton}
                    disabled={submitting}
                  >
                    Select Answer Sheet
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
                disabled={submitting || !studentName.trim() || !selectedPaper || !selectedImage}
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
  selectedPaperDate: {
    marginBottom: 15,
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
});
