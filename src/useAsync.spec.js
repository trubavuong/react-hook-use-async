import React from 'react';

import {
  render,
  cleanup,
  fireEvent,
  waitForElement,
} from '@testing-library/react';

import '@testing-library/jest-dom/extend-expect';

import useAsync, { Task } from './useAsync';

const NO_ERROR = { message: '' };
const BIG_NUMBER_ERROR = new Error('BigNumber');

function UsersInternal({
  ids,
  onError,
  onCancel,
  onSuccess,
  isOnDemand,
  returnAsPromise,
  returnAsTask,
  cancelTask,
}) {
  const {
    result,
    error,
    isPending,
    cancel,
    execute,
  } = useAsync(
    ([runtimeIds = []]) => {
      if (returnAsPromise) {
        const promise = new Promise((resolve, reject) => {
          setTimeout(
            () => {
              if (runtimeIds.length === 0 || runtimeIds[0] < 10) {
                const users = runtimeIds.map(id => ({ id }));
                resolve(users);
              }
              else {
                reject(BIG_NUMBER_ERROR);
              }
            },
            1000,
          );
        });
        return returnAsTask ? new Task(promise, cancelTask) : promise;
      }

      if (runtimeIds.length === 0 || runtimeIds[0] < 10) {
        const users = runtimeIds.map(id => ({ id }));
        return returnAsTask ? new Task(users, cancelTask) : users;
      }

      throw BIG_NUMBER_ERROR;
    },
    (ids ? [ids] : undefined),
    (
      (onError || onCancel || onSuccess || typeof isOnDemand !== 'undefined')
        ? {
          onError,
          onCancel,
          onSuccess,
          isOnDemand,
        }
        : undefined
    ),
  );

  return (
    <div>
      <ul className="users">
        {result && result.map(({ id }) => (
          <li className="user" key={id}>{id}</li>
        ))}
      </ul>
      <div className="error">{error && error.message}</div>
      <div className="isPending">{isPending.toString()}</div>
      <button className="cancel" type="button" onClick={cancel}>Cancel</button>
      <button className="execute" type="button" onClick={execute}>Execute</button>
    </div>
  );
}

function Users(props) {
  // eslint-disable-next-line react/jsx-props-no-spreading
  return <UsersInternal {...props} returnAsPromise />;
}

function UsersOnDemand(props) {
  // eslint-disable-next-line react/jsx-props-no-spreading
  return <UsersInternal {...props} isOnDemand returnAsPromise />;
}

function UsersNonPromise(props) {
  // eslint-disable-next-line react/jsx-props-no-spreading
  return <UsersInternal {...props} returnAsPromise={false} />;
}

function UsersOnDemandNonPromise(props) {
  // eslint-disable-next-line react/jsx-props-no-spreading
  return <UsersInternal {...props} isOnDemand returnAsPromise={false} />;
}

