import React, { useState, useEffect } from 'react';
import { View, StyleSheet, ScrollView, Alert, Image, KeyboardAvoidingView, Platform } from 'react-native';
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
  IconButton
} from 'react-native-paper';
import { StatusBar } from 'expo-status-bar';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { router, useLocalSearchParams } from 'expo-router';
import { Camera } from 'expo-camera';
import * as ImagePicker from 'expo-image-picker';
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

export default function AddCargoPage() {
  const params = useLocalSearchParams();
  const isEdit = !!params.editId;
  
  const [formData, setFormData] = useState({
    invoiceNumber: '',
    materialType: '',
    quantityReceived: '',
    nonConforming: false,
    nonConformanceType: '',
    nonConformingQuantity: '',
    notes: '',
    photos: []
  });
  
  const [loading, setLoading] = useState(false);
  const [cameraPermission, setCameraPermission] = useState(null);
  const [nonConformanceMenuVisible, setNonConformanceMenuVisible] = useState(false);
  const [errors, setErrors] = useState({});

  useEffect(() => {
    requestPermissions();
    if (isEdit) {
      loadCargoForEdit();
    }
  }, []);

  const requestPermissions = async () => {
    const cameraStatus = await Camera.requestCameraPermissionsAsync();
    setCameraPermission(cameraStatus.status === 'granted');
    
    const mediaLibraryStatus = await ImagePicker.requestMediaLibraryPermissionsAsync();
    // Handle media library permissions if needed
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
          quantityReceived: cargoToEdit.quantityReceived,
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
    
    if (!formData.quantityReceived.trim()) {
      newErrors.quantityReceived = 'Quantity received is required';
    } else if (isNaN(parseFloat(formData.quantityReceived))) {
      newErrors.quantityReceived = 'Quantity must be a valid number';
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

  const takePicture = async () => {
    if (!cameraPermission) {
      Alert.alert('Permission Required', 'Camera permission is required to take photos');
      return;
    }

    try {
      const result = await ImagePicker.launchCameraAsync({
        mediaTypes: ImagePicker.MediaTypeOptions.Images,
        allowsEditing: true,
        aspect: [4, 3],
        quality: 0.8, // Reduce quality to manage file size
        base64: true
      });

      if (!result.canceled && result.assets[0]) {
        const timestamp = new Date().toISOString();
        const photoData = {
          id: Date.now().toString(),
          base64: result.assets[0].base64,
          timestamp: timestamp,
          width: result.assets[0].width,
          height: result.assets[0].height
        };

        setFormData(prev => ({
          ...prev,
          photos: [...prev.photos, photoData]
        }));
      }
    } catch (error) {
      console.error('Error taking picture:', error);
      Alert.alert('Error', 'Failed to take picture');
    }
  };

  const selectFromGallery = async () => {
    try {
      const result = await ImagePicker.launchImageLibraryAsync({
        mediaTypes: ImagePicker.MediaTypeOptions.Images,
        allowsMultipleSelection: true,
        quality: 0.8,
        base64: true
      });

      if (!result.canceled) {
        const newPhotos = result.assets.map(asset => ({
          id: Date.now().toString() + Math.random(),
          base64: asset.base64,
          timestamp: new Date().toISOString(),
          width: asset.width,
          height: asset.height
        }));

        setFormData(prev => ({
          ...prev,
          photos: [...prev.photos, ...newPhotos]
        }));
      }
    } catch (error) {
      console.error('Error selecting from gallery:', error);
      Alert.alert('Error', 'Failed to select images');
    }
  };

  const removePhoto = (photoId) => {
    setFormData(prev => ({
      ...prev,
      photos: prev.photos.filter(photo => photo.id !== photoId)
    }));
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

      // Save to local storage
      await AsyncStorage.setItem('cargo_inspections', JSON.stringify(cargos));
      
      // Add to pending sync if online sync is needed
      await addToPendingSync(cargoData);
      
      Alert.alert(
        'Success',
        `Cargo inspection ${isEdit ? 'updated' : 'saved'} successfully`,
        [{ text: 'OK', onPress: () => router.back() }]
      );
      
    } catch (error) {
      console.error('Error saving cargo:', error);
      Alert.alert('Error', 'Failed to save cargo inspection');
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
      filtered.push({
        ...cargoData,
        syncAction: isEdit ? 'update' : 'create',
        syncTimestamp: new Date().toISOString()
      });
      
      await AsyncStorage.setItem('pending_sync', JSON.stringify(filtered));
    } catch (error) {
      console.error('Error adding to pending sync:', error);
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
                  label="Quantity Received *"
                  value={formData.quantityReceived}
                  onChangeText={(text) => setFormData(prev => ({ ...prev, quantityReceived: text }))}
                  style={styles.input}
                  error={!!errors.quantityReceived}
                  mode="outlined"
                  keyboardType="numeric"
                />
                {errors.quantityReceived && (
                  <Text style={styles.errorText}>{errors.quantityReceived}</Text>
                )}
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
                  <>
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
                  </>
                )}
              </Card.Content>
            </Card>

            {/* Photos */}
            <Card style={styles.section}>
              <Card.Content>
                <Title style={styles.sectionTitle}>Photos with Timestamp</Title>
                <Paragraph style={styles.sectionDescription}>
                  Add photos of the cargo with automatic timestamps
                </Paragraph>
                
                <View style={styles.photoActions}>
                  <Button
                    mode="contained"
                    onPress={takePicture}
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
                          <Text style={styles.photoTimestamp}>
                            {new Date(photo.timestamp).toLocaleString()}
                          </Text>
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
    bottom: 0,
    left: 0,
    right: 0,
    backgroundColor: 'rgba(0,0,0,0.7)',
    padding: 4,
    borderBottomLeftRadius: 8,
    borderBottomRightRadius: 8,
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  photoTimestamp: {
    color: 'white',
    fontSize: 10,
    flex: 1,
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
});