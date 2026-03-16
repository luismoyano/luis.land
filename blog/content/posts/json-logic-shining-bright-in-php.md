---
title: "Json Logic in PHP — We're at it again!"
date: 2026-03-16
draft: false
---

* Introducing `shiny/json-logic-php`: A modern, fully compliant and blazing fast JSON Logic implementation for PHP. With 100% compliance to the official spec and a performance boost of ~2x over the original.

---

JSON Logic is one of those ideas that's so obviously right that you wonder why it took so long: You express business rules as plain serializable and portable JSON, safely evaluable without `eval()`. Store it in a database, send it over an API and evaluate it server-side or client-side against the same spec. Things like feature flags, access control, pricing logic or eligibility rules becomes just data.

The inventor is [Jeremy Wadhams](https://github.com/jwadhams); he built the originals JS and PHP libraries (Maybe he did this for his work where they use PHP?) coined the name, and set up jsonlogic.com. The concept spread: there are implementations in Ruby, Python, Go, Java, Rust and so on. Big companies use it all around... The idea genuinely won.

Without ill intent and after having some experience in the matter I must say that the execution however, never kept up.

## The standard that wasn't quite a standard

The core problem isn't that the libraries are buggy. It's that the specification was never tight enough to prevent them from being buggy.

Take `var` with a falsy value. If a key exists in your data with value `false`, `0`, or `null` — what should `{"var": "key"}` return? The obvious answer is the value. But because this was never documented with tests, implementations never cared and some returned `null` when the value was falsy treating "key not found" and "key found with falsy value" as equivalent! That's a silent bug for anyone using JSON Logic for feature flags: `{"==": [{"var": "is_beta_tester"}, false]}` evaluates incorrectly when `is_beta_tester` is `false`.

Take `missing` and `missing_some`. Should `{"missing": ["x"]}` report `x` as missing if it exists with value `null`? Again, sinde this was never tested and never documented, implementations diverged.

Take truthiness of `{}`. Is an empty object truthy or falsy? Nobody knows! Some implementations treat it as falsy, some as truthy. Worse of all, these are the kind of rules real feature flag systems evaluate every day.

The json-logic organization was created in 2024 precisely to address this. I've been contributing there auditing the standard and covering blind spots, opening proposals for underdocumented behaviors and having the kind of conversations that turn implicit assumptions into explicit spec. That process is what led me to build `shiny_json_logic` for Ruby, and eventually to look at the PHP side.

## What I found in PHP

The PHP package for JSON Logic written by [Wadhams](https://github.com/jwadhams) himself is widely used among php apps: 1.6 million Packagist downloads, last release July 2024 11 leven open issues and seven open PRs without response at the time of writing this.

I opened [issue #22](https://github.com/jwadhams/json-logic-php/issues/22) asking about the status of the library and some missing operators and got no response. As a maintainer I know everyone of us have a life, a schedule and things to do. But it does mean the library is effectively frozen while the spec keeps moving.

When I ran it against the 601 official tests maintained by the json-logic org:

| Library | Passed | Rate |
|---|---|---|
| jwadhams/json-logic-php | 385/601 | 64.06% |

The 216 failing tests include the bugs above, plus missing operators (`filter`, `all`, `some`, `none`, `reduce`), and truthiness issues.

## The performance problem

Compliance aside, there's a structural performance issue in `jwadhams/json-logic-php` that I came across independently and later found someone had already documented in [a YouTube video optimizing it for a client with complex JSON rules](https://www.youtube.com/watch?v=fTw7ZxBV8ys), going from 600ms to 190ms.

The problem is in `apply()`. Every single call — and `apply()` is recursive, so it's called once per node in your rule tree — rebuilds a `$operators` array containing 30+ closures from scratch:

```php
public static function apply($logic = [], $data = [])
{
    // ...
    $operators = [
        '==' => function ($a, $b) { return $a == $b; },
        '===' => function ($a, $b) { return $a === $b; },
        // ... 30+ more closures
    ];
```

For a simple rule this barely matters. For a complex rule with nested `map`/`filter`/`reduce` over a large dataset, that's tens of thousands of array allocations and closure instantiations per evaluation.

The fix in that video (and what I did in [shiny ruby](https://shinyjsonlogic.com/ruby)) is to initialize operators once: In ruby's case, operator classes are static methods resolved at class-load time building once per app instancing and not per call.

Benchmarks on PHP 8.3 (macOS, GitHub Actions runners, no opcache):

| Library | ops/sec (on tests it passes) | ops/sec (same 385 tests) |
|---|---|---|
| shiny/json-logic-php | 570,408 | 680,769 |
| jwadhams/json-logic-php | 279,571 | 332,849 |

~2x faster on comparable workloads. With opcache in production the absolute numbers are higher; the ratio should hold.

## What shiny/json-logic-php is

A modern implementation of the JSON Logic spec for PHP:

- **601/601 official tests** (100% compliance)
- **PHP 8.1+**, zero runtime dependencies
- **~2x faster** than the original on comparable workloads
- Accepts both `stdClass` and array input (however your `json_decode` is configured)
- Static architecture — no per-call reconstruction

```
composer require shiny/json-logic-php
```

```php
use Shiny\JsonLogic\ShinyJsonLogic;

$rule = ["if" => [
    [">" => [["var" => "cart.total"], 100]],
    ["var" => "discount.vip"],
    ["var" => "discount.standard"]
]];

ShinyJsonLogic::apply($rule, $data);
```

The benchmark repo runs weekly on GitHub Actions across PHP 8.1, 8.2, 8.3 on Linux and macOS: [luismoyano/jsonlogic_benchmarks](https://github.com/luismoyano/jsonlogic_benchmarks)

- GitHub: https://github.com/luismoyano/shiny-json-logic-php
- Packagist: https://packagist.org/packages/shiny/json-logic-php
- Ruby port: [shinyjsonlogic.com/ruby](https://shinyjsonlogic.com/ruby)
