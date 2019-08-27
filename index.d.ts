interface AsyncResult<Result> {
  error?: Error,
  result?: Result,
  promise?: Promise<Result>,
  isPending: boolean,
  cancel: () => void,
  execute: () => void,
}

interface Config<Result, Inputs> {
  onError?: (error: Error, inputs: Inputs) => void,
  onSuccess?: (result: Result, inputs: Inputs) => void,
}

interface Injection {
  abortSignal: AbortController['signal']
}

declare function useAsync<Result, Inputs extends any[]>(
  createTask: (inputs: Inputs, injection: Injection) => Promise<Result> | Result,
  inputs?: Inputs,
  config?: Config<Result, Inputs>,
): AsyncResult<Result>;

declare function useAsyncOnDemand<Result, Inputs extends any[]>(
  createTask: (inputs: Inputs) => Promise<Result> | Result,
  inputs?: Inputs,
  config?: Config<Result, Inputs>,
): AsyncResult<Result>;

export default useAsync;
export { useAsyncOnDemand };