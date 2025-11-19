import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { CheckCircle2Icon, ArrowRightIcon, ArrowLeftIcon, FolderIcon, FileTextIcon } from "lucide-react";

export function KnowledgeSetupPage() {
  const navigate = useNavigate();
  const [currentStep, setCurrentStep] = useState(1);
  const [repositoryName, setRepositoryName] = useState('Organization Knowledge Base');
  const [storageLocation, setStorageLocation] = useState('Local Storage');
  const [createdBusinessOpId, setCreatedBusinessOpId] = useState<string | null>(null);
  const totalSteps = 4;

  // Check if business operation was created
  const businessOpId = localStorage.getItem('lastCreatedBusinessOperationId');

  const handleNext = () => {
    if (currentStep < totalSteps) {
      setCurrentStep(currentStep + 1);
    } else {
      // Save knowledge base configuration linked to business operation
      const knowledgeConfig = {
        repositoryName,
        storageLocation,
        businessOperationId: businessOpId,
        categories: [
          'Standard Operating Procedures',
          'Technical Documentation',
          'Training Materials',
          'Contract Documents',
          'Team Communications',
          'Product Requests',
          'Issues'
        ],
        aiFeatures: {
          vectorSearch: true,
          automaticChunking: true,
          ragEnhancedAnswers: false
        },
        completedAt: new Date().toISOString()
      };

      localStorage.setItem('knowledgeSetupConfig', JSON.stringify(knowledgeConfig));
      localStorage.setItem('knowledgeSetupCompleted', 'true');
      localStorage.setItem('knowledgeSetupCompletedAt', new Date().toISOString());
      navigate("/dashboard");
    }
  };

  const handlePrevious = () => {
    if (currentStep > 1) {
      setCurrentStep(currentStep - 1);
    }
  };

  const renderStepContent = () => {
    switch (currentStep) {
      case 1:
        return (
          <div className="space-y-4">
            <h3 className="text-xl font-semibold">Configure Knowledge Repository</h3>
            <p className="text-muted-foreground">
              Set up your knowledge management system and document storage preferences.
            </p>
            <div className="space-y-3 mt-6">
              <div className="p-4 border rounded-lg">
                <Label htmlFor="repositoryName">Repository Name</Label>
                <Input
                  id="repositoryName"
                  value={repositoryName}
                  onChange={(e) => setRepositoryName(e.target.value)}
                  placeholder="Organization Knowledge Base"
                />
              </div>
              <div className="p-4 border rounded-lg">
                <Label htmlFor="storageLocation">Storage Location</Label>
                <select
                  id="storageLocation"
                  className="w-full px-3 py-2 border rounded-md"
                  value={storageLocation}
                  onChange={(e) => setStorageLocation(e.target.value)}
                >
                  <option>Local Storage</option>
                  <option>Cloud Storage (S3)</option>
                  <option>SharePoint</option>
                </select>
              </div>
              {businessOpId && (
                <div className="p-4 bg-blue-50 border border-blue-200 rounded-lg">
                  <p className="text-sm text-blue-700">
                    <strong>Linked to Business Operation:</strong> This knowledge base will be automatically linked to your business operation.
                  </p>
                </div>
              )}
            </div>
          </div>
        );
      case 2:
        return (
          <div className="space-y-4">
            <h3 className="text-xl font-semibold">Define Document Categories</h3>
            <p className="text-muted-foreground">
              Create categories to organize your knowledge documents effectively.
            </p>
            <div className="space-y-3 mt-6">
              <div className="p-4 border rounded-lg flex items-center gap-3">
                <FolderIcon className="w-5 h-5 text-blue-500" />
                <div className="flex-1">
                  <span className="font-medium">Standard Operating Procedures</span>
                  <p className="text-sm text-muted-foreground">SOPs and process documentation</p>
                </div>
                <input type="checkbox" className="w-4 h-4" defaultChecked />
              </div>
              <div className="p-4 border rounded-lg flex items-center gap-3">
                <FolderIcon className="w-5 h-5 text-green-500" />
                <div className="flex-1">
                  <span className="font-medium">Technical Documentation</span>
                  <p className="text-sm text-muted-foreground">System architecture and technical guides</p>
                </div>
                <input type="checkbox" className="w-4 h-4" defaultChecked />
              </div>
              <div className="p-4 border rounded-lg flex items-center gap-3">
                <FolderIcon className="w-5 h-5 text-purple-500" />
                <div className="flex-1">
                  <span className="font-medium">Training Materials</span>
                  <p className="text-sm text-muted-foreground">Onboarding and learning resources</p>
                </div>
                <input type="checkbox" className="w-4 h-4" defaultChecked />
              </div>
              <div className="p-4 border rounded-lg flex items-center gap-3">
                <FolderIcon className="w-5 h-5 text-orange-500" />
                <div className="flex-1">
                  <span className="font-medium">Contract Documents</span>
                  <p className="text-sm text-muted-foreground">Contracts, agreements, and legal docs</p>
                </div>
                <input type="checkbox" className="w-4 h-4" defaultChecked />
              </div>
              <div className="p-4 border rounded-lg flex items-center gap-3">
                <FolderIcon className="w-5 h-5 text-cyan-500" />
                <div className="flex-1">
                  <span className="font-medium">Team Communications</span>
                  <p className="text-sm text-muted-foreground">Team messages, announcements, and collaboration</p>
                </div>
                <input type="checkbox" className="w-4 h-4" defaultChecked />
              </div>
              <div className="p-4 border rounded-lg flex items-center gap-3">
                <FolderIcon className="w-5 h-5 text-indigo-500" />
                <div className="flex-1">
                  <span className="font-medium">Product Requests</span>
                  <p className="text-sm text-muted-foreground">Feature requests and product enhancements</p>
                </div>
                <input type="checkbox" className="w-4 h-4" defaultChecked />
              </div>
              <div className="p-4 border rounded-lg flex items-center gap-3">
                <FolderIcon className="w-5 h-5 text-red-500" />
                <div className="flex-1">
                  <span className="font-medium">Issues</span>
                  <p className="text-sm text-muted-foreground">Bug reports, problems, and resolution tracking</p>
                </div>
                <input type="checkbox" className="w-4 h-4" defaultChecked />
              </div>
            </div>
          </div>
        );
      case 3:
        return (
          <div className="space-y-4">
            <h3 className="text-xl font-semibold">AI & Search Configuration</h3>
            <p className="text-muted-foreground">
              Configure AI-powered search and document processing features.
            </p>
            <div className="space-y-3 mt-6">
              <div className="p-4 border rounded-lg">
                <label className="flex items-center gap-2 mb-3">
                  <input type="checkbox" className="w-4 h-4" defaultChecked />
                  <span className="font-medium">Enable Vector Search</span>
                </label>
                <p className="text-sm text-muted-foreground ml-6">
                  Use AI embeddings for semantic search across documents
                </p>
              </div>
              <div className="p-4 border rounded-lg">
                <label className="flex items-center gap-2 mb-3">
                  <input type="checkbox" className="w-4 h-4" defaultChecked />
                  <span className="font-medium">Automatic Chunking</span>
                </label>
                <p className="text-sm text-muted-foreground ml-6">
                  Automatically split documents into searchable chunks
                </p>
              </div>
              <div className="p-4 border rounded-lg">
                <label className="flex items-center gap-2 mb-3">
                  <input type="checkbox" className="w-4 h-4" />
                  <span className="font-medium">RAG-Enhanced Answers</span>
                </label>
                <p className="text-sm text-muted-foreground ml-6">
                  Provide AI-generated answers using retrieved document context
                </p>
              </div>
            </div>
          </div>
        );
      case 4:
        return (
          <div className="space-y-4">
            <div className="flex items-center gap-3 mb-4">
              <CheckCircle2Icon className="w-8 h-8 text-green-500" />
              <h3 className="text-xl font-semibold">Review & Confirm</h3>
            </div>
            <p className="text-muted-foreground">
              Review your knowledge management configuration and confirm to complete setup.
            </p>
            <div className="mt-6 p-6 bg-gray-50 rounded-lg space-y-3">
              <div className="flex justify-between">
                <span className="font-medium">Repository:</span>
                <span className="text-muted-foreground">Configured</span>
              </div>
              <div className="flex justify-between">
                <span className="font-medium">Document Categories:</span>
                <span className="text-muted-foreground">7 Categories Enabled</span>
              </div>
              {businessOpId && (
                <div className="flex justify-between">
                  <span className="font-medium">Linked Business Operation:</span>
                  <span className="text-muted-foreground">Connected</span>
                </div>
              )}
              <div className="flex justify-between">
                <span className="font-medium">AI Features:</span>
                <span className="text-muted-foreground">Vector Search Active</span>
              </div>
            </div>
            <div className="mt-6 p-4 bg-blue-50 border border-blue-200 rounded-lg">
              <div className="flex gap-3">
                <FileTextIcon className="w-5 h-5 text-blue-600 flex-shrink-0 mt-0.5" />
                <div>
                  <p className="font-medium text-blue-900">Next Steps</p>
                  <p className="text-sm text-blue-700 mt-1">
                    After completing setup, visit the Knowledge Management page to upload your first documents.
                  </p>
                </div>
              </div>
            </div>
          </div>
        );
      default:
        return null;
    }
  };

  return (
    <div className="max-w-4xl mx-auto p-8">
      {/* Header */}
      <div className="mb-8">
        <h1 className="text-3xl font-bold mb-2">Knowledge Management Setup</h1>
        <p className="text-muted-foreground">
          Configure your knowledge repository and AI-powered search capabilities.
        </p>
      </div>

      {/* Progress Bar */}
      <div className="mb-8">
        <div className="flex justify-between mb-2">
          <span className="text-sm font-medium">Step {currentStep} of {totalSteps}</span>
          <span className="text-sm text-muted-foreground">{Math.round((currentStep / totalSteps) * 100)}% Complete</span>
        </div>
        <div className="h-2 bg-gray-200 rounded-full overflow-hidden">
          <div
            className="h-full bg-gradient-to-r from-green-500 to-teal-500 transition-all duration-300"
            style={{ width: `${(currentStep / totalSteps) * 100}%` }}
          />
        </div>
      </div>

      {/* Step Content */}
      <div className="bg-white p-8 rounded-lg shadow-sm border mb-8">
        {renderStepContent()}
      </div>

      {/* Navigation Buttons */}
      <div className="flex justify-between">
        <Button
          variant="outline"
          onClick={handlePrevious}
          disabled={currentStep === 1}
        >
          <ArrowLeftIcon className="w-4 h-4 mr-2" />
          Previous
        </Button>
        <Button
          onClick={handleNext}
          className="bg-gradient-to-r from-green-600 to-teal-600 hover:from-green-700 hover:to-teal-700"
        >
          {currentStep === totalSteps ? "Complete Setup" : "Next"}
          {currentStep < totalSteps && <ArrowRightIcon className="w-4 h-4 ml-2" />}
        </Button>
      </div>
    </div>
  );
}
