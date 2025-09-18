import React, { useState, useEffect, useCallback } from 'react';
import { View, StyleSheet, FlatList, Alert, Image } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { 
  Text, 
  Card, 
  Searchbar,
  Provider as PaperProvider,
  DefaultTheme,
  Appbar,
  Menu,
  Button,
  Chip,
  IconButton,
  Portal,
  Modal,
  Title,
  Paragraph
} from 'react-native-paper';
import { StatusBar } from 'expo-status-bar';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { router, useFocusEffect } from 'expo-router';
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

export default function CargoListPage() {
  const { t } = useLanguage();
  const [cargos, setCargos] = useState([]);
  const [filteredCargos, setFilteredCargos] = useState([]);
  const [searchQuery, setSearchQuery] = useState('');
  const [filterMenuVisible, setFilterMenuVisible] = useState(false);
  const [selectedFilter, setSelectedFilter] = useState('all');
  const [selectedCargo, setSelectedCargo] = useState(null);
  const [detailModalVisible, setDetailModalVisible] = useState(false);

  useFocusEffect(
    useCallback(() => {
      loadCargos();
    }, [])
  );

  const loadCargos = async () => {
    try {
      const cargosData = await AsyncStorage.getItem('cargo_inspections');
      const cargoList = cargosData ? JSON.parse(cargosData) : [];
      setCargos(cargoList);
      applyFilters(cargoList, searchQuery, selectedFilter);
    } catch (error) {
      console.error('Error loading cargos:', error);
      Alert.alert(t('message.error'), 'Failed to load material data');
    }
  };

  const applyFilters = (cargoList, query, filter) => {
    let filtered = [...cargoList];

    // Apply search filter
    if (query) {
      filtered = filtered.filter(cargo => 
        cargo.invoiceNumber.toLowerCase().includes(query.toLowerCase()) ||
        cargo.materialType.toLowerCase().includes(query.toLowerCase()) ||
        cargo.qualityInspector?.toLowerCase().includes(query.toLowerCase()) ||
        cargo.storageLocation?.toLowerCase().includes(query.toLowerCase()) ||
        cargo.notes?.toLowerCase().includes(query.toLowerCase())
      );
    }

    // Apply status filter
    switch (filter) {
      case 'compliant':
        filtered = filtered.filter(cargo => !cargo.nonConforming);
        break;
      case 'non-compliant':
        filtered = filtered.filter(cargo => cargo.nonConforming);
        break;
      case 'recent':
        const weekAgo = new Date();
        weekAgo.setDate(weekAgo.getDate() - 7);
        filtered = filtered.filter(cargo => new Date(cargo.receiveDate || cargo.inspectionDate) > weekAgo);
        break;
      case 'exported':
        filtered = filtered.filter(cargo => cargo.exported);
        break;
      case 'not-exported':
        filtered = filtered.filter(cargo => !cargo.exported);
        break;
      default:
        // 'all' - no additional filtering
        break;
    }

    // Sort by date (newest first)
    filtered.sort((a, b) => new Date(b.receiveDate || b.inspectionDate) - new Date(a.receiveDate || a.inspectionDate));
    
    setFilteredCargos(filtered);
  };

  const formatDate = (dateString) => {
    if (!dateString) return 'N/A';
    const date = new Date(dateString);
    const day = date.getDate().toString().padStart(2, '0');
    const month = (date.getMonth() + 1).toString().padStart(2, '0');
    const year = date.getFullYear();
    return `${day}/${month}/${year}`;
  };

  const handleSearch = (query) => {
    setSearchQuery(query);
    applyFilters(cargos, query, selectedFilter);
  };

  const handleFilterSelect = (filter) => {
    setSelectedFilter(filter);
    setFilterMenuVisible(false);
    applyFilters(cargos, searchQuery, filter);
  };

  const handleCargoPress = (cargo) => {
    setSelectedCargo(cargo);
    setDetailModalVisible(true);
  };

  const handleEditCargo = (cargo) => {
    setDetailModalVisible(false);
    router.push({
      pathname: '/add-cargo',
      params: { editId: cargo.id }
    });
  };

  const handleDeleteCargo = async (cargo) => {
    Alert.alert(
      'Delete Inspection',
      `Are you sure you want to delete inspection #${cargo.invoiceNumber}?`,
      [
        { text: t('button.cancel'), style: 'cancel' },
        { 
          text: t('button.delete'), 
          style: 'destructive',
          onPress: async () => {
            try {
              const updatedCargos = cargos.filter(c => c.id !== cargo.id);
              await AsyncStorage.setItem('cargo_inspections', JSON.stringify(updatedCargos));
              setDetailModalVisible(false);
              loadCargos();
              Alert.alert(t('message.success'), 'Inspection deleted successfully');
            } catch (error) {
              console.error('Error deleting cargo:', error);
              Alert.alert(t('message.error'), 'Failed to delete inspection');
            }
          }
        }
      ]
    );
  };

  const handleExportAll = () => {
    router.push('/export-all');
  };

  const handleExportSelected = (cargo) => {
    setDetailModalVisible(false);
    router.push({
      pathname: '/export-all',
      params: { cargoId: cargo.id }
    });
  };

  const renderCargoItem = ({ item }) => (
    <Card style={styles.cargoCard} onPress={() => handleCargoPress(item)}>
      <Card.Content>
        <View style={styles.cargoHeader}>
          <Text style={styles.invoiceNumber}>#{item.invoiceNumber}</Text>
          <View style={styles.headerRight}>
            <Text style={styles.inspectionDate}>
              {formatDate(item.receiveDate || item.inspectionDate)}
            </Text>
            {item.exported ? (
              <MaterialIcons name="cloud-done" size={16} color="#4CAF50" style={styles.exportIcon} />
            ) : (
              <MaterialIcons name="cloud-off" size={16} color="#FF9800" style={styles.exportIcon} />
            )}
          </View>
        </View>
        
        <View style={styles.cargoInfo}>
          <Text style={styles.materialType}>{item.materialType}</Text>
          {item.quantityReceived && (
            <Text style={styles.quantity}>Qty: {item.quantityReceived}</Text>
          )}
        </View>

        {item.storageLocation && (
          <View style={styles.storageInfo}>
            <MaterialIcons name="location-on" size={14} color="#666" />
            <Text style={styles.storageText}>{item.storageLocation}</Text>
          </View>
        )}

        <View style={styles.inspectorInfo}>
          <Text style={styles.inspectorText}>{t('form.qualityInspector')}: {item.qualityInspector}</Text>
          {item.safetyInspector && (
            <Text style={styles.inspectorText}>{t('form.safetyInspector')}: {item.safetyInspector}</Text>
          )}
          {item.logisticsInspector && (
            <Text style={styles.inspectorText}>{t('form.logisticsInspector')}: {item.logisticsInspector}</Text>
          )}
        </View>

        <View style={styles.cargoStatus}>
          <Chip 
            mode="flat"
            style={[
              styles.statusChip,
              { backgroundColor: item.nonConforming ? '#ffebee' : '#e8f5e8' }
            ]}
            textStyle={{ 
              color: item.nonConforming ? '#c62828' : '#2e7d32',
              fontSize: 12 
            }}
            icon={() => (
              <MaterialIcons 
                name={item.nonConforming ? "warning" : "check-circle"} 
                size={14} 
                color={item.nonConforming ? '#c62828' : '#2e7d32'} 
              />
            )}
          >
            {item.nonConforming ? t('conformance.nonCompliant') : t('conformance.compliant')}
          </Chip>
          
          {item.photos && item.photos.length > 0 && (
            <Chip 
              mode="flat"
              style={styles.photoChip}
              textStyle={{ fontSize: 12 }}
              icon="camera"
            >
              {item.photos.length} fotos
            </Chip>
          )}

          <Chip 
            mode="flat"
            style={[
              styles.exportStatusChip,
              { backgroundColor: item.exported ? '#e8f5e8' : '#fff3e0' }
            ]}
            textStyle={{ 
              color: item.exported ? '#2e7d32' : '#ef6c00',
              fontSize: 10 
            }}
          >
            {item.exported ? t('status.exported') : t('status.notExported')}
          </Chip>
        </View>
      </Card.Content>
    </Card>
  );

  const getFilterLabel = (filter) => {
    switch (filter) {
      case 'compliant': return 'Conformes';
      case 'non-compliant': return 'Não Conformes';
      case 'recent': return 'Recentes (7 dias)';
      case 'exported': return 'Exportados';
      case 'not-exported': return 'Não Exportados';
      default: return 'Todas as Inspeções';
    }
  };

  return (
    <PaperProvider theme={theme}>
      <SafeAreaView style={styles.container}>
        <StatusBar style="auto" />
        
        <Appbar.Header>
          <Appbar.BackAction onPress={() => router.back()} />
          <Appbar.Content title="Material Inspections" />
          <Menu
            visible={filterMenuVisible}
            onDismiss={() => setFilterMenuVisible(false)}
            anchor={
              <Appbar.Action 
                icon="filter-variant" 
                onPress={() => setFilterMenuVisible(true)} 
              />
            }
          >
            <Menu.Item onPress={() => handleFilterSelect('all')} title="Todas as Inspeções" />
            <Menu.Item onPress={() => handleFilterSelect('compliant')} title="Conformes" />
            <Menu.Item onPress={() => handleFilterSelect('non-compliant')} title="Não Conformes" />
            <Menu.Item onPress={() => handleFilterSelect('recent')} title="Recentes (7 dias)" />
            <Menu.Item onPress={() => handleFilterSelect('exported')} title="Exportados" />
            <Menu.Item onPress={() => handleFilterSelect('not-exported')} title="Não Exportados" />
          </Menu>
          <Appbar.Action 
            icon="export" 
            onPress={handleExportAll}
          />
        </Appbar.Header>

        <View style={styles.content}>
          <Searchbar
            placeholder="Pesquisar por nota fiscal, material, inspetor, local..."
            onChangeText={handleSearch}
            value={searchQuery}
            style={styles.searchbar}
          />

          <View style={styles.filterInfo}>
            <Text style={styles.filterText}>
              {getFilterLabel(selectedFilter)} ({filteredCargos.length} items)
            </Text>
          </View>

          <FlatList
            data={filteredCargos}
            renderItem={renderCargoItem}
            keyExtractor={(item) => item.id}
            style={styles.list}
            showsVerticalScrollIndicator={false}
            ListEmptyComponent={
              <View style={styles.emptyContainer}>
                <MaterialIcons name="inventory" size={64} color="#ccc" />
                <Text style={styles.emptyText}>Nenhuma inspeção de material encontrada</Text>
                <Text style={styles.emptySubtext}>
                  {searchQuery || selectedFilter !== 'all' 
                    ? 'Tente ajustar sua pesquisa ou filtro'
                    : 'Comece adicionando sua primeira inspeção de material'
                  }
                </Text>
              </View>
            }
          />
        </View>

        {/* Material Detail Modal */}
        <Portal>
          <Modal
            visible={detailModalVisible}
            onDismiss={() => setDetailModalVisible(false)}
            contentContainerStyle={styles.modalContent}
          >
            {selectedCargo && (
              <View>
                <View style={styles.modalHeader}>
                  <Image 
                    source={{ uri: 'https://customer-assets.emergentagent.com/job_receipt-monitor/artifacts/svdyj4wl_LOGO%20carvalho.png' }}
                    style={styles.modalLogo}
                    resizeMode="contain"
                  />
                  <Title style={styles.modalTitle}>
                    Inspeção #{selectedCargo.invoiceNumber}
                  </Title>
                </View>
                
                <View style={styles.detailRow}>
                  <Text style={styles.detailLabel}>{t('form.materialType')}:</Text>
                  <Text style={styles.detailValue}>{selectedCargo.materialType}</Text>
                </View>
                
                {selectedCargo.quantityReceived && (
                  <View style={styles.detailRow}>
                    <Text style={styles.detailLabel}>Quantidade:</Text>
                    <Text style={styles.detailValue}>{selectedCargo.quantityReceived}</Text>
                  </View>
                )}
                
                <View style={styles.detailRow}>
                  <Text style={styles.detailLabel}>{t('form.receiveDate')}:</Text>
                  <Text style={styles.detailValue}>
                    {formatDate(selectedCargo.receiveDate)}
                  </Text>
                </View>

                {selectedCargo.storageLocation && (
                  <View style={styles.detailRow}>
                    <Text style={styles.detailLabel}>{t('form.storageLocation')}:</Text>
                    <Text style={styles.detailValue}>{selectedCargo.storageLocation}</Text>
                  </View>
                )}

                <View style={styles.detailRow}>
                  <Text style={styles.detailLabel}>{t('form.qualityInspector')}:</Text>
                  <Text style={styles.detailValue}>{selectedCargo.qualityInspector}</Text>
                </View>

                {selectedCargo.safetyInspector && (
                  <View style={styles.detailRow}>
                    <Text style={styles.detailLabel}>{t('form.safetyInspector')}:</Text>
                    <Text style={styles.detailValue}>{selectedCargo.safetyInspector}</Text>
                  </View>
                )}

                {selectedCargo.logisticsInspector && (
                  <View style={styles.detailRow}>
                    <Text style={styles.detailLabel}>{t('form.logisticsInspector')}:</Text>
                    <Text style={styles.detailValue}>{selectedCargo.logisticsInspector}</Text>
                  </View>
                )}
                
                <View style={styles.detailRow}>
                  <Text style={styles.detailLabel}>Status:</Text>
                  <Text style={[
                    styles.detailValue,
                    { color: selectedCargo.nonConforming ? '#c62828' : '#2e7d32' }
                  ]}>
                    {selectedCargo.nonConforming ? t('conformance.nonCompliant') : t('conformance.compliant')}
                  </Text>
                </View>

                <View style={styles.detailRow}>
                  <Text style={styles.detailLabel}>Status de Exportação:</Text>
                  <Text style={[
                    styles.detailValue,
                    { color: selectedCargo.exported ? '#2e7d32' : '#ef6c00' }
                  ]}>
                    {selectedCargo.exported ? t('status.exported') : t('status.notExported')}
                  </Text>
                </View>

                {selectedCargo.nonConforming && (
                  <>
                    <View style={styles.detailRow}>
                      <Text style={styles.detailLabel}>Tipo de Não Conformidade:</Text>
                      <Text style={styles.detailValue}>{selectedCargo.nonConformanceType ? t(selectedCargo.nonConformanceType) : selectedCargo.nonConformanceType}</Text>
                    </View>
                    <View style={styles.detailRow}>
                      <Text style={styles.detailLabel}>Quantidade Não Conforme:</Text>
                      <Text style={styles.detailValue}>{selectedCargo.nonConformingQuantity}</Text>
                    </View>
                  </>
                )}

                {selectedCargo.notes && (
                  <View style={styles.detailRow}>
                    <Text style={styles.detailLabel}>Observações:</Text>
                    <Text style={styles.detailValue}>{selectedCargo.notes}</Text>
                  </View>
                )}

                {selectedCargo.photos && selectedCargo.photos.length > 0 && (
                  <View style={styles.detailRow}>
                    <Text style={styles.detailLabel}>Fotos:</Text>
                    <Text style={styles.detailValue}>{selectedCargo.photos.length} anexadas</Text>
                  </View>
                )}

                <View style={styles.modalActions}>
                  <Button 
                    mode="outlined" 
                    onPress={() => handleEditCargo(selectedCargo)}
                    style={styles.modalButton}
                  >
                    {t('button.edit')}
                  </Button>
                  <Button 
                    mode="outlined" 
                    onPress={() => handleExportSelected(selectedCargo)}
                    style={styles.modalButton}
                  >
                    {t('button.export')}
                  </Button>
                  <Button 
                    mode="contained" 
                    onPress={() => handleDeleteCargo(selectedCargo)}
                    buttonColor="#c62828"
                    style={styles.modalButton}
                  >
                    {t('button.delete')}
                  </Button>
                </View>
              </View>
            )}
          </Modal>
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
  content: {
    flex: 1,
    padding: 16,
  },
  searchbar: {
    marginBottom: 16,
    elevation: 2,
  },
  filterInfo: {
    marginBottom: 16,
  },
  filterText: {
    fontSize: 14,
    color: '#666',
    fontWeight: '500',
  },
  list: {
    flex: 1,
  },
  cargoCard: {
    marginBottom: 12,
    elevation: 2,
  },
  cargoHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 8,
  },
  headerRight: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  invoiceNumber: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#2196F3',
  },
  inspectionDate: {
    fontSize: 14,
    color: '#666',
  },
  exportIcon: {
    marginLeft: 4,
  },
  cargoInfo: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 8,
  },
  materialType: {
    fontSize: 16,
    fontWeight: '500',
    flex: 1,
  },
  quantity: {
    fontSize: 14,
    color: '#666',
  },
  storageInfo: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 8,
    gap: 4,
  },
  storageText: {
    fontSize: 12,
    color: '#666',
    flex: 1,
  },
  inspectorInfo: {
    marginBottom: 12,
  },
  inspectorText: {
    fontSize: 12,
    color: '#666',
    marginBottom: 2,
  },
  cargoStatus: {
    flexDirection: 'row',
    gap: 6,
    alignItems: 'center',
    flexWrap: 'wrap',
  },
  statusChip: {
    height: 28,
  },
  photoChip: {
    height: 28,
    backgroundColor: '#e3f2fd',
  },
  exportStatusChip: {
    height: 24,
  },
  emptyContainer: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 64,
  },
  emptyText: {
    fontSize: 18,
    fontWeight: '500',
    color: '#666',
    marginTop: 16,
  },
  emptySubtext: {
    fontSize: 14,
    color: '#999',
    textAlign: 'center',
    marginTop: 8,
    paddingHorizontal: 32,
  },
  modalContent: {
    backgroundColor: 'white',
    padding: 24,
    margin: 20,
    borderRadius: 8,
    maxHeight: '80%',
  },
  modalHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 20,
    justifyContent: 'center',
  },
  modalLogo: {
    width: 24,
    height: 24,
    marginRight: 12,
  },
  modalTitle: {
    fontSize: 20,
    fontWeight: 'bold',
  },
  detailRow: {
    marginBottom: 12,
  },
  detailLabel: {
    fontSize: 14,
    fontWeight: '500',
    color: '#666',
    marginBottom: 4,
  },
  detailValue: {
    fontSize: 16,
    color: '#333',
  },
  modalActions: {
    flexDirection: 'row',
    justifyContent: 'space-around',
    marginTop: 24,
    gap: 8,
  },
  modalButton: {
    flex: 1,
  },
});