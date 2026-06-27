import { copyFile, mkdir } from "node:fs/promises";
import { join } from "node:path";

const root = new URL("..", import.meta.url).pathname;
const dist = join(root, "dist");
const routes = ["60", "live", "tools", "start", "admin"];

for (const route of routes) {
  await mkdir(join(dist, route), { recursive: true });
  await copyFile(join(dist, "index.html"), join(dist, route, "index.html"));
}
