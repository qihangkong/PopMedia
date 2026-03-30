# Test All Skill

When the user asks to run all tests, execute the full test suite:

## Run All Tests
Execute `npm run test:all` which runs:
- Vitest (frontend unit tests)
- Cargo test (Rust backend tests)
- Playwright (E2E tests)

## Report Results
Present test results to the user:
- Which tests passed/failed
- Any errors or failures encountered

## Fix Issues (if requested)
If tests fail and the user asks to fix:
- Identify the failing tests
- Fix the underlying issues
- Re-run tests to verify
