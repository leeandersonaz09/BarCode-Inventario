import { useFocusEffect } from '@react-navigation/native';
import { useNavigation, useRouter } from 'expo-router';
import { File, Paths } from 'expo-file-system';
import * as Print from 'expo-print';
import * as Sharing from 'expo-sharing';
import * as Clipboard from 'expo-clipboard';
import { Copy, Edit3, FileDown, FileText, PackageOpen, Plus, Trash2, X } from 'lucide-react-native';
import { useCallback, useEffect, useMemo, useState } from 'react';
import {
  ActivityIndicator,
  Alert,
  FlatList,
  Image,
  Modal,
  Pressable,
  StyleSheet,
  Text,
  TextInput,
  View,
} from 'react-native';

import { deleteProduct, getAllProducts, Product, updateProduct } from '@/database/db';
import { useAppTheme } from '@/hooks/useAppTheme';
import { useTranslation } from 'react-i18next';

export default function ProductsScreen() {
  const [products, setProducts] = useState<Product[]>([]);
  const [loading, setLoading] = useState(true);
  const [editingProduct, setEditingProduct] = useState<Product | null>(null);
  
  // Estados de edição
  const [editName, setEditName] = useState('');
  const [editBrand, setEditBrand] = useState('');
  const [editQty, setEditQty] = useState('');
  const [editCat, setEditCat] = useState('');
  const [editPrice, setEditPrice] = useState('');

  const { colors } = useAppTheme();
  const router = useRouter();
  const navigation = useNavigation();
  const { t } = useTranslation();

  useEffect(() => {
    navigation.setOptions({
      title: t('tabs.catalog'),
    });
  }, [t, navigation]);

  const totalValue = useMemo(
    () => products.reduce((sum, product) => sum + Number(product.price || 0), 0),
    [products]
  );

  const loadProducts = useCallback(async () => {
    setLoading(true);
    try {
      const data = await getAllProducts();
      setProducts(data);
    } catch {
      Alert.alert(t('common.error'), t('common.error'));
    } finally {
      setLoading(false);
    }
  }, []);

  useFocusEffect(
    useCallback(() => {
      loadProducts();
    }, [loadProducts])
  );

  const openEditor = (product: Product) => {
    setEditingProduct(product);
    setEditName(product.name);
    setEditBrand(product.brand || '');
    setEditQty(product.quantity || '');
    setEditCat(product.categories || '');
    setEditPrice(formatPriceInput(product.price));
  };

  const closeEditor = () => {
    setEditingProduct(null);
    setEditName('');
    setEditBrand('');
    setEditQty('');
    setEditCat('');
    setEditPrice('');
  };

  const handleUpdate = async () => {
    if (!editingProduct?.id) return;

    const parsedPrice = parsePrice(editPrice);
    if (parsedPrice === null) {
      Alert.alert(t('manual.invalid_price'), t('manual.invalid_price_msg'));
      return;
    }

    try {
      await updateProduct(editingProduct.id, {
        name: editName,
        brand: editBrand,
        quantity: editQty,
        categories: editCat,
        price: parsedPrice,
      });
      closeEditor();
      await loadProducts();
    } catch (error) {
      Alert.alert(t('common.error'), t('common.error'));
    }
  };

  const handleDelete = (product: Product) => {
    if (!product.id) return;

    Alert.alert(t('catalog.delete_title'), t('catalog.delete_msg', { name: product.name }), [
      { text: t('common.cancel'), style: 'cancel' },
      {
        text: t('common.delete_confirm'),
        style: 'destructive',
        onPress: async () => {
          await deleteProduct(product.id!);
          closeEditor();
          await loadProducts();
        },
      },
    ]);
  };

  const exportPDF = async () => {
    if (!products.length) {
      Alert.alert(t('catalog.empty'), t('catalog.empty_alert'));
      return;
    }

    const html = buildProductsHtml(products);
    const { uri } = await Print.printToFileAsync({ html, base64: false });
    await shareFile(uri);
  };

  const exportCSV = async () => {
    if (!products.length) {
      Alert.alert(t('catalog.empty'), t('catalog.empty_alert'));
      return;
    }

    const csvContent = buildCsv(products);
    const file = new File(Paths.cache, 'produtos_estoque.csv');
    file.create({ overwrite: true });
    file.write(csvContent);
    await shareFile(file.uri);
  };

  const openExportMenu = () => {
    Alert.alert(t('catalog.export_menu'), t('catalog.export_desc'), [
      { text: t('catalog.export_pdf'), onPress: exportPDF },
      { text: t('catalog.export_csv'), onPress: exportCSV },
      { text: t('common.cancel'), style: 'cancel' },
    ]);
  };

  return (
    <View style={[styles.container, { backgroundColor: colors.background }]}>
      <View style={styles.header}>
        <View>
          <Text style={[styles.title, { color: colors.text }]}>{t('tabs.catalog')}</Text>
          <Text style={[styles.subtitle, { color: colors.mutedText }]}>
            {t('catalog.items', { count: products.length })} • {formatCurrency(totalValue)}
          </Text>
        </View>
        <Pressable
          style={({ pressed }) => [
            styles.exportButton,
            { backgroundColor: colors.surface, borderColor: colors.border, opacity: pressed ? 0.75 : 1 },
          ]}
          onPress={openExportMenu}>
          <FileDown size={20} color={colors.tint} />
          <Text style={[styles.exportText, { color: colors.text }]}>{t('catalog.export')}</Text>
        </Pressable>
      </View>

      {loading ? (
        <View style={styles.centerState}>
          <ActivityIndicator color={colors.tint} />
          <Text style={[styles.stateText, { color: colors.mutedText }]}>{t('common.loading_products')}</Text>
        </View>
      ) : (
        <FlatList
          data={products}
          keyExtractor={(item) => String(item.id ?? item.barcode)}
          renderItem={({ item }) => <ProductCard product={item} onPress={() => openEditor(item)} />}
          contentContainerStyle={styles.list}
          contentInsetAdjustmentBehavior="automatic"
          ListEmptyComponent={<EmptyState />}
        />
      )}

      {/* BOTÃO FLUTUANTE DE CADASTRO */}
      <Pressable
        style={({ pressed }) => [
          styles.fab,
          { backgroundColor: colors.tint, opacity: pressed ? 0.85 : 1 },
        ]}
        onPress={() => router.push('/scanner')}>
        <Plus size={28} color="#FFFFFF" />
      </Pressable>

      <Modal visible={!!editingProduct} animationType="slide" transparent onRequestClose={closeEditor}>
        <View style={styles.modalBackdrop}>
          <View style={[styles.modalContent, { backgroundColor: colors.surface, maxHeight: '85%' }]}>
            <View style={styles.modalHeader}>
              <View>
                <Text style={[styles.modalTitle, { color: colors.text }]}>{t('catalog.edit_title')}</Text>
                <Text style={[styles.modalSubtitle, { color: colors.mutedText }]}>{editingProduct?.barcode}</Text>
              </View>
              <Pressable style={styles.iconButton} onPress={closeEditor}>
                <X size={22} color={colors.text} />
              </Pressable>
            </View>

            <FlatList
              data={[1]}
              keyExtractor={() => 'edit-form'}
              renderItem={() => (
                <View style={{ gap: 16, paddingBottom: 10, paddingTop: 10 }}>
                  <View style={styles.inputGroup}>
                    <Text style={[styles.inputLabel, { color: colors.mutedText }]}>{t('catalog.field_name')}</Text>
                    <TextInput
                      style={[styles.smallInput, { borderColor: colors.border, color: colors.text, backgroundColor: colors.background }]}
                      value={editName}
                      onChangeText={setEditName}
                      placeholder="Ex: CAFÉ MELITTA 500G"
                      placeholderTextColor={colors.mutedText}
                    />
                  </View>

                  <View style={{ flexDirection: 'row', gap: 12 }}>
                    <View style={[styles.inputGroup, { flex: 1 }]}>
                      <Text style={[styles.inputLabel, { color: colors.mutedText }]}>{t('catalog.field_brand')}</Text>
                      <TextInput
                        style={[styles.smallInput, { borderColor: colors.border, color: colors.text, backgroundColor: colors.background }]}
                        value={editBrand}
                        onChangeText={setEditBrand}
                        placeholder="Melitta"
                        placeholderTextColor={colors.mutedText}
                      />
                    </View>
                    <View style={[styles.inputGroup, { flex: 1 }]}>
                      <Text style={[styles.inputLabel, { color: colors.mutedText }]}>{t('catalog.field_qty')}</Text>
                      <TextInput
                        style={[styles.smallInput, { borderColor: colors.border, color: colors.text, backgroundColor: colors.background }]}
                        value={editQty}
                        onChangeText={setEditQty}
                        placeholder="500g"
                        placeholderTextColor={colors.mutedText}
                      />
                    </View>
                  </View>

                  <View style={styles.inputGroup}>
                    <Text style={[styles.inputLabel, { color: colors.mutedText }]}>{t('catalog.field_cat')}</Text>
                    <TextInput
                      style={[styles.smallInput, { borderColor: colors.border, color: colors.text, backgroundColor: colors.background }]}
                      value={editCat}
                      onChangeText={setEditCat}
                      placeholder="Alimentos > Grãos"
                      placeholderTextColor={colors.mutedText}
                    />
                  </View>

                  <View style={styles.inputGroup}>
                    <Text style={[styles.inputLabel, { color: colors.mutedText }]}>{t('catalog.field_price')}</Text>
                    <TextInput
                      style={[styles.priceInput, { borderColor: colors.border, color: colors.text, backgroundColor: colors.background }]}
                      value={editPrice}
                      onChangeText={setEditPrice}
                      keyboardType="decimal-pad"
                      placeholder="R$ 0,00"
                      placeholderTextColor={colors.mutedText}
                    />
                  </View>
                </View>
              )}
              showsVerticalScrollIndicator={false}
              keyboardShouldPersistTaps="handled"
            />

            <View style={styles.modalActions}>
              <Pressable style={[styles.deleteButton, { borderColor: colors.danger }]} onPress={() => editingProduct && handleDelete(editingProduct)}>
                <Trash2 size={18} color={colors.danger} />
                <Text style={[styles.deleteText, { color: colors.danger }]}>{t('common.delete')}</Text>
              </Pressable>
              <Pressable style={[styles.saveButton, { backgroundColor: colors.tint }]} onPress={handleUpdate}>
                <Edit3 size={18} color="#FFFFFF" />
                <Text style={styles.saveText}>{t('common.save')}</Text>
              </Pressable>
            </View>
          </View>
        </View>
      </Modal>
    </View>
  );
}

