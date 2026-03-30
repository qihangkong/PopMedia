# Commit Skill

When the user asks you to commit, you must follow this workflow:

**IMPORTANT**: Before committing, you MUST run `/review` and `/testall` first.

## 1. Code Review
Run `/review` to review all code changes.

## 2. Full Test
Run `/testall` to run all tests (vitest + cargo + playwright).

## 3. Commit
Only if review and tests pass:
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
If code review or tests find issues:
1. **Fix the issues first** - do not wait for user to fix them
2. Re-run `/review` or `/testall` to verify fixes
3. Only commit when all issues are resolved and tests pass
