import { Alert, Pressable, ScrollView, StyleSheet, Switch, Text, View, ActivityIndicator } from 'react-native';
import { Bell, Database, Globe, Info, Moon, Shield, Sun, Download, Upload, HardDrive } from 'lucide-react-native';
import { ReactNode, useEffect, useState } from 'react';
import * as Updates from 'expo-updates';
import Constants from 'expo-constants';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { useTranslation } from 'react-i18next';

import { deleteAllProducts, getAllProducts } from '@/database/db';
import { useAppTheme } from '@/hooks/useAppTheme';
import { exportBackup, importBackup, saveLocalBackup } from '@/services/backupService';

export default function SettingsScreen() {
  const { colors, isDark, toggleTheme } = useAppTheme();
  const [productCount, setProductCount] = useState(0);
  const [isBackupLoading, setIsBackupLoading] = useState(false);
  const { t, i18n } = useTranslation();
  const appVersion = Constants.expoConfig?.version ?? '1.0.0';

  useEffect(() => {
    async function loadStats() {
      try {
        const products = await getAllProducts();
        setProductCount(products.length);
      } catch (e) {
        console.warn(e);
      }
    }
    loadStats();
  }, []);

  const toggleLanguage = async () => {
    const newLang = i18n.language === 'pt' ? 'en' : 'pt';
    await i18n.changeLanguage(newLang);
    await AsyncStorage.setItem('@app_language', newLang);
  };

  const handleExport = async () => {
    setIsBackupLoading(true);
    await exportBackup();
    setIsBackupLoading(false);
  };

  const handleLocalBackup = async () => {
    setIsBackupLoading(true);
    await saveLocalBackup();
    setIsBackupLoading(false);
  };

  const handleImport = async () => {
    await importBackup(() => {
      Updates.reloadAsync();
    });
  };

  const resetDatabase = () => {
    Alert.alert(t('settings.reset_alert_title'), t('settings.reset_alert_desc'), [
      { text: t('common.cancel'), style: 'cancel' },
      {
        text: t('settings.reset_db'),
        style: 'destructive',
        onPress: async () => {
          await deleteAllProducts();
          await AsyncStorage.removeItem('@has_seen_onboarding');
          setProductCount(0);
          Alert.alert(t('settings.reset_success_title'), t('settings.reset_success_desc'));
          Updates.reloadAsync();
        },
      },
    ]);
  };

  return (
    <ScrollView
      style={[styles.container, { backgroundColor: colors.background }]}
      contentContainerStyle={styles.content}
      contentInsetAdjustmentBehavior="automatic">
      <View style={styles.header}>
        <Text style={[styles.title, { color: colors.text }]}>{t('settings.title')}</Text>
        <Text style={[styles.subtitle, { color: colors.mutedText }]}>{t('settings.subtitle')}</Text>
      </View>

      <View style={styles.section}>
        <Text style={[styles.sectionTitle, { color: colors.mutedText }]}>{t('settings.section_data')}</Text>
        <View style={[styles.card, { backgroundColor: colors.surface, borderColor: colors.border }]}>
          <Pressable onPress={handleExport} disabled={isBackupLoading}>
            <SettingItem icon={Download} title={t('settings.export_backup')} value={t('settings.export_desc')} color={colors.tint} />
          </Pressable>
          <Pressable onPress={handleLocalBackup} disabled={isBackupLoading}>
            <SettingItem icon={HardDrive} title={t('settings.export_local')} value={t('settings.export_local_desc')} color={colors.tint} />
          </Pressable>
          <Pressable onPress={handleImport} disabled={isBackupLoading}>
            <SettingItem icon={Upload} title={t('settings.import_backup')} value={t('settings.import_desc')} color={colors.accent} />
          </Pressable>
          <SettingItem 
            icon={Database} 
            title={t('settings.storage')} 
            value={t('settings.storage_desc', { count: productCount })} 
            color={colors.success} 
          />
        </View>
        
        {isBackupLoading && (
          <View style={{ flexDirection: 'row', alignItems: 'center', gap: 10, marginTop: 8, paddingHorizontal: 4 }}>
            <ActivityIndicator size="small" color={colors.tint} />
            <Text style={{ color: colors.tint, fontSize: 13, fontWeight: '600' }}>{t('settings.saving_backup')}</Text>
          </View>
        )}

        <Text style={[styles.tipText, { color: colors.mutedText }]}>
          {t('settings.backup_tip')}
        </Text>
      </View>

      <View style={styles.section}>
        <Text style={[styles.sectionTitle, { color: colors.mutedText }]}>{t('settings.section_prefs')}</Text>
        <View style={[styles.card, { backgroundColor: colors.surface, borderColor: colors.border }]}>
          <SettingItem icon={isDark ? Moon : Sun} title={t('settings.dark_mode')} color={colors.tint}>
            <Switch value={isDark} onValueChange={toggleTheme} trackColor={{ false: colors.border, true: colors.tint }} />
          </SettingItem>
          <Pressable onPress={toggleLanguage}>
            <SettingItem icon={Globe} title={t('settings.language')} value={i18n.language === 'pt' ? 'Português (BR)' : 'English'} color={colors.success} />
          </Pressable>
        </View>
      </View>

      <View style={styles.section}>
        <Text style={[styles.sectionTitle, { color: colors.mutedText }]}>{t('settings.section_about')}</Text>
        <View style={[styles.card, { backgroundColor: colors.surface, borderColor: colors.border }]}>
          <SettingItem icon={Shield} title={t('settings.privacy')} value={t('settings.privacy_desc')} color={colors.success} />
          <SettingItem icon={Info} title={t('settings.version')} value={appVersion} color={colors.mutedText} />
        </View>
      </View>

      <Pressable
        style={({ pressed }) => [
          styles.resetButton,
          { borderColor: colors.danger, opacity: pressed ? 0.74 : 1 },
        ]}
        onPress={resetDatabase}>
        <Text style={[styles.resetText, { color: colors.danger }]}>{t('settings.reset_db')}</Text>
      </Pressable>
    </ScrollView>
  );
}

