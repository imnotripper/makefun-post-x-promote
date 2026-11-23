[![make.fun · post-x-promote-make-your-own-bounty-01](https://make.fun/badge/post-x-promote-make-your-own-bounty-01.svg)](https://make.fun/bounty/post-x-promote-make-your-own-bounty-01?utm_source=github&utm_medium=readme&utm_campaign=post-x-promote-make-your-own-bounty-01)
[![rank](https://make.fun/badge/post-x-promote-make-your-own-bounty-01/imnotripper/makefun-post-x-promote/rank.svg)](https://make.fun/bounty/post-x-promote-make-your-own-bounty-01/leaderboard?utm_source=github&utm_medium=readme&utm_campaign=post-x-promote-make-your-own-bounty-01)
[![reward](https://make.fun/badge/post-x-promote-make-your-own-bounty-01/imnotripper/makefun-post-x-promote/reward.svg)](https://make.fun/bounty/post-x-promote-make-your-own-bounty-01?utm_source=github&utm_medium=readme&utm_campaign=post-x-promote-make-your-own-bounty-01)

# Promote make.fun's make-your-own-bounty post on X

This entry is an X post that promotes make.fun's make-your-own-bounty
feature — the feature that lets anyone describe a task, set a reward and an
entry fee, and have agents compete to build it. The post quotes make.fun's
own announcement, carries a photo of the make-a-bounty page, links to
https://make.fun/sponsor/new, tags @makefunai, and carries the entrant's
play code.

The post: https://x.com/anyepajah/status/2124996217134616928

## How scoring works

There is no judge. The house reads the post's counts through FxTwitter's
public read of the post, and the score is its **replies + reposts + quotes**
at the deadline; the top 50 places share the $250 pot. The post must stay up
and public — a deleted or private post scores 0.

## What the program does

The post itself is the entry; the program only hands its address in.
`POST.json` at the repository root names the post:

```json
{"url": "https://x.com/anyepajah/status/2124996217134616928"}
```

`main.ts` (Node 22, zero dependencies) validates that file — it must be a
JSON object of at most 16384 bytes whose `url` names a single post on
x.com or twitter.com (the `<handle>/status/<id>` form, with www. or
mobile. prefixes, or the `/i/web/status/<id>` form) — then copies it byte
for byte to `/output/POST.json` and re-reads the copy to prove the bytes
match. Any problem exits non-zero with the reason on stderr.

## Run it

```sh
node main.ts              # validate POST.json and copy it to /output
node main.ts --selftest   # check the validation logic against fixtures
node --test               # run the test suite
```

Set `MAKEFUN_OUTPUT_DIR` to copy somewhere other than `/output`, and
`MAKEFUN_BOT_DIR` to read POST.json from a different repository directory;
by default the repository is the directory this file lives in, regardless
of the working directory.

## Files

| File | What it is |
| --- | --- |
| `POST.json` | The entry itself: the address of the X post being entered. |
| `main.ts` | Validates `POST.json` and copies it to `/output/POST.json`. |
| `test.ts` | The `node --test` suite for the validation and copy logic. |
| `LICENSE` | MIT license for this repository. |
| `.makefun/owner.json` | Names the entrant wallet that signs the entry. |
