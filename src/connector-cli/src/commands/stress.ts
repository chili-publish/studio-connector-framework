import { initRuntime, evalAsync } from '../qjs/qjs';
import { compileToTempFile } from '../compiler/connectorCompiler';
import {
  startCommand,
  validateInputConnectorFile,
  errorNoColor,
  success,
  info,
  warn,
} from '../core';

export async function runStressTest(
  connectorFile: string,
  options: any
): Promise<void> {
  startCommand('stress', { connectorFile, options });

  if (!validateInputConnectorFile(connectorFile)) {
    return;
  }

  const compilation = await compileToTempFile(connectorFile);

  if (compilation.errors.length > 0) {
    errorNoColor(compilation.formattedDiagnostics);
    return;
  } else {
    success('Build succeeded -> ' + compilation.tempFile);
  }

  const vm = await initRuntime(compilation.tempFile, {});

  const iterations: number = options.iterations ? options.iterations : 1000;

  // use fine grained resolution timer
  let times: bigint[] = [];
  let memories: MemoryStats[] = [];

  // try 1000 times, monitor memory usage
  for (let i = 0; i < iterations; i++) {
    const start = process.hrtime.bigint();
    await evalAsync(
      vm,
      `(async () => {
            try{
                return await await loadedConnector.download('id' +'' +{})
            }catch(error){
                info("error", error)
            }
        })()`
    );
    const end = process.hrtime.bigint();

    if (i % (iterations / 10) === 0) {
      var handle = vm.runtime.computeMemoryUsage();
      var mem = vm.dump(handle);
      handle.dispose();
      memories.push(mem);
    }

    times.push(end - start);
  }

  // display time stats
  let totalTime = 0;
  for (let i = 0; i < times.length; i++) {
    totalTime += Number(times[i]);
  }
  info(`Performance stats for ${iterations} iterations`);
  // draw horizontal line
  info('--------------------------------------------------');
  info(`total time${totalTime / 1000000}ms`);
  info(`average time${totalTime / times.length / 1000000}ms`);
  // min, max and median (times is a bigint array)
  times.sort((a, b) => Number(a) - Number(b));
  info(`min time${Number(times[0]) / 1000000}ms`);
  info(`max time${Number(times[times.length - 1]) / 1000000}ms`);
  info(`median time${Number(times[Math.floor(times.length / 2)]) / 1000000}ms`);

  // display memory stats
  info(`Memory stats for ${iterations} iterations`);
  // draw horizontal line
  info('--------------------------------------------------');

  // find stats in the memories that only go up
  analyzeMemoryStats(memories);

  let { first, last } = findFirstAndLast(memories);
  info(
    `Allocation increase: ${
      last.memory_used_size - first.memory_used_size
    }bytes`
  );
}

function analyzeMemoryStats(stats: MemoryStats[]): void {
  let previousStats: MemoryStats | null = null;
  const significantIncreaseFactor = 1.1; // Define what you consider a "significant" increase

  for (const currentStats of stats) {
    if (previousStats) {
      for (const key in currentStats) {
        if (
          currentStats.hasOwnProperty(key) &&
          previousStats.hasOwnProperty(key)
        ) {
          const currentValue = currentStats[key as keyof MemoryStats];
          const previousValue = previousStats[key as keyof MemoryStats];

          // Calculate the change in percentage
          const change = ((currentValue - previousValue) / previousValue) * 100;

          // If the change is significantly high, log a warning
          if (change > significantIncreaseFactor) {
            warn(
              `Warning: ${key} has increased significantly (change: ${change}%)`
            );
          }
        }
      }
    }

    previousStats = currentStats;
  }
}

type MemoryStats = {
  malloc_limit: number;
  memory_used_size: number;
  malloc_count: number;
  memory_used_count: number;
  atom_count: number;
  atom_size: number;
  str_count: number;
  str_size: number;
  obj_count: number;
  obj_size: number;
  prop_count: number;
  prop_size: number;
  shape_count: number;
  shape_size: number;
  js_func_count: number;
  js_func_size: number;
  js_func_code_size: number;
  js_func_pc2line_count: number;
  js_func_pc2line_size: number;
  c_func_count: number;
  array_count: number;
  fast_array_count: number;
  fast_array_elements: number;
  binary_object_count: number;
  binary_object_size: number;
};

function findFirstAndLast(memories: MemoryStats[]): { first: any; last: any } {
  return { first: memories[0], last: memories[memories.length - 1] };
}