function ProductCard({ product, onPress }: { product: Product; onPress: () => void }) {
  const { colors } = useAppTheme();
  const { t } = useTranslation();

  const copyToClipboard = async () => {
    await Clipboard.setStringAsync(product.barcode);
    Alert.alert(t('common.copied'), t('common.copied_desc'), [], { cancelable: true });
  };

  return (
    <Pressable
      style={({ pressed }) => [
        styles.productCard,
        { backgroundColor: colors.surface, borderColor: colors.border, opacity: pressed ? 0.95 : 1 },
      ]}
      onPress={onPress}>
      <Image source={{ uri: product.image_url || undefined }} style={[styles.thumb, { backgroundColor: colors.surfaceMuted }]} />
      <View style={styles.productInfo}>
        <Text style={[styles.name, { color: colors.text }]} numberOfLines={2}>
          {product.name}
        </Text>
        <Text style={[styles.brand, { color: colors.mutedText }]} numberOfLines={1}>
          {product.brand || t('common.no_brand')}
        </Text>
        
        <Pressable 
          style={({ pressed }) => [
            styles.copyContainer, 
            { backgroundColor: pressed ? colors.surfaceMuted : 'transparent' }
          ]} 
          onPress={copyToClipboard}
        >
          <Text style={[styles.barcode, { color: colors.mutedText }]}>
            {product.barcode}
          </Text>
          <Copy size={12} color={colors.mutedText} style={{ marginLeft: 4 }} />
        </Pressable>

        <Text style={[styles.price, { color: colors.tint }]}>{formatCurrency(product.price)}</Text>
      </View>
      <Edit3 size={19} color={colors.mutedText} />
    </Pressable>
  );
}

