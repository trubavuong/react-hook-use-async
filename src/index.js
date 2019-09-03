import { useRef, useState, useEffect } from 'react';

const noop = () => { };
const ABORT_ERROR = {};

function Task(promise, cancel = noop) {
  this.promise = (promise instanceof Promise ? promise : Promise.resolve(promise));
  this.cancel = cancel;
}

function executeTask(createTask, inputs) {
  const cleanups = [];
  const cancel = () => {
    cleanups.forEach(cleanup => cleanup());
  };

  let isCanceled = false;
  cleanups.push(() => {
    isCanceled = true;
  });

  const promise = new Promise((resolve, reject) => {
    try {
      let task = createTask(inputs);
      if (!(task instanceof Task)) {
        task = new Task(task);
      }
      task.promise.then(
        result => (!isCanceled && resolve(result)),
        error => (!isCanceled && reject(error)),
      );

      cleanups.push(() => task.cancel());
      cleanups.push(() => reject(ABORT_ERROR));
    }
    catch (error) {
      reject(error);
    }
  });

  return { cancel, promise };
}

function useAsync(
  createTask,
  inputs = [],
  {
    onError,
    onCancel,
    onSuccess,
    isOnDemand = false,
  } = {},
) {
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

export default useAsync;
export { Task };
