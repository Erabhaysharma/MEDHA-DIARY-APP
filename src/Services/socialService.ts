import { api } from '../lib/api';
import { SocialPost, PostComment } from '../types/database';

export async function fetchFeed(page = 0): Promise<SocialPost[]> {
  const { data } = await api.get(`/api/social/feed?page=${page}`);
  return data;
}

export async function createPost(payload: {
  entry_id:     string;
  caption:      string;
  is_anonymous: boolean;
}): Promise<SocialPost> {
  const { data } = await api.post('/api/social/post', payload);
  return data;
}

export async function toggleLike(postId: string): Promise<{ liked: boolean; likes_count: number }> {
  const { data } = await api.post(`/api/social/post/${postId}/like`);
  return data;
}

export async function incrementView(postId: string): Promise<void> {
  await api.post(`/api/social/post/${postId}/view`).catch(() => {}); // fire and forget
}

export async function fetchComments(postId: string): Promise<PostComment[]> {
  const { data } = await api.get(`/api/social/post/${postId}/comments`);
  return data;
}

export async function addComment(postId: string, content: string): Promise<PostComment> {
  const { data } = await api.post(`/api/social/post/${postId}/comment`, { content });
  return data;
}

export type DiaryScore = {
  detail_score:      number;
  emotion_score:     number;
  clarity_score:     number;
  originality_score: number;
  total_score:       number;
  emotional_impact:  'Low' | 'Medium' | 'High';
  feedback:          string;
  improvement:       string;
  can_publish:       boolean;
  threshold:         number;
};

export async function scoreDiary(content: string): Promise<DiaryScore> {
  const { data } = await api.post('/api/social/score-diary', { content });
  return data;
}

export async function generateContent(content: string, formatId: string): Promise<string> {
  const { data } = await api.post('/api/social/generate-content', {
    content,
    format_id: formatId,
  });
  return data.result;
}