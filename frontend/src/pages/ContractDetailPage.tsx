import { useState, useEffect } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { contractApi, enhancedTransitionApi, Contract, EnhancedTransition } from "@/services/api";
import { Button } from "@/components/ui/button";
import { NewEnhancedTransitionDialog } from "@/components/NewEnhancedTransitionDialog";

export function ContractDetailPage() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const [contract, setContract] = useState<Contract | null>(null);
  const [transitions, setTransitions] = useState<EnhancedTransition[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const userRole = "program_manager";

  const fetchContractDetails = async () => {
    if (!id) return;
    
    try {
      setLoading(true);
      const [contractData, transitionsData] = await Promise.all([
        contractApi.getById(id),
        enhancedTransitionApi.getAll({ contractId: id })
      ]);
      setContract(contractData);
      setTransitions(transitionsData.data);
      setError(null);
    } catch (err) {
      console.error('Failed to fetch contract details:', err);
      setError(err instanceof Error ? err.message : 'Failed to fetch contract details');
    } finally {
      setLoading(false);
    }
  };

  const handleTransitionCreated = async (newTransition: EnhancedTransition) => {
    setTransitions(prev => [newTransition, ...prev]);
    await fetchContractDetails();
  };

  useEffect(() => {
    fetchContractDetails();
  }, [id]);

  if (loading) {
    return <div className="container mx-auto p-8 text-center">Loading contract details...</div>;
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

  if (!contract) {
    return (
      <div className="container mx-auto p-8 text-center">
        Contract not found.
        <Button onClick={() => navigate('/business-operations')} className="mt-4">
          Back to Business Operations
        </Button>
      </div>
    );
  }

  const getStatusColor = (status: Contract['status']) => {
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

  const getTransitionStatusColor = (status: EnhancedTransition['status']) => {
    switch (status) {
      case 'ON_TRACK': return 'bg-green-100 text-green-800';
      case 'NOT_STARTED': return 'bg-gray-100 text-gray-800';
      case 'AT_RISK': return 'bg-yellow-100 text-yellow-800';
      case 'BLOCKED': return 'bg-red-100 text-red-800';
      case 'COMPLETED': return 'bg-blue-100 text-blue-800';
      default: return 'bg-gray-100 text-gray-800';
    }
  };

  const formatDuration = (duration: EnhancedTransition['duration']) => {
    switch (duration) {
      case 'IMMEDIATE': return 'Immediate';
      case 'THIRTY_DAYS': return '30 Days';
      case 'FORTY_FIVE_DAYS': return '45 Days';
      case 'SIXTY_DAYS': return '60 Days';
      case 'NINETY_DAYS': return '90 Days';
      default: return duration;
    }
  };

  return (
    <div className="container mx-auto p-8">
      {/* Header */}
      <div className="flex justify-between items-start mb-8">
        <div>
          <div className="flex items-center gap-4 mb-2">
            <Button 
              variant="outline" 
              onClick={() => contract.businessOperation ? 
                navigate(`/business-operations/${contract.businessOperation.id}`) :
                navigate('/business-operations')
              }
            >
              ← Back
            </Button>
            <h1 className="text-3xl font-bold">{contract.contractName}</h1>
            <span className={`px-3 py-1 rounded-full text-sm font-medium ${getStatusColor(contract.status)}`}>
              {contract.status.replace(/_/g, ' ')}
            </span>
          </div>
          <p className="text-gray-600">Contract: {contract.contractNumber}</p>
          <p className="text-gray-500">Contractor: {contract.contractorName}</p>
        </div>
        <NewEnhancedTransitionDialog 
          contractId={contract.id}
          onTransitionCreated={handleTransitionCreated}
          userRole={userRole}
        />
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        {/* Main Content */}
        <div className="lg:col-span-2 space-y-6">
          {/* Business Operation Link */}
          {contract.businessOperation && (
            <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
              <h3 className="font-medium text-blue-900 mb-1">Business Operation</h3>
              <div className="flex justify-between items-center">
                <div>
                  <p className="text-blue-800">{contract.businessOperation.name}</p>
                  <p className="text-sm text-blue-600">{contract.businessOperation.businessFunction}</p>
                </div>
                <Button 
                  variant="outline" 
                  size="sm"
                  onClick={() => navigate(`/business-operations/${contract.businessOperation!.id}`)}
                >
                  View Operation
                </Button>
              </div>
            </div>
          )}

          {/* Transitions */}
          <div className="bg-white rounded-lg border p-6">
            <h2 className="text-xl font-semibold mb-4">Transitions ({transitions.length})</h2>
            
            {transitions.length === 0 ? (
              <p className="text-gray-500">No transitions found for this contract.</p>
            ) : (
              <div className="space-y-4">
                {transitions.map((transition) => (
                  <div key={transition.id} className="border rounded-lg p-4 hover:bg-gray-50">
                    <div className="flex justify-between items-start mb-2">
                      <h3 className="font-medium">{transition.name || 'Unnamed Transition'}</h3>
                      <span className={`px-2 py-1 rounded text-sm ${getTransitionStatusColor(transition.status)}`}>
                        {transition.status.replace(/_/g, ' ')}
                      </span>
                    </div>
                    
                    {transition.description && (
                      <p className="text-sm text-gray-600 mb-2">{transition.description}</p>
                    )}
                    
                    <div className="grid grid-cols-2 gap-4 text-sm text-gray-500">
                      <div>
                        <p>Duration: {formatDuration(transition.duration)}</p>
                        <p>Start: {new Date(transition.startDate).toLocaleDateString()}</p>
                      </div>
                      <div>
                        <p>Continuous Service: {transition.requiresContinuousService ? 'Yes' : 'No'}</p>
                        <p>End: {new Date(transition.endDate).toLocaleDateString()}</p>
                      </div>
                    </div>
                    
                    <div className="flex justify-between items-center mt-3">
                      <span className="text-sm text-gray-600">
                        {transition._count?.milestones || 0} milestone(s)
                      </span>
                      <Button 
                        variant="outline" 
                        size="sm"
                        onClick={() => navigate(`/enhanced-transitions/${transition.id}`)}
                      >
                        View Details
                      </Button>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>

        {/* Sidebar */}
        <div className="space-y-6">
          {/* Contract Details */}
          <div className="bg-white rounded-lg border p-6">
            <h3 className="font-semibold mb-4">Contract Details</h3>
            <div className="space-y-3 text-sm">
              <div>
                <p className="font-medium text-gray-700">Duration</p>
                <p className="text-gray-600">
                  {new Date(contract.startDate).toLocaleDateString()} - {new Date(contract.endDate).toLocaleDateString()}
                </p>
              </div>
              
              <div>
                <p className="font-medium text-gray-700">Can be Extended</p>
                <p className="text-gray-600">{contract.canBeExtended ? 'Yes' : 'No'}</p>
              </div>
              
              {contract.contractorPM && (
                <div>
                  <p className="font-medium text-gray-700">Contractor PM</p>
                  <p className="text-gray-600">
                    {contract.contractorPM.firstName} {contract.contractorPM.lastName}
                  </p>
                  <p className="text-xs text-gray-500">{contract.contractorPM.email}</p>
                </div>
              )}
            </div>
          </div>

          {/* Government Personnel */}
          {contract.businessOperation && (
            <div className="bg-white rounded-lg border p-6">
              <h3 className="font-semibold mb-4">Government Personnel</h3>
              <div className="space-y-3 text-sm">
                {contract.businessOperation.governmentPM && (
                  <div>
                    <p className="font-medium text-gray-700">Government PM</p>
                    <p className="text-gray-600">
                      {contract.businessOperation.governmentPM.firstName} {contract.businessOperation.governmentPM.lastName}
                    </p>
                    <p className="text-xs text-gray-500">{contract.businessOperation.governmentPM.email}</p>
                  </div>
                )}
                
                {contract.businessOperation.director && (
                  <div>
                    <p className="font-medium text-gray-700">Director</p>
                    <p className="text-gray-600">
                      {contract.businessOperation.director.firstName} {contract.businessOperation.director.lastName}
                    </p>
                    <p className="text-xs text-gray-500">{contract.businessOperation.director.email}</p>
                  </div>
                )}
              </div>
            </div>
          )}

          {/* Statistics */}
          <div className="bg-white rounded-lg border p-6">
            <h3 className="font-semibold mb-4">Statistics</h3>
            <div className="space-y-2 text-sm">
              <div className="flex justify-between">
                <span>Total Transitions</span>
                <span className="font-medium">{transitions.length}</span>
              </div>
              <div className="flex justify-between">
                <span>Active Transitions</span>
                <span className="font-medium">
                  {transitions.filter(t => ['NOT_STARTED', 'ON_TRACK', 'AT_RISK'].includes(t.status)).length}
                </span>
              </div>
              <div className="flex justify-between">
                <span>Completed Transitions</span>
                <span className="font-medium">
                  {transitions.filter(t => t.status === 'COMPLETED').length}
                </span>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}