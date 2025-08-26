import { useState, useEffect } from "react";
import { useParams, useNavigate, Link } from "react-router-dom";
import { businessOperationApi, BusinessOperation } from "@/services/api";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { ArrowLeft, Save, X } from "lucide-react";

export function EditBusinessOperationPage() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [operation, setOperation] = useState<BusinessOperation | null>(null);
  
  const [formData, setFormData] = useState({
    name: '',
    businessFunction: '',
    technicalDomain: '',
    description: '',
    scope: '',
    objectives: '',
    performanceMetrics: {
      operational: [] as string[],
      quality: [] as string[],
      compliance: [] as string[],
    },
    supportPeriodStart: '',
    supportPeriodEnd: '',
    currentContractEnd: '',
    governmentPMId: 'default-pm-id',
    directorId: 'default-director-id',
    currentManagerId: '',
  });

  const [metricsText, setMetricsText] = useState({
    operational: '',
    quality: '',
    compliance: '',
  });

  useEffect(() => {
    if (id) {
      fetchOperation();
    }
  }, [id]);

  const fetchOperation = async () => {
    if (!id) return;
    
    try {
      setLoading(true);
      setError(null);
      
      const operationData = await businessOperationApi.getById(id);
      setOperation(operationData);
      
      // Populate form data
      setFormData({
        name: operationData.name || '',
        businessFunction: operationData.businessFunction || '',
        technicalDomain: operationData.technicalDomain || '',
        description: operationData.description || '',
        scope: operationData.scope || '',
        objectives: operationData.objectives || '',
        performanceMetrics: operationData.performanceMetrics || {
          operational: [],
          quality: [],
          compliance: [],
        },
        supportPeriodStart: operationData.supportPeriodStart 
          ? new Date(operationData.supportPeriodStart).toISOString().split('T')[0] 
          : '',
        supportPeriodEnd: operationData.supportPeriodEnd 
          ? new Date(operationData.supportPeriodEnd).toISOString().split('T')[0] 
          : '',
        currentContractEnd: operationData.currentContractEnd 
          ? new Date(operationData.currentContractEnd).toISOString().split('T')[0] 
          : '',
        governmentPMId: operationData.governmentPMId || 'default-pm-id',
        directorId: operationData.directorId || 'default-director-id',
        currentManagerId: operationData.currentManagerId || '',
      });

      // Populate metrics text
      setMetricsText({
        operational: operationData.performanceMetrics?.operational?.join(', ') || '',
        quality: operationData.performanceMetrics?.quality?.join(', ') || '',
        compliance: operationData.performanceMetrics?.compliance?.join(', ') || '',
      });
      
    } catch (err) {
      console.error('Failed to fetch operation details:', err);
      setError(err instanceof Error ? err.message : 'Failed to fetch operation details');
    } finally {
      setLoading(false);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!id) return;
    
    setSaving(true);
    setError(null);

    try {
      // Parse metrics from text input
      const performanceMetrics = {
        operational: metricsText.operational.split(',').map(s => s.trim()).filter(s => s),
        quality: metricsText.quality.split(',').map(s => s.trim()).filter(s => s),
        compliance: metricsText.compliance.split(',').map(s => s.trim()).filter(s => s),
      };

      // Prepare request data
      const requestData: any = {
        ...formData,
        performanceMetrics,
        supportPeriodStart: formData.supportPeriodStart.split('T')[0],
        supportPeriodEnd: formData.supportPeriodEnd.split('T')[0],
        currentContractEnd: formData.currentContractEnd.split('T')[0],
      };

      // Only include currentManagerId if it has a value
      if (formData.currentManagerId && formData.currentManagerId.trim()) {
        requestData.currentManagerId = formData.currentManagerId.trim();
      }
      
      console.log('Updating business operation with data:', requestData);
      await businessOperationApi.update(id, requestData);

      // Navigate back to detail page
      navigate(`/business-operations/${id}`);
    } catch (err) {
      console.error('Failed to update business operation:', err);
      let errorMessage = err instanceof Error ? err.message : 'Failed to update business operation';
      
      if (errorMessage.includes('Internal Server Error') || errorMessage.includes('500')) {
        errorMessage = 'Database error: Please contact your administrator if the problem persists.';
      }
      
      setError(errorMessage);
    } finally {
      setSaving(false);
    }
  };

  const handleCancel = () => {
    navigate(`/business-operations/${id}`);
  };

  if (loading) {
    return (
      <div className="container mx-auto px-4 py-8">
        <div className="flex justify-center items-center h-64">
          <div className="text-lg text-muted-foreground">Loading business operation...</div>
        </div>
      </div>
    );
  }

  if (error && !operation) {
    return (
      <div className="container mx-auto px-4 py-8">
        <div className="flex items-center gap-4 mb-8">
          <Link to="/business-operations">
            <Button variant="outline" size="sm">
              <ArrowLeft className="h-4 w-4 mr-2" />
              Back to Business Operations
            </Button>
          </Link>
        </div>
        <div className="bg-red-100 border border-red-400 text-red-700 px-4 py-3 rounded">
          Error: {error}
        </div>
      </div>
    );
  }

  return (
    <div className="container mx-auto px-4 py-8">
      <div className="flex items-center gap-4 mb-8">
        <Link to={`/business-operations/${id}`}>
          <Button variant="outline" size="sm">
            <ArrowLeft className="h-4 w-4 mr-2" />
            Back to Details
          </Button>
        </Link>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Edit Business Operation</CardTitle>
        </CardHeader>
        <CardContent>
          <form onSubmit={handleSubmit} className="space-y-6">
            {error && (
              <div className="bg-red-100 border border-red-400 text-red-700 px-4 py-3 rounded">
                Error: {error}
              </div>
            )}

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
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
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
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
              
              <div>
                <Label htmlFor="currentManagerId">Current Manager (Optional)</Label>
                <Input
                  id="currentManagerId"
                  value={formData.currentManagerId}
                  onChange={(e) => setFormData({ ...formData, currentManagerId: e.target.value })}
                  placeholder="Manager ID (optional)"
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
                rows={2}
              />
            </div>

            <div>
              <Label htmlFor="scope">Scope *</Label>
              <Textarea
                id="scope"
                value={formData.scope}
                onChange={(e) => setFormData({ ...formData, scope: e.target.value })}
                placeholder="Functional and technical boundaries of this operation..."
                rows={2}
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
                rows={2}
                required
              />
            </div>

            <div className="space-y-3">
              <Label>Performance Metrics</Label>
              
              <div>
                <Label htmlFor="operational-metrics" className="text-sm text-gray-600">Operational Metrics (comma-separated)</Label>
                <Input
                  id="operational-metrics"
                  value={metricsText.operational}
                  onChange={(e) => setMetricsText({ ...metricsText, operational: e.target.value })}
                  placeholder="e.g., Response time, Throughput, Availability"
                />
              </div>
              
              <div>
                <Label htmlFor="quality-metrics" className="text-sm text-gray-600">Quality Metrics (comma-separated)</Label>
                <Input
                  id="quality-metrics"
                  value={metricsText.quality}
                  onChange={(e) => setMetricsText({ ...metricsText, quality: e.target.value })}
                  placeholder="e.g., Customer satisfaction, Error rate, Defect density"
                />
              </div>
              
              <div>
                <Label htmlFor="compliance-metrics" className="text-sm text-gray-600">Compliance Metrics (comma-separated)</Label>
                <Input
                  id="compliance-metrics"
                  value={metricsText.compliance}
                  onChange={(e) => setMetricsText({ ...metricsText, compliance: e.target.value })}
                  placeholder="e.g., SLA compliance, Security compliance, Audit compliance"
                />
              </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
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

            <div className="flex justify-end space-x-2 pt-4">
              <Button 
                type="button" 
                variant="outline" 
                onClick={handleCancel}
                disabled={saving}
              >
                <X className="h-4 w-4 mr-2" />
                Cancel
              </Button>
              <Button type="submit" disabled={saving}>
                <Save className="h-4 w-4 mr-2" />
                {saving ? 'Saving...' : 'Save Changes'}
              </Button>
            </div>
          </form>
        </CardContent>
      </Card>
    </div>
  );
}