import { useAuth } from "@/_core/hooks/useAuth";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { trpc } from "@/lib/trpc";
import { Database, RefreshCw, Loader2, CheckCircle, XCircle, Eye } from "lucide-react";
import { toast } from "sonner";
import { useState } from "react";
import { formatDistanceToNow } from "date-fns";

export default function Admin() {
  const { user, loading: authLoading, isAuthenticated } = useAuth();
  const [selectedJobId, setSelectedJobId] = useState<number | null>(null);

  // Queries
  const { data: stats, refetch: refetchStats } = trpc.admin.getDashboardStats.useQuery(undefined, {
    enabled: isAuthenticated && user?.role === 'admin',
    refetchInterval: 5000, // Auto-refresh every 5 seconds
  });
  
  const { data: jobs, refetch: refetchJobs } = trpc.admin.getSyncJobs.useQuery(
    { limit: 20 },
    {
      enabled: isAuthenticated && user?.role === 'admin',
      refetchInterval: 5000, // Auto-refresh every 5 seconds
    }
  );
  
  const { data: logs } = trpc.admin.getJobLogs.useQuery(
    { jobId: selectedJobId! },
    { enabled: selectedJobId !== null }
  );

  // Mutations
  const syncStrains = trpc.admin.syncStrains.useMutation({
    onSuccess: () => {
      toast.success("Strain sync started successfully!");
      setTimeout(() => {
        refetchJobs();
        refetchStats();
      }, 1000);
    },
    onError: (error) => {
      toast.error(`Failed to start strain sync: ${error.message}`);
    },
  });

  const syncBrands = trpc.admin.syncBrands.useMutation({
    onSuccess: () => {
      toast.success("Brand sync started successfully!");
      setTimeout(() => {
        refetchJobs();
        refetchStats();
      }, 1000);
    },
    onError: (error) => {
      toast.error(`Failed to start brand sync: ${error.message}`);
    },
  });

  const syncManufacturers = trpc.admin.syncManufacturers.useMutation({
    onSuccess: () => {
      toast.success("Manufacturer sync started successfully!");
      setTimeout(() => {
        refetchJobs();
        refetchStats();
      }, 1000);
    },
    onError: (error) => {
      toast.error(`Failed to start manufacturer sync: ${error.message}`);
    },
  });

  const syncProducts = trpc.admin.syncProducts.useMutation({
    onSuccess: () => {
      toast.success("Products sync started successfully!");
      setTimeout(() => {
        refetchJobs();
        refetchStats();
      }, 1000);
    },
    onError: (error) => {
      toast.error(`Failed to start products sync: ${error.message}`);
    },
  });

  const syncAll = trpc.admin.syncAll.useMutation({
    onSuccess: () => {
      toast.success("Full data sync started successfully!");
      setTimeout(() => {
        refetchJobs();
        refetchStats();
      }, 1000);
    },
    onError: (error) => {
      toast.error(`Failed to start full sync: ${error.message}`);
    },
  });

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'completed':
        return 'bg-green-500/10 text-green-500';
      case 'running':
        return 'bg-blue-500/10 text-blue-500';
      case 'failed':
        return 'bg-red-500/10 text-red-500';
      default:
        return 'bg-gray-500/10 text-gray-500';
    }
  };

  const getLevelColor = (level: string) => {
    switch (level) {
      case 'error':
        return 'text-red-500';
      case 'warn':
        return 'text-yellow-500';
      default:
        return 'text-gray-500';
    }
  };

  if (authLoading) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <Loader2 className="w-8 h-8 animate-spin text-primary" />
      </div>
    );
  }

  if (!isAuthenticated || user?.role !== 'admin') {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <Card className="w-full max-w-md">
          <CardHeader>
            <CardTitle>Access Denied</CardTitle>
            <CardDescription>You must be an admin to access this page.</CardDescription>
          </CardHeader>
        </Card>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background">
      {/* Header */}
      <header className="border-b border-border bg-card">
        <div className="container mx-auto px-4 py-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-lg bg-primary/10 flex items-center justify-center">
                <Database className="w-6 h-6 text-primary" />
              </div>
              <div>
                <h1 className="text-2xl font-bold">Admin Dashboard</h1>
                <p className="text-sm text-muted-foreground">Data Sync & Monitoring</p>
              </div>
            </div>
            <div className="text-sm text-muted-foreground">
              {user?.name}
            </div>
          </div>
        </div>
      </header>

      {/* Main Content */}
      <main className="container mx-auto px-4 py-8">
        <div className="grid gap-6">
          {/* Data Freshness Stats */}
          <div className="grid gap-4 md:grid-cols-3">
            <Card>
              <CardHeader className="pb-3">
                <CardTitle className="text-lg">Cannabis Strains</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="text-3xl font-bold text-green-600">
                  {stats?.strains.count || 0}
                </div>
                <p className="text-xs text-muted-foreground mt-2">
                  Last synced: {stats?.strains.lastSync 
                    ? formatDistanceToNow(new Date(stats.strains.lastSync), { addSuffix: true }) 
                    : 'Never'}
                </p>
              </CardContent>
            </Card>

            <Card>
              <CardHeader className="pb-3">
                <CardTitle className="text-lg">Brands</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="text-3xl font-bold text-blue-600">
                  {stats?.brands.count || 0}
                </div>
                <p className="text-xs text-muted-foreground mt-2">
                  Last synced: {stats?.brands.lastSync 
                    ? formatDistanceToNow(new Date(stats.brands.lastSync), { addSuffix: true }) 
                    : 'Never'}
                </p>
              </CardContent>
            </Card>

            <Card>
              <CardHeader className="pb-3">
                <CardTitle className="text-lg">Manufacturers</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="text-3xl font-bold text-purple-600">
                  {stats?.manufacturers.count || 0}
                </div>
                <p className="text-xs text-muted-foreground mt-2">
                  Last synced: {stats?.manufacturers.lastSync 
                    ? formatDistanceToNow(new Date(stats.manufacturers.lastSync), { addSuffix: true }) 
                    : 'Never'}
                </p>
              </CardContent>
            </Card>
          </div>

          {/* Sync Controls */}
          <Card>
            <CardHeader>
              <CardTitle>Sync Controls</CardTitle>
              <CardDescription>
                Manually trigger data synchronization from weed.de Metabase
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-5">
                <Button
                  onClick={() => syncStrains.mutate()}
                  disabled={syncStrains.isPending}
                  variant="outline"
                  className="w-full"
                >
                  {syncStrains.isPending ? (
                    <>
                      <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                      Starting...
                    </>
                  ) : (
                    <>
                      <RefreshCw className="w-4 h-4 mr-2" />
                      Sync Strains
                    </>
                  )}
                </Button>

                <Button
                  onClick={() => syncBrands.mutate()}
                  disabled={syncBrands.isPending}
                  variant="outline"
                  className="w-full"
                >
                  {syncBrands.isPending ? (
                    <>
                      <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                      Starting...
                    </>
                  ) : (
                    <>
                      <RefreshCw className="w-4 h-4 mr-2" />
                      Sync Brands
                    </>
                  )}
                </Button>

                <Button
                  onClick={() => syncManufacturers.mutate()}
                  disabled={syncManufacturers.isPending}
                  variant="outline"
                  className="w-full"
                >
                  {syncManufacturers.isPending ? (
                    <>
                      <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                      Starting...
                    </>
                  ) : (
                    <>
                      <RefreshCw className="w-4 h-4 mr-2" />
                      Sync Manufacturers
                    </>
                  )}
                </Button>

                <Button
                  onClick={() => syncProducts.mutate()}
                  disabled={syncProducts.isPending}
                  variant="outline"
                  className="w-full"
                >
                  {syncProducts.isPending ? (
                    <>
                      <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                      Starting...
                    </>
                  ) : (
                    <>
                      <RefreshCw className="w-4 h-4 mr-2" />
                      Sync Products
                    </>
                  )}
                </Button>

                <Button
                  onClick={() => syncAll.mutate()}
                  disabled={syncAll.isPending}
                  variant="default"
                  className="w-full"
                >
                  {syncAll.isPending ? (
                    <>
                      <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                      Starting...
                    </>
                  ) : (
                    <>
                      <RefreshCw className="w-4 h-4 mr-2" />
                      Sync All Data
                    </>
                  )}
                </Button>
              </div>
            </CardContent>
          </Card>

          {/* Recent Sync Jobs */}
          <Card>
            <CardHeader>
              <div className="flex justify-between items-center">
                <div>
                  <CardTitle>Recent Sync Jobs</CardTitle>
                  <CardDescription>View status and logs of recent sync operations</CardDescription>
                </div>
                <Button
                  onClick={() => refetchJobs()}
                  variant="ghost"
                  size="sm"
                >
                  <RefreshCw className="w-4 h-4 mr-2" />
                  Refresh
                </Button>
              </div>
            </CardHeader>
            <CardContent>
              <div className="overflow-x-auto">
                <table className="w-full">
                  <thead>
                    <tr className="border-b text-left text-sm text-muted-foreground">
                      <th className="pb-3 font-medium">Job Name</th>
                      <th className="pb-3 font-medium">Status</th>
                      <th className="pb-3 font-medium">Progress</th>
                      <th className="pb-3 font-medium">Started</th>
                      <th className="pb-3 font-medium">Actions</th>
                    </tr>
                  </thead>
                  <tbody>
                    {jobs?.map((job) => (
                      <tr key={job.id} className="border-b last:border-0">
                        <td className="py-3 font-medium">{job.jobName}</td>
                        <td className="py-3">
                          <span className={`px-2 py-1 text-xs font-semibold rounded ${getStatusColor(job.status)}`}>
                            {job.status}
                          </span>
                        </td>
                        <td className="py-3 text-sm text-muted-foreground">
                          {job.processedCount}/{job.totalCount}
                        </td>
                        <td className="py-3 text-sm text-muted-foreground">
                          {job.startedAt ? formatDistanceToNow(new Date(job.startedAt), { addSuffix: true }) : '-'}
                        </td>
                        <td className="py-3">
                          <Button
                            onClick={() => setSelectedJobId(job.id)}
                            variant="ghost"
                            size="sm"
                          >
                            <Eye className="w-4 h-4 mr-1" />
                            View Logs
                          </Button>
                        </td>
                      </tr>
                    ))}
                    {(!jobs || jobs.length === 0) && (
                      <tr>
                        <td colSpan={5} className="py-8 text-center text-muted-foreground">
                          No sync jobs yet. Click a sync button above to start.
                        </td>
                      </tr>
                    )}
                  </tbody>
                </table>
              </div>
            </CardContent>
          </Card>
        </div>
      </main>

      {/* Log Viewer Modal */}
      {selectedJobId && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center p-4 z-50">
          <Card className="w-full max-w-4xl max-h-[80vh] overflow-hidden">
            <CardHeader className="border-b">
              <div className="flex justify-between items-center">
                <div>
                  <CardTitle>Job Logs</CardTitle>
                  <CardDescription>Job ID: {selectedJobId}</CardDescription>
                </div>
                <Button
                  onClick={() => setSelectedJobId(null)}
                  variant="ghost"
                  size="sm"
                >
                  ✕
                </Button>
              </div>
            </CardHeader>
            <CardContent className="p-6 overflow-y-auto max-h-[60vh]">
              {logs && logs.length > 0 ? (
                <div className="space-y-2 font-mono text-sm">
                  {logs.map((log) => (
                    <div key={log.id} className="flex gap-4 items-start">
                      <span className="text-muted-foreground whitespace-nowrap text-xs">
                        {new Date(log.timestamp).toLocaleTimeString()}
                      </span>
                      <span className={`font-semibold uppercase text-xs ${getLevelColor(log.level)}`}>
                        [{log.level}]
                      </span>
                      <span className="flex-1 text-xs">{log.message}</span>
                    </div>
                  ))}
                </div>
              ) : (
                <p className="text-center text-muted-foreground py-8">No logs available</p>
              )}
            </CardContent>
          </Card>
        </div>
      )}
    </div>
  );
}
