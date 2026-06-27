import { useEffect, useState, useCallback ,useRef} from 'react';
import {
  View, Text, ScrollView, TouchableOpacity,
  StyleSheet, ActivityIndicator, Linking,Alert,AppState, AppStateStatus,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { router, useFocusEffect } from 'expo-router';
import { useTheme } from '../../src/contexts/ThemeContext';
import { useAuth } from '../../src/contexts/AuthContext';
import { FONT_SIZE, SPACING, BORDER_RADIUS, FONT_WEIGHT } from '../../src/constants/theme';
import { getAstroProfile, AstroProfile } from '../../src/Services/astroService';
import { openPremiumCheckout } from '../../src/Services/paymentService';

import { verifyPremium } from '../../src/Services/astroService';  // ← add this


const PREMIUM_PRICE  = '₹99/month';
//const PAYMENT_LINK   = 'https://rzp.io/l/YOUR_RAZORPAY_LINK'; // replace with your Razorpay link

const FEATURES = [
  { icon: 'planet-outline',       text: 'Daily rasiphal based on your birth chart' },
  { icon: 'chatbubble-ellipses-outline', text: 'Chat with Astro Medha about your future' },
  { icon: 'notifications-outline', text: 'Morning cosmic notifications daily' },
  { icon: 'heart-outline',        text: 'Love, career & life guidance' },
  { icon: 'book-outline',         text: 'Diary-fused personal astrology insights' },
];

const ZODIAC_EMOJI: Record<string, string> = {
  Aries: '♈', Taurus: '♉', Gemini: '♊', Cancer: '♋',
  Leo: '♌', Virgo: '♍', Libra: '♎', Scorpio: '♏',
  Sagittarius: '♐', Capricorn: '♑', Aquarius: '♒', Pisces: '♓',
};

export default function AstroScreen() {
  const { colors: C }  = useTheme();
  const { user }       = useAuth();
  const [profile,      setProfile]  = useState<AstroProfile | null>(null);
  const [loading,      setLoading]  = useState(true);
  const hasRedirected  = useRef(false); 

    useFocusEffect(
    useCallback(() => {
      // Reset on every focus so fresh check happens
      // but only auto-redirect once per mount
      loadProfile();
    }, [user])
  );

  const loadProfile = async () => {
    setLoading(true);
    try {
      const p = await getAstroProfile();
      setProfile(p);

      // ← Only auto-redirect if user didn't just come back from chat
      if (!hasRedirected.current) {
        if (p.is_premium && p.astro_onboarded) {
          hasRedirected.current = true;
          router.replace('/astro-chat');
          return;
        }
        if (p.is_premium && !p.astro_onboarded) {
          hasRedirected.current = true;
          router.replace('/astro-onboarding');
          return;
        }
      }
    } catch (e) {
      console.warn('astro profile error', e);
    }
    setLoading(false);
  };


 const handleSubscribe = async () => {
  try {
    setLoading(true);
    await openPremiumCheckout();
  } catch (e) {
    Alert.alert('Error', 'Could not open payment. Please try again.');
  } finally {
    setLoading(false);
  }
};
const handleAlreadyPaid = async () => {
  // Re-fetch profile to get latest is_premium value
  setLoading(true);
  try {
    const p = await getAstroProfile();
    setProfile(p);

    if (p.is_premium && p.astro_onboarded) {
      // Already fully set up — go straight to chat
      router.replace('/astro-chat');
      return;
    }

    if (p.is_premium && !p.astro_onboarded) {
      // Premium but hasn't filled birth details yet
      router.push('/astro-onboarding');
      return;
    }

    // Not premium — show alert
    Alert.alert(
      'Premium Not Active',
      'Your premium subscription is not active yet. If you just completed payment, please wait a few minutes and try again.\n\nIf the issue persists, contact support.',
      [
        { text: 'Try Again',    onPress: handleAlreadyPaid },
        { text: 'Subscribe Now', onPress: handleSubscribe  },
        { text: 'Cancel',       style: 'cancel'           },
      ]
    );
  } catch (e) {
    Alert.alert('Error', 'Could not verify your subscription. Please try again.');
  } finally {
    setLoading(false);

  }


  const appStateRef= useRef<AppStateStatus>('active');
  const checkingPremiumRef = useRef(false);

// ── Detect when user returns from browser after payment ──
  useEffect(() => {
    const sub = AppState.addEventListener('change', async (nextState) => {
      // App came back to foreground from background/browser
      if (
        appStateRef.current === 'background' &&
        nextState === 'active' &&
        !checkingPremiumRef.current
      ) {
        checkingPremiumRef.current = true;
        try {
          const status = await verifyPremium();
          if (status.is_premium) {
            // Premium activated — route accordingly
            if (status.astro_onboarded) {
              router.replace('/astro-chat');
            } else {
              router.replace('/astro-onboarding');
            }
          }
        } catch (e) {
          console.warn('Premium check error:', e);
        } finally {
          checkingPremiumRef.current = false;
        }
      }
      appStateRef.current = nextState;
    });

    return () => sub.remove();
  }, []);
};
  return (
    <SafeAreaView style={[p.safe, { backgroundColor: C.background }]} edges={['top']}>
      <ScrollView contentContainerStyle={p.scroll} showsVerticalScrollIndicator={false}>

        {/* Star header */}
        <View style={p.heroWrap}>
          <View style={[p.heroBubble, { backgroundColor: C.primaryFaint, borderColor: C.primary + '30' }]}>
            <Text style={p.heroEmoji}>🔮</Text>
          </View>
          <Text style={[p.heroTitle, { color: C.textPrimary }]}>Astro Medha</Text>
          <Text style={[p.heroSub, { color: C.textMuted }]}>
            Your personal astrology guide,{'\n'}powered by your diary and the cosmos
          </Text>
        </View>

        {/* Price card */}
        <View style={[p.priceCard, { backgroundColor: C.surface, borderColor: C.primary + '50' }]}>
          <View style={p.priceTop}>
            <View>
              <Text style={[p.priceLabel, { color: C.textMuted }]}>Premium</Text>
              <Text style={[p.priceAmount, { color: C.textPrimary }]}>{PREMIUM_PRICE}</Text>
            </View>
            <View style={[p.priceBadge, { backgroundColor: C.primaryFaint }]}>
              <Text style={[p.priceBadgeText, { color: C.primary }]}>✨ Unlock all</Text>
            </View>
          </View>
          <Text style={[p.priceSub, { color: C.textMuted }]}>
            Cancel anytime · No hidden charges
          </Text>
        </View>

        {/* Features list */}
        <Text style={[p.featuresLabel, { color: C.textMuted }]}>What you get</Text>
        {FEATURES.map((f, i) => (
          <View key={i} style={[p.featureRow, { backgroundColor: C.surface, borderColor: C.border }]}>
            <View style={[p.featureIcon, { backgroundColor: C.primaryFaint }]}>
              <Ionicons name={f.icon as any} size={18} color={C.primary} />
            </View>
            <Text style={[p.featureText, { color: C.textPrimary }]}>{f.text}</Text>
          </View>
        ))}

        {/* Testimonial / trust */}
        <View style={[p.trustCard, { backgroundColor: C.surface, borderColor: C.border }]}>
          <Text style={[p.trustText, { color: C.textMuted }]}>
            "Medha knows me better than any astrologer I've visited. It actually reads my diary before giving advice."
          </Text>
          <Text style={[p.trustAuthor, { color: C.primary }]}>— Beta user, Scorpio ♏</Text>
        </View>

        {/* Subscribe button */}
        {/* Subscribe button — only shown when NOT premium */}
        {!profile?.is_premium && (
          <>
            <TouchableOpacity
              style={[p.subscribeBtn, { backgroundColor: C.primary }]}
              onPress={handleSubscribe}
              activeOpacity={0.85}
            >
              <Ionicons name="star" size={18} color={C.background} />
              <Text style={[p.subscribeBtnText, { color: C.background }]}>
                Unlock Astro Medha — {PREMIUM_PRICE}
              </Text>
            </TouchableOpacity>

            <TouchableOpacity onPress={handleAlreadyPaid} activeOpacity={0.8}>
              <Text style={[p.alreadyPaid, { color: C.textMuted }]}>
                Already paid?{' '}
                <Text style={{ color: C.primary }}>Tap here to continue →</Text>
              </Text>
            </TouchableOpacity>

            <Text style={[p.disclaimer, { color: C.textMuted }]}>
              Payment is processed securely via Razorpay. After payment,
              your premium access is activated within minutes.
            </Text>
          </>
        )}

        {/* Already premium but not onboarded — show continue button */}
        {profile?.is_premium && !profile?.astro_onboarded && (
          <TouchableOpacity
            style={[p.subscribeBtn, { backgroundColor: C.primary }]}
            onPress={() => router.push('/astro-onboarding')}
            activeOpacity={0.85}
          >
            <Ionicons name="star-outline" size={18} color={C.background} />
            <Text style={[p.subscribeBtnText, { color: C.background }]}>
              Complete your setup →
            </Text>
          </TouchableOpacity>
        )}

        <View style={{ height: 40 }} />
      </ScrollView>
    </SafeAreaView>
  );
}

const p = StyleSheet.create({
  safe:   { flex: 1 },
  scroll: { padding: SPACING.md },

  heroWrap:  { alignItems: 'center', paddingVertical: SPACING.xl, gap: SPACING.sm },
  heroBubble:{
    width: 80, height: 80, borderRadius: 40,
    alignItems: 'center', justifyContent: 'center',
    borderWidth: 1, marginBottom: SPACING.sm,
  },
  heroEmoji: { fontSize: 36 },
  heroTitle: { fontSize: 28, fontWeight: FONT_WEIGHT.bold, textAlign: 'center' },
  heroSub:   { fontSize: FONT_SIZE.sm, textAlign: 'center', lineHeight: 20 },

  priceCard: {
    borderRadius:  BORDER_RADIUS.xl,
    borderWidth:   1.5,
    padding:       SPACING.md,
    marginBottom:  SPACING.lg,
  },
  priceTop:       { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 6 },
  priceLabel:     { fontSize: FONT_SIZE.xs, fontWeight: FONT_WEIGHT.semibold, textTransform: 'uppercase', letterSpacing: 0.8 },
  priceAmount:    { fontSize: 28, fontWeight: FONT_WEIGHT.bold },
  priceBadge:     { borderRadius: BORDER_RADIUS.full, paddingHorizontal: 12, paddingVertical: 6 },
  priceBadgeText: { fontSize: FONT_SIZE.sm, fontWeight: FONT_WEIGHT.semibold },
  priceSub:       { fontSize: FONT_SIZE.xs },

  featuresLabel: {
    fontSize: FONT_SIZE.xs, fontWeight: FONT_WEIGHT.semibold,
    letterSpacing: 0.8, textTransform: 'uppercase',
    marginBottom: SPACING.sm,
  },
  featureRow: {
    flexDirection: 'row', alignItems: 'center', gap: 12,
    borderRadius: BORDER_RADIUS.md, borderWidth: 1,
    padding: SPACING.sm, marginBottom: SPACING.xs,
  },
  featureIcon: { width: 36, height: 36, borderRadius: BORDER_RADIUS.sm, alignItems: 'center', justifyContent: 'center' },
  featureText: { flex: 1, fontSize: FONT_SIZE.sm, lineHeight: 18 },

  trustCard: {
    borderRadius: BORDER_RADIUS.lg, borderWidth: 1,
    padding: SPACING.md, marginTop: SPACING.md, marginBottom: SPACING.lg,
    gap: SPACING.xs,
  },
  trustText:   { fontSize: FONT_SIZE.sm, lineHeight: 20, fontStyle: 'italic' },
  trustAuthor: { fontSize: FONT_SIZE.xs, fontWeight: FONT_WEIGHT.semibold },

  subscribeBtn: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'center',
    gap: 8, borderRadius: BORDER_RADIUS.full,
    paddingVertical: SPACING.md, marginBottom: SPACING.sm,
  },
  subscribeBtnText: { fontSize: FONT_SIZE.md, fontWeight: FONT_WEIGHT.bold },
  alreadyPaid:      { textAlign: 'center', fontSize: FONT_SIZE.sm, marginBottom: SPACING.md },
  disclaimer:       { fontSize: 11, textAlign: 'center', lineHeight: 16, opacity: 0.6 },
});