import { useRef, useState, useEffect } from 'react';

const noop = () => { };
const ABORT_ERROR = {};

function executeTask(createTask, inputs) {
  const abortController = (typeof AbortController !== 'undefined' ? new AbortController() : null);
  const abortSignal = (abortController ? abortController.signal : undefined);
  const abortByController = (abortController ? () => abortController.abort() : noop);

  const injection = { abortSignal };

  let isCanceled = false;
  const cancel = () => {
    isCanceled = true;
    abortByController();
  };

  let proxyPromise;
  try {
    const task = createTask(inputs, injection);
    const taskPromise = (task instanceof Promise ? task : Promise.resolve(task));
    proxyPromise = new Promise((resolve, reject) => {
      taskPromise.then(
        result => (isCanceled ? reject(ABORT_ERROR) : resolve(result)),
        error => (isCanceled ? reject(ABORT_ERROR) : reject(error)),
      );
    });
  }
  catch (error) {
    proxyPromise = Promise.reject(error);
  }

  return { cancel, promise: proxyPromise };
}

function useAsyncInternal(createTask, inputs, { onError, onSuccess, isOnDemand }) {
  const staticConfig = useRef({ isOnDemand }).current;

  const selfRef = useRef({ task: { cancel: noop } });
  const self = selfRef.current;
  useEffect(
    () => {
      Object.assign(self, { onError, onSuccess, createTask });
    },
  );

  const [count, setCount] = useState(0);
  const execute = () => {
    setCount(prevCount => prevCount + 1);
  };

  const [state, setState] = useState({ isPending: false });
  useEffect(
    () => {
      if (staticConfig.isOnDemand && count === 0) {
        return noop;
      }

      const {
        createTask: createTaskSelf,
        onError: onErrorSelf = noop,
        onSuccess: onSuccessSelf = noop,
      } = self;

      const task = executeTask(createTaskSelf, inputs);
      setState(prevState => ({ ...prevState, isPending: true }));

      task.promise.then(
        result => {
          setState({ result, isPending: false });
          onSuccessSelf(result, inputs);
        },
        error => {
          if (error === ABORT_ERROR) {
            setState(prevState => ({ ...prevState, isPending: false }));
          }
          else {
            setState({ error, isPending: false });
            onErrorSelf(error, inputs);
          }
        },
      );
      self.task = task;

      return () => {
        task.cancel();
      };
    },
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [count, ...(staticConfig.isOnDemand ? [] : inputs)],
  );

  return { execute, ...state, ...self.task };
}

function useAsync(createTask, inputs = [], config = {}) {
  return useAsyncInternal(createTask, inputs, { ...config, isOnDemand: false });
}

function useAsyncOnDemand(createTask, inputs = [], config = {}) {
  return useAsyncInternal(createTask, inputs, { ...config, isOnDemand: true });
}

export default useAsync;
export { useAsyncOnDemand };
