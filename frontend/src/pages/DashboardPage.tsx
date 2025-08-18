import { Button } from "@/components/ui/button";
import { useState, useEffect } from "react";

interface Transition {
  id: string;
  contractName: string;
  contractNumber: string;
  startDate: string;
  endDate: string;
  status: string;
  createdAt: string;
  updatedAt: string;
}

export function DashboardPage() {
  const [transitions, setTransitions] = useState<Transition[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const fetchTransitions = async () => {
    try {
      setLoading(true);
      const response = await fetch('http://api.tip.localhost/api/transitions');
      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`);
      }
      const data = await response.json();
      setTransitions(data);
      setError(null);
    } catch (err) {
      console.error('Failed to fetch transitions:', err);
      setError(err instanceof Error ? err.message : 'Failed to fetch transitions');
    } finally {
      setLoading(false);
    }
  };

  const createSampleTransition = async () => {
    try {
      const sampleTransition = {
        contractName: "Sample Contract " + Date.now(),
        contractNumber: "CNT-" + Math.random().toString(36).substr(2, 9),
        startDate: new Date().toISOString(),
        endDate: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString() // 30 days from now
      };

      const response = await fetch('http://api.tip.localhost/api/transitions', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(sampleTransition)
      });

      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`);
      }

      // Refresh the list after creating
      await fetchTransitions();
    } catch (err) {
      console.error('Failed to create transition:', err);
      setError(err instanceof Error ? err.message : 'Failed to create transition');
    }
  };

  useEffect(() => {
    fetchTransitions();
  }, []);

  return (
    <div className="container mx-auto p-8">
      <div className="flex justify-between items-center mb-8">
        <h1 className="text-3xl font-bold">Transitions Dashboard</h1>
        <Button onClick={createSampleTransition}>New Transition</Button>
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
            <div key={transition.id} className="border rounded-lg p-4 shadow-sm bg-white">
              <div className="flex justify-between items-start mb-2">
                <h3 className="text-lg font-semibold">{transition.contractName}</h3>
                <span className={`px-2 py-1 rounded text-sm ${
                  transition.status === 'On Track' ? 'bg-green-100 text-green-800' :
                  transition.status === 'At Risk' ? 'bg-yellow-100 text-yellow-800' :
                  transition.status === 'Blocked' ? 'bg-red-100 text-red-800' :
                  'bg-gray-100 text-gray-800'
                }`}>
                  {transition.status}
                </span>
              </div>
              <p className="text-gray-600 mb-2">Contract: {transition.contractNumber}</p>
              <div className="text-sm text-gray-500">
                <p>Start: {new Date(transition.startDate).toLocaleDateString()}</p>
                <p>End: {new Date(transition.endDate).toLocaleDateString()}</p>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}