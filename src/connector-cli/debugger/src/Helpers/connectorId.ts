function isJsonObject(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null && !Array.isArray(value);
}

function isStructuredConnectorId(
  value: unknown
): value is Record<string, unknown> | unknown[] {
  return Array.isArray(value) || isJsonObject(value);
}

function canonicalizeParsedConnectorId(parsed: unknown): string | null {
  if (isStructuredConnectorId(parsed)) {
    return JSON.stringify(parsed);
  }
  return null;
}

function extractBracketedFragment(value: string): string | null {
  const match = value.match(/(\{[\s\S]*\}|\[[\s\S]*\])/);
  if (!match) {
    return null;
  }

  const candidate = match[0];
  try {
    JSON.parse(candidate);
    return candidate;
  } catch {
    const inner = candidate.slice(1, -1);
    try {
      JSON.parse(inner);
      return inner;
    } catch {
      return null;
    }
  }
}

/**
 * Normalizes a connector id string for detail/download methods.
 * Some connectors store ids as JSON.stringify(payload) — object or array
 * (Acquia, Kadanza, Sitecore, …); others use plain strings (Bynder, AEM paths, …).
 */
export function normalizeConnectorId(input: string): string {
  let value = input.trim();
  if (!value) {
    return value;
  }

  for (let attempt = 0; attempt < 6; attempt++) {
    try {
      const parsed: unknown = JSON.parse(value);

      if (typeof parsed === 'string') {
        value = parsed;
        continue;
      }

      const canonical = canonicalizeParsedConnectorId(parsed);
      if (canonical !== null) {
        return canonical;
      }

      break;
    } catch {
      if (
        (value.startsWith('"') && value.endsWith('"')) ||
        (value.startsWith("'") && value.endsWith("'"))
      ) {
        value = value.slice(1, -1);
        continue;
      }

      const unescaped = value.replace(/\\"/g, '"').replace(/\\\\/g, '\\');
      if (unescaped !== value) {
        value = unescaped;
        continue;
      }

      const extracted = extractBracketedFragment(value);
      if (extracted !== null && extracted !== value) {
        value = extracted;
        continue;
      }

      break;
    }
  }

  return value;
}
