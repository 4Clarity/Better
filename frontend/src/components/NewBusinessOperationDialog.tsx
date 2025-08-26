import { useState } from "react";
import { businessOperationApi, BusinessOperation } from "@/services/api";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogTrigger } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";

interface NewBusinessOperationDialogProps {
  onBusinessOperationCreated: (businessOperation: BusinessOperation) => void;
  userRole: string;
}

export function NewBusinessOperationDialog({ onBusinessOperationCreated, userRole }: NewBusinessOperationDialogProps) {
  const [open, setOpen] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  
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
    governmentPMId: 'default-pm-id', // TODO: Replace with actual user selection
    directorId: 'default-director-id', // TODO: Replace with actual user selection
    currentManagerId: '',
  });

  const [metricsText, setMetricsText] = useState({
    operational: '',
    quality: '',
    compliance: '',
  });

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError(null);
    console.log('Starting form submission...');

    try {
      // Parse metrics from text input
      const performanceMetrics = {
        operational: metricsText.operational.split(',').map(s => s.trim()).filter(s => s),
        quality: metricsText.quality.split(',').map(s => s.trim()).filter(s => s),
        compliance: metricsText.compliance.split(',').map(s => s.trim()).filter(s => s),
      };

      // Ensure dates are in YYYY-MM-DD format only
      const requestData: any = {
        ...formData,
        performanceMetrics,
        supportPeriodStart: formData.supportPeriodStart.split('T')[0], // Remove time part if present
        supportPeriodEnd: formData.supportPeriodEnd.split('T')[0],
        currentContractEnd: formData.currentContractEnd.split('T')[0],
      };

      // Only include currentManagerId if it has a value
      if (formData.currentManagerId && formData.currentManagerId.trim()) {
        requestData.currentManagerId = formData.currentManagerId.trim();
      }
      
      console.log('Original currentManagerId:', JSON.stringify(formData.currentManagerId));
      console.log('Processed currentManagerId:', JSON.stringify(requestData.currentManagerId));
      console.log('Sending request with data:', requestData);
      const businessOperation = await businessOperationApi.create(requestData);

      onBusinessOperationCreated(businessOperation);
      setOpen(false);
      
      // Reset form
      setFormData({
        name: '',
        businessFunction: '',
        technicalDomain: '',
        description: '',
        scope: '',
        objectives: '',
        performanceMetrics: { operational: [], quality: [], compliance: [] },
        supportPeriodStart: '',
        supportPeriodEnd: '',
        currentContractEnd: '',
        governmentPMId: 'default-pm-id',
        directorId: 'default-director-id',
        currentManagerId: '',
      });
      setMetricsText({ operational: '', quality: '', compliance: '' });
    } catch (err) {
      console.error('Failed to create business operation:', err);
      let errorMessage = err instanceof Error ? err.message : 'Failed to create business operation';
      
      // Check if this is the database table issue and provide a clearer message
      if (errorMessage.includes('Internal Server Error') || errorMessage.includes('500')) {
        errorMessage = 'Database not set up: The Business Operations feature requires database tables to be created. Please contact your administrator to run the database migration.';
      }
      
      console.log('Setting error message:', errorMessage);
      setError(errorMessage);
    } finally {
      setLoading(false);
    }
  };

  const canCreate = userRole === 'director' || userRole === 'admin';

  if (!canCreate) {
    return null;
  }

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button>New Business Operation</Button>
      </DialogTrigger>
      <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>Create New Business Operation</DialogTitle>
          <DialogDescription>
            Fill out the form below to create a new business operation with all required details.
          </DialogDescription>
        </DialogHeader>
        
        <form onSubmit={handleSubmit} className="space-y-4">
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
              onClick={() => setOpen(false)}
              disabled={loading}
            >
              Cancel
            </Button>
            <Button type="submit" disabled={loading}>
              {loading ? 'Creating...' : 'Create Business Operation'}
            </Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  );
}