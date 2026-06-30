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
    <section className="mt-8 space-y-4">
      <div className="flex items-center gap-3">
        <h2 className="text-xs font-semibold text-slate-500 uppercase tracking-wider">
          Output
        </h2>
        <div className="flex-1 h-px bg-slate-200" />
      </div>

      {metrics ? <ExecutionMetricsPanel metrics={metrics} /> : null}
      {children}
    </section>
  );
};
