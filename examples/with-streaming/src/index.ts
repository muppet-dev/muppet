import { StreamableHTTPServerTransport } from "@modelcontextprotocol/sdk/server/streamableHttp.js";
import { toFetchResponse, toReqRes } from "fetch-to-node";
import { Hono } from "hono";
import { Muppet } from "muppet";
import { z } from "zod";

const mcp = new Muppet<{ Variables: { surname: string } }>({
  name: "muppet-hono",
  version: "0.0.1",
});

mcp.tool(
  {
    name: "hello",
    description: "Say hello",
    inputSchema: z.object({
      name: z.string(),
    }),
  },
  (c) => {
    const name = c.message.params.arguments.name;
    return {
      content: [
        {
          type: "text",
          text: `Hello ${name}!`,
        },
      ],
    };
  },
);

const app = new Hono();

app.all("/mcp", async (c) => {
  const transport = new StreamableHTTPServerTransport({
    sessionIdGenerator: undefined,
  });
  await mcp.connect(transport);

  const { req, res } = toReqRes(c.req.raw);
  await transport.handleRequest(req, res);
  return toFetchResponse(res);
});

app.get("/", (c) => c.text("Hello World"));

export default app;
