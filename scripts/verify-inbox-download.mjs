// Verify the actual downloadable ZIP, then run its offline tests after extraction.
import assert from "node:assert/strict";
import { execFileSync } from "node:child_process";
import fs from "node:fs/promises";
import os from "node:os";
import path from "node:path";
import { verifyProductFolder } from "./verify-product-folder.mjs";

const root = path.resolve(import.meta.dirname, "..");
const source = path.join(root, "products/email-cleanup-kit");
const zip = path.join(root, "public/downloads/email-cleanup-kit.zip");
const { files, errors } = await verifyProductFolder(source);
assert.deepEqual(errors, []);
const entries = execFileSync("unzip", ["-Z1", zip], { encoding: "utf8" }).trim().split("\n").sort();
assert.deepEqual(entries, files.map(file => `email-cleanup-kit/${file}`).sort());
for (const file of files) {
  const packed = execFileSync("unzip", ["-p", zip, `email-cleanup-kit/${file}`]);
  assert(packed.equals(await fs.readFile(path.join(source, file))), `Stale packed file: ${file}`);
}
const temp = await fs.mkdtemp(path.join(os.tmpdir(), "inbox-kit-verification-"));
execFileSync("unzip", ["-q", zip, "-d", temp]);
const extracted = path.join(temp, "email-cleanup-kit");
assert((await fs.stat(path.join(extracted, "Start on Mac.command"))).mode & 0o111, "Mac launcher lost its executable bit");
const python = process.env.PYTHON || "python3";
const run = (args, options = {}) => execFileSync(python, ["-B", ...args], { cwd: extracted, encoding: "utf8", ...options });
run(["-c", "import ast,pathlib; [ast.parse(p.read_text(), feature_version=(3,9)) for p in pathlib.Path('.').rglob('*.py')]; print('Python 3.9 syntax accepted')"]);
assert(run(["start.py", "--check"]).includes("No extra Python packages"));
run(["-m", "unittest", "discover", "-s", "tests"]);
const rehearsal = run(["start.py", "--demo"], { input: "1\nd\na\nf\nReceipts\nk\ny\ny\nMOVE 6\n" });
assert(rehearsal.includes("PRACTICE RESULT: 2 sample messages left"));
assert(rehearsal.includes("Your real email was never connected or changed."));
await assert.rejects(fs.access(path.join(extracted, "payload/data")));
await fs.writeFile(path.join(temp, "practice-transcript.txt"), rehearsal);
await fs.writeFile(path.join(temp, "report.json"), JSON.stringify({ result: "PASS", files: files.length, sourceMatched: true, extracted, realMailTouched: false, nativeWindowsTested: false }, null, 2));
console.log(`PASS: ${files.length} exact ZIP payloads, executable Mac launcher, offline tests and practice. Evidence: ${temp}`);
