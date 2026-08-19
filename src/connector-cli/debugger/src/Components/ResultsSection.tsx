import type { ReactNode } from 'react';
import type { MethodExecutionMetrics } from '../Helpers/MetricsCollector';
import { ExecutionMetricsPanel } from './ExecutionMetricsPanel';

export const ResultsSection = ({
  metrics,
  children,
}: {
  metrics?: MethodExecutionMetrics;
  children?: ReactNode;
}) => {
  if (!metrics && !children) {
    return null;
  }

  return (
    <section className="mt-xl space-y-md">
      <div className="flex items-center gap-sm">
        <h2 className="dbg-section-label">Output</h2>
        <div className="dbg-section-divider" />
      </div>

      {metrics ? <ExecutionMetricsPanel metrics={metrics} /> : null}
      {children}
    </section>
  );
};
