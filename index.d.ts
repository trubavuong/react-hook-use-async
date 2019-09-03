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
  isOnDemand?: boolean,
  onError?: (error: Error, inputs: Inputs) => void;
  onCancel?: (inputs: Inputs) => void;
  onSuccess?: (result: Result, inputs: Inputs) => void;
}

declare class Task<Result> {
  public promise: Promise<Result>;
  public cancel: VoidCallback;
  constructor(promise: Promise<Result> | Result, cancel?: VoidCallback);
}

declare const useAsync: <Result, Inputs extends any[]>(
  createTask: (inputs: Inputs) => Promise<Result> | Task<Result> | Result,
  inputs?: Inputs,
  config?: Config<Result, Inputs>,
) => AsyncResult<Result>;

export default useAsync;
export { Task };
