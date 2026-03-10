---
title: "Json Logic in Ruby — The fastest JSON Logic gem"
date: 2026-03-10
draft: false
---

*Part 5 of a series on making the fastest AND most compliant Ruby JSON Logic gem.*

---

All the optimization work ran on my MacBook. That's fine for direction as something being faster locally is probably faster everywhere. But macOS ARM64 has its own quirks, and GitHub Actions macOS runners have known YJIT issues that produce wildly inconsistent numbers.

9 Ruby versions × 2 modes = 18 benchmark runs. Competitor: `json_logic`, the fastest alternative at 63% pass rate.

## Mode 1 — All tests (601 tests)

| Ruby | YJIT | shiny | json_logic | Δ |
|------|------|------:|----------:|---|
| 2.7 | — | 67,334 | 55,473 | **+21%** |
| 3.1 | — | 57,568 | 47,342 | **+22%** |
| 3.2 | — | 84,276 | 66,466 | **+27%** |
| 3.2 | ✓ | 86,525 | 66,037 | **+31%** |
| 3.3 | — | 54,516 | 47,704 | **+14%** |
| 3.3 | ✓ | 102,368 | 85,957 | **+19%** |
| 3.4 | — | 66,928 | 61,213 | **+9%** |
| 3.4 | ✓ | 87,160 | 71,925 | **+21%** |
| 4.0 | ✓ | 104,566 | 79,489 | **+32%** |

## Mode 2 — Fair comparison (257-test intersection)

| Ruby | YJIT | shiny | json_logic | Δ |
|------|------|------:|----------:|---|
| 2.7 | — | 67,171 | 46,899 | **+43%** |
| 3.1 | — | 64,150 | 48,282 | **+33%** |
| 3.2 | — | 98,843 | 58,148 | **+70%** |
| 3.2 | ✓ | 111,594 | 51,493 | **+117%** |
| 3.3 | — | 103,107 | 75,623 | **+36%** |
| 3.3 | ✓ | 132,513 | 65,044 | **+104%** |
| 3.4 | — | 102,314 | 67,840 | **+51%** |
| 3.4 | ✓ | 114,890 | 72,766 | **+58%** |
| 4.0 | ✓ | 118,674 | 81,632 | **+45%** |

**18/18 wins.**

## The YJIT story

The Mode 2 YJIT numbers are the most striking. Ruby 3.2 + YJIT: **+117%**. Ruby 3.3 + YJIT: **+104%**.

Why does YJIT amplify the lead so much?

After Sprint 2, most operations are static `self.call` methods on modules. YJIT can see the call target at compile time, inlines it and optimizes the whole dispatch chain. `json_logic`'s lambda dispatch (`OPERATIONS[key].call(args, data)`) has more indirection as lambda is still an object and the call goes through the Proc invocation mechanism, meaning YJIT has less to work with for inlining.

## Why Mode 2 margins are bigger than Mode 1

This is the methodological point from [Post 0](/blog/posts/post-0-benchmarks) coming back around. In Mode 1, `json_logic` gets to speed through a lot of tests by failing them cheaply. In Mode 2, they have to actually compute correct results for the same subset we both pass. That's where the architectural difference shows up.

## Where we started

Ruby 3.2, no YJIT, fair comparison, pre-optimization:
- `json_logic`: ~55k ops/s
- `shiny_json_logic`: ~20k ops/s

They were running **2.75× faster** on the subset we both passed.

End state:
- `json_logic`: 58,148 ops/s
- `shiny_json_logic`: 98,843 ops/s

We're **70% faster** on that same subset. With YJIT: **+117%**.

That's the full arc.

## What's still on the table

The profiler still shows GC at 55% of CPU time. Two options remain on the Ruby side:

**Option E: Direct lambdas for Tier 1 operations.** About 40% of operations are simple enough to bypass the full `Base.call → resolve_rules → execute` chain, converting them to direct lambdas is estimated at +15-25% globally; I measured it on `min`/`max` (15% of the test suite): a direct lambda equivalent runs at 0.782µs vs 1.316µs for the current chain — **+40%** on those operations alone.

**Option D: C extension.** Implement the engine dispatch and hot operations natively. This could be probably faster but also way more complex to maintain, only makes sense after all Ruby-level wins are gone and only if really needed; `shiny_json_logic` is already fast enough for production use and the Ruby-level optimizations are still giving us significant wins, so this is a "maybe someday" kind of thing.

For now: 100% spec compliance AND fastest Ruby JSON Logic gem. That's enough.

---

*Part 5 of 5. Previous: [The last few percent: hot path loops and deleting a class](/posts/hot-path-loops-and-deleting-a-class) · Back to the beginning: [You can't benchmark what you can't compare](/posts/benchmarking-json-logic-ruby-gems)*

*[jsonlogicruby.com](https://jsonlogicruby.com) · [Benchmarks](https://jsonlogicruby.com/benchmarks) · [Playground](https://jsonlogicruby.com/playground) · [rubygems.org/gems/shiny_json_logic](https://rubygems.org/gems/shiny_json_logic) · [github.com/luismoyano/shiny_json_logic](https://github.com/luismoyano/shiny_json_logic)*
