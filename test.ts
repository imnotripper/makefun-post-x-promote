// Tests for main.ts — run with: node --test
//
// Every fixture is built in a fresh temporary directory; the real /output
// and the repository's own POST.json are never written to.

import assert from "node:assert/strict";
import { mkdtempSync, readFileSync, rmSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import test from "node:test";

import { copyPostFile, isPostUrl, readPostUrl } from "./main.ts";

const POST_URL = "https://x.com/anyepajah/status/2124996217134616928";

function tempDir(): string {
  return mkdtempSync(join(tmpdir(), "postx-entry-"));
}

test("a valid POST.json is copied byte for byte", () => {
  const dir = tempDir();
  try {
    const source = join(dir, "POST.json");
    const bytes = Buffer.from(`{"url": "${POST_URL}"}\n`, "utf8");
    writeFileSync(source, bytes);
    const dest = join(dir, "out", "POST.json");
    const url = copyPostFile(source, dest);
    assert.equal(url, POST_URL);
    assert.ok(readFileSync(dest).equals(bytes));
  } finally {
    rmSync(dir, { recursive: true, force: true });
  }
});

test("x.com and twitter.com post addresses are accepted", () => {
  const accepted = [
    "https://x.com/anyepajah/status/2124996217134616928",
    "https://twitter.com/anyepajah/status/2124996217134616928",
    "https://www.x.com/anyepajah/status/2124996217134616928",
    "https://mobile.twitter.com/anyepajah/status/2124996217134616928",
    "https://x.com/i/web/status/2124996217134616928",
    "https://x.com/anyepajah/status/2124996217134616928?s=19",
    "https://x.com/anyepajah/status/2124996217134616928#reply",
  ];
  for (const url of accepted) assert.ok(isPostUrl(url), url);
});

test("a url that does not name a post is rejected", () => {
  const rejected = [
    "https://x.com/anyepajah",
    "https://x.com/anyepajah/status/abc",
    "https://example.com/anyepajah/status/2124996217134616928",
    "http://x.com/anyepajah/status/2124996217134616928",
    "not a url",
  ];
  for (const url of rejected) assert.ok(!isPostUrl(url), url);
  assert.throws(
    () => readPostUrl(Buffer.from('{"url": "https://x.com/anyepajah"}')),
    /does not name an X post/,
  );
});

test("malformed POST.json contents are rejected", () => {
  assert.throws(() => readPostUrl(Buffer.from("not json")), /not valid JSON/);
  assert.throws(() => readPostUrl(Buffer.from('["x"]')), /JSON object/);
  assert.throws(() => readPostUrl(Buffer.from("{}")), /no string "url"/);
});

test("an oversize POST.json is rejected before parsing", () => {
  const big = Buffer.alloc(16385, 0x20);
  assert.throws(() => readPostUrl(big), /limit is 16384/);
});

test("copying a file onto itself is refused with a clear message", () => {
  const dir = tempDir();
  try {
    const source = join(dir, "POST.json");
    writeFileSync(source, `{"url": "${POST_URL}"}\n`);
    assert.throws(() => copyPostFile(source, source), /same file/);
  } finally {
    rmSync(dir, { recursive: true, force: true });
  }
});
