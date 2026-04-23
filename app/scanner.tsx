import { CameraView, useCameraPermissions, type BarcodeScanningResult } from 'expo-camera';
import { useRouter } from 'expo-router';
import { X, Keyboard } from 'lucide-react-native';
import { useState, useRef } from 'react';
import {
  ActivityIndicator,
  Alert,
  Image,
  Modal,
  Pressable,
  StyleSheet,
  Text,
  TextInput,
  View,
} from 'react-native';

import { getProductByBarcode, ProductInput, saveProduct } from '@/database/db';

type ProductDraft = ProductInput & {
  id?: number;
  source: 'local' | 'api';
};

export default function ScannerScreen() {
  const [permission, requestPermission] = useCameraPermissions();
  const [scanned, setScanned] = useState(false);
  const [loading, setLoading] = useState(false);
  const [productData, setProductData] = useState<ProductDraft | null>(null);
  const [price, setPrice] = useState('');
  
  // Lock para evitar disparos múltiplos da câmera (Resolve o NullPointerException)
  const isProcessing = useRef(false);
  
  // Estados para entrada manual de código
  const [manualInputVisible, setManualInputVisible] = useState(false);
  const [manualInputCode, setManualInputCode] = useState('');
  
  const router = useRouter();

  if (!permission) {
    return <View style={styles.container} />;
  }

  if (!permission.granted) {
    return (
      <View style={styles.permissionContainer}>
        <Text style={styles.permissionTitle}>Permissão da câmera</Text>
        <Text style={styles.permissionText}>Precisamos acessar a câmera para ler códigos de barras.</Text>
        <Pressable style={styles.primaryButton} onPress={requestPermission}>
          <Text style={styles.primaryButtonText}>Conceder Permissão</Text>
        </Pressable>
      </View>
    );
  }

  // Função centralizada para processar o código (seja da câmera ou teclado)
  const processBarcode = async (data: string) => {
    if (!data || isProcessing.current) return;

    isProcessing.current = true; // ATIVA A TRAVA IMEDIATAMENTE
    setScanned(true);
    setLoading(true);
    setManualInputVisible(false);

    try {
      console.log('--- Iniciando Auditoria de Busca ---');
      console.log('Código:', data);

      const localProduct = await getProductByBarcode(data);
      if (localProduct) {
        setProductData({ ...localProduct, source: 'local' });
        setPrice(formatPriceInput(localProduct.price));
        return;
      }

      const productFromApi = await findProductInExternalSources(data);
      
      if (!productFromApi) {
        Alert.alert('Não encontrado', 'Não encontramos esse código. Deseja cadastrar manualmente?', [
          { text: 'Tentar outro', onPress: resetScanner },
          {
            text: 'Cadastrar',
            onPress: () => router.replace({ pathname: '/manual', params: { barcode: data } }),
          },
        ]);
        return;
      }

      setProductData({ ...productFromApi, source: 'api' });
      setPrice('');
    } catch (error) {
      console.error('Erro no processamento:', error);
      Alert.alert('Erro', 'Ocorreu um problema. Tente novamente.');
      resetScanner();
    } finally {
      setLoading(false);
    }
  };

  const handleBarCodeScanned = ({ data }: BarcodeScanningResult) => {
    if (!isProcessing.current) {
      processBarcode(data);
    }
  };

  const handleManualSubmit = () => {
    if (manualInputCode.trim().length < 3) {
      Alert.alert('Código inválido', 'Por favor, digite um código válido.');
      return;
    }
    processBarcode(manualInputCode.trim());
  };

  const resetScanner = () => {
    isProcessing.current = false; // LIBERA A TRAVA PARA NOVA BUSCA
    setProductData(null);
    setPrice('');
    setLoading(false);
    setScanned(false);
    setManualInputCode('');
  };

  const handleSave = async () => {
    if (!productData) return;

    const parsedPrice = parsePrice(price);
    if (parsedPrice === null) {
      Alert.alert('Preço inválido', 'Digite um valor numérico, como 12,90.');
      return;
    }

    try {
      await saveProduct({
        barcode: productData.barcode,
        name: productData.name,
        brand: productData.brand,
        image_url: productData.image_url,
        quantity: productData.quantity,
        categories: productData.categories,
        price: parsedPrice,
      });
      router.replace('/products');
    } catch {
      Alert.alert('Erro', 'Não foi possível salvar o produto no banco local.');
    }
  };

  return (
    <View style={styles.container}>
      <CameraView
        style={StyleSheet.absoluteFillObject}
        facing="back"
        active={!productData && !manualInputVisible}
        onBarcodeScanned={scanned ? undefined : handleBarCodeScanned}
        barcodeScannerSettings={{
          barcodeTypes: ['ean13', 'ean8', 'upc_a', 'upc_e', 'code128', 'qr'],
        }}
      />
      
      <View style={styles.topBar} pointerEvents="box-none">
        <Pressable style={styles.closeButton} onPress={() => router.back()}>
          <X size={24} color="#FFFFFF" />
        </Pressable>
        
        {/* BOTÃO PARA DIGITAR MANUALMENTE - MAIS VISÍVEL E MODERNO */}
        <Pressable 
          style={({ pressed }) => [
            styles.manualInputButton,
            { opacity: pressed ? 0.8 : 1 }
          ]} 
          onPress={() => setManualInputVisible(true)}
        >
          <Keyboard size={18} color="#FFFFFF" />
          <Text style={styles.manualInputButtonText}>DIGITAR CÓDIGO</Text>
        </Pressable>
      </View>

      <View style={styles.overlay} pointerEvents="none">
        <View style={styles.dimArea} />
        <View style={styles.scanRow}>
          <View style={styles.dimArea} />
          <View style={styles.focusBox} />
          <View style={styles.dimArea} />
        </View>
        <View style={styles.dimArea}>
          <Text style={styles.instructionText}>Aponte para o código</Text>
        </View>
      </View>

      {loading && (
        <View style={styles.loadingOverlay}>
          <ActivityIndicator size="large" color="#FFFFFF" />
          <Text style={styles.loadingText}>Consultando múltiplas bases de dados...</Text>
        </View>
      )}

      {/* MODAL DE ENTRADA MANUAL DE CÓDIGO */}
      <Modal visible={manualInputVisible} transparent animationType="fade" onRequestClose={() => setManualInputVisible(false)}>
        <View style={styles.modalContainerCentral}>
          <View style={styles.modalContentSmall}>
            <Text style={styles.label}>Digitar Código</Text>
            <TextInput
              style={styles.input}
              placeholder="Ex: 7891234567890"
              keyboardType="number-pad"
              value={manualInputCode}
              onChangeText={setManualInputCode}
              autoFocus
            />
            <View style={{ flexDirection: 'row', gap: 12, marginTop: 8 }}>
              <Pressable 
                style={({ pressed }) => [
                  styles.modalSecondaryButton, 
                  { opacity: pressed ? 0.7 : 1 }
                ]} 
                onPress={() => setManualInputVisible(false)}
              >
                <Text style={styles.modalSecondaryButtonText}>Cancelar</Text>
              </Pressable>
              <Pressable 
                style={({ pressed }) => [
                  styles.modalPrimaryButton, 
                  { opacity: pressed ? 0.8 : 1 }
                ]} 
                onPress={handleManualSubmit}
              >
                <Text style={styles.saveButtonText}>Pesquisar</Text>
              </Pressable>
            </View>
          </View>
        </View>
      </Modal>

      {/* MODAL DE RESULTADO (PRODUTO ENCONTRADO) */}
      <Modal visible={!!productData} transparent animationType="slide" onRequestClose={resetScanner}>
        <View style={styles.modalContainer}>
          <View style={styles.modalContent}>
            <Pressable style={styles.modalClose} onPress={resetScanner}>
              <X color="#14213D" size={24} />
            </Pressable>

            <Image source={{ uri: productData?.image_url || undefined }} style={styles.productImg} resizeMode="contain" />
            <Text style={styles.sourceBadge}>{productData?.source === 'local' ? 'Encontrado offline' : 'Encontrado online'}</Text>
            <Text style={styles.productName}>{productData?.name}</Text>
            <Text style={styles.productBrand}>{productData?.brand || 'Marca não informada'}</Text>
            <Text style={styles.productBarcode}>{productData?.barcode}</Text>

            <View style={styles.inputGroup}>
              <Text style={styles.label}>Preço manual</Text>
              <TextInput
                style={styles.input}
                placeholder="R$ 0,00"
                keyboardType="decimal-pad"
                value={price}
                onChangeText={setPrice}
                autoFocus
              />
            </View>

            <Pressable style={styles.saveButton} onPress={handleSave}>
              <Text style={styles.saveButtonText}>{productData?.source === 'local' ? 'Atualizar Preço' : 'Salvar no Catálogo'}</Text>
            </Pressable>
          </View>
        </View>
      </Modal>
    </View>
  );
}

