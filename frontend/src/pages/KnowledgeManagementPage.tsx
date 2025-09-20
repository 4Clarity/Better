import { Routes, Route, Navigate } from 'react-router-dom';
import { KMLayout } from '../components/knowledge-management/layouts/KMLayout';
import { WeeklyCuration } from '../components/knowledge-management/pages/WeeklyCuration';
import { DocumentUpload } from '../components/knowledge-management/pages/DocumentUpload';
import { CommunicationFiles } from '../components/knowledge-management/pages/CommunicationFiles';
import { FactsCuration } from '../components/knowledge-management/pages/FactsCuration';
import { ApprovalQueue } from '../components/knowledge-management/pages/ApprovalQueue';
import { KnowledgeSearch } from '../components/knowledge-management/pages/KnowledgeSearch';
import { Configuration } from '../components/knowledge-management/pages/Configuration';

export function KnowledgeManagementPage() {
  return (
    <KMLayout>
      <Routes>
        <Route path="/" element={<Navigate to="/knowledge/weekly-curation" replace />} />
        <Route path="/weekly-curation" element={<WeeklyCuration />} />
        <Route path="/document-upload" element={<DocumentUpload />} />
        <Route path="/communication-files" element={<CommunicationFiles />} />
        <Route path="/facts-curation" element={<FactsCuration />} />
        <Route path="/approval-queue" element={<ApprovalQueue />} />
        <Route path="/knowledge-search" element={<KnowledgeSearch />} />
        <Route path="/configuration" element={<Configuration />} />
      </Routes>
    </KMLayout>
  );
}