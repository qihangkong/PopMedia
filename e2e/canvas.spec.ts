import { test, expect } from '@playwright/test'

test.describe('Canvas', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto('/canvas')
  })

  test('should load the canvas page', async ({ page }) => {
    // Check that the page loaded
    await expect(page).toHaveTitle(/PopMedia/)
  })

  test('should display React Flow canvas', async ({ page }) => {
    // Check for React Flow container
    const reactFlow = page.locator('.react-flow')
    await expect(reactFlow).toBeVisible({ timeout: 10000 })
  })

  test('should have add node menu button', async ({ page }) => {
    // Look for add button (aria-label="添加节点")
    const addButton = page.locator('button[aria-label="添加节点"]')
    await expect(addButton).toBeVisible({ timeout: 5000 })
  })
})
