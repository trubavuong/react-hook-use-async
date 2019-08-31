import { useRef, useState, useEffect } from 'react';

const noop = () => { };
const ABORT_ERROR = {};

function executeTask(createTask, inputs) {
  const cleanups = [];
  const cancel = () => {
    cleanups.forEach(cleanup => cleanup());
  };

  let isCanceled = false;
  cleanups.push(() => {
    isCanceled = true;
  });

  const abortController = (typeof AbortController !== 'undefined' ? new AbortController() : null);
  if (abortController) {
    cleanups.push(() => abortController.abort());
  }

  const promise = new Promise((resolve, reject) => {
    try {
      cleanups.push(() => reject(ABORT_ERROR));

      const injection = { abortSignal: abortController && abortController.signal };
      const task = createTask(inputs, injection);
      const taskPromise = (task instanceof Promise ? task : Promise.resolve(task));
      taskPromise.then(
        result => (!isCanceled && resolve(result)),
        error => (!isCanceled && reject(error)),
      );
    }
    catch (error) {
      reject(error);
    }
  });

  return { cancel, promise };
}

function useAsyncInternal(createTask, inputs, {
  onError,
  onCancel,
  onSuccess,
  isOnDemand,
}) {
  const staticConfig = useRef({ isOnDemand }).current;

  const selfRef = useRef({ task: { cancel: noop } });
  const self = selfRef.current;
  useEffect(
    () => {
      Object.assign(self, {
        onError,
        onCancel,
        onSuccess,
        createTask,
      });
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
        onCancel: onCancelSelf = noop,
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
            onCancelSelf(inputs);
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
