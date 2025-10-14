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
  UsersIcon
} from "lucide-react";
import { Button } from "@/components/ui/button";

export function GovernmentPMDashboard() {
  // Placeholder data
  const platformSetupSteps = [
    { title: "Setup Users", description: "Configure user accounts", status: 'complete' as const },
    { title: "Configure System", description: "System settings", status: 'complete' as const },
    { title: "Import Data", description: "Load existing data", status: 'in-progress' as const },
    { title: "Train Users", description: "User training sessions", status: 'not-started' as const },
    { title: "Go Live", description: "Production launch", status: 'not-started' as const },
  ];

  const curationQueue = [
    {
      title: "Network Operations Manual - v2.3 Review",
      description: "Updated documentation for core network procedures. Requires PM approval before publication.",
      timestamp: new Date(Date.now() - 2 * 60 * 60 * 1000), // 2 hours ago
      status: 'pending' as const,
      author: "Henry Hou",
    },
    {
      title: "Security Compliance Checklist Updated",
      description: "Revised checklist incorporating new DOD requirements.",
      timestamp: new Date(Date.now() - 5 * 60 * 60 * 1000), // 5 hours ago
      status: 'in-progress' as const,
      author: "System",
    },
    {
      title: "Transition Handover Template Approved",
      description: "Standard template for all future transitions.",
      timestamp: new Date(Date.now() - 1 * 24 * 60 * 60 * 1000), // 1 day ago
      status: 'completed' as const,
      author: "Garry Grove",
    },
  ];

  const transitionRoadmap = {
    contracts: [
      { name: "IT Infrastructure Support", progress: 75, status: 'on-track' as const },
      { name: "Network Operations", progress: 45, status: 'at-risk' as const },
      { name: "Cybersecurity Services", progress: 90, status: 'on-track' as const },
    ],
    personnel: [
      { role: "Systems Engineers", count: 5, status: 'ready' as const },
      { role: "Network Admins", count: 3, status: 'training' as const },
      { role: "Security Analysts", count: 2, status: 'onboarding' as const },
    ],
  };

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
          value="12"
          label="Active Transitions"
          gradient="from-purple-500 to-blue-500"
        />
        <MetricCard
          value="8"
          label="Pending Reviews"
          gradient="from-pink-500 to-rose-500"
          trend={{ direction: 'up', percentage: 12 }}
        />
        <MetricCard
          value="156"
          label="Knowledge Articles"
          gradient="from-green-500 to-teal-500"
          trend={{ direction: 'up', percentage: 25 }}
        />
        <MetricCard
          value="94%"
          label="On-Track Rate"
          gradient="from-blue-500 to-cyan-500"
          trend={{ direction: 'stable', percentage: 2 }}
        />
      </div>

      {/* Main Content Grid */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Platform Setup Widget */}
        <RoadmapWidget
          title="Platform Setup"
          icon={<SettingsIcon className="w-5 h-5" />}
          badge="3 of 5"
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
                {transitionRoadmap.contracts.map((contract, idx) => (
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
                ))}
              </div>
            </div>

            {/* Personnel */}
            <div>
              <h4 className="font-semibold text-sm mb-3">Personnel Status</h4>
              <div className="space-y-2">
                {transitionRoadmap.personnel.map((personnel, idx) => (
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
                ))}
              </div>
            </div>
          </div>
        </RoadmapWidget>
      </div>
    </div>
  );
}
