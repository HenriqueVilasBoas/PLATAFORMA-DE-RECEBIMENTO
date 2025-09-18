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
  Badge,
  Menu,
  IconButton
} from 'react-native-paper';
import { StatusBar } from 'expo-status-bar';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { router } from 'expo-router';
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

export default function HomePage() {
  const { t, language, setLanguage } = useLanguage();
  const [totalCargos, setTotalCargos] = useState(0);
  const [pendingSync, setPendingSync] = useState(0);
  const [recentCargos, setRecentCargos] = useState([]);
  const [languageMenuVisible, setLanguageMenuVisible] = useState(false);

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

      // Count pending sync items (items that haven't been exported)
      const pendingData = await AsyncStorage.getItem('pending_sync');
      const pending = pendingData ? JSON.parse(pendingData) : [];
      
      // Also count items that haven't been exported
      const notExportedCount = cargos.filter(cargo => !cargo.exported).length;
      setPendingSync(Math.max(pending.length, notExportedCount));
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
    if (!dateString) return 'N/A';
    const date = new Date(dateString);
    const day = date.getDate().toString().padStart(2, '0');
    const month = (date.getMonth() + 1).toString().padStart(2, '0');
    const year = date.getFullYear();
    return `${day}/${month}/${year}`;
  };

  const handleLanguageChange = (newLanguage) => {
    setLanguage(newLanguage);
    setLanguageMenuVisible(false);
  };

  return (
    <PaperProvider theme={theme}>
      <SafeAreaView style={styles.container}>
        <StatusBar style="auto" />
        
        <View style={styles.header}>
          <View style={styles.headerContent}>
            <Image 
              source={{ uri: 'https://customer-assets.emergentagent.com/job_receipt-monitor/artifacts/svdyj4wl_LOGO%20carvalho.png' }}
              style={styles.logo}
              resizeMode="contain"
            />
            <View style={styles.headerTextContainer}>
              <Text style={styles.appTitle}>{t('app.title')}</Text>
              <Text style={styles.appSubtitle}>{t('app.subtitle')}</Text>
            </View>
          </View>
          <View style={styles.headerActions}>
            <Menu
              visible={languageMenuVisible}
              onDismiss={() => setLanguageMenuVisible(false)}
              anchor={
                <IconButton
                  icon="translate"
                  iconColor="#fff"
                  onPress={() => setLanguageMenuVisible(true)}
                />
              }
            >
              <Menu.Item
                onPress={() => handleLanguageChange('pt')}
                title={t('language.portuguese')}
                leadingIcon={language === 'pt' ? 'check' : undefined}
              />
              <Menu.Item
                onPress={() => handleLanguageChange('en')}
                title={t('language.english')}
                leadingIcon={language === 'en' ? 'check' : undefined}
              />
            </Menu>
            
            {pendingSync > 0 && (
              <View style={styles.syncContainer}>
                <Badge style={styles.syncBadge} size={20}>
                  {pendingSync}
                </Badge>
                <MaterialIcons name="cloud-sync" size={24} color="#fff" />
              </View>
            )}
          </View>
        </View>

        <ScrollView style={styles.content} showsVerticalScrollIndicator={false}>
          {/* Quick Stats */}
          <View style={styles.statsContainer}>
            <Card style={styles.statsCard}>
              <Card.Content style={styles.statsContent}>
                <MaterialIcons name="assignment" size={40} color="#2196F3" />
                <View style={styles.statsText}>
                  <Title style={styles.statsNumber}>{totalCargos}</Title>
                  <Paragraph>{t('home.totalInspections')}</Paragraph>
                </View>
              </Card.Content>
            </Card>
            
            <Card style={styles.statsCard}>
              <Card.Content style={styles.statsContent}>
                <MaterialIcons name="sync" size={40} color="#FF9800" />
                <View style={styles.statsText}>
                  <Title style={styles.statsNumber}>{pendingSync}</Title>
                  <Paragraph>{t('home.pendingSync')}</Paragraph>
                </View>
              </Card.Content>
            </Card>
          </View>

          {/* Main Action Buttons - New Inspection First */}
          <View style={styles.actionContainer}>
            <Card style={styles.actionCard}>
              <Card.Content>
                <View style={styles.actionHeader}>
                  <MaterialIcons name="add-box" size={32} color="#2196F3" />
                  <View style={styles.actionTitleContainer}>
                    <Title style={styles.actionTitle}>{t('home.newMaterialInspection')}</Title>
                    <Paragraph style={styles.actionDescription}>
                      {t('home.newInspectionDesc')}
                    </Paragraph>
                  </View>
                </View>
                <Button
                  mode="contained"
                  onPress={handleAddNewCargo}
                  style={styles.actionButton}
                  icon="plus"
                >
                  {t('button.newMaterialInspection')}
                </Button>
              </Card.Content>
            </Card>

            <Card style={styles.actionCard}>
              <Card.Content>
                <View style={styles.actionHeader}>
                  <MaterialIcons name="list-alt" size={32} color="#4CAF50" />
                  <View style={styles.actionTitleContainer}>
                    <Title style={styles.actionTitle}>{t('home.materialManagement')}</Title>
                    <Paragraph style={styles.actionDescription}>
                      {t('home.materialManagementDesc')}
                    </Paragraph>
                  </View>
                </View>
                <Button
                  mode="outlined"
                  onPress={handleViewAllCargos}
                  style={styles.actionButton}
                  icon="view-list"
                >
                  {t('button.viewAllMaterials')}
                </Button>
              </Card.Content>
            </Card>

            <Card style={styles.actionCard}>
              <Card.Content>
                <View style={styles.actionHeader}>
                  <MaterialIcons name="analytics" size={32} color="#FF9800" />
                  <View style={styles.actionTitleContainer}>
                    <Title style={styles.actionTitle}>{t('home.analyticsDashboard')}</Title>
                    <Paragraph style={styles.actionDescription}>
                      {t('home.analyticsDashboardDesc')}
                    </Paragraph>
                  </View>
                </View>
                <Button
                  mode="outlined"
                  onPress={handleViewDashboard}
                  style={styles.actionButton}
                  icon="chart-line"
                >
                  {t('button.viewDashboard')}
                </Button>
              </Card.Content>
            </Card>
          </View>

          {/* Recent Inspections Preview */}
          {recentCargos.length > 0 && (
            <View style={styles.recentContainer}>
              <Title style={styles.sectionTitle}>{t('home.recentInspections')}</Title>
              {recentCargos.map((cargo, index) => (
                <Card key={cargo.id} style={styles.recentCard}>
                  <Card.Content>
                    <View style={styles.recentHeader}>
                      <Text style={styles.recentInvoice}>#{cargo.invoiceNumber}</Text>
                      <View style={styles.recentMeta}>
                        <Text style={styles.recentDate}>
                          {formatDate(cargo.receiveDate || cargo.inspectionDate)}
                        </Text>
                        {cargo.exported && (
                          <MaterialIcons name="cloud-done" size={16} color="#4CAF50" />
                        )}
                      </View>
                    </View>
                    <Text style={styles.recentMaterial}>{cargo.materialType}</Text>
                    <View style={styles.recentInspector}>
                      <Text style={styles.recentInspectorText}>
                        {t('form.qualityInspector')}: {cargo.qualityInspector}
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
                        {cargo.nonConforming ? t('conformance.nonCompliant') : t('conformance.compliant')}
                      </Text>
                    </View>
                  </Card.Content>
                </Card>
              ))}
            </View>
          )}
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
  header: {
    backgroundColor: '#2196F3',
    paddingHorizontal: 20,
    paddingVertical: 16,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    elevation: 4,
    shadowColor: '#000',
    shadowOffset: {
      width: 0,
      height: 2,
    },
    shadowOpacity: 0.25,
    shadowRadius: 3.84,
  },
  headerContent: {
    flexDirection: 'row',
    alignItems: 'center',
    flex: 1,
  },
  logo: {
    width: 48,
    height: 48,
    marginRight: 16,
    borderRadius: 24,
    backgroundColor: '#fff',
  },
  headerTextContainer: {
    flex: 1,
  },
  appTitle: {
    fontSize: 20,
    fontWeight: 'bold',
    color: '#fff',
  },
  appSubtitle: {
    fontSize: 14,
    color: '#E3F2FD',
    marginTop: 2,
  },
  headerActions: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  syncContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: 'rgba(255,255,255,0.1)',
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 20,
    marginLeft: 8,
  },
  syncBadge: {
    backgroundColor: '#f44336',
    marginRight: 8,
  },
  content: {
    flex: 1,
    padding: 16,
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
  actionHeader: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    marginBottom: 16,
  },
  actionTitleContainer: {
    flex: 1,
    marginLeft: 12,
  },
  actionTitle: {
    fontSize: 18,
    marginBottom: 4,
  },
  actionDescription: {
    fontSize: 14,
    color: '#666',
  },
  actionButton: {
    marginTop: 8,
  },
  recentContainer: {
    marginBottom: 32,
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
  recentMeta: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
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
});