import { useAuth } from "@/_core/hooks/useAuth";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { trpc } from "@/lib/trpc";
import { ADMIN_PASS_STORAGE_KEY, DEFAULT_ADMIN_BYPASS_PASSWORD } from "@shared/const";
import { Database, RefreshCw, Loader2, XCircle, Eye, Calendar, BarChart3, KeyRound } from "lucide-react";
import { toast } from "sonner";
import { FormEvent, useEffect, useState } from "react";
import { formatDistanceToNow } from "date-fns";

export default function Admin() {
  const { user, loading: authLoading, isAuthenticated } = useAuth();
  const [selectedJobId, setSelectedJobId] = useState<number | null>(null);
  const [weekYear, setWeekYear] = useState<number>(2025);
  const [weekNumber, setWeekNumber] = useState<number>(1);
  const [dailyStatDate, setDailyStatDate] = useState<string>(() => new Date().toISOString().split('T')[0]);
  const [positionWindow, setPositionWindow] = useState<7 | 30>(7);
  const [adminPassword, setAdminPassword] = useState("");
  const [hasAdminOverride, setHasAdminOverride] = useState(false);

  useEffect(() => {
    if (typeof window === 'undefined') return;
    try {
      const stored = localStorage.getItem(ADMIN_PASS_STORAGE_KEY);
      setHasAdminOverride(Boolean(stored));
    } catch {
      setHasAdminOverride(false);
    }
  }, []);

  const adminAccessGranted = hasAdminOverride || (isAuthenticated && user?.role === 'admin');
  const isPasswordOverride = hasAdminOverride && !(isAuthenticated && user?.role === 'admin');

  const handleUnlock = (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();

    if (adminPassword.trim() !== DEFAULT_ADMIN_BYPASS_PASSWORD) {
      toast.error("Incorrect admin password.");
      return;
    }

    try {
      if (typeof window !== 'undefined') {
        localStorage.setItem(ADMIN_PASS_STORAGE_KEY, DEFAULT_ADMIN_BYPASS_PASSWORD);
      }
      setHasAdminOverride(true);
      setAdminPassword("");
      toast.success("Admin access unlocked.");
    } catch {
      toast.error("Failed to store admin access key.");
    }
  };

  const handleRemoveOverride = () => {
    try {
      if (typeof window !== 'undefined') {
        localStorage.removeItem(ADMIN_PASS_STORAGE_KEY);
      }
    } catch {
      // ignore storage removal errors
    }

    setHasAdminOverride(false);
    setAdminPassword("");
    toast.success("Admin password cleared.");
  };

  // Queries
  const { data: stats, refetch: refetchStats } = trpc.admin.getDashboardStats.useQuery(undefined, {
    enabled: adminAccessGranted,
    refetchInterval: 5000, // Auto-refresh every 5 seconds
  });
  
  const { data: jobs, refetch: refetchJobs } = trpc.admin.getSyncJobs.useQuery(
    { limit: 20 },
    {
      enabled: adminAccessGranted,
      refetchInterval: 5000, // Auto-refresh every 5 seconds
    }
  );
  
  const { data: logs } = trpc.admin.getJobLogs.useQuery(
    { jobId: selectedJobId! },
    { enabled: selectedJobId !== null }
  );

  const {
    data: dailyChallengeSummary,
    refetch: refetchDailySummary,
    isFetching: summaryLoading,
  } = trpc.admin.getDailyChallengeStatsSummary.useQuery(undefined, {
    enabled: adminAccessGranted,
  });

  const {
    data: positionAverages,
    refetch: refetchPositionAverages,
    isFetching: positionAveragesLoading,
  } = trpc.admin.getDailyChallengePositionAverages.useQuery(
    { windowDays: positionWindow },
    {
      enabled: adminAccessGranted,
    }
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

  const syncDailyChallengeStats = trpc.admin.syncDailyChallengeStats.useMutation({
    onSuccess: (data) => {
      toast.success(data.message || "Daily challenge stats sync started!");
      setTimeout(() => {
        refetchJobs();
        refetchStats();
        refetchDailySummary();
        refetchPositionAverages();
      }, 1000);
    },
    onError: (error) => {
      toast.error(`Failed to sync daily challenge stats: ${error.message}`);
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

  const syncWeeklyStats = trpc.admin.syncWeeklyStats.useMutation({
    onSuccess: (data) => {
      toast.success(data.message || "Weekly stats sync started successfully!");
      setTimeout(() => {
        refetchJobs();
        refetchStats();
      }, 1000);
    },
    onError: (error) => {
      toast.error(`Failed to start weekly stats sync: ${error.message}`);
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

  if (authLoading && !hasAdminOverride) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <Loader2 className="w-8 h-8 animate-spin text-primary" />
      </div>
    );
  }

  if (!adminAccessGranted) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center p-4">
        <Card className="w-full max-w-md">
          <CardHeader>
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-lg bg-primary/10 flex items-center justify-center">
                <KeyRound className="w-5 h-5 text-primary" />
              </div>
              <div>
                <CardTitle>Admin Password Required</CardTitle>
                <CardDescription>Enter the admin password to unlock the dashboard.</CardDescription>
              </div>
            </div>
          </CardHeader>
          <CardContent>
            <form onSubmit={handleUnlock} className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="admin-password">Password</Label>
                <Input
                  id="admin-password"
                  type="password"
                  value={adminPassword}
                  onChange={(e) => setAdminPassword(e.target.value)}
                  placeholder="Enter admin password"
                  autoComplete="off"
                />
              </div>
              <Button type="submit" className="w-full">
                Unlock Admin Dashboard
              </Button>
            </form>
            <p className="text-xs text-muted-foreground mt-4">
              A Clerk login is recommended but not required when using the password override.
            </p>
          </CardContent>
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
            <div className="flex items-center gap-3">
              {isPasswordOverride && (
                <span className="px-2 py-1 rounded-full bg-amber-500/10 text-amber-500 text-xs font-semibold">
                  Password Override Active
                </span>
              )}
              {hasAdminOverride && (
                <Button variant="ghost" size="sm" onClick={handleRemoveOverride}>
                  Remove Override
                </Button>
              )}
              <div className="text-sm text-muted-foreground">
                {user?.name || "Guest"}
              </div>
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

          {/* Weekly Stats Sync */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Calendar className="w-5 h-5" />
                Weekly Stats Sync
              </CardTitle>
              <CardDescription>
                Populate weekly stats tables for a specific year and week. This is required for scoring calculations.
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label htmlFor="week-year">Year</Label>
                    <Input
                      id="week-year"
                      type="number"
                      min={2020}
                      max={2030}
                      value={weekYear}
                      onChange={(e) => setWeekYear(parseInt(e.target.value) || 2025)}
                      placeholder="2025"
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="week-number">Week</Label>
                    <Input
                      id="week-number"
                      type="number"
                      min={1}
                      max={53}
                      value={weekNumber}
                      onChange={(e) => setWeekNumber(parseInt(e.target.value) || 1)}
                      placeholder="1"
                    />
                  </div>
                </div>
                <Button
                  onClick={() => syncWeeklyStats.mutate({ year: weekYear, week: weekNumber })}
                  disabled={syncWeeklyStats.isPending}
                  className="w-full"
                >
                  {syncWeeklyStats.isPending ? (
                    <>
                      <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                      Syncing {weekYear}-W{weekNumber}...
                    </>
                  ) : (
                    <>
                      <RefreshCw className="w-4 h-4 mr-2" />
                      Sync Weekly Stats for {weekYear}-W{weekNumber}
                    </>
                  )}
                </Button>
                <p className="text-xs text-muted-foreground">
                  This will populate manufacturerWeeklyStats, cannabisStrainWeeklyStats, pharmacyWeeklyStats, and brandWeeklyStats tables with data for the specified week.
                </p>
              </div>
            </CardContent>
          </Card>

          {/* Daily Challenge Stats */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <BarChart3 className="w-5 h-5" />
                Daily Challenge Stats
              </CardTitle>
              <CardDescription>
                Aggregate Metabase orders into daily challenge tables for a specific stat date.
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="flex flex-col md:flex-row gap-4">
                <div className="flex-1 space-y-2">
                  <Label htmlFor="daily-stat-date">Stat Date</Label>
                  <Input
                    id="daily-stat-date"
                    type="date"
                    value={dailyStatDate}
                    max={new Date().toISOString().split('T')[0]}
                    onChange={(e) => setDailyStatDate(e.target.value)}
                  />
                </div>
                <div className="flex items-end">
                  <Button
                    onClick={() => syncDailyChallengeStats.mutate({ statDate: dailyStatDate })}
                    disabled={syncDailyChallengeStats.isPending}
                    className="w-full md:w-auto"
                  >
                    {syncDailyChallengeStats.isPending ? (
                      <>
                        <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                        Syncing...
                      </>
                    ) : (
                      <>
                        <RefreshCw className="w-4 h-4 mr-2" />
                        Sync Daily Stats
                      </>
                    )}
                  </Button>
                </div>
              </div>
              <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
                {['manufacturers', 'strains', 'pharmacies', 'brands'].map((key) => {
                  const labelMap: Record<string, string> = {
                    manufacturers: 'Manufacturers',
                    strains: 'Products',
                    pharmacies: 'Pharmacies',
                    brands: 'Brands',
                  };
                  const summary = (dailyChallengeSummary as any)?.[key];
                  return (
                    <div
                      key={key}
                      className="rounded-lg border border-border/50 bg-card/60 p-4"
                    >
                      <p className="text-sm text-muted-foreground">{labelMap[key]}</p>
                      {summaryLoading ? (
                        <p className="text-lg font-semibold mt-2">Loading...</p>
                      ) : (
                        <>
                          <p className="text-2xl font-bold mt-1">
                            {summary?.latestStatDate ? new Date(summary.latestStatDate).toLocaleDateString() : '—'}
                          </p>
                          <p className="text-xs text-muted-foreground mt-1">
                            Records: {summary?.records ?? 0}
                          </p>
                        </>
                      )}
                    </div>
                  );
                })}
              </div>
            </CardContent>
          </Card>

          {/* Historical Position Averages */}
          <Card>
            <CardHeader>
              <CardTitle>Historical Position Averages</CardTitle>
              <CardDescription>
                Average points per lineup slot over the last {positionWindow} days.
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="flex flex-col md:flex-row md:items-end gap-4">
                <div className="space-y-2">
                  <Label htmlFor="position-window">Window</Label>
                  <select
                    id="position-window"
                    className="border border-border rounded-md bg-background px-3 py-2 text-sm"
                    value={positionWindow}
                    onChange={(e) => setPositionWindow(Number(e.target.value) as 7 | 30)}
                    disabled={!adminAccessGranted}
                  >
                    <option value={7}>Last 7 days</option>
                    <option value={30}>Last 30 days</option>
                  </select>
                </div>
                <div className="text-sm text-muted-foreground">
                  {positionAveragesLoading ? (
                    <span>Loading range...</span>
                  ) : positionAverages ? (
                    <span>
                      {positionAverages.range.startDate} → {positionAverages.range.endDate} • Entries:{" "}
                      {positionAverages.sampleSize}
                    </span>
                  ) : (
                    <span>No data</span>
                  )}
                </div>
              </div>
              <div className="overflow-x-auto">
                <table className="w-full text-sm">
                  <thead>
                    <tr className="text-left text-muted-foreground border-b">
                      <th className="py-2 font-medium">Position</th>
                      <th className="py-2 font-medium">Avg Points</th>
                      <th className="py-2 font-medium">Slots</th>
                    </tr>
                  </thead>
                  <tbody>
                    {[
                      { key: 'manufacturer', label: 'Manufacturers', slots: ['mfg1', 'mfg2'] },
                      { key: 'cannabisStrain', label: 'Cannabis Strains', slots: ['cstr1', 'cstr2'] },
                      { key: 'product', label: 'Products', slots: ['prd1', 'prd2'] },
                      { key: 'pharmacy', label: 'Pharmacies', slots: ['phm1', 'phm2'] },
                      { key: 'brand', label: 'Brands', slots: ['brd1'] },
                      { key: 'flex', label: 'Flex', slots: ['flex'] },
                    ].map((row) => {
                      const data = (positionAverages as any)?.positions?.[row.key];
                      return (
                        <tr key={row.key} className="border-b last:border-0">
                          <td className="py-3 font-medium">{row.label}</td>
                          <td className="py-3">
                            {positionAveragesLoading ? (
                              <span className="text-muted-foreground">Loading...</span>
                            ) : (
                              <span className="font-semibold">
                                {data?.avg !== null && data?.avg !== undefined ? data.avg.toFixed(2) : '—'}
                              </span>
                            )}
                          </td>
                          <td className="py-3 text-muted-foreground">
                            {positionAveragesLoading || !data ? (
                              '—'
                            ) : (
                              <div className="flex flex-wrap gap-2">
                                {row.slots.map((slot) => (
                                  <span
                                    key={slot}
                                    className="rounded-full border border-border/60 px-3 py-1 text-xs bg-card/60"
                                  >
                                    {slot.toUpperCase()}:{" "}
                                    {data.slots?.[slot] !== null && data.slots?.[slot] !== undefined
                                      ? data.slots[slot].toFixed(2)
                                      : '—'}
                                  </span>
                                ))}
                              </div>
                            )}
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
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
