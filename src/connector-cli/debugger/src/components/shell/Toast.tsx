import { useToast } from '../../core/ToastContext';

export function Toast() {
  const { toast } = useToast();
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
