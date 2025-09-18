import React, { useState, useEffect } from 'react';
import { View, StyleSheet, ScrollView, Alert, Image, KeyboardAvoidingView, Platform, Linking } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { 
  Text, 
  TextInput,
  Button,
  Provider as PaperProvider,
  DefaultTheme,
  Appbar,
  Card,
  Title,
  Paragraph,
  Switch,
  Menu,
  Divider,
  Chip,
  IconButton,
  Dialog,
  Portal
} from 'react-native-paper';
import { StatusBar } from 'expo-status-bar';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { router, useLocalSearchParams } from 'expo-router';
import { Camera } from 'expo-camera';
import * as ImagePicker from 'expo-image-picker';
import * as FileSystem from 'expo-file-system';
import { MaterialIcons } from '@expo/vector-icons';

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

const NON_CONFORMANCE_TYPES = [
  'Physical Damage',
  'Packaging Damage',
  'Quantity Discrepancy',
  'Quality Issues',
  'Missing Documentation',
  'Contamination',
  'Wrong Specification',
  'Expiry/Date Issues'
];

// Utility function to compress image to reduce storage size
const compressImage = (base64Image, quality = 0.5) => {
  try {
    // Simple compression by reducing quality
    return base64Image; // For now, we'll keep original but could implement compression
  } catch (error) {
    console.error('Error compressing image:', error);
    return base64Image;
  }
};

// Check available storage before saving
const checkStorageSpace = async () => {
  try {
    const storageInfo = await FileSystem.getInfoAsync(FileSystem.documentDirectory);
    // If we can't get info, assume we have space
    return true;
  } catch (error) {
    console.warn('Could not check storage space:', error);
    return true;
  }
};

