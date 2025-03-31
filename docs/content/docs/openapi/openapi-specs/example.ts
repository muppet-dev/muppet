import { fromOpenAPI } from "muppet/openapi";

const instance = fromOpenAPI({
  // Add your OpenAPI spec here
  info: {
    title: "My Muppet",
    version: "1.0.0",
  },
  openapi: "3.1.0",
});
