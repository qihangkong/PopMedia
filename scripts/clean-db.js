import fs from 'node:fs'
import path from 'node:path'
import { fileURLToPath } from 'node:url'

const __dirname = path.dirname(fileURLToPath(import.meta.url))
const dbPath = path.join(process.env.LOCALAPPDATA || '', 'PopMedia', 'popmedia.db')

if (fs.existsSync(dbPath)) {
  fs.unlinkSync(dbPath)
  console.log('Database deleted:', dbPath)
} else {
  console.log('Database file not found:', dbPath)
}
