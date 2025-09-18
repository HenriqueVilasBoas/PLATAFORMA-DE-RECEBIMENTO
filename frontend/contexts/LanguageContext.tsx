import React, { createContext, useContext, useState, useEffect } from 'react';
import AsyncStorage from '@react-native-async-storage/async-storage';

interface LanguageContextType {
  language: 'en' | 'pt';
  setLanguage: (lang: 'en' | 'pt') => void;
  t: (key: string) => string;
}

const LanguageContext = createContext<LanguageContextType | undefined>(undefined);

const translations = {
  en: {
    // App Title
    'app.title': 'Material Receiving Control',
    'app.subtitle': 'Quality Inspection System',

    // Home Screen
    'home.totalInspections': 'Total Inspections',
    'home.pendingSync': 'Pending Sync',
    'home.newMaterialInspection': 'New Material Inspection',
    'home.newInspectionDesc': 'Start a new material receiving inspection with photos and details',
    'home.materialManagement': 'Material Management',
    'home.materialManagementDesc': 'View, search, and manage all material inspection records',
    'home.analyticsDashboard': 'Analytics Dashboard',
    'home.analyticsDashboardDesc': 'View statistics, compliance reports, and insights',
    'home.recentInspections': 'Recent Inspections',

    // Form Fields
    'form.invoiceNumber': 'Invoice Number',
    'form.materialType': 'Material Type',
    'form.quantityReceived': 'Quantity Received (Optional)',
    'form.receiveDate': 'Receive Date',
    'form.storageLocation': 'Storage Location',
    'form.qualityInspector': 'Quality Inspector',
    'form.safetyInspector': 'Safety Inspector (Optional)',
    'form.logisticsInspector': 'Logistics Inspector (Optional)',
    'form.notes': 'Notes (Optional)',
    'form.notesPlaceholder': 'Add any additional observations, comments, or special instructions...',

    // Form Sections
    'section.basicInfo': 'Basic Information',
    'section.inspectorInfo': 'Inspector Information',
    'section.conformanceStatus': 'Conformance Status',
    'section.photos': 'Photos',
    'section.photosDesc': 'Add photos of the material (up to 5 photos per inspection)',
    'section.additionalNotes': 'Additional Notes',

    // Conformance
    'conformance.nonConforming': 'Non-Conforming Material',
    'conformance.selectType': 'Select Non-Conformance Type',
    'conformance.nonConformingQuantity': 'Non-Conforming Quantity',
    'conformance.compliant': 'Compliant',
    'conformance.nonCompliant': 'Non-Conforming',

    // Non-Conformance Types
    'nonConformance.physicalDamage': 'Physical Damage',
    'nonConformance.packagingDamage': 'Packaging Damage',
    'nonConformance.quantityDiscrepancy': 'Quantity Discrepancy',
    'nonConformance.qualityIssues': 'Quality Issues',
    'nonConformance.missingDocumentation': 'Missing Documentation',
    'nonConformance.contamination': 'Contamination',
    'nonConformance.wrongSpecification': 'Wrong Specification',
    'nonConformance.expiryDateIssues': 'Expiry/Date Issues',

    // Buttons
    'button.newMaterialInspection': 'New Material Inspection',
    'button.viewAllMaterials': 'View All Materials',
    'button.viewDashboard': 'View Dashboard',
    'button.takePhoto': 'Take Photo',
    'button.fromGallery': 'From Gallery',
    'button.save': 'Save Inspection',
    'button.update': 'Update Inspection',
    'button.edit': 'Edit',
    'button.delete': 'Delete',
    'button.export': 'Export',
    'button.cancel': 'Cancel',

    // Camera Options
    'camera.chooseOption': 'Choose Camera Option',
    'camera.selectHow': 'Select how you want to add photos:',
    'camera.timestampApps': 'Timestamp Camera Apps',
    'camera.defaultCamera': 'Default Camera',
    'camera.fromGallery': 'From Gallery',

    // Messages
    'message.success': 'Success',
    'message.error': 'Error',
    'message.validationError': 'Validation Error',
    'message.fixErrors': 'Please fix the errors and try again',
    'message.inspectionSaved': 'Material inspection saved successfully',
    'message.inspectionUpdated': 'Material inspection updated successfully',
    'message.photoAdded': 'Photo added successfully',
    'message.photosAdded': 'photos added successfully',

    // Validation
    'validation.required': 'is required',
    'validation.validNumber': 'must be a valid number',

    // Export
    'export.title': 'Export Inspections',
    'export.exportType': 'Export Type',
    'export.allInspections': 'All Inspections',
    'export.selectedInspections': 'Selected Inspections',
    'export.directDownload': 'Direct Download',
    'export.emailMultiple': 'Email Multiple Reports',
    'export.whatsappMultiple': 'WhatsApp Multiple Reports',
    'export.cloudStorage': 'Cloud Storage',

    // Status
    'status.exported': 'Exported',
    'status.notExported': 'Not Exported',
    'status.synced': 'Synced',
    'status.pendingSync': 'Pending Sync',

    // Language
    'language.english': 'English',
    'language.portuguese': 'Português (Brasil)',
    'language.changeLanguage': 'Change Language',
  },
  pt: {
    // App Title
    'app.title': 'Controle de Recebimento de Material',
    'app.subtitle': 'Sistema de Inspeção de Qualidade',

    // Home Screen
    'home.totalInspections': 'Total de Inspeções',
    'home.pendingSync': 'Sincronização Pendente',
    'home.newMaterialInspection': 'Nova Inspeção de Material',
    'home.newInspectionDesc': 'Iniciar uma nova inspeção de recebimento de material com fotos e detalhes',
    'home.materialManagement': 'Gerenciamento de Material',
    'home.materialManagementDesc': 'Visualizar, pesquisar e gerenciar todos os registros de inspeção de material',
    'home.analyticsDashboard': 'Painel de Análise',
    'home.analyticsDashboardDesc': 'Ver estatísticas, relatórios de conformidade e insights',
    'home.recentInspections': 'Inspeções Recentes',

    // Form Fields
    'form.invoiceNumber': 'Número da Nota Fiscal',
    'form.materialType': 'Tipo de Material',
    'form.quantityReceived': 'Quantidade Recebida (Opcional)',
    'form.receiveDate': 'Data de Recebimento',
    'form.storageLocation': 'Local de Armazenamento',
    'form.qualityInspector': 'Inspetor de Qualidade',
    'form.safetyInspector': 'Inspetor de Segurança (Opcional)',
    'form.logisticsInspector': 'Inspetor de Logística (Opcional)',
    'form.notes': 'Observações (Opcional)',
    'form.notesPlaceholder': 'Adicione observações, comentários ou instruções especiais...',

    // Form Sections
    'section.basicInfo': 'Informações Básicas',
    'section.inspectorInfo': 'Informações do Inspetor',
    'section.conformanceStatus': 'Status de Conformidade',
    'section.photos': 'Fotos',
    'section.photosDesc': 'Adicionar fotos do material (até 5 fotos por inspeção)',
    'section.additionalNotes': 'Observações Adicionais',

    // Conformance
    'conformance.nonConforming': 'Material Não Conforme',
    'conformance.selectType': 'Selecionar Tipo de Não Conformidade',
    'conformance.nonConformingQuantity': 'Quantidade Não Conforme',
    'conformance.compliant': 'Conforme',
    'conformance.nonCompliant': 'Não Conforme',

    // Non-Conformance Types
    'nonConformance.physicalDamage': 'Dano Físico',
    'nonConformance.packagingDamage': 'Dano na Embalagem',
    'nonConformance.quantityDiscrepancy': 'Discrepância de Quantidade',
    'nonConformance.qualityIssues': 'Problemas de Qualidade',
    'nonConformance.missingDocumentation': 'Documentação Ausente',
    'nonConformance.contamination': 'Contaminação',
    'nonConformance.wrongSpecification': 'Especificação Incorreta',
    'nonConformance.expiryDateIssues': 'Problemas de Validade',

    // Buttons
    'button.newMaterialInspection': 'Nova Inspeção de Material',
    'button.viewAllMaterials': 'Ver Todos os Materiais',
    'button.viewDashboard': 'Ver Painel',
    'button.takePhoto': 'Tirar Foto',
    'button.fromGallery': 'Da Galeria',
    'button.save': 'Salvar Inspeção',
    'button.update': 'Atualizar Inspeção',
    'button.edit': 'Editar',
    'button.delete': 'Excluir',
    'button.export': 'Exportar',
    'button.cancel': 'Cancelar',

    // Camera Options
    'camera.chooseOption': 'Escolher Opção de Câmera',
    'camera.selectHow': 'Selecione como deseja adicionar fotos:',
    'camera.timestampApps': 'Apps de Câmera com Timestamp',
    'camera.defaultCamera': 'Câmera Padrão',
    'camera.fromGallery': 'Da Galeria',

    // Messages
    'message.success': 'Sucesso',
    'message.error': 'Erro',
    'message.validationError': 'Erro de Validação',
    'message.fixErrors': 'Por favor, corrija os erros e tente novamente',
    'message.inspectionSaved': 'Inspeção de material salva com sucesso',
    'message.inspectionUpdated': 'Inspeção de material atualizada com sucesso',
    'message.photoAdded': 'Foto adicionada com sucesso',
    'message.photosAdded': 'fotos adicionadas com sucesso',

    // Validation
    'validation.required': 'é obrigatório',
    'validation.validNumber': 'deve ser um número válido',

    // Export
    'export.title': 'Exportar Inspeções',
    'export.exportType': 'Tipo de Exportação',
    'export.allInspections': 'Todas as Inspeções',
    'export.selectedInspections': 'Inspeções Selecionadas',
    'export.directDownload': 'Download Direto',
    'export.emailMultiple': 'Enviar Múltiplos por Email',
    'export.whatsappMultiple': 'Enviar Múltiplos por WhatsApp',
    'export.cloudStorage': 'Armazenamento na Nuvem',

    // Status
    'status.exported': 'Exportado',
    'status.notExported': 'Não Exportado',
    'status.synced': 'Sincronizado',
    'status.pendingSync': 'Sincronização Pendente',

    // Language
    'language.english': 'English',
    'language.portuguese': 'Português (Brasil)',
    'language.changeLanguage': 'Alterar Idioma',
  },
};

export const LanguageProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [language, setLanguageState] = useState<'en' | 'pt'>('pt'); // Default to Portuguese

  useEffect(() => {
    loadLanguage();
  }, []);

  const loadLanguage = async () => {
    try {
      const savedLanguage = await AsyncStorage.getItem('app_language');
      if (savedLanguage && (savedLanguage === 'en' || savedLanguage === 'pt')) {
        setLanguageState(savedLanguage);
      }
    } catch (error) {
      console.error('Error loading language:', error);
    }
  };

  const setLanguage = async (lang: 'en' | 'pt') => {
    try {
      await AsyncStorage.setItem('app_language', lang);
      setLanguageState(lang);
    } catch (error) {
      console.error('Error saving language:', error);
    }
  };

  const t = (key: string): string => {
    return translations[language][key] || key;
  };

  return (
    <LanguageContext.Provider value={{ language, setLanguage, t }}>
      {children}
    </LanguageContext.Provider>
  );
};

export const useLanguage = () => {
  const context = useContext(LanguageContext);
  if (context === undefined) {
    throw new Error('useLanguage must be used within a LanguageProvider');
  }
  return context;
};