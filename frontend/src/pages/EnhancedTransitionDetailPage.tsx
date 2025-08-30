import { useState, useEffect } from "react";
import { useParams, Link } from "react-router-dom";
import { enhancedTransitionApi, EnhancedTransition } from "@/services/api";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Separator } from "@/components/ui/separator";
import { EditTransitionDialog } from "@/components/EditTransitionDialog";
import { 
  ArrowLeft, 
  Calendar, 
  Clock, 
  Building, 
  User, 
  FileText,
  CheckCircle,
  AlertCircle,
  Users
} from "lucide-react";

export function EnhancedTransitionDetailPage() {
  const { id } = useParams<{ id: string }>();
  const [transition, setTransition] = useState<EnhancedTransition | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const userRole = "director"; // TODO: Get from user context/auth

  useEffect(() => {
    if (id) {
      fetchTransitionDetails();
    }
  }, [id]);

  const fetchTransitionDetails = async () => {
    if (!id) return;
    
    try {
      setLoading(true);
      setError(null);
      
      const response = await enhancedTransitionApi.getById(id);
      setTransition(response);
    } catch (err) {
      console.error('Failed to fetch transition details:', err);
      setError(err instanceof Error ? err.message : 'Failed to fetch transition details');
    } finally {
      setLoading(false);
    }
  };

  const handleTransitionUpdated = (updatedTransition: EnhancedTransition) => {
    setTransition(updatedTransition);
    // Optionally refresh the data
    fetchTransitionDetails();
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

  const getStatusIcon = (status: EnhancedTransition['status']) => {
    switch (status) {
      case 'COMPLETED':
        return <CheckCircle className="h-4 w-4" />;
      case 'BLOCKED':
      case 'AT_RISK':
        return <AlertCircle className="h-4 w-4" />;
      default:
        return <Clock className="h-4 w-4" />;
    }
  };

  if (loading) {
    return (
      <div className="container mx-auto px-4 py-8">
        <div className="flex justify-center items-center h-64">
          <div className="text-lg text-muted-foreground">Loading transition details...</div>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="container mx-auto px-4 py-8">
        <div className="flex items-center gap-4 mb-8">
          <Link to="/transitions">
            <Button variant="outline" size="sm">
              <ArrowLeft className="h-4 w-4 mr-2" />
              Back to Transitions
            </Button>
          </Link>
        </div>
        <div className="bg-red-100 border border-red-400 text-red-700 px-4 py-3 rounded">
          Error: {error}
        </div>
      </div>
    );
  }

  if (!transition) {
    return (
      <div className="container mx-auto px-4 py-8">
        <div className="flex items-center gap-4 mb-8">
          <Link to="/transitions">
            <Button variant="outline" size="sm">
              <ArrowLeft className="h-4 w-4 mr-2" />
              Back to Transitions
            </Button>
          </Link>
        </div>
        <div className="text-center py-12">
          <p className="text-muted-foreground">Transition not found.</p>
        </div>
      </div>
    );
  }

  return (
    <div className="container mx-auto px-4 py-8">
      <div className="flex items-center justify-between mb-8">
        <Link to="/transitions">
          <Button variant="outline" size="sm">
            <ArrowLeft className="h-4 w-4 mr-2" />
            Back to Transitions
          </Button>
        </Link>
        
        {transition && (
          <EditTransitionDialog
            transition={transition}
            onTransitionUpdated={handleTransitionUpdated}
            userRole={userRole}
          />
        )}
      </div>

      <div className="grid gap-6">
        {/* Header */}
        <Card>
          <CardHeader>
            <div className="flex justify-between items-start">
              <div>
                <CardTitle className="text-2xl mb-2">
                  {transition.name || 'Unnamed Transition'}
                </CardTitle>
                {transition.description && (
                  <p className="text-muted-foreground">{transition.description}</p>
                )}
              </div>
              <Badge className={`${getStatusColor(transition.status)} flex items-center gap-1`}>
                {getStatusIcon(transition.status)}
                {transition.status.replace('_', ' ')}
              </Badge>
            </div>
          </CardHeader>
        </Card>

        <div className="grid gap-6 md:grid-cols-2">
          {/* Contract & Business Operation */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Building className="h-5 w-5" />
                Contract & Business Operation
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              {transition.contract && (
                <>
                  <div>
                    <div className="text-sm font-medium">Contract</div>
                    <Link
                      to={`/contracts/${transition.contract.id}`}
                      className="text-primary hover:underline"
                    >
                      {transition.contract.contractName}
                    </Link>
                    <div className="text-xs text-muted-foreground">
                      {transition.contract.contractNumber}
                    </div>
                  </div>
                  {transition.contract.businessOperation && (
                    <>
                      <Separator />
                      <div>
                        <div className="text-sm font-medium">Business Operation</div>
                        <Link
                          to={`/business-operations/${transition.contract.businessOperation.id}`}
                          className="text-primary hover:underline"
                        >
                          {transition.contract.businessOperation.name}
                        </Link>
                        <div className="text-xs text-muted-foreground">
                          {transition.contract.businessOperation.businessFunction}
                        </div>
                      </div>
                    </>
                  )}
                </>
              )}
            </CardContent>
          </Card>

          {/* Timeline */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Calendar className="h-5 w-5" />
                Timeline
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div>
                <div className="text-sm font-medium">Start Date</div>
                <div className="text-muted-foreground">
                  {new Date(transition.startDate).toLocaleDateString()}
                </div>
              </div>
              <Separator />
              <div>
                <div className="text-sm font-medium">End Date</div>
                <div className="text-muted-foreground">
                  {new Date(transition.endDate).toLocaleDateString()}
                </div>
              </div>
              <Separator />
              <div>
                <div className="text-sm font-medium">Duration</div>
                <div className="text-muted-foreground">
                  {transition.duration.replace('_', ' ').toLowerCase()}
                </div>
              </div>
            </CardContent>
          </Card>
        </div>

        <div className="grid gap-6 md:grid-cols-2">
          {/* Key Personnel & Settings */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <User className="h-5 w-5" />
                Personnel & Settings
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              {transition.keyPersonnel && (
                <div>
                  <div className="text-sm font-medium">Key Personnel</div>
                  <div className="text-muted-foreground">{transition.keyPersonnel}</div>
                </div>
              )}
              {transition.keyPersonnel && <Separator />}
              <div>
                <div className="text-sm font-medium">Requires Continuous Service</div>
                <div className="text-muted-foreground">
                  {transition.requiresContinuousService ? 'Yes' : 'No'}
                </div>
              </div>
              {transition.creator && (
                <>
                  <Separator />
                  <div>
                    <div className="text-sm font-medium">Created By</div>
                    <div className="text-muted-foreground">
                      {transition.creator.person?.firstName} {transition.creator.person?.lastName}
                    </div>
                    <div className="text-xs text-muted-foreground">
                      {transition.creator.person?.primaryEmail}
                    </div>
                  </div>
                </>
              )}
            </CardContent>
          </Card>

          {/* Milestones */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <CheckCircle className="h-5 w-5" />
                Milestones
                {transition._count?.milestones && (
                  <Badge variant="secondary">{transition._count.milestones}</Badge>
                )}
              </CardTitle>
            </CardHeader>
            <CardContent>
              {transition.milestones && transition.milestones.length > 0 ? (
                <div className="space-y-2">
                  {transition.milestones.map((milestone, index) => (
                    <div key={milestone.id || index} className="flex items-center gap-2 text-sm">
                      <CheckCircle className="h-4 w-4 text-green-600" />
                      <span>{milestone.title}</span>
                    </div>
                  ))}
                </div>
              ) : (
                <p className="text-sm text-muted-foreground">
                  No milestones defined for this transition.
                </p>
              )}
            </CardContent>
          </Card>
        </div>

        {/* Additional Details */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <FileText className="h-5 w-5" />
              Additional Information
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="grid gap-4 md:grid-cols-2">
              <div>
                <div className="text-sm font-medium">Created</div>
                <div className="text-muted-foreground">
                  {new Date(transition.createdAt).toLocaleDateString()} at{' '}
                  {new Date(transition.createdAt).toLocaleTimeString()}
                </div>
              </div>
              <div>
                <div className="text-sm font-medium">Last Updated</div>
                <div className="text-muted-foreground">
                  {new Date(transition.updatedAt).toLocaleDateString()} at{' '}
                  {new Date(transition.updatedAt).toLocaleTimeString()}
                </div>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}