function EmptyState() {
  const { colors } = useAppTheme();
  const { t } = useTranslation();

  return (
    <View style={styles.centerState}>
      <PackageOpen size={42} color={colors.mutedText} />
      <Text style={[styles.emptyTitle, { color: colors.text }]}>{t('catalog.empty')}</Text>
      <Text style={[styles.stateText, { color: colors.mutedText }]}>
        {t('catalog.empty_desc')}
      </Text>
    </View>
  );
}

async function shareFile(uri: string) {
  const isAvailable = await Sharing.isAvailableAsync();
  if (!isAvailable) {
    Alert.alert('Compartilhamento indisponível', `Arquivo gerado em: ${uri}`);
    return;
  }

  await Sharing.shareAsync(uri);
}

function parsePrice(value: string) {
  const normalized = value.includes(',')
    ? value.replace(/\./g, '').replace(',', '.')
    : value.replace(',', '.');
  const parsed = Number(normalized);
  return Number.isFinite(parsed) && parsed >= 0 ? parsed : null;
}

function formatPriceInput(value: number) {
  return value.toFixed(2).replace('.', ',');
}

function formatCurrency(value: number) {
  return new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(Number(value || 0));
}

function buildCsv(products: Product[]) {
  const header = ['Nome', 'Marca', 'Codigo', 'Quantidade', 'Categorias', 'Preco', 'Imagem'].join(',');
  const rows = products.map((product) =>
    [product.name, product.brand, product.barcode, product.quantity, product.categories, String(product.price), product.image_url]
      .map(csvCell)
      .join(',')
  );

  return [header, ...rows].join('\n');
}

