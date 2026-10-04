import express from "express";
import { existsSync } from "node:fs";
import { resolve } from "node:path";
import { openDb } from "./db.ts";
import { createApp } from "./app.ts";

const prod = process.env.NODE_ENV === "production";
const port = Number(process.env.PORT ?? 3001);
const db = openDb(process.env.DATABASE_PATH ?? resolve("data/pawlease.db"));
const app = createApp(db, { secureCookies: prod && process.env.INSECURE_COOKIES !== "1" });

// In production the API also serves the built SPA.
const dist = resolve("dist");
if (prod && existsSync(dist)) {
  app.use(express.static(dist, { index: false, maxAge: "1h" }));
  app.get(/^(?!\/api\/).*/, (_req, res) => res.sendFile(resolve(dist, "index.html")));
}

app.listen(port, () => console.log(`Pawlease API listening on http://localhost:${port}`));
