import React, { useState, useEffect } from 'react';
import { View, StyleSheet, ScrollView, Alert, Platform } from 'react-native';
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
  List,
  ProgressBar
} from 'react-native-paper';
import { StatusBar } from 'expo-status-bar';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { router, useLocalSearchParams } from 'expo-router';
import * as FileSystem from 'expo-file-system';
import * as Sharing from 'expo-sharing';
import * as MailComposer from 'expo-mail-composer';
import * as DocumentPicker from 'expo-document-picker';
import { MaterialIcons } from '@expo/vector-icons';
import { format } from 'date-fns';

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

export default function ExportPage() {
  const params = useLocalSearchParams();
  const cargoId = params.cargoId;
  
  const [exportType, setExportType] = useState('all'); // 'all', 'single'
  const [exportFormat, setExportFormat] = useState('organized'); // 'organized', 'simple'
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
        // Single cargo export
        setExportType('single');
        setSelectedCargos([cargoId]);
      } else {
        // Select all by default
        setSelectedCargos(cargos.map(c => c.id));
      }
    } catch (error) {
      console.error('Error loading cargos:', error);
      Alert.alert('Error', 'Failed to load cargo data');
    }
  };

  const toggleCargoSelection = (cargoId) => {
    setSelectedCargos(prev => 
      prev.includes(cargoId) 
        ? prev.filter(id => id !== cargoId)
        : [...prev, cargoId]
    );
  };

  const generateTxtContent = (cargo) => {
    const content = `
CARGO INSPECTION REPORT
========================

Invoice Number: ${cargo.invoiceNumber}
Material Type: ${cargo.materialType}
Quantity Received: ${cargo.quantityReceived}
Inspection Date: ${format(new Date(cargo.inspectionDate), 'PPpp')}
Last Modified: ${format(new Date(cargo.lastModified), 'PPpp')}

CONFORMANCE STATUS
==================
Status: ${cargo.nonConforming ? 'NON-CONFORMING' : 'COMPLIANT'}
${cargo.nonConforming ? `Non-Conformance Type: ${cargo.nonConformanceType}\nNon-Conforming Quantity: ${cargo.nonConformingQuantity}` : ''}

PHOTOS
======
${cargo.photos ? `Total Photos: ${cargo.photos.length}` : 'No photos attached'}
${cargo.photos ? cargo.photos.map((photo, index) => 
  `Photo ${index + 1}: Captured at ${format(new Date(photo.timestamp), 'PPpp')}`
).join('\n') : ''}

ADDITIONAL NOTES
================
${cargo.notes || 'No additional notes'}

TECHNICAL DETAILS
=================
Inspection ID: ${cargo.id}
Export Generated: ${format(new Date(), 'PPpp')}
System: Logistics Inspector v1.0

---END OF REPORT---
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
    
    cargos.forEach(cargo => {
      materialTypes[cargo.materialType] = (materialTypes[cargo.materialType] || 0) + 1;
      if (cargo.nonConforming && cargo.nonConformanceType) {
        nonConformanceTypes[cargo.nonConformanceType] = (nonConformanceTypes[cargo.nonConformanceType] || 0) + 1;
      }
    });

    const content = `
LOGISTICS INSPECTION SUMMARY REPORT
====================================

OVERVIEW
========
Total Inspections: ${totalInspections}
Compliant: ${compliantCount}
Non-Compliant: ${nonCompliantCount}
Compliance Rate: ${complianceRate}%

MATERIAL BREAKDOWN
==================
${Object.entries(materialTypes).map(([type, count]) => `${type}: ${count} inspections`).join('\n')}

NON-CONFORMANCE ANALYSIS
========================
${Object.keys(nonConformanceTypes).length > 0 ? 
  Object.entries(nonConformanceTypes).map(([type, count]) => `${type}: ${count} cases`).join('\n') :
  'No non-conformance issues recorded'
}

EXPORT DETAILS
==============
Export Date: ${format(new Date(), 'PPpp')}
Export Type: ${exportType === 'all' ? 'All Inspections' : 'Selected Inspections'}
Photos Included: ${includePhotos ? 'Yes' : 'No'}
Format: ${exportFormat === 'organized' ? 'Organized Folder Structure' : 'Simple Files'}

Generated by Logistics Inspector v1.0
`.trim();
    return content;
  };

  const exportToDevice = async () => {
    setLoading(true);
    setProgress(0);
    
    try {
      const cargosToExport = allCargos.filter(cargo => selectedCargos.includes(cargo.id));
      
      if (cargosToExport.length === 0) {
        Alert.alert('Error', 'No cargos selected for export');
        return;
      }

      const timestamp = format(new Date(), 'yyyyMMdd_HHmmss');
      const exportDir = `${FileSystem.documentDirectory}exports/logistics_export_${timestamp}/`;
      
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
        await FileSystem.writeAsStringAsync(`${exportDir}SUMMARY_REPORT.txt`, summaryContent);
        setProgress(0.2);

        // Generate individual reports and save photos
        for (let i = 0; i < cargosToExport.length; i++) {
          const cargo = cargosToExport[i];
          
          // Individual report
          const reportContent = generateTxtContent(cargo);
          await FileSystem.writeAsStringAsync(
            `${exportDir}reports/INSPECTION_${cargo.invoiceNumber}.txt`, 
            reportContent
          );
          
          // Save photos if included
          if (includePhotos && cargo.photos && cargo.photos.length > 0) {
            const cargoPhotoDir = `${exportDir}photos/${cargo.invoiceNumber}/`;
            await FileSystem.makeDirectoryAsync(cargoPhotoDir, { intermediates: true });
            
            for (let j = 0; j < cargo.photos.length; j++) {
              const photo = cargo.photos[j];
              const photoPath = `${cargoPhotoDir}photo_${j + 1}_${format(new Date(photo.timestamp), 'yyyyMMdd_HHmmss')}.jpg`;
              await FileSystem.writeAsStringAsync(photoPath, photo.base64, {
                encoding: FileSystem.EncodingType.Base64
              });
            }
          }
          
          setProgress(0.2 + (0.6 * (i + 1) / cargosToExport.length));
        }
      } else {
        // Simple format - all files in one directory
        const summaryContent = createSummaryReport(cargosToExport);
        await FileSystem.writeAsStringAsync(`${exportDir}summary.txt`, summaryContent);
        
        for (let i = 0; i < cargosToExport.length; i++) {
          const cargo = cargosToExport[i];
          const reportContent = generateTxtContent(cargo);
          await FileSystem.writeAsStringAsync(`${exportDir}${cargo.invoiceNumber}.txt`, reportContent);
          setProgress(0.2 + (0.6 * (i + 1) / cargosToExport.length));
        }
      }

      setProgress(0.9);

      // Share the export directory
      if (await Sharing.isAvailableAsync()) {
        await Sharing.shareAsync(exportDir);
        setProgress(1);
        Alert.alert('Success', 'Export completed and shared successfully');
      } else {
        Alert.alert('Export Complete', `Files saved to: ${exportDir}`);
      }

    } catch (error) {
      console.error('Export error:', error);
      Alert.alert('Export Failed', 'Failed to export cargo inspections');
    } finally {
      setLoading(false);
      setProgress(0);
    }
  };

  const exportViaEmail = async () => {
    try {
      if (!(await MailComposer.isAvailableAsync())) {
        Alert.alert('Email Not Available', 'Email is not configured on this device');
        return;
      }

      const cargosToExport = allCargos.filter(cargo => selectedCargos.includes(cargo.id));
      
      if (cargosToExport.length === 0) {
        Alert.alert('Error', 'No cargos selected for export');
        return;
      }

      setLoading(true);
      
      // Create email content
      const summaryContent = createSummaryReport(cargosToExport);
      const attachments = [];
      
      // Create temporary files for email attachments
      const timestamp = format(new Date(), 'yyyyMMdd_HHmmss');
      const tempDir = `${FileSystem.documentDirectory}temp_export_${timestamp}/`;
      await FileSystem.makeDirectoryAsync(tempDir, { intermediates: true });
      
      // Summary report
      const summaryPath = `${tempDir}summary_report.txt`;
      await FileSystem.writeAsStringAsync(summaryPath, summaryContent);
      attachments.push(summaryPath);
      
      // Individual reports
      for (const cargo of cargosToExport.slice(0, 5)) { // Limit to 5 to avoid email size limits
        const reportContent = generateTxtContent(cargo);
        const reportPath = `${tempDir}${cargo.invoiceNumber}.txt`;
        await FileSystem.writeAsStringAsync(reportPath, reportContent);
        attachments.push(reportPath);
      }

      await MailComposer.composeAsync({
        subject: `Cargo Inspection Export - ${format(new Date(), 'PPP')}`,
        body: `Cargo inspection export containing ${cargosToExport.length} inspections.\n\nGenerated by Logistics Inspector v1.0`,
        attachments: attachments
      });

      // Clean up temp files
      await FileSystem.deleteAsync(tempDir, { idempotent: true });
      
    } catch (error) {
      console.error('Email export error:', error);
      Alert.alert('Email Failed', 'Failed to compose email');
    } finally {
      setLoading(false);
    }
  };

  const exportToCloud = async () => {
    try {
      Alert.alert(
        'Cloud Export',
        'Choose your preferred cloud storage service:',
        [
          { text: 'Cancel', style: 'cancel' },
          { text: 'Google Drive', onPress: () => handleCloudExport('google') },
          { text: 'Dropbox', onPress: () => handleCloudExport('dropbox') },
          { text: 'Other', onPress: () => handleCloudExport('other') }
        ]
      );
    } catch (error) {
      console.error('Cloud export error:', error);
      Alert.alert('Cloud Export Failed', 'Failed to export to cloud storage');
    }
  };

  const handleCloudExport = async (provider) => {
    try {
      // First export to device, then let user upload to cloud
      await exportToDevice();
      
      Alert.alert(
        'Cloud Upload',
        `Export files have been prepared. Use your device's ${provider} app to upload the exported folder to your cloud storage.`,
        [{ text: 'OK' }]
      );
    } catch (error) {
      console.error('Cloud export error:', error);
      Alert.alert('Error', 'Failed to prepare files for cloud export');
    }
  };

  return (
    <PaperProvider theme={theme}>
      <SafeAreaView style={styles.container}>
        <StatusBar style="auto" />
        
        <Appbar.Header>
          <Appbar.BackAction onPress={() => router.back()} />
          <Appbar.Content title="Export Inspections" />
        </Appbar.Header>

        <ScrollView style={styles.content} showsVerticalScrollIndicator={false}>
          {/* Export Type Selection */}
          <Card style={styles.section}>
            <Card.Content>
              <Title style={styles.sectionTitle}>Export Type</Title>
              <RadioButton.Group 
                onValueChange={value => setExportType(value)} 
                value={exportType}
              >
                <View style={styles.radioItem}>
                  <RadioButton value="all" />
                  <Text style={styles.radioLabel}>All Inspections ({allCargos.length})</Text>
                </View>
                <View style={styles.radioItem}>
                  <RadioButton value="selected" />
                  <Text style={styles.radioLabel}>Selected Inspections</Text>
                </View>
              </RadioButton.Group>
            </Card.Content>
          </Card>

          {/* Cargo Selection */}
          {exportType === 'selected' && (
            <Card style={styles.section}>
              <Card.Content>
                <Title style={styles.sectionTitle}>Select Inspections</Title>
                <Paragraph style={styles.sectionDescription}>
                  Choose which inspections to include in the export
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
                        {cargo.materialType} • {format(new Date(cargo.inspectionDate), 'PP')}
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
                      {cargo.nonConforming ? 'Non-Conforming' : 'Compliant'}
                    </Chip>
                  </View>
                ))}
              </Card.Content>
            </Card>
          )}

          {/* Export Options */}
          <Card style={styles.section}>
            <Card.Content>
              <Title style={styles.sectionTitle}>Export Options</Title>
              
              <View style={styles.optionItem}>
                <Checkbox
                  status={includePhotos ? 'checked' : 'unchecked'}
                  onPress={() => setIncludePhotos(!includePhotos)}
                />
                <Text style={styles.optionLabel}>Include Photos</Text>
              </View>
              
              <Paragraph style={styles.sectionDescription}>Format:</Paragraph>
              <RadioButton.Group 
                onValueChange={value => setExportFormat(value)} 
                value={exportFormat}
              >
                <View style={styles.radioItem}>
                  <RadioButton value="organized" />
                  <View style={styles.radioContent}>
                    <Text style={styles.radioLabel}>Organized Folder</Text>
                    <Text style={styles.radioDescription}>
                      Separate folders for reports and photos
                    </Text>
                  </View>
                </View>
                <View style={styles.radioItem}>
                  <RadioButton value="simple" />
                  <View style={styles.radioContent}>
                    <Text style={styles.radioLabel}>Simple Files</Text>
                    <Text style={styles.radioDescription}>
                      All files in one directory
                    </Text>
                  </View>
                </View>
              </RadioButton.Group>
            </Card.Content>
          </Card>

          {/* Export Methods */}
          <Card style={styles.section}>
            <Card.Content>
              <Title style={styles.sectionTitle}>Export Methods</Title>
              <Paragraph style={styles.sectionDescription}>
                Choose how you want to export your inspection data
              </Paragraph>
              
              <Button
                mode="contained"
                onPress={exportToDevice}
                style={styles.exportButton}
                icon="download"
                loading={loading && progress > 0}
                disabled={loading}
              >
                Direct Download
              </Button>
              
              <Button
                mode="outlined"
                onPress={exportViaEmail}
                style={styles.exportButton}
                icon="email"
                disabled={loading}
              >
                Email Export
              </Button>
              
              <Button
                mode="outlined"
                onPress={exportToCloud}
                style={styles.exportButton}
                icon="cloud-upload"
                disabled={loading}
              >
                Cloud Storage
              </Button>
            </Card.Content>
          </Card>

          {/* Progress Indicator */}
          {loading && progress > 0 && (
            <Card style={styles.section}>
              <Card.Content>
                <Title style={styles.sectionTitle}>Export Progress</Title>
                <ProgressBar 
                  progress={progress} 
                  color="#2196F3" 
                  style={styles.progressBar}
                />
                <Text style={styles.progressText}>
                  {Math.round(progress * 100)}% Complete
                </Text>
              </Card.Content>
            </Card>
          )}

          {/* Export Summary */}
          <Card style={styles.section}>
            <Card.Content>
              <Title style={styles.sectionTitle}>Export Summary</Title>
              <View style={styles.summaryRow}>
                <Text style={styles.summaryLabel}>Inspections:</Text>
                <Text style={styles.summaryValue}>{selectedCargos.length}</Text>
              </View>
              <View style={styles.summaryRow}>
                <Text style={styles.summaryLabel}>Include Photos:</Text>
                <Text style={styles.summaryValue}>{includePhotos ? 'Yes' : 'No'}</Text>
              </View>
              <View style={styles.summaryRow}>
                <Text style={styles.summaryLabel}>Format:</Text>
                <Text style={styles.summaryValue}>
                  {exportFormat === 'organized' ? 'Organized Folder' : 'Simple Files'}
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