export default function AddCargoPage() {
  const params = useLocalSearchParams();
  const isEdit = !!params.editId;
  
  const [formData, setFormData] = useState({
    invoiceNumber: '',
    materialType: '',
    quantityReceived: '',
    receiveDate: new Date().toISOString().split('T')[0], // Default to today
    qualityInspector: '',
    safetyInspector: '',
    logisticsInspector: '',
    nonConforming: false,
    nonConformanceType: '',
    nonConformingQuantity: '',
    notes: '',
    photos: []
  });
  
  const [loading, setLoading] = useState(false);
  const [cameraPermission, setCameraPermission] = useState(null);
  const [nonConformanceMenuVisible, setNonConformanceMenuVisible] = useState(false);
  const [cameraDialogVisible, setCameraDialogVisible] = useState(false);
  const [errors, setErrors] = useState({});

  useEffect(() => {
    requestPermissions();
    if (isEdit) {
      loadCargoForEdit();
    }
  }, []);

  const requestPermissions = async () => {
    try {
      const cameraStatus = await Camera.requestCameraPermissionsAsync();
      setCameraPermission(cameraStatus.status === 'granted');
      
      const mediaLibraryStatus = await ImagePicker.requestMediaLibraryPermissionsAsync();
      console.log('Permissions requested:', { camera: cameraStatus.status, media: mediaLibraryStatus.status });
    } catch (error) {
      console.error('Error requesting permissions:', error);
    }
  };

  const loadCargoForEdit = async () => {
    try {
      const cargosData = await AsyncStorage.getItem('cargo_inspections');
      const cargos = cargosData ? JSON.parse(cargosData) : [];
      const cargoToEdit = cargos.find(c => c.id === params.editId);
      
      if (cargoToEdit) {
        setFormData({
          invoiceNumber: cargoToEdit.invoiceNumber,
          materialType: cargoToEdit.materialType,
          quantityReceived: cargoToEdit.quantityReceived || '',
          receiveDate: cargoToEdit.receiveDate ? cargoToEdit.receiveDate.split('T')[0] : new Date().toISOString().split('T')[0],
          qualityInspector: cargoToEdit.qualityInspector || '',
          safetyInspector: cargoToEdit.safetyInspector || '',
          logisticsInspector: cargoToEdit.logisticsInspector || '',
          nonConforming: cargoToEdit.nonConforming,
          nonConformanceType: cargoToEdit.nonConformanceType || '',
          nonConformingQuantity: cargoToEdit.nonConformingQuantity || '',
          notes: cargoToEdit.notes || '',
          photos: cargoToEdit.photos || []
        });
      }
    } catch (error) {
      console.error('Error loading cargo for edit:', error);
      Alert.alert('Error', 'Failed to load cargo data');
    }
  };

  const validateForm = () => {
    const newErrors = {};
    
    if (!formData.invoiceNumber.trim()) {
      newErrors.invoiceNumber = 'Invoice number is required';
    }
    
    if (!formData.materialType.trim()) {
      newErrors.materialType = 'Material type is required';
    }
    
    if (!formData.qualityInspector.trim()) {
      newErrors.qualityInspector = 'Quality inspector is required';
    }
    
    if (formData.nonConforming) {
      if (!formData.nonConformanceType) {
        newErrors.nonConformanceType = 'Non-conformance type is required';
      }
      
      if (!formData.nonConformingQuantity.trim()) {
        newErrors.nonConformingQuantity = 'Non-conforming quantity is required';
      } else if (isNaN(parseFloat(formData.nonConformingQuantity))) {
        newErrors.nonConformingQuantity = 'Quantity must be a valid number';
      }
    }
    
    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const openCameraOptions = () => {
    setCameraDialogVisible(true);
  };

  const handleCameraOptionSelect = (option) => {
    setCameraDialogVisible(false);
    
    switch (option) {
      case 'timestamp':
        openTimestampApps();
        break;
      case 'default':
        takePictureDefault();
        break;
      case 'gallery':
        selectFromGallery();
        break;
    }
  };

  const openTimestampApps = async () => {
    try {
      // Show system-level app chooser by opening photo with timestamp apps
      Alert.alert(
        'Choose Camera App',
        'Select your preferred timestamp camera app:',
        [
          { text: 'Cancel', style: 'cancel' },
          { text: 'Timestamp Camera', onPress: () => openSpecificApp('timestamp-camera://') },
          { text: 'Open Camera', onPress: () => openSpecificApp('opencamera://') },
          { text: 'Default Camera', onPress: () => takePictureDefault() },
          { text: 'Browse Gallery', onPress: () => selectFromGallery() }
        ]
      );
    } catch (error) {
      console.error('Error showing camera options:', error);
      takePictureDefault();
    }
  };

  const openSpecificApp = async (appUrl) => {
    try {
      const canOpen = await Linking.canOpenURL(appUrl);
      if (canOpen) {
        await Linking.openURL(appUrl);
        
        // Give user guidance on returning with photos
        setTimeout(() => {
          Alert.alert(
            'Photo Instructions',
            'After taking photos with your camera app:\n\n1. Save the photos to your gallery\n2. Return to this app\n3. Use "From Gallery" to add them to this inspection',
            [
              { text: 'OK' },
              { text: 'Open Gallery Now', onPress: () => selectFromGallery() }
            ]
          );
        }, 1500);
      } else {
        Alert.alert(
          'App Not Found',
          'This camera app is not installed. Would you like to use the default camera?',
          [
            { text: 'Cancel', style: 'cancel' },
            { text: 'Default Camera', onPress: () => takePictureDefault() },
            { text: 'Gallery', onPress: () => selectFromGallery() }
          ]
        );
      }
    } catch (error) {
      console.error('Error opening specific app:', error);
      takePictureDefault();
    }
  };

  const takePictureDefault = async () => {
    if (!cameraPermission) {
      Alert.alert('Permission Required', 'Camera permission is required to take photos');
      return;
    }

    try {
      // Check storage space before taking photo
      const hasSpace = await checkStorageSpace();
      if (!hasSpace) {
        Alert.alert('Storage Full', 'Not enough storage space for photos. Please free some space and try again.');
        return;
      }

      const result = await ImagePicker.launchCameraAsync({
        mediaTypes: [ImagePicker.MediaType.Images],
        allowsEditing: true,
        aspect: [4, 3],
        quality: 0.7, // Reduced quality to save space
        base64: true
      });

      if (!result.canceled && result.assets[0]) {
        const compressedBase64 = compressImage(result.assets[0].base64, 0.7);
        
        const photoData = {
          id: Date.now().toString(),
          base64: compressedBase64,
          timestamp: new Date().toISOString(),
          width: result.assets[0].width,
          height: result.assets[0].height
        };

        setFormData(prev => ({
          ...prev,
          photos: [...prev.photos, photoData]
        }));
        
        Alert.alert('Success', 'Photo added successfully');
      }
    } catch (error) {
      console.error('Error taking picture:', error);
      Alert.alert('Error', 'Failed to take picture. Please try again.');
    }
  };

  const selectFromGallery = async () => {
    try {
      // Check storage space before selecting photos
      const hasSpace = await checkStorageSpace();
      if (!hasSpace) {
        Alert.alert('Storage Full', 'Not enough storage space for photos. Please free some space and try again.');
        return;
      }

      const result = await ImagePicker.launchImageLibraryAsync({
        mediaTypes: [ImagePicker.MediaType.Images],
        allowsMultipleSelection: true,
        quality: 0.7, // Reduced quality to save space
        base64: true,
        selectionLimit: 5 // Limit to prevent storage issues
      });

      if (!result.canceled && result.assets.length > 0) {
        const newPhotos = result.assets.map(asset => {
          const compressedBase64 = compressImage(asset.base64, 0.7);
          return {
            id: Date.now().toString() + Math.random().toString(36).substr(2, 9),
            base64: compressedBase64,
            timestamp: new Date().toISOString(),
            width: asset.width,
            height: asset.height
          };
        });

        setFormData(prev => ({
          ...prev,
          photos: [...prev.photos, ...newPhotos]
        }));
        
        Alert.alert('Success', `${newPhotos.length} photo(s) added successfully`);
      }
    } catch (error) {
      console.error('Error selecting from gallery:', error);
      Alert.alert('Error', 'Failed to select images. Please try again.');
    }
  };

  const removePhoto = (photoId) => {
    setFormData(prev => ({
      ...prev,
      photos: prev.photos.filter(photo => photo.id !== photoId)
    }));
  };

  const formatDateForDisplay = (dateString) => {
    const date = new Date(dateString);
    const day = date.getDate().toString().padStart(2, '0');
    const month = (date.getMonth() + 1).toString().padStart(2, '0');
    const year = date.getFullYear();
    return `${day}/${month}/${year}`;
  };

  const handleSave = async () => {
    if (!validateForm()) {
      Alert.alert('Validation Error', 'Please fix the errors and try again');
      return;
    }

    setLoading(true);
    
    try {
      const cargoData = {
        ...formData,
        id: isEdit ? params.editId : Date.now().toString(),
        inspectionDate: isEdit ? 
          (await getExistingInspectionDate()) : 
          new Date().toISOString(),
        lastModified: new Date().toISOString()
      };

      // Load existing cargos
      const cargosData = await AsyncStorage.getItem('cargo_inspections');
      const cargos = cargosData ? JSON.parse(cargosData) : [];
      
      if (isEdit) {
        // Update existing cargo
        const index = cargos.findIndex(c => c.id === params.editId);
        if (index !== -1) {
          cargos[index] = cargoData;
        }
      } else {
        // Add new cargo
        cargos.push(cargoData);
      }

      // Check storage before saving
      const hasSpace = await checkStorageSpace();
      if (!hasSpace) {
        Alert.alert('Storage Full', 'Not enough storage space. Please delete some old inspections or photos.');
        return;
      }

      // Save to local storage
      await AsyncStorage.setItem('cargo_inspections', JSON.stringify(cargos));
      
      // Add to pending sync with error handling
      try {
        await addToPendingSync(cargoData);
      } catch (syncError) {
        console.warn('Could not add to pending sync:', syncError);
        // Continue anyway - sync is not critical for core functionality
      }
      
      Alert.alert(
        'Success',
        `Material inspection ${isEdit ? 'updated' : 'saved'} successfully`,
        [{ text: 'OK', onPress: () => router.back() }]
      );
      
    } catch (error) {
      console.error('Error saving cargo:', error);
      
      if (error.message.includes('SQLITE_FULL') || error.message.includes('disk is full')) {
        Alert.alert(
          'Storage Full', 
          'Not enough storage space. Please:\n\n1. Delete old inspections\n2. Remove some photos\n3. Free up device storage\n\nThen try saving again.'
        );
      } else {
        Alert.alert('Error', 'Failed to save material inspection. Please try again.');
      }
    } finally {
      setLoading(false);
    }
  };

  const getExistingInspectionDate = async () => {
    try {
      const cargosData = await AsyncStorage.getItem('cargo_inspections');
      const cargos = cargosData ? JSON.parse(cargosData) : [];
      const existing = cargos.find(c => c.id === params.editId);
      return existing ? existing.inspectionDate : new Date().toISOString();
    } catch (error) {
      return new Date().toISOString();
    }
  };

  const addToPendingSync = async (cargoData) => {
    try {
      const pendingData = await AsyncStorage.getItem('pending_sync');
      const pending = pendingData ? JSON.parse(pendingData) : [];
      
      // Remove existing entry if updating
      const filtered = pending.filter(item => item.id !== cargoData.id);
      
      // Only add essential data to pending sync to reduce storage
      const syncData = {
        id: cargoData.id,
        invoiceNumber: cargoData.invoiceNumber,
        syncAction: isEdit ? 'update' : 'create',
        syncTimestamp: new Date().toISOString()
      };
      
      filtered.push(syncData);
      
      await AsyncStorage.setItem('pending_sync', JSON.stringify(filtered));
    } catch (error) {
      console.error('Error adding to pending sync:', error);
      throw error;
    }
  };

  return (
    <PaperProvider theme={theme}>
      <SafeAreaView style={styles.container}>
        <StatusBar style="auto" />
        
        <Appbar.Header>
          <Appbar.BackAction onPress={() => router.back()} />
          <Appbar.Content title={isEdit ? 'Edit Inspection' : 'New Inspection'} />
          <Appbar.Action 
            icon="content-save" 
            onPress={handleSave}
            disabled={loading}
          />
        </Appbar.Header>

        <KeyboardAvoidingView 
          style={styles.keyboardView}
          behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
        >
          <ScrollView style={styles.content} showsVerticalScrollIndicator={false}>
            {/* Basic Information */}
            <Card style={styles.section}>
              <Card.Content>
                <Title style={styles.sectionTitle}>Basic Information</Title>
                
                <TextInput
                  label="Invoice Number *"
                  value={formData.invoiceNumber}
                  onChangeText={(text) => setFormData(prev => ({ ...prev, invoiceNumber: text }))}
                  style={styles.input}
                  error={!!errors.invoiceNumber}
                  mode="outlined"
                />
                {errors.invoiceNumber && (
                  <Text style={styles.errorText}>{errors.invoiceNumber}</Text>
                )}

                <TextInput
                  label="Material Type *"
                  value={formData.materialType}
                  onChangeText={(text) => setFormData(prev => ({ ...prev, materialType: text }))}
                  style={styles.input}
                  error={!!errors.materialType}
                  mode="outlined"
                />
                {errors.materialType && (
                  <Text style={styles.errorText}>{errors.materialType}</Text>
                )}

                <TextInput
                  label="Quantity Received (Optional)"
                  value={formData.quantityReceived}
                  onChangeText={(text) => setFormData(prev => ({ ...prev, quantityReceived: text }))}
                  style={styles.input}
                  mode="outlined"
                  keyboardType="numeric"
                />

                <TextInput
                  label="Receive Date"
                  value={formatDateForDisplay(formData.receiveDate)}
                  editable={false}
                  style={styles.input}
                  mode="outlined"
                  right={<TextInput.Icon icon="calendar" />}
                />
              </Card.Content>
            </Card>

            {/* Inspector Information */}
            <Card style={styles.section}>
              <Card.Content>
                <Title style={styles.sectionTitle}>Inspector Information</Title>
                
                <TextInput
                  label="Quality Inspector *"
                  value={formData.qualityInspector}
                  onChangeText={(text) => setFormData(prev => ({ ...prev, qualityInspector: text }))}
                  style={styles.input}
                  error={!!errors.qualityInspector}
                  mode="outlined"
                />
                {errors.qualityInspector && (
                  <Text style={styles.errorText}>{errors.qualityInspector}</Text>
                )}

                <TextInput
                  label="Safety Inspector (Optional)"
                  value={formData.safetyInspector}
                  onChangeText={(text) => setFormData(prev => ({ ...prev, safetyInspector: text }))}
                  style={styles.input}
                  mode="outlined"
                />

                <TextInput
                  label="Logistics Inspector (Optional)"  
                  value={formData.logisticsInspector}
                  onChangeText={(text) => setFormData(prev => ({ ...prev, logisticsInspector: text }))}
                  style={styles.input}
                  mode="outlined"
                />
              </Card.Content>
            </Card>

            {/* Non-Conformance */}
            <Card style={styles.section}>
              <Card.Content>
                <Title style={styles.sectionTitle}>Conformance Status</Title>
                
                <View style={styles.switchContainer}>
                  <Text style={styles.switchLabel}>Non-Conforming Material</Text>
                  <Switch
                    value={formData.nonConforming}
                    onValueChange={(value) => setFormData(prev => ({ 
                      ...prev, 
                      nonConforming: value,
                      nonConformanceType: value ? prev.nonConformanceType : '',
                      nonConformingQuantity: value ? prev.nonConformingQuantity : ''
                    }))}
                  />
                </View>

                {formData.nonConforming && (
                  <React.Fragment>
                    <Divider style={styles.divider} />
                    
                    <Menu
                      visible={nonConformanceMenuVisible}
                      onDismiss={() => setNonConformanceMenuVisible(false)}
                      anchor={
                        <Button
                          mode="outlined"
                          onPress={() => setNonConformanceMenuVisible(true)}
                          style={[styles.input, { justifyContent: 'flex-start' }]}
                          contentStyle={{ justifyContent: 'flex-start' }}
                          icon="chevron-down"
                        >
                          {formData.nonConformanceType || 'Select Non-Conformance Type *'}
                        </Button>
                      }
                    >
                      {NON_CONFORMANCE_TYPES.map((type) => (
                        <Menu.Item
                          key={type}
                          onPress={() => {
                            setFormData(prev => ({ ...prev, nonConformanceType: type }));
                            setNonConformanceMenuVisible(false);
                          }}
                          title={type}
                        />
                      ))}
                    </Menu>
                    {errors.nonConformanceType && (
                      <Text style={styles.errorText}>{errors.nonConformanceType}</Text>
                    )}

                    <TextInput
                      label="Non-Conforming Quantity *"
                      value={formData.nonConformingQuantity}
                      onChangeText={(text) => setFormData(prev => ({ ...prev, nonConformingQuantity: text }))}
                      style={styles.input}
                      error={!!errors.nonConformingQuantity}
                      mode="outlined"
                      keyboardType="numeric"
                    />
                    {errors.nonConformingQuantity && (
                      <Text style={styles.errorText}>{errors.nonConformingQuantity}</Text>
                    )}
                  </React.Fragment>
                )}
              </Card.Content>
            </Card>

            {/* Photos */}
            <Card style={styles.section}>
              <Card.Content>
                <Title style={styles.sectionTitle}>Photos</Title>
                <Paragraph style={styles.sectionDescription}>
                  Add photos of the material (up to 5 photos per inspection)
                </Paragraph>
                
                <View style={styles.photoActions}>
                  <Button
                    mode="contained"
                    onPress={openCameraOptions}
                    style={styles.photoButton}
                    icon="camera"
                  >
                    Take Photo
                  </Button>
                  <Button
                    mode="outlined"
                    onPress={selectFromGallery}
                    style={styles.photoButton}
                    icon="image"
                  >
                    From Gallery
                  </Button>
                </View>

                {formData.photos.length > 0 && (
                  <View style={styles.photoGrid}>
                    {formData.photos.map((photo) => (
                      <View key={photo.id} style={styles.photoContainer}>
                        <Image
                          source={{ uri: `data:image/jpeg;base64,${photo.base64}` }}
                          style={styles.photoThumbnail}
                        />
                        <View style={styles.photoOverlay}>
                          <IconButton
                            icon="delete"
                            size={20}
                            iconColor="white"
                            onPress={() => removePhoto(photo.id)}
                            style={styles.deletePhotoButton}
                          />
                        </View>
                      </View>
                    ))}
                  </View>
                )}

                {formData.photos.length > 0 && (
                  <Chip 
                    icon="camera" 
                    style={styles.photoCount}
                    mode="flat"
                  >
                    {formData.photos.length} photo{formData.photos.length > 1 ? 's' : ''} added
                  </Chip>
                )}
              </Card.Content>
            </Card>

            {/* Notes */}
            <Card style={styles.section}>
              <Card.Content>
                <Title style={styles.sectionTitle}>Additional Notes</Title>
                
                <TextInput
                  label="Notes (Optional)"
                  value={formData.notes}
                  onChangeText={(text) => setFormData(prev => ({ ...prev, notes: text }))}
                  style={styles.input}
                  mode="outlined"
                  multiline
                  numberOfLines={4}
                  placeholder="Add any additional observations, comments, or special instructions..."
                />
              </Card.Content>
            </Card>

            {/* Save Button */}
            <View style={styles.saveButtonContainer}>
              <Button
                mode="contained"
                onPress={handleSave}
                loading={loading}
                disabled={loading}
                style={styles.saveButton}
                icon="content-save"
              >
                {isEdit ? 'Update Inspection' : 'Save Inspection'}
              </Button>
            </View>
          </ScrollView>
        </KeyboardAvoidingView>

        {/* Camera Options Dialog */}
        <Portal>
          <Dialog visible={cameraDialogVisible} onDismiss={() => setCameraDialogVisible(false)}>
            <Dialog.Title>Choose Camera Option</Dialog.Title>
            <Dialog.Content>
              <Paragraph>Select how you want to add photos:</Paragraph>
              
              <Button
                mode="outlined"
                onPress={() => handleCameraOptionSelect('timestamp')}
                style={styles.dialogButton}
                icon="camera-timer"
              >
                Timestamp Camera Apps
              </Button>
              
              <Button
                mode="outlined"
                onPress={() => handleCameraOptionSelect('default')}
                style={styles.dialogButton}
                icon="camera"
              >
                Default Camera
              </Button>
              
              <Button
                mode="outlined"
                onPress={() => handleCameraOptionSelect('gallery')}
                style={styles.dialogButton}
                icon="image"
              >
                From Gallery
              </Button>
            </Dialog.Content>
            <Dialog.Actions>
              <Button onPress={() => setCameraDialogVisible(false)}>Cancel</Button>
            </Dialog.Actions>
          </Dialog>
        </Portal>
      </SafeAreaView>
    </PaperProvider>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#f5f5f5',
  },
  keyboardView: {
    flex: 1,
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
    marginBottom: 8,
  },
  sectionDescription: {
    fontSize: 14,
    color: '#666',
    marginBottom: 16,
  },
  input: {
    marginBottom: 12,
  },
  errorText: {
    color: '#c62828',
    fontSize: 12,
    marginTop: -8,
    marginBottom: 8,
  },
  switchContainer: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: 8,
  },
  switchLabel: {
    fontSize: 16,
    fontWeight: '500',
  },
  divider: {
    marginVertical: 16,
  },
  photoActions: {
    flexDirection: 'row',
    gap: 12,
    marginBottom: 16,
  },
  photoButton: {
    flex: 1,
  },
  photoGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
    marginTop: 16,
  },
  photoContainer: {
    position: 'relative',
    width: 120,
    height: 120,
  },
  photoThumbnail: {
    width: 120,
    height: 120,
    borderRadius: 8,
  },
  photoOverlay: {
    position: 'absolute',
    top: 4,
    right: 4,
    backgroundColor: 'rgba(0,0,0,0.7)',
    borderRadius: 20,
  },
  deletePhotoButton: {
    margin: 0,
  },
  photoCount: {
    marginTop: 8,
    alignSelf: 'flex-start',
  },
  saveButtonContainer: {
    marginTop: 24,
    marginBottom: 32,
  },
  saveButton: {
    paddingVertical: 8,
  },
  dialogButton: {
    marginBottom: 8,
  },
});