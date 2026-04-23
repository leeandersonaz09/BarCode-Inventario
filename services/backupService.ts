import * as FileSystem from 'expo-file-system/legacy';
import * as Sharing from 'expo-sharing';
import * as DocumentPicker from 'expo-document-picker';
import { Alert } from 'react-native';

const DB_NAME = 'products.db';
const DB_PATH = `${FileSystem.documentDirectory}SQLite/${DB_NAME}`;

export async function exportBackup() {
  try {
    const dbInfo = await FileSystem.getInfoAsync(DB_PATH);

    if (!dbInfo.exists) {
      // Tentar procurar na pasta raiz caso não esteja na pasta SQLite
      const altPath = `${FileSystem.documentDirectory}${DB_NAME}`;
      const altInfo = await FileSystem.getInfoAsync(altPath);
      
      if (!altInfo.exists) {
        Alert.alert('Erro', 'O arquivo do banco de dados não foi encontrado no dispositivo.');
        return;
      }
      
      // Se achou no alternativo, usa ele
      await FileSystem.copyAsync({ from: altPath, to: `${FileSystem.cacheDirectory}${DB_NAME}` });
    } else {
      await FileSystem.copyAsync({ from: DB_PATH, to: `${FileSystem.cacheDirectory}${DB_NAME}` });
    }

    const tmpPath = `${FileSystem.cacheDirectory}${DB_NAME}`;

    if (await Sharing.isAvailableAsync()) {
      await Sharing.shareAsync(tmpPath, {
        mimeType: 'application/x-sqlite3',
        dialogTitle: 'Salvar backup do BarCode Inventário',
        UTI: 'public.database',
      });
    } else {
      Alert.alert('Erro', 'Compartilhamento não disponível neste dispositivo.');
    }
  } catch (error) {
    console.error(error);
    Alert.alert('Erro', 'Falha ao exportar backup.');
  }
}

export async function saveLocalBackup() {
  try {
    let sourcePath = DB_PATH;
    const dbInfo = await FileSystem.getInfoAsync(sourcePath);

    if (!dbInfo.exists) {
      sourcePath = `${FileSystem.documentDirectory}${DB_NAME}`;
      const altInfo = await FileSystem.getInfoAsync(sourcePath);
      if (!altInfo.exists) {
        Alert.alert('Erro', 'O arquivo do banco de dados não foi encontrado.');
        return;
      }
    }

    const permissions = await FileSystem.StorageAccessFramework.requestDirectoryPermissionsAsync();
    
    if (permissions.granted) {
      const base64 = await FileSystem.readAsStringAsync(sourcePath, { encoding: FileSystem.EncodingType.Base64 });
      
      const fileName = `barcode_inventario_backup_${new Date().getTime()}.db`;
      const uri = await FileSystem.StorageAccessFramework.createFileAsync(
        permissions.directoryUri, 
        fileName, 
        'application/x-sqlite3'
      );
      
      await FileSystem.writeAsStringAsync(uri, base64, { encoding: FileSystem.EncodingType.Base64 });
      Alert.alert('Sucesso', 'Backup salvo localmente na memória do aparelho com sucesso.');
    } else {
      Alert.alert('Aviso', 'Permissão negada para salvar na memória local.');
    }
  } catch (error) {
    console.error(error);
    Alert.alert('Erro', 'Falha ao salvar o backup localmente.');
  }
}

export async function importBackup(onSuccess: () => void) {
  try {
    const result = await DocumentPicker.getDocumentAsync({
      type: '*/*', // Alguns sistemas não reconhecem o mime do sqlite, então usamos */*
      copyToCacheDirectory: true,
    });

    if (result.canceled) return;

    const selectedFile = result.assets[0];
    
    // Verificação básica se é um arquivo sqlite (opcional)
    if (!selectedFile.name.endsWith('.db')) {
      Alert.alert('Aviso', 'O arquivo selecionado pode não ser um banco de dados válido (.db).');
    }

    // Garantir que a pasta SQLite existe
    const sqliteDir = `${FileSystem.documentDirectory}SQLite/`;
    const dirInfo = await FileSystem.getInfoAsync(sqliteDir);
    if (!dirInfo.exists) {
      await FileSystem.makeDirectoryAsync(sqliteDir, { intermediates: true });
    }

    // Sobrescrever o banco atual
    await FileSystem.copyAsync({
      from: selectedFile.uri,
      to: DB_PATH,
    });

    Alert.alert('Sucesso', 'Backup restaurado com sucesso! O app será reiniciado.', [
      { text: 'OK', onPress: onSuccess }
    ]);
  } catch (error) {
    console.error(error);
    Alert.alert('Erro', 'Falha ao importar o arquivo.');
  }
}
