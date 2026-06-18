export default {
  expo: {
    name: 'Medha',
    slug: 'medha-diary', 
    version: '1.0.0',
    scheme: 'medhadiary',
    orientation: 'portrait',
    userInterfaceStyle: 'automatic',

    plugins: [
      'expo-router',
      'expo-secure-store',
      [
        'expo-notifications',
        {
          color: '#C8A96E',
          sounds: [],
          
        },
      ],
    ],

    ios: {
      supportsTablet: false,
      bundleIdentifier: 'com.abhay.medhadiary',
    },

    android: {
      package: 'com.abhay.medhadiary',           
      adaptiveIcon: {
        foregroundImage: './assets/adaptive-icon.png',
        backgroundColor: '#f3f3f3',
        softwareKeyboardLayoutMode: 'pan',
      },
      permissions: ['RECEIVE_BOOT_COMPLETED'],
    },

    extra: {
  supabaseUrl: process.env.SUPABASE_URL,
  supabaseAnon: process.env.SUPABASE_ANON_KEY,
  apiUrl: 'https://medha-diary.onrender.com',
  eas: {
  projectId: '8da8293f-edd3-46e4-b42c-d0016b7c147c'  // ✅ add this
  },
},
  },
};