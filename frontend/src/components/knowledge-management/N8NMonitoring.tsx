import { useState, useEffect } from 'react';
import { WorkflowExecution, WorkflowMetrics } from '../../types/n8n';
import { getExecutions, getMetrics } from '../../services/n8nApi';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '../ui/card';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '../ui/table';
import { Badge } from '../ui/badge';
import { Button } from '../ui/button';
import { ExternalLink, RefreshCw, CheckCircle, XCircle, Loader2 } from 'lucide-react';

const POLL_INTERVAL = 10000; // 10 seconds

export const N8NMonitoring = () => {
  const [executions, setExecutions] = useState<WorkflowExecution[]>([]);
  const [metrics, setMetrics] = useState<WorkflowMetrics | null>(null);
  const [loading, setLoading] = useState<boolean>(true);
  const [error, setError] = useState<string | null>(null);
  const [dateFilter, setDateFilter] = useState<string>('7d'); // 7d, 30d, all
  const [statusFilter, setStatusFilter] = useState<string>('all'); // all, success, failed, running

  /**
   * Fetch executions and metrics from API
   */
  const fetchData = async () => {
    try {
      setError(null);
      const [executionsData, metricsData] = await Promise.all([
        getExecutions(),
        getMetrics(),
      ]);

      setExecutions(executionsData);
      setMetrics(metricsData);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to fetch data');
      console.error('Error fetching n8n data:', err);
    } finally {
      setLoading(false);
    }
  };

  /**
   * Initial fetch and polling setup
   */
  useEffect(() => {
    fetchData();

    const intervalId = setInterval(fetchData, POLL_INTERVAL);

    return () => clearInterval(intervalId);
  }, []);

  /**
   * Filter executions based on date and status
   */
  const filteredExecutions = executions.filter((execution) => {
    // Status filter
    if (statusFilter !== 'all' && execution.status !== statusFilter) {
      return false;
    }

    // Date filter
    if (dateFilter !== 'all') {
      const now = new Date();
      const executionDate = new Date(execution.startedAt);
      const daysAgo = dateFilter === '7d' ? 7 : 30;
      const cutoffDate = new Date(now.getTime() - daysAgo * 24 * 60 * 60 * 1000);

      if (executionDate < cutoffDate) {
        return false;
      }
    }

    return true;
  });

  /**
   * Format duration in seconds to human-readable format
   */
  const formatDuration = (durationMs?: number): string => {
    if (!durationMs) return 'N/A';
    const seconds = Math.floor(durationMs / 1000);
    if (seconds < 60) return `${seconds}s`;
    const minutes = Math.floor(seconds / 60);
    const remainingSeconds = seconds % 60;
    return `${minutes}m ${remainingSeconds}s`;
  };

  /**
   * Get status badge variant and icon
   */
  const getStatusBadge = (status: WorkflowExecution['status']) => {
    switch (status) {
      case 'success':
        return { variant: 'default' as const, icon: <CheckCircle className="w-3 h-3" />, color: 'text-green-500' };
      case 'failed':
        return { variant: 'destructive' as const, icon: <XCircle className="w-3 h-3" />, color: 'text-red-500' };
      case 'running':
        return { variant: 'secondary' as const, icon: <Loader2 className="w-3 h-3 animate-spin" />, color: 'text-blue-500' };
      default:
        return { variant: 'outline' as const, icon: null, color: 'text-gray-500' };
    }
  };

  /**
   * Format timestamp to local string
   */
  const formatTimestamp = (date: Date): string => {
    return new Date(date).toLocaleString();
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center p-8">
        <Loader2 className="w-8 h-8 animate-spin text-gray-500" />
        <span className="ml-2 text-gray-600">Loading workflow data...</span>
      </div>
    );
  }

  if (error) {
    return (
      <div className="p-8 text-center">
        <p className="text-red-600 mb-4">{error}</p>
        <Button onClick={fetchData} variant="outline">
          <RefreshCw className="w-4 h-4 mr-2" />
          Retry
        </Button>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Metrics Cards */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <Card>
          <CardHeader className="pb-2">
            <CardDescription>Total Executions</CardDescription>
            <CardTitle className="text-3xl">{metrics?.totalExecutions || 0}</CardTitle>
          </CardHeader>
        </Card>

        <Card>
          <CardHeader className="pb-2">
            <CardDescription>Success Rate</CardDescription>
            <CardTitle className="text-3xl text-green-600">
              {metrics?.successRate ? `${metrics.successRate.toFixed(1)}%` : '0%'}
            </CardTitle>
          </CardHeader>
        </Card>

        <Card>
          <CardHeader className="pb-2">
            <CardDescription>Avg Duration</CardDescription>
            <CardTitle className="text-3xl">
              {formatDuration(metrics?.avgDuration)}
            </CardTitle>
          </CardHeader>
        </Card>

        <Card>
          <CardHeader className="pb-2">
            <CardDescription>Failure Rate</CardDescription>
            <CardTitle className="text-3xl text-red-600">
              {metrics?.failureRate ? `${metrics.failureRate.toFixed(1)}%` : '0%'}
            </CardTitle>
          </CardHeader>
        </Card>
      </div>

      {/* Filters and Actions */}
      <Card>
        <CardHeader>
          <div className="flex justify-between items-center">
            <div>
              <CardTitle>Workflow Executions</CardTitle>
              <CardDescription>Recent n8n workflow processing history</CardDescription>
            </div>
            <Button onClick={fetchData} variant="outline" size="sm">
              <RefreshCw className="w-4 h-4 mr-2" />
              Refresh
            </Button>
          </div>

          {/* Filters */}
          <div className="flex gap-4 mt-4">
            <div className="flex gap-2">
              <Button
                variant={dateFilter === '7d' ? 'default' : 'outline'}
                size="sm"
                onClick={() => setDateFilter('7d')}
              >
                Last 7 Days
              </Button>
              <Button
                variant={dateFilter === '30d' ? 'default' : 'outline'}
                size="sm"
                onClick={() => setDateFilter('30d')}
              >
                Last 30 Days
              </Button>
              <Button
                variant={dateFilter === 'all' ? 'default' : 'outline'}
                size="sm"
                onClick={() => setDateFilter('all')}
              >
                All Time
              </Button>
            </div>

            <div className="flex gap-2">
              <Button
                variant={statusFilter === 'all' ? 'default' : 'outline'}
                size="sm"
                onClick={() => setStatusFilter('all')}
              >
                All Status
              </Button>
              <Button
                variant={statusFilter === 'success' ? 'default' : 'outline'}
                size="sm"
                onClick={() => setStatusFilter('success')}
              >
                Success
              </Button>
              <Button
                variant={statusFilter === 'failed' ? 'default' : 'outline'}
                size="sm"
                onClick={() => setStatusFilter('failed')}
              >
                Failed
              </Button>
              <Button
                variant={statusFilter === 'running' ? 'default' : 'outline'}
                size="sm"
                onClick={() => setStatusFilter('running')}
              >
                Running
              </Button>
            </div>
          </div>
        </CardHeader>

        <CardContent>
          {/* Executions Table */}
          {filteredExecutions.length === 0 ? (
            <div className="text-center py-8 text-gray-500">
              No workflow executions found matching the selected filters.
            </div>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Document</TableHead>
                  <TableHead>Started At</TableHead>
                  <TableHead>Duration</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead>Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {filteredExecutions.map((execution) => {
                  const statusConfig = getStatusBadge(execution.status);
                  return (
                    <TableRow key={execution.id}>
                      <TableCell className="font-medium">
                        {execution.documentName}
                      </TableCell>
                      <TableCell>{formatTimestamp(execution.startedAt)}</TableCell>
                      <TableCell>{formatDuration(execution.duration)}</TableCell>
                      <TableCell>
                        <Badge variant={statusConfig.variant} className="flex items-center gap-1 w-fit">
                          {statusConfig.icon}
                          <span className="capitalize">{execution.status}</span>
                        </Badge>
                        {execution.error && (
                          <p className="text-xs text-red-600 mt-1">{execution.error}</p>
                        )}
                      </TableCell>
                      <TableCell>
                        <a
                          href={`http://n8n.tip.localhost/workflow/${execution.n8nWorkflowId}/executions/${execution.id}`}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="inline-flex items-center text-blue-600 hover:text-blue-800 text-sm"
                        >
                          View in n8n
                          <ExternalLink className="w-3 h-3 ml-1" />
                        </a>
                      </TableCell>
                    </TableRow>
                  );
                })}
              </TableBody>
            </Table>
          )}
        </CardContent>
      </Card>
    </div>
  );
};
