import { useMemo, useState } from 'react';

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
      className={`rounded-lg border overflow-hidden ${
        isError ? 'border-red-200' : 'border-slate-200'
      }`}
    >
      <div
        className={`flex items-center justify-between px-4 py-2 border-b ${
          isError
            ? 'bg-red-50 border-red-200'
            : 'bg-slate-100 border-slate-200'
        }`}
      >
        <span
          className={`text-xs font-semibold uppercase tracking-wide ${
            isError ? 'text-red-700' : 'text-slate-600'
          }`}
        >
          {isError ? 'Error response' : 'JSON response'}
        </span>
        <button
          type="button"
          onClick={handleCopy}
          className="text-xs font-medium text-slate-600 hover:text-slate-900 px-2 py-1 rounded hover:bg-white/80 transition-colors"
        >
          {copied ? 'Copied' : 'Copy'}
        </button>
      </div>
      <div className="bg-slate-900 overflow-auto max-h-[28rem]">
        <pre className="p-4 text-sm leading-relaxed font-mono text-slate-100 whitespace-pre-wrap break-words">
          {formatted}
        </pre>
      </div>
    </div>
  );
};

export default JsonObjectRenderer;