import { scrapeBarcodeMonster, scrapeCosmos } from '@/services/cosmosScraper';

/**
 * ORQUESTRADOR DE BUSCA INTELIGENTE (PARALELA)
 * Dispara todas as fontes simultaneamente e combina os resultados.
 */
async function findProductInExternalSources(barcode: string): Promise<ProductInput | null> {
  console.log('--- Iniciando Busca Paralela Prioritária (PT-BR) ---');

  const [off, obf, cosmos, monster, upc] = await Promise.allSettled([
    fetchOpenFoodFacts(barcode),
    fetchOpenBeautyFacts(barcode),
    scrapeCosmos(barcode),
    scrapeBarcodeMonster(barcode),
    fetchUPCItemDB(barcode)
  ]);

  let bestName = '';
  let bestBrand = '';
  let bestImage = '';
  let bestQty = '';
  let bestCat = '';

  // 1. PRIORIDADE MÁXIMA: Cosmos (Fonte Brasileira por excelência)
  if (cosmos.status === 'fulfilled' && cosmos.value) {
    bestName = cosmos.value.name;
    bestImage = cosmos.value.image_url || '';
  }

  // 2. SEGUNDA PRIORIDADE: Open Food/Beauty Facts (Apenas se tiver nome em PT ou se o Cosmos falhou)
  const sources = [off, obf, monster, upc];
  sources.forEach((result) => {
    if (result.status === 'fulfilled' && result.value) {
      const p = result.value;
      
      // Se ainda não temos nome ou se o nome atual é muito curto e o novo parece melhor
      if (!bestName || (p.name.length > bestName.length && !bestName.includes(p.name))) {
        // Só substitui o nome do Cosmos se o novo nome for significativamente mais completo
        if (bestName.length < 10 || p.name.length > bestName.length + 15) {
          bestName = p.name;
        }
      }
      
      if (!bestBrand && 'brand' in p && p.brand) bestBrand = p.brand;
      if (!bestImage && p.image_url) bestImage = p.image_url;
      if (!bestQty && 'quantity' in p && p.quantity) bestQty = p.quantity;
      if (!bestCat && 'categories' in p && p.categories) bestCat = p.categories;
    }
  });

  if (!bestName) return null;

  // FORMATAÇÃO INTELIGENTE (Ex: CAFE MELITTA VACUO 500G)
  let finalName = bestName.toUpperCase();
  const upperBrand = (bestBrand || '').toUpperCase();
  const upperQty = (bestQty || '').toUpperCase();

  // Limpeza: remover termos comuns em inglês que poluem o nome
  finalName = finalName.replace(/\b(PRODUCT|OF|BRAND|PACK|WEIGHT)\b/g, '');

  if (upperBrand && !finalName.includes(upperBrand)) {
    finalName = `${upperBrand} ${finalName}`;
  }

  if (upperQty && !finalName.includes(upperQty)) {
    finalName = `${finalName} ${upperQty}`;
  }

  finalName = finalName.replace(/\s+/g, ' ').trim();

  return {
    barcode,
    name: finalName,
    brand: bestBrand.toUpperCase(),
    image_url: bestImage,
    quantity: bestQty,
    categories: bestCat,
    price: 0,
  };
}

