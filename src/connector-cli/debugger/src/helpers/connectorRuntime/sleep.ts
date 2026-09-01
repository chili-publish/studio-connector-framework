export function sleep(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

export function initRuntimeSleep() {
  (window as any)['sleep'] = sleep;
}