function csvCell(value: string) {
  return `"${String(value ?? '').replace(/"/g, '""')}"`;
}

function buildProductsHtml(products: Product[]) {
  const rows = products
    .map(
      (product) => `
        <tr>
          <td>${product.image_url ? `<img src="${escapeHtml(product.image_url)}" />` : ''}</td>
          <td>
            <strong>${escapeHtml(product.name)}</strong>
            <span>${escapeHtml(product.brand || 'Marca não informada')}</span>
          </td>
          <td>${escapeHtml(product.barcode)}</td>
          <td>${formatCurrency(product.price)}</td>
        </tr>`
    )
    .join('');

  return `
    <html>
      <head>
        <meta charset="utf-8" />
        <style>
          @page { size: A4; margin: 28px; }
          body { font-family: Arial, sans-serif; color: #14213D; }
          h1 { color: #1F7A68; margin: 0; }
          p { color: #6B778C; margin: 8px 0 24px; }
          table { width: 100%; border-collapse: collapse; }
          th { background: #EEF3F8; color: #14213D; text-align: left; }
          th, td { border-bottom: 1px solid #DDE6EF; padding: 10px; vertical-align: middle; }
          img { width: 46px; height: 46px; object-fit: contain; border-radius: 8px; }
          span { display: block; color: #6B778C; font-size: 12px; margin-top: 3px; }
        </style>
      </head>
      <body>
        <h1>Catálogo BarCode Inventário</h1>
        <p>${products.length} produtos exportados em ${new Date().toLocaleDateString('pt-BR')}.</p>
        <table>
          <thead>
            <tr>
              <th>Foto</th>
              <th>Produto</th>
              <th>EAN/UPC</th>
              <th>Preço</th>
            </tr>
          </thead>
          <tbody>${rows}</tbody>
        </table>
      </body>
    </html>`;
}

