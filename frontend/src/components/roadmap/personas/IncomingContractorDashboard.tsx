import { useState, useEffect } from "react";
import { RoadmapWidget } from "../widgets/RoadmapWidget";
import { MetricCard } from "../widgets/MetricCard";
import { ProcessFlow } from "../widgets/ProcessFlowStep";
import {
  GraduationCapIcon,
  TargetIcon,
  MessageCircleIcon,
  BookOpenIcon,
  SendIcon,
  LoaderIcon,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Progress } from "@/components/ui/progress";
import { Input } from "@/components/ui/input";
import { ScrollArea } from "@/components/ui/scroll-area";
import { dashboardApi, IncomingContractorDashboard as IncomingContractorDashboardData } from "@/services/dashboardApi";

interface ChatMessage {
  role: 'user' | 'assistant';
  content: string;
  timestamp: Date;
}

export function IncomingContractorDashboard() {
  const [dashboardData, setDashboardData] = useState<IncomingContractorDashboardData | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [chatMessages, setChatMessages] = useState<ChatMessage[]>([
    {
      role: 'assistant',
      content: "Hello! I'm your AI Knowledge Assistant. I can help you understand network operations, security procedures, and system architecture. What would you like to learn about?",
      timestamp: new Date(Date.now() - 10 * 60 * 1000),
    },
  ]);
  const [inputMessage, setInputMessage] = useState("");

  useEffect(() => {
    async function fetchDashboardData() {
      try {
        setLoading(true);
        const data = await dashboardApi.getIncomingContractorDashboard();
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
        <LoaderIcon className="w-8 h-8 animate-spin text-blue-600" />
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
  const learningRoadmap = dashboardData.learningRoadmap.map(module => ({
    title: module.module,
    description: '',
    status: module.status
  }));

  const elementsToMaster = dashboardData.skillsToMaster.map((skill, idx) => ({
    id: idx + 1,
    label: skill.skill,
    progress: skill.progress,
    category: "Core"
  }));

  const learningResources = dashboardData.learningResources.map(resource => ({
    title: resource.title,
    description: '',
    type: resource.type === 'video' ? 'Video' : 'Document',
    updated: 'Recently',
  }));

  const handleSendMessage = () => {
    if (!inputMessage.trim()) return;

    // Add user message
    const userMessage: ChatMessage = {
      role: 'user',
      content: inputMessage,
      timestamp: new Date(),
    };
    setChatMessages(prev => [...prev, userMessage]);

    // Simulate AI response
    setTimeout(() => {
      const aiMessage: ChatMessage = {
        role: 'assistant',
        content: "I understand you're asking about that topic. In a production system, I would query the knowledge base to provide you with accurate, contextual information. For now, this is a placeholder response demonstrating the interface.",
        timestamp: new Date(),
      };
      setChatMessages(prev => [...prev, aiMessage]);
    }, 1000);

    setInputMessage("");
  };

  const totalProgress = Math.round(
    elementsToMaster.reduce((sum, item) => sum + item.progress, 0) / elementsToMaster.length
  );

  return (
    <div className="space-y-6">
      {/* Header Section */}
      <div className="flex justify-between items-center">
        <div>
          <h1 className="text-3xl font-bold mb-2">Incoming Contractor</h1>
          <p className="text-muted-foreground">
            Personalized learning path and AI-assisted knowledge acquisition
          </p>
        </div>
      </div>

      {/* Metrics Row */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <MetricCard
          value={`${dashboardData.metrics.overallProgress}%`}
          label="Overall Progress"
          gradient="from-blue-500 to-cyan-500"
        />
        <MetricCard
          value={dashboardData.metrics.modulesCompleted.toString()}
          label="Modules Completed"
          gradient="from-green-500 to-teal-500"
        />
        <MetricCard
          value={dashboardData.metrics.hoursLogged.toString()}
          label="Hours Logged"
          gradient="from-purple-500 to-pink-500"
        />
        <MetricCard
          value={`${dashboardData.metrics.quizAverage}%`}
          label="Quiz Average"
          gradient="from-orange-500 to-amber-500"
        />
      </div>

      {/* Main Content Grid */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* My Learning Roadmap */}
        <div className="lg:col-span-2">
          <RoadmapWidget
            title="My Learning Roadmap"
            icon={<GraduationCapIcon className="w-5 h-5" />}
            badge="2 of 5"
          >
            <ProcessFlow steps={learningRoadmap} orientation="vertical" />
            <Button variant="outline" className="w-full mt-4">
              Continue Learning
            </Button>
          </RoadmapWidget>
        </div>

        {/* Elements to Master */}
        <RoadmapWidget
          title="Elements to Master"
          icon={<TargetIcon className="w-5 h-5" />}
          badge={`${totalProgress}%`}
        >
          <div className="space-y-4">
            {elementsToMaster.map((element) => (
              <div key={element.id} className="space-y-2">
                <div className="flex justify-between items-start text-sm">
                  <span className="flex-1">{element.label}</span>
                  <span className="font-semibold ml-2">{element.progress}%</span>
                </div>
                <div className="flex items-center gap-2">
                  <Progress value={element.progress} className="h-2 flex-1" />
                  <span className="text-xs text-muted-foreground px-2 py-0.5 bg-gray-100 rounded">
                    {element.category}
                  </span>
                </div>
              </div>
            ))}
          </div>
        </RoadmapWidget>

        {/* AI Knowledge Assistant */}
        <div className="lg:col-span-2">
          <RoadmapWidget
            title="AI Knowledge Assistant"
            icon={<MessageCircleIcon className="w-5 h-5" />}
            variant="highlighted"
          >
            <div className="space-y-4">
              {/* Chat Messages */}
              <ScrollArea className="h-64 pr-4">
                <div className="space-y-4">
                  {chatMessages.map((message, idx) => (
                    <div
                      key={idx}
                      className={`flex ${message.role === 'user' ? 'justify-end' : 'justify-start'}`}
                    >
                      <div
                        className={`max-w-[80%] rounded-lg p-3 ${
                          message.role === 'user'
                            ? 'bg-gradient-to-br from-purple-500 to-blue-500 text-white'
                            : 'bg-white border border-gray-200'
                        }`}
                      >
                        <p className="text-sm">{message.content}</p>
                        <p
                          className={`text-xs mt-1 ${
                            message.role === 'user' ? 'text-purple-100' : 'text-muted-foreground'
                          }`}
                        >
                          {message.timestamp.toLocaleTimeString([], {
                            hour: '2-digit',
                            minute: '2-digit',
                          })}
                        </p>
                      </div>
                    </div>
                  ))}
                </div>
              </ScrollArea>

              {/* Input Area */}
              <div className="flex gap-2">
                <Input
                  placeholder="Ask a question about network operations, security, or systems..."
                  value={inputMessage}
                  onChange={(e) => setInputMessage(e.target.value)}
                  onKeyDown={(e) => e.key === 'Enter' && handleSendMessage()}
                  className="flex-1"
                />
                <Button
                  onClick={handleSendMessage}
                  className="bg-gradient-to-r from-purple-600 to-blue-600 hover:from-purple-700 hover:to-blue-700"
                >
                  <SendIcon className="w-4 h-4" />
                </Button>
              </div>
            </div>
          </RoadmapWidget>
        </div>

        {/* Contextual Learning Resources */}
        <RoadmapWidget
          title="Learning Resources"
          icon={<BookOpenIcon className="w-5 h-5" />}
          badge={learningResources.length}
        >
          <div className="space-y-3">
            {learningResources.map((resource, idx) => (
              <div
                key={idx}
                className="p-3 rounded-lg border border-gray-200 hover:border-purple-300 hover:bg-purple-50/50 transition-colors cursor-pointer"
              >
                <div className="flex justify-between items-start mb-1">
                  <h4 className="font-semibold text-sm">{resource.title}</h4>
                  <span className="text-xs bg-purple-100 text-purple-800 px-2 py-0.5 rounded">
                    {resource.type}
                  </span>
                </div>
                <p className="text-xs text-muted-foreground mb-2">{resource.description}</p>
                <p className="text-xs text-muted-foreground">Updated {resource.updated}</p>
              </div>
            ))}
          </div>
          <Button variant="outline" className="w-full mt-4">
            Browse Knowledge Base
          </Button>
        </RoadmapWidget>
      </div>
    </div>
  );
}
