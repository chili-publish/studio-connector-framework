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

export type MetricsSession = {
  end: (options: {
    success: boolean;
    error?: string;
  }) => MethodExecutionMetrics | null;
};

type ActiveSession = {
  methodName: string;
  startedAt: number;
  fetchCalls: FetchMetric[];
};

class MetricsCollector {
  private activeSession: ActiveSession | null = null;

  startSession(methodName: string): MetricsSession | null {
    if (this.activeSession) {
      console.warn(
        `[Connector][Metrics] startSession ignored: session already active for "${this.activeSession.methodName}"`
      );
      return null;
    }

    const session: ActiveSession = {
      methodName,
      startedAt: performance.now(),
      fetchCalls: [],
    };
    this.activeSession = session;

    return {
      end: (options) => {
        if (this.activeSession !== session) {
          console.warn(
            `[Connector][Metrics] end ignored: session for "${session.methodName}" is no longer active`
          );
          return null;
        }

        const durationMs = performance.now() - session.startedAt;
        const metrics: MethodExecutionMetrics = {
          methodName: session.methodName,
          durationMs,
          success: options.success,
          error: options.error,
          fetchCalls: [...session.fetchCalls],
        };

        const statusLabel = options.success ? 'completed in' : 'failed after';
        console.debug(
          `[Connector][Timing] "${metrics.methodName}" ${statusLabel} ${formatDuration(durationMs)}`
        );

        this.activeSession = null;
        return metrics;
      },
    };
  }

  recordFetch(metric: FetchMetric): void {
    if (!this.activeSession) {
      return;
    }

    this.activeSession.fetchCalls.push(metric);
    console.debug(
      `[Connector][Fetch] ${metric.method} ${metric.url} — ${formatDuration(metric.durationMs)}${metric.status !== undefined ? ` (${metric.status})` : ''}${metric.success ? '' : ' (failed)'}`
    );
  }
}

export function formatDuration(durationMs: number): string {
  if (durationMs < 1000) {
    return `${Math.round(durationMs)} ms`;
  }
  return `${(durationMs / 1000).toFixed(2)}s`;
}

export const metricsCollector = new MetricsCollector();
