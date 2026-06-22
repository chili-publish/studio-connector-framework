export type FetchMetric = {
  url: string;
  method: string;
  status?: number;
  durationMs: number;
  success: boolean;
  error?: string;
};

export type MethodExecutionMetrics = {
  methodName: string;
  durationMs: number;
  success: boolean;
  error?: string;
  fetchCalls: FetchMetric[];
};

type ActiveSession = {
  methodName: string;
  startedAt: number;
  fetchCalls: FetchMetric[];
};

class MetricsCollector {
  private session: ActiveSession | null = null;

  startSession(methodName: string): void {
    this.session = {
      methodName,
      startedAt: performance.now(),
      fetchCalls: [],
    };
  }

  recordFetch(metric: FetchMetric): void {
    if (!this.session) {
      return;
    }

    this.session.fetchCalls.push(metric);
    console.debug(
      `[Connector][Fetch] ${metric.method} ${metric.url} — ${formatDuration(metric.durationMs)}${metric.status !== undefined ? ` (${metric.status})` : ''}${metric.success ? '' : ' (failed)'}`
    );
  }

  endSession(options: {
    success: boolean;
    error?: string;
  }): MethodExecutionMetrics | null {
    if (!this.session) {
      return null;
    }

    const durationMs = performance.now() - this.session.startedAt;
    const metrics: MethodExecutionMetrics = {
      methodName: this.session.methodName,
      durationMs,
      success: options.success,
      error: options.error,
      fetchCalls: [...this.session.fetchCalls],
    };

    const statusLabel = options.success ? 'completed in' : 'failed after';
    console.debug(
      `[Connector][Timing] "${metrics.methodName}" ${statusLabel} ${formatDuration(durationMs)}`
    );

    this.session = null;
    return metrics;
  }
}

export function formatDuration(durationMs: number): string {
  if (durationMs < 1000) {
    return `${Math.round(durationMs)} ms`;
  }
  return `${(durationMs / 1000).toFixed(2)}s`;
}

export const metricsCollector = new MetricsCollector();
