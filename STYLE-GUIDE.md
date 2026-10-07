# Style guide

The style follows section 3 of the [Node.js Best Practices](https://github.com/goldbergyoni/nodebestpractices#3-code-patterns-and-style-practices) guide.

## Linting and formatting

Biome is our only linter and formatter.

```sh
bun run lint
```

CI runs `biome ci .`, so a formatting or lint error fails the build.

The config uses the `recommended` preset, plus `noVar`.

Two rules are disabled on purpose:

- `noProcessEnv`, because it flags the `env = process.env` injection defaults.
- `useNamingConvention`, because it flags header and environment variable names.

If you got a project rule you can match on syntax alone, then it belongs in a GritQL plugin under `lint/`, registered in `biome.json`.

## Naming

- lowerCamelCase for functions and variables.
- UpperCamelCase for classes.
- UPPER_SNAKE_CASE for module-level constants.

Give every function a name: when something crashes, you want the stack trace to tell you where.

Top-level functions are `function` declarations, and small helpers are `const` arrows.

If a callback grows past a few lines, it gets a name too, either as a named function expression or by moving it out.

## Declarations

`const` is the default.

Use `let` only when you actually reassign the value, and don't use `var` at all.

Comparisons use `===` and `!==`, nothing else.

## Imports

Put static ESM imports at the top of the file, with the `node:` prefix for built-in modules.

Loading JSON? Use an import attribute (`with { type: "json" }`) instead of reading it from disk.

Lazy loading is fine if there's a justification. Think of a probe that has to fail gracefully on runtimes that don't have the module.

But whatever the reason is, write it in a comment right next to it, so that other maintainers can understand why you did it.

## Async code

Use async/await. Callbacks are only for event emitters, like streams, child processes, and HTTP servers.

About to write a `new Promise` wrapper? First check whether one of these already does the job:

- `node:events` (`once`)
- `node:stream/consumers`
- `node:timers/promises`

They usually do.

A hand-written wrapper only makes sense when it enforces a byte limit, a deadline, or cleanup on abort.

Also, don't leave promises floating. If you're ignoring a rejection on purpose, mark it with `.catch(() => {})` so everyone can see it's deliberate.

## What happens when a module loads

Not much, actually :)

Modules under `src/` only declare things when they load.

Startup work goes in `runCli()` in `main.js`.
From there, dependencies get passed down through factory options.

`src/sandbox.js` is the one exception, since it's the entry point of the execution child.
If you ever add another entry point like that, say so in a comment at the top.

## Package entry point

The package has no importable API. `exports` only exposes `package.json`, and the CLI is reached though `bin`.

If we ever need a library API, it'll get its own entry file that doesn't start anything.

## Runtimes

Code must be compatible with both Bun and Node.js.
