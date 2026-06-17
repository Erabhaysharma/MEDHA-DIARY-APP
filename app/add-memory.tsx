import { useState } from 'react';
import {
  View, Text, TextInput, TouchableOpacity,
  StyleSheet, ScrollView, Alert, ActivityIndicator, Image,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { router } from 'expo-router';
import * as ImagePicker from 'expo-image-picker';
import { useAuth } from '../src/contexts/AuthContext';
import { useTheme } from '../src/contexts/ThemeContext';
import { supabase } from '../src/lib/supabase';
import * as FileSystem from 'expo-file-system';
import { FONT_SIZE, SPACING, BORDER_RADIUS, FONT_WEIGHT } from '../src/constants/theme';



// atob polyfill for React Native
const toBase64Bytes = (base64: string): Uint8Array => {
  const chars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789+/';
  const lookup = new Uint8Array(256);
  for (let i = 0; i < chars.length; i++) lookup[chars.charCodeAt(i)] = i;

  const cleaned = base64.replace(/=+$/, '');
  const bytes   = new Uint8Array(Math.floor(cleaned.length * 0.75));
  let byteIndex = 0;

  for (let i = 0; i < cleaned.length; i += 4) {
    const a = lookup[cleaned.charCodeAt(i)];
    const b = lookup[cleaned.charCodeAt(i + 1)];
    const c = lookup[cleaned.charCodeAt(i + 2)];
    const d = lookup[cleaned.charCodeAt(i + 3)];

    bytes[byteIndex++] = (a << 2) | (b >> 4);
    if (i + 2 < cleaned.length) bytes[byteIndex++] = ((b & 15) << 4) | (c >> 2);
    if (i + 3 < cleaned.length) bytes[byteIndex++] = ((c & 3) << 6) | d;
  }

  return bytes.slice(0, byteIndex);
};

export default function AddMemoryScreen() {
  const { user }      = useAuth();
  const { colors: C } = useTheme();

  const [description, setDescription] = useState('');
  const [photoUri,    setPhotoUri]    = useState<string | null>(null);
  const [photoFile,   setPhotoFile]   = useState<any>(null);
  const [memoryDate,  setMemoryDate]  = useState(
    new Date().toISOString().split('T')[0]
  );
  const [saving, setSaving] = useState(false);

  // ── Pick image ──────────────────────────────────────────────────────────
  const pickImage = async () => {
    const permission = await ImagePicker.requestMediaLibraryPermissionsAsync();
    if (!permission.granted) {
      Alert.alert('Permission needed', 'Allow access to your photos to add a memory photo.');
      return;
    }

    const result = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: ['images'],
      allowsEditing: true,
      aspect:        [4, 3],
      quality:       0.8,
    });

    if (!result.canceled && result.assets[0]) {
      setPhotoUri(result.assets[0].uri);
      setPhotoFile(result.assets[0]);
    }
  };

  const removePhoto = () => {
    setPhotoUri(null);
    setPhotoFile(null);
  };
  // ── Upload photo to Supabase Storage ─────────────────────────────────────
 const uploadPhoto = async (userId: string): Promise<string | null> => {
  if (!photoFile) return null;

  try {
    const uri        = photoFile.uri;
    const ext        = uri.split('.').pop()?.toLowerCase() ?? 'jpg';
    const filename   = `${userId}/${Date.now()}.${ext}`;
    const mimeType   = ext === 'png' ? 'image/png' : 'image/jpeg';

    const { data: { session } } = await supabase.auth.getSession();
    if (!session) throw new Error('Not authenticated');

    const supabaseUrl = process.env.EXPO_PUBLIC_SUPABASE_URL
      || (supabase as any).supabaseUrl
      || '';

    // Upload using XMLHttpRequest — works natively in React Native
    const uploadResult = await new Promise<{ success: boolean; error?: string }>(
      (resolve) => {
        const xhr = new XMLHttpRequest();
        xhr.open(
          'POST',
          `${supabaseUrl}/storage/v1/object/memories/${filename}`,
        );
        xhr.setRequestHeader('Authorization', `Bearer ${session.access_token}`);
        xhr.setRequestHeader('Content-Type', mimeType);
        xhr.setRequestHeader('x-upsert', 'true');

        xhr.onload = () => {
          if (xhr.status >= 200 && xhr.status < 300) {
            resolve({ success: true });
          } else {
            resolve({ success: false, error: xhr.responseText });
          }
        };

        xhr.onerror = () => resolve({ success: false, error: 'Network error' });

        // Send the file URI directly — XHR handles this in React Native
        xhr.send({ uri, type: mimeType, name: filename } as any);
      }
    );

    if (!uploadResult.success) {
      throw new Error(uploadResult.error ?? 'Upload failed');
    }

    // Get public URL
    const { data } = supabase.storage
      .from('memories')
      .getPublicUrl(filename);

    return data.publicUrl;

  } catch (e: any) {
    console.error('Upload failed:', e);
    return null;
  }
};
  // ── Save memory ───────────────────────────────────────────────────────────
  const handleSave = async () => {
    if (!description.trim()) {
      Alert.alert('Add a description', 'Tell Medha about this memory.');
      return;
    }
    if (!user) return;

    setSaving(true);

    try {
      // Upload photo if selected
      const photoUrl = photoFile ? await uploadPhoto(user.id) : null;

      // Save to Supabase
      const { error } = await supabase.from('memories').insert({
        user_id:     user.id,
        description: description.trim(),
        photo_url:   photoUrl,
        memory_date: memoryDate,
      });

     if (error) throw error;

// Navigate back — useFocusEffect on home will auto-refresh
router.back();

} catch (e: any) {
  Alert.alert('Error', e.message || 'Could not save memory. Try again.');
}

    setSaving(false);
  };

  return (
    <SafeAreaView style={[styles.safe, { backgroundColor: C.background }]} edges={['top']}>

      {/* ── Header ── */}
      <View style={[styles.header, { borderBottomColor: C.border }]}>
        <TouchableOpacity onPress={() => router.back()}>
          <Ionicons name="arrow-back" size={22} color={C.textSecondary} />
        </TouchableOpacity>
        <Text style={[styles.headerTitle, { color: C.textPrimary }]}>Add memory</Text>
        <TouchableOpacity
          style={[styles.saveBtn, { backgroundColor: C.primary }, (!description.trim() || saving) && { opacity: 0.5 }]}
          onPress={handleSave}
          disabled={!description.trim() || saving}
        >
          {saving
            ? <ActivityIndicator size="small" color={C.background} />
            : <Text style={[styles.saveBtnText, { color: C.background }]}>Save</Text>
          }
        </TouchableOpacity>
      </View>

      <ScrollView
        style={styles.scroll}
        contentContainerStyle={styles.scrollContent}
        showsVerticalScrollIndicator={false}
        keyboardShouldPersistTaps="handled"
      >

        {/* ── Photo picker ── */}
        {photoUri ? (
          <View style={styles.photoWrap}>
            <Image source={{ uri: photoUri }} style={styles.photo} resizeMode="cover" />
            <TouchableOpacity
              style={[styles.removePhoto, { backgroundColor: C.error }]}
              onPress={removePhoto}
            >
              <Ionicons name="close" size={16} color="#fff" />
            </TouchableOpacity>
          </View>
        ) : (
          <TouchableOpacity
            style={[styles.photoPicker, { backgroundColor: C.surface, borderColor: C.border }]}
            onPress={pickImage}
            activeOpacity={0.8}
          >
            <Ionicons name="camera-outline" size={32} color={C.textMuted} />
            <Text style={[styles.photoPickerText, { color: C.textMuted }]}>
              Add a photo (optional)
            </Text>
            <Text style={[styles.photoPickerSub, { color: C.textMuted }]}>
              Tap to choose from gallery
            </Text>
          </TouchableOpacity>
        )}

        {/* ── Description ── */}
        <Text style={[styles.label, { color: C.textMuted }]}>WHAT HAPPENED?</Text>
        <TextInput
          style={[styles.descInput, {
            backgroundColor: C.surface,
            borderColor:     C.border,
            color:           C.textPrimary,
          }]}
          placeholder="Describe this memory... Where were you? Who was there? How did it feel?"
          placeholderTextColor={C.textMuted}
          value={description}
          onChangeText={setDescription}
          multiline
          autoFocus={!photoUri}
          textAlignVertical="top"
        />

        {/* ── Medha note ── */}
        <View style={[styles.medhaNote, { backgroundColor: C.primaryFaint, borderColor: C.primary + '30' }]}>
          <Ionicons name="sparkles-outline" size={14} color={C.primary} />
          <Text style={[styles.medhaNoteText, { color: C.textSecondary }]}>
            Medha will remember this moment and use it to understand your life better when you chat.
          </Text>
        </View>

      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe:          { flex: 1 },
  scroll:        { flex: 1 },
  scrollContent: { padding: SPACING.md },

  header: {
    flexDirection:     'row',
    alignItems:        'center',
    justifyContent:    'space-between',
    paddingHorizontal: SPACING.md,
    paddingVertical:   SPACING.sm,
    borderBottomWidth: 1,
  },
  headerTitle: { fontSize: FONT_SIZE.lg, fontWeight: FONT_WEIGHT.semibold },
  saveBtn: {
    borderRadius:      BORDER_RADIUS.md,
    paddingVertical:   6,
    paddingHorizontal: SPACING.md,
  },
  saveBtnText: { fontSize: FONT_SIZE.sm, fontWeight: FONT_WEIGHT.bold },

  photoPicker: {
    height:         180,
    borderRadius:   BORDER_RADIUS.lg,
    borderWidth:    1,
    borderStyle:    'dashed',
    alignItems:     'center',
    justifyContent: 'center',
    gap:            SPACING.xs,
    marginBottom:   SPACING.lg,
  },
  photoPickerText: { fontSize: FONT_SIZE.md, fontWeight: FONT_WEIGHT.medium },
  photoPickerSub:  { fontSize: FONT_SIZE.xs },
  photoWrap: {
    position:     'relative',
    marginBottom: SPACING.lg,
  },
  photo: {
    width:        '100%',
    height:       220,
    borderRadius: BORDER_RADIUS.lg,
  },
  removePhoto: {
    position:       'absolute',
    top:            SPACING.sm,
    right:          SPACING.sm,
    width:          28,
    height:         28,
    borderRadius:   BORDER_RADIUS.full,
    alignItems:     'center',
    justifyContent: 'center',
  },

  label: {
    fontSize:      FONT_SIZE.xs,
    fontWeight:    FONT_WEIGHT.semibold,
    letterSpacing: 0.8,
    marginBottom:  SPACING.sm,
  },
  descInput: {
    borderRadius:      BORDER_RADIUS.lg,
    borderWidth:       1,
    padding:           SPACING.md,
    fontSize:          FONT_SIZE.md,
    lineHeight:        24,
    minHeight:         160,
    marginBottom:      SPACING.md,
  },
  medhaNote: {
    flexDirection: 'row',
    alignItems:    'flex-start',
    gap:           SPACING.sm,
    borderRadius:  BORDER_RADIUS.md,
    padding:       SPACING.sm,
    borderWidth:   1,
  },
  medhaNoteText: { flex: 1, fontSize: FONT_SIZE.xs, lineHeight: 18 },
});