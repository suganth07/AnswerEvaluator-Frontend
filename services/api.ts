import axios from 'axios';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { Platform } from 'react-native';

// Get local IP for same WiFi network access
const getAPIUrl = () => {
  if (Platform.OS === 'android') {
    // For Android Expo Go, use your computer's IP address
    // Updated to use your actual local IP address
    return 'http://10.128.13.32:3000';
  }
  return 'http://10.128.13.32:3000'; // Use same IP for iOS as well
};

const API_BASE_URL = getAPIUrl();

const api = axios.create({
  baseURL: API_BASE_URL,
  timeout: 30000, // Increased timeout for image uploads
});

// Request interceptor to add auth token
api.interceptors.request.use(async (config) => {
  const token = await AsyncStorage.getItem('authToken');
  if (token) {
    config.headers.Authorization = `Bearer ${token}`;
    // Debug: Log token presence (first and last 10 characters for security)
    console.log(`🔑 Using auth token: ${token.substring(0, 10)}...${token.substring(token.length - 10)}`);
  } else {
    console.log('⚠️ No auth token found in storage');
  }
  return config;
});

// Response interceptor for error handling
api.interceptors.response.use(
  (response) => response,
  async (error) => {
    if (error.response?.status === 401) {
      console.log('🚫 401 Unauthorized - Clearing stored auth data');
      // Handle unauthorized access
      await AsyncStorage.removeItem('authToken');
      await AsyncStorage.removeItem('userData');
    }
    
    // Log error details for debugging
    console.log('🔴 API Error:', {
      status: error.response?.status,
      message: error.response?.data?.error || error.message,
      url: error.config?.url
    });
    
    return Promise.reject(error);
  }
);

export const authService = {
  login: async (username: string, password: string) => {
    const response = await api.post('/api/auth/login', { username, password });
    return response.data;
  },
  
  verify: async () => {
    const response = await api.get('/api/auth/verify');
    return response.data;
  },
};

export const paperService = {
  getAll: async () => {
    const response = await api.get('/api/papers');
    return response.data;
  },
  
  getAllPublic: async () => {
    const response = await api.get('/api/papers/public');
    return response.data;
  },
  
  upload: async (formData: FormData) => {
    const response = await api.post('/api/papers/upload', formData, {
      headers: {
        'Content-Type': 'multipart/form-data',
      },
      timeout: 60000, // 60 seconds for image upload
    });
    return response.data;
  },
  
  getDetails: async (paperId: string) => {
    const response = await api.get(`/api/papers/${paperId}`);
    return response.data;
  },
};

export const submissionService = {
  submit: async (formData: FormData) => {
    const response = await api.post('/api/submissions/submit', formData, {
      headers: {
        'Content-Type': 'multipart/form-data',
      },
      timeout: 60000, // 60 seconds for image upload
    });
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

export default api;
