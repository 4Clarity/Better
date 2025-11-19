import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { CheckCircle2Icon, ArrowRightIcon, ArrowLeftIcon, PlusIcon, XIcon } from "lucide-react";
import { businessOperationApi } from "@/services/api";
import { createProductProgram } from "@/services/productProgramApi";
import { SecurityClassification } from "@/types/productProgram";

interface ProductProgramData {
  name: string;
  description: string;
  objectives: string;
  deliverables: string;
  dependencies: string;
  securityClassification: SecurityClassification;
}

export function BusinessOperationsSetupPage() {
  const navigate = useNavigate();
  const [currentStep, setCurrentStep] = useState(1);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [createdBusinessOpId, setCreatedBusinessOpId] = useState<string | null>(null);
  const totalSteps = 6;

  // Business Operation form data
  const [formData, setFormData] = useState({
    name: '',
    businessFunction: '',
    technicalDomain: '',
    description: '',
    scope: '',
    objectives: '',
    supportPeriodStart: '',
    supportPeriodEnd: '',
    currentContractEnd: '',
    governmentPMId: 'user-dan-001',
    directorId: 'user-dan-001',
    currentManagerId: '',
  });

  const [metricsText, setMetricsText] = useState({
    operational: '',
    quality: '',
    compliance: '',
  });

  // Products/Programs data
  const [productPrograms, setProductPrograms] = useState<ProductProgramData[]>([]);

  const handleNext = async () => {
    // If on step 4 (review business operation), create the business operation
    if (currentStep === 4) {
      await handleCreateBusinessOperation();
    }
    // If on step 6 (final review), complete and save to localStorage
    else if (currentStep === totalSteps) {
      await handleComplete();
    } else {
      setCurrentStep(currentStep + 1);
    }
  };

  const handleCreateBusinessOperation = async () => {
    try {
      setLoading(true);
      setError(null);

      const performanceMetrics = {
        operational: metricsText.operational.split(',').map(s => s.trim()).filter(s => s),
        quality: metricsText.quality.split(',').map(s => s.trim()).filter(s => s),
        compliance: metricsText.compliance.split(',').map(s => s.trim()).filter(s => s),
      };

      const requestData: any = {
        ...formData,
        performanceMetrics,
        supportPeriodStart: formData.supportPeriodStart.split('T')[0],
        supportPeriodEnd: formData.supportPeriodEnd.split('T')[0],
        currentContractEnd: formData.currentContractEnd.split('T')[0],
      };

      if (formData.currentManagerId && formData.currentManagerId.trim()) {
        requestData.currentManagerId = formData.currentManagerId.trim();
      }

      const businessOperation = await businessOperationApi.create(requestData);
      setCreatedBusinessOpId(businessOperation.id);
      // Save to localStorage so Knowledge wizard can link to it
      localStorage.setItem('lastCreatedBusinessOperationId', businessOperation.id);
      setCurrentStep(currentStep + 1);
    } catch (err) {
      console.error('Failed to create business operation:', err);
      setError(err instanceof Error ? err.message : 'Failed to create business operation');
    } finally {
      setLoading(false);
    }
  };

  const handleComplete = async () => {
    try {
      setLoading(true);
      setError(null);

      // Create all products/programs if any were added
      for (const pp of productPrograms) {
        await createProductProgram({
          ...pp,
          businessOperationId: createdBusinessOpId || undefined,
        });
      }

      // Mark wizard as completed in localStorage
      localStorage.setItem('businessOperationsSetupCompleted', 'true');
      localStorage.setItem('businessOperationsSetupCompletedAt', new Date().toISOString());

      // Navigate back to dashboard
      navigate("/dashboard");
    } catch (err) {
      console.error('Failed to complete setup:', err);
      setError(err instanceof Error ? err.message : 'Failed to complete setup');
    } finally {
      setLoading(false);
    }
  };

  const handlePrevious = () => {
    if (currentStep > 1) {
      setCurrentStep(currentStep - 1);
    }
  };

  const addProductProgram = () => {
    setProductPrograms([
      ...productPrograms,
      {
        name: '',
        description: '',
        objectives: '',
        deliverables: '',
        dependencies: '',
        securityClassification: SecurityClassification.UNCLASSIFIED,
      },
    ]);
  };

  const removeProductProgram = (index: number) => {
    setProductPrograms(productPrograms.filter((_, i) => i !== index));
  };

  const updateProductProgram = (index: number, field: keyof ProductProgramData, value: string) => {
    const updated = [...productPrograms];
    updated[index] = { ...updated[index], [field]: value };
    setProductPrograms(updated);
  };

  const renderStepContent = () => {
    switch (currentStep) {
      case 1:
        return (
          <div className="space-y-4">
            <h3 className="text-xl font-semibold">Basic Information</h3>
            <p className="text-muted-foreground">
              Enter the core details about the business operation.
            </p>
            <div className="space-y-3 mt-6">
              <div>
                <Label htmlFor="name">Operation Name *</Label>
                <Input
                  id="name"
                  value={formData.name}
                  onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                  placeholder="e.g., Customer Support Operations"
                  required
                />
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <Label htmlFor="businessFunction">Business Function *</Label>
                  <Input
                    id="businessFunction"
                    value={formData.businessFunction}
                    onChange={(e) => setFormData({ ...formData, businessFunction: e.target.value })}
                    placeholder="e.g., Customer Operations"
                    required
                  />
                </div>
                <div>
                  <Label htmlFor="technicalDomain">Technical Domain *</Label>
                  <Input
                    id="technicalDomain"
                    value={formData.technicalDomain}
                    onChange={(e) => setFormData({ ...formData, technicalDomain: e.target.value })}
                    placeholder="e.g., Web Services"
                    required
                  />
                </div>
              </div>
              <div>
                <Label htmlFor="description">Description</Label>
                <Textarea
                  id="description"
                  value={formData.description}
                  onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                  placeholder="Brief description of the business operation..."
                  rows={3}
                />
              </div>
            </div>
          </div>
        );

      case 2:
        return (
          <div className="space-y-4">
            <h3 className="text-xl font-semibold">Scope & Objectives</h3>
            <p className="text-muted-foreground">
              Define the scope and objectives of this operation.
            </p>
            <div className="space-y-3 mt-6">
              <div>
                <Label htmlFor="scope">Scope *</Label>
                <Textarea
                  id="scope"
                  value={formData.scope}
                  onChange={(e) => setFormData({ ...formData, scope: e.target.value })}
                  placeholder="Functional and technical boundaries of this operation..."
                  rows={4}
                  required
                />
              </div>
              <div>
                <Label htmlFor="objectives">Objectives *</Label>
                <Textarea
                  id="objectives"
                  value={formData.objectives}
                  onChange={(e) => setFormData({ ...formData, objectives: e.target.value })}
                  placeholder="Key objectives for this operation..."
                  rows={4}
                  required
                />
              </div>
            </div>
          </div>
        );

      case 3:
        return (
          <div className="space-y-4">
            <h3 className="text-xl font-semibold">Performance Metrics & Timeline</h3>
            <p className="text-muted-foreground">
              Set performance metrics and important dates.
            </p>
            <div className="space-y-3 mt-6">
              <div>
                <Label htmlFor="operational-metrics">Operational Metrics (comma-separated)</Label>
                <Input
                  id="operational-metrics"
                  value={metricsText.operational}
                  onChange={(e) => setMetricsText({ ...metricsText, operational: e.target.value })}
                  placeholder="e.g., Response time, Throughput, Availability"
                />
              </div>
              <div>
                <Label htmlFor="quality-metrics">Quality Metrics (comma-separated)</Label>
                <Input
                  id="quality-metrics"
                  value={metricsText.quality}
                  onChange={(e) => setMetricsText({ ...metricsText, quality: e.target.value })}
                  placeholder="e.g., Customer satisfaction, Error rate"
                />
              </div>
              <div>
                <Label htmlFor="compliance-metrics">Compliance Metrics (comma-separated)</Label>
                <Input
                  id="compliance-metrics"
                  value={metricsText.compliance}
                  onChange={(e) => setMetricsText({ ...metricsText, compliance: e.target.value })}
                  placeholder="e.g., SLA compliance, Security compliance"
                />
              </div>
              <div className="grid grid-cols-3 gap-4">
                <div>
                  <Label htmlFor="supportPeriodStart">Support Period Start *</Label>
                  <Input
                    id="supportPeriodStart"
                    type="date"
                    value={formData.supportPeriodStart}
                    onChange={(e) => setFormData({ ...formData, supportPeriodStart: e.target.value })}
                    required
                  />
                </div>
                <div>
                  <Label htmlFor="supportPeriodEnd">Support Period End *</Label>
                  <Input
                    id="supportPeriodEnd"
                    type="date"
                    value={formData.supportPeriodEnd}
                    onChange={(e) => setFormData({ ...formData, supportPeriodEnd: e.target.value })}
                    required
                  />
                </div>
                <div>
                  <Label htmlFor="currentContractEnd">Current Contract End *</Label>
                  <Input
                    id="currentContractEnd"
                    type="date"
                    value={formData.currentContractEnd}
                    onChange={(e) => setFormData({ ...formData, currentContractEnd: e.target.value })}
                    required
                  />
                </div>
              </div>
            </div>
          </div>
        );

      case 4:
        return (
          <div className="space-y-4">
            <h3 className="text-xl font-semibold">Review Business Operation</h3>
            <p className="text-muted-foreground">
              Review your business operation details before creating.
            </p>
            <div className="mt-6 p-6 bg-gray-50 rounded-lg space-y-3">
              <div className="flex justify-between">
                <span className="font-medium">Name:</span>
                <span className="text-muted-foreground">{formData.name || 'Not set'}</span>
              </div>
              <div className="flex justify-between">
                <span className="font-medium">Business Function:</span>
                <span className="text-muted-foreground">{formData.businessFunction || 'Not set'}</span>
              </div>
              <div className="flex justify-between">
                <span className="font-medium">Technical Domain:</span>
                <span className="text-muted-foreground">{formData.technicalDomain || 'Not set'}</span>
              </div>
              <div className="flex justify-between">
                <span className="font-medium">Scope:</span>
                <span className="text-muted-foreground">{formData.scope ? 'Defined' : 'Not set'}</span>
              </div>
              <div className="flex justify-between">
                <span className="font-medium">Objectives:</span>
                <span className="text-muted-foreground">{formData.objectives ? 'Defined' : 'Not set'}</span>
              </div>
            </div>
          </div>
        );

      case 5:
        return (
          <div className="space-y-4">
            <h3 className="text-xl font-semibold">Products & Programs</h3>
            <p className="text-muted-foreground">
              Add products or programs associated with this business operation (optional).
            </p>
            <div className="mt-6 space-y-4">
              {productPrograms.map((pp, index) => (
                <div key={index} className="p-4 border rounded-lg space-y-3">
                  <div className="flex justify-between items-start">
                    <h4 className="font-medium">Product/Program #{index + 1}</h4>
                    <Button
                      type="button"
                      variant="ghost"
                      size="sm"
                      onClick={() => removeProductProgram(index)}
                    >
                      <XIcon className="w-4 h-4" />
                    </Button>
                  </div>
                  <div>
                    <Label>Name *</Label>
                    <Input
                      value={pp.name}
                      onChange={(e) => updateProductProgram(index, 'name', e.target.value)}
                      placeholder="Product/Program name"
                    />
                  </div>
                  <div>
                    <Label>Description *</Label>
                    <Textarea
                      value={pp.description}
                      onChange={(e) => updateProductProgram(index, 'description', e.target.value)}
                      placeholder="Description"
                      rows={2}
                    />
                  </div>
                  <div>
                    <Label>Objectives *</Label>
                    <Textarea
                      value={pp.objectives}
                      onChange={(e) => updateProductProgram(index, 'objectives', e.target.value)}
                      placeholder="Objectives"
                      rows={2}
                    />
                  </div>
                  <div>
                    <Label>Deliverables *</Label>
                    <Textarea
                      value={pp.deliverables}
                      onChange={(e) => updateProductProgram(index, 'deliverables', e.target.value)}
                      placeholder="Deliverables"
                      rows={2}
                    />
                  </div>
                  <div>
                    <Label>Security Classification</Label>
                    <select
                      className="w-full px-3 py-2 border rounded-md"
                      value={pp.securityClassification}
                      onChange={(e) => updateProductProgram(index, 'securityClassification', e.target.value)}
                    >
                      <option value={SecurityClassification.UNCLASSIFIED}>Unclassified</option>
                      <option value={SecurityClassification.CUI}>CUI</option>
                      <option value={SecurityClassification.SECRET}>Secret</option>
                      <option value={SecurityClassification.TOP_SECRET}>Top Secret</option>
                    </select>
                  </div>
                </div>
              ))}
              <Button
                type="button"
                variant="outline"
                onClick={addProductProgram}
                className="w-full"
              >
                <PlusIcon className="w-4 h-4 mr-2" />
                Add Product/Program
              </Button>
            </div>
          </div>
        );

      case 6:
        return (
          <div className="space-y-4">
            <div className="flex items-center gap-3 mb-4">
              <CheckCircle2Icon className="w-8 h-8 text-green-500" />
              <h3 className="text-xl font-semibold">Review & Complete</h3>
            </div>
            <p className="text-muted-foreground">
              Review your setup and complete the business operations configuration.
            </p>
            <div className="mt-6 p-6 bg-gray-50 rounded-lg space-y-3">
              <div className="flex justify-between">
                <span className="font-medium">Business Operation:</span>
                <span className="text-muted-foreground">{createdBusinessOpId ? 'Created' : 'Pending'}</span>
              </div>
              <div className="flex justify-between">
                <span className="font-medium">Products/Programs:</span>
                <span className="text-muted-foreground">{productPrograms.length} Configured</span>
              </div>
            </div>
            {createdBusinessOpId && (
              <div className="mt-6 p-4 bg-blue-50 border border-blue-200 rounded-lg">
                <p className="text-sm text-blue-700">
                  Your business operation has been created successfully. Click "Complete Setup" to finish and return to the dashboard.
                </p>
              </div>
            )}
          </div>
        );

      default:
        return null;
    }
  };

  const isStepValid = () => {
    switch (currentStep) {
      case 1:
        return formData.name && formData.businessFunction && formData.technicalDomain;
      case 2:
        return formData.scope && formData.objectives;
      case 3:
        return formData.supportPeriodStart && formData.supportPeriodEnd && formData.currentContractEnd;
      case 4:
      case 5:
      case 6:
        return true;
      default:
        return false;
    }
  };

  return (
    <div className="max-w-4xl mx-auto p-8">
      {/* Header */}
      <div className="mb-8">
        <h1 className="text-3xl font-bold mb-2">Business Operations Setup</h1>
        <p className="text-muted-foreground">
          Create your first business operation and configure related products/programs.
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
            className="h-full bg-gradient-to-r from-purple-500 to-blue-500 transition-all duration-300"
            style={{ width: `${(currentStep / totalSteps) * 100}%` }}
          />
        </div>
      </div>

      {/* Step Content */}
      <div className="bg-white p-8 rounded-lg shadow-sm border mb-8">
        {renderStepContent()}
        {error && (
          <div className="mt-4 bg-red-100 border border-red-400 text-red-700 px-4 py-3 rounded">
            Error: {error}
          </div>
        )}
      </div>

      {/* Navigation Buttons */}
      <div className="flex justify-between">
        <Button
          variant="outline"
          onClick={handlePrevious}
          disabled={currentStep === 1 || loading}
        >
          <ArrowLeftIcon className="w-4 h-4 mr-2" />
          Previous
        </Button>
        <Button
          onClick={handleNext}
          disabled={!isStepValid() || loading}
          className="bg-gradient-to-r from-purple-600 to-blue-600 hover:from-purple-700 hover:to-blue-700"
        >
          {loading ? 'Processing...' : currentStep === totalSteps ? "Complete Setup" : "Next"}
          {currentStep < totalSteps && !loading && <ArrowRightIcon className="w-4 h-4 ml-2" />}
        </Button>
      </div>
    </div>
  );
}
