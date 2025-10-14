import { useState } from "react";
import { RoadmapWidget } from "../widgets/RoadmapWidget";
import { MetricCard } from "../widgets/MetricCard";
import { ProcessFlow } from "../widgets/ProcessFlowStep";
import {
  GraduationCapIcon,
  TargetIcon,
  MessageCircleIcon,
  BookOpenIcon,
  SendIcon,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Progress } from "@/components/ui/progress";
import { Input } from "@/components/ui/input";
import { ScrollArea } from "@/components/ui/scroll-area";

interface ChatMessage {
  role: 'user' | 'assistant';
  content: string;
  timestamp: Date;
}

export function IncomingContractorDashboard() {
  const [chatMessages, setChatMessages] = useState<ChatMessage[]>([
    {
      role: 'assistant',
      content: "Hello! I'm your AI Knowledge Assistant. I can help you understand network operations, security procedures, and system architecture. What would you like to learn about?",
      timestamp: new Date(Date.now() - 10 * 60 * 1000),
    },
  ]);
  const [inputMessage, setInputMessage] = useState("");

  // Placeholder data
  const learningRoadmap = [
    { title: "System Overview", description: "Architecture & components", status: 'complete' as const },
    { title: "Network Ops", description: "Core procedures", status: 'complete' as const },
    { title: "Security Protocols", description: "Access & compliance", status: 'in-progress' as const },
    { title: "Incident Response", description: "Handling procedures", status: 'not-started' as const },
    { title: "Advanced Topics", description: "Deep dive sessions", status: 'not-started' as const },
  ];

  const elementsToMaster = [
    { id: 1, label: "Network Infrastructure Fundamentals", progress: 100, category: "Core" },
    { id: 2, label: "VPN Configuration & Management", progress: 100, category: "Core" },
    { id: 3, label: "Firewall Rules & Security Policies", progress: 75, category: "Core" },
    { id: 4, label: "Incident Detection & Response", progress: 45, category: "Security" },
    { id: 5, label: "System Monitoring Tools", progress: 30, category: "Operations" },
    { id: 6, label: "Compliance Documentation", progress: 20, category: "Security" },
    { id: 7, label: "Advanced Troubleshooting", progress: 0, category: "Advanced" },
  ];

  const learningResources = [
    {
      title: "Network Operations Manual",
      description: "Complete guide to network procedures",
      type: "Document",
      updated: "2 days ago",
    },
    {
      title: "Security Compliance Training",
      description: "DOD security requirements overview",
      type: "Video",
      updated: "1 week ago",
    },
    {
      title: "System Architecture Diagrams",
      description: "Visual infrastructure documentation",
      type: "Diagram",
      updated: "3 days ago",
    },
    {
      title: "Incident Response Playbook",
      description: "Step-by-step response procedures",
      type: "Document",
      updated: "5 days ago",
    },
  ];

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
          value={`${totalProgress}%`}
          label="Overall Progress"
          gradient="from-blue-500 to-cyan-500"
          trend={{ direction: 'up', percentage: 18 }}
        />
        <MetricCard
          value="3"
          label="Modules Completed"
          gradient="from-green-500 to-teal-500"
        />
        <MetricCard
          value="15"
          label="Hours Logged"
          gradient="from-purple-500 to-pink-500"
        />
        <MetricCard
          value="92%"
          label="Quiz Average"
          gradient="from-orange-500 to-amber-500"
          trend={{ direction: 'up', percentage: 5 }}
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
