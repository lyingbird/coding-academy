# Team Auto Install

The repository now ships a project settings file:

- `.claude/settings.json`

Current behavior:

- the repo registers its own marketplace from the local directory source
- the repo requests `coding-academy@coding-academy` as an enabled plugin

For teammates using a cloned checkout, this is the lowest-friction path:

1. Open the repo in Claude Code.
2. Trust the workspace.
3. Claude Code sees the project marketplace and enabled plugin request.
4. The Coding Academy plugin becomes available without manual plugin hunting.

## Why The Settings Use `directory` Right Now

This keeps the repo immediately usable before a public GitHub slug is finalized.

```json
{
  "extraKnownMarketplaces": {
    "coding-academy": {
      "source": "directory",
      "path": "."
    }
  },
  "enabledPlugins": {
    "coding-academy@coding-academy": true
  }
}
```

## After Publishing To GitHub

Switch the marketplace source to GitHub:

```bash
pnpm plugin:set-github OWNER/REPO
```

That rewrites `.claude/settings.json` to use a GitHub marketplace source.

There is also a template file:

- `.claude/settings.github.template.json`

To switch back to the local directory source:

```bash
pnpm plugin:set-local
```
