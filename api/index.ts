import type { IncomingMessage, ServerResponse } from "node:http";
// The web client talks to Turso over HTTP and has no native dependencies,
// which keeps the serverless bundle small and portable.
import { createClient } from "@libsql/client/web";
import { createDb } from "../server/db.ts";
import { createApp } from "../server/app.ts";

const url = process.env.TURSO_DATABASE_URL;
if (!url) throw new Error("TURSO_DATABASE_URL is not set");

const app = createApp(createDb(createClient({ url, authToken: process.env.TURSO_AUTH_TOKEN })), {
  secureCookies: true,
});

export default function handler(req: IncomingMessage, res: ServerResponse) {
  return app(req as never, res as never);
}
