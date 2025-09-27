import axios from "axios";
import AsyncStorage from "@react-native-async-storage/async-storage";
import { Platform } from "react-native";

// Get local IP for same WiFi network access
const getAPIUrl = () => {
  const url=process.env.EXPO_PUBLIC_API_URL;
  return url; // Use same IP for iOS as well
};

const API_BASE_URL = getAPIUrl();
const api = axios.create({
  baseURL: API_BASE_URL,
  timeout: 30000, // Increased timeout for image uploads
});

// Request interceptor to add auth token
api.interceptors.request.use(async (config) => {
  const token = await AsyncStorage.getItem("authToken");
  if (token) {
    config.headers.Authorization = `Bearer ${token}`;
    // Debug: Log token presence (first and last 10 characters for security)
    console.log(
      `🔑 Using auth token: ${token.substring(0, 10)}...${token.substring(
        token.length - 10
      )}`
    );
  } else {
    console.log("⚠️ No auth token found in storage");
  }
  return config;
});

// Response interceptor for error handling
api.interceptors.response.use(
  (response) => response,
  async (error) => {
    if (error.response?.status === 401) {
      console.log("🚫 401 Unauthorized - Clearing stored auth data");
      // Handle unauthorized access
      await AsyncStorage.removeItem("authToken");
      await AsyncStorage.removeItem("userData");
    }

    // Log error details for debugging
    console.log("🔴 API Error:", {
      status: error.response?.status,
      message: error.response?.data?.error || error.message,
      url: error.config?.url,
    });

    return Promise.reject(error);
  }
);

export const authService = {
  login: async (username: string, password: string) => {
    const response = await api.post("/api/auth/login", { username, password });
    return response.data;
  },

  verify: async () => {
    const response = await api.get("/api/auth/verify");
    return response.data;
  },
};

export const paperService = {
  getAll: async () => {
    const response = await api.get("/api/papers");
    return response.data;
  },

  getAllPublic: async () => {
    const response = await api.get("/api/papers/public");
    return response.data;
  },

  upload: async (formData: FormData) => {
    const response = await api.post("/api/papers/upload", formData, {
      headers: {
        "Content-Type": "multipart/form-data",
      },
      timeout: 60000, // 60 seconds for image upload
    });
    return response.data;
  },

  getDetails: async (paperId: string) => {
    const response = await api.get(`/api/papers/${paperId}`);
    return response.data;
  },

  delete: async (paperId: string) => {
    const response = await api.delete(`/api/papers/${paperId}`);
    return response.data;
  },
};

export const submissionService = {
  submit: async (formData: FormData) => {
    const response = await api.post("/api/submissions/submit", formData, {
      headers: {
        "Content-Type": "multipart/form-data",
      },
      timeout: 60000, // 60 seconds for image upload
    });
    return response.data;
  },

  getByPaperId: async (paperId: number) => {
    const response = await api.get(`/api/submissions/paper/${paperId}`);
    return response.data;
  },

  getSubmissions: async (paperId: string) => {
    const response = await api.get(`/api/submissions/paper/${paperId}`);
    return response.data;
  },

  getDetails: async (submissionId: string) => {
    const response = await api.get(`/api/submissions/${submissionId}`);
    return response.data;
  },
};

export const questionService = {
  // Get all questions for a paper
  getQuestionsByPaper: async (paperId: string) => {
    const response = await api.get(`/api/questions/paper/${paperId}`);
    return response.data;
  },

  // Get a specific question by ID
  getQuestion: async (questionId: string) => {
    const response = await api.get(`/api/questions/${questionId}`);
    return response.data;
  },

  // Create a new question
  createQuestion: async (questionData: {
    paper_id: number;
    question_number: number;
    question_text?: string;
    correct_option?: string;
    correct_options?: string[];
    page_number?: number;
    question_type?: string;
    options?: any;
    weightages?: any;
    points_per_blank?: number;
  }) => {
    const response = await api.post("/api/questions", questionData);
    return response.data;
  },

  // Update a question
  updateQuestion: async (
    questionId: string,
    questionData: {
      question_number?: number;
      question_text?: string;
      correct_option?: string;
      correct_options?: string[];
      page_number?: number;
      question_type?: string;
      options?: any;
      weightages?: any;
      points_per_blank?: number;
    }
  ) => {
    const response = await api.put(
      `/api/questions/${questionId}`,
      questionData
    );
    return response.data;
  },

  // Delete a question
  deleteQuestion: async (questionId: string) => {
    const response = await api.delete(`/api/questions/${questionId}`);
    return response.data;
  },
};

export const manualTestService = {
  // Create a new manual test
  create: async (testData: {
    testName: string;
    totalMarks: number;
    questions: Array<{
      questionNumber: number;
      questionText: string;
      isMultipleChoice: boolean;
      options: Array<{
        id: string;
        text: string;
        isCorrect: boolean;
        weight: number;
      }>;
      totalMarks: number;
    }>;
  }) => {
    const response = await api.post("/api/manual-tests/create-manual", testData);
    return response.data;
  },

  // Get manual test details
  getDetails: async (testId: string) => {
    const response = await api.get(`/api/manual-tests/manual/${testId}`);
    return response.data;
  },

  // Update manual test
  update: async (testId: string, testData: {
    testName: string;
    totalMarks: number;
    questions: Array<{
      questionNumber: number;
      questionText: string;
      isMultipleChoice: boolean;
      options: Array<{
        id: string;
        text: string;
        isCorrect: boolean;
        weight: number;
      }>;
      totalMarks: number;
    }>;
  }) => {
    const response = await api.put(`/api/manual-tests/manual/${testId}`, testData);
    return response.data;
  },
};

export default api;
