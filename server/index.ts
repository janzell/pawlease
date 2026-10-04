import express from "express";
import { existsSync, mkdirSync } from "node:fs";
import { dirname, resolve } from "node:path";
import { createClient } from "@libsql/client";
import { createDb } from "./db.ts";
import { createApp } from "./app.ts";

// Local/self-hosted entry point. Uses Turso when TURSO_DATABASE_URL is set,
// otherwise a local SQLite file.
const prod = process.env.NODE_ENV === "production";
const port = Number(process.env.PORT ?? 3001);

let url = process.env.TURSO_DATABASE_URL;
if (!url) {
  const file = resolve(process.env.DATABASE_PATH ?? "data/pawlease.db");
  mkdirSync(dirname(file), { recursive: true });
  url = `file:${file}`;
}
const db = createDb(createClient({ url, authToken: process.env.TURSO_AUTH_TOKEN }));
const app = createApp(db, { secureCookies: prod && process.env.INSECURE_COOKIES !== "1" });

// In production the API also serves the built SPA.
const dist = resolve("dist");
if (prod && existsSync(dist)) {
  app.use(express.static(dist, { index: false, maxAge: "1h" }));
  app.get(/^(?!\/api\/).*/, (_req, res) => res.sendFile(resolve(dist, "index.html")));
}

app.listen(port, () => console.log(`Pawlease listening on http://localhost:${port}`));
