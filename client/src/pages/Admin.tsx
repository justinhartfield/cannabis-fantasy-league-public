import { useAuth } from "@/_core/hooks/useAuth";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { trpc } from "@/lib/trpc";
import { Database, RefreshCw, CheckCircle, XCircle, Loader2 } from "lucide-react";
import { toast } from "sonner";

export default function Admin() {
  const { user, loading: authLoading, isAuthenticated } = useAuth();
  
  // Test Metabase connection
  const { data: connectionTest, isLoading: testLoading, refetch: testConnection } = 
    trpc.dataSync.testConnection.useQuery(undefined, {
      enabled: false, // Don't run automatically
    });

  // Manual sync mutations
  const syncAll = trpc.dataSync.syncAll.useMutation({
    onSuccess: () => {
      toast.success("Data sync completed successfully!");
    },
    onError: (error) => {
      toast.error(`Sync failed: ${error.message}`);
    },
  });

  const syncManufacturers = trpc.dataSync.syncManufacturers.useMutation({
    onSuccess: () => {
      toast.success("Manufacturers synced successfully!");
    },
    onError: (error) => {
      toast.error(`Sync failed: ${error.message}`);
    },
  });

  const syncStrains = trpc.dataSync.syncStrains.useMutation({
    onSuccess: () => {
      toast.success("Strains synced successfully!");
    },
    onError: (error) => {
      toast.error(`Sync failed: ${error.message}`);
    },
  });

  const syncPharmacies = trpc.dataSync.syncPharmacies.useMutation({
    onSuccess: () => {
      toast.success("Pharmacies synced successfully!");
    },
    onError: (error) => {
      toast.error(`Sync failed: ${error.message}`);
    },
  });

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
                <h1 className="text-2xl font-bold">Admin Panel</h1>
                <p className="text-sm text-muted-foreground">Data Sync & System Management</p>
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
          {/* Metabase Connection Test */}
          <Card>
            <CardHeader>
              <CardTitle>Metabase Connection</CardTitle>
              <CardDescription>
                Test the connection to weed.de Metabase API
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <Button
                onClick={() => testConnection()}
                disabled={testLoading}
                className="w-full sm:w-auto"
              >
                {testLoading ? (
                  <>
                    <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                    Testing Connection...
                  </>
                ) : (
                  <>
                    <RefreshCw className="w-4 h-4 mr-2" />
                    Test Connection
                  </>
                )}
              </Button>

              {connectionTest && (
                <div className={`flex items-center gap-2 p-4 rounded-lg ${
                  connectionTest.success 
                    ? 'bg-green-500/10 text-green-500' 
                    : 'bg-red-500/10 text-red-500'
                }`}>
                  {connectionTest.success ? (
                    <CheckCircle className="w-5 h-5" />
                  ) : (
                    <XCircle className="w-5 h-5" />
                  )}
                  <div>
                    <p className="font-medium">{connectionTest.message}</p>
                    {connectionTest.error && (
                      <p className="text-sm mt-1">{connectionTest.error}</p>
                    )}
                  </div>
                </div>
              )}
            </CardContent>
          </Card>

          {/* Manual Data Sync */}
          <Card>
            <CardHeader>
              <CardTitle>Manual Data Sync</CardTitle>
              <CardDescription>
                Trigger data synchronization from weed.de Metabase
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className="grid gap-3 sm:grid-cols-2">
                <Button
                  onClick={() => syncAll.mutate()}
                  disabled={syncAll.isPending}
                  variant="default"
                >
                  {syncAll.isPending ? (
                    <>
                      <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                      Syncing...
                    </>
                  ) : (
                    <>
                      <RefreshCw className="w-4 h-4 mr-2" />
                      Sync All Data
                    </>
                  )}
                </Button>

                <Button
                  onClick={() => syncManufacturers.mutate()}
                  disabled={syncManufacturers.isPending}
                  variant="outline"
                >
                  {syncManufacturers.isPending ? (
                    <>
                      <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                      Syncing...
                    </>
                  ) : (
                    "Sync Manufacturers"
                  )}
                </Button>

                <Button
                  onClick={() => syncStrains.mutate()}
                  disabled={syncStrains.isPending}
                  variant="outline"
                >
                  {syncStrains.isPending ? (
                    <>
                      <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                      Syncing...
                    </>
                  ) : (
                    "Sync Strains"
                  )}
                </Button>

                <Button
                  onClick={() => syncPharmacies.mutate()}
                  disabled={syncPharmacies.isPending}
                  variant="outline"
                >
                  {syncPharmacies.isPending ? (
                    <>
                      <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                      Syncing...
                    </>
                  ) : (
                    "Sync Pharmacies"
                  )}
                </Button>
              </div>
            </CardContent>
          </Card>
        </div>
      </main>
    </div>
  );
}
