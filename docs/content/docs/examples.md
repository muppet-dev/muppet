---
title: Example Servers
description: A list of example servers built with Muppet
---

This page showcases a few example servers built with Muppet. These examples are designed to help you understand how to use Muppet in different scenarios and runtimes, and provide a starting point for your own projects.

- [with-stdio](https://github.com/muppet-dev/muppet/tree/main/examples/with-stdio) - Runs in Node.js and uses `StdioServerTransport` transport layer from `@modelcontextprotocol/sdk` to connect.
- [example-forecast](https://github.com/muppet-dev/muppet/tree/main/examples/example-forecast) - A simple weather server that exposes two tools: `get-alerts` and `get-forecast`, which can be used to fetch weather alerts and forecasts, respectively.
- [with-sse-express](https://github.com/muppet-dev/muppet/tree/main/examples/with-sse-express) - Runs in Node.js and uses `SseServerTransport` transport layer from `@modelcontextprotocol/sdk` to connect.
- [with-sse](https://github.com/muppet-dev/muppet/tree/main/examples/with-sse) - Uses `SSEHonoTransport` transport layer from `muppet/streaming` to connect and can be used with all the runtimes which support Streaming with hono. More details about that [here](https://hono.dev/docs/helpers/streaming). This one runs on Node.js.
- [with-edge](https://github.com/muppet-dev/muppet/tree/main/examples/with-edge) - Same as `with-ss` example but runs on Cloudflare Workers.