// --- IMPLEMENTAÇÕES DAS APIs ---

async function fetchOpenFoodFacts(barcode: string): Promise<ProductInput | null> {
  const resp = await fetch(`https://world.openfoodfacts.org/api/v2/product/${barcode}.json`);
  if (!resp.ok) return null;
  const json = await resp.json();
  if (json.status !== 1) return null;
  return {
    barcode,
    name: json.product.product_name_pt || json.product.product_name || 'Produto sem nome',
    brand: json.product.brands || '',
    image_url: json.product.image_url || '',
    quantity: json.product.quantity || '',
    categories: json.product.categories || '',
    price: 0,
  };
}

async function fetchOpenBeautyFacts(barcode: string): Promise<ProductInput | null> {
  const resp = await fetch(`https://world.openbeautyfacts.org/api/v2/product/${barcode}.json`);
  if (!resp.ok) return null;
  const json = await resp.json();
  if (json.status !== 1) return null;
  return {
    barcode,
    name: json.product.product_name_pt || json.product.product_name || 'Produto de Higiene/Beleza',
    brand: json.product.brands || '',
    image_url: json.product.image_url || '',
    quantity: json.product.quantity || '',
    categories: json.product.categories || '',
    price: 0,
  };
}

async function fetchUPCItemDB(barcode: string): Promise<ProductInput | null> {
  const resp = await fetch(`https://api.upcitemdb.com/prod/trial/lookup?upc=${barcode}`);
  if (!resp.ok) return null;
  const json = await resp.json();
  if (!json.items || json.items.length === 0) return null;
  const item = json.items[0];
  return {
    barcode,
    name: item.title,
    brand: item.brand || '',
    image_url: item.images?.[0] || '',
    quantity: '',
    categories: item.category || '',
    price: 0,
  };
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

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#000000',
  },
  permissionContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    gap: 14,
    padding: 26,
    backgroundColor: '#0E1116',
  },
  permissionTitle: {
    color: '#FFFFFF',
    fontSize: 24,
    fontWeight: '900',
    textAlign: 'center',
  },
  permissionText: {
    color: 'rgba(255,255,255,0.72)',
    fontSize: 16,
    lineHeight: 23,
    textAlign: 'center',
  },
  primaryButton: {
    marginTop: 8,
    backgroundColor: '#1F7A68',
    paddingHorizontal: 22,
    paddingVertical: 15,
    borderRadius: 16,
  },
  primaryButtonText: {
    color: '#FFFFFF',
    fontSize: 16,
    fontWeight: '900',
  },
  topBar: {
    position: 'absolute',
    top: 54,
    left: 18,
    right: 18,
    zIndex: 5,
    alignItems: 'flex-end',
  },
  closeButton: {
    width: 46,
    height: 46,
    borderRadius: 16,
    backgroundColor: 'rgba(0,0,0,0.5)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  manualInputButton: {
    marginRight: 'auto',
    marginLeft: 0,
    height: 46,
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 16,
    borderRadius: 16,
    backgroundColor: '#1F7A68',
    gap: 8,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.25,
    shadowRadius: 3.84,
    elevation: 5,
  },
  manualInputButtonText: {
    color: '#FFFFFF',
    fontSize: 13,
    fontWeight: '900',
    letterSpacing: 0.5,
  },
  overlay: {
    flex: 1,
  },
  dimArea: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.64)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  scanRow: {
    height: 240,
    flexDirection: 'row',
  },
  focusBox: {
    flex: 6,
    borderWidth: 3,
    borderColor: '#FFFFFF',
    borderRadius: 22,
    backgroundColor: 'rgba(255,255,255,0.06)',
  },
  instructionText: {
    color: '#FFFFFF',
    fontSize: 16,
    fontWeight: '800',
  },
  loadingOverlay: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: 'rgba(0,0,0,0.78)',
    justifyContent: 'center',
    alignItems: 'center',
    gap: 12,
    zIndex: 10,
  },
  loadingText: {
    color: '#FFFFFF',
    fontSize: 15,
    fontWeight: '700',
  },
  modalContainerCentral: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: 'rgba(0,0,0,0.7)',
    padding: 20,
  },
  modalContentSmall: {
    width: '100%',
    maxWidth: 400,
    backgroundColor: '#FFFFFF',
    borderRadius: 24,
    padding: 24,
    gap: 12,
  },
  modalContainer: {
    flex: 1,
    justifyContent: 'flex-end',
    backgroundColor: 'rgba(0,0,0,0.48)',
  },
  modalContent: {
    alignItems: 'center',
    gap: 10,
    padding: 24,
    paddingBottom: 36,
    borderTopLeftRadius: 30,
    borderTopRightRadius: 30,
    backgroundColor: '#FFFFFF',
  },
  modalClose: {
    alignSelf: 'flex-end',
    width: 40,
    height: 40,
    alignItems: 'center',
    justifyContent: 'center',
  },
  productImg: {
    width: 132,
    height: 132,
    borderRadius: 18,
    backgroundColor: '#EEF3F8',
  },
  sourceBadge: {
    overflow: 'hidden',
    borderRadius: 999,
    paddingHorizontal: 12,
    paddingVertical: 6,
    backgroundColor: '#E7F6F0',
    color: '#1F7A68',
    fontSize: 12,
    fontWeight: '900',
  },
  productName: {
    color: '#14213D',
    fontSize: 21,
    fontWeight: '900',
    textAlign: 'center',
  },
  productBrand: {
    color: '#6B778C',
    fontSize: 14,
    textAlign: 'center',
  },
  productBarcode: {
    color: '#6B778C',
    fontFamily: 'SpaceMono',
    fontSize: 12,
  },
  inputGroup: {
    width: '100%',
    gap: 8,
    marginTop: 8,
  },
  label: {
    color: '#6B778C',
    fontSize: 13,
    fontWeight: '900',
    textTransform: 'uppercase',
  },
  input: {
    minHeight: 60,
    borderWidth: 1,
    borderColor: '#DDE6EF',
    borderRadius: 16,
    paddingHorizontal: 16,
    color: '#14213D',
    fontSize: 24,
    fontWeight: '900',
    textAlign: 'center',
  },
  saveButton: {
    width: '100%',
    minHeight: 56,
    alignItems: 'center',
    justifyContent: 'center',
    borderRadius: 18,
    backgroundColor: '#1F7A68',
  },
  saveButtonText: {
    color: '#FFFFFF',
    fontSize: 17,
    fontWeight: '900',
  },
  modalPrimaryButton: {
    flex: 2,
    minHeight: 56,
    alignItems: 'center',
    justifyContent: 'center',
    borderRadius: 18,
    backgroundColor: '#1F7A68',
  },
  modalSecondaryButton: {
    flex: 1,
    minHeight: 56,
    alignItems: 'center',
    justifyContent: 'center',
    borderRadius: 18,
    backgroundColor: '#EEF3F8',
  },
  modalSecondaryButtonText: {
    color: '#6B778C',
    fontSize: 16,
    fontWeight: '800',
  },
});
