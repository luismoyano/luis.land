---
title: "Json Logic in Ruby — The last few percent: hot path loops and deleting a class"
date: 2026-03-09
draft: false
---

*Part 4 of a series on making the fastest AND most compliant Ruby JSON Logic gem.*

---

After Sprint 4 I ran the profiler again:

```
GC:                      55.36%
Engine.call:              8.1%
MinMaxCollection.resolve: 6.4%
Numerify.numerify:        2.8%
WithErrorHandling:        2.3% + 2.1%
```

GC at 55% of CPU time. More than half the benchmark was Ruby garbage collecting — not evaluating rules, just cleaning up after itself.

We'd cut allocations by 32%, but 4.38 Arrays per apply is still a lot when you're running 600 tests thousands of times which means there were specific hot paths still creating unnecessary arrays. Let's find out where!

## Sprint 5 — Hot path allocation elimination

Before looking at raw allocation counts, there was a structural problem in the iterable operations: `map`, `filter`, `reduce`, `all`, `some` and `none` — that had been there since the beginning.

**The double scope push.**

For each item in a collection, the old implementation pushed two frames onto the scope stack: one for an `index_scope` hash (`{"index" => i}`) and one for the item itself, there should be a way to have this more efficiently, right? The first thing I found is that I was not even using the index frame as I could just traverse the array to access any level n times so I could safely remove it from allocations and from the scope stack.

```ruby
# Before — two scope frames per item
index_scope = { "index" => 0 }
collection.each_with_index.each_with_object([]) do |(item, index), acc|
  index_scope["index"] = index
  scope_stack.push(index_scope, index: index)  # frame 1
  scope_stack.push(item, index: index)          # frame 2
  begin
    acc << on_each(item, filter, scope_stack)
    scope_stack.pop
    scope_stack.pop
  rescue => e
    scope_stack.pop
    scope_stack.pop
    raise e
  end
end
```

The `index` wasn't used by any operation the spec defines — it was internal scaffolding left over from an earlier implementation. Removing it collapsed two pushes into one, halved the scope stack churn on every iterable operation, and simplified the error handling from a `rescue` pattern to `ensure`.

```ruby
# After — one scope frame per item
collection.each_with_object([]) do |item, acc|
  scope_stack << item
  begin
    acc << on_each(item, filter, scope_stack)
  ensure
    scope_stack.pop
  end
end
```

**`filter` — the hidden second pass.**

`filter` was implemented as a thin override of `Iterable::Base`: It marked non-matching items with `nil` during the main loop and then called `.compact` at the end to strip them out:

```ruby
# filter's on_each
def self.on_each(item, filter, scope_stack)
  Truthy.call(Engine.call(filter, scope_stack)) ? item : nil
end

# on_after
def self.on_after(results, _scope_stack)
  results.compact  # second pass over the array
end
```

Two passes: one to collect and another one to remove null values. The fix was to give `filter` its own `call` implementation that writes only matching items without using a second pass whatsoever.

**The `each_with_object` problem and Ruby 3.4.**

After these structural fixes, I replaced `.each_with_object` with `while i < n` index loops across all 28 hot-path files.

Ruby 3.4 rewrote `Array#each`, `map`, `select`, and other core iterators in pure Ruby to make them faster under YJIT; which turned `each_with_object` and similar chained-enumerator patterns slower without YJIT because they now had more Ruby-level indirection. Our competitor `json_logic` uses plain lambdas with direct iteration, which YJIT inlines aggressively. Our `each_with_object` chains were at a disadvantage.

`while i < n` index loops bypass the enumerator stack entirely. They're predictable for YJIT and fast without it:

```ruby
# Before — each_with_object, enumerator overhead
collection.each_with_object([]) do |item, acc|
  acc << on_each(item, filter, scope_stack)
end

# After — while loop, no enumerator
results = []
i = 0
n = collection.size
while i < n
  results << on_each(collection[i], filter, scope_stack)
  i += 1
end
results
```

**`compare_chain` — the slice that wasn't needed.**

Comparison operators (`>`, `>=`, `<`, `<=`) support chained comparisons: `{ "<" => [1, 2, 3] }` means `1 < 2 < 3` and my implementation iterated over operand pairs:

```ruby
def compare_chain(operands, &op)
  operands[1..].each_with_index do |right, i|
    left = operands[i]
    return false unless op.call(left, right)
  end
  true
end
```

`operands[1..]` creates a new Array on every call; with comparisons appear in nearly every real rule this adds up fast! So I just replaced it with an indexed loop.

**`If#call` — slice again.**

`if` rules take `[condition, then, else]` triplets, but the spec also allows chained `if-elsif-elsif-else` as a flat array. The original used `each_slice(2)`:

