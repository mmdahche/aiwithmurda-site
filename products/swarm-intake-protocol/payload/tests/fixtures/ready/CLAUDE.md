# sample-app — Root context

## Security boundary

- $0 marginal cost; no paid Claude API key.
- No code content to free APIs — metadata only.
- Human merge gate is the last word; never push to main.
- Secrets live in .env (gitignored), never in the repo.

## Project map

A sample app used as the swarm-readiness golden fixture.

| Module | Path | Owner |
|---|---|---|
| module-a | packages/module-a/ | dev-a |
| module-b | packages/module-b/ | dev-b |
| shared | packages/shared/ | ALL |
| integrations | packages/integrations/ | ALL |

## Branch rules

- Branch naming: {dev}/{module}-{feature}; never push main.
