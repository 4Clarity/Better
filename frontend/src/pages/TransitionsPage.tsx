import { useState, useEffect } from "react";
import { EnhancedTransition, API_BASE_URL } from "@/services/api";
import { Card, CardContent } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Building, Users, Settings } from "lucide-react";
import { TransitionCard } from "@/components/transitions/common/TransitionCard";
import { TransitionFilters } from "@/components/transitions/common/TransitionFilters";


interface TransitionCounts {
  major: number;
  personnel: number;
  operational: number;
  total: number;
}

export function TransitionsPage() {
  const [majorTransitions, setMajorTransitions] = useState<EnhancedTransition[]>([]);
  const [personnelTransitions, setPersonnelTransitions] = useState<EnhancedTransition[]>([]);
  const [operationalChanges, setOperationalChanges] = useState<EnhancedTransition[]>([]);
  const [transitionCounts, setTransitionCounts] = useState<TransitionCounts>({ major: 0, personnel: 0, operational: 0, total: 0 });
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [searchQuery, setSearchQuery] = useState('');
  const [statusFilter, setStatusFilter] = useState('all');
  const [sourceFilter, setSourceFilter] = useState('all');
  const [activeLevel, setActiveLevel] = useState<'major' | 'personnel' | 'operational'>('major');

  useEffect(() => {
    fetchTransitions();
  }, []);

  const fetchTransitions = async () => {
    try {
      setLoading(true);
      setError(null);
      
      // Fetch all transition levels and counts
      const [majorResponse, personnelResponse, operationalResponse, countsResponse] = await Promise.all([
        fetch(`${API_BASE_URL}/enhanced-transitions/major?limit=100`).then(res => res.json()),
        fetch(`${API_BASE_URL}/enhanced-transitions/personnel?limit=100`).then(res => res.json()),
        fetch(`${API_BASE_URL}/enhanced-transitions/operational?limit=100`).then(res => res.json()),
        fetch(`${API_BASE_URL}/enhanced-transitions/counts`).then(res => res.json())
      ]);
      
      setMajorTransitions(majorResponse.data || []);
      setPersonnelTransitions(personnelResponse.data || []);
      setOperationalChanges(operationalResponse.data || []);
      setTransitionCounts(countsResponse);
    } catch (err) {
      console.error('Failed to fetch transitions:', err);
      setError(err instanceof Error ? err.message : 'Failed to fetch transitions');
    } finally {
      setLoading(false);
    }
  };

  const getStatusColor = (status: EnhancedTransition['status']) => {
    const colors = {
      'NOT_STARTED': 'bg-gray-100 text-gray-800',
      'ON_TRACK': 'bg-green-100 text-green-800',
      'AT_RISK': 'bg-yellow-100 text-yellow-800',
      'BLOCKED': 'bg-red-100 text-red-800',
      'COMPLETED': 'bg-blue-100 text-blue-800',
    };
    return colors[status] || 'bg-gray-100 text-gray-800';
  };

  // Filter functions for each level
  const filterTransitions = (transitions: EnhancedTransition[]) => {
    return transitions.filter(transition => {
      const matchesSearch = !searchQuery || 
        transition.name?.toLowerCase().includes(searchQuery.toLowerCase()) ||
        transition.description?.toLowerCase().includes(searchQuery.toLowerCase()) ||
        transition.contract?.businessOperation?.name?.toLowerCase().includes(searchQuery.toLowerCase());
      
      const matchesStatus = statusFilter === 'all' || transition.status === statusFilter;
      // const matchesSource = sourceFilter === 'all' || transition.transitionSource === sourceFilter;
      
      return matchesSearch && matchesStatus; // && matchesSource;
    });
  };

  const filteredMajorTransitions = filterTransitions(majorTransitions);
  const filteredPersonnelTransitions = filterTransitions(personnelTransitions);
  const filteredOperationalChanges = filterTransitions(operationalChanges);

  if (loading) {
    return (
      <div className="container mx-auto px-4 py-8">
        <div className="flex justify-center items-center h-64">
          <div className="text-lg text-muted-foreground">Loading transitions...</div>
        </div>
      </div>
    );
  }

  return (
    <div className="container mx-auto px-4 py-8">
      <div className="flex justify-between items-center mb-8">
        <div>
          <h1 className="text-3xl font-bold mb-2">Transitions</h1>
          <p className="text-muted-foreground">
            Manage organizational transitions across all levels
          </p>
        </div>
      </div>

      {error && (
        <div className="bg-red-100 border border-red-400 text-red-700 px-4 py-3 rounded mb-6">
          Error: {error}
        </div>
      )}

      <TransitionFilters
        searchQuery={searchQuery}
        onSearchChange={setSearchQuery}
        statusFilter={statusFilter}
        onStatusFilterChange={setStatusFilter}
        sourceFilter={sourceFilter}
        onSourceFilterChange={setSourceFilter}
        showSourceFilter={activeLevel !== 'major'}
      />

      <Tabs value={activeLevel} onValueChange={(value) => setActiveLevel(value as 'major' | 'personnel' | 'operational')} className="w-full">
        <TabsList className="mb-6">
          <TabsTrigger value="major" className="flex items-center gap-2">
            <Building className="h-4 w-4" />
            Major Transitions ({transitionCounts.major})
          </TabsTrigger>
          <TabsTrigger value="personnel" className="flex items-center gap-2">
            <Users className="h-4 w-4" />
            Personnel Transitions ({transitionCounts.personnel})
          </TabsTrigger>
          <TabsTrigger value="operational" className="flex items-center gap-2">
            <Settings className="h-4 w-4" />
            Operational Changes ({transitionCounts.operational})
          </TabsTrigger>
        </TabsList>

        <TabsContent value="major">
          <div className="grid gap-4">
            {filteredMajorTransitions.length === 0 ? (
              <Card>
                <CardContent className="p-8 text-center">
                  <p className="text-muted-foreground">
                    {searchQuery || statusFilter !== 'all' ? 'No major transitions found matching your criteria.' : 'No major transitions found.'}
                  </p>
                  <p className="text-sm text-muted-foreground mt-2">
                    Major transitions include organizational realignments and new contracts.
                  </p>
                </CardContent>
              </Card>
            ) : (
              filteredMajorTransitions.map((transition) => (
                <TransitionCard
                  key={transition.id}
                  transition={{ ...transition, transitionLevel: 'MAJOR' }}
                  linkPath={`/enhanced-transitions/${transition.id}`}
                />
              ))
            )}
          </div>
        </TabsContent>

        <TabsContent value="personnel">
          <div className="grid gap-4">
            {filteredPersonnelTransitions.length === 0 ? (
              <Card>
                <CardContent className="p-8 text-center">
                  <p className="text-muted-foreground">
                    {searchQuery || statusFilter !== 'all' ? 'No personnel transitions found matching your criteria.' : 'No personnel transitions found.'}
                  </p>
                  <p className="text-sm text-muted-foreground mt-2">
                    Personnel transitions include team member changes and role adjustments.
                  </p>
                </CardContent>
              </Card>
            ) : (
              filteredPersonnelTransitions.map((transition) => (
                <TransitionCard
                  key={transition.id}
                  transition={{ ...transition, transitionLevel: 'PERSONNEL' }}
                  linkPath={`/enhanced-transitions/${transition.id}`}
                />
              ))
            )}
          </div>
        </TabsContent>

        <TabsContent value="operational">
          <div className="grid gap-4">
            {filteredOperationalChanges.length === 0 ? (
              <Card>
                <CardContent className="p-8 text-center">
                  <p className="text-muted-foreground">
                    {searchQuery || statusFilter !== 'all' ? 'No operational changes found matching your criteria.' : 'No operational changes found.'}
                  </p>
                  <p className="text-sm text-muted-foreground mt-2">
                    Operational changes include process improvements and enhancement requests.
                  </p>
                </CardContent>
              </Card>
            ) : (
              filteredOperationalChanges.map((transition) => (
                <TransitionCard
                  key={transition.id}
                  transition={{ ...transition, transitionLevel: 'OPERATIONAL' }}
                  linkPath={`/enhanced-transitions/${transition.id}`}
                />
              ))
            )}
          </div>
        </TabsContent>

      </Tabs>
    </div>
  );
}
