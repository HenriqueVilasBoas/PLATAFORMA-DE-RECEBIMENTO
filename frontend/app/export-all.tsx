import React, { useState, useEffect } from 'react';
import { View, StyleSheet, ScrollView, Alert, Platform, Linking } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { 
  Text, 
  Card, 
  Button,
  Provider as PaperProvider,
  DefaultTheme,
  Appbar,
  Title,
  Paragraph,
  Chip,
  RadioButton,
  Checkbox,
  ProgressBar
} from 'react-native-paper';
import { StatusBar } from 'expo-status-bar';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { router, useLocalSearchParams } from 'expo-router';
import * as FileSystem from 'expo-file-system';
import * as Sharing from 'expo-sharing';
import * as MailComposer from 'expo-mail-composer';
import { MaterialIcons } from '@expo/vector-icons';
import { useLanguage } from '../contexts/LanguageContext';

const theme = {
  ...DefaultTheme,
  colors: {
    ...DefaultTheme.colors,
    primary: '#2196F3',
    accent: '#FF9800',
    background: '#f5f5f5',
    surface: '#ffffff',
  },
};

export default function ExportAllPage() {
  const { t } = useLanguage();
  const params = useLocalSearchParams();
  const cargoId = params.cargoId;
  
  const [exportType, setExportType] = useState('all');
  const [exportFormat, setExportFormat] = useState('organized');
  const [selectedCargos, setSelectedCargos] = useState([]);
  const [allCargos, setAllCargos] = useState([]);
  const [includePhotos, setIncludePhotos] = useState(true);
  const [loading, setLoading] = useState(false);
  const [progress, setProgress] = useState(0);

  useEffect(() => {
    loadCargos();
  }, []);

  const loadCargos = async () => {
    try {
      const cargosData = await AsyncStorage.getItem('cargo_inspections');
      const cargos = cargosData ? JSON.parse(cargosData) : [];
      setAllCargos(cargos);
      
      if (cargoId) {
        setExportType('single');
        setSelectedCargos([cargoId]);
      } else {
        setSelectedCargos(cargos.map(c => c.id));
      }
    } catch (error) {
      console.error('Error loading cargos:', error);
      Alert.alert(t('message.error'), 'Failed to load material data');
    }
  };

  const formatDate = (dateString) => {
    if (!dateString) return 'N/A';
    const date = new Date(dateString);
    const day = date.getDate().toString().padStart(2, '0');
    const month = (date.getMonth() + 1).toString().padStart(2, '0');
    const year = date.getFullYear();
    return `${day}/${month}/${year}`;
  };

  const toggleCargoSelection = (cargoId) => {
    setSelectedCargos(prev => 
      prev.includes(cargoId) 
        ? prev.filter(id => id !== cargoId)
        : [...prev, cargoId]
    );
  };

  const markAsExported = async (cargoIds) => {
    try {
      const cargosData = await AsyncStorage.getItem('cargo_inspections');
      const cargos = cargosData ? JSON.parse(cargosData) : [];
      
      // Mark selected cargos as exported
      const updatedCargos = cargos.map(cargo => {
        if (cargoIds.includes(cargo.id)) {
          return { ...cargo, exported: true, exportDate: new Date().toISOString() };
        }
        return cargo;
      });
      
      await AsyncStorage.setItem('cargo_inspections', JSON.stringify(updatedCargos));
      
      // Remove from pending sync (reduce pending sync count)
      const pendingData = await AsyncStorage.getItem('pending_sync');
      const pending = pendingData ? JSON.parse(pendingData) : [];
      const filteredPending = pending.filter(item => !cargoIds.includes(item.id));
      await AsyncStorage.setItem('pending_sync', JSON.stringify(filteredPending));
      
    } catch (error) {
      console.error('Error marking as exported:', error);
    }
  };

  const generateTxtContent = (cargo) => {
    const content = `
RELATÓRIO DE INSPEÇÃO DE RECEBIMENTO DE MATERIAL
===============================================

Número da Nota Fiscal: ${cargo.invoiceNumber}
Tipo de Material: ${cargo.materialType}
${cargo.quantityReceived ? `Quantidade Recebida: ${cargo.quantityReceived}` : ''}
Data de Recebimento: ${formatDate(cargo.receiveDate)}
${cargo.storageLocation ? `Local de Armazenamento: ${cargo.storageLocation}` : ''}
Data de Inspeção: ${formatDate(cargo.inspectionDate)}
Última Modificação: ${formatDate(cargo.lastModified)}

INFORMAÇÕES DO INSPETOR
=======================
Inspetor de Qualidade: ${cargo.qualityInspector}
${cargo.safetyInspector ? `Inspetor de Segurança: ${cargo.safetyInspector}` : ''}
${cargo.logisticsInspector ? `Inspetor de Logística: ${cargo.logisticsInspector}` : ''}

STATUS DE CONFORMIDADE
======================
Status: ${cargo.nonConforming ? 'NÃO CONFORME' : 'CONFORME'}
${cargo.nonConforming ? `Tipo de Não Conformidade: ${cargo.nonConformanceType}\nQuantidade Não Conforme: ${cargo.nonConformingQuantity}` : ''}

FOTOS
=====
${cargo.photos ? `Total de Fotos: ${cargo.photos.length}` : 'Nenhuma foto anexada'}

OBSERVAÇÕES ADICIONAIS
======================
${cargo.notes || 'Nenhuma observação adicional'}

DETALHES TÉCNICOS
=================
ID da Inspeção: ${cargo.id}
Exportação Gerada: ${formatDate(new Date().toISOString())}
Sistema: Controle de Recebimento de Material v1.0

---FIM DO RELATÓRIO---
`.trim();
    return content;
  };

  const createSummaryReport = (cargos) => {
    const totalInspections = cargos.length;
    const compliantCount = cargos.filter(c => !c.nonConforming).length;
    const nonCompliantCount = cargos.filter(c => c.nonConforming).length;
    const complianceRate = totalInspections > 0 ? (compliantCount / totalInspections * 100).toFixed(1) : 0;
    
    const materialTypes = {};
    const nonConformanceTypes = {};
    const inspectors = {};
    
    cargos.forEach(cargo => {
      materialTypes[cargo.materialType] = (materialTypes[cargo.materialType] || 0) + 1;
      if (cargo.nonConforming && cargo.nonConformanceType) {
        nonConformanceTypes[cargo.nonConformanceType] = (nonConformanceTypes[cargo.nonConformanceType] || 0) + 1;
      }
      if (cargo.qualityInspector) {
        inspectors[cargo.qualityInspector] = (inspectors[cargo.qualityInspector] || 0) + 1;
      }
    });

    const content = `
RELATÓRIO RESUMO - CONTROLE DE RECEBIMENTO DE MATERIAL
======================================================

VISÃO GERAL
===========
Total de Inspeções: ${totalInspections}
Conformes: ${compliantCount}
Não Conformes: ${nonCompliantCount}
Taxa de Conformidade: ${complianceRate}%

BREAKDOWN POR MATERIAL
======================
${Object.entries(materialTypes).map(([type, count]) => `${type}: ${count} inspeções`).join('\n')}

ATIVIDADE DOS INSPETORES
========================
${Object.entries(inspectors).map(([inspector, count]) => `${inspector}: ${count} inspeções`).join('\n')}

ANÁLISE DE NÃO CONFORMIDADE
============================
${Object.keys(nonConformanceTypes).length > 0 ? 
  Object.entries(nonConformanceTypes).map(([type, count]) => `${type}: ${count} casos`).join('\n') :
  'Nenhum problema de não conformidade registrado'
}

DETALHES DA EXPORTAÇÃO
======================
Data de Exportação: ${formatDate(new Date().toISOString())}
Tipo de Exportação: ${exportType === 'all' ? 'Todas as Inspeções' : 'Inspeções Selecionadas'}
Fotos Incluídas: ${includePhotos ? 'Sim' : 'Não'}
Formato: ${exportFormat === 'organized' ? 'Estrutura de Pastas Organizadas' : 'Arquivos Simples'}

Gerado por Controle de Recebimento de Material v1.0
`.trim();
    return content;
  };

  const exportToDevice = async () => {
    setLoading(true);
    setProgress(0);
    
    try {
      const cargosToExport = allCargos.filter(cargo => selectedCargos.includes(cargo.id));
      
      if (cargosToExport.length === 0) {
        Alert.alert(t('message.error'), 'Nenhum material selecionado para exportação');
        return;
      }

      // Check available space before starting export
      try {
        const storageInfo = await FileSystem.getInfoAsync(FileSystem.documentDirectory);
        console.log('Available storage space checked');
      } catch (error) {
        console.warn('Could not check storage:', error);
      }

      const timestamp = new Date().toISOString().replace(/[:.]/g, '-').split('T')[0];
      const exportDir = `${FileSystem.documentDirectory}exports/material_export_${timestamp}/`;
      
      // Create export directory
      await FileSystem.makeDirectoryAsync(exportDir, { intermediates: true });
      setProgress(0.1);

      if (exportFormat === 'organized') {
        // Create organized folder structure
        await FileSystem.makeDirectoryAsync(`${exportDir}reports/`, { intermediates: true });
        if (includePhotos) {
          await FileSystem.makeDirectoryAsync(`${exportDir}photos/`, { intermediates: true });
        }
        
        // Generate summary report
        const summaryContent = createSummaryReport(cargosToExport);
        await FileSystem.writeAsStringAsync(`${exportDir}RELATORIO_RESUMO.txt`, summaryContent);
        setProgress(0.2);

        // Generate individual reports and save photos
        for (let i = 0; i < cargosToExport.length; i++) {
          const cargo = cargosToExport[i];
          
          // Individual report
          const reportContent = generateTxtContent(cargo);
          await FileSystem.writeAsStringAsync(
            `${exportDir}reports/INSPECAO_${cargo.invoiceNumber}.txt`, 
            reportContent
          );
          
          // Save photos if included (with error handling)
          if (includePhotos && cargo.photos && cargo.photos.length > 0) {
            try {
              const cargoPhotoDir = `${exportDir}photos/${cargo.invoiceNumber}/`;
              await FileSystem.makeDirectoryAsync(cargoPhotoDir, { intermediates: true });
              
              for (let j = 0; j < cargo.photos.length; j++) {
                const photo = cargo.photos[j];
                if (photo.base64) {
                  const photoPath = `${cargoPhotoDir}foto_${j + 1}.jpg`;
                  await FileSystem.writeAsStringAsync(photoPath, photo.base64, {
                    encoding: FileSystem.EncodingType.Base64
                  });
                }
              }
            } catch (photoError) {
              console.warn(`Could not save photos for ${cargo.invoiceNumber}:`, photoError);
              // Continue with export even if some photos fail
            }
          }
          
          setProgress(0.2 + (0.6 * (i + 1) / cargosToExport.length));
        }
      } else {
        // Simple format - all files in one directory
        const summaryContent = createSummaryReport(cargosToExport);
        await FileSystem.writeAsStringAsync(`${exportDir}resumo.txt`, summaryContent);
        
        for (let i = 0; i < cargosToExport.length; i++) {
          const cargo = cargosToExport[i];
          const reportContent = generateTxtContent(cargo);
          await FileSystem.writeAsStringAsync(`${exportDir}${cargo.invoiceNumber}.txt`, reportContent);
          setProgress(0.2 + (0.6 * (i + 1) / cargosToExport.length));
        }
      }

      setProgress(0.9);

      // Mark as exported
      await markAsExported(selectedCargos);

      // Share the export directory
      const shareAvailable = await Sharing.isAvailableAsync();
      if (shareAvailable) {
        await Sharing.shareAsync(exportDir);
        setProgress(1);
        Alert.alert(t('message.success'), 'Exportação concluída e compartilhada com sucesso');
      } else {
        Alert.alert('Exportação Completa', `Arquivos salvos em: ${exportDir}`);
      }

    } catch (error) {
      console.error('Export error:', error);
      
      if (error.message.includes('SQLITE_FULL') || error.message.includes('disk is full')) {
        Alert.alert(
          'Armazenamento Cheio', 
          'Não há espaço suficiente para exportação. Por favor, libere espaço e tente novamente.'
        );
      } else {
        Alert.alert('Falha na Exportação', 'Falha ao exportar inspeções de material. Tente novamente.');
      }
    } finally {
      setLoading(false);
      setProgress(0);
    }
  };

  const exportViaEmail = async () => {
    try {
      const emailAvailable = await MailComposer.isAvailableAsync();
      if (!emailAvailable) {
        Alert.alert('Email Não Disponível', 'Email não está configurado neste dispositivo');
        return;
      }

      const cargosToExport = allCargos.filter(cargo => selectedCargos.includes(cargo.id));
      
      if (cargosToExport.length === 0) {
        Alert.alert(t('message.error'), 'Nenhum material selecionado para exportação');
        return;
      }

      setLoading(true);
      
      // Create email content
      const summaryContent = createSummaryReport(cargosToExport);
      const attachments = [];
      
      // Create temporary files for email attachments
      const timestamp = new Date().toISOString().replace(/[:.]/g, '-').split('T')[0];
      const tempDir = `${FileSystem.documentDirectory}temp_export_${timestamp}/`;
      
      try {
        await FileSystem.makeDirectoryAsync(tempDir, { intermediates: true });
        
        // Summary report
        const summaryPath = `${tempDir}relatorio_resumo.txt`;
        await FileSystem.writeAsStringAsync(summaryPath, summaryContent);
        attachments.push(summaryPath);
        
        // Individual reports (limit to 10 to avoid email size limits)
        for (const cargo of cargosToExport.slice(0, 10)) {
          const reportContent = generateTxtContent(cargo);
          const reportPath = `${tempDir}${cargo.invoiceNumber}.txt`;
          await FileSystem.writeAsStringAsync(reportPath, reportContent);
          attachments.push(reportPath);
        }

        await MailComposer.composeAsync({
          subject: `Exportação Controle de Recebimento - ${formatDate(new Date().toISOString())} - ${cargosToExport.length} Inspeções`,
          body: `Exportação de inspeção de recebimento de material contendo ${cargosToExport.length} inspeções.\n\nConformes: ${cargosToExport.filter(c => !c.nonConforming).length}\nNão Conformes: ${cargosToExport.filter(c => c.nonConforming).length}\n\nGerado por Controle de Recebimento de Material v1.0`,
          attachments: attachments
        });

        // Mark as exported after successful email
        await markAsExported(selectedCargos);

        // Clean up temp files
        await FileSystem.deleteAsync(tempDir, { idempotent: true });
      } catch (fileError) {
        console.error('File system error in email export:', fileError);
        // Fallback to simple email without attachments
        await MailComposer.composeAsync({
          subject: `Exportação Controle de Recebimento - ${formatDate(new Date().toISOString())}`,
          body: summaryContent
        });
        
        // Still mark as exported even without attachments
        await markAsExported(selectedCargos);
      }
      
    } catch (error) {
      console.error('Email export error:', error);
      Alert.alert('Falha no Email', 'Falha ao compor email. Tente novamente.');
    } finally {
      setLoading(false);
    }
  };

  const exportViaWhatsApp = async () => {
    try {
      const cargosToExport = allCargos.filter(cargo => selectedCargos.includes(cargo.id));
      
      if (cargosToExport.length === 0) {
        Alert.alert(t('message.error'), 'Nenhum material selecionado para exportação');
        return;
      }

      // Create a comprehensive text summary for WhatsApp
      const compliantCount = cargosToExport.filter(c => !c.nonConforming).length;
      const nonCompliantCount = cargosToExport.filter(c => c.nonConforming).length;
      
      const summaryText = `📋 *Relatório Controle de Recebimento*

📊 *Resumo*
• Total de Inspeções: ${cargosToExport.length}
• ✅ Conformes: ${compliantCount}
• ⚠️ Não Conformes: ${nonCompliantCount}
• 📈 Taxa de Conformidade: ${cargosToExport.length > 0 ? ((compliantCount / cargosToExport.length) * 100).toFixed(1) : 0}%

📋 *Detalhes das Inspeções*
${cargosToExport.slice(0, 5).map(cargo => `
• #${cargo.invoiceNumber} - ${cargo.materialType}
  Inspetor: ${cargo.qualityInspector}
  Status: ${cargo.nonConforming ? '⚠️ Não Conforme' : '✅ Conforme'}
`).join('')}${cargosToExport.length > 5 ? `\n... e mais ${cargosToExport.length - 5} inspeções` : ''}

📅 Gerado: ${formatDate(new Date().toISOString())}
🔧 Sistema: Controle de Recebimento de Material v1.0`;
      
      const whatsappUrl = `whatsapp://send?text=${encodeURIComponent(summaryText)}`;
      
      try {
        const canOpen = await Linking.canOpenURL(whatsappUrl);
        if (canOpen) {
          await Linking.openURL(whatsappUrl);
          // Mark as exported after successful WhatsApp
          await markAsExported(selectedCargos);
        } else {
          Alert.alert('WhatsApp Não Disponível', 'WhatsApp não está instalado neste dispositivo');
        }
      } catch (linkingError) {
        Alert.alert('Falha no WhatsApp', 'Não foi possível abrir o WhatsApp. Certifique-se de que está instalado.');
      }
    } catch (error) {
      console.error('WhatsApp export error:', error);
      Alert.alert('Falha no WhatsApp', 'Falha ao preparar exportação do WhatsApp');
    }
  };

  const exportToCloud = async () => {
    try {
      Alert.alert(
        'Exportação na Nuvem',
        'Escolha seu serviço de armazenamento na nuvem preferido:',
        [
          { text: t('button.cancel'), style: 'cancel' },
          { text: 'Google Drive', onPress: () => handleCloudExport('Google Drive') },
          { text: 'Dropbox', onPress: () => handleCloudExport('Dropbox') },
          { text: 'Outro', onPress: () => handleCloudExport('outro armazenamento na nuvem') }
        ]
      );
    } catch (error) {
      console.error('Cloud export error:', error);
      Alert.alert('Falha na Exportação na Nuvem', 'Falha ao exportar para armazenamento na nuvem');
    }
  };

  const handleCloudExport = async (provider) => {
    try {
      // First export to device, then let user upload to cloud
      await exportToDevice();
      
      Alert.alert(
        'Instruções de Upload na Nuvem',
        `Os arquivos de exportação foram preparados. Para fazer upload para ${provider}:\n\n1. Abra seu app ${provider}\n2. Navegue até a seção de upload\n3. Selecione a pasta exportada do seu dispositivo\n4. Faça upload para seu armazenamento na nuvem`,
        [{ text: 'OK' }]
      );
    } catch (error) {
      console.error('Cloud export error:', error);
      Alert.alert('Erro', 'Falha ao preparar arquivos para exportação na nuvem');
    }
  };

  return (
    <PaperProvider theme={theme}>
      <SafeAreaView style={styles.container}>
        <StatusBar style="auto" />
        
        <Appbar.Header>
          <Appbar.BackAction onPress={() => router.back()} />
          <Appbar.Content title={t('export.title')} />
        </Appbar.Header>

        <ScrollView style={styles.content} showsVerticalScrollIndicator={false}>
          {/* Export Type Selection */}
          <Card style={styles.section}>
            <Card.Content>
              <Title style={styles.sectionTitle}>{t('export.exportType')}</Title>
              <RadioButton.Group 
                onValueChange={value => setExportType(value)} 
                value={exportType}
              >
                <View style={styles.radioItem}>
                  <RadioButton value="all" />
                  <Text style={styles.radioLabel}>{t('export.allInspections')} ({allCargos.length})</Text>
                </View>
                <View style={styles.radioItem}>
                  <RadioButton value="selected" />
                  <Text style={styles.radioLabel}>{t('export.selectedInspections')}</Text>
                </View>
              </RadioButton.Group>
            </Card.Content>
          </Card>

          {/* Material Selection */}
          {exportType === 'selected' && (
            <Card style={styles.section}>
              <Card.Content>
                <Title style={styles.sectionTitle}>Selecionar Inspeções</Title>
                <Paragraph style={styles.sectionDescription}>
                  Escolha quais inspeções incluir na exportação
                </Paragraph>
                
                {allCargos.map((cargo) => (
                  <View key={cargo.id} style={styles.checkboxItem}>
                    <Checkbox
                      status={selectedCargos.includes(cargo.id) ? 'checked' : 'unchecked'}
                      onPress={() => toggleCargoSelection(cargo.id)}
                    />
                    <View style={styles.cargoInfo}>
                      <Text style={styles.cargoTitle}>#{cargo.invoiceNumber}</Text>
                      <Text style={styles.cargoSubtitle}>
                        {cargo.materialType} • {formatDate(cargo.receiveDate)}
                      </Text>
                    </View>
                    <Chip 
                      mode="flat"
                      style={[
                        styles.statusChip,
                        { backgroundColor: cargo.nonConforming ? '#ffebee' : '#e8f5e8' }
                      ]}
                      textStyle={{ 
                        color: cargo.nonConforming ? '#c62828' : '#2e7d32',
                        fontSize: 10 
                      }}
                    >
                      {cargo.nonConforming ? 'Não Conforme' : 'Conforme'}
                    </Chip>
                  </View>
                ))}
              </Card.Content>
            </Card>
          )}

          {/* Export Options */}
          <Card style={styles.section}>
            <Card.Content>
              <Title style={styles.sectionTitle}>Opções de Exportação</Title>
              
              <View style={styles.optionItem}>
                <Checkbox
                  status={includePhotos ? 'checked' : 'unchecked'}
                  onPress={() => setIncludePhotos(!includePhotos)}
                />
                <Text style={styles.optionLabel}>Incluir Fotos</Text>
              </View>
              
              <Paragraph style={styles.sectionDescription}>Formato:</Paragraph>
              <RadioButton.Group 
                onValueChange={value => setExportFormat(value)} 
                value={exportFormat}
              >
                <View style={styles.radioItem}>
                  <RadioButton value="organized" />
                  <View style={styles.radioContent}>
                    <Text style={styles.radioLabel}>Pasta Organizada</Text>
                    <Text style={styles.radioDescription}>
                      Pastas separadas para relatórios e fotos
                    </Text>
                  </View>
                </View>
                <View style={styles.radioItem}>
                  <RadioButton value="simple" />
                  <View style={styles.radioContent}>
                    <Text style={styles.radioLabel}>Arquivos Simples</Text>
                    <Text style={styles.radioDescription}>
                      Todos os arquivos em um diretório
                    </Text>
                  </View>
                </View>
              </RadioButton.Group>
            </Card.Content>
          </Card>

          {/* Export Methods */}
          <Card style={styles.section}>
            <Card.Content>
              <Title style={styles.sectionTitle}>Métodos de Exportação</Title>
              <Paragraph style={styles.sectionDescription}>
                Escolha como deseja exportar seus dados de inspeção
              </Paragraph>
              
              <Button
                mode="contained"
                onPress={exportToDevice}
                style={styles.exportButton}
                icon="download"
                loading={loading && progress > 0}
                disabled={loading}
              >
                {t('export.directDownload')}
              </Button>
              
              <Button
                mode="outlined"
                onPress={exportViaEmail}
                style={styles.exportButton}
                icon="email"
                disabled={loading}
              >
                {t('export.emailMultiple')}
              </Button>
              
              <Button
                mode="outlined"
                onPress={exportViaWhatsApp}
                style={styles.exportButton}
                icon="whatsapp"
                disabled={loading}
              >
                {t('export.whatsappMultiple')}
              </Button>
              
              <Button
                mode="outlined"
                onPress={exportToCloud}
                style={styles.exportButton}
                icon="cloud-upload"
                disabled={loading}
              >
                {t('export.cloudStorage')}
              </Button>
            </Card.Content>
          </Card>

          {/* Progress Indicator */}
          {loading && progress > 0 && (
            <Card style={styles.section}>
              <Card.Content>
                <Title style={styles.sectionTitle}>Progresso da Exportação</Title>
                <ProgressBar 
                  progress={progress} 
                  color="#2196F3" 
                  style={styles.progressBar}
                />
                <Text style={styles.progressText}>
                  {Math.round(progress * 100)}% Completo
                </Text>
              </Card.Content>
            </Card>
          )}

          {/* Export Summary */}
          <Card style={styles.section}>
            <Card.Content>
              <Title style={styles.sectionTitle}>Resumo da Exportação</Title>
              <View style={styles.summaryRow}>
                <Text style={styles.summaryLabel}>Inspeções:</Text>
                <Text style={styles.summaryValue}>{selectedCargos.length}</Text>
              </View>
              <View style={styles.summaryRow}>
                <Text style={styles.summaryLabel}>Incluir Fotos:</Text>
                <Text style={styles.summaryValue}>{includePhotos ? 'Sim' : 'Não'}</Text>
              </View>
              <View style={styles.summaryRow}>
                <Text style={styles.summaryLabel}>Formato:</Text>
                <Text style={styles.summaryValue}>
                  {exportFormat === 'organized' ? 'Pasta Organizada' : 'Arquivos Simples'}
                </Text>
              </View>
            </Card.Content>
          </Card>
        </ScrollView>
      </SafeAreaView>
    </PaperProvider>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,  
    backgroundColor: '#f5f5f5',
  },
  content: {
    flex: 1,
    padding: 16,
  },
  section: {
    marginBottom: 16,
    elevation: 2,
  },
  sectionTitle: {
    fontSize: 18,
    marginBottom: 12,
  },
  sectionDescription: {
    fontSize: 14,
    color: '#666',
    marginBottom: 16,
  },
  radioItem: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 8,
  },
  radioLabel: {
    fontSize: 16,
    marginLeft: 8,
  },
  radioContent: {
    marginLeft: 8,
    flex: 1,
  },
  radioDescription: {
    fontSize: 12,
    color: '#666',
    marginTop: 2,
  },
  checkboxItem: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 12,
    borderBottomWidth: 1,
    borderBottomColor: '#eee',
  },
  cargoInfo: {
    flex: 1,
    marginLeft: 12,
  },
  cargoTitle: {
    fontSize: 16,
    fontWeight: '500',
  },
  cargoSubtitle: {
    fontSize: 14,
    color: '#666',
    marginTop: 2,
  },
  statusChip: {
    height: 24,
    marginLeft: 8,
  },
  optionItem: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 8,
    marginBottom: 12,
  },
  optionLabel: {
    fontSize: 16,
    marginLeft: 8,
  },
  exportButton: {
    marginBottom: 12,
    paddingVertical: 4,
  },
  progressBar: {
    height: 8,
    borderRadius: 4,
    marginVertical: 12,
  },
  progressText: {
    textAlign: 'center',
    fontSize: 14,
    color: '#666',
  },
  summaryRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    paddingVertical: 8,
    borderBottomWidth: 1,
    borderBottomColor: '#eee',
  },
  summaryLabel: {
    fontSize: 14,
    color: '#666',
  },
  summaryValue: {
    fontSize: 14,
    fontWeight: '500',
  },
});