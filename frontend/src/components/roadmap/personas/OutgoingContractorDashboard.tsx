import { useState, useEffect } from "react";
import { RoadmapWidget } from "../widgets/RoadmapWidget";
import { MetricCard } from "../widgets/MetricCard";
import { ProcessFlow } from "../widgets/ProcessFlowStep";
import { Timeline } from "../widgets/TimelineItem";
import {
  ClipboardCheckIcon,
  FileTextIcon,
  UploadIcon,
  CheckCircle2Icon,
  LoaderIcon,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import { Progress } from "@/components/ui/progress";
import { dashboardApi, OutgoingContractorDashboard as OutgoingContractorDashboardData } from "@/services/dashboardApi";

export function OutgoingContractorDashboard() {
  const [dashboardData, setDashboardData] = useState<OutgoingContractorDashboardData | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    async function fetchDashboardData() {
      try {
        setLoading(true);
        const data = await dashboardApi.getOutgoingContractorDashboard();
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
        <LoaderIcon className="w-8 h-8 animate-spin text-pink-600" />
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

  // Transform API data to component format
  const taskTransitionTimeline = dashboardData.handoverTimeline.map(item => ({
    title: item.title,
    description: '',
    status: item.status
  }));

  const recentActivities = dashboardData.activityLog.map(item => ({
    title: item.title,
    description: item.description,
    timestamp: new Date(item.timestamp),
    status: item.status as 'completed' | 'pending' | 'in-progress',
    author: '',
  }));

  const verificationChecklist = dashboardData.verificationChecklist.map((item, idx) => ({
    id: idx + 1,
    label: item.text,
    completed: item.completed,
    required: true,
  }));

  const completedItems = verificationChecklist.filter(item => item.completed).length;
  const totalItems = verificationChecklist.length;
  const progressPercentage = dashboardData.metrics.handoverComplete;

  return (
    <div className="space-y-6">
      {/* Header Section */}
      <div className="flex justify-between items-center">
        <div>
          <h1 className="text-3xl font-bold mb-2">Outgoing Contractor</h1>
          <p className="text-muted-foreground">
            Task transition, work documentation, and knowledge handover
          </p>
        </div>
        <Button className="bg-gradient-to-r from-pink-600 to-rose-600 hover:from-pink-700 hover:to-rose-700">
          <UploadIcon className="w-4 h-4 mr-2" />
          Upload Documentation
        </Button>
      </div>

      {/* Metrics Row */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <MetricCard
          value={dashboardData.metrics.documentsUploaded.toString()}
          label="Documents Uploaded"
          gradient="from-pink-500 to-rose-500"
        />
        <MetricCard
          value={dashboardData.metrics.trainingSessions.toString()}
          label="Training Sessions"
          gradient="from-orange-500 to-amber-500"
        />
        <MetricCard
          value={`${progressPercentage}%`}
          label="Handover Complete"
          gradient="from-green-500 to-teal-500"
        />
        <MetricCard
          value={dashboardData.metrics.daysRemaining.toString()}
          label="Days Remaining"
          gradient="from-blue-500 to-cyan-500"
        />
      </div>

      {/* Main Content Grid */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Current Task Transition */}
        <RoadmapWidget
          title="Current Task Transition"
          icon={<ClipboardCheckIcon className="w-5 h-5" />}
          badge="2 of 5"
        >
          <ProcessFlow steps={taskTransitionTimeline} orientation="vertical" />
        </RoadmapWidget>

        {/* Work Activity Summarization */}
        <RoadmapWidget
          title="Work Activity Summarization"
          icon={<FileTextIcon className="w-5 h-5" />}
          badge={recentActivities.length}
        >
          <Timeline items={recentActivities} />
          <Button variant="outline" className="w-full mt-4">
            View Complete Activity Log
          </Button>
        </RoadmapWidget>

        {/* Verification Checklist - Full Width */}
        <div className="lg:col-span-2">
          <RoadmapWidget
            title="Verification Checklist"
            icon={<CheckCircle2Icon className="w-5 h-5" />}
            variant="highlighted"
          >
            <div className="space-y-4">
              {/* Progress Bar */}
              <div className="space-y-2">
                <div className="flex justify-between text-sm font-medium">
                  <span>Handover Progress</span>
                  <span>{completedItems} of {totalItems} completed ({progressPercentage}%)</span>
                </div>
                <Progress value={progressPercentage} className="h-3" />
              </div>

              {/* Checklist Items */}
              <div className="space-y-3">
                {verificationChecklist.map((item) => (
                  <div key={item.id} className="flex items-start gap-3 p-3 rounded-lg hover:bg-white/50 transition-colors">
                    <Checkbox
                      id={`item-${item.id}`}
                      checked={item.completed}
                      className="mt-0.5"
                    />
                    <label
                      htmlFor={`item-${item.id}`}
                      className="flex-1 text-sm cursor-pointer"
                    >
                      <div className="flex items-center gap-2">
                        <span className={item.completed ? 'line-through text-muted-foreground' : ''}>
                          {item.label}
                        </span>
                        {item.required && (
                          <span className="text-xs bg-red-100 text-red-800 px-2 py-0.5 rounded">
                            Required
                          </span>
                        )}
                      </div>
                    </label>
                  </div>
                ))}
              </div>

              {/* Action Buttons */}
              <div className="flex gap-3 pt-4 border-t">
                <Button variant="outline" className="flex-1">
                  Save Progress
                </Button>
                <Button
                  className="flex-1 bg-gradient-to-r from-green-600 to-teal-600 hover:from-green-700 hover:to-teal-700"
                  disabled={completedItems < verificationChecklist.filter(i => i.required).length}
                >
                  Submit for Review
                </Button>
              </div>
            </div>
          </RoadmapWidget>
        </div>
      </div>
    </div>
  );
}
