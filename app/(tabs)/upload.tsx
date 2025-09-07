import React, { useState } from 'react';
import {
  View,
  StyleSheet,
  Alert,
  ScrollView,
  Image,
} from 'react-native';
import {
  TextInput,
  Button,
  Card,
  Title,
  Paragraph,
  ActivityIndicator,
} from 'react-native-paper';
import * as ImagePicker from 'expo-image-picker';
import { paperService } from '../../services/api';
import { router } from 'expo-router';
import { useTheme } from '../../context/ThemeContext';

export default function UploadPaper() {
  const [paperName, setPaperName] = useState('');
  const [selectedImage, setSelectedImage] = useState<any>(null);
  const [uploading, setUploading] = useState(false);
  
  const { theme } = useTheme();

  const selectImage = async () => {
    // Request permission to access camera and media library
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
      'Choose how you want to select the question paper',
      [
        { text: 'Camera', onPress: takePhoto },
        { text: 'Gallery', onPress: selectImage },
        { text: 'Cancel', style: 'cancel' },
      ]
    );
  };

  const uploadPaper = async () => {
    if (!paperName.trim()) {
      Alert.alert('Error', 'Please enter a paper name');
      return;
    }

    if (!selectedImage) {
      Alert.alert('Error', 'Please select an image');
      return;
    }

    setUploading(true);
    try {
      const formData = new FormData();
      formData.append('name', paperName.trim());
      
      // Create image file object for FormData
      const imageFile = {
        uri: selectedImage.uri,
        type: 'image/jpeg',
        name: 'question-paper.jpg',
      } as any;
      
      formData.append('paper', imageFile);

      const response = await paperService.upload(formData);
      
      Alert.alert(
        'Success',
        `Paper uploaded and processed successfully!\n\nExtracted ${response.extractedQuestions} questions.`,
        [
          {
            text: 'OK',
            onPress: () => {
              setPaperName('');
              setSelectedImage(null);
              router.back();
            },
          },
        ]
      );
    } catch (error: any) {
      Alert.alert(
        'Upload Failed',
        error.response?.data?.error || 'Failed to upload paper'
      );
    } finally {
      setUploading(false);
    }
  };

  return (
    <ScrollView style={[styles.container, { backgroundColor: theme.colors.background }]}>
      <View style={[styles.header, { backgroundColor: theme.colors.surface }]}>
        <Title style={[styles.headerTitle, { color: theme.colors.onSurface }]}>Upload Question Paper</Title>
        <Paragraph style={[styles.headerSubtitle, { color: theme.colors.onSurfaceVariant }]}>
          Upload a question paper with marked correct answers
        </Paragraph>
      </View>

      <View style={styles.content}>
        {/* Instructions */}
        <Card style={[styles.instructionsCard, { backgroundColor: theme.colors.primaryContainer }]}>
          <Card.Content>
            <Title style={[styles.instructionsTitle, { color: theme.colors.onPrimaryContainer }]}>Upload Instructions</Title>
            <Paragraph style={[styles.instructionsText, { color: theme.colors.onPrimaryContainer }]}>
              Format: {'\n'}
              1) What language is Python?{'\n'}
              a) Compiled{'\n'}
              b) Interpreted ✓{'\n'}
              c) Machine{'\n\n'}
              
              • Mark correct answers with ✓ or circle them{'\n'}
              • Ensure clear, well-lit images{'\n'}
              • Keep text readable and unobstructed
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
              placeholder="e.g., Python Programming Quiz - Chapter 1"
              disabled={uploading}
            />
          </Card.Content>
        </Card>

        {/* Image Selection */}
        <Card style={[styles.card, { backgroundColor: theme.colors.surface }]}>
          <Card.Content>
            <Title style={[styles.cardTitle, { color: theme.colors.onSurface }]}>Step 2: Upload Question Paper</Title>
            
            {selectedImage ? (
              <View style={styles.imageContainer}>
                <Image source={{ uri: selectedImage.uri }} style={styles.selectedImage} />
                <Paragraph style={[styles.imageInfo, { color: theme.colors.onSurfaceVariant }]}>
                  Image selected: {selectedImage.width}x{selectedImage.height}
                </Paragraph>
                <Button
                  mode="outlined"
                  onPress={showImagePicker}
                  style={styles.changeButton}
                  disabled={uploading}
                >
                  Change Image
                </Button>
              </View>
            ) : (
              <View style={[styles.selectImageContainer, { borderColor: theme.colors.outline }]}>
                <Paragraph style={[styles.selectImageText, { color: theme.colors.onSurfaceVariant }]}>
                  No image selected
                </Paragraph>
                <Button
                  mode="contained"
                  onPress={showImagePicker}
                  style={styles.selectButton}
                  disabled={uploading}
                >
                  Select Image
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
              The system will automatically extract questions and answers using OCR technology.
            </Paragraph>
            
            <Button
              mode="contained"
              onPress={uploadPaper}
              style={[styles.uploadButton, { backgroundColor: theme.colors.primary }]}
              disabled={uploading || !paperName.trim() || !selectedImage}
              contentStyle={styles.uploadButtonContent}
            >
              {uploading ? (
                <>
                  <ActivityIndicator color="white" size="small" />
                  <Paragraph style={styles.uploadingText}>  Processing...</Paragraph>
                </>
              ) : (
                'Upload & Process Paper'
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
  uploadDescription: {
    marginBottom: 20,
    textAlign: 'center',
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
