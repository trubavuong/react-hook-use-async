interface VoidCallback {
  (): void
}

interface AsyncResult<Result> {
  error?: Error,
  result?: Result,
  promise?: Promise<Result>,
  isPending: boolean,
  cancel: VoidCallback,
  execute: VoidCallback,
}

interface Config<Result, Inputs> {
  onError?: (error: Error, inputs: Inputs) => void;
  onCancel?: (inputs: Inputs) => void;
  onSuccess?: (result: Result, inputs: Inputs) => void;
}

interface Injection {
  abortSignal?: AbortController['signal'];
}

declare class Task<Result> {
  constructor (promise: Promise<Result> | Result, cancel?: VoidCallback);
  promise: Promise<Result>;
  cancel: VoidCallback;
}

declare const useAsync: <Result, Inputs extends any[]>(
  createTask: (inputs: Inputs, injection: Injection) => Promise<Result> | Task<Result> | Result,
  inputs?: Inputs,
  config?: Config<Result, Inputs>,
) => AsyncResult<Result>;

declare const useAsyncOnDemand: <Result, Inputs extends any[]>(
  createTask: (inputs: Inputs, injection: Injection) => Promise<Result> | Task<Result> | Result,
  inputs?: Inputs,
  config?: Config<Result, Inputs>,
) => AsyncResult<Result>;

export default useAsync;
export { Task, useAsyncOnDemand };
