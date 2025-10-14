import { RoadmapWidget } from "../widgets/RoadmapWidget";
import { MetricCard } from "../widgets/MetricCard";
import { ProcessFlow } from "../widgets/ProcessFlowStep";
import { Timeline } from "../widgets/TimelineItem";
import {
  ClipboardCheckIcon,
  FileTextIcon,
  UploadIcon,
  CheckCircle2Icon,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import { Progress } from "@/components/ui/progress";

export function OutgoingContractorDashboard() {
  // Placeholder data
  const taskTransitionTimeline = [
    { title: "Network Infrastructure", description: "Complete documentation", status: 'complete' as const },
    { title: "Security Procedures", description: "Knowledge transfer sessions", status: 'in-progress' as const },
    { title: "Incident Response", description: "Handover protocols", status: 'in-progress' as const },
    { title: "System Monitoring", description: "Tool training", status: 'not-started' as const },
    { title: "Final Verification", description: "PM sign-off", status: 'not-started' as const },
  ];

  const recentActivities = [
    {
      title: "Uploaded Network Topology Diagrams",
      description: "Complete set of network diagrams with annotations for all production systems.",
      timestamp: new Date(Date.now() - 30 * 60 * 1000), // 30 mins ago
      status: 'completed' as const,
      author: "Henry Hou",
    },
    {
      title: "Knowledge Transfer Session - Security Protocols",
      description: "Completed 2-hour training session with incoming team on security procedures.",
      timestamp: new Date(Date.now() - 3 * 60 * 60 * 1000), // 3 hours ago
      status: 'completed' as const,
      author: "Henry Hou",
    },
    {
      title: "Documentation Review Meeting",
      description: "Reviewed documentation completeness with PM and identified 3 gaps.",
      timestamp: new Date(Date.now() - 1 * 24 * 60 * 60 * 1000), // 1 day ago
      status: 'completed' as const,
      author: "System",
    },
  ];

  const verificationChecklist = [
    { id: 1, label: "All documentation uploaded to knowledge base", completed: true, required: true },
    { id: 2, label: "Knowledge transfer sessions completed", completed: true, required: true },
    { id: 3, label: "System access credentials documented", completed: true, required: true },
    { id: 4, label: "Incident response procedures reviewed", completed: false, required: true },
    { id: 5, label: "Tool training sessions conducted", completed: false, required: true },
    { id: 6, label: "Outstanding issues documented", completed: false, required: false },
    { id: 7, label: "Final handover meeting scheduled", completed: false, required: true },
  ];

  const completedItems = verificationChecklist.filter(item => item.completed).length;
  const totalItems = verificationChecklist.length;
  const progressPercentage = Math.round((completedItems / totalItems) * 100);

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
          value="28"
          label="Documents Uploaded"
          gradient="from-pink-500 to-rose-500"
          trend={{ direction: 'up', percentage: 15 }}
        />
        <MetricCard
          value="6"
          label="Training Sessions"
          gradient="from-orange-500 to-amber-500"
        />
        <MetricCard
          value={`${progressPercentage}%`}
          label="Handover Complete"
          gradient="from-green-500 to-teal-500"
        />
        <MetricCard
          value="12"
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
