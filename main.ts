// post-x-promote-make-your-own-bounty-01 entry program.
//
// The entry itself is a post on X; this program's only job is to hand the
// post's address to the house: it validates POST.json at the repository
// root and copies it, byte for byte, to POST.json in the output directory
// (/output, or $MAKEFUN_OUTPUT_DIR when that is set). The repository is
// found relative to this file (or $MAKEFUN_BOT_DIR when set), never from
// the process working directory.
//
// Run:  node main.ts            validate POST.json and copy it to /output
//       node main.ts --selftest exercise the validation and copy logic
//                               against fixtures, without touching /output

import { copyFileSync, mkdirSync, readFileSync, realpathSync } from "node:fs";
import { dirname, join, resolve } from "node:path";
import { fileURLToPath } from "node:url";

// The scorer refuses a POST.json larger than this.
export const MAX_POST_BYTES = 16384;

// The address shapes the house reads (RULES.txt, "The post file"):
//   https://x.com/<handle>/status/<id>
//   the same on twitter.com, with www. or mobile. before either host,
//   or the /i/web/status/<id> form on either host.
// X handles are 1-15 letters, digits or underscores, so the handle segment
// is matched as exactly that rather than "anything but a slash".
const HANDLE_FORM =
  /^https:\/\/(www\.|mobile\.)?(x\.com|twitter\.com)\/[A-Za-z0-9_]{1,15}\/status\/\d+$/;
const WEB_FORM =
  /^https:\/\/(www\.|mobile\.)?(x\.com|twitter\.com)\/i\/web\/status\/\d+$/;

/**
 * True when `url` names a single post on X: a <handle>/status/<id> or
 * /i/web/status/<id> address on x.com or twitter.com. A query string or
 * fragment after the address is read past, as the house reads it.
 */
export function isPostUrl(url: string): boolean {
  if (typeof url !== "string") return false;
  const bare = url.split(/[?#]/, 1)[0];
  return HANDLE_FORM.test(bare) || WEB_FORM.test(bare);
}

/**
 * Parse and validate the bytes of a POST.json file. Returns the post url.
 * Throws an Error with a plain message on any problem: oversize file,
 * malformed JSON, a JSON value that is not an object, a missing or
 * non-string url, or a url that does not name a post.
 */
export function readPostUrl(bytes: Buffer): string {
  if (bytes.length > MAX_POST_BYTES) {
    throw new Error(
      `POST.json is ${bytes.length} bytes; the limit is ${MAX_POST_BYTES}`,
    );
  }
  let parsed: unknown;
  try {
    parsed = JSON.parse(bytes.toString("utf8"));
  } catch {
    throw new Error("POST.json is not valid JSON");
  }
  if (typeof parsed !== "object" || parsed === null || Array.isArray(parsed)) {
    throw new Error("POST.json must be a JSON object like {\"url\": \"...\"}");
  }
  const url = (parsed as { url?: unknown }).url;
  if (typeof url !== "string") {
    throw new Error("POST.json has no string \"url\" field");
  }
  if (!isPostUrl(url)) {
    throw new Error(`POST.json url does not name an X post: ${url}`);
  }
  return url;
}

/**
 * Validate the POST.json at `sourcePath` and copy it byte for byte to
 * `destPath`, creating the destination directory when needed. The copy is
 * re-read and compared with the source before success is reported.
 * Returns the validated post url.
 */
export function copyPostFile(sourcePath: string, destPath: string): string {
  if (resolve(sourcePath) === resolve(destPath)) {
    throw new Error("source and destination are the same file; nothing to copy");
  }
  const source = readFileSync(sourcePath);
  const url = readPostUrl(source);
  mkdirSync(dirname(destPath), { recursive: true });
  copyFileSync(sourcePath, destPath);
  const copied = readFileSync(destPath);
  if (!copied.equals(source)) {
    throw new Error(`copy check failed: ${destPath} differs from the source`);
  }
  return url;
}

function repoDir(): string {
  const fromEnv = process.env.MAKEFUN_BOT_DIR;
  if (fromEnv) return resolve(fromEnv);
  return dirname(fileURLToPath(import.meta.url));
}

function outputDir(): string {
  const fromEnv = process.env.MAKEFUN_OUTPUT_DIR;
  if (fromEnv) return resolve(fromEnv);
  return "/output";
}

function fail(message: string): never {
  console.error(`main.ts: ${message}`);
  process.exit(1);
}

// --- --selftest -----------------------------------------------------------

function runSelftest(): void {
  const good: Array<[string, string]> = [
    ["x.com handle form", "https://x.com/anyepajah/status/2124996217134616928"],
    ["twitter.com handle form", "https://twitter.com/anyepajah/status/2124996217134616928"],
    ["www.x.com form", "https://www.x.com/anyepajah/status/2124996217134616928"],
    ["mobile.twitter.com form", "https://mobile.twitter.com/anyepajah/status/2124996217134616928"],
    ["/i/web/status form", "https://x.com/i/web/status/2124996217134616928"],
    ["query read past", "https://x.com/anyepajah/status/2124996217134616928?s=19"],
    ["fragment read past", "https://x.com/anyepajah/status/2124996217134616928#reply"],
    ["status id of zero", "https://x.com/anyepajah/status/0"],
  ];
  const bad: Array<[string, string]> = [
    ["profile page, not a post", "https://x.com/anyepajah"],
    ["non-numeric status id", "https://x.com/anyepajah/status/abc"],
    ["another host", "https://example.com/anyepajah/status/2124996217134616928"],
    ["plain http", "http://x.com/anyepajah/status/2124996217134616928"],
    ["empty string", ""],
  ];
  let failures = 0;
  for (const [name, url] of good) {
    if (!isPostUrl(url)) {
      console.error(`selftest FAIL (should accept): ${name}: ${url}`);
      failures++;
    }
  }
  for (const [name, url] of bad) {
    if (isPostUrl(url)) {
      console.error(`selftest FAIL (should reject): ${name}: ${url}`);
      failures++;
    }
  }
  // The real POST.json in this repository must validate too.
  try {
    readPostUrl(readFileSync(join(repoDir(), "POST.json")));
  } catch (err) {
    console.error(`selftest FAIL: repository POST.json: ${(err as Error).message}`);
    failures++;
  }
  if (failures > 0) fail(`selftest: ${failures} check(s) failed`);
  console.log(`selftest ok: ${good.length + bad.length + 1} checks passed`);
}

// --- entry point ----------------------------------------------------------

function main(): void {
  if (process.argv.includes("--selftest")) {
    runSelftest();
    return;
  }
  const source = join(repoDir(), "POST.json");
  const dest = join(outputDir(), "POST.json");
  try {
    const url = copyPostFile(source, dest);
    console.log(`copied POST.json to ${dest} (post: ${url})`);
  } catch (err) {
    fail((err as Error).message);
  }
}

// True when this file is the program being run (rather than imported by
// the tests). realpathSync resolves a symlinked invocation to this file.
function isInvokedDirectly(): boolean {
  if (process.argv[1] === undefined) return false;
  const self = fileURLToPath(import.meta.url);
  try {
    return realpathSync(process.argv[1]) === realpathSync(self);
  } catch {
    return resolve(process.argv[1]) === self;
  }
}
if (isInvokedDirectly()) main();
