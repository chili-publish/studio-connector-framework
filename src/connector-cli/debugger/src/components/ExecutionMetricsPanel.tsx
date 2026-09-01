import { formatDuration } from '../helpers/metricsCollector';
import type { MethodExecutionMetrics } from '../helpers/metricsCollector';

function truncateUrl(url: string, maxLength = 72): string {
  if (url.length <= maxLength) {
    return url;
  }
  return `${url.slice(0, maxLength - 3)}...`;
}

function statusBadgeClass(status?: number, success?: boolean): string {
  if (!success) {
    return 'dbg-badge-error';
  }
  if (status === undefined) {
    return 'dbg-badge-neutral';
  }
  if (status >= 200 && status < 300) {
    return 'dbg-badge-success';
  }
  if (status >= 400) {
    return 'dbg-badge-error';
  }
  return 'dbg-badge-warning';
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
    <div className="rounded-lg border border-border-subtle bg-surface-card shadow-sm overflow-hidden">
      <div className="dbg-card-header">
        <h2 className="dbg-section-label">Execution metrics</h2>
        <span
          className={
            metrics.success ? 'dbg-badge-success' : 'dbg-badge-error'
          }
        >
          {metrics.success ? 'Success' : 'Failed'}
        </span>
      </div>

      <div className="px-md py-sm border-b border-border-subtle">
        <p className="text-regular text-text-primary">
          <span className="font-semibold capitalize">{metrics.methodName}</span>{' '}
          <span
            className={
              metrics.success ? 'text-text-success' : 'text-text-error'
            }
          >
            {methodStatus}
          </span>
        </p>
        {metrics.error ? (
          <p className="dbg-callout-error">{metrics.error}</p>
        ) : null}
      </div>

      {metrics.fetchCalls.length > 0 ? (
        <div className="overflow-x-auto">
          <table className="dbg-table">
            <thead>
              <tr>
                <th className="w-20">Method</th>
                <th>URL</th>
                <th className="w-24">Status</th>
                <th className="w-28 text-right">Duration</th>
              </tr>
            </thead>
            <tbody>
              {metrics.fetchCalls.map((fetchCall, index) => (
                <tr
                  key={`${fetchCall.method}-${fetchCall.url}-${index}`}
                  className={
                    fetchCall.success
                      ? 'text-text-secondary'
                      : 'text-text-error'
                  }
                >
                  <td className="font-mono text-label font-semibold">
                    {fetchCall.method}
                  </td>
                  <td className="font-mono text-label" title={fetchCall.url}>
                    {truncateUrl(fetchCall.url)}
                    {!fetchCall.success && fetchCall.error ? (
                      <span className="block text-text-error mt-xxs normal-case font-sans">
                        {fetchCall.error}
                      </span>
                    ) : null}
                  </td>
                  <td>
                    <span
                      className={statusBadgeClass(
                        fetchCall.status,
                        fetchCall.success
                      )}
                    >
                      {fetchCall.status ?? '—'}
                    </span>
                  </td>
                  <td className="text-right font-mono text-label text-text-muted">
                    {formatDuration(fetchCall.durationMs)}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      ) : (
        <p className="px-md py-sm text-regular text-text-muted">
          No fetch calls recorded.
        </p>
      )}
    </div>
  );
};
