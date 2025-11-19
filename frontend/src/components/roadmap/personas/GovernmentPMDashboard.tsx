import { useState, useEffect } from "react";
import { RoadmapWidget } from "../widgets/RoadmapWidget";
import { MetricCard } from "../widgets/MetricCard";
import { ProcessFlow } from "../widgets/ProcessFlowStep";
import { Timeline } from "../widgets/TimelineItem";
import {
  SettingsIcon,
  ListChecksIcon,
  LayoutDashboardIcon,
  MapIcon,
  PlusIcon,
  UsersIcon,
  LoaderIcon
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { dashboardApi, GovernmentPMDashboard as GovernmentPMDashboardData } from "@/services/dashboardApi";

export function GovernmentPMDashboard() {
  const [dashboardData, setDashboardData] = useState<GovernmentPMDashboardData | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    async function fetchDashboardData() {
      try {
        setLoading(true);
        const data = await dashboardApi.getGovernmentPMDashboard();
        setDashboardData(data);
        setError(null);
      } catch (err) {
        console.error('Error fetching dashboard data:', err);
        setError('Failed to load dashboard data. Please try again.');
      } finally {
        setLoading(false);
      }
    }

    fetchDashboardData();
  }, []);

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <LoaderIcon className="w-8 h-8 animate-spin text-purple-600" />
        <span className="ml-2 text-lg">Loading dashboard...</span>
      </div>
    );
  }

  if (error || !dashboardData) {
    return (
      <div className="flex flex-col items-center justify-center h-64">
        <p className="text-red-600 mb-4">{error || 'Failed to load dashboard'}</p>
        <Button onClick={() => window.location.reload()}>Retry</Button>
      </div>
    );
  }

  // Transform API data to component format with defensive checks
  // Check localStorage for completion status
  const businessOpsCompleted = localStorage.getItem('businessOperationsSetupCompleted') === 'true';
  const knowledgeCompleted = localStorage.getItem('knowledgeSetupCompleted') === 'true';
  const stakeholdersCompleted = localStorage.getItem('stakeholdersSetupCompleted') === 'true';

  // Add the 3 required setup wizard links as the first items
  const platformSetupSteps = [
    {
      title: 'Business Operations',
      description: 'Configure organization structure and contracts',
      status: (businessOpsCompleted ? 'complete' : 'not-started') as const,
      link: businessOpsCompleted ? undefined : '/setup/business-operations'
    },
    {
      title: 'Knowledge',
      description: 'Set up knowledge repository and AI search',
      status: (knowledgeCompleted ? 'complete' : 'not-started') as const,
      link: knowledgeCompleted ? undefined : '/setup/knowledge'
    },
    {
      title: 'Stakeholders',
      description: 'Define roles and invite team members',
      status: (stakeholdersCompleted ? 'complete' : 'not-started') as const,
      link: stakeholdersCompleted ? undefined : '/setup/stakeholders'
    },
    // Add any additional steps from the API data
    ...(dashboardData.platformSetup || []).map(step => ({
      title: step.title,
      description: '',
      status: step.status
    }))
  ];

  // Count completed setup steps
  const completedCount = [businessOpsCompleted, knowledgeCompleted, stakeholdersCompleted].filter(Boolean).length;

  const curationQueue = (dashboardData.curationQueue || []).map(item => ({
    title: item.title,
    description: `Submitted by ${item.submittedBy}`,
    timestamp: new Date(item.submittedAt),
    status: item.status as 'pending' | 'in-progress' | 'completed',
    author: item.submittedBy,
  }));

  const transitionRoadmap = dashboardData.transitionRoadmap || { contracts: [], personnel: [] };

  return (
    <div className="space-y-6">
      {/* Header Section */}
      <div className="flex justify-between items-center">
        <div>
          <h1 className="text-3xl font-bold mb-2">Government Program Manager</h1>
          <p className="text-muted-foreground">
            Transition oversight, stakeholder coordination, and knowledge continuity management
          </p>
        </div>
        <Button className="bg-gradient-to-r from-purple-600 to-blue-600 hover:from-purple-700 hover:to-blue-700">
          <PlusIcon className="w-4 h-4 mr-2" />
          Initiate New Transition
        </Button>
      </div>

      {/* Metrics Row */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <MetricCard
          value={dashboardData.metrics.activeTransitions.toString()}
          label="Active Transitions"
          gradient="from-purple-500 to-blue-500"
        />
        <MetricCard
          value={dashboardData.metrics.pendingReviews.toString()}
          label="Pending Reviews"
          gradient="from-pink-500 to-rose-500"
        />
        <MetricCard
          value={dashboardData.metrics.knowledgeArticles.toString()}
          label="Knowledge Articles"
          gradient="from-green-500 to-teal-500"
        />
        <MetricCard
          value={`${dashboardData.metrics.onTrackRate}%`}
          label="On-Track Rate"
          gradient="from-blue-500 to-cyan-500"
        />
      </div>

      {/* Main Content Grid */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Platform Setup Widget */}
        <RoadmapWidget
          title="Platform Setup"
          icon={<SettingsIcon className="w-5 h-5" />}
          badge={`${completedCount} of ${platformSetupSteps.length}`}
        >
          <ProcessFlow steps={platformSetupSteps} orientation="vertical" />
        </RoadmapWidget>

        {/* Knowledge Curation Queue */}
        <RoadmapWidget
          title="Knowledge Curation Queue"
          icon={<ListChecksIcon className="w-5 h-5" />}
          badge={3}
        >
          <Timeline items={curationQueue} />
          <Button variant="outline" className="w-full mt-4">
            View All Pending Reviews
          </Button>
        </RoadmapWidget>

        {/* Transition Control Panel */}
        <RoadmapWidget
          title="Transition Control Panel"
          icon={<LayoutDashboardIcon className="w-5 h-5" />}
          variant="highlighted"
        >
          <div className="space-y-3">
            <Button variant="outline" className="w-full justify-start">
              <UsersIcon className="w-4 h-4 mr-2" />
              Manage Stakeholders
            </Button>
            <Button variant="outline" className="w-full justify-start">
              <MapIcon className="w-4 h-4 mr-2" />
              Generate Roadmap
            </Button>
            <Button variant="outline" className="w-full justify-start">
              <ListChecksIcon className="w-4 h-4 mr-2" />
              Review Tasks & Milestones
            </Button>
          </div>
        </RoadmapWidget>

        {/* Transition Roadmap Overview */}
        <RoadmapWidget
          title="Transition Roadmap Overview"
          icon={<MapIcon className="w-5 h-5" />}
        >
          <div className="space-y-4">
            {/* Contracts */}
            <div>
              <h4 className="font-semibold text-sm mb-3">Contract Transitions</h4>
              <div className="space-y-2">
                {(transitionRoadmap.contracts || []).length > 0 ? (
                  transitionRoadmap.contracts.map((contract, idx) => (
                    <div key={idx} className="space-y-1">
                      <div className="flex justify-between text-sm">
                        <span>{contract.name}</span>
                        <span className="font-semibold">{contract.progress}%</span>
                      </div>
                      <div className="h-2 bg-gray-200 rounded-full overflow-hidden">
                        <div
                          className={`h-full ${
                            contract.status === 'on-track' ? 'bg-green-500' :
                            contract.status === 'at-risk' ? 'bg-yellow-500' :
                            'bg-red-500'
                          }`}
                          style={{ width: `${contract.progress}%` }}
                        />
                      </div>
                    </div>
                  ))
                ) : (
                  <p className="text-sm text-muted-foreground">No active contract transitions</p>
                )}
              </div>
            </div>

            {/* Personnel */}
            <div>
              <h4 className="font-semibold text-sm mb-3">Personnel Status</h4>
              <div className="space-y-2">
                {(transitionRoadmap.personnel || []).length > 0 ? (
                  transitionRoadmap.personnel.map((personnel, idx) => (
                    <div key={idx} className="flex justify-between items-center text-sm">
                      <span>{personnel.role}</span>
                      <div className="flex items-center gap-2">
                        <span className="text-muted-foreground">{personnel.count}</span>
                        <span
                          className={`px-2 py-1 rounded text-xs font-medium ${
                            personnel.status === 'ready' ? 'bg-green-100 text-green-800' :
                            personnel.status === 'training' ? 'bg-blue-100 text-blue-800' :
                            'bg-yellow-100 text-yellow-800'
                          }`}
                        >
                          {personnel.status}
                        </span>
                      </div>
                    </div>
                  ))
                ) : (
                  <p className="text-sm text-muted-foreground">No personnel data available</p>
                )}
              </div>
            </div>
          </div>
        </RoadmapWidget>
      </div>
    </div>
  );
}
