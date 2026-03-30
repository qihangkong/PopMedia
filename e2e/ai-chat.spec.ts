import { test, expect } from '@playwright/test'

test.describe('AI Chat', () => {
  test('should open chat drawer', async ({ page }) => {
    await page.goto('/canvas')

    // Look for chat toggle button (aria-label="AI 助手")
    const chatToggle = page.locator('button[aria-label="AI 助手"]')
    await expect(chatToggle).toBeVisible({ timeout: 10000 })
    await chatToggle.click()

    // Check chat drawer opens
    const chatDrawer = page.locator('.chat-float')
    await expect(chatDrawer).toBeVisible({ timeout: 5000 })
  })

  test('should have chat input in drawer', async ({ page }) => {
    await page.goto('/canvas')

    // Open chat drawer first
    const chatToggle = page.locator('button[aria-label="AI 助手"]')
    await expect(chatToggle).toBeVisible({ timeout: 10000 })
    await chatToggle.click()

    // Wait for drawer
    await page.waitForTimeout(500)

    // Find chat input in drawer (textarea with placeholder)
    const chatInput = page.locator('.chat-float textarea')
    await expect(chatInput).toBeVisible({ timeout: 5000 })
  })
})
