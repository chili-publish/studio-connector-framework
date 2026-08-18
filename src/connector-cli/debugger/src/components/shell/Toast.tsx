import { useEffect, useLayoutEffect, useRef } from 'react';
import { useToast, type ToastMessage } from '../../core/ToastContext';
import {
  CircleCheckIcon,
  CircleExclamationIcon,
  CloseIcon,
} from '../icons';

const TOAST_HEIGHT = '3.5rem';
const BOTTOM_GAP = '1rem';
const VISIBLE_DURATION_MS = 3000;
const ANIMATION_OPTIONS: KeyframeAnimationOptions = {
  duration: 200,
  fill: 'forwards',
};
const FROM: Keyframe = { transform: 'translateY(100vh)' };
const TO: Keyframe = {
  transform: `translateY(calc(100vh - ${TOAST_HEIGHT} - ${BOTTOM_GAP}))`,
};

function ToastItem({
  toast,
  onClose,
}: {
  toast: ToastMessage;
  onClose: () => void;
}) {
  const toastRef = useRef<HTMLDivElement>(null);
  const toneClass =
    toast.tone === 'error' ? 'dbg-toast-error' : 'dbg-toast-success';

  useLayoutEffect(() => {
    toastRef.current?.animate([FROM, TO], ANIMATION_OPTIONS);
  }, []);

  useEffect(() => {
    const timeoutId = window.setTimeout(() => {
      const animation = toastRef.current?.animate(
        [TO, FROM],
        ANIMATION_OPTIONS
      );
      if (animation) {
        animation.onfinish = onClose;
      } else {
        onClose();
      }
    }, VISIBLE_DURATION_MS);

    return () => {
      window.clearTimeout(timeoutId);
    };
  }, [onClose]);

  return (
    <div ref={toastRef} className={`dbg-toast ${toneClass}`}>
      <span className="dbg-toast-content">
        <span className="dbg-toast-icon">
          {toast.tone === 'error' ? (
            <CircleExclamationIcon className="h-[1.125rem] w-[1.125rem] shrink-0" />
          ) : (
            <CircleCheckIcon className="h-[1.125rem] w-[1.125rem] shrink-0" />
          )}
        </span>
        <span>{toast.message}</span>
      </span>
      <button
        type="button"
        className="dbg-toast-close"
        aria-label="Dismiss notification"
        onClick={onClose}
      >
        <CloseIcon className="h-[1.125rem] w-[1.125rem]" />
      </button>
    </div>
  );
}

export function Toast() {
  const { toast, hideToast } = useToast();
  if (!toast) {
    return null;
  }

  return (
    <div className="dbg-toast-region" role="status">
      <ToastItem key={toast.id} toast={toast} onClose={hideToast} />
    </div>
  );
}
