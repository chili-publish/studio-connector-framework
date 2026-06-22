export type ConnectorIdPayload = {
  id: string;
  eid?: string;
  filename?: string;
  fileType?: string;
  width?: number;
  height?: number;
};

export function isConnectorIdPayload(value: unknown): value is ConnectorIdPayload {
  return (
    typeof value === 'object' &&
    value !== null &&
    'id' in value &&
    typeof (value as ConnectorIdPayload).id === 'string'
  );
}

/**
 * Normalizes a connector id string for detail/download methods.
 * Connectors such as Acquia store media ids as JSON.stringify(AssetId).
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

      if (Array.isArray(parsed)) {
        const firstString = parsed.find((entry) => typeof entry === 'string');
        if (typeof firstString === 'string') {
          value = firstString;
          continue;
        }
        break;
      }

      if (isConnectorIdPayload(parsed)) {
        return JSON.stringify(parsed);
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

      break;
    }
  }

  try {
    const parsed: unknown = JSON.parse(value);
    if (isConnectorIdPayload(parsed)) {
      return JSON.stringify(parsed);
    }
  } catch {
    const objectMatch = value.match(/\{[\s\S]*\}/);
    if (objectMatch) {
      return normalizeConnectorId(objectMatch[0]);
    }
  }

  return value;
}
