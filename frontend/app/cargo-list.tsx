import React, { useState, useEffect, useCallback } from 'react';
import { View, StyleSheet, FlatList, Alert } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { 
  Text, 
  Card, 
  Searchbar,
  Provider as PaperProvider,
  DefaultTheme,
  Appbar,
  FAB,
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
      Alert.alert('Error', 'Failed to load cargo data');
    }
  };

  const applyFilters = (cargoList, query, filter) => {
    let filtered = [...cargoList];

    // Apply search filter
    if (query) {
      filtered = filtered.filter(cargo => 
        cargo.invoiceNumber.toLowerCase().includes(query.toLowerCase()) ||
        cargo.materialType.toLowerCase().includes(query.toLowerCase()) ||
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
        filtered = filtered.filter(cargo => new Date(cargo.inspectionDate) > weekAgo);
        break;
      default:
        // 'all' - no additional filtering
        break;
    }

    // Sort by date (newest first)
    filtered.sort((a, b) => new Date(b.inspectionDate) - new Date(a.inspectionDate));
    
    setFilteredCargos(filtered);
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
        { text: 'Cancel', style: 'cancel' },
        { 
          text: 'Delete', 
          style: 'destructive',
          onPress: async () => {
            try {
              const updatedCargos = cargos.filter(c => c.id !== cargo.id);
              await AsyncStorage.setItem('cargo_inspections', JSON.stringify(updatedCargos));
              setDetailModalVisible(false);
              loadCargos();
              Alert.alert('Success', 'Inspection deleted successfully');
            } catch (error) {
              console.error('Error deleting cargo:', error);
              Alert.alert('Error', 'Failed to delete inspection');
            }
          }
        }
      ]
    );
  };

  const renderCargoItem = ({ item }) => (
    <Card style={styles.cargoCard} onPress={() => handleCargoPress(item)}>
      <Card.Content>
        <View style={styles.cargoHeader}>
          <Text style={styles.invoiceNumber}>#{item.invoiceNumber}</Text>
          <Text style={styles.inspectionDate}>
            {new Date(item.inspectionDate).toLocaleDateString()}
          </Text>
        </View>
        
        <View style={styles.cargoInfo}>
          <Text style={styles.materialType}>{item.materialType}</Text>
          <Text style={styles.quantity}>Qty: {item.quantityReceived}</Text>
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
            {item.nonConforming ? 'Non-Conforming' : 'Compliant'}
          </Chip>
          
          {item.photos && item.photos.length > 0 && (
            <Chip 
              mode="flat"
              style={styles.photoChip}
              textStyle={{ fontSize: 12 }}
              icon="camera"
            >
              {item.photos.length} photos
            </Chip>
          )}
        </View>
      </Card.Content>
    </Card>
  );

  const getFilterLabel = (filter) => {
    switch (filter) {
      case 'compliant': return 'Compliant Only';
      case 'non-compliant': return 'Non-Compliant Only';
      case 'recent': return 'Recent (7 days)';
      default: return 'All Inspections';
    }
  };

  return (
    <PaperProvider theme={theme}>
      <SafeAreaView style={styles.container}>
        <StatusBar style="auto" />
        
        <Appbar.Header>
          <Appbar.BackAction onPress={() => router.back()} />
          <Appbar.Content title="Cargo Inspections" />
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
            <Menu.Item onPress={() => handleFilterSelect('all')} title="All Inspections" />
            <Menu.Item onPress={() => handleFilterSelect('compliant')} title="Compliant Only" />
            <Menu.Item onPress={() => handleFilterSelect('non-compliant')} title="Non-Compliant Only" />
            <Menu.Item onPress={() => handleFilterSelect('recent')} title="Recent (7 days)" />
          </Menu>
        </Appbar.Header>

        <View style={styles.content}>
          <Searchbar
            placeholder="Search by invoice, material, or notes..."
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
                <Text style={styles.emptyText}>No cargo inspections found</Text>
                <Text style={styles.emptySubtext}>
                  {searchQuery || selectedFilter !== 'all' 
                    ? 'Try adjusting your search or filter'
                    : 'Start by adding your first cargo inspection'
                  }
                </Text>
              </View>
            }
          />
        </View>

        <FAB
          style={styles.fab}
          icon="plus"
          onPress={() => router.push('/add-cargo')}
          label="New Inspection"
        />

        {/* Cargo Detail Modal */}
        <Portal>
          <Modal
            visible={detailModalVisible}
            onDismiss={() => setDetailModalVisible(false)}
            contentContainerStyle={styles.modalContent}
          >
            {selectedCargo && (
              <View>
                <Title style={styles.modalTitle}>
                  Inspection #{selectedCargo.invoiceNumber}
                </Title>
                
                <View style={styles.detailRow}>
                  <Text style={styles.detailLabel}>Material Type:</Text>
                  <Text style={styles.detailValue}>{selectedCargo.materialType}</Text>
                </View>
                
                <View style={styles.detailRow}>
                  <Text style={styles.detailLabel}>Quantity:</Text>
                  <Text style={styles.detailValue}>{selectedCargo.quantityReceived}</Text>
                </View>
                
                <View style={styles.detailRow}>
                  <Text style={styles.detailLabel}>Date:</Text>
                  <Text style={styles.detailValue}>
                    {new Date(selectedCargo.inspectionDate).toLocaleString()}
                  </Text>
                </View>
                
                <View style={styles.detailRow}>
                  <Text style={styles.detailLabel}>Status:</Text>
                  <Text style={[
                    styles.detailValue,
                    { color: selectedCargo.nonConforming ? '#c62828' : '#2e7d32' }
                  ]}>
                    {selectedCargo.nonConforming ? 'Non-Conforming' : 'Compliant'}
                  </Text>
                </View>

                {selectedCargo.nonConforming && (
                  <>
                    <View style={styles.detailRow}>
                      <Text style={styles.detailLabel}>Non-Conformance Type:</Text>
                      <Text style={styles.detailValue}>{selectedCargo.nonConformanceType}</Text>
                    </View>
                    <View style={styles.detailRow}>
                      <Text style={styles.detailLabel}>Non-Conforming Quantity:</Text>
                      <Text style={styles.detailValue}>{selectedCargo.nonConformingQuantity}</Text>
                    </View>
                  </>
                )}

                {selectedCargo.notes && (
                  <View style={styles.detailRow}>
                    <Text style={styles.detailLabel}>Notes:</Text>
                    <Text style={styles.detailValue}>{selectedCargo.notes}</Text>
                  </View>
                )}

                {selectedCargo.photos && selectedCargo.photos.length > 0 && (
                  <View style={styles.detailRow}>
                    <Text style={styles.detailLabel}>Photos:</Text>
                    <Text style={styles.detailValue}>{selectedCargo.photos.length} attached</Text>
                  </View>
                )}

                <View style={styles.modalActions}>
                  <Button 
                    mode="outlined" 
                    onPress={() => handleEditCargo(selectedCargo)}
                    style={styles.modalButton}
                  >
                    Edit
                  </Button>
                  <Button 
                    mode="contained" 
                    onPress={() => handleDeleteCargo(selectedCargo)}
                    buttonColor="#c62828"
                    style={styles.modalButton}
                  >
                    Delete
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
  invoiceNumber: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#2196F3',
  },
  inspectionDate: {
    fontSize: 14,
    color: '#666',
  },
  cargoInfo: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 12,
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
  cargoStatus: {
    flexDirection: 'row',
    gap: 8,
    alignItems: 'center',
  },
  statusChip: {
    height: 28,
  },
  photoChip: {
    height: 28,
    backgroundColor: '#e3f2fd',
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
  fab: {
    position: 'absolute',
    margin: 16,
    right: 0,
    bottom: 0,
    backgroundColor: '#2196F3',
  },
  modalContent: {
    backgroundColor: 'white',
    padding: 24,
    margin: 20,
    borderRadius: 8,
    maxHeight: '80%',
  },
  modalTitle: {
    fontSize: 20,
    fontWeight: 'bold',
    marginBottom: 20,
    textAlign: 'center',
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
    gap: 12,
  },
  modalButton: {
    flex: 1,
  },
});