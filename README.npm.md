# @fsad-labs/easy-fetch

[![npm version](https://img.shields.io/npm/v/@fsad-labs/easy-fetch.svg)](https://www.npmjs.com/package/@fsad-labs/easy-fetch)
[![License](https://img.shields.io/npm/l/@fsad-labs/easy-fetch.svg)](LICENSE)

<DESCRIPTION>

A lightweight and flexible wrapper around the Fetch API that simplifies HTTP requests with reusable clients and pre-defined clients support.

## Features

- Base URL support
- Global headers
- Interceptors
- Automatic JSON parsing
- Simplified error handling

## Install

```bash
npm i @fsad-labs/easy-fetch
```

## Usage

You can use these different clients for make you fetch call API or create your own client with easyFetch.

### easyFetch

- Description: The default fetch wrapper with automatic JSON parsing, error handling and using interceptors.

```ts
const { EasyFetch } = require('@fsad-labs/easy-fetch');

const baseUrl = 'https://api.example.com';

const easyFetch = new EasyFetch({ baseUrl });

easyFetch.interceptors.request.use((config) => {
  config.meta = { startTime: Date.now() };
  return config;
});

easyFetch.interceptors?.response.use(async (res) => {
  res.modified = true;
  res.meta = {
    requestUrl: res.config?.url,
    duration: Date.now() - res.config?.meta?.startTime,
  };
  return res;
});

easyFetch.interceptors.response.useError(async (error: unknown) => {
  return new EasyFetchError({
    ...error,
    code: 'ERROR_CAUGTH',
    message: error?.message + ' Caugth',
    original: error,
  });
});

easyFetch
  .request({ url: '/todos/1', method: 'GET' })
  .then((res) => console.log('GET', res));

easyFetch
  .request({
    url: '/posts',
    method: 'POST',
    body: {
      userId: 1,
      title: 'TEST',
      body: 'TEST Library',
    },
  })
  .then((res) => console.log('POST', res));

easyFetch
  .request({
    url: '/posts/1',
    method: 'PUT',
    body: {
      userId: 1,
      id: 1,
      title: 'TEST',
      body: 'TEST Library edited',
    },
  })
  .then((res) => console.log('PUT my POST', res.statusText));

easyFetch
  .request({
    url: '/posts/1',
    method: 'DELETE',
  })
  .then((res) => {
    console.log('DELETE', res.statusText);
  });
```

#### override default interceptors

you can override the default interceptors using _setIntereptors_

```ts
const easy = new EasyFetch({ baseUrl: 'https://api.example.com' });
easy.setIntereptors({
  // New behavior for REQUEST - RESPONSE and ERROR interceptors
});
```

### createClient

- Description: Create a reusable client, use the request or response interceptors and headers settings.

```ts
const client = createClient({ baseUrl: 'https://api.example.com' });

client.interceptors.request.use(async (config) => {
  config.headers = new Headers({ 'X-Test': '123' });
  return config;
});

client.interceptors?.response.use(async (res) => {
  res.modified = true;
  res.meta = {
    requestUrl: res.config?.url,
    duration: Date.now() - res.config?.meta?.startTime,
  };
  return res;
});

client
  .get('/todos/1')
  .then((result) => {
    console.log(result);
  })
  .catch((err) => {
    // TODO: Catch the error
  });
```

#### override default interceptors using _createClient_ also

you can override the default interceptors using _setIntereptors_, make sure you call this function before use _interceptors_ prop

```ts
client.setInterceptors({
  request: {
    handlers: [
      async (config) => {
        config.headers = new Headers({ 'X-Test': '123' });
        return config;
      },
    ],
    use: function (fn) {
      this.handlers.push(fn);
      return this;
    },
  },
  response: {
    successHandlers: [],
    errorHandlers: [],
    use: function (onSuccess) {
      this.successHandlers.push(onSuccess);
      return this;
    },
    useError: function (onError) {
      this.errorHandlers.push(onError);
      return this;
    },
  },
});
```

### pre-defined clients

#### easyFetchAuth

Use this client to easily make authenticated requests.

```ts
conat easyAuth = easyFetchAuth(url, 'token123');

easyAuth.get().then((result) => {
    //TODO
});

```

#### easyFetchWithHeaders

- Description: Send requests with custom headers.

```ts
const easyHeaders = easyFetchWithHeaders(url, {
  'X-Custom': 'value',
});

easyHeaders.get().then((result) => {
  //TODO
});
```

#### easyFetchWithTimeout

- Description: Make requests with a timeout (milliseconds).

```ts
const easyTimeout = easyFetchWithTimeout(url, 2000);

easyTimeout.get().then((result) => {
  // TODO
});
```

## Contributing

If my work has helped you or saved you some time, consider [Buy Me a Coffee☕.](https://buymeacoffee.com/drixev)
It keeps me energized and motivated to keep creating and improving.

## 📄 License

This project is licensed under the [MIT License](LICENSE) © [drixev](https://github.com/drixev)