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
    
    if (monthsUntilEnd < 6) return 'bg-red-100 text-red-800 dark:bg-red-900/30 dark:text-red-400';
    if (monthsUntilEnd < 12) return 'bg-yellow-100 text-yellow-800 dark:bg-yellow-900/30 dark:text-yellow-400';
    return 'bg-green-100 text-green-800 dark:bg-green-900/30 dark:text-green-400';
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
    <div className="p-8">
      <div className="flex justify-between items-center mb-8">
        <div>
          <h2 className="text-2xl font-semibold mb-2">Business Operations</h2>
          <p className="text-muted-foreground">Manage business operations and their contracts</p>
        </div>
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
        <div className="bg-destructive/10 border border-destructive/20 text-destructive px-4 py-3 rounded-lg mb-4">
          Error: {error}
        </div>
      )}
      
      {loading ? (
        <div className="text-center py-12">
          <div className="text-muted-foreground">Loading business operations...</div>
        </div>
      ) : businessOperations.length === 0 ? (
        <div className="text-center py-12 text-muted-foreground">
          <div className="mb-4">
            <svg xmlns="http://www.w3.org/2000/svg" className="w-16 h-16 mx-auto text-muted-foreground/40" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="1" d="M19 21V5a2 2 0 00-2-2H7a2 2 0 00-2 2v16m14 0h2m-2 0h-5m-9 0H3m2 0h5M9 7h1m-1 4h1m4-4h1m-1 4h1m-5 10v-5a1 1 0 011-1h2a1 1 0 011 1v5m-4 0h4" />
            </svg>
          </div>
          <p className="text-lg font-medium mb-2">No business operations found</p>
          <p>Click "New Business Operation" to create your first business operation!</p>
        </div>
      ) : (
        <div className="grid gap-4">
          {businessOperations.map((operation) => (
            <div 
              key={operation.id} 
              className="border rounded-lg p-6 shadow-sm bg-card hover:shadow-md transition-all cursor-pointer hover:border-primary/20 group"
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
                  <h3 className="text-xl font-semibold text-foreground group-hover:text-primary transition-colors mb-1">
                    {operation.name}
                  </h3>
                  <p className="text-sm text-muted-foreground">
                    {operation.businessFunction} • {operation.technicalDomain}
                  </p>
                </div>
                <span className={`px-3 py-1 rounded-full text-sm font-medium ${getStatusColor(operation.currentContractEnd)}`}>
                  {getStatusText(operation.currentContractEnd)}
                </span>
              </div>

              {operation.description && (
                <p className="text-muted-foreground mb-3 line-clamp-2">{operation.description}</p>
              )}

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-sm text-muted-foreground mb-3">
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
                <div className="flex gap-4 text-sm text-muted-foreground">
                  <span>{operation._count?.contracts || 0} contract(s)</span>
                  <span>{operation._count?.stakeholders || 0} stakeholder(s)</span>
                </div>
                <div className="text-sm text-primary font-medium group-hover:translate-x-1 transition-transform">
                  View details →
                </div>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}