import { useState, useEffect } from "react";
import { enhancedTransitionApi, EnhancedTransition } from "@/services/api";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Search, Calendar, Clock, Building } from "lucide-react";
import { Link } from "react-router-dom";

export function TransitionsPage() {
  const [enhancedTransitions, setEnhancedTransitions] = useState<EnhancedTransition[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [searchQuery, setSearchQuery] = useState('');

  useEffect(() => {
    fetchTransitions();
  }, []);

  const fetchTransitions = async () => {
    try {
      setLoading(true);
      setError(null);
      
      // Fetch enhanced transitions (contract-based)
      const enhancedResponse = await enhancedTransitionApi.getAll({
        limit: 100 // Get more transitions for the overview page
      });
      
      setEnhancedTransitions(enhancedResponse.data);
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

  const filteredEnhancedTransitions = enhancedTransitions.filter(transition =>
    transition.name?.toLowerCase().includes(searchQuery.toLowerCase()) ||
    transition.description?.toLowerCase().includes(searchQuery.toLowerCase()) ||
    transition.contract?.businessOperation?.name?.toLowerCase().includes(searchQuery.toLowerCase())
  );

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
            Manage contract transitions and operational changes
          </p>
        </div>
      </div>

      {error && (
        <div className="bg-red-100 border border-red-400 text-red-700 px-4 py-3 rounded mb-6">
          Error: {error}
        </div>
      )}

      <div className="mb-6">
        <div className="relative">
          <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-muted-foreground h-4 w-4" />
          <Input
            placeholder="Search transitions by name, description, or business operation..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="pl-10"
          />
        </div>
      </div>

      <Tabs defaultValue="contract-transitions" className="w-full">
        <TabsList className="mb-6">
          <TabsTrigger value="contract-transitions">Contract Transitions</TabsTrigger>
          <TabsTrigger value="operational-transitions">Operational Transitions</TabsTrigger>
        </TabsList>

        <TabsContent value="contract-transitions">
          <div className="grid gap-4">
            {filteredEnhancedTransitions.length === 0 ? (
              <Card>
                <CardContent className="p-8 text-center">
                  <p className="text-muted-foreground">
                    {searchQuery ? 'No contract transitions found matching your search.' : 'No contract transitions found.'}
                  </p>
                </CardContent>
              </Card>
            ) : (
              filteredEnhancedTransitions.map((transition) => (
                <Card key={transition.id} className="hover:shadow-md transition-shadow">
                  <CardHeader className="pb-3">
                    <div className="flex justify-between items-start">
                      <div className="flex-1">
                        <CardTitle className="text-lg">
                          <Link
                            to={`/enhanced-transitions/${transition.id}`}
                            className="text-primary hover:underline"
                          >
                            {transition.name || 'Unnamed Transition'}
                          </Link>
                        </CardTitle>
                        {transition.description && (
                          <p className="text-sm text-muted-foreground mt-1">
                            {transition.description}
                          </p>
                        )}
                      </div>
                      <Badge className={getStatusColor(transition.status)}>
                        {transition.status.replace('_', ' ')}
                      </Badge>
                    </div>
                  </CardHeader>
                  <CardContent className="pt-0">
                    <div className="grid grid-cols-2 md:grid-cols-4 gap-4 text-sm">
                      <div className="flex items-center gap-2">
                        <Building className="h-4 w-4 text-muted-foreground" />
                        <div>
                          <div className="font-medium">Business Operation</div>
                          <div className="text-muted-foreground">
                            {transition.contract?.businessOperation?.name || 'N/A'}
                          </div>
                        </div>
                      </div>
                      <div className="flex items-center gap-2">
                        <Calendar className="h-4 w-4 text-muted-foreground" />
                        <div>
                          <div className="font-medium">Start Date</div>
                          <div className="text-muted-foreground">
                            {new Date(transition.startDate).toLocaleDateString()}
                          </div>
                        </div>
                      </div>
                      <div className="flex items-center gap-2">
                        <Calendar className="h-4 w-4 text-muted-foreground" />
                        <div>
                          <div className="font-medium">End Date</div>
                          <div className="text-muted-foreground">
                            {new Date(transition.endDate).toLocaleDateString()}
                          </div>
                        </div>
                      </div>
                      <div className="flex items-center gap-2">
                        <Clock className="h-4 w-4 text-muted-foreground" />
                        <div>
                          <div className="font-medium">Duration</div>
                          <div className="text-muted-foreground">
                            {transition.duration.replace('_', ' ').toLowerCase()}
                          </div>
                        </div>
                      </div>
                    </div>
                    {transition.keyPersonnel && (
                      <div className="mt-3 pt-3 border-t">
                        <div className="text-sm">
                          <span className="font-medium">Key Personnel: </span>
                          <span className="text-muted-foreground">{transition.keyPersonnel}</span>
                        </div>
                      </div>
                    )}
                  </CardContent>
                </Card>
              ))
            )}
          </div>
        </TabsContent>

        <TabsContent value="operational-transitions">
          <Card>
            <CardContent className="p-8 text-center">
              <p className="text-muted-foreground">
                Operational transitions functionality coming soon.
              </p>
              <p className="text-sm text-muted-foreground mt-2">
                This will include non-contract operational changes and transitions.
              </p>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
}