import React, { useState, useEffect } from "react";
import {
  View,
  StyleSheet,
  Alert,
  ScrollView,
  Image,
  FlatList,
  TouchableOpacity,
  Dimensions,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import {
  TextInput,
  Button,
  Card,
  Title,
  Paragraph,
  ActivityIndicator,
  Chip,
  IconButton,
  Text,
} from "react-native-paper";
import { LinearGradient } from "expo-linear-gradient";
import { Ionicons } from "@expo/vector-icons";
import * as ImagePicker from "expo-image-picker";
import { paperService, authService } from "./../services/api";
import { router } from "expo-router";
import { useTheme } from "./../context/ThemeContext";
import { useAuth } from "./../context/AuthContext";
import AsyncStorage from "@react-native-async-storage/async-storage";

const { width } = Dimensions.get("window");

export default function UploadPaper() {
  const [paperName, setPaperName] = useState("");
  const [selectedImages, setSelectedImages] = useState<any[]>([]);
  const [uploading, setUploading] = useState(false);

  const { theme, isDarkMode } = useTheme();
  const { isAuthenticated, logout } = useAuth();

  // Check authentication status on component mount
  useEffect(() => {
    checkAuthStatus();
  }, []);

  const checkAuthStatus = async () => {
    try {
      if (!isAuthenticated) {
        Alert.alert(
          "Authentication Required",
          "Please log in to upload question papers.",
          [{ text: "OK", onPress: () => router.push("/login") }]
        );
        return;
      }

      // Verify token with backend
      await authService.verify();
    } catch (error: any) {
      console.error("Auth verification failed:", error);
      if (
        error.response?.status === 401 ||
        error.response?.data?.error?.includes("Invalid token")
      ) {
        Alert.alert(
          "Session Expired",
          "Your session has expired. Please log in again.",
          [
            {
              text: "Login",
              onPress: async () => {
                await logout();
                router.push("/login");
              },
            },
          ]
        );
      }
    }
  };

  const selectImages = async () => {
    // Request permission to access camera and media library
    const { status } = await ImagePicker.requestMediaLibraryPermissionsAsync();
    if (status !== "granted") {
      Alert.alert(
        "Permission needed",
        "Sorry, we need camera roll permissions to make this work!"
      );
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

  const selectMoreImages = async () => {
    // Request permission to access camera and media library
    const { status } = await ImagePicker.requestMediaLibraryPermissionsAsync();
    if (status !== "granted") {
      Alert.alert(
        "Permission needed",
        "Sorry, we need camera roll permissions to make this work!"
      );
      return;
    }

    const remainingSlots = 10 - selectedImages.length;
    const result = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: ImagePicker.MediaTypeOptions.Images,
      allowsMultipleSelection: true,
      selectionLimit: remainingSlots,
      allowsEditing: false,
      quality: 0.8,
    });

    if (!result.canceled && result.assets) {
      setSelectedImages((prev) => [...prev, ...result.assets]);
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
      setSelectedImages((prev) => [...prev, result.assets[0]]);
    }
  };

  const showImagePicker = () => {
    Alert.alert(
      "Add Question Paper Pages",
      "Choose how you want to add question paper pages",
      [
        { text: "Take Photo", onPress: takePhoto },
        { text: "Select Multiple", onPress: selectImages },
        { text: "Cancel", style: "cancel" },
      ]
    );
  };

  const showMoreImagePicker = () => {
    Alert.alert(
      "Add More Question Paper Pages",
      "Choose how you want to add more question paper pages",
      [
        { text: "Take Photo", onPress: takePhoto },
        { text: "Select Multiple", onPress: selectMoreImages },
        { text: "Cancel", style: "cancel" },
      ]
    );
  };

  const removeImage = (index: number) => {
    setSelectedImages((prev) => prev.filter((_, i) => i !== index));
  };

  const reorderImages = (fromIndex: number, toIndex: number) => {
    const newImages = [...selectedImages];
    const [movedItem] = newImages.splice(fromIndex, 1);
    newImages.splice(toIndex, 0, movedItem);
    setSelectedImages(newImages);
  };

  const uploadPaper = async () => {
    if (!paperName.trim()) {
      Alert.alert("Error", "Please enter a paper name");
      return;
    }

    if (selectedImages.length === 0) {
      Alert.alert("Error", "Please select at least one image");
      return;
    }

    // Check authentication before upload
    try {
      await authService.verify();
    } catch (error: any) {
      if (error.response?.status === 401) {
        Alert.alert(
          "Session Expired",
          "Your session has expired. Please log in again.",
          [
            {
              text: "Login",
              onPress: async () => {
                await logout();
                router.push("/login");
              },
            },
          ]
        );
        return;
      }
    }

    setUploading(true);
    try {
      const formData = new FormData();
      formData.append("name", paperName.trim());

      // Add all images to FormData
      selectedImages.forEach((image, index) => {
        const imageFile = {
          uri: image.uri,
          type: "image/jpeg",
          name: `question-paper-page-${index + 1}.jpg`,
        } as any;

        formData.append("papers", imageFile);
      });

      const response = await paperService.upload(formData);

      Alert.alert(
        "Success",
        `Multi-page paper uploaded successfully!\n\n` +
          `Total Pages: ${response.totalPages}\n` +
          `Questions Extracted: ${response.extractedQuestions}\n\n` +
          `Questions per page:\n` +
          response.questionsPerPage
            .map(
              (page: any) => `Page ${page.page}: ${page.questions} questions`
            )
            .join("\n"),
        [
          {
            text: "OK",
            onPress: () => {
              setPaperName("");
              setSelectedImages([]);
              router.back();
            },
          },
        ]
      );
    } catch (error: any) {
      console.error("Upload error:", error);

      if (
        error.response?.status === 401 ||
        error.response?.data?.error?.includes("Invalid token")
      ) {
        Alert.alert(
          "Session Expired",
          "Your session has expired. Please log in again.",
          [
            {
              text: "Login",
              onPress: async () => {
                await logout();
                router.push("/login");
              },
            },
          ]
        );
      } else {
        Alert.alert(
          "Upload Failed",
          error.response?.data?.error || "Failed to upload paper"
        );
      }
    } finally {
      setUploading(false);
    }
  };

  const renderImageItem = ({ item, index }: { item: any; index: number }) => (
    <View style={[styles.imageItem, { backgroundColor: theme.colors.surface }]}>
      <View style={styles.imageHeader}>
        <View
          style={[
            styles.pageIndicator,
            { backgroundColor: isDarkMode ? "#6B7280" : "#E5E7EB" },
          ]}
        >
          <Text
            variant="bodySmall"
            style={{
              color: isDarkMode ? "#F9FAFB" : "#374151",
              fontWeight: "600",
            }}
          >
            {index + 1}
          </Text>
        </View>
        <TouchableOpacity
          onPress={() => removeImage(index)}
          disabled={uploading}
          style={[
            styles.removeButton,
            { backgroundColor: isDarkMode ? "#374151" : "#F3F4F6" },
          ]}
        >
          <Ionicons name="close" size={16} color={theme.colors.onSurface} />
        </TouchableOpacity>
      </View>
      <Image source={{ uri: item.uri }} style={styles.thumbnailImage} />
      <Text
        variant="bodySmall"
        style={[styles.imageSize, { color: theme.colors.onSurfaceVariant }]}
      >
        {Math.round(item.width)}×{Math.round(item.height)}
      </Text>
    </View>
  );

  // Instructions Card Component
  const InstructionsCard = () => (
    <View
      style={[
        styles.instructionsCard,
        { backgroundColor: theme.colors.surface },
      ]}
    >
      <View style={styles.instructionsHeader}>
        <View
          style={[
            styles.instructionsIcon,
            { backgroundColor: isDarkMode ? "#374151" : "#F3F4F6" },
          ]}
        >
          <Ionicons name="information-circle" size={20} color="#8B5CF6" />
        </View>
        <Text
          variant="titleMedium"
          style={[styles.instructionsTitle, { color: theme.colors.onSurface }]}
        >
          Upload Guidelines
        </Text>
      </View>
      <Text
        variant="bodySmall"
        style={[
          styles.instructionsText,
          { color: theme.colors.onSurfaceVariant },
        ]}
      >
        • Upload pages in order (1, 2, 3...)
        {"\n"}• Mark correct answers with ✓ or circle them
        {"\n"}• Maximum 10 pages per paper
        {"\n"}• Ensure clear, well-lit images
      </Text>
    </View>
  );

  // Image Selection Area Component
  const ImageSelectionArea = () => {
    if (selectedImages.length === 0) {
      return (
        <TouchableOpacity
          onPress={showImagePicker}
          disabled={uploading}
          style={[
            styles.emptyImageArea,
            {
              borderColor: theme.colors.outline,
              backgroundColor: isDarkMode ? "#374151" + "20" : "#F9FAFB",
            },
          ]}
        >
          <View style={styles.emptyImageGradient}>
            <View
              style={[
                styles.emptyImageIcon,
                { backgroundColor: isDarkMode ? "#6B7280" : "#E5E7EB" },
              ]}
            >
              <Ionicons
                name="images"
                size={28}
                color={isDarkMode ? "#9CA3AF" : "#6B7280"}
              />
            </View>
            <Text
              variant="titleMedium"
              style={[
                styles.emptyImageTitle,
                { color: theme.colors.onSurface },
              ]}
            >
              Select Question Pages
            </Text>
            <Text
              variant="bodySmall"
              style={[
                styles.emptyImageSubtitle,
                { color: theme.colors.onSurfaceVariant },
              ]}
            >
              Choose multiple pages at once or add them one by one
            </Text>
            <View style={styles.emptyImageActions}>
              <LinearGradient
                colors={["#6366F1", "#8B5CF6"]}
                style={styles.primaryActionButton}
              >
                <Ionicons name="images" size={16} color="white" />
                <Text style={styles.primaryActionText}>
                  Select from Gallery
                </Text>
              </LinearGradient>
            </View>
          </View>
        </TouchableOpacity>
      );
    }

    return (
      <View>
        <View style={styles.imagesHeader}>
          <Text
            variant="titleMedium"
            style={[styles.imagesTitle, { color: theme.colors.onSurface }]}
          >
            Selected Pages ({selectedImages.length}/10)
          </Text>
          <TouchableOpacity
            onPress={() => setSelectedImages([])}
            disabled={uploading}
            style={[
              styles.clearAllButton,
              { backgroundColor: isDarkMode ? "#374151" : "#F3F4F6" },
            ]}
          >
            <Ionicons
              name="trash-outline"
              size={16}
              color={theme.colors.onSurface}
            />
            <Text
              variant="bodySmall"
              style={[styles.clearAllText, { color: theme.colors.onSurface }]}
            >
              Clear All
            </Text>
          </TouchableOpacity>
        </View>

        <FlatList
          data={selectedImages}
          renderItem={renderImageItem}
          keyExtractor={(item, index) => index.toString()}
          horizontal
          showsHorizontalScrollIndicator={false}
          style={styles.imagesList}
          contentContainerStyle={styles.imagesListContent}
        />

        {selectedImages.length < 10 && (
          <TouchableOpacity
            onPress={showMoreImagePicker}
            disabled={uploading}
            style={[
              styles.addMoreButton,
              {
                backgroundColor: theme.colors.surface,
                borderColor: theme.colors.outline,
              },
            ]}
          >
            <Ionicons name="add-circle-outline" size={20} color="#8B5CF6" />
            <Text
              variant="bodyMedium"
              style={[styles.addMoreText, { color: "#8B5CF6" }]}
            >
              Add More Pages ({10 - selectedImages.length} remaining)
            </Text>
          </TouchableOpacity>
        )}
      </View>
    );
  };

  return (
    <SafeAreaView
      style={[styles.safeArea, { backgroundColor: theme.colors.background }]}
      edges={["top", "left", "right"]}
    >
      {/* Header */}
      <View style={styles.header}>
        <TouchableOpacity
          onPress={() => router.back()}
          style={[
            styles.backButton,
            { backgroundColor: isDarkMode ? "#374151" : "#F3F4F6" },
          ]}
        >
          <Ionicons
            name="arrow-back"
            size={24}
            color={theme.colors.onSurface}
          />
        </TouchableOpacity>
        <View style={styles.headerContent}>
          <Text
            variant="headlineMedium"
            style={[styles.headerTitle, { color: theme.colors.onSurface }]}
          >
            Upload Test Paper
          </Text>
          <Text
            variant="bodyMedium"
            style={[
              styles.headerSubtitle,
              { color: theme.colors.onSurfaceVariant },
            ]}
          >
            Scan and process your question papers with AI
          </Text>
        </View>
      </View>

      <ScrollView
        style={[styles.container, { backgroundColor: theme.colors.background }]}
        showsVerticalScrollIndicator={false}
        contentContainerStyle={styles.scrollContent}
      >
        {/* Instructions */}
        <View style={styles.section}>
          <InstructionsCard />
        </View>

        {/* Main Form */}
        <View style={styles.section}>
          <View
            style={[styles.card, { backgroundColor: theme.colors.surface }]}
          >
            {/* Paper Name Input */}
            <View style={styles.formSection}>
              <Text
                variant="titleMedium"
                style={[styles.sectionTitle, { color: theme.colors.onSurface }]}
              >
                Paper Details
              </Text>
              <TextInput
                label="Paper Name"
                value={paperName}
                onChangeText={setPaperName}
                style={styles.input}
                mode="outlined"
                placeholder="e.g: Probability test 2 - BatchX"
                disabled={uploading}
                left={<TextInput.Icon icon="file-document-outline" />}
                theme={{
                  colors: {
                    primary: "#8B5CF6",
                    outline: isDarkMode ? "#6B7280" : "#D1D5DB",
                  },
                }}
              />
            </View>

            {/* Divider */}
            <View
              style={[
                styles.divider,
                { backgroundColor: theme.colors.outline },
              ]}
            />

            {/* Image Selection */}
            <View style={styles.formSection}>
              <ImageSelectionArea />
            </View>

            {/* Upload Summary & Button */}
            {selectedImages.length > 0 && paperName.trim() && (
              <>
                <View
                  style={[
                    styles.divider,
                    { backgroundColor: theme.colors.outline },
                  ]}
                />
                <View style={styles.formSection}>
                  <View
                    style={[
                      styles.summaryContainer,
                      { backgroundColor: isDarkMode ? "#374151" : "#F9FAFB" },
                    ]}
                  >
                    <View style={styles.summaryRow}>
                      <View style={styles.summaryItem}>
                        <Text
                          variant="headlineSmall"
                          style={[
                            styles.summaryNumber,
                            { color: theme.colors.onSurface },
                          ]}
                        >
                          {selectedImages.length}
                        </Text>
                        <Text
                          variant="bodySmall"
                          style={[
                            styles.summaryLabel,
                            { color: theme.colors.onSurfaceVariant },
                          ]}
                        >
                          Pages Ready
                        </Text>
                      </View>
                      <View
                        style={[
                          styles.summaryDivider,
                          { backgroundColor: theme.colors.outline },
                        ]}
                      />
                      <View style={styles.summaryItem}>
                        <Ionicons
                          name="checkmark-circle"
                          size={24}
                          color="#10B981"
                        />
                        <Text
                          variant="bodySmall"
                          style={[
                            styles.summaryLabel,
                            { color: theme.colors.onSurfaceVariant },
                          ]}
                        >
                          Ready to Upload
                        </Text>
                      </View>
                    </View>
                  </View>
                </View>
              </>
            )}

            <TouchableOpacity
              onPress={uploadPaper}
              disabled={
                uploading || !paperName.trim() || selectedImages.length === 0
              }
              style={[
                styles.uploadButtonContainer,
                (!paperName.trim() || selectedImages.length === 0) &&
                  styles.uploadButtonDisabled,
              ]}
            >
              <LinearGradient
                colors={
                  uploading || !paperName.trim() || selectedImages.length === 0
                    ? [
                        isDarkMode ? "#374151" : "#E5E7EB",
                        isDarkMode ? "#4B5563" : "#F3F4F6",
                      ]
                    : ["#6366F1", "#8B5CF6"]
                }
                style={styles.uploadButton}
              >
                {uploading ? (
                  <View style={styles.uploadingContent}>
                    <ActivityIndicator color="white" size="small" />
                    <Text variant="titleMedium" style={styles.uploadButtonText}>
                      Processing {selectedImages.length} page
                      {selectedImages.length > 1 ? "s" : ""}...
                    </Text>
                  </View>
                ) : (
                  <View style={styles.uploadContent}>
                    <Ionicons name="cloud-upload" size={24} color="white" />
                    <Text variant="titleMedium" style={styles.uploadButtonText}>
                      {selectedImages.length > 0
                        ? `Upload ${selectedImages.length} Page${
                            selectedImages.length > 1 ? "s" : ""
                          }`
                        : "Upload Paper"}
                    </Text>
                  </View>
                )}
              </LinearGradient>
            </TouchableOpacity>
          </View>
        </View>

        {/* Bottom Spacer */}
        <View style={styles.bottomSpacer} />
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safeArea: {
    flex: 1,
  },
  header: {
    flexDirection: "row",
    alignItems: "center",
    paddingHorizontal: 20,
    paddingVertical: 15,
    paddingTop: 10,
  },
  backButton: {
    width: 44,
    height: 44,
    borderRadius: 22,
    justifyContent: "center",
    alignItems: "center",
    marginRight: 15,
  },
  headerContent: {
    flex: 1,
  },
  headerTitle: {
    fontWeight: "700",
    marginBottom: 4,
  },
  headerSubtitle: {
    fontSize: 14,
    lineHeight: 20,
  },
  container: {
    flex: 1,
  },
  scrollContent: {
    paddingBottom: 100,
  },
  section: {
    paddingHorizontal: 20,
    marginBottom: 20,
  },

  // Instructions Card
  instructionsCard: {
    borderRadius: 12,
    padding: 16,
    marginBottom: 8,
    elevation: 1,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.05,
    shadowRadius: 2,
  },
  instructionsHeader: {
    flexDirection: "row",
    alignItems: "center",
    marginBottom: 12,
  },
  instructionsIcon: {
    width: 32,
    height: 32,
    borderRadius: 16,
    justifyContent: "center",
    alignItems: "center",
    marginRight: 10,
  },
  instructionsTitle: {
    fontWeight: "600",
  },
  instructionsText: {
    lineHeight: 18,
    fontSize: 13,
  },

  // Form Sections
  formSection: {
    marginBottom: 24,
  },
  sectionTitle: {
    fontWeight: "600",
    marginBottom: 12,
  },
  divider: {
    height: 1,
    marginVertical: 20,
    opacity: 0.5,
  },

  // Card Styles
  card: {
    borderRadius: 16,
    padding: 24,
    elevation: 2,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 8,
  },
  input: {
    marginBottom: 8,
  },

  // Empty Image Area
  emptyImageArea: {
    borderWidth: 2,
    borderStyle: "dashed",
    borderRadius: 12,
    overflow: "hidden",
  },
  emptyImageGradient: {
    padding: 32,
    alignItems: "center",
  },
  emptyImageIcon: {
    width: 64,
    height: 64,
    borderRadius: 32,
    justifyContent: "center",
    alignItems: "center",
    marginBottom: 16,
  },
  emptyImageTitle: {
    fontWeight: "600",
    marginBottom: 8,
    textAlign: "center",
  },
  emptyImageSubtitle: {
    textAlign: "center",
    marginBottom: 20,
    lineHeight: 18,
  },
  emptyImageActions: {
    alignItems: "center",
  },
  primaryActionButton: {
    flexDirection: "row",
    alignItems: "center",
    paddingHorizontal: 20,
    paddingVertical: 10,
    borderRadius: 20,
  },
  primaryActionText: {
    color: "white",
    fontWeight: "600",
    marginLeft: 6,
    fontSize: 14,
  },

  // Images Section
  imagesHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: 16,
  },
  imagesTitle: {
    fontWeight: "600",
  },
  clearAllButton: {
    flexDirection: "row",
    alignItems: "center",
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 20,
  },
  clearAllText: {
    marginLeft: 6,
    fontWeight: "500",
  },
  imagesList: {
    marginBottom: 16,
  },
  imagesListContent: {
    paddingRight: 20,
  },

  // Image Item
  imageItem: {
    width: 120,
    marginRight: 12,
    borderRadius: 12,
    padding: 8,
    elevation: 2,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
  },
  imageHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: 8,
  },
  pageIndicator: {
    width: 24,
    height: 24,
    borderRadius: 12,
    justifyContent: "center",
    alignItems: "center",
  },
  removeButton: {
    width: 24,
    height: 24,
    borderRadius: 12,
    justifyContent: "center",
    alignItems: "center",
  },
  thumbnailImage: {
    width: "100%",
    height: 80,
    borderRadius: 8,
    marginBottom: 8,
    resizeMode: "cover",
  },
  imageSize: {
    fontSize: 10,
    textAlign: "center",
    opacity: 0.7,
  },

  // Add More Button
  addMoreButton: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    paddingVertical: 16,
    borderRadius: 12,
    borderWidth: 2,
    borderStyle: "dashed",
    marginTop: 8,
  },
  addMoreText: {
    marginLeft: 8,
    fontWeight: "600",
  },

  // Upload Section
  summaryContainer: {
    padding: 16,
    borderRadius: 8,
    marginBottom: 20,
  },
  summaryRow: {
    flexDirection: "row",
    justifyContent: "space-around",
    alignItems: "center",
  },
  summaryItem: {
    alignItems: "center",
    flex: 1,
  },
  summaryDivider: {
    width: 1,
    height: 32,
    marginHorizontal: 16,
  },
  summaryNumber: {
    fontWeight: "700",
    marginBottom: 4,
  },
  summaryLabel: {
    fontSize: 12,
    opacity: 0.8,
  },

  // Upload Button
  uploadButtonContainer: {
    borderRadius: 16,
    overflow: "hidden",
  },
  uploadButtonDisabled: {
    opacity: 0.6,
  },
  uploadButton: {
    paddingVertical: 18,
    paddingHorizontal: 24,
    borderRadius: 16,
  },
  uploadContent: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
  },
  uploadingContent: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
  },
  uploadButtonText: {
    color: "white",
    fontWeight: "600",
    marginLeft: 8,
  },

  // Utilities
  bottomSpacer: {
    height: 40,
  },
});
