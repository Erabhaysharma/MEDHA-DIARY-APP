import { api } from '../lib/api';

export type AstroProfile = {
  is_premium:       boolean;
  astro_onboarded:  boolean;
  dob:              string | null;
  birth_time:       string | null;
  birth_place:      string | null;
  zodiac_sign:      string | null;
  display_name:     string | null;
  astro_edit_count: number;        // ← new
  astro_language:   'hindi' | 'english'; // ← new
};

export type DailyForecast = {
  forecast: string;
  date:     string;
  cached:   boolean;
};

export async function getAstroProfile(): Promise<AstroProfile> {
  const { data } = await api.get('/api/astro/profile');
  return data;
}

export async function submitOnboarding(payload: {
  dob:         string;
  birth_time:  string;
  birth_place: string;
}): Promise<{ zodiac_sign: string }> {
  const { data } = await api.post('/api/astro/onboard', payload);
  return data;
}

export async function getDailyForecast(): Promise<DailyForecast> {
  const { data } = await api.get('/api/astro/forecast');
  return data;
}

export async function sendAstroMessage(payload: {
  session_id: string | null;
  message:    string;
}): Promise<{ reply: string; session_id: string }> {
  const { data } = await api.post('/api/astro/chat', payload);
  return data;
}

export async function updateAstroLanguage(language: 'hindi' | 'english'): Promise<void> {
  await api.post('/api/astro/language', { language });
}

export async function verifyPremium(): Promise<{
  is_premium:      boolean;
  astro_onboarded: boolean;
}> {
  const { data } = await api.get('/api/payments/verify-premium');
  return data;
}