# Commit with Review Skill

When the user asks you to commit, you must follow this workflow:

## 1. Code Review
Run `git diff` and `git status` to review all changes. Analyze the changes and identify:
- What files changed
- The nature of the changes (feat, fix, refactor, test, etc.)
- Any potential issues or concerns

## 2. Full Test
Run `npm run test:all` to execute all tests:
- Vitest (frontend unit tests)
- Cargo test (Rust backend tests)
- Playwright (E2E tests)

## 3. Commit
Only if ALL tests pass:
1. Stage relevant files (exclude generated files, lock files unless appropriate)
2. Draft a clear commit message following conventional commits:
   - feat: new feature
   - fix: bug fix
   - refactor: code refactoring
   - test: adding or updating tests
   - docs: documentation changes
   - chore: maintenance tasks
3. Create the commit with Co-Authored-By headers

## 4. Report
After commit, show the user:
- Commit hash and message
- Files that were committed
- Remaining uncommitted changes (if any)

## Error Handling
If tests fail:
1. Report which tests failed
2. Do NOT commit
3. Ask the user if they want to fix the issues first
