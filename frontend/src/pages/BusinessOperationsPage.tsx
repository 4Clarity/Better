import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { businessOperationApi, BusinessOperation } from "@/services/api";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { NewBusinessOperationDialog } from "@/components/NewBusinessOperationDialog";

export function BusinessOperationsPage() {
  const navigate = useNavigate();
  const [businessOperations, setBusinessOperations] = useState<BusinessOperation[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [searchTerm, setSearchTerm] = useState("");
  const [filterFunction, setFilterFunction] = useState("");
  const [filterDomain, setFilterDomain] = useState("");

  // Mock user role
  const userRole = "director";

  const fetchBusinessOperations = async () => {
    try {
      setLoading(true);
      const data = await businessOperationApi.getAll({
        search: searchTerm || undefined,
        businessFunction: filterFunction || undefined,
        technicalDomain: filterDomain || undefined,
        limit: 50,
      });
      setBusinessOperations(data.data);
      setError(null);
    } catch (err) {
      console.error('Failed to fetch business operations:', err);
      const errorMessage = err instanceof Error ? err.message : 'Failed to fetch business operations';
      
      // Check if this is a database setup issue
      if (errorMessage.includes('Internal Server Error') || errorMessage.includes('table') && errorMessage.includes('does not exist')) {
        setError('Business Operations feature requires database setup. Please contact your administrator to set up the database tables.');
      } else {
        setError(errorMessage);
      }
      setBusinessOperations([]); // Set empty array to prevent further issues
    } finally {
      setLoading(false);
    }
  };

  const handleBusinessOperationCreated = async (newOperation: BusinessOperation) => {
    setBusinessOperations(prev => [newOperation, ...prev]);
    await fetchBusinessOperations();
  };

  useEffect(() => {
    fetchBusinessOperations();
  }, [searchTerm, filterFunction, filterDomain]);

  const getStatusColor = (contractEnd: string) => {
    const endDate = new Date(contractEnd);
    const now = new Date();
    const monthsUntilEnd = (endDate.getTime() - now.getTime()) / (1000 * 60 * 60 * 24 * 30);
    
    if (monthsUntilEnd < 6) return 'bg-red-100 text-red-800';
    if (monthsUntilEnd < 12) return 'bg-yellow-100 text-yellow-800';
    return 'bg-green-100 text-green-800';
  };

  const getStatusText = (contractEnd: string) => {
    const endDate = new Date(contractEnd);
    const now = new Date();
    const monthsUntilEnd = Math.floor((endDate.getTime() - now.getTime()) / (1000 * 60 * 60 * 24 * 30));
    
    if (monthsUntilEnd < 0) return 'Expired';
    if (monthsUntilEnd < 6) return `${monthsUntilEnd}mo left`;
    if (monthsUntilEnd < 12) return `${monthsUntilEnd}mo left`;
    return 'Active';
  };

  return (
    <div className="container mx-auto p-8">
      <div className="flex justify-between items-center mb-8">
        <h1 className="text-3xl font-bold">Business Operations</h1>
        <NewBusinessOperationDialog 
          onBusinessOperationCreated={handleBusinessOperationCreated}
          userRole={userRole}
        />
      </div>

      {/* Filters */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-6">
        <Input
          placeholder="Search operations..."
          value={searchTerm}
          onChange={(e) => setSearchTerm(e.target.value)}
        />
        <Input
          placeholder="Filter by business function..."
          value={filterFunction}
          onChange={(e) => setFilterFunction(e.target.value)}
        />
        <Input
          placeholder="Filter by technical domain..."
          value={filterDomain}
          onChange={(e) => setFilterDomain(e.target.value)}
        />
      </div>
      
      {error && (
        <div className="bg-red-100 border border-red-400 text-red-700 px-4 py-3 rounded mb-4">
          Error: {error}
        </div>
      )}
      
      {loading ? (
        <div className="text-center py-8">Loading business operations...</div>
      ) : businessOperations.length === 0 ? (
        <div className="text-center py-8 text-gray-500">
          No business operations found. Click "New Business Operation" to create one!
        </div>
      ) : (
        <div className="grid gap-4">
          {businessOperations.map((operation) => (
            <div 
              key={operation.id} 
              className="border rounded-lg p-6 shadow-sm bg-white hover:shadow-md transition-shadow cursor-pointer hover:border-blue-300"
              onClick={() => navigate(`/business-operations/${operation.id}`)}
              role="button"
              tabIndex={0}
              onKeyDown={(e) => {
                if (e.key === 'Enter' || e.key === ' ') {
                  navigate(`/business-operations/${operation.id}`);
                }
              }}
            >
              <div className="flex justify-between items-start mb-3">
                <div>
                  <h3 className="text-xl font-semibold text-blue-900 hover:text-blue-700 mb-1">
                    {operation.name}
                  </h3>
                  <p className="text-sm text-gray-600">
                    {operation.businessFunction} • {operation.technicalDomain}
                  </p>
                </div>
                <span className={`px-3 py-1 rounded-full text-sm font-medium ${getStatusColor(operation.currentContractEnd)}`}>
                  {getStatusText(operation.currentContractEnd)}
                </span>
              </div>

              {operation.description && (
                <p className="text-gray-600 mb-3 line-clamp-2">{operation.description}</p>
              )}

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-sm text-gray-500 mb-3">
                <div>
                  <p><strong>Support Period:</strong> {new Date(operation.supportPeriodStart).toLocaleDateString()} - {new Date(operation.supportPeriodEnd).toLocaleDateString()}</p>
                  <p><strong>Contract End:</strong> {new Date(operation.currentContractEnd).toLocaleDateString()}</p>
                </div>
                <div>
                  <p><strong>Government PM:</strong> {operation.governmentPM ? `${operation.governmentPM.firstName} ${operation.governmentPM.lastName}` : 'Not assigned'}</p>
                  <p><strong>Director:</strong> {operation.director ? `${operation.director.firstName} ${operation.director.lastName}` : 'Not assigned'}</p>
                </div>
              </div>

              <div className="flex justify-between items-center">
                <div className="flex gap-4 text-sm text-gray-600">
                  <span>{operation._count?.contracts || 0} contract(s)</span>
                  <span>{operation._count?.stakeholders || 0} stakeholder(s)</span>
                </div>
                <div className="text-sm text-blue-600">
                  Click to view details →
                </div>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}