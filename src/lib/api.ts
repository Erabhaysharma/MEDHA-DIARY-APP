import axios from 'axios';
import Constants from 'expo-constants';
import { supabase } from './supabase';

const API_URL = Constants.expoConfig?.extra?.apiUrl as string || 'http://10.0.2.2:8000';
// 10.0.2.2 = Android emulator localhost
// For physical device use your computer's local IP e.g. http://192.168.1.x:8000

export const api = axios.create({
  baseURL: API_URL,
  timeout: 60000, // 60s for RAG calls
  headers: { 'Content-Type': 'application/json' },
});

// Auto-attach JWT to every request
api.interceptors.request.use(async (config) => {
  const { data: { session } } = await supabase.auth.getSession();
  if (session?.access_token) {
    config.headers.Authorization = `Bearer ${session.access_token}`;
  }
  return config;
});

// Handle expired token
api.interceptors.response.use(
  (response) => response,
  async (error) => {
    if (error.response?.status === 401) {
      await supabase.auth.signOut();
    }
    return Promise.reject(error);
  }
);