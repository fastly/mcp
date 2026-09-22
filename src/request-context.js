import { AsyncLocalStorage } from "node:async_hooks";

/**
 * Carries the validated caller of a remote HTTP request down to the MCP
 * server factory.
 * The SDK builds one server per request but has no slot for a tenant
 * identity, and its legacy path may clone the `Request`, so nothing hung on
 * the request object would survive.
 */
export const requestContext = new AsyncLocalStorage();
