---
title: "Json Logic in Ruby — You can't benchmark what you can't compare: The problem with benchmarking JSON Logic gems in Ruby"
date: 2026-03-06
draft: false
---

*Part 1 of a series on making the fastest AND most compliant Ruby JSON Logic gem.*

---

Before I talk about performance at all, I need to talk about a problem that makes benchmarking JSON Logic gems in Ruby genuinely tricky — and that most people ignore entirely: **the gems don't do the same thing.**

### A bit of context

JSON Logic is a spec loosely based on S-expressions where business logic and data are expressed in JSON and the output should be predictable across languages. The idea is that you write a rule once and it works identically in your JavaScript frontend, your Python backend, and your Ruby service.

The Ruby ecosystem has several gems:
- `json_logic` — the oldest one, abandoned and last updated 4 years ago
- `json-logic-rb` — better maintained, more active
- `json_logic_ruby` — last updated in 2024
- `shiny_json_logic` — mine

Now here's the thing. The [official JSON Logic test suite](https://github.com/json-logic/.github/tree/main/tests) has 601 tests. Let me show you what happens when you run them against each gem:

| Gem | Tests passing |
|-----|--------------|
| shiny_json_logic | 601 / 601 (100%) |
| json-logic-rb | 563 / 601 (93.7%) |
| json_logic | 383 / 601 (63.7%) |
| json_logic_ruby | 262 / 601 (43.6%) |

So when you benchmark these gems against each other, what exactly are you measuring?

If `json_logic` processes 383 tests "fast" while erroring on the other 218 — is that faster? It shouldn't count. It's doing less work than a gem that actually handles everything. How can we compare apples to apples?

### The two modes

This is what led me to design the benchmark in two modes:

**Mode 1 — All tests.** Run all 601 official tests through every gem. Tests that error out count as zero throughput — the gem simply didn't handle them.

**Mode 2 — Fair comparison.** Find the intersection of tests that *all* gems pass, and benchmark only on those. An even playing field where every gem is doing the same work.

The difference is revealing. A gem that looks "faster" in Mode 1 might just be faster at failing. Mode 2 tells you what happens when they're all actually solving the same problems.

Mode 1 still matters though: it captures performance on features that only compliant gems support. If a gem doesn't implement `reduce` at all, it will never show up slow on `reduce` tests — but that's not a win.

You can see both modes side by side on [jsonlogicruby.com/benchmarks](https://jsonlogicruby.com/benchmarks).

### A note on the numbers

The benchmark runs on GitHub Actions Linux runners, across 9 Ruby versions with and without YJIT. The absolute ops/s numbers will vary between runs — GH Actions shared runners have variable load, and a run on a busy day can show 20-30% lower absolute numbers than one on a quiet day.

What stays stable is the *differential* between gems. The underlying hardware and OS are the same for all gems in a given run, so the relative advantage — "shiny is X% faster than json_logic on this Ruby version" — stays consistent across runs even when the absolute numbers shift. Those differentials are the actual signal.

When I quote numbers in this series, they come from a specific CI run on Linux. Treat the absolute values as representative, not as guarantees.

## Why does this matter?

If you're evaluating JSON Logic gems and you only look at ops/s, you might pick the wrong one. A gem at 63% compliance running at 80k ops/s is not faster than a gem at 100% compliance running at 70k ops/s — it just breaks faster.

You can try `shiny_json_logic` directly in the [playground](https://jsonlogicruby.com/playground) without installing anything.

The benchmark infrastructure is open source at [github.com/luismoyano/jsonlogic_benchmarks](https://github.com/luismoyano/jsonlogic_benchmarks). It runs both modes automatically across 9 Ruby versions on Linux CI.

In the next post I'll talk about where `shiny_json_logic` actually started on performance — spoiler: not good.

---

*Part 1 of 5. Next: [From correct to competitive: quick wins and the big jump](/posts/optimizing-json-logic-ruby-from-correct-to-competitive)*

*[jsonlogicruby.com](https://jsonlogicruby.com) · [Benchmarks](https://jsonlogicruby.com/benchmarks) · [Playground](https://jsonlogicruby.com/playground) · [rubygems.org/gems/shiny_json_logic](https://rubygems.org/gems/shiny_json_logic) · [github.com/luismoyano/shiny_json_logic](https://github.com/luismoyano/shiny_json_logic)*
