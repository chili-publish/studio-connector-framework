import { useMemo, useState } from 'react';
import { CheckIcon, CopyIcon } from './icons';

interface Props {
  data: unknown;
  isError?: boolean;
}

function formatJson(data: unknown): string {
  try {
    return JSON.stringify(data, null, 2);
  } catch {
    return String(data);
  }
}

const JsonObjectRenderer = ({ data, isError = false }: Props) => {
  const [copied, setCopied] = useState(false);
  const formatted = useMemo(() => formatJson(data), [data]);

  if (data === undefined || data === null) {
    return null;
  }

  const handleCopy = async () => {
    try {
      await navigator.clipboard.writeText(formatted);
      setCopied(true);
      window.setTimeout(() => setCopied(false), 1500);
    } catch {
      // clipboard may be unavailable
    }
  };

  return (
    <div
      className={`dbg-code-panel${isError ? ' dbg-code-panel-error' : ''}`}
    >
      <div
        className={`dbg-code-header${isError ? ' dbg-code-header-error' : ''}`}
      >
        <span
          className={`dbg-section-label${
            isError ? ' text-text-error' : ''
          }`}
        >
          {isError ? 'Error response' : 'JSON response'}
        </span>
        <button
          type="button"
          onClick={handleCopy}
          className="dbg-btn-ghost"
          aria-label={copied ? 'Copied' : 'Copy'}
          title={copied ? 'Copied' : 'Copy'}
        >
          {copied ? <CheckIcon /> : <CopyIcon />}
        </button>
      </div>
      <div className="dbg-code">
        <pre>{formatted}</pre>
      </div>
    </div>
  );
};

export default JsonObjectRenderer;
