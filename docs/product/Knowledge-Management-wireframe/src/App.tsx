import { useState } from 'react';
import { Sidebar } from './components/sidebar';
import { DocumentUpload } from './components/document-upload';
import { CommunicationFiles } from './components/communication-files';
import { FactsCuration } from './components/facts-curation';
import { ApprovalQueue } from './components/approval-queue';
import { KnowledgeSearch } from './components/knowledge-search';
import { Configuration } from './components/configuration';
import { WeeklyCuration } from './components/weekly-curation';
import { FileText, MessageSquare, Brain, CheckSquare, Search, Settings, Calendar } from 'lucide-react';

export type NavigationItem = {
  id: string;
  title: string;
  icon: React.ComponentType<{ className?: string }>;
  component: React.ComponentType;
};

const navigationItems: NavigationItem[] = [
  {
    id: 'weekly',
    title: 'Weekly Curation',
    icon: Calendar,
    component: WeeklyCuration,
  },
  {
    id: 'documents',
    title: 'Product Documents',
    icon: FileText,
    component: DocumentUpload,
  },
  {
    id: 'communications',
    title: 'Communication Files',
    icon: MessageSquare,
    component: CommunicationFiles,
  },
  {
    id: 'facts',
    title: 'Facts Curation',
    icon: Brain,
    component: FactsCuration,
  },
  {
    id: 'approval',
    title: 'Approval Queue',
    icon: CheckSquare,
    component: ApprovalQueue,
  },
  {
    id: 'search',
    title: 'Knowledge Search',
    icon: Search,
    component: KnowledgeSearch,
  },
  {
    id: 'config',
    title: 'Configuration',
    icon: Settings,
    component: Configuration,
  },
];

export default function App() {
  const [activeSection, setActiveSection] = useState('weekly');

  const currentComponent = navigationItems.find(item => item.id === activeSection)?.component || WeeklyCuration;
  const CurrentComponent = currentComponent;

  return (
    <div className="flex h-screen bg-background">
      <Sidebar
        navigationItems={navigationItems}
        activeSection={activeSection}
        onSectionChange={setActiveSection}
      />
      <main className="flex-1 overflow-hidden">
        <CurrentComponent />
      </main>
    </div>
  );
}