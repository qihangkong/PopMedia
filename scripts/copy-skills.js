/**
 * Copy skills from src-tauri/skills to user app data directory
 * Used during development to install system skills
 */
import { existsSync, mkdirSync, copyFileSync, readdirSync } from 'fs'
import { join, dirname } from 'path'
import { fileURLToPath } from 'url'

const __dirname = dirname(fileURLToPath(import.meta.url))
const projectRoot = join(__dirname, '..')
const sourceDir = join(projectRoot, 'src-tauri', 'skills')

// Target: %LOCALAPPDATA%\PopMedia\.skills\
const isWindows = process.platform === 'win32'
const localAppData = process.env.LOCALAPPDATA || (isWindows ? '' : '.')
const targetDir = join(localAppData, 'PopMedia', '.skills')

function copySkills() {
  if (!localAppData) {
    console.warn('LOCALAPPDATA not found, skipping skill installation')
    return
  }

  // Create target directory if it doesn't exist
  if (!existsSync(targetDir)) {
    mkdirSync(targetDir, { recursive: true })
  }

  // Copy all .md files from source to target
  if (existsSync(sourceDir)) {
    const files = readdirSync(sourceDir).filter(f => f.endsWith('.md'))
    for (const file of files) {
      const source = join(sourceDir, file)
      const target = join(targetDir, file)
      copyFileSync(source, target)
      console.log(`Copied skill: ${file}`)
    }
    console.log(`Installed ${files.length} skills to ${targetDir}`)
  } else {
    console.warn(`Source skills directory not found: ${sourceDir}`)
  }
}

copySkills()
