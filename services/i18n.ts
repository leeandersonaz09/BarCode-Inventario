import i18n from 'i18next';
import { initReactI18next } from 'react-i18next';
import * as Localization from 'expo-localization';
import AsyncStorage from '@react-native-async-storage/async-storage';

import en from '../locales/en.json';
import pt from '../locales/pt.json';

const resources = {
  en: en,
  pt: pt,
};

const initI18n = async () => {
  let savedLanguage = await AsyncStorage.getItem('@app_language');
  
  if (!savedLanguage) {
    const deviceLanguage = Localization.getLocales()[0].languageCode ?? 'pt';
    savedLanguage = deviceLanguage === 'en' ? 'en' : 'pt';
  }

  i18n
    .use(initReactI18next)
    .init({
      resources,
      lng: savedLanguage,
      fallbackLng: 'pt',
      interpolation: {
        escapeValue: false,
      },
    });
};

initI18n();

export default i18n;