```ruby
rules.each_slice(2) do |condition, consequent|
  # ...
end
```

`each_slice` allocates an `Enumerator` plus a new Array for each pair, the fix was pretty much the same for this one.

**`MinMaxCollection` — `map` vs `<<`.**

```ruby
# Before
result = []
wrapped.each { |v| result << resolve(v, scope_stack) }
result

# After
wrapped.map { |v| resolve(v, scope_stack) }
```

This might look like a style preference but it's not: YJIT has specific optimizations for `Array#map` that it can't apply to the manual push pattern, thus the compiled code for `map` avoids intermediate allocations.

**`Missing#deep_keys` — accumulate instead of cons.**

`missing` checks which keys from a list are absent in the current data; To handle dot-notation paths like `"user.name"` it needs to walk the entire data hash recursively and collect all fully-qualified key paths. The original did this with a one-liner:

```ruby
def self.deep_keys(hash)
  hash.keys.map { |key| ([key.to_s] << deep_keys(hash[key])).compact.join(".") }
end
```

On every key at every level of nesting: `hash.keys` allocates an Array, `[key.to_s]` allocates another Array, `deep_keys(hash[key])` returns yet another Array, `<<` appends it in place, `.compact` allocates a fourth Array to strip nils, and `.join` produces a String making a total of four allocations per key recursively.

The fix passes an accumulated prefix string down through recursion and writes results into a shared accumulator array:

```ruby
def self.deep_keys(hash, prefix, acc)
  hash.each do |key, val|
    full_key = prefix ? "#{prefix}.#{key}" : key.to_s
    val.is_a?(Hash) ? deep_keys(val, full_key, acc) : acc[full_key] = true
  end
end
```

**Sprint 5 result: +3-8% across Ruby versions.**

Small gains, but they compound. With YJIT the `map` optimization pays off more:

| Ruby | Sprint 4 | Sprint 5 | Δ |
|------|----------|----------|---|
| 3.2 YJIT | 1,251k | 1,327k | +6% |
| 3.4 YJIT | 1,226k | 1,319k | +8% |

## Sprint 6 — Deleting a class

`ScopeStack` class had three methods: `current`, `push`, `pop`.

```ruby
class ScopeStack
  def initialize(data)
    @stack = [data || {}]
  end

  def current = @stack.last
  def push(data) = @stack << data
  def pop = @stack.pop
end
```

Which were pretty much a wrapper around a Ruby Array that does exactly what the Array already does, but with method call overhead and an object allocation per `apply`.

```ruby
# Before
scope_stack = ScopeStack.new(data)
scope_stack.current      # @stack.last
scope_stack.push(frame)  # @stack << frame
scope_stack.pop          # @stack.pop

# After
scope_stack = [data || {}]
scope_stack.last         # current
scope_stack << frame     # push
scope_stack.pop          # pop
```

Event though there was still some business methods in the scope stack class to handle level deep access, I made it so they could be module functions instead of instance methods, and they could be passed the scope stack as an argument instead of relying on instance state.

This is the kind of refactor that feels almost too obvious in retrospect. The class existed because it held more logic at some point — the `[data, index]` pairs from Sprint 4, some validation. As those things got simplified, the class became a thin wrapper around exactly the thing it was wrapping... Once you see it, you can't unsee it.

## The full picture

From `v0.2.14` (before any optimization) to the end of Sprint 6:

| Ruby | v0.2.14 | Sprint 6 | Total Δ |
|------|---------|----------|---------|
| 2.7 no YJIT | 347k | 886k | **+155%** |
| 3.2 no YJIT | 370k | 847k | **+129%** |
| 3.2 YJIT | 512k | 1,327k | **+159%** |
| 3.4 no YJIT | 350k | 785k | **+124%** |
| 3.4 YJIT | 528k | 1,319k | **+150%** |

*(Local macOS ARM64, all 601 tests.)*

+124% to +159% depending on Ruby version. With YJIT on modern Ruby: over 1.3M ops/s, roughly 0.75µs per rule evaluation.

The Linux CI numbers — the ones that count for the vs-competitors comparison — are in the final post.

---

*Part 4 of 5. Previous: [Killing the preprocessing passes: DataHash, HashFetch and allocation profiling](/posts/killing-the-preprocessing-passes-datahash-hashfetch) · Next: [18/18: the results](/posts/json-logic-ruby-18-18-benchmark-results)*

*[jsonlogicruby.com](https://jsonlogicruby.com) · [Benchmarks](https://jsonlogicruby.com/benchmarks) · [Playground](https://jsonlogicruby.com/playground) · [rubygems.org/gems/shiny_json_logic](https://rubygems.org/gems/shiny_json_logic) · [github.com/luismoyano/shiny_json_logic](https://github.com/luismoyano/shiny_json_logic)*
