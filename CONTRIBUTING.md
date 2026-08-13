# Contributing to Astrolabe Common (@astroapps packages)

All `rush` commands must be run from `Astrolabe.TestTemplate/` (the folder containing `rush.json`). Paths like `common/config/rush/` below are relative to it.

## Making changes
1. Fork https://github.com/astrolabe-apps/astrolabe-common
2. Create a branch, e.g. `bugfix/<description>`, `feature/<github-issue-no>`, `cleanup/<description>`
3. Make the required changes
4. Run `rush change` and describe changes, choose semver major/minor/patch etc (Claude is good at it). Commit as part of your changes
5. Create pull request targeting upstream

## Publishing to npm (maintainers)

### Pre-requisites
- You have push access to https://github.com/astrolabe-apps/astrolabe-common and are working in a clone of it (not a fork)
- Create a granular npm token with read/write access to the `@astroapps` packages and export it as `NPM_AUTH_TOKEN`. Check the token hasn't expired — that's the usual publish-day failure
- Run `rush update` so dependencies are installed. There is no separate build step — each package's `prepack` script runs its build during publish

### Steps
1. Merge the pull request(s) and update your local `main`
2. Run `rush version --bump`, then verify it made these changes:
    - The pending change files in `common/changes/` (e.g. `<branch-name-date>.json`) are deleted
    - Each changed package has its `package.json` version bumped
    - Each changed package has updated `CHANGELOG.md` and `CHANGELOG.json` files
3. Commit the changes (e.g. "Bump for publish") but don't push — step 6 pushes them
4. Check the publish target isn't a private registry (see `.npmrc-publish` in `common/config/rush/`)
5. Dry run `rush publish-check` (`rush publish --include-all`) and check expected packages will be published
6. If dry run is successful, run `rush publish-commit` (which is essentially `rush publish --include-all -b main --publish`). This pushes the bump commit and git tags to `main`

### Notes
- `publish-check` and `publish-commit` are custom commands defined in `common/config/rush/command-line.json`. They wrap `rush publish` (preserving `XDG_CONFIG_HOME` so browser-based npm authentication works) — they do not run a build themselves; each package builds via its `prepack` script
- If publishing fails partway (expired token, network, OTP), fix the issue and re-run `rush publish-commit` — rush skips any versions already on the registry

### Final checks
1. Check packages are visible on https://npmjs.com
2. Check the bump commit and git tags landed on GitHub