function escapeHtml(value: string) {
  return String(value ?? '')
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#039;');
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    gap: 16,
    paddingHorizontal: 22,
    paddingTop: 64,
    paddingBottom: 16,
  },
  title: {
    fontSize: 30,
    fontWeight: '900',
  },
  subtitle: {
    fontSize: 13,
    marginTop: 4,
  },
  exportButton: {
    minHeight: 44,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    paddingHorizontal: 14,
    borderRadius: 14,
    borderWidth: 1,
  },
  exportText: {
    fontSize: 14,
    fontWeight: '800',
  },
  list: {
    padding: 18,
    paddingBottom: 120,
    gap: 14,
  },
  productCard: {
    minHeight: 112,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 14,
    padding: 12,
    borderRadius: 20,
    borderWidth: 1,
  },
  thumb: {
    width: 76,
    height: 76,
    borderRadius: 15,
  },
  productInfo: {
    flex: 1,
    gap: 3,
  },
  name: {
    fontSize: 16,
    fontWeight: '800',
  },
  brand: {
    fontSize: 13,
  },
  barcode: {
    fontFamily: 'SpaceMono',
    fontSize: 11,
  },
  copyContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    alignSelf: 'flex-start',
    paddingVertical: 2,
    paddingHorizontal: 4,
    borderRadius: 6,
    marginTop: 2,
  },
  price: {
    marginTop: 4,
    fontSize: 18,
    fontWeight: '900',
  },
  centerState: {
    flex: 1,
    minHeight: 280,
    alignItems: 'center',
    justifyContent: 'center',
    gap: 10,
    padding: 30,
  },
  emptyTitle: {
    fontSize: 18,
    fontWeight: '900',
    textAlign: 'center',
  },
  stateText: {
    fontSize: 14,
    lineHeight: 20,
    textAlign: 'center',
  },
  modalBackdrop: {
    flex: 1,
    justifyContent: 'flex-end',
    backgroundColor: 'rgba(0,0,0,0.48)',
  },
  modalContent: {
    padding: 22,
    paddingBottom: 36,
    borderTopLeftRadius: 28,
    borderTopRightRadius: 28,
    gap: 16,
  },
  modalHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    gap: 12,
  },
  modalTitle: {
    fontSize: 22,
    fontWeight: '900',
  },
  modalSubtitle: {
    fontSize: 13,
    marginTop: 2,
  },
  iconButton: {
    width: 42,
    height: 42,
    borderRadius: 14,
    alignItems: 'center',
    justifyContent: 'center',
  },
  editName: {
    fontSize: 17,
    fontWeight: '800',
  },
  inputGroup: {
    gap: 6,
  },
  smallInput: {
    minHeight: 48,
    borderRadius: 12,
    borderWidth: 1,
    paddingHorizontal: 14,
    fontSize: 15,
    fontWeight: '600',
  },
  inputLabel: {
    fontSize: 13,
    fontWeight: '800',
    textTransform: 'uppercase',
  },
  priceInput: {
    minHeight: 58,
    borderRadius: 16,
    borderWidth: 1,
    paddingHorizontal: 16,
    fontSize: 24,
    fontWeight: '900',
  },
  modalActions: {
    flexDirection: 'row',
    gap: 12,
  },
  deleteButton: {
    flex: 1,
    minHeight: 54,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    borderRadius: 16,
    borderWidth: 1,
  },
  deleteText: {
    fontSize: 15,
    fontWeight: '900',
  },
  saveButton: {
    flex: 1,
    minHeight: 54,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    borderRadius: 16,
  },
  saveText: {
    color: '#FFFFFF',
    fontSize: 15,
    fontWeight: '900',
  },
  fab: {
    position: 'absolute',
    bottom: 24,
    right: 24,
    width: 60,
    height: 60,
    borderRadius: 30,
    alignItems: 'center',
    justifyContent: 'center',
    elevation: 6,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 3 },
    shadowOpacity: 0.3,
    shadowRadius: 4,
  },
});
