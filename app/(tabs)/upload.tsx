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
  Chip,
  IconButton,
} from 'react-native-paper';
import * as ImagePicker from 'expo-image-picker';
import { paperService, authService } from '../../services/api';
import { router } from 'expo-router';
import { useTheme } from '../../context/ThemeContext';
import { useAuth } from '../../context/AuthContext';
import AsyncStorage from '@react-native-async-storage/async-storage';

export default function UploadPaper() {
  const [paperName, setPaperName] = useState('');
  const [selectedImages, setSelectedImages] = useState<any[]>([]);
  const [uploading, setUploading] = useState(false);
  
  const { theme } = useTheme();
  const { isAuthenticated, logout } = useAuth();

  // Check authentication status on component mount
  useEffect(() => {
    checkAuthStatus();
  }, []);

  const checkAuthStatus = async () => {
    try {
      if (!isAuthenticated) {
        Alert.alert(
          'Authentication Required',
          'Please log in to upload question papers.',
          [{ text: 'OK', onPress: () => router.push('/login') }]
        );
        return;
      }

      // Verify token with backend
      await authService.verify();
    } catch (error: any) {
      console.error('Auth verification failed:', error);
      if (error.response?.status === 401 || error.response?.data?.error?.includes('Invalid token')) {
        Alert.alert(
          'Session Expired',
          'Your session has expired. Please log in again.',
          [
            {
              text: 'Login',
              onPress: async () => {
                await logout();
                router.push('/login');
              }
            }
          ]
        );
      }
    }
  };

  const selectImages = async () => {
    // Request permission to access camera and media library
    const { status } = await ImagePicker.requestMediaLibraryPermissionsAsync();
    if (status !== 'granted') {
      Alert.alert('Permission needed', 'Sorry, we need camera roll permissions to make this work!');
      return;
    }

    const result = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: ImagePicker.MediaTypeOptions.Images,
      allowsMultipleSelection: true,
      selectionLimit: 10,
      allowsEditing: false,
      quality: 0.8,
    });

    if (!result.canceled && result.assets) {
      setSelectedImages(result.assets);
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
      setSelectedImages(prev => [...prev, result.assets[0]]);
    }
  };

  const showImagePicker = () => {
    Alert.alert(
      'Add Question Paper Pages',
      'Choose how you want to add question paper pages',
      [
        { text: 'Take Photo', onPress: takePhoto },
        { text: 'Select Multiple', onPress: selectImages },
        { text: 'Cancel', style: 'cancel' },
      ]
    );
  };

  const removeImage = (index: number) => {
    setSelectedImages(prev => prev.filter((_, i) => i !== index));
  };

  const reorderImages = (fromIndex: number, toIndex: number) => {
    const newImages = [...selectedImages];
    const [movedItem] = newImages.splice(fromIndex, 1);
    newImages.splice(toIndex, 0, movedItem);
    setSelectedImages(newImages);
  };

  const uploadPaper = async () => {
    if (!paperName.trim()) {
      Alert.alert('Error', 'Please enter a paper name');
      return;
    }

    if (selectedImages.length === 0) {
      Alert.alert('Error', 'Please select at least one image');
      return;
    }

    // Check authentication before upload
    try {
      await authService.verify();
    } catch (error: any) {
      if (error.response?.status === 401) {
        Alert.alert(
          'Session Expired',
          'Your session has expired. Please log in again.',
          [
            {
              text: 'Login',
              onPress: async () => {
                await logout();
                router.push('/login');
              }
            }
          ]
        );
        return;
      }
    }

    setUploading(true);
    try {
      const formData = new FormData();
      formData.append('name', paperName.trim());
      
      // Add all images to FormData
      selectedImages.forEach((image, index) => {
        const imageFile = {
          uri: image.uri,
          type: 'image/jpeg',
          name: `question-paper-page-${index + 1}.jpg`,
        } as any;
        
        formData.append('papers', imageFile);
      });

      const response = await paperService.upload(formData);
      
      Alert.alert(
        'Success',
        `Multi-page paper uploaded successfully!\n\n` +
        `Total Pages: ${response.totalPages}\n` +
        `Questions Extracted: ${response.extractedQuestions}\n\n` +
        `Questions per page:\n` +
        response.questionsPerPage.map((page: any) => 
          `Page ${page.page}: ${page.questions} questions`
        ).join('\n'),
        [
          {
            text: 'OK',
            onPress: () => {
              setPaperName('');
              setSelectedImages([]);
              router.back();
            },
          },
        ]
      );
    } catch (error: any) {
      console.error('Upload error:', error);
      
      if (error.response?.status === 401 || error.response?.data?.error?.includes('Invalid token')) {
        Alert.alert(
          'Session Expired',
          'Your session has expired. Please log in again.',
          [
            {
              text: 'Login',
              onPress: async () => {
                await logout();
                router.push('/login');
              }
            }
          ]
        );
      } else {
        Alert.alert(
          'Upload Failed',
          error.response?.data?.error || 'Failed to upload paper'
        );
      }
    } finally {
      setUploading(false);
    }
  };

  const renderImageItem = ({ item, index }: { item: any; index: number }) => (
    <View style={[styles.imageItem, { backgroundColor: theme.colors.surface }]}>
      <View style={styles.imageHeader}>
        <Chip mode="outlined" style={styles.pageChip}>
          Page {index + 1}
        </Chip>
        <IconButton
          icon="close"
          size={20}
          onPress={() => removeImage(index)}
          disabled={uploading}
        />
      </View>
      <Image source={{ uri: item.uri }} style={styles.thumbnailImage} />
      <Paragraph style={[styles.imageSize, { color: theme.colors.onSurfaceVariant }]}>
        {item.width}x{item.height}
      </Paragraph>
    </View>
  );

  return (
    <ScrollView style={[styles.container, { backgroundColor: theme.colors.background }]}>
      <View style={[styles.header, { backgroundColor: theme.colors.surface }]}>
        <Title style={[styles.headerTitle, { color: theme.colors.onSurface }]}>Upload Question Paper</Title>
        <Paragraph style={[styles.headerSubtitle, { color: theme.colors.onSurfaceVariant }]}>
          Upload single or multi-page question papers with marked correct answers
        </Paragraph>
      </View>

      <View style={styles.content}>
        {/* Instructions */}
        <Card style={[styles.instructionsCard, { backgroundColor: theme.colors.primaryContainer }]}>
          <Card.Content>
            <Title style={[styles.instructionsTitle, { color: theme.colors.onPrimaryContainer }]}>Multi-Page Upload Instructions</Title>
            <Paragraph style={[styles.instructionsText, { color: theme.colors.onPrimaryContainer }]}>
              Format (per page): {'\n'}
              1) What language is Python?{'\n'}
              a) Compiled{'\n'}
              b) Interpreted ✓{'\n'}
              c) Machine{'\n\n'}
              
              • Upload all pages in order (1, 2, 3...){'\n'}
              • Mark correct answers with ✓ or circle them{'\n'}
              • Questions will be numbered continuously across pages{'\n'}
              • Maximum 10 pages per paper{'\n'}
              • Ensure clear, well-lit images
            </Paragraph>
          </Card.Content>
        </Card>

        {/* Paper Name Input */}
        <Card style={[styles.card, { backgroundColor: theme.colors.surface }]}>
          <Card.Content>
            <Title style={[styles.cardTitle, { color: theme.colors.onSurface }]}>Step 1: Paper Details</Title>
            <TextInput
              label="Paper Name"
              value={paperName}
              onChangeText={setPaperName}
              style={styles.input}
              mode="outlined"
              placeholder="e.g., Python Programming Quiz - Chapters 1-3"
              disabled={uploading}
            />
          </Card.Content>
        </Card>

        {/* Image Selection */}
        <Card style={[styles.card, { backgroundColor: theme.colors.surface }]}>
          <Card.Content>
            <Title style={[styles.cardTitle, { color: theme.colors.onSurface }]}>
              Step 2: Upload Question Paper Pages ({selectedImages.length}/10)
            </Title>
            
            {selectedImages.length > 0 ? (
              <View>
                <FlatList
                  data={selectedImages}
                  renderItem={renderImageItem}
                  keyExtractor={(item, index) => index.toString()}
                  horizontal
                  showsHorizontalScrollIndicator={false}
                  style={styles.imagesList}
                />
                <View style={styles.addMoreContainer}>
                  <Button
                    mode="outlined"
                    onPress={showImagePicker}
                    style={styles.addMoreButton}
                    disabled={uploading || selectedImages.length >= 10}
                  >
                    {selectedImages.length >= 10 ? 'Maximum Reached' : 'Add More Pages'}
                  </Button>
                  <Button
                    mode="text"
                    onPress={() => setSelectedImages([])}
                    disabled={uploading}
                  >
                    Clear All
                  </Button>
                </View>
              </View>
            ) : (
              <View style={[styles.selectImageContainer, { borderColor: theme.colors.outline }]}>
                <Paragraph style={[styles.selectImageText, { color: theme.colors.onSurfaceVariant }]}>
                  No pages selected
                </Paragraph>
                <Paragraph style={[styles.selectHelpText, { color: theme.colors.onSurfaceVariant }]}>
                  You can select multiple pages at once or add them one by one
                </Paragraph>
                <Button
                  mode="contained"
                  onPress={showImagePicker}
                  style={styles.selectButton}
                  disabled={uploading}
                >
                  Select Pages
                </Button>
              </View>
            )}
          </Card.Content>
        </Card>

        {/* Upload Button */}
        <Card style={[styles.card, { backgroundColor: theme.colors.surface }]}>
          <Card.Content>
            <Title style={[styles.cardTitle, { color: theme.colors.onSurface }]}>Step 3: Process & Upload</Title>
            <Paragraph style={[styles.uploadDescription, { color: theme.colors.onSurfaceVariant }]}>
              The system will automatically extract questions from all pages and number them continuously.
            </Paragraph>
            
            {selectedImages.length > 0 && (
              <View style={styles.summaryContainer}>
                <Paragraph style={[styles.summaryText, { color: theme.colors.onSurfaceVariant }]}>
                  Ready to upload: {selectedImages.length} page{selectedImages.length > 1 ? 's' : ''}
                </Paragraph>
              </View>
            )}
            
            <Button
              mode="contained"
              onPress={uploadPaper}
              style={[styles.uploadButton, { backgroundColor: theme.colors.primary }]}
              disabled={uploading || !paperName.trim() || selectedImages.length === 0}
              contentStyle={styles.uploadButtonContent}
            >
              {uploading ? (
                <>
                  <ActivityIndicator color="white" size="small" />
                  <Paragraph style={styles.uploadingText}>  Processing {selectedImages.length} page{selectedImages.length > 1 ? 's' : ''}...</Paragraph>
                </>
              ) : (
                `Upload & Process ${selectedImages.length > 0 ? selectedImages.length + ' Page' + (selectedImages.length > 1 ? 's' : '') : 'Paper'}`
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
  },
  header: {
    padding: 20,
    paddingTop: 60,
    elevation: 2,
  },
  headerTitle: {
    fontSize: 24,
    fontWeight: 'bold',
  },
  headerSubtitle: {
    marginTop: 4,
  },
  content: {
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
  addMoreContainer: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginTop: 10,
  },
  addMoreButton: {
    flex: 1,
    marginRight: 10,
  },
  selectImageContainer: {
    alignItems: 'center',
    paddingVertical: 40,
    borderWidth: 2,
    borderStyle: 'dashed',
    borderRadius: 8,
  },
  selectImageText: {
    marginBottom: 10,
    fontSize: 16,
    fontWeight: 'bold',
  },
  selectHelpText: {
    marginBottom: 20,
    textAlign: 'center',
    fontSize: 14,
  },
  selectButton: {
    paddingHorizontal: 20,
  },
  uploadDescription: {
    marginBottom: 20,
    textAlign: 'center',
  },
  summaryContainer: {
    backgroundColor: 'rgba(0,0,0,0.05)',
    padding: 15,
    borderRadius: 8,
    marginBottom: 20,
  },
  summaryText: {
    textAlign: 'center',
    fontWeight: 'bold',
  },
  uploadButton: {
    paddingVertical: 8,
  },
  uploadButtonContent: {
    paddingVertical: 8,
    flexDirection: 'row',
    alignItems: 'center',
  },
  uploadingText: {
    color: 'white',
    marginLeft: 8,
  },
});
