import React, { useState } from 'react';
import { useApp } from './state/AppContext';
import { Sidebar } from './components/layout/Sidebar';
import { Header } from './components/layout/Header';
import { FooterDisclaimer } from './components/layout/FooterDisclaimer';
import { OverviewDashboard } from './pages/OverviewDashboard';
import { DataIntegrityPage } from './pages/DataIntegrityPage';
import { ModelIntegrityPage } from './pages/ModelIntegrityPage';
import { InferenceProvenancePage } from './pages/InferenceProvenancePage';
import { DistributionShiftPage } from './pages/DistributionShiftPage';
import { ContributorTrustPage } from './pages/ContributorTrustPage';
import { AttackSimulationLab } from './pages/AttackSimulationLab';
import { AuditVaultPage } from './pages/AuditVaultPage';
import { AssuranceReportPage } from './pages/AssuranceReportPage';
import { AssessmentWizardModal } from './components/common/AssessmentWizardModal';

export const AppContent: React.FC = () => {
  const { activePage } = useApp();
  const [isWizardOpen, setIsWizardOpen] = useState(false);

  const renderActivePage = () => {
    switch (activePage) {
      case 'overview':
        return <OverviewDashboard />;
      case 'data':
        return <DataIntegrityPage />;
      case 'model':
        return <ModelIntegrityPage />;
      case 'inference':
        return <InferenceProvenancePage />;
      case 'distribution':
        return <DistributionShiftPage />;
      case 'contributors':
        return <ContributorTrustPage />;
      case 'attack-lab':
        return <AttackSimulationLab />;
      case 'audit':
        return <AuditVaultPage />;
      case 'report':
        return <AssuranceReportPage />;
      default:
        return <OverviewDashboard />;
    }
  };

  return (
    <div className="min-h-screen bg-surface font-sans text-on-surface antialiased">
      {/* Persistent Left Sidebar */}
      <Sidebar />

      {/* Main Content Viewport offset by 64 (16rem / 256px) for fixed sidebar */}
      <div className="pl-64 flex flex-col min-h-screen">
        {/* Top Header */}
        <Header onOpenWizard={() => setIsWizardOpen(true)} />

        {/* Dynamic Page Workspace */}
        <main className="w-full pt-16 px-space-lg py-space-lg bg-surface flex-1 min-h-[calc(100vh-3.5rem)]">
          {renderActivePage()}
        </main>

        {/* Mandatory Footer Disclaimer */}
        <FooterDisclaimer />
      </div>

      {/* Global Assessment Wizard Modal */}
      <AssessmentWizardModal isOpen={isWizardOpen} onClose={() => setIsWizardOpen(false)} />
    </div>
  );
};

export default AppContent;
