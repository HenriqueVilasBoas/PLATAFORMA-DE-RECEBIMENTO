import React, { useState, useEffect } from 'react';
import { View, StyleSheet, ScrollView, Dimensions } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { 
  Text, 
  Card, 
  Provider as PaperProvider,
  DefaultTheme,
  Appbar,
  Title,
  Paragraph,
  ProgressBar,
  Chip,
  List
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

const { width } = Dimensions.get('window');

export default function DashboardPage() {
  const [stats, setStats] = useState({
    totalInspections: 0,
    compliantCount: 0,
    nonCompliantCount: 0,
    recentCount: 0,
    complianceRate: 0,
    nonConformanceTypes: {}
  });
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    loadDashboardStats();
  }, []);

  const loadDashboardStats = async () => {
    try {
      const cargosData = await AsyncStorage.getItem('cargo_inspections');
      const cargos = cargosData ? JSON.parse(cargosData) : [];
      
      // Calculate basic stats
      const totalInspections = cargos.length;
      const compliantCount = cargos.filter(cargo => !cargo.nonConforming).length;
      const nonCompliantCount = cargos.filter(cargo => cargo.nonConforming).length;
      const complianceRate = totalInspections > 0 ? (compliantCount / totalInspections) * 100 : 0;
      
      // Recent inspections (last 7 days)
      const sevenDaysAgo = new Date();
      sevenDaysAgo.setDate(sevenDaysAgo.getDate() - 7);
      const recentCount = cargos.filter(cargo => 
        new Date(cargo.inspectionDate) > sevenDaysAgo
      ).length;
      
      // Non-conformance type statistics
      const nonConformanceTypes = {};
      cargos.forEach(cargo => {
        if (cargo.nonConforming && cargo.nonConformanceType) {
          nonConformanceTypes[cargo.nonConformanceType] = 
            (nonConformanceTypes[cargo.nonConformanceType] || 0) + 1;
        }
      });
      
      // Sort non-conformance types by frequency
      const sortedNonConformanceTypes = Object.entries(nonConformanceTypes)
        .sort(([,a], [,b]) => b - a)
        .slice(0, 5); // Top 5
      
      // Material type statistics
      const materialTypes = {};
      cargos.forEach(cargo => {
        materialTypes[cargo.materialType] = (materialTypes[cargo.materialType] || 0) + 1;
      });
      
      const sortedMaterialTypes = Object.entries(materialTypes)
        .sort(([,a], [,b]) => b - a)
        .slice(0, 5); // Top 5
      
      setStats({
        totalInspections,
        compliantCount,
        nonCompliantCount,
        recentCount,
        complianceRate,
        nonConformanceTypes: sortedNonConformanceTypes,
        materialTypes: sortedMaterialTypes
      });
      
    } catch (error) {
      console.error('Error loading dashboard stats:', error);
    } finally {
      setLoading(false);
    }
  };

  const StatCard = ({ title, value, subtitle, color = '#2196F3', icon }) => (
    <Card style={[styles.statCard, { borderLeftColor: color, borderLeftWidth: 4 }]}>
      <Card.Content style={styles.statContent}>
        <View style={styles.statHeader}>
          <MaterialIcons name={icon} size={24} color={color} />
          <Text style={styles.statValue}>{value}</Text>
        </View>
        <Text style={styles.statTitle}>{title}</Text>
        {subtitle && <Text style={styles.statSubtitle}>{subtitle}</Text>}
      </Card.Content>
    </Card>
  );

  return (
    <PaperProvider theme={theme}>
      <SafeAreaView style={styles.container}>
        <StatusBar style="auto" />
        
        <Appbar.Header>
          <Appbar.BackAction onPress={() => router.back()} />
          <Appbar.Content title="Analytics Dashboard" />
          <Appbar.Action 
            icon="refresh" 
            onPress={loadDashboardStats}
          />
        </Appbar.Header>

        <ScrollView style={styles.content} showsVerticalScrollIndicator={false}>
          {/* Key Metrics */}
          <View style={styles.metricsContainer}>
            <StatCard
              title="Total Inspections"
              value={stats.totalInspections}
              icon="inventory"
              color="#2196F3"
            />
            <StatCard
              title="Recent (7 days)"
              value={stats.recentCount}
              icon="schedule"
              color="#FF9800"
            />
          </View>

          <View style={styles.metricsContainer}>
            <StatCard
              title="Compliant"
              value={stats.compliantCount}
              icon="check-circle"
              color="#4CAF50"
            />
            <StatCard
              title="Non-Compliant"
              value={stats.nonCompliantCount}
              icon="warning"
              color="#F44336"
            />
          </View>

          {/* Compliance Rate */}
          <Card style={styles.section}>
            <Card.Content>
              <Title style={styles.sectionTitle}>Compliance Rate</Title>
              <View style={styles.complianceContainer}>
                <Text style={styles.compliancePercentage}>
                  {stats.complianceRate.toFixed(1)}%
                </Text>
                <ProgressBar
                  progress={stats.complianceRate / 100}
                  color={stats.complianceRate >= 90 ? '#4CAF50' : 
                         stats.complianceRate >= 70 ? '#FF9800' : '#F44336'}
                  style={styles.progressBar}
                />
                <Text style={styles.complianceDescription}>
                  {stats.complianceRate >= 90 ? 'Excellent compliance' :
                   stats.complianceRate >= 70 ? 'Good compliance' : 'Needs improvement'}
                </Text>
              </View>
            </Card.Content>
          </Card>

          {/* Top Non-Conformance Types */}
          {stats.nonConformanceTypes && stats.nonConformanceTypes.length > 0 && (
            <Card style={styles.section}>
              <Card.Content>
                <Title style={styles.sectionTitle}>Top Non-Conformance Issues</Title>
                <Paragraph style={styles.sectionDescription}>
                  Most common types of non-conforming materials
                </Paragraph>
                {stats.nonConformanceTypes.map(([type, count], index) => (
                  <View key={type} style={styles.listItem}>
                    <View style={styles.listItemContent}>
                      <Text style={styles.listItemTitle}>{type}</Text>
                      <View style={styles.listItemMeta}>
                        <Chip mode="flat" style={styles.countChip}>
                          {count} cases
                        </Chip>
                      </View>
                    </View>
                    <View style={styles.listItemProgress}>
                      <ProgressBar
                        progress={count / Math.max(...stats.nonConformanceTypes.map(([,c]) => c))}
                        color="#F44336"
                        style={styles.itemProgressBar}
                      />
                    </View>
                  </View>
                ))}
              </Card.Content>
            </Card>
          )}

          {/* Top Material Types */}
          {stats.materialTypes && stats.materialTypes.length > 0 && (
            <Card style={styles.section}>
              <Card.Content>
                <Title style={styles.sectionTitle}>Most Inspected Materials</Title>
                <Paragraph style={styles.sectionDescription}>
                  Materials with highest inspection frequency
                </Paragraph>
                {stats.materialTypes.map(([type, count], index) => (
                  <View key={type} style={styles.listItem}>
                    <View style={styles.listItemContent}>
                      <Text style={styles.listItemTitle}>{type}</Text>
                      <View style={styles.listItemMeta}>
                        <Chip mode="flat" style={styles.countChip}>
                          {count} inspections
                        </Chip>
                      </View>
                    </View>
                    <View style={styles.listItemProgress}>
                      <ProgressBar
                        progress={count / Math.max(...stats.materialTypes.map(([,c]) => c))}
                        color="#2196F3"
                        style={styles.itemProgressBar}
                      />
                    </View>
                  </View>
                ))}
              </Card.Content>
            </Card>
          )}

          {/* Empty State */}
          {stats.totalInspections === 0 && (
            <Card style={styles.section}>
              <Card.Content style={styles.emptyState}>
                <MaterialIcons name="analytics" size={64} color="#ccc" />
                <Title style={styles.emptyTitle}>No Data Available</Title>
                <Paragraph style={styles.emptyDescription}>
                  Start adding cargo inspections to see analytics and insights here.
                </Paragraph>
              </Card.Content>
            </Card>
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
  content: {
    flex: 1,
    padding: 16,
  },
  metricsContainer: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: 16,
    gap: 12,
  },
  statCard: {
    flex: 1,
    elevation: 2,
  },
  statContent: {
    paddingVertical: 16,
  },
  statHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 8,
  },
  statValue: {
    fontSize: 28,
    fontWeight: 'bold',
    color: '#333',
  },
  statTitle: {
    fontSize: 14,
    fontWeight: '500',
    color: '#666',
  },
  statSubtitle: {
    fontSize: 12,
    color: '#999',
    marginTop: 2,
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
  complianceContainer: {
    alignItems: 'center',
    paddingVertical: 16,
  },
  compliancePercentage: {
    fontSize: 48,
    fontWeight: 'bold',
    color: '#2196F3',
    marginBottom: 16,
  },
  progressBar: {
    width: '100%',
    height: 8,
    borderRadius: 4,
    marginBottom: 8,
  },
  complianceDescription: {
    fontSize: 14,
    color: '#666',
    textAlign: 'center',
  },
  listItem: {
    marginBottom: 16,
  },
  listItemContent: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 8,
  },
  listItemTitle: {
    fontSize: 16,
    fontWeight: '500',
    flex: 1,
  },
  listItemMeta: {
    marginLeft: 12,
  },
  countChip: {
    height: 24,
    backgroundColor: '#e3f2fd',
  },
  listItemProgress: {
    marginTop: 4,
  },
  itemProgressBar: {
    height: 4,
    borderRadius: 2,
  },
  emptyState: {
    alignItems: 'center',
    paddingVertical: 48,
  },
  emptyTitle: {
    fontSize: 20,
    color: '#666',
    marginTop: 16,
    marginBottom: 8,
  },
  emptyDescription: {
    fontSize: 14,
    color: '#999',
    textAlign: 'center',
    paddingHorizontal: 24,
  },
});