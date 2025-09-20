import { useState } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from './ui/card';
import { Button } from './ui/button';
import { Badge } from './ui/badge';
import { Progress } from './ui/progress';
import { Alert, AlertDescription } from './ui/alert';
import { 
  Calendar, 
  Bell, 
  TrendingUp, 
  Clock, 
  CheckCircle, 
  XCircle, 
  AlertTriangle,
  Users,
  FileText,
  MessageSquare,
  Brain,
  Database,
  GitBranch,
  Ticket
} from 'lucide-react';
import { Tabs, TabsContent, TabsList, TabsTrigger } from './ui/tabs';

interface WeeklyCurationData {
  weekStarting: string;
  weekEnding: string;
  totalInbound: number;
  pendingApprovals: number;
  factsApproved: number;
  factsRejected: number;
  revisionCycles: number;
  alerts: Alert[];
  sourceUpdates: SourceUpdate[];
  curationProgress: number;
}

interface Alert {
  id: string;
  type: 'info' | 'warning' | 'error';
  message: string;
  timestamp: string;
  source: string;
}

interface SourceUpdate {
  id: string;
  source: 'ServiceNow' | 'ADO' | 'Documents' | 'Communications';
  type: string;
  count: number;
  lastUpdate: string;
  status: 'active' | 'syncing' | 'error';
}

