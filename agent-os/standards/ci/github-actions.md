# GitHub Actions CI/CD Standards for HexDI

## Workflow Structure

### PR Workflow (`ci.yml`)
Runs on every pull request:
- Lint (ESLint, Prettier)
- Type check (`tsc --noEmit`)
- Unit tests
- Build all packages
- Size check (bundle size limits)

### Release Workflow (`release.yml`)
Runs on main branch:
- All PR checks
- Changesets version/publish
- Documentation deployment
- GitHub release creation

### Scheduled (`nightly.yml`)
Optional nightly runs:
- Full test suite
- Dependency audit
- Integration tests with latest React

## Job Configuration

### Matrix Testing
- Node.js versions: 18.x, 20.x, 22.x
- OS: ubuntu-latest (primary), optional macos/windows
- React versions for @hex-di/react

### Caching
- pnpm store caching
- Turborepo remote caching
- Node modules cache

### Concurrency
- Cancel in-progress runs on new push
- Limit concurrent releases

## Quality Gates

### Required Checks
- All lint rules pass
- Type check passes
- All tests pass
- Build succeeds
- No size regression

### Optional Checks
- Code coverage threshold
- Performance benchmarks
- Documentation build

## Release Process

### Changesets Flow
1. PRs include changeset files
2. Release PR auto-generated
3. Merge triggers npm publish
4. Git tags created automatically

### npm Publishing
- Publish to npm registry
- Provenance attestation
- Access: public
- Tag: latest (or next for prereleases)

## Documentation Deployment
- Build Docusaurus site
- Deploy to GitHub Pages
- Custom domain support
- Preview deployments for PRs

## Security

### Secrets Management
- NPM_TOKEN for publishing
- GITHUB_TOKEN for releases
- No secrets in logs

### Dependency Scanning
- Dependabot enabled
- npm audit in CI
- Lock file verification

## Notifications
- Slack/Discord for release notifications (optional)
- GitHub status checks
- Email for security alerts
