import { useLocalSearchParams, useRouter } from 'expo-router';
import { Save } from 'lucide-react-native';
import { useState } from 'react';
import { Alert, Pressable, ScrollView, StyleSheet, Text, TextInput, View } from 'react-native';

import { saveProduct } from '@/database/db';
import { useAppTheme } from '@/hooks/useAppTheme';

export default function ManualProductScreen() {
  const params = useLocalSearchParams<{ barcode?: string }>();
  const router = useRouter();
  const { colors } = useAppTheme();
  const [barcode, setBarcode] = useState(params.barcode ?? '');
  const [name, setName] = useState('');
  const [brand, setBrand] = useState('');
  const [imageUrl, setImageUrl] = useState('');
  const [quantity, setQuantity] = useState('');
  const [categories, setCategories] = useState('');
  const [price, setPrice] = useState('');
  const [saving, setSaving] = useState(false);

  const handleSave = async () => {
    const parsedPrice = parsePrice(price);

    if (!barcode.trim() || !name.trim()) {
      Alert.alert('Campos obrigatórios', 'Informe pelo menos o código e o nome do produto.');
      return;
    }

    if (parsedPrice === null) {
      Alert.alert('Preço inválido', 'Digite um valor numérico, como 12,90.');
      return;
    }

    setSaving(true);
    try {
      await saveProduct({
        barcode: barcode.trim(),
        name: name.trim(),
        brand: brand.trim() || 'Marca não informada',
        image_url: imageUrl.trim(),
        quantity: quantity.trim(),
        categories: categories.trim(),
        price: parsedPrice,
      });
      router.replace('/products');
    } catch {
      Alert.alert('Erro', 'Não foi possível salvar o produto.');
    } finally {
      setSaving(false);
    }
  };

  return (
    <ScrollView
      style={[styles.container, { backgroundColor: colors.background }]}
      contentContainerStyle={styles.content}
      contentInsetAdjustmentBehavior="automatic">
      <View style={styles.header}>
        <Text style={[styles.title, { color: colors.text }]}>Cadastro Manual</Text>
        <Text style={[styles.subtitle, { color: colors.mutedText }]}>
          Use quando o produto não tiver código legível ou não aparecer na Open Food Facts.
        </Text>
      </View>

      <View style={[styles.form, { backgroundColor: colors.surface, borderColor: colors.border }]}>
        <Field label="Código EAN/UPC" value={barcode} onChangeText={setBarcode} keyboardType="number-pad" />
        <Field label="Nome do produto" value={name} onChangeText={setName} autoCapitalize="words" />
        <Field label="Marca" value={brand} onChangeText={setBrand} autoCapitalize="words" />
        <Field label="Quantidade" value={quantity} onChangeText={setQuantity} placeholder="Ex.: 500 g, 1 L" />
        <Field label="Categorias" value={categories} onChangeText={setCategories} placeholder="Ex.: bebidas, mercearia" />
        <Field label="URL da imagem" value={imageUrl} onChangeText={setImageUrl} autoCapitalize="none" keyboardType="url" />
        <Field label="Preço" value={price} onChangeText={setPrice} keyboardType="decimal-pad" placeholder="R$ 0,00" />
      </View>

      <Pressable
        style={({ pressed }) => [
          styles.saveButton,
          { backgroundColor: colors.tint, opacity: pressed || saving ? 0.72 : 1 },
        ]}
        disabled={saving}
        onPress={handleSave}>
        <Save size={19} color="#FFFFFF" />
        <Text style={styles.saveText}>{saving ? 'Salvando...' : 'Salvar Produto'}</Text>
      </Pressable>
    </ScrollView>
  );
}

function Field({
  label,
  value,
  onChangeText,
  placeholder,
  keyboardType,
  autoCapitalize,
}: {
  label: string;
  value: string;
  onChangeText: (value: string) => void;
  placeholder?: string;
  keyboardType?: 'default' | 'number-pad' | 'decimal-pad' | 'url';
  autoCapitalize?: 'none' | 'sentences' | 'words' | 'characters';
}) {
  const { colors } = useAppTheme();

  return (
    <View style={styles.field}>
      <Text style={[styles.label, { color: colors.mutedText }]}>{label}</Text>
      <TextInput
        style={[styles.input, { backgroundColor: colors.background, borderColor: colors.border, color: colors.text }]}
        value={value}
        onChangeText={onChangeText}
        placeholder={placeholder}
        placeholderTextColor={colors.mutedText}
        keyboardType={keyboardType}
        autoCapitalize={autoCapitalize}
      />
    </View>
  );
}

function parsePrice(value: string) {
  const normalized = value.includes(',')
    ? value.replace(/\./g, '').replace(',', '.')
    : value.replace(',', '.');
  const parsed = Number(normalized);
  return Number.isFinite(parsed) && parsed >= 0 ? parsed : null;
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  content: {
    padding: 22,
    paddingBottom: 42,
    gap: 18,
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
  form: {
    gap: 14,
    padding: 18,
    borderRadius: 22,
    borderWidth: 1,
  },
  field: {
    gap: 7,
  },
  label: {
    fontSize: 12,
    fontWeight: '900',
    letterSpacing: 0.4,
    textTransform: 'uppercase',
  },
  input: {
    minHeight: 52,
    borderWidth: 1,
    borderRadius: 15,
    paddingHorizontal: 14,
    fontSize: 16,
    fontWeight: '600',
  },
  saveButton: {
    minHeight: 56,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 9,
    borderRadius: 18,
  },
  saveText: {
    color: '#FFFFFF',
    fontSize: 16,
    fontWeight: '900',
  },
});
