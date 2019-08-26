import React from 'react';

import {
  render,
  cleanup,
  fireEvent,
  waitForElement,
} from '@testing-library/react';

import '@testing-library/jest-dom/extend-expect';

import useAsync, { useAsyncOnDemand } from './useAsync';

const BIG_NUMBER_ERROR = new Error('BigNumber');
const ABORT_ERROR = { message: 'The operation was aborted' };

function UsersInternal({
  ids,
  onError,
  onSuccess,
  useAsyncFn,
}) {
  const {
    data,
    error,
    isPending,
    cancel,
    execute,
  } = useAsyncFn(
    runtimeIds => new Promise((resolve, reject) => {
      setTimeout(
        () => {
          if (runtimeIds[0] < 10) {
            const users = runtimeIds.map(id => ({ id }));
            resolve(users);
          }
          else {
            reject(BIG_NUMBER_ERROR);
          }
        },
        1000,
      );
    }),
    ids,
    { onError, onSuccess },
  );

  return (
    <div>
      <ul className="users">
        {data && data.map(({ id }) => (
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
  return <UsersInternal {...props} useAsyncFn={useAsync} />;
}

function UsersOnDemand(props) {
  // eslint-disable-next-line react/jsx-props-no-spreading
  return <UsersInternal {...props} useAsyncFn={useAsyncOnDemand} />;
}

describe('useAsync.js', () => {
  beforeEach(() => {
    jest.useFakeTimers();
  });

  afterEach(() => {
    jest.useRealTimers();
  });

  afterEach(cleanup);

  describe('useAsync()', () => {
    async function testRender(container, { data, error, isPending }) {
      await waitForElement(() => container.getElementsByClassName('user'));

      const users = container.querySelectorAll('.user');
      expect(users).toHaveLength(data.length);
      users.forEach((user, i) => {
        expect(user.textContent).toEqual(data[i].toString());
      });

      expect(container.querySelector('.error').textContent).toEqual(error.message);
      expect(container.querySelector('.isPending').textContent).toEqual(isPending.toString());
    }

    it('should render with lazy success', async () => {
      const { container } = render(<Users ids={[1, 2, 3]} />);

      jest.advanceTimersByTime(100);
      await testRender(container, { data: [], error: { message: '' }, isPending: true });

      jest.advanceTimersByTime(1000);
      await testRender(container, { data: [1, 2, 3], error: { message: '' }, isPending: false });

      jest.advanceTimersByTime(5000);
      await testRender(container, { data: [1, 2, 3], error: { message: '' }, isPending: false });
    });

    it('should render with lazy error', async () => {
      const { container } = render(<Users ids={[100, 99, 98]} />);

      jest.advanceTimersByTime(100);
      await testRender(container, { data: [], error: { message: '' }, isPending: true });

      jest.advanceTimersByTime(1000);
      await testRender(container, { data: [], error: BIG_NUMBER_ERROR, isPending: false });

      jest.advanceTimersByTime(5000);
      await testRender(container, { data: [], error: BIG_NUMBER_ERROR, isPending: false });
    });

    it('should render with lazy success then error', async () => {
      const { container, rerender } = render(<Users ids={[1, 2, 3]} />);

      jest.advanceTimersByTime(100);
      await testRender(container, { data: [], error: { message: '' }, isPending: true });

      jest.advanceTimersByTime(1000);
      await testRender(container, { data: [1, 2, 3], error: { message: '' }, isPending: false });

      jest.advanceTimersByTime(5000);
      await testRender(container, { data: [1, 2, 3], error: { message: '' }, isPending: false });

      rerender(<Users ids={[100, 99, 98]} />);

      jest.advanceTimersByTime(100);
      await testRender(container, { data: [1, 2, 3], error: { message: '' }, isPending: true });

      jest.advanceTimersByTime(1000);
      await testRender(container, { data: [], error: BIG_NUMBER_ERROR, isPending: false });

      jest.advanceTimersByTime(5000);
      await testRender(container, { data: [], error: BIG_NUMBER_ERROR, isPending: false });
    });

    it('should render with lazy error then success', async () => {
      const { container, rerender } = render(<Users ids={[100, 99, 98]} />);

      jest.advanceTimersByTime(100);
      await testRender(container, { data: [], error: { message: '' }, isPending: true });

      jest.advanceTimersByTime(1000);
      await testRender(container, { data: [], error: BIG_NUMBER_ERROR, isPending: false });

      jest.advanceTimersByTime(5000);
      await testRender(container, { data: [], error: BIG_NUMBER_ERROR, isPending: false });

      rerender(<Users ids={[1, 2, 3]} />);

      jest.advanceTimersByTime(100);
      await testRender(container, { data: [], error: BIG_NUMBER_ERROR, isPending: true });

      jest.advanceTimersByTime(1000);
      await testRender(container, { data: [1, 2, 3], error: { message: '' }, isPending: false });

      jest.advanceTimersByTime(5000);
      await testRender(container, { data: [1, 2, 3], error: { message: '' }, isPending: false });
    });

    it('should notify with lazy success', async () => {
      const onError = jest.fn();
      const onSuccess = jest.fn();
      const { container } = render(
        <Users ids={[1, 2, 3]} onError={onError} onSuccess={onSuccess} />,
      );

      jest.advanceTimersByTime(100);
      await testRender(container, { data: [], error: { message: '' }, isPending: true });
      expect(onError).not.toHaveBeenCalled();
      expect(onSuccess).not.toHaveBeenCalled();

      jest.advanceTimersByTime(1000);
      await testRender(container, { data: [1, 2, 3], error: { message: '' }, isPending: false });
      expect(onError).not.toHaveBeenCalled();
      expect(onSuccess).toHaveBeenCalledTimes(1);
      expect(onSuccess).toHaveBeenCalledWith([{ id: 1 }, { id: 2 }, { id: 3 }], [1, 2, 3]);

      jest.advanceTimersByTime(5000);
      await testRender(container, { data: [1, 2, 3], error: { message: '' }, isPending: false });
      expect(onError).not.toHaveBeenCalled();
      expect(onSuccess).toHaveBeenCalledTimes(1);
      expect(onSuccess).toHaveBeenCalledWith([{ id: 1 }, { id: 2 }, { id: 3 }], [1, 2, 3]);
    });

    it('should notify with lazy error', async () => {
      const onError = jest.fn();
      const onSuccess = jest.fn();
      const { container } = render(
        <Users ids={[100, 99, 98]} onError={onError} onSuccess={onSuccess} />,
      );

      jest.advanceTimersByTime(100);
      await testRender(container, { data: [], error: { message: '' }, isPending: true });
      expect(onError).not.toHaveBeenCalled();
      expect(onSuccess).not.toHaveBeenCalled();

      jest.advanceTimersByTime(1000);
      await testRender(container, { data: [], error: BIG_NUMBER_ERROR, isPending: false });
      expect(onError).toHaveBeenCalledTimes(1);
      expect(onError).toHaveBeenCalledWith(BIG_NUMBER_ERROR, [100, 99, 98]);
      expect(onSuccess).not.toHaveBeenCalled();

      jest.advanceTimersByTime(5000);
      await testRender(container, { data: [], error: BIG_NUMBER_ERROR, isPending: false });
      expect(onError).toHaveBeenCalledTimes(1);
      expect(onError).toHaveBeenCalledWith(BIG_NUMBER_ERROR, [100, 99, 98]);
      expect(onSuccess).not.toHaveBeenCalled();
    });

    it('should cancel render with lazy success', async () => {
      const { container } = render(<Users ids={[1, 2, 3]} />);

      jest.advanceTimersByTime(100);
      await testRender(container, { data: [], error: { message: '' }, isPending: true });

      fireEvent.click(container.querySelector('button.cancel'));

      jest.advanceTimersByTime(1000);
      await testRender(container, { data: [], error: ABORT_ERROR, isPending: false });

      jest.advanceTimersByTime(5000);
      await testRender(container, { data: [], error: ABORT_ERROR, isPending: false });
    });

    it('should cancel render with lazy error', async () => {
      const { container } = render(<Users ids={[100, 99, 98]} />);

      jest.advanceTimersByTime(100);
      await testRender(container, { data: [], error: { message: '' }, isPending: true });

      fireEvent.click(container.querySelector('button.cancel'));

      jest.advanceTimersByTime(1000);
      await testRender(container, { data: [], error: ABORT_ERROR, isPending: false });

      jest.advanceTimersByTime(5000);
      await testRender(container, { data: [], error: ABORT_ERROR, isPending: false });
    });

    it('should rerender with lazy success when re-execute', async () => {
      const { container } = render(<Users ids={[1, 2, 3]} />);

      jest.advanceTimersByTime(100);
      await testRender(container, { data: [], error: { message: '' }, isPending: true });

      fireEvent.click(container.querySelector('button.cancel'));
      fireEvent.click(container.querySelector('button.execute'));

      jest.advanceTimersByTime(1000);
      await testRender(container, { data: [1, 2, 3], error: { message: '' }, isPending: false });

      jest.advanceTimersByTime(5000);
      await testRender(container, { data: [1, 2, 3], error: { message: '' }, isPending: false });
    });

    it('should rerender with lazy error when re-execute', async () => {
      const { container } = render(<Users ids={[100, 99, 98]} />);

      jest.advanceTimersByTime(100);
      await testRender(container, { data: [], error: { message: '' }, isPending: true });

      fireEvent.click(container.querySelector('button.cancel'));
      fireEvent.click(container.querySelector('button.execute'));

      jest.advanceTimersByTime(1000);
      await testRender(container, { data: [], error: BIG_NUMBER_ERROR, isPending: false });

      jest.advanceTimersByTime(5000);
      await testRender(container, { data: [], error: BIG_NUMBER_ERROR, isPending: false });
    });
  });

  describe('useAsyncOnDemand()', () => {
    async function testRender(container, { data, error, isPending }) {
      await waitForElement(() => container.getElementsByClassName('user'));

      const users = container.querySelectorAll('.user');
      expect(users).toHaveLength(data.length);
      users.forEach((user, i) => {
        expect(user.textContent).toEqual(data[i].toString());
      });

      expect(container.querySelector('.error').textContent).toEqual(error.message);
      expect(container.querySelector('.isPending').textContent).toEqual(isPending.toString());
    }

    it('should render nothing with lazy success', async () => {
      const { container } = render(<UsersOnDemand ids={[1, 2, 3]} />);

      jest.advanceTimersByTime(100);
      await testRender(container, { data: [], error: { message: '' }, isPending: false });

      jest.advanceTimersByTime(1000);
      await testRender(container, { data: [], error: { message: '' }, isPending: false });

      jest.advanceTimersByTime(5000);
      await testRender(container, { data: [], error: { message: '' }, isPending: false });
    });

    it('should render nothing with lazy error', async () => {
      const { container } = render(<UsersOnDemand ids={[100, 99, 98]} />);

      jest.advanceTimersByTime(100);
      await testRender(container, { data: [], error: { message: '' }, isPending: false });

      jest.advanceTimersByTime(1000);
      await testRender(container, { data: [], error: { message: '' }, isPending: false });

      jest.advanceTimersByTime(5000);
      await testRender(container, { data: [], error: { message: '' }, isPending: false });
    });

    it('should render nothing with lazy success then error', async () => {
      const { container, rerender } = render(<UsersOnDemand ids={[1, 2, 3]} />);

      jest.advanceTimersByTime(100);
      await testRender(container, { data: [], error: { message: '' }, isPending: false });

      jest.advanceTimersByTime(1000);
      await testRender(container, { data: [], error: { message: '' }, isPending: false });

      jest.advanceTimersByTime(5000);
      await testRender(container, { data: [], error: { message: '' }, isPending: false });

      rerender(<UsersOnDemand ids={[100, 99, 98]} />);

      jest.advanceTimersByTime(100);
      await testRender(container, { data: [], error: { message: '' }, isPending: false });

      jest.advanceTimersByTime(1000);
      await testRender(container, { data: [], error: { message: '' }, isPending: false });

      jest.advanceTimersByTime(5000);
      await testRender(container, { data: [], error: { message: '' }, isPending: false });
    });

    it('should render nothing with lazy error then success', async () => {
      const { container, rerender } = render(<UsersOnDemand ids={[100, 99, 98]} />);

      jest.advanceTimersByTime(100);
      await testRender(container, { data: [], error: { message: '' }, isPending: false });

      jest.advanceTimersByTime(1000);
      await testRender(container, { data: [], error: { message: '' }, isPending: false });

      jest.advanceTimersByTime(5000);
      await testRender(container, { data: [], error: { message: '' }, isPending: false });

      rerender(<UsersOnDemand ids={[1, 2, 3]} />);

      jest.advanceTimersByTime(100);
      await testRender(container, { data: [], error: { message: '' }, isPending: false });

      jest.advanceTimersByTime(1000);
      await testRender(container, { data: [], error: { message: '' }, isPending: false });

      jest.advanceTimersByTime(5000);
      await testRender(container, { data: [], error: { message: '' }, isPending: false });
    });

    it('should not notify with lazy success', async () => {
      const onError = jest.fn();
      const onSuccess = jest.fn();
      const { container } = render(
        <UsersOnDemand ids={[1, 2, 3]} onError={onError} onSuccess={onSuccess} />,
      );

      jest.advanceTimersByTime(100);
      await testRender(container, { data: [], error: { message: '' }, isPending: false });
      expect(onError).not.toHaveBeenCalled();
      expect(onSuccess).not.toHaveBeenCalled();

      jest.advanceTimersByTime(1000);
      await testRender(container, { data: [], error: { message: '' }, isPending: false });
      expect(onError).not.toHaveBeenCalled();
      expect(onSuccess).not.toHaveBeenCalled();

      jest.advanceTimersByTime(5000);
      await testRender(container, { data: [], error: { message: '' }, isPending: false });
      expect(onError).not.toHaveBeenCalled();
      expect(onSuccess).not.toHaveBeenCalled();
    });

    it('should not notify with lazy error', async () => {
      const onError = jest.fn();
      const onSuccess = jest.fn();
      const { container } = render(
        <UsersOnDemand ids={[100, 99, 98]} onError={onError} onSuccess={onSuccess} />,
      );

      jest.advanceTimersByTime(100);
      await testRender(container, { data: [], error: { message: '' }, isPending: false });
      expect(onError).not.toHaveBeenCalled();
      expect(onSuccess).not.toHaveBeenCalled();

      jest.advanceTimersByTime(1000);
      await testRender(container, { data: [], error: { message: '' }, isPending: false });
      expect(onError).not.toHaveBeenCalled();
      expect(onSuccess).not.toHaveBeenCalled();

      jest.advanceTimersByTime(5000);
      await testRender(container, { data: [], error: { message: '' }, isPending: false });
      expect(onError).not.toHaveBeenCalled();
      expect(onSuccess).not.toHaveBeenCalled();
    });

    it('should rerender with lazy success when re-execute', async () => {
      const { container } = render(<UsersOnDemand ids={[1, 2, 3]} />);

      jest.advanceTimersByTime(10000);
      await testRender(container, { data: [], error: { message: '' }, isPending: false });

      fireEvent.click(container.querySelector('button.execute'));

      jest.advanceTimersByTime(100);
      await testRender(container, { data: [], error: { message: '' }, isPending: true });

      jest.advanceTimersByTime(1000);
      await testRender(container, { data: [1, 2, 3], error: { message: '' }, isPending: false });

      jest.advanceTimersByTime(5000);
      await testRender(container, { data: [1, 2, 3], error: { message: '' }, isPending: false });
    });

    it('should rerender with lazy error when re-execute', async () => {
      const { container } = render(<UsersOnDemand ids={[100, 99, 98]} />);

      jest.advanceTimersByTime(10000);
      await testRender(container, { data: [], error: { message: '' }, isPending: false });

      fireEvent.click(container.querySelector('button.execute'));

      jest.advanceTimersByTime(100);
      await testRender(container, { data: [], error: { message: '' }, isPending: true });

      jest.advanceTimersByTime(1000);
      await testRender(container, { data: [], error: BIG_NUMBER_ERROR, isPending: false });

      jest.advanceTimersByTime(5000);
      await testRender(container, { data: [], error: BIG_NUMBER_ERROR, isPending: false });
    });

    it('should cancel render with lazy success', async () => {
      const { container } = render(<UsersOnDemand ids={[1, 2, 3]} />);

      jest.advanceTimersByTime(10000);
      await testRender(container, { data: [], error: { message: '' }, isPending: false });

      fireEvent.click(container.querySelector('button.execute'));

      jest.advanceTimersByTime(100);
      await testRender(container, { data: [], error: { message: '' }, isPending: true });

      fireEvent.click(container.querySelector('button.cancel'));

      jest.advanceTimersByTime(1000);
      await testRender(container, { data: [], error: ABORT_ERROR, isPending: false });

      jest.advanceTimersByTime(5000);
      await testRender(container, { data: [], error: ABORT_ERROR, isPending: false });
    });

    it('should cancel render with lazy error', async () => {
      const { container } = render(<UsersOnDemand ids={[100, 99, 98]} />);

      jest.advanceTimersByTime(10000);
      await testRender(container, { data: [], error: { message: '' }, isPending: false });

      fireEvent.click(container.querySelector('button.execute'));

      jest.advanceTimersByTime(100);
      await testRender(container, { data: [], error: { message: '' }, isPending: true });

      fireEvent.click(container.querySelector('button.cancel'));

      jest.advanceTimersByTime(1000);
      await testRender(container, { data: [], error: ABORT_ERROR, isPending: false });

      jest.advanceTimersByTime(5000);
      await testRender(container, { data: [], error: ABORT_ERROR, isPending: false });
    });
  });
});
