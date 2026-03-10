---
title: "Json Logic in Ruby — Optimizing a JSON Logic Gem - From correct to competitive: quick wins and the big jump"
date: 2026-03-07
draft: false
---

*Part 2 of a series on making the fastest AND most compliant Ruby JSON Logic gem.*

---

When I first got `shiny_json_logic` to 100% test compliance, I still wanted to make my gem as competitive as possible for production; I myself use it and some other devs I know in their companies started to pick it up and I truly wanted them to choose my work over the other options around, so I decided to run a benchmark and see how my gem compared against the others...

Aaaaaaand.... The results were demoralizing.

In absolutely every ruby version and comparison mode `shiny_json_logic` was the slowest gem by a significant margin. In the fair comparison mode, it was about 20k ops/s while `json_logic` was about 80k ops/s.

## Why was it slow?

Comparing my gem with the fastest (albeit abandoned) `json_logic` I found that theirs is  essentially a flat hash of lambdas:

```ruby
OPERATIONS = {
  "+" => ->(args, data) { args.map { |a| apply(a, data) }.sum },
  "==" => ->(args, data) { apply(args[0], data) == apply(args[1], data) }
}
```

`shiny_json_logic` on the other hand had a proper class hierarchy: `Operations::Base`, `Iterable::Base`, mixins for error handling and numeric validation, a scope stack for variable resolution and lazy evaluation for every possible iterative operation. And also every call was instantiating objects.

That class structure is partially the reason *why* we get 100% compliance as it helped having everything around encapsulated and readable, but was also as I learned during my working days that it was spending a lot of unneeded resources for the sake of comfort.

Can we keep the structure and kill unnecessary allocations and bottlenecks?

## Sprint 1 — Quick wins (+13%)

First pass: the easy things.

**`OperatorSolver` class → module with frozen constant.** `OperatorSolver` is the dispatch table — the thing that maps operator strings like `"+"` or `"if"` to their implementation classes:

```ruby
# Before: a class you had to instantiate
class OperatorSolver
  def initialize
    @solvers = {
      "+" => Operations::Addition,
      "if" => Operations::If,
      # ... ~30 more
    }
  end

  def solve(op)
    @solvers[op]
  end
end

solver = OperatorSolver.new  # allocated on every apply
solver.solve("+")
```

It didn't need to be a class. There's no mutable state — it's a fixed mapping that never changes after load. Converted to a module with a frozen constant:

```ruby
# After: a module with a frozen constant
module OperatorSolver
  SOLVERS = {
    "+" => Operations::Addition,
    "if" => Operations::If,
    # ...
  }.freeze
end

OperatorSolver::SOLVERS["+"]  # direct hash lookup, no object allocation
```

One fewer object allocated per `apply` call. Small, but it's the kind of thing that adds up across 600 tests × thousands of iterations.

**`numeric_string?` — rescue → regex.** We were detecting numeric strings with `Float(value) rescue false` and I got to learn that rescuing errors in Ruby is expensive! So i replaced it with a compiled regex:

```ruby
NUMERIC_REGEX = /\A[-+]?(\d+\.?\d*|\.\d+)([eE][-+]?\d+)?\z/

def numeric_string?(val)
  val.is_a?(String) && NUMERIC_REGEX.match?(val)
end
```

The regex is compiled once at load time. and the comparisons are as fast as they can be.

**`frozen_string_literal: true` across all `lib/` files.** String literals in Ruby are normally mutable objects — each one gets allocated. `# frozen_string_literal: true` makes them frozen constants shared across calls. For a hot path that builds operator names and key strings constantly, this matters.

Total gain: **+13%**. Not dramatic, but it told me the approach was working.

## Sprint 2 — Static operations (+81%)

This was the big one.

On `shiny_json_logic` every operation was an instantiated object; `Operations::Addition.new.call(rules, data)`, because of this we would run the whole process of creating an object, initializing it and then evaluating the operation.

In order to fix this, I turned every operation to a static `self.call` method avoiding each instantiation entirely. The code went from this:

```ruby
# Before
class Operations::Addition < Operations::Base
  def call(args, data)
    args.map { |a| apply(a, data) }.sum
  end
end
Operations::Addition.new.call(args, data)

# After
module Operations::Addition
  def self.call(args, scope_stack)
    resolve_rules(args, scope_stack).sum
  end
end
Operations::Plus.call(args, scope_stack)
```

This cascaded through the entire codebase. `Operations::Base`, `Iterable::Base`, all the mixins — everything became module functions or `self.*` methods. Object allocation per operation: eliminated.

The second big change was `IndifferentHash`. To understand why it existed, you need to know that JSON Logic rules reference data by key — `{"var": "user.name"}`. JSON keys are always strings. But in Ruby, it's common to build data hashes with symbol keys (`{user: {name: "Alice"}}`), and your callers might pass either. Without some accommodation, `{"var": "user.name"}` would silently fail on a symbol-keyed hash because `"user" != :user`.

The original solution was a wrapper class:

```ruby
class IndifferentHash < SimpleDelegator
  def [](key)
    super(key.to_s) || super(key.to_sym)
  end
end
```

`SimpleDelegator` proxies all method calls to the wrapped object, which means it carries its own object overhead on top of a hash lookup. And crucially, every hash that came in as `data` — including nested hashes — was getting wrapped. The overhead was on *every access*, not just on creation.

The fix: do one `deep_stringify_keys` call when `apply` is first called. Walk the data once, normalize all keys to strings, never worry about it again. Delete `IndifferentHash` entirely.

Combined result: **+81%**. From ~20k to ~36k ops/s on the fair comparison benchmark.

Still behind `json_logic`. But now in the same ballpark. The next sprint would tackle the remaining allocations — and a correctness fix that became a performance fix at the same time.

---

*Part 2 of 5. Previous: [You can't benchmark what you can't compare](/posts/benchmarking-json-logic-ruby-gems) · Next: [Killing the preprocessing passes: DataHash, HashFetch and allocation profiling](/posts/killing-the-preprocessing-passes-datahash-hashfetch)*

*[jsonlogicruby.com](https://jsonlogicruby.com) · [Benchmarks](https://jsonlogicruby.com/benchmarks) · [Playground](https://jsonlogicruby.com/playground) · [rubygems.org/gems/shiny_json_logic](https://rubygems.org/gems/shiny_json_logic) · [github.com/luismoyano/shiny_json_logic](https://github.com/luismoyano/shiny_json_logic)*
