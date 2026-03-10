---
title: "Json Logic in Ruby — Killing the preprocessing passes: DataHash, HashFetch and allocation profiling"
date: 2026-03-08
draft: false
---

*Part 3 of a series on making the fastest AND most compliant Ruby JSON Logic gem.*

---

After Sprint 2 we had gone from ~20k to ~36k ops/s. Still behind `json_logic`. Time to look harder at what was happening on every single `apply` call.

## Two passes before any actual work

Every call to `apply` was running two full traversals of the input:

**Pass 1 — validate operations**: Walk the rule tree and raise `InvalidOperation` if any operator wasn't recognized.

**Pass 2 — `deep_stringify_keys`**: Walk the data hash recursively and normalize all keys to strings which would replace `IndifferentHash` from Sprint 2 by normalizing the input once upfront.

Both passes traversed the input before the engine touched it, in most cases even while useful it was just too expensive to run on every call.

## HashFetch: one lookup, no preprocessing

The fix was `Utils::HashFetch` — a single utility that looks up a key in a hash trying the string form first, then the symbol form:

```ruby
module Utils::HashFetch
  def self.fetch(obj, key_s)
    key_s = key_s.to_s
    if obj.key?(key_s)
      obj[key_s]
    elsif obj.key?(key_sym = key_s.to_sym)
      obj[key_sym]
    end
  end
end
```

`key?` checks presence without touching the value, so `nil` and `false` values are handled correctly. `Var#fetch_value`, `Val#dig_value`, and `ScopeStack#dig_value` all went through this single path.

With `HashFetch` in place, `deep_stringify_keys` was no longer needed as we just looked up both key forms on demand in the most efficient way at the point of access.

Eliminating Pass 1 required a different trick; Let's imagine a typical set of rules and data:

```ruby
rule = {"and": [{"var": "user.address"}, {"var": "user.personal_info"}]}
data = {"user": {"address":{ "street": "..." }, "personal_info": {"name": "Alice", "age": 30}}
```

And now let's imagine we solve `var` first in order to solve `and` later; The resulting hash for `and` would look like:

```ruby
{"and": [{"street": "..."}, {"name": "Alice", "age": 30}]}
```

How can we tell the engine "this is user data, not a rule"? If we just return a plain `Hash`, the engine would try to interpret it as a rule and look for an operator key, which would blow up the call stack with `InvalidOperation` errors.

The solution was `DataHash`:

```ruby
class Utils::DataHash < Hash
  def self.wrap(obj)
    return obj unless obj.is_a?(Hash)
    return obj if obj.is_a?(DataHash)
    new.replace(obj)
  end
end
```

A plain `Hash` subclass with no new methods just to be used as a type tag. When `var` or `val` return a hash from user data, they wrap it in `DataHash`, the engine checks `result.is_a?(DataHash)` before attempting operator dispatch and skips evaluation if it is rendering a preprocessing pass unnecessary.

`Hash#replace` does a C-level table swap on the underlying hash internals — no element-by-element copying, just pointer reassignment. So `wrap` is effectively free.

**Performance gain from HashFetch + DataHash: +6.9%.** The upfront traversals are gone. Both passes eliminated.

## Sprint 4 — Killing the remaining Array allocations

With `HashFetch` and `DataHash`  done, I ran the allocation profiler to find what was left:

Per `apply` call, across the test suite:
- **6.42 Arrays** — way too many
- 0.75 Hashes — acceptable
- 1.24 Objects — fine
- 0.80 Strings — fine

Arrays were the target. Four sources:

**`ScopeStack` parallel arrays.** JSON Logic has operations like `map`, `filter`, and `reduce` that iterate over an array and evaluate a sub-rule for each element. Inside that sub-rule, `{"var": ""}` needs to refer to the *current element* and not the original top-level data; the scope stack is how the engine tracks this nesting by pushing a new frame onto the stack with the current element as the data context on each iteration and deleting it when the iteration is finished.

The scope stack was storing frames as `[data, index]` pairs — each frame was a 2-element Array. Every push allocated one.

```ruby
# Before: 

@stack = [[data1, 0], [data2, 1]] #, ...]

# push: 
@stack << [data, index] # 1 Array allocation per push

# After: two parallel arrays
@data_stack = [data1, data2]
@index_stack = [0, 1]

# push: 
@data_stack << data; @index_stack << index  # 0 Array allocations
```

**`Array.wrap` fast path.** We had a utility that ensured values were wrapped in an Array which always allocates a new Array, even if the argument is already one.

```ruby
# Before
def self.wrap(val)
  Array(val)

# After
def self.wrap(val)
  val.is_a?(Array) ? val : Array(val)
end
```

Saves an allocation for the common case where rules already produce arrays.

**`safe_arithmetic` — kill the Proc.** We had a method that wrapped numeric operations with error handling:

```ruby
def safe_arithmetic(&block)
  result = block.call
  # ...
end
```

`&block` materializes the block as a `Proc` object while `yield` doesn't:

```ruby
def safe_arithmetic
  result = yield
  # ...
end
```

One Proc fewer per arithmetic operation.

## Results after Sprint 4

Arrays per apply: **6.42 → 4.38 (-32%)**

| Ruby | Before | After | Δ |
|------|--------|-------|---|
| 2.7 no YJIT | 754k | 857k | +14% |
| 3.2 no YJIT | 717k | 804k | +12% |
| 3.2 YJIT | 1,068k | 1,251k | +17% |
| 3.4 no YJIT | 665k | 744k | +12% |
| 3.4 YJIT | 1,107k | 1,226k | +11% |

*(Local macOS numbers. Linux CI results in Part 4.)*

Consistent +12-17% across all Ruby versions, I learnt that allocation reduction translates cleanly to wall time as every Array we stop creating is one GC doesn't have to collect.

Next: the last allocations hiding in hot path loops.

---

*Part 3 of 5. Previous: [From correct to competitive: quick wins and the big jump](/posts/optimizing-json-logic-ruby-from-correct-to-competitive) · Next: [The last few percent: hot path loops and deleting a class](/posts/hot-path-loops-and-deleting-a-class)*

*[jsonlogicruby.com](https://jsonlogicruby.com) · [Benchmarks](https://jsonlogicruby.com/benchmarks) · [Playground](https://jsonlogicruby.com/playground) · [rubygems.org/gems/shiny_json_logic](https://rubygems.org/gems/shiny_json_logic) · [github.com/luismoyano/shiny_json_logic](https://github.com/luismoyano/shiny_json_logic)*