function SettingItem({
  icon: Icon,
  title,
  value,
  color,
  children,
}: {
  icon: typeof Sun;
  title: string;
  value?: string;
  color: string;
  children?: ReactNode;
}) {
  const { colors } = useAppTheme();

  return (
    <View style={[styles.item, { borderBottomColor: colors.border }]}>
      <View style={[styles.iconBox, { backgroundColor: `${color}1F` }]}>
        <Icon size={20} color={color} />
      </View>
      <Text style={[styles.itemTitle, { color: colors.text }]}>{title}</Text>
      {children ?? <Text style={[styles.itemValue, { color: colors.mutedText }]}>{value}</Text>}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  content: {
    padding: 22,
    paddingTop: 64,
    paddingBottom: 120,
    gap: 24,
  },
  header: {
    gap: 8,
  },
  title: {
    fontSize: 30,
    fontWeight: '900',
  },
  subtitle: {
    fontSize: 15,
    lineHeight: 22,
  },
  section: {
    gap: 10,
  },
  sectionTitle: {
    fontSize: 13,
    fontWeight: '900',
    letterSpacing: 0.4,
    textTransform: 'uppercase',
  },
  card: {
    borderRadius: 22,
    borderWidth: 1,
    overflow: 'hidden',
  },
  item: {
    minHeight: 68,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 14,
    paddingHorizontal: 16,
    borderBottomWidth: StyleSheet.hairlineWidth,
  },
  iconBox: {
    width: 40,
    height: 40,
    borderRadius: 13,
    alignItems: 'center',
    justifyContent: 'center',
  },
  itemTitle: {
    flex: 1,
    fontSize: 16,
    fontWeight: '700',
  },
  itemValue: {
    fontSize: 14,
    fontWeight: '600',
  },
  tipText: {
    fontSize: 12,
    lineHeight: 18,
    marginTop: 8,
    paddingHorizontal: 4,
    fontStyle: 'italic',
  },
  resetButton: {
    minHeight: 54,
    alignItems: 'center',
    justifyContent: 'center',
    borderRadius: 18,
    borderWidth: 1,
  },
  resetText: {
    fontSize: 15,
    fontWeight: '900',
  },
});
