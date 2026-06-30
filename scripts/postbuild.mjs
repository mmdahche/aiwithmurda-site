import { copyFile, mkdir } from "node:fs/promises";
import { join } from "node:path";
import { productModules } from "../src/data/product.js";

const root = new URL("..", import.meta.url).pathname;
const dist = join(root, "dist");
const routes = [
  "60",
  "live",
  "tools",
  "start",
  "kit",
  "live-builds",
  "members",
  "admin",
  ...productModules.map((module) => `members/module/${module.key}`),
];

for (const route of routes) {
  await mkdir(join(dist, route), { recursive: true });
  await copyFile(join(dist, "index.html"), join(dist, route, "index.html"));
}
