import { formatDuration } from '../Helpers/MetricsCollector';
import type { MethodExecutionMetrics } from '../Helpers/MetricsCollector';

function truncateUrl(url: string, maxLength = 72): string {
  if (url.length <= maxLength) {
    return url;
  }
  return `${url.slice(0, maxLength - 3)}...`;
}

function statusBadgeClass(status?: number, success?: boolean): string {
  if (!success) {
    return 'bg-red-100 text-red-800';
  }
  if (status === undefined) {
    return 'bg-slate-100 text-slate-700';
  }
  if (status >= 200 && status < 300) {
    return 'bg-emerald-100 text-emerald-800';
  }
  if (status >= 400) {
    return 'bg-red-100 text-red-800';
  }
  return 'bg-amber-100 text-amber-800';
}

export const ExecutionMetricsPanel = ({
  metrics,
}: {
  metrics: MethodExecutionMetrics;
}) => {
  const methodStatus = metrics.success
    ? `completed in ${formatDuration(metrics.durationMs)}`
    : `failed after ${formatDuration(metrics.durationMs)}`;

  return (
    <div className="rounded-lg border border-slate-200 bg-white shadow-sm overflow-hidden">
      <div className="px-4 py-3 bg-slate-50 border-b border-slate-200 flex flex-wrap items-center justify-between gap-2">
        <h2 className="text-xs font-semibold text-slate-600 uppercase tracking-wide">
          Execution metrics
        </h2>
        <span
          className={`inline-flex items-center rounded-full px-2.5 py-0.5 text-xs font-medium ${
            metrics.success
              ? 'bg-emerald-100 text-emerald-800'
              : 'bg-red-100 text-red-800'
          }`}
        >
          {metrics.success ? 'Success' : 'Failed'}
        </span>
      </div>

      <div className="px-4 py-3 border-b border-slate-100">
        <p className="text-sm text-slate-800">
          <span className="font-semibold capitalize">{metrics.methodName}</span>{' '}
          <span
            className={metrics.success ? 'text-emerald-700' : 'text-red-700'}
          >
            {methodStatus}
          </span>
        </p>
        {metrics.error ? (
          <p className="mt-2 text-sm text-red-600 bg-red-50 rounded-md px-3 py-2">
            {metrics.error}
          </p>
        ) : null}
      </div>

      {metrics.fetchCalls.length > 0 ? (
        <div className="overflow-x-auto">
          <table className="w-full text-left text-sm">
            <thead>
              <tr className="bg-slate-50 text-xs uppercase tracking-wide text-slate-500">
                <th className="px-4 py-2 font-semibold w-20">Method</th>
                <th className="px-4 py-2 font-semibold">URL</th>
                <th className="px-4 py-2 font-semibold w-24">Status</th>
                <th className="px-4 py-2 font-semibold w-28 text-right">
                  Duration
                </th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {metrics.fetchCalls.map((fetchCall, index) => (
                <tr
                  key={`${fetchCall.method}-${fetchCall.url}-${index}`}
                  className={
                    fetchCall.success ? 'text-slate-700' : 'text-red-800'
                  }
                >
                  <td className="px-4 py-2 font-mono text-xs font-semibold">
                    {fetchCall.method}
                  </td>
                  <td
                    className="px-4 py-2 font-mono text-xs"
                    title={fetchCall.url}
                  >
                    {truncateUrl(fetchCall.url)}
                    {!fetchCall.success && fetchCall.error ? (
                      <span className="block text-red-600 mt-0.5 normal-case font-sans">
                        {fetchCall.error}
                      </span>
                    ) : null}
                  </td>
                  <td className="px-4 py-2">
                    <span
                      className={`inline-flex rounded-full px-2 py-0.5 text-xs font-medium ${statusBadgeClass(
                        fetchCall.status,
                        fetchCall.success
                      )}`}
                    >
                      {fetchCall.status ?? '—'}
                    </span>
                  </td>
                  <td className="px-4 py-2 text-right font-mono text-xs text-slate-600">
                    {formatDuration(fetchCall.durationMs)}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      ) : (
        <p className="px-4 py-3 text-sm text-slate-500">
          No fetch calls recorded.
        </p>
      )}
    </div>
  );
};
