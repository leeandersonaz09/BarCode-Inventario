import React from 'react';
import { View, Text, StyleSheet, Pressable } from 'react-native';
import { Colors } from '../constants/Colors';
import { useColorScheme } from '../components/useColorScheme';
import { useTranslation } from 'react-i18next';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { Globe, ArrowRight } from 'lucide-react-native';

export function LanguageSelection({ onFinished }: { onFinished: () => void }) {
  const colorScheme = useColorScheme() ?? 'light';
  const theme = Colors[colorScheme];
  const { i18n } = useTranslation();

  const handleSelectLanguage = async (lang: string) => {
    await i18n.changeLanguage(lang);
    await AsyncStorage.setItem('@app_language', lang);
    onFinished();
  };

  return (
    <View style={[styles.container, { backgroundColor: theme.background }]}>
      <View style={styles.content}>
        <Globe size={80} color={theme.tint} style={styles.icon} />
        <Text style={[styles.title, { color: theme.text }]}>
          Selecione o Idioma
        </Text>
        <Text style={[styles.subtitle, { color: theme.mutedText }]}>
          Select your language
        </Text>

        <View style={styles.buttons}>
          <Pressable 
            style={({pressed}) => [styles.langButton, { backgroundColor: theme.surface, borderColor: theme.border, opacity: pressed ? 0.7 : 1 }]}
            onPress={() => handleSelectLanguage('pt')}
          >
            <Text style={[styles.langText, { color: theme.text }]}>🇧🇷 Português (Brasil)</Text>
            <ArrowRight size={20} color={theme.tint} />
          </Pressable>

          <Pressable 
            style={({pressed}) => [styles.langButton, { backgroundColor: theme.surface, borderColor: theme.border, opacity: pressed ? 0.7 : 1 }]}
            onPress={() => handleSelectLanguage('en')}
          >
            <Text style={[styles.langText, { color: theme.text }]}>🇺🇸 English</Text>
            <ArrowRight size={20} color={theme.tint} />
          </Pressable>
        </View>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  content: {
    flex: 1,
    justifyContent: 'center',
    padding: 24,
    gap: 16,
  },
  icon: {
    alignSelf: 'center',
    marginBottom: 20,
  },
  title: {
    fontSize: 28,
    fontWeight: '900',
    textAlign: 'center',
  },
  subtitle: {
    fontSize: 16,
    textAlign: 'center',
    marginBottom: 40,
    lineHeight: 24,
  },
  buttons: {
    gap: 16,
  },
  langButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    padding: 20,
    borderRadius: 16,
    borderWidth: 1,
    elevation: 2,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
  },
  langText: {
    fontSize: 18,
    fontWeight: '700',
  }
});
