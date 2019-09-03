# react-hook-use-async

![npm](https://img.shields.io/npm/v/react-hook-use-async) [![Build Status](https://travis-ci.org/we-code-now/react-hook-use-async.svg?branch=master)](https://travis-ci.org/we-code-now/react-hook-use-async) [![Codacy Badge](https://api.codacy.com/project/badge/Grade/c67890a8255a46d9a65e7bb158b6dd7d)](https://www.codacy.com/app/StevenTea/react-hook-use-async?utm_source=github.com&utm_medium=referral&utm_content=we-code-now/react-hook-use-async&utm_campaign=Badge_Grade) [![Codacy Badge](https://api.codacy.com/project/badge/Coverage/c67890a8255a46d9a65e7bb158b6dd7d)](https://www.codacy.com/app/StevenTea/react-hook-use-async?utm_source=github.com&utm_medium=referral&utm_content=we-code-now/react-hook-use-async&utm_campaign=Badge_Coverage) ![npm bundle size](https://img.shields.io/bundlephobia/minzip/react-hook-use-async) ![GitHub](https://img.shields.io/github/license/we-code-now/react-hook-use-async)

Give me an async task, I'll give you its insights!

## Table of Contents

-   [Features](#features)
-   [Installation](#installation)
-   [Problem](#problem)
-   [Examples](#examples)
-   [API](#api)
-   [Feature Comparison](#feature-comparison)
-   [Migrating from v1 to v2](#migrating-from-v1-to-v2)
-   [FAQ](#faq)
-   [Demo](#demo)
-   [License](#license)

## Features

-   Simple and flexible!
-   Render async task's result without headache.
-   Get notified when the async task is complete via `onSuccess()`, `onError()`, `onCancel()` callbacks.
-   Support automatically and on-demand re-execute via `execute()`.
-   Support automatically and on-demand cancellation via `cancel()`.

## Installation

```shell
$ npm install --save react-hook-use-async
```

## Problem

Async task is a very common stuff in application. For example, fetch todo list, follow a person, upload images... and we need a convenient way to execute an async task and render its result when the task is complete. This package provides a convenient hook to deal with them. Let's see examples and FAQ below.

## Examples

### Fetching user

```jsx
import useAsync from 'react-hook-use-async';

function fetchUserById([id]) {
  const url = `http://example.com/fetch-user?id=${id}`;
  return fetch(url).then(response => response.json());
}

function User({ id }) {
  const task = useAsync(fetchUserById, [id]);
  return (
    <div>
      {task.isPending && (
        <div>
          <div>Fetching...</div>
          <button type="button" onClick={task.cancel}>
            Cancel
          </button>
        </div>
      )}
      {task.error && <div>Error: {task.error.message}</div>}
      {task.result && (
        <div>
          <div>User: {task.result.name}</div>
          <button
            type="button"
            onClick={task.execute}
            disabled={task.isPending}
          >
            Refetch
          </button>
        </div>
      )}
    </div>
  );
}
```

### Following user

```jsx
import useAsync from 'react-hook-use-async';

function followUserById([id]) {
  const url = 'http://example.com/follow-user';
  const config = {
    method: 'POST',
    body: JSON.stringify({ id }),
  };
  return fetch(url, config);
}

function FollowUserBtn({ id }) {
  const task = useAsync(followUserById, [id], { isOnDemand: true });
  return (
    <button type="button" onClick={task.execute} disabled={task.isPending}>
      Follow
    </button>
  );
}
```

### Get notified when task is complete

```jsx
import useAsync from 'react-hook-use-async';

function FollowUserBtn({ id }) {
  const task = useAsync(followUserById, [id], {
    isOnDemand: true,
    onSuccess: (result, [id]) => {
      const message = `Followed user ${id}, you are number ${result.rank} in fan-ranking`;
      console.log(message);
    },
    onError: (error, [id]) => {
      const message = `Got error while trying to follow user ${id}: ${error.message}`;
      console.log(message);
    },
    onCancel: ([id]) => {
      const message = `Canceled following user ${id}`;
      console.log(message);
    },
  });
  return (
    <button type="button" onClick={task.execute} disabled={task.isPending}>
      Follow
    </button>
  );
}
```

### Providing custom cancellation

```jsx
import useAsync, { Task } from 'react-hook-use-async';

function fetchUserById([id]) {
  const url = `http://example.com/fetch-user?id=${id}`;
  const controller = (typeof AbortController !== 'undefined' ? new AbortController() : null);
  const config = { signal: controller && controller.signal };
  const promise = fetch(url).then(response => response.json());
  const cancel = () => controller && controller.abort();
  return new Task(promise, cancel);
}

function User({ id }) {
  const task = useAsync(fetchUserById, [id]);
  ...
}
```

### Debouncing search

```jsx
import useAsync, { Task } from 'react-hook-use-async';

function fetchArticles([query]) {
  const url = `http://example.com/fetch-articles?query=${query}`;
  const controller = (typeof AbortController !== 'undefined' ? new AbortController() : null);
  const config = { signal: controller && controller.signal };
  let timeoutId = null;
  const promise = new Promise((resolve, reject) => {
    timeoutId = setTimeout(() => {
      fetch(url).then(response => response.json()).then(resolve).catch(reject);
    }, 300);
  });
  const cancel = () => {
    timeoutId && clearTimeout(timeoutId);
    controller && controller.abort();
  };
  return new Task(promise, cancel);
}

function Articles({ query }) {
  const task = useAsync(fetchArticles, [query]);
  ...
}
```

## API

### useAsync

```js
const {
  // async task error, default: undefined
  error,
  // async task result, default: undefined
  result,
  // promise of current async task, default: undefined
  promise,
  // async task is pending or not, default: false
  isPending,
  // cancel current async task on-demand
  cancel,
  // execute current async task on-demand
  execute,
} = useAsync(
  // (inputs) => Promise
  //
  // A function which get called to create async task, using `inputs`.
  //
  // It should return a promise, but actually it can return any value.
  createTask,

  // any[], default: []
  //
  // This array is used to create task. If it changes, the old task will
  // be canceled and a new task will be created. If your inputs shape
  // seems unchange but a new task still be created infinitely, the reason
  // is because React uses `Object.is()` comparison algorithm, shallow
  // comparison. In short, inputs must be an array of primitives, else
  // you should memoize non-primitive values for yourself.
  //
  // Other note: size MUST BE consistent between renders!
  inputs,

  // optional config
  config: {
    // boolean, default: false
    //
    // This flag provides two modes.
    // In proactive mode (false), an async  task will be executed automatically  when `inputs` changes.
    // In on-demand mode (true), an async task will be executed only when `execute()` get called.
    //
    // Note: only its value in the first render will be used. This means mode can't be changed.
    isOnDemand,

    // (error, inputs) => void
    //
    // Error callback will get called when async task get any errors.
    onError,

    // (inputs) => void
    //
    // Cancel callback will get called when async task is canceled.
    onCancel,

    // (result, inputs) => void
    //
    // Success callback will get called when async task is success.
    onSuccess,
  },
);
```

## Feature Comparison

| Feature                            | useAsync() | useAsync() (isOnDemand = true) |
| :--------------------------------- | :--------: | :----------------------------: |
| Execute on mount                   |      ✓     |                                |
| Re-execute on inputs changes       |      ✓     |                                |
| Re-execute on-demand               |      ✓     |                ✓               |
| Cancel on unmount                  |      ✓     |                ✓               |
| Cancel on re-execute               |      ✓     |                ✓               |
| Cancel on-demand                   |      ✓     |                ✓               |
| Get notified when task is complete |      ✓     |                ✓               |

## Migrating from v1 to v2

-   Missing `useAsyncOnDemand()` hook. Use `useAsync()` with `isOnDemand = true`.
-   Missing `injection` as second argument of `createTask()`. See [Providing custom cancellation](#providing-custom-cancellation) if you want to cancel request using `fetch()` API. I drop this because of two reason. First, an async task can be anything, not only about data fetching. Provide `injection` for every calls can be annoying. Last, in v1, I supported `fetch()` API only, but in fact, any libraries can be used, such as `axios`, `request`... So it's not great. Instead, in v2, I provide you a convenient way to put any `cancellation` method to maximize usability.

## FAQ

### When the async task will be executed?

Let me show you two common use cases:

-   **Data fetching** - Data should be fetched on the component gets mounted and inputs changes, such as apply filters using form. You also want to put a `Fetch` button to let you fetch data on-demand whenever you want. In this case, you must use `useAsync()` hook with proactive mode.
-   **Click-to-action-button** - You don't want any automatic mechanism. You want to click a button to do something, such as follow a person or you want to refetch data after you delete a data item. In this case, you must use `useAsync()` hook with on-demand mode.

### Why I got infinite re-fetch loop when using useAsync() hook?

Be sure `inputs` doesn't change in every render. Understanding by examples:

```jsx
function Example({ id }) {
  // your `inputs`: [ { id } ]
  // BUT `{ id }` is always new in every render!
  const task = useAsync(([{ id }]) => fetchSomethingById(id), [{ id }]);
}
```

### Why is there no new async task execution when inputs changes?

If you use `useAsync()` hook in proactive mode, be sure `inputs` changes and size of `inputs` must be the same between renders.

```jsx
function Example({ ids }) {
  // first render: ids = [1, 2, 3], inputs = [1, 2, 3]
  // second render: ids = [1, 2], inputs = [1, 2]
  // size changes => don't execute new async task!
  const task = useAsync(ids => doSomething(ids), ids);
}
```

If you use `useAsync()` hook in on-demand mode, you must execute on-demand. See below for details.

### Why is there no new async task execution when createTask() changes every render?

Because of convenient. Sometimes you might want to write code like this and you don't expect re-execution happens:

```jsx
function Example({ id }) {
  // createTask() changes every render!
  const task = useAsync(([id]) => doSomething(id), [id]);

  // DO NOT use write this code!
  // const task = useAsync(() => doSomething(id), []);
}
```

Make `createTask()` depends on `inputs` as param, move it out of React component if possible for clarification.

### What happens when inputs changes when using useAsync() hook in on-demand mode?

No execution at all. When you execute on-demand, the latest `inputs` will be used to create a new async task.

### Can I manually execute an async task at any time?

Yes. Via `execute()` function in `useAsync()` result.

```jsx
function Example() {
  const { execute } = useAsync(...);
}
```

### Is cancellation is supported?

Yes. An async task will be canceled before a new async task to be executed or when the component gets unmounted.

### Can I manually cancel the async task at any time?

Yes. Via `cancel()` function in `useAsync()` result.

```jsx
function Example({ id }) {
  const { cancel } = useAsync(...);
}
```

### What happens when isOnDemand changes?

Nothing happens.

### When we get notified about completed task via onSuccess(), onError() or onCancel(), which version of callback is used?

No matter how often callback changes, its version in the same execution render will be used.

## Demo

-   Website: <https://wecodenow-react-hook-use-async.stackblitz.io>
-   Playground: <https://stackblitz.com/edit/wecodenow-react-hook-use-async>

## License

MIT
