import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { NewTransitionDialog } from "@/components/NewTransitionDialog";
import { API_BASE_URL } from "@/services/api";

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
      const response = await fetch(`${API_BASE_URL}/transitions`);
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
    <div className="p-8">
      <div className="flex justify-between items-center mb-8">
        <div>
          <h2 className="text-2xl font-semibold mb-2">Transitions Overview</h2>
          <p className="text-muted-foreground">Manage and track your transition projects</p>
        </div>
        <div className="flex gap-3">
          <button
            onClick={() => navigate('/business-operations')}
            className="px-4 py-2 bg-secondary text-secondary-foreground rounded-lg hover:bg-secondary/80 transition-colors border"
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
        <div className="bg-destructive/10 border border-destructive/20 text-destructive px-4 py-3 rounded-lg mb-4">
          Error: {error}
        </div>
      )}
      
      {loading ? (
        <div className="text-center py-12">
          <div className="text-muted-foreground">Loading transitions...</div>
        </div>
      ) : transitions.length === 0 ? (
        <div className="text-center py-12 text-muted-foreground">
          <div className="mb-4">
            <svg xmlns="http://www.w3.org/2000/svg" className="w-16 h-16 mx-auto text-muted-foreground/40" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="1" d="M9 5H7a2 2 0 00-2 2v10a2 2 0 002 2h8a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2" />
            </svg>
          </div>
          <p className="text-lg font-medium mb-2">No transitions found</p>
          <p>Click "New Team Member Transition" to create your first transition project!</p>
        </div>
      ) : (
        <div className="grid gap-4">
          {transitions.map((transition) => (
            <div 
              key={transition.id} 
              className="border rounded-lg p-6 shadow-sm bg-card hover:shadow-md transition-all cursor-pointer hover:border-primary/20 group"
              onClick={() => navigate(`/transitions/${transition.id}`)}
              role="button"
              tabIndex={0}
              onKeyDown={(e) => {
                if (e.key === 'Enter' || e.key === ' ') {
                  navigate(`/transitions/${transition.id}`);
                }
              }}
            >
              <div className="flex justify-between items-start mb-3">
                <h3 className="text-xl font-semibold text-foreground group-hover:text-primary transition-colors">
                  {transition.contractName}
                </h3>
                <span className={`px-3 py-1 rounded-full text-sm font-medium ${
                  transition.status === 'ON_TRACK' ? 'bg-green-100 text-green-800 dark:bg-green-900/30 dark:text-green-400' :
                  transition.status === 'AT_RISK' ? 'bg-yellow-100 text-yellow-800 dark:bg-yellow-900/30 dark:text-yellow-400' :
                  transition.status === 'BLOCKED' ? 'bg-red-100 text-red-800 dark:bg-red-900/30 dark:text-red-400' :
                  transition.status === 'COMPLETED' ? 'bg-blue-100 text-blue-800 dark:bg-blue-900/30 dark:text-blue-400' :
                  'bg-muted text-muted-foreground'
                }`}>
                  {transition.status.replace(/_/g, ' ').replace(/\b\w/g, l => l.toUpperCase())}
                </span>
              </div>
              <p className="text-muted-foreground mb-3">Contract: {transition.contractNumber}</p>
              <div className="grid grid-cols-2 gap-4 text-sm text-muted-foreground mb-3">
                <div>
                  <span className="font-medium">Start:</span> {new Date(transition.startDate).toLocaleDateString()}
                </div>
                <div>
                  <span className="font-medium">End:</span> {new Date(transition.endDate).toLocaleDateString()}
                </div>
              </div>
              <div className="flex items-center justify-between">
                <div className="text-sm text-muted-foreground">
                  {transition.creator && (
                    <span>Created by {transition.creator.firstName} {transition.creator.lastName}</span>
                  )}
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
