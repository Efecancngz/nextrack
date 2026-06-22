# Contributing Guidelines

Welcome to the **Generic SaaS Starter** repository! To keep the codebase clean, readable, and maintainable, please follow these guidelines when contributing.

## Git Workflow

1. **Commit Rules (Conventional Commits)**
   All commit messages must follow the Conventional Commits specification:
   - `feat: <description>` (new feature)
   - `fix: <description>` (bug fix)
   - `docs: <description>` (documentation)
   - `style: <description>` (CSS, layout, formatting)
   - `refactor: <description>` (code cleanup, no feature/bug change)
   - `chore: <description>` (dependencies, build configs)

   *Examples:*
   - `feat: add user-items progress increment endpoint`
   - `fix: resolve dynamic route param promise resolution in next.js 16`
   - `style: adjust browse page grid spacing`

2. **No Automated Pushes**
   - The AI agent must never automatically run `git push`. Pushes must be approved or executed manually by the user.

3. **CLAUDE.md is Gitignored**
   - `CLAUDE.md` is for local developer notes and configuration, and must never be pushed to the remote repository.

4. **Verify Locally**
   Before making a commit, ensure that:
   - TypeScript compiles successfully: `npm run type-check`
   - Linter checks pass: `npm run lint`
   - The project builds without errors: `npm run build`

## Coding Standards

Refer to [CLAUDE.md](../CLAUDE.md) and [design-patterns.md](design-patterns.md) for detailed coding rules.