export function WeeklyCuration() {
  const [currentWeek] = useState<WeeklyCurationData>({
    weekStarting: '2024-01-15',
    weekEnding: '2024-01-21',
    totalInbound: 147,
    pendingApprovals: 23,
    factsApproved: 89,
    factsRejected: 12,
    revisionCycles: 8,
    curationProgress: 78,
    alerts: [
      {
        id: '1',
        type: 'warning',
        message: 'High volume of ServiceNow tickets detected (32 new tickets)',
        timestamp: '2024-01-16T10:30:00',
        source: 'ServiceNow API'
      },
      {
        id: '2',
        type: 'info',
        message: 'ADO sync completed - 15 new epics, 28 features, 45 stories',
        timestamp: '2024-01-16T09:15:00',
        source: 'ADO API'
      },
      {
        id: '3',
        type: 'error',
        message: 'Communication processing delayed - 5 items pending review',
        timestamp: '2024-01-16T08:45:00',
        source: 'Communication Processor'
      }
    ],
    sourceUpdates: [
      { id: '1', source: 'ServiceNow', type: 'Case Tickets', count: 32, lastUpdate: '2024-01-16T10:30:00', status: 'active' },
      { id: '2', source: 'ServiceNow', type: 'Change Requests', count: 8, lastUpdate: '2024-01-16T10:30:00', status: 'active' },
      { id: '3', source: 'ADO', type: 'Epics', count: 15, lastUpdate: '2024-01-16T09:15:00', status: 'active' },
      { id: '4', source: 'ADO', type: 'Features', count: 28, lastUpdate: '2024-01-16T09:15:00', status: 'active' },
      { id: '5', source: 'ADO', type: 'Stories', count: 45, lastUpdate: '2024-01-16T09:15:00', status: 'active' },
      { id: '6', source: 'Documents', type: 'Product Docs', count: 12, lastUpdate: '2024-01-16T08:00:00', status: 'syncing' },
      { id: '7', source: 'Communications', type: 'Messages', count: 7, lastUpdate: '2024-01-16T07:30:00', status: 'error' }
    ]
  });

  const getAlertIcon = (type: Alert['type']) => {
    switch (type) {
      case 'error':
        return <XCircle className="h-4 w-4 text-red-500" />;
      case 'warning':
        return <AlertTriangle className="h-4 w-4 text-yellow-500" />;
      case 'info':
        return <Bell className="h-4 w-4 text-blue-500" />;
      default:
        return <Bell className="h-4 w-4" />;
    }
  };

  const getSourceIcon = (source: SourceUpdate['source']) => {
    switch (source) {
      case 'ServiceNow':
        return <Ticket className="h-4 w-4 text-purple-500" />;
      case 'ADO':
        return <GitBranch className="h-4 w-4 text-blue-500" />;
      case 'Documents':
        return <FileText className="h-4 w-4 text-green-500" />;
      case 'Communications':
        return <MessageSquare className="h-4 w-4 text-orange-500" />;
      default:
        return <Database className="h-4 w-4" />;
    }
  };

  const getStatusBadge = (status: SourceUpdate['status']) => {
    switch (status) {
      case 'active':
        return <Badge variant="default" className="bg-green-100 text-green-800 hover:bg-green-100">Active</Badge>;
      case 'syncing':
        return <Badge variant="secondary">Syncing</Badge>;
      case 'error':
        return <Badge variant="destructive">Error</Badge>;
      default:
        return <Badge variant="secondary">Unknown</Badge>;
    }
  };

  const formatTimeAgo = (dateString: string) => {
    const date = new Date(dateString);
    const now = new Date();
    const diffInMinutes = Math.floor((now.getTime() - date.getTime()) / (1000 * 60));
    
    if (diffInMinutes < 60) {
      return `${diffInMinutes}m ago`;
    } else if (diffInMinutes < 1440) {
      return `${Math.floor(diffInMinutes / 60)}h ago`;
    } else {
      return `${Math.floor(diffInMinutes / 1440)}d ago`;
    }
  };

  return (
    <div className="p-6 h-full overflow-auto">
      <div className="max-w-7xl mx-auto space-y-6">
        <div className="flex justify-between items-start">
          <div>
            <h2 className="text-2xl font-semibold mb-2">Weekly Curation Dashboard</h2>
            <p className="text-muted-foreground">
              Week of {currentWeek.weekStarting} - {currentWeek.weekEnding}
            </p>
          </div>
          <div className="flex space-x-2">
            <Button variant="outline">
              <Calendar className="mr-2 h-4 w-4" />
              Previous Week
            </Button>
            <Button>
              <TrendingUp className="mr-2 h-4 w-4" />
              Generate Report
            </Button>
          </div>
        </div>

        {/* Key Metrics */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
          <Card>
            <CardContent className="p-4">
              <div className="flex items-center space-x-2">
                <Bell className="h-5 w-5 text-blue-500" />
                <div>
                  <p className="text-sm font-medium">Total Inbound</p>
                  <p className="text-2xl font-bold">{currentWeek.totalInbound}</p>
                  <p className="text-xs text-muted-foreground">+12% from last week</p>
                </div>
              </div>
            </CardContent>
          </Card>
          
          <Card>
            <CardContent className="p-4">
              <div className="flex items-center space-x-2">
                <Clock className="h-5 w-5 text-orange-500" />
                <div>
                  <p className="text-sm font-medium">Pending Approvals</p>
                  <p className="text-2xl font-bold">{currentWeek.pendingApprovals}</p>
                  <p className="text-xs text-muted-foreground">-8% from last week</p>
                </div>
              </div>
            </CardContent>
          </Card>
          
          <Card>
            <CardContent className="p-4">
              <div className="flex items-center space-x-2">
                <CheckCircle className="h-5 w-5 text-green-500" />
                <div>
                  <p className="text-sm font-medium">Facts Approved</p>
                  <p className="text-2xl font-bold">{currentWeek.factsApproved}</p>
                  <p className="text-xs text-muted-foreground">+15% from last week</p>
                </div>
              </div>
            </CardContent>
          </Card>
          
          <Card>
            <CardContent className="p-4">
              <div className="flex items-center space-x-2">
                <Brain className="h-5 w-5 text-purple-500" />
                <div>
                  <p className="text-sm font-medium">Revision Cycles</p>
                  <p className="text-2xl font-bold">{currentWeek.revisionCycles}</p>
                  <p className="text-xs text-muted-foreground">-3% from last week</p>
                </div>
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Curation Progress */}
        <Card>
          <CardHeader>
            <CardTitle>Weekly Curation Progress</CardTitle>
            <CardDescription>Current week's knowledge curation completion status</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              <div className="flex items-center justify-between">
                <span className="text-sm font-medium">Overall Progress</span>
                <span className="text-sm font-medium">{currentWeek.curationProgress}%</span>
              </div>
              <Progress value={currentWeek.curationProgress} className="h-3" />
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mt-4">
                <div className="text-center p-3 bg-muted/50 rounded-lg">
                  <p className="text-sm text-muted-foreground">Approved</p>
                  <p className="text-lg font-semibold text-green-600">{currentWeek.factsApproved}</p>
                </div>
                <div className="text-center p-3 bg-muted/50 rounded-lg">
                  <p className="text-sm text-muted-foreground">Pending</p>
                  <p className="text-lg font-semibold text-orange-600">{currentWeek.pendingApprovals}</p>
                </div>
                <div className="text-center p-3 bg-muted/50 rounded-lg">
                  <p className="text-sm text-muted-foreground">Rejected</p>
                  <p className="text-lg font-semibold text-red-600">{currentWeek.factsRejected}</p>
                </div>
              </div>
            </div>
          </CardContent>
        </Card>

        <Tabs defaultValue="alerts" className="space-y-4">
          <TabsList>
            <TabsTrigger value="alerts">Communication Alerts</TabsTrigger>
            <TabsTrigger value="sources">Source Updates</TabsTrigger>
          </TabsList>

          <TabsContent value="alerts">
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center space-x-2">
                  <Bell className="h-5 w-5" />
                  <span>Communication Alerts</span>
                  <Badge variant="secondary">{currentWeek.alerts.length}</Badge>
                </CardTitle>
                <CardDescription>
                  Recent alerts and notifications from knowledge sources
                </CardDescription>
              </CardHeader>
              <CardContent>
                <div className="space-y-4">
                  {currentWeek.alerts.map((alert) => (
                    <Alert key={alert.id}>
                      <div className="flex items-start space-x-3">
                        {getAlertIcon(alert.type)}
                        <div className="flex-1">
                          <AlertDescription className="font-medium">
                            {alert.message}
                          </AlertDescription>
                          <div className="flex items-center space-x-4 mt-2 text-sm text-muted-foreground">
                            <span>{alert.source}</span>
                            <span>•</span>
                            <span>{formatTimeAgo(alert.timestamp)}</span>
                          </div>
                        </div>
                      </div>
                    </Alert>
                  ))}
                </div>
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="sources">
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center space-x-2">
                  <Database className="h-5 w-5" />
                  <span>Knowledge Source Updates</span>
                </CardTitle>
                <CardDescription>
                  Latest updates from integrated knowledge sources
                </CardDescription>
              </CardHeader>
              <CardContent>
                <div className="space-y-4">
                  {currentWeek.sourceUpdates.map((update) => (
                    <div key={update.id} className="flex items-center justify-between p-4 border rounded-lg">
                      <div className="flex items-center space-x-4">
                        {getSourceIcon(update.source)}
                        <div>
                          <p className="font-medium">{update.source} - {update.type}</p>
                          <p className="text-sm text-muted-foreground">
                            {update.count} new items • Last updated {formatTimeAgo(update.lastUpdate)}
                          </p>
                        </div>
                      </div>
                      <div className="flex items-center space-x-2">
                        {getStatusBadge(update.status)}
                        <Button variant="outline" size="sm">
                          View Details
                        </Button>
                      </div>
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>
          </TabsContent>
        </Tabs>
      </div>
    </div>
  );
}