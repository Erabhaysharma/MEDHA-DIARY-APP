import { api } from '../lib/api';
import { Linking } from 'react-native';

export async function openPremiumCheckout(): Promise<void> {
  const { data } = await api.post('/api/payments/create-link');
  console.log('Payment URL:', data.payment_url);
  await Linking.openURL(data.payment_url);
}