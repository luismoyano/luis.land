---
title: "Porting shiny_json_logic to Crystal: What the type system taught me about JSON Logic"
date: 2026-04-18
draft: false
---

*Introducing JsonLogic to Crystal*

-

I've been maintaining [shiny_json_logic](https://rubygems.org/gems/shiny_json_logic) (a Ruby JSON Logic implementation with 100% official test compliance) for a while now. When I decided to port it to Crystal, I expected a mechanical translation job but it wasn't!

This is the story of what changed, what broke, and what Crystal forced me to do better.

---

## Why Crystal

The Ruby gem was already passing 601/601 official tests and winning benchmarks against every other Ruby implementation. But Ruby is an interpreted, dynamically typed language. JSON Logic is a tree-walking interpreter — every `apply` call recurses through a rule, pattern-matches on operator names, and dispatches to the right handler.

That's exactly the kind of workload where a compiled, statically typed language shines. Crystal has Ruby-like syntax, compiles to native binaries, and has a type system that catches mistakes at compile time. It felt like the right next step.

---

## The architecture

The Ruby implementation is organized around a registry of operation classes:

```ruby
module ShinyJsonLogic
  module Operations
    class Var < Base
      def self.execute(rules, scope_stack)
        # ...
      end
    end
  end
end
```

Each operator is a class that inherits from `Base`. The engine looks up the operator name, finds the class, and calls `execute`. This works in Ruby because everything is dynamic as you can store class references and call methods on them at runtime without the type system complaining.

Crystal needs more precision. The equivalent in Crystal uses modules with `self.call` and a type-annotated signature:

```crystal
module ShinyJsonLogic
  module Operations
    module Var
      def self.call(args : JSON::Any, scope_stack : Array(JSON::Any)) : JSON::Any
        # ...
      end
    end
  end
end

ShinyJsonLogic::Engine.register("var") { |args, scope_stack| ShinyJsonLogic::Operations::Var.call(args, scope_stack) }
```

The registry stores `Proc(JSON::Any, Array(JSON::Any), JSON::Any)` — closures that wrap each module's `call` method. Crystal's type inference handles the rest.

---

## The hard part: nil vs JSON null

In Ruby, `nil` does double duty. It means "this key doesn't exist in the hash" *and* "this key exists but its value is JSON null". That ambiguity is manageable in a dynamic language, you can always resort to `hash.key?` to distinguish the two cases.

In Crystal, `JSON::Any` has a `raw` property typed as a union:

```crystal
alias Type = Nil | Bool | Int64 | Float64 | String | Array(JSON::Any) | Hash(String, JSON::Any)
```

`Nil` here means JSON null, not "key absent". So when walking a data hash looking up a path like `"user.address.city"`, you need a different signal for "key not found" vs "key found with null value".

The solution was to make `fetch_value_or_missing` return `JSON::Any?` — Crystal nil (`Nil`) for "key not found", `JSON::Any.new(nil)` for "key found with JSON null":

```crystal
def self.fetch_value_or_missing(obj : JSON::Any, key : String) : JSON::Any?
  return nil if obj.raw.nil?   # Crystal nil: absent

  ScopeStack.fetch_key(obj, key)  # Returns JSON::Any? — nil if absent, JSON::Any if found
end
```

This distinction matters for the `var` operator's default value logic:

```crystal
result = fetch_value_or_missing(current, key)
result.nil? ? default : result   # nil = absent → use default; JSON::Any = found → use it
```

In Ruby this same bug caused silent failures in feature flags — `{"var": "is_beta_tester"}` with `{"is_beta_tester": false}` would return `nil` in some implementations because they used `hash[key]` or `hash.dig` without distinguishing nil from absence. Crystal's type system makes the distinction unavoidable.

---

## Truthiness

JSON Logic has specific truthiness rules that differ from both Ruby and Crystal's native semantics:

- `false` → falsy
- `0` → falsy  
- `""` → falsy
- `null` → falsy
- `[]` → falsy (empty array)
- `{}` → falsy (empty object) ← this is the one most implementations get wrong

In Ruby, only `nil` and `false` are falsy. In Crystal, same. So both implementations need an explicit `Truthy` module. Crystal's `case/when` with union type matching makes this clean:

```crystal
module ShinyJsonLogic
  module Truthy
    def self.call(subject : JSON::Any) : Bool
      raw = subject.raw
      case raw
      when Bool    then raw
      when Int64   then raw != 0_i64
      when Float64 then raw != 0.0
      when String  then !raw.empty?
      when Nil     then false
      when Hash    then !raw.empty?
      when Array   then raw.any? { |item| call(item) }
      else              true
      end
    end
  end
end
```

The `when Hash then !raw.empty?` line is the one that catches most other implementations out. An empty object `{}` is falsy per the JSON Logic spec. Crystal's exhaustive pattern matching means if I add a new `when` branch that doesn't return `Bool`, the compiler tells me immediately.

---

## The numbers

Crystal 1.14.0, Linux, 601/601 official tests:

```
692,542 ops/second
```

Ruby 3.4 (same machine, same tests):

```
~39,000 ops/second
```

That's roughly **17x faster**. Not surprising — Crystal compiles to native code and the type information eliminates most of the runtime dispatch overhead that Ruby has. But it's a satisfying number.

The compliance is what matters more to me though. 601/601. Same as Ruby. Same as PHP. All three implementations agree on every edge case.

---

## What Crystal taught me

Three things stood out:

**1. The type system finds spec ambiguities.** Anywhere the JSON Logic spec is vague about "absent" vs "null", Crystal forces you to make a decision. That decision is then visible in the type signature. In Ruby you can paper over it with `nil` and move on. In Crystal you can't.

**2. Modules over classes for stateless operations.** Ruby's inheritance hierarchy (`class Var < Base`) adds indirection without adding value when the methods are all static. Crystal's modules with `self.call` are more honest about what's happening.

**3. JSON::Any is a better model than Ruby's implicit duck typing.** In Ruby, data coming in from JSON can be a Hash, Array, String, Integer, Float, TrueClass, FalseClass, or NilClass. In Crystal it's all `JSON::Any`, and you unwrap it explicitly. More verbose, but the explicitness prevents a whole class of bugs.

---

## The shard

```yaml
dependencies:
  shiny_json_logic:
    github: luismoyano/shiny-json-logic-crystal
```

601/601 official tests. Zero dependencies. Crystal 1.0+.

Part of the [Shiny JSON Logic](https://shinyjsonlogic.com) family — Ruby, PHP, and Crystal, all passing the full official test suite.

- GitHub: [luismoyano/shiny-json-logic-crystal](https://github.com/luismoyano/shiny-json-logic-crystal)
- Benchmarks: [shinyjsonlogic.com/benchmarks](https://shinyjsonlogic.com/benchmarks?tab=crystal)
