import { Parameter } from './dataModel';

export const HTTP_PARAMS_MODEL = 'http-params';
export const RUNTIME_OPTIONS_MODEL = 'Runtime options';

export function isSettingsModel(name: string) {
  return name === HTTP_PARAMS_MODEL || name === RUNTIME_OPTIONS_MODEL;
}

export function cloneParameters(parameters: Parameter[]): Parameter[] {
  return parameters.map((parameter) => {
    if (parameter.componentType === 'complex') {
      return {
        ...parameter,
        complex: parameter.complex.map((child) => ({ ...child })),
      };
    }
    return { ...parameter };
  });
}

export function applyValuesToParameters(
  parameters: Parameter[],
  values: Record<string, unknown>
) {
  for (const parameter of parameters) {
    if (parameter.componentType === 'complex') {
      for (const child of parameter.complex) {
        const key = `${parameter.name}.${child.name}`;
        if (key in values) {
          child.value = values[key];
        }
      }
    } else if (parameter.name in values) {
      parameter.value = values[parameter.name];
    }
  }
}

export function denormalizeParameters(parameters: Parameter[]) {
  return parameters.reduce(
    (val, p) => {
      if (p.componentType === 'complex') {
        p.complex
          .filter((cp) => cp.value !== undefined)
          .forEach((cp) => {
            val[`${p.name}.${cp.name}`] = cp.value;
          });
      } else if (p.value !== undefined && p.value !== null && p.value !== '') {
        val[p.name] = p.value;
      }
      return val;
    },
    {} as Record<string, unknown>
  );
}
