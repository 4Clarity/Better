import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { NewTransitionDialog } from "@/components/NewTransitionDialog";

interface Transition {
  id: string;
  contractName: string;
  contractNumber: string;
  startDate: string;
  endDate: string;
  status: string;
  createdAt: string;
  updatedAt: string;
  creator?: {
    id: string;
    firstName: string;
    lastName: string;
    email: string;
  };
}

export function DashboardPage() {
  const navigate = useNavigate();
  const [transitions, setTransitions] = useState<Transition[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // Mock user role - in real app this would come from authentication
  const userRole = "program_manager"; // For demo - only PMs can create transitions

  const fetchTransitions = async () => {
    try {
      setLoading(true);
      const response = await fetch('http://localhost:3000/api/transitions');
      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`);
      }
      const data = await response.json();
      // Handle both paginated and non-paginated responses
      setTransitions(data.data || data);
      setError(null);
    } catch (err) {
      console.error('Failed to fetch transitions:', err);
      setError(err instanceof Error ? err.message : 'Failed to fetch transitions');
    } finally {
      setLoading(false);
    }
  };

  const handleTransitionCreated = async (newTransition: Transition) => {
    // Add the new transition to the list
    setTransitions(prev => [newTransition, ...prev]);
    
    // Optionally refresh the entire list to ensure consistency
    await fetchTransitions();
  };

  useEffect(() => {
    fetchTransitions();
  }, []);

  return (
    <div className="container mx-auto p-8">
      <div className="flex justify-between items-center mb-8">
        <h1 className="text-3xl font-bold">Transitions Dashboard</h1>
        <div className="flex gap-3">
          <button
            onClick={() => navigate('/business-operations')}
            className="px-4 py-2 bg-blue-600 text-white rounded hover:bg-blue-700 transition-colors"
          >
            Business Operations
          </button>
          <NewTransitionDialog 
            onTransitionCreated={handleTransitionCreated}
            userRole={userRole}
          />
        </div>
      </div>
      
      {error && (
        <div className="bg-red-100 border border-red-400 text-red-700 px-4 py-3 rounded mb-4">
          Error: {error}
        </div>
      )}
      
      {loading ? (
        <div className="text-center py-8">Loading transitions...</div>
      ) : transitions.length === 0 ? (
        <div className="text-center py-8 text-gray-500">
          No transitions found. Click "New Transition" to create one!
        </div>
      ) : (
        <div className="grid gap-4">
          {transitions.map((transition) => (
            <div 
              key={transition.id} 
              className="border rounded-lg p-4 shadow-sm bg-white hover:shadow-md transition-shadow cursor-pointer hover:border-blue-300"
              onClick={() => navigate(`/transitions/${transition.id}`)}
              role="button"
              tabIndex={0}
              onKeyDown={(e) => {
                if (e.key === 'Enter' || e.key === ' ') {
                  navigate(`/transitions/${transition.id}`);
                }
              }}
            >
              <div className="flex justify-between items-start mb-2">
                <h3 className="text-lg font-semibold text-blue-900 hover:text-blue-700">
                  {transition.contractName}
                </h3>
                <span className={`px-2 py-1 rounded text-sm ${
                  transition.status === 'ON_TRACK' ? 'bg-green-100 text-green-800' :
                  transition.status === 'AT_RISK' ? 'bg-yellow-100 text-yellow-800' :
                  transition.status === 'BLOCKED' ? 'bg-red-100 text-red-800' :
                  transition.status === 'COMPLETED' ? 'bg-blue-100 text-blue-800' :
                  'bg-gray-100 text-gray-800'
                }`}>
                  {transition.status.replace(/_/g, ' ').replace(/\b\w/g, l => l.toUpperCase())}
                </span>
              </div>
              <p className="text-gray-600 mb-2">Contract: {transition.contractNumber}</p>
              <div className="text-sm text-gray-500">
                <p>Start: {new Date(transition.startDate).toLocaleDateString()}</p>
                <p>End: {new Date(transition.endDate).toLocaleDateString()}</p>
              </div>
              <div className="mt-3 text-xs text-blue-600">
                Click to view details →
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}