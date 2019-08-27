# react-hook-use-async

![npm](https://img.shields.io/npm/v/react-hook-use-async) [![Build Status](https://travis-ci.org/we-code-now/react-hook-use-async.svg?branch=master)](https://travis-ci.org/we-code-now/react-hook-use-async) [![Codacy Badge](https://api.codacy.com/project/badge/Grade/c67890a8255a46d9a65e7bb158b6dd7d)](https://www.codacy.com/app/StevenTea/react-hook-use-async?utm_source=github.com&utm_medium=referral&utm_content=we-code-now/react-hook-use-async&utm_campaign=Badge_Grade) [![Codacy Badge](https://api.codacy.com/project/badge/Coverage/c67890a8255a46d9a65e7bb158b6dd7d)](https://www.codacy.com/app/StevenTea/react-hook-use-async?utm_source=github.com&utm_medium=referral&utm_content=we-code-now/react-hook-use-async&utm_campaign=Badge_Coverage) ![npm bundle size](https://img.shields.io/bundlephobia/minzip/react-hook-use-async) ![GitHub](https://img.shields.io/github/license/we-code-now/react-hook-use-async)

Give me an async task, I'll give you its insights!

## Table of Contents

-   [Features](#features)
-   [Installation](#installation)
-   [Problem](#problem)
-   [Feature Comparison](#feature-comparison)
-   [API](#api)
    -   [useAsync](#useasync)
    -   [useAsyncOnDemand](#useasyncondemand)
-   [FAQ](#faq)
-   [License](#license)

## Features

-   Render async task's result without headache.
-   Get notified when async task is complete (success, error, cancel).
-   Support automatically and on-demand re-execute async task.
-   Support automatically and on-demand cancellation.

## Installation

```shell
$ npm install --save react-hook-use-async
```

## Problem

Async task is very common stuff in application. For example, fetching todo list,
follow a person, uploading images... And we need a convenient way to execute async
task and render its result when the task is complete.

This package provides two convenient hooks to deal with common use cases:

-   `useAsync(createTask, inputs, config)`

    Execute async task on component get mounted and detect inputs change to re-execute.
    It's useful for data fetching. It also supports cancellation, especially for `fetch()`.
    See [API below](#useasync).

-   `useAsyncOnDemand(createTask, inputs, config)`

    Execute async task on-demand. It's useful for `click-to-action-button` use case,
    such as follow a person. It also supports cancellation, especially for `fetch()`.
    See [API below](#useasyncondemand).

## Example

-   Fetch user using `useAsync()`

```jsx
import useAsync from 'react-hook-use-async';

function fetchUserById([id], { abortSignal }) {
  const url = `http://example.com/fetch-user?id=${id}`;
  const config = { signal: abortSignal };
  return fetch(url, config).then(response => response.json());
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

-   Follow user using `useAsyncOnDemand()`

```jsx
import { useAsyncOnDemand } from 'react-hook-use-async';

function followUserById([id], { abortSignal }) {
  const url = 'http://example.com/follow-user';
  const config = {
    method: 'POST',
    body: JSON.stringify({ id }),
    signal: abortSignal,
  };
  return fetch(url, config);
}

function FollowUserBtn({ id }) {
  const task = useAsyncOnDemand(followUserById, [id]);
  return (
    <button type="button" onClick={task.execute} disabled={task.isPending}>
      Follow
    </button>
  );
}
```

-   Get notified when task is complete using third argument of `useAsync() / useAsyncOnDemand()`

```jsx
import { useAsyncOnDemand } from 'react-hook-use-async';

function FollowUserBtn({ id }) {
  const task = useAsyncOnDemand(followUserById, [id], {
    onSuccess: (result, [id]) => {
      const message = `Followed user ${id}, you are number ${result.rank} in fan-ranking`;
      console.log(message);
    },
    onError: (error, [id]) => {
      const message =
        error.name === 'AbortError'
          ? `Cancelled follow user ${id}`
          : `Got error while trying to follow user ${id}: ${error.message}`;
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

## Feature Comparison

| Feature                            | useAsync() | useAsyncOnDemand() |
| :--------------------------------- | :--------: | :----------------: |
| Execute on mount                   |      ✓     |                    |
| Re-execute on inputs change        |      ✓     |                    |
| Re-execute on-demand               |      ✓     |          ✓         |
| Re-execute with latest inputs      |      ✓     |          ✓         |
| Cancel on unmount                  |      ✓     |          ✓         |
| Cancel on re-execute               |      ✓     |          ✓         |
| Cancel on-demand                   |      ✓     |          ✓         |
| Get notified when task is complete |      ✓     |          ✓         |

## API

### useAsync

A react hook to let you execute async task in two ways: inputs change or on-demand
call `execute()`.

```js
const {
  // async task error, default: undefined
  error,
  // async task result, default: undefined
  result,
  // promise of current async task, default: undefined
  promise,
  // async task is pending or not
  isPending,
  // cancel current async task on-demand
  cancel,
  // execute current async task on-demand
  execute,
} = useAsync(
  // (inputs, injection) => Promise
  //              |_ injection: { abortSignal }
  //
  // A function which get called to create async task, using `inputs`
  // and `injection` object. `injection` contains `abortSignal` which
  // should be used in `fetch()` API for browser cancellation support.
  //
  // It should return a promise, but actually it can return any value.
  createTask,

  // any[], default: []
  //
  // This array is used to create task. If it's changed, old task will
  // be cancelled and new task will be created. If your inputs shape
  // seems not to be changed but new task still be created infinitely,
  // the reason is because React uses `Object.is()` comparison algorithm,
  // shallow comparison. In short, inputs must be an array of primitives,
  // else you should memoize non-primitive values for yourself.
  //
  // Other note: size MUST BE consistent between rerenders!
  inputs,

  // optional config
  config: {
    // (error, inputs) => void
    //
    // Error callback will get called when async task get any errors,
    // including cancellation as `AbortError`.
    onError,

    // (result, inputs) => void
    //
    // Success callback will get called when async task is success.
    onSuccess,
  },
);
```

### useAsyncOnDemand

A react hook to let you execute async task in only one way: on-demand call `execute()`.
It's perfect for click-to-action-button use case.

Signuare is same as [useAsync](#useasync).

## FAQ

### When async task will be executed?

Let me show you two common use cases:

-   `Data fetching` - Data should be fetched **on component mount and on inputs change**,
    such as apply filters using form. You also want to put a `Fetch` button to let you
    fetch data on-demand whenever you want. In this case, you must use `useAsync()` hook.

-   `Click-to-action-button` - You don't want any automatic mechanism. You want to click
    a button to do something, such as follow a person, or you want to refetch data after
    you delete a data item. In this case, you must use `useAsyncOnDemand()` hook.

### Why I got infinite refetch loop when using `useAsync()` hook?

Understand by examples:

```jsx
function Example({ id }) {
  // your `inputs`: [ { id } ]
  // BUT `{ id }` is always new in every rerender!
  const task = useAsync(([{ id }]) => fetchSomethingById(id), [{ id }]);
}
```

### Can I manually execute async task at anytime?

Yes. Via `execute()` function in `useAsync() / useAsyncOnDemand()` result.

```jsx
function Example() {
  const { execute } = useAsync(...);
}
```

### Is cancellation is supported?

Yes. An async task will be cancelled before new async task to be executed or when
component get unmounted.

### Can I manually cancel async task at anytime?

Yes. Via `cancel()` function in `useAsync() / useAsyncOnDemand()` result.

```jsx
function Example({ id }) {
  const { cancel } = useAsync(...);
}
```

## License

MIT
