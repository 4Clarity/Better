import { useState, useEffect } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { businessOperationApi, contractApi, BusinessOperation, Contract } from "@/services/api";
import { Button } from "@/components/ui/button";
import { NewContractDialog } from "@/components/NewContractDialog";

export function BusinessOperationDetailPage() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const [operation, setOperation] = useState<BusinessOperation | null>(null);
  const [contracts, setContracts] = useState<Contract[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const userRole = "director";

  const fetchOperationDetails = async () => {
    if (!id) return;
    
    try {
      setLoading(true);
      const [operationData, contractsData] = await Promise.all([
        businessOperationApi.getById(id),
        contractApi.getByBusinessOperation(id)
      ]);
      setOperation(operationData);
      setContracts(contractsData);
      setError(null);
    } catch (err) {
      console.error('Failed to fetch operation details:', err);
      setError(err instanceof Error ? err.message : 'Failed to fetch operation details');
    } finally {
      setLoading(false);
    }
  };

  const handleContractCreated = async (newContract: Contract) => {
    setContracts(prev => [newContract, ...prev]);
    await fetchOperationDetails();
  };

  useEffect(() => {
    fetchOperationDetails();
  }, [id]);

  if (loading) {
    return <div className="container mx-auto p-8 text-center">Loading business operation details...</div>;
  }

  if (error) {
    return (
      <div className="container mx-auto p-8">
        <div className="bg-red-100 border border-red-400 text-red-700 px-4 py-3 rounded">
          Error: {error}
        </div>
        <Button onClick={() => navigate('/business-operations')} className="mt-4">
          Back to Business Operations
        </Button>
      </div>
    );
  }

  if (!operation) {
    return (
      <div className="container mx-auto p-8 text-center">
        Business operation not found.
        <Button onClick={() => navigate('/business-operations')} className="mt-4">
          Back to Business Operations
        </Button>
      </div>
    );
  }

  const getContractStatusColor = (status: Contract['status']) => {
    switch (status) {
      case 'ACTIVE': return 'bg-green-100 text-green-800';
      case 'PLANNING': return 'bg-blue-100 text-blue-800';
      case 'RENEWAL': return 'bg-yellow-100 text-yellow-800';
      case 'EXPIRING': return 'bg-orange-100 text-orange-800';
      case 'EXPIRED': return 'bg-red-100 text-red-800';
      case 'EXTENDED': return 'bg-purple-100 text-purple-800';
      default: return 'bg-gray-100 text-gray-800';
    }
  };

  const formatMetrics = (metrics: any) => {
    if (!metrics || typeof metrics !== 'object') return [];
    
    const formatted = [];
    if (metrics.operational?.length) formatted.push(`Operational: ${metrics.operational.join(', ')}`);
    if (metrics.quality?.length) formatted.push(`Quality: ${metrics.quality.join(', ')}`);
    if (metrics.compliance?.length) formatted.push(`Compliance: ${metrics.compliance.join(', ')}`);
    
    return formatted;
  };

  return (
    <div className="container mx-auto p-8">
      {/* Header */}
      <div className="flex justify-between items-start mb-8">
        <div>
          <div className="flex items-center gap-4 mb-2">
            <Button 
              variant="outline" 
              onClick={() => navigate('/business-operations')}
            >
              ← Back
            </Button>
            <h1 className="text-3xl font-bold">{operation.name}</h1>
          </div>
          <p className="text-gray-600">{operation.businessFunction} • {operation.technicalDomain}</p>
        </div>
        <NewContractDialog 
          businessOperationId={operation.id}
          onContractCreated={handleContractCreated}
          userRole={userRole}
        />
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        {/* Main Details */}
        <div className="lg:col-span-2 space-y-6">
          {/* Basic Information */}
          <div className="bg-white rounded-lg border p-6">
            <h2 className="text-xl font-semibold mb-4">Operation Details</h2>
            
            {operation.description && (
              <div className="mb-4">
                <h3 className="font-medium text-gray-700 mb-1">Description</h3>
                <p className="text-gray-600">{operation.description}</p>
              </div>
            )}
            
            <div className="mb-4">
              <h3 className="font-medium text-gray-700 mb-1">Scope</h3>
              <p className="text-gray-600">{operation.scope}</p>
            </div>
            
            <div className="mb-4">
              <h3 className="font-medium text-gray-700 mb-1">Objectives</h3>
              <p className="text-gray-600">{operation.objectives}</p>
            </div>

            <div>
              <h3 className="font-medium text-gray-700 mb-2">Performance Metrics</h3>
              {formatMetrics(operation.performanceMetrics).map((metric, index) => (
                <p key={index} className="text-gray-600 text-sm mb-1">{metric}</p>
              ))}
              {formatMetrics(operation.performanceMetrics).length === 0 && (
                <p className="text-gray-500 text-sm">No performance metrics defined</p>
              )}
            </div>
          </div>

          {/* Contracts */}
          <div className="bg-white rounded-lg border p-6">
            <h2 className="text-xl font-semibold mb-4">Contracts ({contracts.length})</h2>
            
            {contracts.length === 0 ? (
              <p className="text-gray-500">No contracts found for this operation.</p>
            ) : (
              <div className="space-y-4">
                {contracts.map((contract) => (
                  <div key={contract.id} className="border rounded-lg p-4 hover:bg-gray-50">
                    <div className="flex justify-between items-start mb-2">
                      <h3 className="font-medium">{contract.contractName}</h3>
                      <span className={`px-2 py-1 rounded text-sm ${getContractStatusColor(contract.status)}`}>
                        {contract.status.replace(/_/g, ' ')}
                      </span>
                    </div>
                    <p className="text-sm text-gray-600 mb-2">Contract: {contract.contractNumber}</p>
                    <p className="text-sm text-gray-600 mb-2">Contractor: {contract.contractorName}</p>
                    <div className="text-sm text-gray-500">
                      <p>Duration: {new Date(contract.startDate).toLocaleDateString()} - {new Date(contract.endDate).toLocaleDateString()}</p>
                      <p className="flex justify-between">
                        <span>{contract._count?.transitions || 0} transition(s)</span>
                        <Button 
                          variant="outline" 
                          size="sm"
                          onClick={() => navigate(`/contracts/${contract.id}`)}
                        >
                          View Details
                        </Button>
                      </p>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>

        {/* Sidebar */}
        <div className="space-y-6">
          {/* Timeline */}
          <div className="bg-white rounded-lg border p-6">
            <h3 className="font-semibold mb-4">Timeline</h3>
            <div className="space-y-3 text-sm">
              <div>
                <p className="font-medium text-gray-700">Support Period</p>
                <p className="text-gray-600">
                  {new Date(operation.supportPeriodStart).toLocaleDateString()} - {new Date(operation.supportPeriodEnd).toLocaleDateString()}
                </p>
              </div>
              <div>
                <p className="font-medium text-gray-700">Current Contract End</p>
                <p className="text-gray-600">
                  {new Date(operation.currentContractEnd).toLocaleDateString()}
                </p>
              </div>
            </div>
          </div>

          {/* Key Personnel */}
          <div className="bg-white rounded-lg border p-6">
            <h3 className="font-semibold mb-4">Key Personnel</h3>
            <div className="space-y-3 text-sm">
              <div>
                <p className="font-medium text-gray-700">Government PM</p>
                <p className="text-gray-600">
                  {operation.governmentPM ? `${operation.governmentPM.firstName} ${operation.governmentPM.lastName}` : 'Not assigned'}
                </p>
              </div>
              <div>
                <p className="font-medium text-gray-700">Director</p>
                <p className="text-gray-600">
                  {operation.director ? `${operation.director.firstName} ${operation.director.lastName}` : 'Not assigned'}
                </p>
              </div>
              {operation.currentManager && (
                <div>
                  <p className="font-medium text-gray-700">Current Manager</p>
                  <p className="text-gray-600">
                    {operation.currentManager.firstName} {operation.currentManager.lastName}
                  </p>
                </div>
              )}
            </div>
          </div>

          {/* Statistics */}
          <div className="bg-white rounded-lg border p-6">
            <h3 className="font-semibold mb-4">Statistics</h3>
            <div className="space-y-2 text-sm">
              <div className="flex justify-between">
                <span>Total Contracts</span>
                <span className="font-medium">{operation._count?.contracts || 0}</span>
              </div>
              <div className="flex justify-between">
                <span>Total Stakeholders</span>
                <span className="font-medium">{operation._count?.stakeholders || 0}</span>
              </div>
              <div className="flex justify-between">
                <span>Active Transitions</span>
                <span className="font-medium">
                  {contracts.reduce((sum, contract) => sum + (contract._count?.transitions || 0), 0)}
                </span>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}