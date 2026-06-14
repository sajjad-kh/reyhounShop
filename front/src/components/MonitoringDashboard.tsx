/**
 * Monitoring Dashboard Component
 * Admin component to view application health and performance metrics
 */

import { useState, useEffect } from 'react';
import { monitor, HealthCheckResult } from '@/utils/monitoring';
import { errorTracker, ErrorSeverity } from '@/utils/errorTracking';
import { Activity, AlertCircle, CheckCircle, XCircle, TrendingUp } from 'lucide-react';

export const MonitoringDashboard = () => {
    const [healthStatus, setHealthStatus] = useState<HealthCheckResult | null>(null);
    const [errorStats, setErrorStats] = useState<any>(null);
    const [systemInfo, setSystemInfo] = useState<any>(null);
    const [memoryUsage, setMemoryUsage] = useState<any>(null);

    useEffect(() => {
        loadMonitoringData();

        // Refresh every 30 seconds
        const interval = setInterval(loadMonitoringData, 30000);

        return () => clearInterval(interval);
    }, []);

    const loadMonitoringData = async () => {
        // Load health status
        const health = await monitor.performHealthCheck();
        setHealthStatus(health);

        // Load error stats
        const errors = errorTracker.getErrorStats();
        setErrorStats(errors);

        // Load system info
        const info = monitor.getSystemInfo();
        setSystemInfo(info);

        // Load memory usage
        const memory = monitor.getMemoryUsage();
        setMemoryUsage(memory);
    };

    const getStatusIcon = (status?: string) => {
        switch (status) {
            case 'healthy':
                return <CheckCircle className="w-6 h-6 text-green-400" />;
            case 'degraded':
                return <AlertCircle className="w-6 h-6 text-yellow-400" />;
            case 'unhealthy':
                return <XCircle className="w-6 h-6 text-red-400" />;
            default:
                return <Activity className="w-6 h-6 text-gray-400" />;
        }
    };

    const getStatusColor = (status?: string) => {
        switch (status) {
            case 'healthy':
                return 'text-green-400';
            case 'degraded':
                return 'text-yellow-400';
            case 'unhealthy':
                return 'text-red-400';
            default:
                return 'text-gray-400';
        }
    };

    return (
        <div className="min-h-screen bg-gradient-to-br from-slate-900 via-purple-900 to-slate-900 p-6">
            <div className="max-w-7xl mx-auto">
                <div className="mb-8">
                    <h1 className="text-3xl font-bold text-white mb-2">
                        Monitoring Dashboard
                    </h1>
                    <p className="text-gray-300">
                        Real-time application health and performance metrics
                    </p>
                </div>

                {/* Health Status */}
                <div className="glass-card mb-6">
                    <div className="flex items-center justify-between mb-4">
                        <h2 className="text-xl font-semibold text-white flex items-center gap-2">
                            <Activity className="w-5 h-5" />
                            System Health
                        </h2>
                        {healthStatus && (
                            <div className="flex items-center gap-2">
                                {getStatusIcon(healthStatus.status)}
                                <span className={`font-semibold ${getStatusColor(healthStatus.status)}`}>
                                    {healthStatus.status.toUpperCase()}
                                </span>
                            </div>
                        )}
                    </div>

                    {healthStatus && (
                        <div className="grid grid-cols-2 md:grid-cols-5 gap-4">
                            {Object.entries(healthStatus.checks).map(([key, value]) => (
                                <div
                                    key={key}
                                    className="glass-card-hover p-4 text-center"
                                >
                                    <div className="flex justify-center mb-2">
                                        {value ? (
                                            <CheckCircle className="w-5 h-5 text-green-400" />
                                        ) : (
                                            <XCircle className="w-5 h-5 text-red-400" />
                                        )}
                                    </div>
                                    <div className="text-sm text-gray-300 capitalize">
                                        {key.replace(/([A-Z])/g, ' $1').trim()}
                                    </div>
                                </div>
                            ))}
                        </div>
                    )}
                </div>

                {/* Error Statistics */}
                <div className="glass-card mb-6">
                    <h2 className="text-xl font-semibold text-white mb-4 flex items-center gap-2">
                        <AlertCircle className="w-5 h-5" />
                        Error Statistics
                    </h2>

                    {errorStats && (
                        <div className="grid grid-cols-2 md:grid-cols-5 gap-4">
                            <div className="glass-card-hover p-4 text-center">
                                <div className="text-3xl font-bold text-white mb-1">
                                    {errorStats.total}
                                </div>
                                <div className="text-sm text-gray-300">Total Errors</div>
                            </div>
                            <div className="glass-card-hover p-4 text-center">
                                <div className="text-3xl font-bold text-red-400 mb-1">
                                    {errorStats.bySeverity[ErrorSeverity.CRITICAL]}
                                </div>
                                <div className="text-sm text-gray-300">Critical</div>
                            </div>
                            <div className="glass-card-hover p-4 text-center">
                                <div className="text-3xl font-bold text-orange-400 mb-1">
                                    {errorStats.bySeverity[ErrorSeverity.HIGH]}
                                </div>
                                <div className="text-sm text-gray-300">High</div>
                            </div>
                            <div className="glass-card-hover p-4 text-center">
                                <div className="text-3xl font-bold text-yellow-400 mb-1">
                                    {errorStats.bySeverity[ErrorSeverity.MEDIUM]}
                                </div>
                                <div className="text-sm text-gray-300">Medium</div>
                            </div>
                            <div className="glass-card-hover p-4 text-center">
                                <div className="text-3xl font-bold text-blue-400 mb-1">
                                    {errorStats.unresolved}
                                </div>
                                <div className="text-sm text-gray-300">Unresolved</div>
                            </div>
                        </div>
                    )}
                </div>

                {/* System Information */}
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-6">
                    <div className="glass-card">
                        <h2 className="text-xl font-semibold text-white mb-4 flex items-center gap-2">
                            <TrendingUp className="w-5 h-5" />
                            System Information
                        </h2>

                        {systemInfo && (
                            <div className="space-y-3">
                                <div className="flex justify-between">
                                    <span className="text-gray-300">Platform:</span>
                                    <span className="text-white font-medium">
                                        {systemInfo.platform}
                                    </span>
                                </div>
                                <div className="flex justify-between">
                                    <span className="text-gray-300">Language:</span>
                                    <span className="text-white font-medium">
                                        {systemInfo.language}
                                    </span>
                                </div>
                                <div className="flex justify-between">
                                    <span className="text-gray-300">Screen:</span>
                                    <span className="text-white font-medium">
                                        {systemInfo.screenResolution}
                                    </span>
                                </div>
                                <div className="flex justify-between">
                                    <span className="text-gray-300">Viewport:</span>
                                    <span className="text-white font-medium">
                                        {systemInfo.viewport}
                                    </span>
                                </div>
                                <div className="flex justify-between">
                                    <span className="text-gray-300">Pixel Ratio:</span>
                                    <span className="text-white font-medium">
                                        {systemInfo.pixelRatio}x
                                    </span>
                                </div>
                                {systemInfo.connection && (
                                    <>
                                        <div className="flex justify-between">
                                            <span className="text-gray-300">Connection:</span>
                                            <span className="text-white font-medium">
                                                {systemInfo.connection.effectiveType}
                                            </span>
                                        </div>
                                        <div className="flex justify-between">
                                            <span className="text-gray-300">Downlink:</span>
                                            <span className="text-white font-medium">
                                                {systemInfo.connection.downlink} Mbps
                                            </span>
                                        </div>
                                    </>
                                )}
                            </div>
                        )}
                    </div>

                    <div className="glass-card">
                        <h2 className="text-xl font-semibold text-white mb-4">
                            Memory Usage
                        </h2>

                        {memoryUsage ? (
                            <div className="space-y-4">
                                <div>
                                    <div className="flex justify-between mb-2">
                                        <span className="text-gray-300">Used Memory:</span>
                                        <span className="text-white font-medium">
                                            {(memoryUsage.used / 1024 / 1024).toFixed(2)} MB
                                        </span>
                                    </div>
                                    <div className="w-full bg-gray-700 rounded-full h-2">
                                        <div
                                            className={`h-2 rounded-full ${memoryUsage.percentage > 90
                                                    ? 'bg-red-500'
                                                    : memoryUsage.percentage > 70
                                                        ? 'bg-yellow-500'
                                                        : 'bg-green-500'
                                                }`}
                                            style={{ width: `${memoryUsage.percentage}%` }}
                                        />
                                    </div>
                                    <div className="text-sm text-gray-400 mt-1">
                                        {memoryUsage.percentage.toFixed(1)}% of{' '}
                                        {(memoryUsage.limit / 1024 / 1024).toFixed(2)} MB
                                    </div>
                                </div>
                            </div>
                        ) : (
                            <div className="text-gray-400">
                                Memory information not available
                            </div>
                        )}
                    </div>
                </div>

                {/* Actions */}
                <div className="glass-card">
                    <h2 className="text-xl font-semibold text-white mb-4">Actions</h2>
                    <div className="flex flex-wrap gap-4">
                        <button
                            onClick={loadMonitoringData}
                            className="glass-button"
                        >
                            Refresh Data
                        </button>
                        <button
                            onClick={() => errorTracker.clearErrors()}
                            className="glass-button"
                        >
                            Clear Errors
                        </button>
                        <button
                            onClick={() => {
                                const errors = errorTracker.exportErrors();
                                const blob = new Blob([errors], { type: 'application/json' });
                                const url = URL.createObjectURL(blob);
                                const a = document.createElement('a');
                                a.href = url;
                                a.download = `errors-${Date.now()}.json`;
                                a.click();
                            }}
                            className="glass-button"
                        >
                            Export Errors
                        </button>
                    </div>
                </div>
            </div>
        </div>
    );
};

export default MonitoringDashboard;
