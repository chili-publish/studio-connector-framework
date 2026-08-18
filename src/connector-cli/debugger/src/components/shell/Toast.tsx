import { useApp } from '../../core/AppContext';

export function Toast() {
  const { toast } = useApp();
  if (!toast) {
    return null;
  }

  const toneClass =
    toast.tone === 'error' ? 'dbg-badge-error' : 'dbg-badge-success';

  return (
    <div className="dbg-toast-region" role="status">
      <div className={`dbg-toast ${toneClass}`}>{toast.message}</div>
    </div>
  );
}
