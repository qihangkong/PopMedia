import { useState, useEffect, useRef } from 'react'
import { getFileUrl } from '../utils/tauriApi'

/**
 * Hook to convert asset paths to displayable URLs
 * Avoids re-converting the same path by tracking the last converted path
 */
export function useMediaUrl(assetPath: string | undefined, initialUrl: string = '') {
  const [displayUrl, setDisplayUrl] = useState(initialUrl)
  const lastConvertedPath = useRef<string | null>(null)

  useEffect(() => {
    if (!assetPath) {
      setDisplayUrl('')
      lastConvertedPath.current = null
      return
    }

    // If already converted this exact path, skip
    if (assetPath === lastConvertedPath.current) {
      return
    }

    // If it's a data URL or external URL, use directly
    if (!assetPath.startsWith('assets/')) {
      setDisplayUrl(assetPath)
      lastConvertedPath.current = assetPath
      return
    }

    // Convert asset path to URL
    lastConvertedPath.current = assetPath
    getFileUrl(assetPath).then((url) => {
      // Only update if the path hasn't changed since we started
      if (lastConvertedPath.current === assetPath) {
        setDisplayUrl(url)
      }
    })
  }, [assetPath])

  return displayUrl
}
