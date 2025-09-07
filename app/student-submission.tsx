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
} from 'react-native-paper';
import * as ImagePicker from 'expo-image-picker';
import { paperService, submissionService } from '../services/api';
import { router } from 'expo-router';

interface Paper {
  id: number;
  name: string;
  uploaded_at: string;
  question_count: number;
  questions?: any[];
}

export default function StudentSubmissionScreen() {
  const [studentName, setStudentName] = useState('');
  const [papers, setPapers] = useState<Paper[]>([]);
  const [selectedPaper, setSelectedPaper] = useState<Paper | null>(null);
  const [selectedImage, setSelectedImage] = useState<any>(null);
  const [submitting, setSubmitting] = useState(false);
  const [loadingPapers, setLoadingPapers] = useState(true);

  useEffect(() => {
    loadPapers();
  }, []);

  const loadPapers = async () => {
    try {
      const response = await paperService.getAll();
      console.log('Papers loaded in student portal:', JSON.stringify(response, null, 2));
      setPapers(response);
    } catch (error) {
      console.log('Error loading papers:', error);
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
      
      Alert.alert(
        'Submission Complete!',
        `Your answers have been evaluated.\n\nScore: ${response.score}/${response.totalQuestions}\nPercentage: ${response.percentage}%`,
        [
          {
            text: 'View Results',
            onPress: () => {
              router.push({
                pathname: '/result',
                params: { 
                  submissionId: response.submissionId,
                  studentName: studentName,
                  paperName: selectedPaper.name,
                  score: response.score,
                  total: response.totalQuestions,
                  percentage: response.percentage
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
      <View style={styles.loadingContainer}>
        <ActivityIndicator size="large" />
        <Paragraph style={styles.loadingText}>Loading papers...</Paragraph>
      </View>
    );
  }

  return (
    <ScrollView style={styles.container}>
      <View style={styles.header}>
        <Title style={styles.headerTitle}>Submit Answer Sheet</Title>
        <Paragraph style={styles.headerSubtitle}>
          Upload your answer sheet for automatic evaluation
        </Paragraph>
        <Button
          mode="text"
          onPress={() => router.back()}
          style={styles.backButton}
        >
          ← Back to Login
        </Button>
      </View>

      <View style={styles.content}>
        {/* Instructions */}
        <Card style={styles.instructionsCard}>
          <Card.Content>
            <Title style={styles.instructionsTitle}>Submission Instructions</Title>
            <Paragraph style={styles.instructionsText}>
              • Select the correct question paper{'\n'}
              • Write your answers clearly on the sheet{'\n'}
              • Mark your chosen answers with ✓ or circles{'\n'}
              • Ensure good lighting and clear image{'\n'}
              • Keep the image straight and readable
            </Paragraph>
          </Card.Content>
        </Card>

        {/* Student Name */}
        <Card style={styles.card}>
          <Card.Content>
            <Title style={styles.cardTitle}>Step 1: Enter Your Name</Title>
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
        {/* <Card style={styles.card}>
          <Card.Content>
            <Title style={styles.cardTitle}>Step 2: Select Question Paper</Title>
            
            {papers.length === 0 ? (
              <View style={styles.noPapersContainer}>
                <Paragraph style={styles.noPapersText}>
                  No question papers available yet.
                </Paragraph>
              </View>
            ) : (
              <View>
                {selectedPaper ? (
                  <View style={styles.selectedPaperContainer}>
                    <Card style={styles.selectedPaperCard}>
                      <Card.Content>
                        <View style={styles.selectedPaperHeader}>
                          <Title style={styles.selectedPaperTitle}>
                            {selectedPaper.name}
                          </Title>
                          <Chip mode="outlined">
                            {selectedPaper.question_count || 0} questions
                          </Chip>
                        </View>
                        <Paragraph style={styles.selectedPaperDate}>
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
                        titleStyle={styles.paperItemTitle}
                        right={() => <List.Icon icon="chevron-right" />}
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
        </Card> */}
        

        {/* Answer Sheet Upload */}
        <Card style={styles.card}>
          <Card.Content>
            <Title style={styles.cardTitle}>Step 3: Upload Answer Sheet</Title>
            
            {selectedImage ? (
              <View style={styles.imageContainer}>
                <Image source={{ uri: selectedImage.uri }} style={styles.selectedImage} />
                <Paragraph style={styles.imageInfo}>
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
              <View style={styles.selectImageContainer}>
                <Paragraph style={styles.selectImageText}>
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
        <Card style={styles.card}>
          <Card.Content>
            <Title style={styles.cardTitle}>Step 4: Submit for Evaluation</Title>
         
            
            <Button
              mode="contained"
              onPress={submitAnswers}
              style={styles.submitButton}
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
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#f5f5f5',
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: '#f5f5f5',
  },
  loadingText: {
    marginTop: 10,
    color: '#666',
  },
  header: {
    backgroundColor: 'white',
    padding: 20,
    paddingTop: 60,
    elevation: 2,
  },
  headerTitle: {
    fontSize: 24,
    fontWeight: 'bold',
    color: '#333',
  },
  headerSubtitle: {
    color: '#666',
    marginTop: 4,
  },
  backButton: {
    alignSelf: 'flex-start',
    marginTop: 10,
  },
  content: {
    padding: 20,
  },
  instructionsCard: {
    marginBottom: 20,
    backgroundColor: '#e8f5e8',
    elevation: 2,
  },
  instructionsTitle: {
    color: '#2e7d32',
    marginBottom: 10,
  },
  instructionsText: {
    color: '#2e7d32',
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
    color: '#333',
  },
  input: {
    marginBottom: 10,
  },
  noPapersContainer: {
    alignItems: 'center',
    paddingVertical: 40,
  },
  noPapersText: {
    color: '#999',
    textAlign: 'center',
  },
  selectedPaperContainer: {
    marginVertical: 10,
  },
  selectedPaperCard: {
    backgroundColor: '#e3f2fd',
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
    color: '#1976d2',
  },
  selectedPaperDate: {
    color: '#1976d2',
    marginBottom: 15,
  },
  changePaperButton: {
    borderColor: '#1976d2',
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
    color: '#666',
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
    borderColor: '#ddd',
    borderStyle: 'dashed',
    borderRadius: 8,
  },
  selectImageText: {
    color: '#999',
    marginBottom: 15,
  },
  selectButton: {
    paddingHorizontal: 20,
  },
  submitDescription: {
    color: '#666',
    marginBottom: 20,
    textAlign: 'center',
  },
  submitButton: {
    paddingVertical: 8,
    backgroundColor: '#4caf50',
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
