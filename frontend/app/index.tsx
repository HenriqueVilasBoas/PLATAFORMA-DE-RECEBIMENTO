import React, { useState, useEffect } from 'react';
import { View, StyleSheet, Alert, ScrollView, Image } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { 
  Text, 
  Button, 
  Card, 
  Title, 
  Paragraph,
  Provider as PaperProvider,
  DefaultTheme,
  Appbar,
  FAB,
  Badge
} from 'react-native-paper';
import { StatusBar } from 'expo-status-bar';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { router } from 'expo-router';
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

export default function HomePage() {
  const [totalCargos, setTotalCargos] = useState(0);
  const [pendingSync, setPendingSync] = useState(0);
  const [recentCargos, setRecentCargos] = useState([]);

  useEffect(() => {
    loadDashboardData();
  }, []);

  const loadDashboardData = async () => {
    try {
      // Load total cargos count
      const cargosData = await AsyncStorage.getItem('cargo_inspections');
      const cargos = cargosData ? JSON.parse(cargosData) : [];
      setTotalCargos(cargos.length);
      
      // Get recent 3 cargos for quick preview
      const recent = cargos.slice(-3).reverse();
      setRecentCargos(recent);

      // Count pending sync items
      const pendingData = await AsyncStorage.getItem('pending_sync');
      const pending = pendingData ? JSON.parse(pendingData) : [];
      setPendingSync(pending.length);
    } catch (error) {
      console.error('Error loading dashboard data:', error);
    }
  };

  const handleViewAllCargos = () => {
    router.push('/cargo-list');
  };

  const handleAddNewCargo = () => {
    router.push('/add-cargo');
  };

  const handleViewDashboard = () => {
    router.push('/dashboard');
  };

  const formatDate = (dateString) => {
    const date = new Date(dateString);
    const day = date.getDate().toString().padStart(2, '0');
    const month = (date.getMonth() + 1).toString().padStart(2, '0');
    const year = date.getFullYear();
    return `${day}/${month}/${year}`;
  };

  return (
    <PaperProvider theme={theme}>
      <SafeAreaView style={styles.container}>
        <StatusBar style="auto" />
        
        <Appbar.Header style={styles.header}>
          <View style={styles.headerContent}>
            <Image 
              source={{ uri: 'https://customer-assets.emergentagent.com/job_receipt-monitor/artifacts/30nr43u5_LOGO.png' }}
              style={styles.logo}
              resizeMode="contain"
            />
            <Text style={styles.appTitle}>Material Receiving Control</Text>
          </View>
          {pendingSync > 0 && (
            <Badge style={styles.syncBadge} size={20}>
              {pendingSync}
            </Badge>
          )}
          <Appbar.Action 
            icon="cloud-sync" 
            onPress={() => Alert.alert('Sync', `${pendingSync} items pending sync`)} 
          />
        </Appbar.Header>

        <ScrollView style={styles.content} showsVerticalScrollIndicator={false}>
          {/* Quick Stats */}
          <View style={styles.statsContainer}>
            <Card style={styles.statsCard}>
              <Card.Content style={styles.statsContent}>
                <MaterialIcons name="inventory" size={40} color="#2196F3" />
                <View style={styles.statsText}>
                  <Title style={styles.statsNumber}>{totalCargos}</Title>
                  <Paragraph>Total Inspections</Paragraph>
                </View>
              </Card.Content>
            </Card>
            
            <Card style={styles.statsCard}>
              <Card.Content style={styles.statsContent}>
                <MaterialIcons name="sync" size={40} color="#FF9800" />
                <View style={styles.statsText}>
                  <Title style={styles.statsNumber}>{pendingSync}</Title>
                  <Paragraph>Pending Sync</Paragraph>
                </View>
              </Card.Content>
            </Card>
          </View>

          {/* Main Action Buttons - New Inspection First */}
          <View style={styles.actionContainer}>
            <Card style={styles.actionCard}>
              <Card.Content>
                <Title style={styles.actionTitle}>New Material Inspection</Title>
                <Paragraph style={styles.actionDescription}>
                  Start a new material receiving inspection with photos and details
                </Paragraph>
                <Button
                  mode="contained"
                  onPress={handleAddNewCargo}
                  style={styles.actionButton}
                  icon="plus"
                >
                  New Material Inspection
                </Button>
              </Card.Content>
            </Card>

            <Card style={styles.actionCard}>
              <Card.Content>
                <Title style={styles.actionTitle}>Material Management</Title>
                <Paragraph style={styles.actionDescription}>
                  View, search, and manage all material inspection records
                </Paragraph>
                <Button
                  mode="outlined"
                  onPress={handleViewAllCargos}
                  style={styles.actionButton}
                  icon="view-list"
                >
                  View All Materials
                </Button>
              </Card.Content>
            </Card>

            <Card style={styles.actionCard}>
              <Card.Content>
                <Title style={styles.actionTitle}>Analytics Dashboard</Title>
                <Paragraph style={styles.actionDescription}>
                  View statistics, compliance reports, and insights
                </Paragraph>
                <Button
                  mode="outlined"
                  onPress={handleViewDashboard}
                  style={styles.actionButton}
                  icon="chart-line"
                >
                  View Dashboard
                </Button>
              </Card.Content>
            </Card>
          </View>

          {/* Recent Inspections Preview */}
          {recentCargos.length > 0 && (
            <View style={styles.recentContainer}>
              <Title style={styles.sectionTitle}>Recent Inspections</Title>
              {recentCargos.map((cargo, index) => (
                <Card key={cargo.id} style={styles.recentCard}>
                  <Card.Content>
                    <View style={styles.recentHeader}>
                      <Text style={styles.recentInvoice}>#{cargo.invoiceNumber}</Text>
                      <Text style={styles.recentDate}>
                        {formatDate(cargo.receiveDate || cargo.inspectionDate)}
                      </Text>
                    </View>
                    <Text style={styles.recentMaterial}>{cargo.materialType}</Text>
                    <View style={styles.recentInspector}>
                      <Text style={styles.recentInspectorText}>
                        Quality: {cargo.qualityInspector}
                      </Text>
                    </View>
                    <View style={styles.recentStatus}>
                      <MaterialIcons 
                        name={cargo.nonConforming ? "warning" : "check-circle"} 
                        size={16} 
                        color={cargo.nonConforming ? "#f44336" : "#4caf50"} 
                      />
                      <Text style={[
                        styles.recentStatusText,
                        { color: cargo.nonConforming ? "#f44336" : "#4caf50" }
                      ]}>
                        {cargo.nonConforming ? "Non-Conforming" : "Compliant"}
                      </Text>
                    </View>
                  </Card.Content>
                </Card>
              ))}
            </View>
          )}
        </ScrollView>

        {/* Floating Action Button */}
        <FAB
          style={styles.fab}
          icon="plus"
          onPress={handleAddNewCargo}
          label="New Inspection"
        />
      </SafeAreaView>
    </PaperProvider>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#f5f5f5',
  },
  header: {
    paddingHorizontal: 8,
  },
  headerContent: {
    flexDirection: 'row',
    alignItems: 'center',
    flex: 1,
  },
  logo: {
    width: 32,
    height: 32,
    marginRight: 12,
  },
  appTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#fff',
  },
  content: {
    flex: 1,
    padding: 16,
  },
  syncBadge: {
    backgroundColor: '#f44336',
    marginRight: 8,
  },
  statsContainer: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: 24,
    gap: 12,
  },
  statsCard: {
    flex: 1,
    elevation: 2,
  },
  statsContent: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 12,
  },
  statsText: {
    marginLeft: 16,
    flex: 1,
  },
  statsNumber: {
    fontSize: 24,
    fontWeight: 'bold',
    margin: 0,
  },
  actionContainer: {
    gap: 16,
    marginBottom: 24,
  },
  actionCard: {
    elevation: 2,
  },
  actionTitle: {
    fontSize: 18,
    marginBottom: 8,
  },
  actionDescription: {
    fontSize: 14,
    color: '#666',
    marginBottom: 16,
  },
  actionButton: {
    marginTop: 8,
  },
  recentContainer: {
    marginBottom: 80,
  },
  sectionTitle: {
    fontSize: 20,
    marginBottom: 16,
    fontWeight: 'bold',
  },
  recentCard: {
    marginBottom: 12,
    elevation: 1,
  },
  recentHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 8,
  },
  recentInvoice: {
    fontSize: 16,
    fontWeight: 'bold',
    color: '#2196F3',
  },
  recentDate: {
    fontSize: 14,
    color: '#666',
  },
  recentMaterial: {
    fontSize: 14,
    marginBottom: 8,
    color: '#333',
  },
  recentInspector: {
    marginBottom: 8,
  },
  recentInspectorText: {
    fontSize: 12,
    color: '#666',
  },
  recentStatus: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
  },
  recentStatusText: {
    fontSize: 12,
    fontWeight: '500',
  },
  fab: {
    position: 'absolute',
    margin: 16,
    right: 0,
    bottom: 0,
    backgroundColor: '#2196F3',
  },
});