describe('useAsync.js', () => {
  beforeEach(() => {
    jest.useFakeTimers();
  });

  afterEach(() => {
    jest.useRealTimers();
  });

  afterEach(cleanup);

  async function testRenderUsers(container, { result, error, isPending }) {
    await waitForElement(() => container.getElementsByClassName('user'));

    const users = container.querySelectorAll('.user');
    expect(users).toHaveLength(result.length);
    users.forEach((user, i) => {
      expect(user.textContent).toEqual(result[i].toString());
    });

    expect(container.querySelector('.error').textContent).toEqual(error.message);
    expect(container.querySelector('.isPending').textContent).toEqual(isPending.toString());
  }

  async function testRenderUsersNoLoad(container) {
    jest.advanceTimersByTime(100);
    await testRenderUsers(container, { result: [], error: NO_ERROR, isPending: false });

    jest.advanceTimersByTime(1000);
    await testRenderUsers(container, { result: [], error: NO_ERROR, isPending: false });

    jest.advanceTimersByTime(5000);
    await testRenderUsers(container, { result: [], error: NO_ERROR, isPending: false });
  }

  async function testRenderUsersLoad(container, { from, to }) {
    jest.advanceTimersByTime(100);
    await testRenderUsers(container, { ...from, isPending: true });

    jest.advanceTimersByTime(1000);
    await testRenderUsers(container, { ...to, isPending: false });

    jest.advanceTimersByTime(5000);
    await testRenderUsers(container, { ...to, isPending: false });
  }

  describe('useAsync()', () => {
    describe('with promise', () => {
      it('should render with default inputs', async () => {
        const { container } = render(<Users />);
        await testRenderUsersLoad(container, {
          from: { result: [], error: NO_ERROR },
          to: { result: [], error: NO_ERROR },
        });
      });

      it('should render with lazy success', async () => {
        const { container } = render(<Users ids={[1, 2, 3]} />);
        await testRenderUsersLoad(container, {
          from: { result: [], error: NO_ERROR },
          to: { result: [1, 2, 3], error: NO_ERROR },
        });
      });

      it('should render with lazy error', async () => {
        const { container } = render(<Users ids={[100, 99, 98]} />);
        await testRenderUsersLoad(container, {
          from: { result: [], error: NO_ERROR },
          to: { result: [], error: BIG_NUMBER_ERROR },
        });
      });

      it('should render with lazy success then error', async () => {
        const { container, rerender } = render(<Users ids={[1, 2, 3]} />);
        await testRenderUsersLoad(container, {
          from: { result: [], error: NO_ERROR },
          to: { result: [1, 2, 3], error: NO_ERROR },
        });

        rerender(<Users ids={[100, 99, 98]} />);
        await testRenderUsersLoad(container, {
          from: { result: [1, 2, 3], error: NO_ERROR },
          to: { result: [], error: BIG_NUMBER_ERROR },
        });
      });

      it('should render with lazy error then success', async () => {
        const { container, rerender } = render(<Users ids={[100, 99, 98]} />);
        await testRenderUsersLoad(container, {
          from: { result: [], error: NO_ERROR },
          to: { result: [], error: BIG_NUMBER_ERROR },
        });

        rerender(<Users ids={[1, 2, 3]} />);
        await testRenderUsersLoad(container, {
          from: { result: [], error: BIG_NUMBER_ERROR },
          to: { result: [1, 2, 3], error: NO_ERROR },
        });
      });

      it('should notify with lazy success', async () => {
        const onError = jest.fn();
        const onCancel = jest.fn();
        const onSuccess = jest.fn();
        const { container } = render(
          <Users ids={[1, 2, 3]} onError={onError} onSuccess={onSuccess} onCancel={onCancel} />,
        );

        jest.advanceTimersByTime(100);
        await testRenderUsers(container, { result: [], error: NO_ERROR, isPending: true });
        expect(onError).not.toHaveBeenCalled();
        expect(onCancel).not.toHaveBeenCalled();
        expect(onSuccess).not.toHaveBeenCalled();

        jest.advanceTimersByTime(1000);
        await testRenderUsers(container, { result: [1, 2, 3], error: NO_ERROR, isPending: false });
        expect(onError).not.toHaveBeenCalled();
        expect(onCancel).not.toHaveBeenCalled();
        expect(onSuccess).toHaveBeenCalledTimes(1);
        expect(onSuccess).toHaveBeenCalledWith([{ id: 1 }, { id: 2 }, { id: 3 }], [[1, 2, 3]]);

        jest.advanceTimersByTime(5000);
        await testRenderUsers(container, { result: [1, 2, 3], error: NO_ERROR, isPending: false });
        expect(onError).not.toHaveBeenCalled();
        expect(onCancel).not.toHaveBeenCalled();
        expect(onSuccess).toHaveBeenCalledTimes(1);
      });

      it('should notify with lazy error', async () => {
        const onError = jest.fn();
        const onCancel = jest.fn();
        const onSuccess = jest.fn();
        const { container } = render(
          <Users ids={[100, 99, 98]} onError={onError} onSuccess={onSuccess} onCancel={onCancel} />,
        );

        jest.advanceTimersByTime(100);
        await testRenderUsers(container, { result: [], error: NO_ERROR, isPending: true });
        expect(onError).not.toHaveBeenCalled();
        expect(onCancel).not.toHaveBeenCalled();
        expect(onSuccess).not.toHaveBeenCalled();

        jest.advanceTimersByTime(1000);
        await testRenderUsers(container, { result: [], error: BIG_NUMBER_ERROR, isPending: false });
        expect(onError).toHaveBeenCalledTimes(1);
        expect(onError).toHaveBeenCalledWith(BIG_NUMBER_ERROR, [[100, 99, 98]]);
        expect(onCancel).not.toHaveBeenCalled();
        expect(onSuccess).not.toHaveBeenCalled();

        jest.advanceTimersByTime(5000);
        await testRenderUsers(container, { result: [], error: BIG_NUMBER_ERROR, isPending: false });
        expect(onError).toHaveBeenCalledTimes(1);
        expect(onCancel).not.toHaveBeenCalled();
        expect(onSuccess).not.toHaveBeenCalled();
      });

      it('should cancel render with lazy success', async () => {
        const onCancel = jest.fn();
        const { container } = render(<Users ids={[1, 2, 3]} onCancel={onCancel} />);

        jest.advanceTimersByTime(100);
        await testRenderUsers(container, { result: [], error: NO_ERROR, isPending: true });
        expect(onCancel).not.toHaveBeenCalled();

        fireEvent.click(container.querySelector('button.cancel'));

        jest.advanceTimersByTime(0);
        await testRenderUsers(container, { result: [], error: NO_ERROR, isPending: false });
        expect(onCancel).toHaveBeenCalledTimes(1);
        expect(onCancel).toHaveBeenCalledWith([[1, 2, 3]]);

        jest.advanceTimersByTime(5000);
        await testRenderUsers(container, { result: [], error: NO_ERROR, isPending: false });
        expect(onCancel).toHaveBeenCalledTimes(1);
      });

      it('should cancel render with lazy success return as task', async () => {
        const onCancel = jest.fn();
        const cancelTask = jest.fn();
        const { container } = render(
          <Users
            ids={[1, 2, 3]}
            onCancel={onCancel}
            returnAsTask
            cancelTask={cancelTask}
          />,
        );

        jest.advanceTimersByTime(100);
        await testRenderUsers(container, { result: [], error: NO_ERROR, isPending: true });
        expect(onCancel).not.toHaveBeenCalled();
        expect(cancelTask).not.toHaveBeenCalled();

        fireEvent.click(container.querySelector('button.cancel'));

        jest.advanceTimersByTime(0);
        await testRenderUsers(container, { result: [], error: NO_ERROR, isPending: false });
        expect(onCancel).toHaveBeenCalledTimes(1);
        expect(onCancel).toHaveBeenCalledWith([[1, 2, 3]]);
        expect(cancelTask).toHaveBeenCalledTimes(1);
        expect(cancelTask).toHaveBeenCalledWith();

        jest.advanceTimersByTime(5000);
        await testRenderUsers(container, { result: [], error: NO_ERROR, isPending: false });
        expect(onCancel).toHaveBeenCalledTimes(1);
        expect(cancelTask).toHaveBeenCalledTimes(1);
      });

      it('should cancel render with lazy error', async () => {
        const onCancel = jest.fn();
        const { container } = render(<Users ids={[100, 99, 98]} onCancel={onCancel} />);

        jest.advanceTimersByTime(100);
        await testRenderUsers(container, { result: [], error: NO_ERROR, isPending: true });
        expect(onCancel).not.toHaveBeenCalled();

        fireEvent.click(container.querySelector('button.cancel'));

        jest.advanceTimersByTime(0);
        await testRenderUsers(container, { result: [], error: NO_ERROR, isPending: false });
        expect(onCancel).toHaveBeenCalledTimes(1);
        expect(onCancel).toHaveBeenCalledWith([[100, 99, 98]]);

        jest.advanceTimersByTime(5000);
        await testRenderUsers(container, { result: [], error: NO_ERROR, isPending: false });
        expect(onCancel).toHaveBeenCalledTimes(1);
      });

      it('should cancel render with lazy error return as task', async () => {
        const onCancel = jest.fn();
        const cancelTask = jest.fn();
        const { container } = render(
          <Users
            ids={[100, 99, 98]}
            onCancel={onCancel}
            returnAsTask
            cancelTask={cancelTask}
          />,
        );

        jest.advanceTimersByTime(100);
        await testRenderUsers(container, { result: [], error: NO_ERROR, isPending: true });
        expect(onCancel).not.toHaveBeenCalled();
        expect(cancelTask).not.toHaveBeenCalled();

        fireEvent.click(container.querySelector('button.cancel'));

        jest.advanceTimersByTime(0);
        await testRenderUsers(container, { result: [], error: NO_ERROR, isPending: false });
        expect(onCancel).toHaveBeenCalledTimes(1);
        expect(onCancel).toHaveBeenCalledWith([[100, 99, 98]]);
        expect(cancelTask).toHaveBeenCalledTimes(1);
        expect(cancelTask).toHaveBeenCalledWith();

        jest.advanceTimersByTime(5000);
        await testRenderUsers(container, { result: [], error: NO_ERROR, isPending: false });
        expect(onCancel).toHaveBeenCalledTimes(1);
        expect(cancelTask).toHaveBeenCalledTimes(1);
      });

      it('should rerender with lazy success when re-execute', async () => {
        const { container } = render(<Users ids={[1, 2, 3]} />);

        jest.advanceTimersByTime(100);
        await testRenderUsers(container, { result: [], error: NO_ERROR, isPending: true });

        fireEvent.click(container.querySelector('button.cancel'));
        fireEvent.click(container.querySelector('button.execute'));

        jest.advanceTimersByTime(1000);
        await testRenderUsers(container, { result: [1, 2, 3], error: NO_ERROR, isPending: false });

        jest.advanceTimersByTime(5000);
        await testRenderUsers(container, { result: [1, 2, 3], error: NO_ERROR, isPending: false });
      });

      it('should rerender with lazy error when re-execute', async () => {
        const { container } = render(<Users ids={[100, 99, 98]} />);

        jest.advanceTimersByTime(100);
        await testRenderUsers(container, { result: [], error: NO_ERROR, isPending: true });

        fireEvent.click(container.querySelector('button.cancel'));
        fireEvent.click(container.querySelector('button.execute'));

        jest.advanceTimersByTime(1000);
        await testRenderUsers(container, { result: [], error: BIG_NUMBER_ERROR, isPending: false });

        jest.advanceTimersByTime(5000);
        await testRenderUsers(container, { result: [], error: BIG_NUMBER_ERROR, isPending: false });
      });
    });

    describe('with non-promise', () => {
      it('should render with default inputs', async () => {
        const { container } = render(<UsersNonPromise />);

        jest.advanceTimersByTime(0);
        await testRenderUsers(container, { result: [], error: NO_ERROR, isPending: false });
      });

      it('should render with success', async () => {
        const { container } = render(<UsersNonPromise ids={[1, 2, 3]} />);

        jest.advanceTimersByTime(0);
        await testRenderUsers(container, { result: [1, 2, 3], error: NO_ERROR, isPending: false });
      });

      it('should render with error', async () => {
        const { container } = render(<UsersNonPromise ids={[100, 99, 98]} />);

        jest.advanceTimersByTime(0);
        await testRenderUsers(container, { result: [], error: BIG_NUMBER_ERROR, isPending: false });
      });

      it('should render with success then error', async () => {
        const { container, rerender } = render(<UsersNonPromise ids={[1, 2, 3]} />);

        jest.advanceTimersByTime(0);
        await testRenderUsers(container, { result: [1, 2, 3], error: NO_ERROR, isPending: false });

        rerender(<UsersNonPromise ids={[100, 99, 98]} />);

        jest.advanceTimersByTime(0);
        await testRenderUsers(container, { result: [], error: BIG_NUMBER_ERROR, isPending: false });
      });

      it('should render with error then success', async () => {
        const { container, rerender } = render(<UsersNonPromise ids={[100, 99, 98]} />);

        jest.advanceTimersByTime(0);
        await testRenderUsers(container, { result: [], error: BIG_NUMBER_ERROR, isPending: false });

        rerender(<UsersNonPromise ids={[1, 2, 3]} />);

        jest.advanceTimersByTime(0);
        await testRenderUsers(container, { result: [1, 2, 3], error: NO_ERROR, isPending: false });
      });

      it('should notify with success', async () => {
        const onError = jest.fn();
        const onCancel = jest.fn();
        const onSuccess = jest.fn();
        const { container } = render(
          <UsersNonPromise
            ids={[1, 2, 3]}
            onError={onError}
            onSuccess={onSuccess}
            onCancel={onCancel}
          />,
        );

        jest.advanceTimersByTime(0);
        await testRenderUsers(container, { result: [1, 2, 3], error: NO_ERROR, isPending: false });
        expect(onError).not.toHaveBeenCalled();
        expect(onCancel).not.toHaveBeenCalled();
        expect(onSuccess).toHaveBeenCalledTimes(1);
        expect(onSuccess).toHaveBeenCalledWith([{ id: 1 }, { id: 2 }, { id: 3 }], [[1, 2, 3]]);
      });

      it('should notify with error', async () => {
        const onError = jest.fn();
        const onCancel = jest.fn();
        const onSuccess = jest.fn();
        const { container } = render(
          <UsersNonPromise
            ids={[100, 99, 98]}
            onError={onError}
            onSuccess={onSuccess}
            onCancel={onCancel}
          />,
        );

        jest.advanceTimersByTime(0);
        await testRenderUsers(container, { result: [], error: BIG_NUMBER_ERROR, isPending: false });
        expect(onError).toHaveBeenCalledTimes(1);
        expect(onError).toHaveBeenCalledWith(BIG_NUMBER_ERROR, [[100, 99, 98]]);
        expect(onCancel).not.toHaveBeenCalled();
        expect(onSuccess).not.toHaveBeenCalled();
      });
    });
  });

  describe('useAsync() on-demand', () => {
    describe('with promise', () => {
      it('should render nothing with default inputs', async () => {
        const { container } = render(<UsersOnDemand />);
        await testRenderUsersNoLoad(container);
      });

      it('should render nothing with lazy success', async () => {
        const { container } = render(<UsersOnDemand ids={[1, 2, 3]} />);
        await testRenderUsersNoLoad(container);
      });

      it('should render nothing with lazy error', async () => {
        const { container } = render(<UsersOnDemand ids={[100, 99, 98]} />);
        await testRenderUsersNoLoad(container);
      });

      it('should render nothing with lazy success then error', async () => {
        const { container, rerender } = render(<UsersOnDemand ids={[1, 2, 3]} />);
        await testRenderUsersNoLoad(container);

        rerender(<UsersOnDemand ids={[100, 99, 98]} />);
        await testRenderUsersNoLoad(container);
      });

      it('should render nothing with lazy error then success', async () => {
        const { container, rerender } = render(<UsersOnDemand ids={[100, 99, 98]} />);
        await testRenderUsersNoLoad(container);

        rerender(<UsersOnDemand ids={[1, 2, 3]} />);
        await testRenderUsersNoLoad(container);
      });

      it('should not notify with lazy success', async () => {
        const onError = jest.fn();
        const onCancel = jest.fn();
        const onSuccess = jest.fn();
        const { container } = render(
          <UsersOnDemand
            ids={[1, 2, 3]}
            onError={onError}
            onSuccess={onSuccess}
            onCancel={onCancel}
          />,
        );

        await testRenderUsersNoLoad(container);
        expect(onError).not.toHaveBeenCalled();
        expect(onCancel).not.toHaveBeenCalled();
        expect(onSuccess).not.toHaveBeenCalled();
      });

      it('should notify with lazy success', async () => {
        const onError = jest.fn();
        const onCancel = jest.fn();
        const onSuccess = jest.fn();
        const { container } = render(
          <UsersOnDemand
            ids={[1, 2, 3]}
            onError={onError}
            onSuccess={onSuccess}
            onCancel={onCancel}
          />,
        );

        fireEvent.click(container.querySelector('button.execute'));

        jest.advanceTimersByTime(100);
        await testRenderUsers(container, { result: [], error: NO_ERROR, isPending: true });
        expect(onError).not.toHaveBeenCalled();
        expect(onCancel).not.toHaveBeenCalled();
        expect(onSuccess).not.toHaveBeenCalled();

        jest.advanceTimersByTime(1000);
        await testRenderUsers(container, { result: [1, 2, 3], error: NO_ERROR, isPending: false });
        expect(onError).not.toHaveBeenCalled();
        expect(onCancel).not.toHaveBeenCalled();
        expect(onSuccess).toHaveBeenCalledTimes(1);
        expect(onSuccess).toHaveBeenCalledWith([{ id: 1 }, { id: 2 }, { id: 3 }], [[1, 2, 3]]);
      });

      it('should not notify with lazy error', async () => {
        const onError = jest.fn();
        const onCancel = jest.fn();
        const onSuccess = jest.fn();
        const { container } = render(
          <UsersOnDemand
            ids={[100, 99, 98]}
            onError={onError}
            onSuccess={onSuccess}
            onCancel={onCancel}
          />,
        );

        await testRenderUsersNoLoad(container);
        expect(onError).not.toHaveBeenCalled();
        expect(onCancel).not.toHaveBeenCalled();
        expect(onSuccess).not.toHaveBeenCalled();
      });

      it('should notify with lazy error', async () => {
        const onError = jest.fn();
        const onCancel = jest.fn();
        const onSuccess = jest.fn();
        const { container } = render(
          <UsersOnDemand
            ids={[100, 99, 98]}
            onError={onError}
            onSuccess={onSuccess}
            onCancel={onCancel}
          />,
        );

        fireEvent.click(container.querySelector('button.execute'));

        jest.advanceTimersByTime(100);
        await testRenderUsers(container, { result: [], error: NO_ERROR, isPending: true });
        expect(onError).not.toHaveBeenCalled();
        expect(onCancel).not.toHaveBeenCalled();
        expect(onSuccess).not.toHaveBeenCalled();

        jest.advanceTimersByTime(1000);
        await testRenderUsers(container, { result: [], error: BIG_NUMBER_ERROR, isPending: false });
        expect(onError).toHaveBeenCalledTimes(1);
        expect(onError).toHaveBeenCalledWith(BIG_NUMBER_ERROR, [[100, 99, 98]]);
        expect(onCancel).not.toHaveBeenCalled();
        expect(onSuccess).not.toHaveBeenCalled();
      });

      it('should rerender with lazy success when re-execute', async () => {
        const { container } = render(<UsersOnDemand ids={[1, 2, 3]} />);
        await testRenderUsersNoLoad(container);

        fireEvent.click(container.querySelector('button.execute'));

        jest.advanceTimersByTime(100);
        await testRenderUsers(container, { result: [], error: NO_ERROR, isPending: true });

        jest.advanceTimersByTime(1000);
        await testRenderUsers(container, { result: [1, 2, 3], error: NO_ERROR, isPending: false });

        jest.advanceTimersByTime(5000);
        await testRenderUsers(container, { result: [1, 2, 3], error: NO_ERROR, isPending: false });
      });

      it('should rerender with lazy error when re-execute', async () => {
        const { container } = render(<UsersOnDemand ids={[100, 99, 98]} />);
        await testRenderUsersNoLoad(container);

        fireEvent.click(container.querySelector('button.execute'));

        jest.advanceTimersByTime(100);
        await testRenderUsers(container, { result: [], error: NO_ERROR, isPending: true });

        jest.advanceTimersByTime(1000);
        await testRenderUsers(container, { result: [], error: BIG_NUMBER_ERROR, isPending: false });

        jest.advanceTimersByTime(5000);
        await testRenderUsers(container, { result: [], error: BIG_NUMBER_ERROR, isPending: false });
      });

      it('should cancel render with lazy success', async () => {
        const onCancel = jest.fn();
        const { container } = render(<UsersOnDemand ids={[1, 2, 3]} onCancel={onCancel} />);
        await testRenderUsersNoLoad(container);

        fireEvent.click(container.querySelector('button.execute'));

        jest.advanceTimersByTime(100);
        await testRenderUsers(container, { result: [], error: NO_ERROR, isPending: true });
        expect(onCancel).not.toHaveBeenCalled();

        fireEvent.click(container.querySelector('button.cancel'));

        jest.advanceTimersByTime(0);
        await testRenderUsers(container, { result: [], error: NO_ERROR, isPending: false });
        expect(onCancel).toHaveBeenCalledTimes(1);
        expect(onCancel).toHaveBeenCalledWith([[1, 2, 3]]);

        jest.advanceTimersByTime(5000);
        await testRenderUsers(container, { result: [], error: NO_ERROR, isPending: false });
        expect(onCancel).toHaveBeenCalledTimes(1);
      });

      it('should cancel render with lazy success return as task', async () => {
        const onCancel = jest.fn();
        const cancelTask = jest.fn();
        const { container } = render(
          <UsersOnDemand
            ids={[1, 2, 3]}
            onCancel={onCancel}
            returnAsTask
            cancelTask={cancelTask}
          />,
        );
        await testRenderUsersNoLoad(container);

        fireEvent.click(container.querySelector('button.execute'));

        jest.advanceTimersByTime(100);
        await testRenderUsers(container, { result: [], error: NO_ERROR, isPending: true });
        expect(onCancel).not.toHaveBeenCalled();
        expect(cancelTask).not.toHaveBeenCalled();

        fireEvent.click(container.querySelector('button.cancel'));

        jest.advanceTimersByTime(0);
        await testRenderUsers(container, { result: [], error: NO_ERROR, isPending: false });
        expect(onCancel).toHaveBeenCalledTimes(1);
        expect(onCancel).toHaveBeenCalledWith([[1, 2, 3]]);
        expect(cancelTask).toHaveBeenCalledTimes(1);
        expect(cancelTask).toHaveBeenCalledWith();

        jest.advanceTimersByTime(5000);
        await testRenderUsers(container, { result: [], error: NO_ERROR, isPending: false });
        expect(onCancel).toHaveBeenCalledTimes(1);
        expect(cancelTask).toHaveBeenCalledTimes(1);
      });

      it('should cancel render with lazy error', async () => {
        const onCancel = jest.fn();
        const { container } = render(<UsersOnDemand ids={[100, 99, 98]} onCancel={onCancel} />);
        await testRenderUsersNoLoad(container);

        fireEvent.click(container.querySelector('button.execute'));

        jest.advanceTimersByTime(100);
        await testRenderUsers(container, { result: [], error: NO_ERROR, isPending: true });
        expect(onCancel).not.toHaveBeenCalled();

        fireEvent.click(container.querySelector('button.cancel'));

        jest.advanceTimersByTime(0);
        await testRenderUsers(container, { result: [], error: NO_ERROR, isPending: false });
        expect(onCancel).toHaveBeenCalledTimes(1);
        expect(onCancel).toHaveBeenCalledWith([[100, 99, 98]]);

        jest.advanceTimersByTime(5000);
        await testRenderUsers(container, { result: [], error: NO_ERROR, isPending: false });
        expect(onCancel).toHaveBeenCalledTimes(1);
      });

      it('should cancel render with lazy error return as task', async () => {
        const onCancel = jest.fn();
        const cancelTask = jest.fn();
        const { container } = render(
          <UsersOnDemand
            ids={[100, 99, 98]}
            onCancel={onCancel}
            returnAsTask
            cancelTask={cancelTask}
          />,
        );
        await testRenderUsersNoLoad(container);

        fireEvent.click(container.querySelector('button.execute'));

        jest.advanceTimersByTime(100);
        await testRenderUsers(container, { result: [], error: NO_ERROR, isPending: true });
        expect(onCancel).not.toHaveBeenCalled();
        expect(cancelTask).not.toHaveBeenCalled();

        fireEvent.click(container.querySelector('button.cancel'));

        jest.advanceTimersByTime(0);
        await testRenderUsers(container, { result: [], error: NO_ERROR, isPending: false });
        expect(onCancel).toHaveBeenCalledTimes(1);
        expect(onCancel).toHaveBeenCalledWith([[100, 99, 98]]);
        expect(cancelTask).toHaveBeenCalledTimes(1);
        expect(cancelTask).toHaveBeenCalledWith();

        jest.advanceTimersByTime(5000);
        await testRenderUsers(container, { result: [], error: NO_ERROR, isPending: false });
        expect(onCancel).toHaveBeenCalledTimes(1);
        expect(cancelTask).toHaveBeenCalledTimes(1);
      });
    });

    describe('with non-promise', () => {
      it('should render nothing with default inputs', async () => {
        const { container } = render(<UsersOnDemandNonPromise />);
        await testRenderUsersNoLoad(container);
      });

      it('should render nothing with success', async () => {
        const { container } = render(<UsersOnDemandNonPromise ids={[1, 2, 3]} />);
        await testRenderUsersNoLoad(container);
      });

      it('should render nothing with error', async () => {
        const { container } = render(<UsersOnDemandNonPromise ids={[100, 99, 98]} />);
        await testRenderUsersNoLoad(container);
      });

      it('should render nothing with success then error', async () => {
        const { container, rerender } = render(<UsersOnDemandNonPromise ids={[1, 2, 3]} />);
        await testRenderUsersNoLoad(container);

        rerender(<UsersOnDemandNonPromise ids={[100, 99, 98]} />);
        await testRenderUsersNoLoad(container);
      });

      it('should render nothing with error then success', async () => {
        const { container, rerender } = render(<UsersOnDemandNonPromise ids={[100, 99, 98]} />);
        await testRenderUsersNoLoad(container);

        rerender(<UsersOnDemandNonPromise ids={[1, 2, 3]} />);
        await testRenderUsersNoLoad(container);
      });

      it('should not notify with success', async () => {
        const onError = jest.fn();
        const onCancel = jest.fn();
        const onSuccess = jest.fn();
        const { container } = render(
          <UsersOnDemandNonPromise
            ids={[1, 2, 3]}
            onError={onError}
            onSuccess={onSuccess}
            onCancel={onCancel}
          />,
        );

        await testRenderUsersNoLoad(container);
        expect(onError).not.toHaveBeenCalled();
        expect(onCancel).not.toHaveBeenCalled();
        expect(onSuccess).not.toHaveBeenCalled();
      });

      it('should notify with success', async () => {
        const onError = jest.fn();
        const onCancel = jest.fn();
        const onSuccess = jest.fn();
        const { container } = render(
          <UsersOnDemandNonPromise
            ids={[1, 2, 3]}
            onError={onError}
            onSuccess={onSuccess}
            onCancel={onCancel}
          />,
        );

        fireEvent.click(container.querySelector('button.execute'));

        jest.advanceTimersByTime(0);
        await testRenderUsers(container, { result: [1, 2, 3], error: NO_ERROR, isPending: false });
        expect(onError).not.toHaveBeenCalled();
        expect(onCancel).not.toHaveBeenCalled();
        expect(onSuccess).toHaveBeenCalledTimes(1);
        expect(onSuccess).toHaveBeenCalledWith([{ id: 1 }, { id: 2 }, { id: 3 }], [[1, 2, 3]]);
      });

      it('should not notify with error', async () => {
        const onError = jest.fn();
        const onCancel = jest.fn();
        const onSuccess = jest.fn();
        const { container } = render(
          <UsersOnDemandNonPromise
            ids={[100, 99, 98]}
            onError={onError}
            onSuccess={onSuccess}
            onCancel={onCancel}
          />,
        );

        await testRenderUsersNoLoad(container);
        expect(onError).not.toHaveBeenCalled();
        expect(onCancel).not.toHaveBeenCalled();
        expect(onSuccess).not.toHaveBeenCalled();
      });

      it('should notify with error', async () => {
        const onError = jest.fn();
        const onCancel = jest.fn();
        const onSuccess = jest.fn();
        const { container } = render(
          <UsersOnDemandNonPromise
            ids={[100, 99, 98]}
            onError={onError}
            onSuccess={onSuccess}
            onCancel={onCancel}
          />,
        );

        fireEvent.click(container.querySelector('button.execute'));

        jest.advanceTimersByTime(0);
        await testRenderUsers(container, { result: [], error: BIG_NUMBER_ERROR, isPending: false });
        expect(onError).toHaveBeenCalledTimes(1);
        expect(onError).toHaveBeenCalledWith(BIG_NUMBER_ERROR, [[100, 99, 98]]);
        expect(onCancel).not.toHaveBeenCalled();
        expect(onSuccess).not.toHaveBeenCalled();
      });

      it('should rerender with success when re-execute', async () => {
        const { container } = render(<UsersOnDemandNonPromise ids={[1, 2, 3]} />);
        await testRenderUsersNoLoad(container);

        fireEvent.click(container.querySelector('button.execute'));

        jest.advanceTimersByTime(0);
        await testRenderUsers(container, { result: [1, 2, 3], error: NO_ERROR, isPending: false });
      });

      it('should rerender with error when re-execute', async () => {
        const { container } = render(<UsersOnDemandNonPromise ids={[100, 99, 98]} />);
        await testRenderUsersNoLoad(container);

        fireEvent.click(container.querySelector('button.execute'));

        jest.advanceTimersByTime(0);
        await testRenderUsers(container, { result: [], error: BIG_NUMBER_ERROR, isPending: false });
      });
    });
  });
});
