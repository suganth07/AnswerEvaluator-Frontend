import React, { useState, useEffect } from "react";
import {
  View,
  StyleSheet,
  Alert,
  ScrollView,
  Image,
  FlatList,
  Text,
} from "react-native";
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
} from "react-native-paper";
import * as ImagePicker from "expo-image-picker";
import { paperService, submissionService } from "../../services/api";
import { router } from "expo-router";

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
  const [papers, setPapers] = useState<Paper[]>([]);
  const [selectedPaper, setSelectedPaper] = useState<Paper | null>(null);
  const [selectedImages, setSelectedImages] = useState<any[]>([]);

  const getQuestionTypeInfo = (questionType: string) => {
    switch (questionType) {
      case "omr":
        return {
          label: "OMR (Fill Circles)",
          color: "#2196F3",
          icon: "circle-outline",
          instruction: "Fill the circles completely for your chosen answers",
        };
      case "traditional":
        return {
          label: "Traditional (Mark with ✓)",
          color: "#4CAF50",
          icon: "text-box-outline",
          instruction: "Mark your chosen answers with ✓ or clear marks",
        };
      case "mixed":
        return {
          label: "Mixed (OMR + Traditional)",
          color: "#FF9800",
          icon: "format-list-bulleted",
          instruction: "Follow the specific format for each question type",
        };
      default:
        return {
          label: "Traditional (Mark with ✓)",
          color: "#4CAF50",
          icon: "text-box-outline",
          instruction: "Mark your chosen answers with ✓ or clear marks",
        };
    }
  };
  const [submitting, setSubmitting] = useState(false);
  const [loadingPapers, setLoadingPapers] = useState(true);

  useEffect(() => {
    loadPapers();
  }, []);

  // Reset images when paper selection changes
  useEffect(() => {
    setSelectedImages([]);
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
        // For multi-page, add to existing images
        setSelectedImages((prev) => [...prev, result.assets[0]]);
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
      "Select Answer Sheet",
      isMultiPage
        ? `This question paper has ${maxPages} pages. You can select multiple images.`
        : "Choose how you want to select your answer sheet",
      [
        { text: "Take Photo", onPress: takePhoto },
        {
          text: isMultiPage ? "Select Multiple" : "Gallery",
          onPress: selectImages,
        },
        { text: "Cancel", style: "cancel" },
      ]
    );
  };

  const submitAnswers = async () => {
    if (!studentName.trim()) {
      Alert.alert("Error", "Please enter your name");
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
    if (isMultiPage && selectedImages.length !== selectedPaper.total_pages) {
      Alert.alert(
        "Page Count Mismatch",
        `This question paper has ${selectedPaper.total_pages} pages, but you selected ${selectedImages.length} image(s). Please select exactly ${selectedPaper.total_pages} images - one for each page.`,
        [{ text: "OK" }]
      );
      return;
    }

    setSubmitting(true);
    try {
      const formData = new FormData();
      formData.append("studentName", studentName.trim());
      formData.append("paperId", selectedPaper.id.toString());

      if (isMultiPage) {
        // For multi-page papers, append multiple files
        selectedImages.forEach((image, index) => {
          const imageFile = {
            uri: image.uri,
            type: "image/jpeg",
            name: `answer-sheet-page-${index + 1}.jpg`,
          } as any;

          formData.append("answerSheets", imageFile);
        });
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
              setSelectedPaper(null);
              setSelectedImages([]);
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
            <Title style={styles.instructionsTitle}>
              Submission Instructions
            </Title>
            <Paragraph style={styles.instructionsText}>
              • Select the correct question paper{"\n"}• Write your answers
              clearly on the sheet{"\n"}• Mark your chosen answers with ✓ or
              circles{"\n"}• Ensure good lighting and clear image{"\n"}• Keep
              the image straight and readable
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
        <Card style={styles.card}>
          <Card.Content>
            <Title style={styles.cardTitle}>
              Step 2: Select Question Paper
            </Title>

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
                          <View style={styles.selectedChipsContainer}>
                            <Chip
                              mode="outlined"
                              textStyle={{
                                color: getQuestionTypeInfo(
                                  selectedPaper.question_type || "traditional"
                                ).color,
                                fontSize: 11,
                              }}
                              style={{
                                borderColor: getQuestionTypeInfo(
                                  selectedPaper.question_type || "traditional"
                                ).color,
                                marginBottom: 5,
                              }}
                              compact
                            >
                              {
                                getQuestionTypeInfo(
                                  selectedPaper.question_type || "traditional"
                                ).label
                              }
                            </Chip>
                            <Chip
                              mode="outlined"
                              textStyle={{ fontSize: 11 }}
                              compact
                            >
                              {selectedPaper.question_count || 0} questions •{" "}
                              {selectedPaper.total_pages || 1} page
                              {(selectedPaper.total_pages || 1) > 1 ? "s" : ""}
                            </Chip>
                          </View>
                        </View>
                        <Paragraph style={styles.selectedPaperDate}>
                          Created: {formatDate(selectedPaper.uploaded_at)}
                        </Paragraph>
                        <View
                          style={[
                            styles.typeInstructionContainer,
                            { backgroundColor: "#e8f5e8" },
                          ]}
                        >
                          <Paragraph
                            style={[
                              styles.typeInstructionText,
                              { color: "#2e7d32" },
                            ]}
                          >
                            📝{" "}
                            {
                              getQuestionTypeInfo(
                                selectedPaper.question_type || "traditional"
                              ).instruction
                            }
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
                        description={`${
                          item.question_count || 0
                        } questions • ${formatDate(item.uploaded_at)}`}
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
        </Card>
        {/* Answer Sheet Upload */}
        <Card style={styles.card}>
          <Card.Content>
            <Title style={styles.cardTitle}>
              Step 3: Upload Answer Sheet
              {selectedPaper && selectedPaper.total_pages > 1 ? "s" : ""}
            </Title>

            {selectedImages.length > 0 ? (
              <View style={styles.imageContainer}>
                <FlatList
                  data={selectedImages}
                  keyExtractor={(item, index) => index.toString()}
                  renderItem={({ item, index }) => (
                    <View style={styles.imageItem}>
                      <Paragraph style={styles.pageLabel}>
                        Page {index + 1}
                      </Paragraph>
                      <Image
                        source={{ uri: item.uri }}
                        style={styles.selectedImage}
                      />
                      <Paragraph style={styles.imageInfo}>
                        {item.width}x{item.height}
                      </Paragraph>
                    </View>
                  )}
                  horizontal
                  showsHorizontalScrollIndicator={false}
                />
                <Button
                  mode="outlined"
                  onPress={showImagePicker}
                  style={styles.changeButton}
                  disabled={submitting}
                >
                  Change Images
                </Button>
              </View>
            ) : (
              <View style={styles.selectImageContainer}>
                <Paragraph style={styles.selectImageText}>
                  No answer sheet
                  {selectedPaper && selectedPaper.total_pages > 1
                    ? "s"
                    : ""}{" "}
                  selected
                </Paragraph>
                {selectedPaper && selectedPaper.total_pages > 1 && (
                  <Paragraph style={styles.selectHelpText}>
                    This question paper has {selectedPaper.total_pages} pages.
                    Please select {selectedPaper.total_pages} images.
                  </Paragraph>
                )}
                <Button
                  mode="contained"
                  onPress={showImagePicker}
                  style={styles.selectButton}
                  disabled={submitting}
                >
                  Select Answer Sheet
                  {selectedPaper && selectedPaper.total_pages > 1 ? "s" : ""}
                </Button>
              </View>
            )}
          </Card.Content>
        </Card>{" "}
        {/* Submit Button */}
        <Card style={styles.card}>
          <Card.Content>
            <Title style={styles.cardTitle}>
              Step 4: Submit for Evaluation
            </Title>

            <Button
              mode="contained"
              onPress={submitAnswers}
              style={styles.submitButton}
              disabled={
                submitting ||
                !studentName.trim() ||
                !selectedPaper ||
                selectedImages.length === 0
              }
              contentStyle={styles.submitButtonContent}
            >
              {submitting ? (
                <View style={styles.submittingContainer}>
                  <ActivityIndicator color="white" size="small" />
                  <Text style={styles.submittingText}>Evaluating...</Text>
                </View>
              ) : (
                "Submit Answer Sheet"
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
    backgroundColor: "#f5f5f5",
  },
  loadingContainer: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
    backgroundColor: "#f5f5f5",
  },
  loadingText: {
    marginTop: 10,
    color: "#666",
  },
  header: {
    backgroundColor: "white",
    padding: 20,
    paddingTop: 60,
    elevation: 2,
  },
  headerTitle: {
    fontSize: 24,
    fontWeight: "bold",
    color: "#333",
  },
  headerSubtitle: {
    color: "#666",
    marginTop: 4,
  },
  backButton: {
    alignSelf: "flex-start",
    marginTop: 10,
  },
  content: {
    padding: 20,
  },
  instructionsCard: {
    marginBottom: 20,
    backgroundColor: "#e8f5e8",
    elevation: 2,
  },
  instructionsTitle: {
    color: "#2e7d32",
    marginBottom: 10,
  },
  instructionsText: {
    color: "#2e7d32",
    lineHeight: 20,
  },
  card: {
    marginBottom: 20,
    elevation: 3,
  },
  cardTitle: {
    fontSize: 18,
    fontWeight: "bold",
    marginBottom: 15,
    color: "#333",
  },
  input: {
    marginBottom: 10,
  },
  noPapersContainer: {
    alignItems: "center",
    paddingVertical: 40,
  },
  noPapersText: {
    color: "#999",
    textAlign: "center",
  },
  selectedPaperContainer: {
    marginVertical: 10,
  },
  selectedPaperCard: {
    backgroundColor: "#e3f2fd",
  },
  selectedPaperHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "flex-start",
    marginBottom: 8,
  },
  selectedPaperTitle: {
    flex: 1,
    marginRight: 10,
    color: "#1976d2",
  },
  selectedChipsContainer: {
    flexDirection: "column",
    alignItems: "flex-end",
    gap: 5,
  },
  selectedPaperDate: {
    color: "#1976d2",
    marginBottom: 15,
  },
  typeInstructionContainer: {
    padding: 12,
    borderRadius: 8,
    marginBottom: 15,
  },
  typeInstructionText: {
    fontSize: 14,
    fontWeight: "500",
    textAlign: "center",
  },
  changePaperButton: {
    borderColor: "#1976d2",
  },
  paperItem: {
    paddingVertical: 12,
  },
  paperItemTitle: {
    fontWeight: "bold",
  },
  imageContainer: {
    alignItems: "center",
  },
  imageItem: {
    width: 120,
    marginRight: 10,
    alignItems: "center",
  },
  pageLabel: {
    fontSize: 12,
    fontWeight: "bold",
    marginBottom: 5,
    color: "#666",
  },
  selectedImage: {
    width: "100%",
    height: 80,
    borderRadius: 8,
    marginBottom: 5,
    resizeMode: "cover",
  },
  imageInfo: {
    color: "#666",
    fontSize: 10,
    textAlign: "center",
  },
  changeButton: {
    marginTop: 15,
  },
  selectImageContainer: {
    alignItems: "center",
    paddingVertical: 40,
    borderWidth: 2,
    borderColor: "#ddd",
    borderStyle: "dashed",
    borderRadius: 8,
  },
  selectImageText: {
    color: "#999",
    marginBottom: 15,
  },
  selectHelpText: {
    color: "#999",
    marginBottom: 20,
    textAlign: "center",
    fontSize: 14,
  },
  selectButton: {
    paddingHorizontal: 20,
  },
  submitDescription: {
    color: "#666",
    marginBottom: 20,
    textAlign: "center",
  },
  submitButton: {
    paddingVertical: 8,
    backgroundColor: "#4caf50",
  },
  submitButtonContent: {
    paddingVertical: 8,
    flexDirection: "row",
    alignItems: "center",
  },
  submittingContainer: {
    flexDirection: "row",
    alignItems: "center",
  },
  submittingText: {
    color: "white",
    marginLeft: 8,
  },
});
