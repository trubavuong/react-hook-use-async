import {
  useRef,
  useState,
  useEffect,
  useReducer,
} from 'react';

const noop = () => {};

const Action = {
  EXECUTE: 'execute',
  RESOLVE: 'resolve',
  REJECT: 'reject',
};

function taskReducer(state, { type, payload }) {
  switch (type) {
    case Action.EXECUTE:
      return { ...state, isPending: true };

    case Action.RESOLVE:
      return { result: payload, isPending: false };

    case Action.REJECT:
      return { error: payload, isPending: false };

    /* istanbul ignore next */
    default:
      return state;
  }
}

function initTaskState() {
  return { isPending: false };
}

function createAbortError() {
  const error = new Error('The operation was aborted');
  error.name = 'AbortError';
  return error;
}

function executeTask(createTask, inputs) {
  let isCancelled = false;
  const cancel = () => {
    isCancelled = true;
  };

  let proxyPromise;
  try {
    const task = createTask(inputs);
    const taskPromise = (task instanceof Promise ? task : Promise.resolve(task));
    proxyPromise = new Promise((resolve, reject) => {
      taskPromise.then(
        result => (isCancelled ? reject(createAbortError()) : resolve(result)),
        error => (isCancelled ? reject(createAbortError()) : reject(error)),
      );
    });
  }
  catch (error) {
    proxyPromise = Promise.reject(error);
  }

  return { cancel, promise: proxyPromise };
}

function executeTaskOnEffect(dispatch, createTask, inputs, { onError = noop, onSuccess = noop }) {
  const task = executeTask(createTask, inputs);
  dispatch({ type: Action.EXECUTE });

  task.promise.then(
    result => {
      dispatch({ type: Action.RESOLVE, payload: result });
      onSuccess(result, inputs);
    },
    error => {
      dispatch({ type: Action.REJECT, payload: error });
      onError(error, inputs);
    },
  );

  return task;
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

  const [state, dispatch] = useReducer(taskReducer, {}, initTaskState);
  useEffect(
    () => {
      if (staticConfig.isOnDemand && count === 0) {
        return noop;
      }

      const task = executeTaskOnEffect(
        dispatch,
        self.createTask,
        inputs,
        { onError: self.onError, onSuccess: self.onSuccess },
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
