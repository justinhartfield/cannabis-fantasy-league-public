/**
 * Admin Dashboard Page
 * Provides data sync control and monitoring
 */

import { useState } from 'react';
import { trpc } from '../lib/trpc';
import { formatDistanceToNow } from 'date-fns';

export default function AdminDashboard() {
  const [selectedJobId, setSelectedJobId] = useState<number | null>(null);

  // Queries
  const { data: stats, refetch: refetchStats } = trpc.admin.getDashboardStats.useQuery();
  const { data: jobs, refetch: refetchJobs } = trpc.admin.getSyncJobs.useQuery({ limit: 20 });
  const { data: logs } = trpc.admin.getJobLogs.useQuery(
    { jobId: selectedJobId! },
    { enabled: selectedJobId !== null }
  );

  // Mutations
  const syncStrains = trpc.admin.syncStrains.useMutation({
    onSuccess: () => {
      setTimeout(() => {
        refetchJobs();
        refetchStats();
      }, 1000);
    },
  });

  const syncBrands = trpc.admin.syncBrands.useMutation({
    onSuccess: () => {
      setTimeout(() => {
        refetchJobs();
        refetchStats();
      }, 1000);
    },
  });

  const syncManufacturers = trpc.admin.syncManufacturers.useMutation({
    onSuccess: () => {
      setTimeout(() => {
        refetchJobs();
        refetchStats();
      }, 1000);
    },
  });

  const syncAll = trpc.admin.syncAll.useMutation({
    onSuccess: () => {
      setTimeout(() => {
        refetchJobs();
        refetchStats();
      }, 1000);
    },
  });

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'completed':
        return 'text-green-600 bg-green-50';
      case 'running':
        return 'text-blue-600 bg-blue-50';
      case 'failed':
        return 'text-red-600 bg-red-50';
      default:
        return 'text-gray-600 bg-gray-50';
    }
  };

  const getLevelColor = (level: string) => {
    switch (level) {
      case 'error':
        return 'text-red-600';
      case 'warn':
        return 'text-yellow-600';
      default:
        return 'text-gray-600';
    }
  };

  return (
    <div className="container mx-auto px-4 py-8 max-w-7xl">
      <h1 className="text-3xl font-bold mb-8">Admin Dashboard</h1>

      {/* Data Freshness Stats */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-8">
        <div className="bg-white rounded-lg shadow p-6">
          <h3 className="text-lg font-semibold mb-2">Cannabis Strains</h3>
          <p className="text-3xl font-bold text-green-600">{stats?.strains.count || 0}</p>
          <p className="text-sm text-gray-500 mt-2">
            Last synced: {stats?.strains.lastSync ? formatDistanceToNow(new Date(stats.strains.lastSync), { addSuffix: true }) : 'Never'}
          </p>
        </div>

        <div className="bg-white rounded-lg shadow p-6">
          <h3 className="text-lg font-semibold mb-2">Brands</h3>
          <p className="text-3xl font-bold text-blue-600">{stats?.brands.count || 0}</p>
          <p className="text-sm text-gray-500 mt-2">
            Last synced: {stats?.brands.lastSync ? formatDistanceToNow(new Date(stats.brands.lastSync), { addSuffix: true }) : 'Never'}
          </p>
        </div>

        <div className="bg-white rounded-lg shadow p-6">
          <h3 className="text-lg font-semibold mb-2">Manufacturers</h3>
          <p className="text-3xl font-bold text-purple-600">{stats?.manufacturers.count || 0}</p>
          <p className="text-sm text-gray-500 mt-2">
            Last synced: {stats?.manufacturers.lastSync ? formatDistanceToNow(new Date(stats.manufacturers.lastSync), { addSuffix: true }) : 'Never'}
          </p>
        </div>
      </div>

      {/* Sync Controls */}
      <div className="bg-white rounded-lg shadow p-6 mb-8">
        <h2 className="text-xl font-semibold mb-4">Sync Controls</h2>
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          <button
            onClick={() => syncStrains.mutate()}
            disabled={syncStrains.isLoading}
            className="px-4 py-2 bg-green-600 text-white rounded hover:bg-green-700 disabled:opacity-50 disabled:cursor-not-allowed"
          >
            {syncStrains.isLoading ? 'Starting...' : 'Sync Strains'}
          </button>

          <button
            onClick={() => syncBrands.mutate()}
            disabled={syncBrands.isLoading}
            className="px-4 py-2 bg-blue-600 text-white rounded hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed"
          >
            {syncBrands.isLoading ? 'Starting...' : 'Sync Brands'}
          </button>

          <button
            onClick={() => syncManufacturers.mutate()}
            disabled={syncManufacturers.isLoading}
            className="px-4 py-2 bg-purple-600 text-white rounded hover:bg-purple-700 disabled:opacity-50 disabled:cursor-not-allowed"
          >
            {syncManufacturers.isLoading ? 'Starting...' : 'Sync Manufacturers'}
          </button>

          <button
            onClick={() => syncAll.mutate()}
            disabled={syncAll.isLoading}
            className="px-4 py-2 bg-indigo-600 text-white rounded hover:bg-indigo-700 disabled:opacity-50 disabled:cursor-not-allowed"
          >
            {syncAll.isLoading ? 'Starting...' : 'Sync All Data'}
          </button>
        </div>
      </div>

      {/* Recent Sync Jobs */}
      <div className="bg-white rounded-lg shadow p-6 mb-8">
        <div className="flex justify-between items-center mb-4">
          <h2 className="text-xl font-semibold">Recent Sync Jobs</h2>
          <button
            onClick={() => refetchJobs()}
            className="px-3 py-1 text-sm bg-gray-200 text-gray-700 rounded hover:bg-gray-300"
          >
            Refresh
          </button>
        </div>

        <div className="overflow-x-auto">
          <table className="min-w-full divide-y divide-gray-200">
            <thead className="bg-gray-50">
              <tr>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Job Name
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Status
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Progress
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Started
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Actions
                </th>
              </tr>
            </thead>
            <tbody className="bg-white divide-y divide-gray-200">
              {jobs?.map((job) => (
                <tr key={job.id}>
                  <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-gray-900">
                    {job.jobName}
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap">
                    <span className={`px-2 py-1 text-xs font-semibold rounded ${getStatusColor(job.status)}`}>
                      {job.status}
                    </span>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                    {job.processedCount}/{job.totalCount}
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                    {job.startedAt ? formatDistanceToNow(new Date(job.startedAt), { addSuffix: true }) : '-'}
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm">
                    <button
                      onClick={() => setSelectedJobId(job.id)}
                      className="text-indigo-600 hover:text-indigo-900"
                    >
                      View Logs
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      {/* Log Viewer Modal */}
      {selectedJobId && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50">
          <div className="bg-white rounded-lg shadow-xl max-w-4xl w-full max-h-[80vh] overflow-hidden">
            <div className="flex justify-between items-center p-6 border-b">
              <h3 className="text-xl font-semibold">Job Logs (ID: {selectedJobId})</h3>
              <button
                onClick={() => setSelectedJobId(null)}
                className="text-gray-500 hover:text-gray-700"
              >
                ✕
              </button>
            </div>

            <div className="p-6 overflow-y-auto max-h-[60vh]">
              {logs && logs.length > 0 ? (
                <div className="space-y-2 font-mono text-sm">
                  {logs.map((log) => (
                    <div key={log.id} className="flex gap-4">
                      <span className="text-gray-400 whitespace-nowrap">
                        {new Date(log.timestamp).toLocaleTimeString()}
                      </span>
                      <span className={`font-semibold uppercase ${getLevelColor(log.level)}`}>
                        [{log.level}]
                      </span>
                      <span className="flex-1">{log.message}</span>
                    </div>
                  ))}
                </div>
              ) : (
                <p className="text-gray-500">No logs available</p>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
