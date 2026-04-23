import { useRouter } from 'expo-router';
import { ChevronRight, Package, PlusCircle, ScanBarcode } from 'lucide-react-native';
import { ComponentType } from 'react';
import { Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';
import { useTranslation } from 'react-i18next';

import { useAppTheme } from '@/hooks/useAppTheme';

type ActionCardProps = {
  title: string;
  subtitle: string;
  color: string;
  icon: ComponentType<{ size?: number; color?: string }>;
  onPress: () => void;
};

export default function HomeScreen() {
  const router = useRouter();
  const { colors } = useAppTheme();
  const { t } = useTranslation();

  const actionCards: ActionCardProps[] = [
    {
      title: t('home.scan_new'),
      subtitle: t('home.scan_new_desc'),
      icon: ScanBarcode,
      color: colors.tint,
      onPress: () => router.push('/scanner'),
    },
    {
      title: t('home.view_catalog'),
      subtitle: t('home.view_catalog_desc'),
      icon: Package,
      color: colors.success,
      onPress: () => router.push('/products'),
    },
    {
      title: t('home.manual_reg'),
      subtitle: t('home.manual_reg_desc'),
      icon: PlusCircle,
      color: colors.accent,
      onPress: () => router.push('/manual'),
    },
  ];

  return (
    <ScrollView
      style={[styles.container, { backgroundColor: colors.background }]}
      contentContainerStyle={styles.content}
      contentInsetAdjustmentBehavior="automatic">
      <View style={styles.header}>
        <Text style={[styles.eyebrow, { color: colors.tint }]}>{t('home.eyebrow')}</Text>
        <Text style={[styles.title, { color: colors.text }]}>{t('home.title')}</Text>
        <Text style={[styles.subtitle, { color: colors.mutedText }]}>
          {t('home.subtitle')}
        </Text>
      </View>

      <View style={styles.actions}>
        {actionCards.map((item) => (
          <ActionCard key={item.title} {...item} />
        ))}
      </View>

      <View style={[styles.tipCard, { backgroundColor: colors.surface, borderColor: colors.border }]}>
        <Text style={[styles.tipTitle, { color: colors.text }]}>{t('home.tip_title')}</Text>
        <Text style={[styles.tipBody, { color: colors.mutedText }]}>
          {t('home.tip_body')}
        </Text>
      </View>
    </ScrollView>
  );
}

function ActionCard({ title, subtitle, icon: Icon, color, onPress }: ActionCardProps) {
  const { colors } = useAppTheme();

  return (
    <Pressable
      style={({ pressed }) => [
        styles.card,
        {
          backgroundColor: colors.surface,
          borderColor: colors.border,
          opacity: pressed ? 0.76 : 1,
        },
      ]}
      onPress={onPress}>
      <View style={[styles.iconContainer, { backgroundColor: `${color}1F` }]}>
        <Icon size={28} color={color} />
      </View>
      <View style={styles.cardContent}>
        <Text style={[styles.cardTitle, { color: colors.text }]}>{title}</Text>
        <Text style={[styles.cardSubtitle, { color: colors.mutedText }]}>{subtitle}</Text>
      </View>
      <ChevronRight size={22} color={colors.mutedText} />
    </Pressable>
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
  eyebrow: {
    fontSize: 13,
    fontWeight: '800',
    letterSpacing: 0.4,
    textTransform: 'uppercase',
  },
  title: {
    fontSize: 36,
    fontWeight: '900',
  },
  subtitle: {
    fontSize: 16,
    lineHeight: 24,
  },
  actions: {
    gap: 14,
  },
  card: {
    minHeight: 112,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 16,
    padding: 18,
    borderRadius: 22,
    borderWidth: 1,
  },
  iconContainer: {
    width: 58,
    height: 58,
    borderRadius: 18,
    justifyContent: 'center',
    alignItems: 'center',
  },
  cardContent: {
    flex: 1,
    gap: 4,
  },
  cardTitle: {
    fontSize: 18,
    fontWeight: '800',
  },
  cardSubtitle: {
    fontSize: 13,
    lineHeight: 18,
  },
  tipCard: {
    borderRadius: 22,
    borderWidth: 1,
    padding: 20,
    gap: 8,
  },
  tipTitle: {
    fontSize: 17,
    fontWeight: '800',
  },
  tipBody: {
    fontSize: 14,
    lineHeight: 21,
  },
});
