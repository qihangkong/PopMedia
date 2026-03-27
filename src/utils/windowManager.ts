import { WebviewWindow } from '@tauri-apps/api/webviewWindow'

// 配置
const CONFIG = {
  retryInterval: 300,        // 重试间隔 (ms)
  maxRetries: 20,            // 最大重试次数 (20 * 300ms = 6s)
  timeout: 10000,            // 总超时时间 (ms)
}

// 开发模式日志
const isDev = import.meta.env.DEV
function log(...args: unknown[]) {
  if (isDev) console.log('[WindowManager]', ...args)
}
function warn(...args: unknown[]) {
  if (isDev) console.warn('[WindowManager]', ...args)
}
function error(...args: unknown[]) {
  console.error('[WindowManager]', ...args)
}

/**
 * 带超时和重试的窗口获取
 */
async function getWindow(label: string, options = { retries: CONFIG.maxRetries, interval: CONFIG.retryInterval }): Promise<WebviewWindow | null> {
  const startTime = Date.now()

  for (let i = 0; i < options.retries; i++) {
    // 检查是否超时
    if (Date.now() - startTime > CONFIG.timeout) {
      warn(`[${label}] Timeout reached after ${CONFIG.timeout}ms`)
      break
    }

    try {
      const win = await WebviewWindow.getByLabel(label)
      if (win) {
        log(`[${label}] Window found on attempt ${i + 1}`)
        return win
      }
    } catch (e) {
      error(`[${label}] Error:`, e)
    }

    if (i < options.retries - 1) {
      await new Promise(resolve => setTimeout(resolve, options.interval))
    }
  }

  return null
}

/**
 * 初始化窗口管理器
 * 在 App 加载完成后调用，确保主窗口已就绪
 */
export async function initWindowManager(): Promise<void> {
  log('Initializing window manager...')

  try {
    // 1. 显示主窗口
    const main = await getWindow('main')
    if (main) {
      await main.show()
      await main.setFocus()
      log('Main window shown')
    } else {
      warn('Main window not found')
    }

    // 2. 关闭 splashscreen
    const splash = await getWindow('splashscreen')
    if (splash) {
      // 短暂延迟确保过渡流畅
      await new Promise(resolve => setTimeout(resolve, 100))
      await splash.close()
      log('Splashscreen closed')
    }
  } catch (e) {
    error('Init failed:', e)
  }
}

/**
 * 显示主窗口
 */
export async function showMainWindow(): Promise<void> {
  try {
    const main = await getWindow('main')
    if (main) {
      await main.show()
      await main.setFocus()
    }
  } catch (e) {
    error('Show main window failed:', e)
  }
}

/**
 * 关闭启动画面
 */
export async function closeSplashscreen(): Promise<void> {
  try {
    const splash = await getWindow('splashscreen')
    if (splash) {
      await splash.close()
    }
  } catch (e) {
    error('Close splashscreen failed:', e)
  }
}
