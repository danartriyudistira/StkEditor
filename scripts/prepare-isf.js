import fs from 'fs'
import path from 'path'

const isfDir = path.resolve(process.cwd(), '../ISF')
const publicIsfDir = path.resolve(process.cwd(), 'public/ISF')

if (!fs.existsSync(isfDir)) {
  console.error('ISF directory not found at', isfDir)
  process.exit(1)
}

fs.mkdirSync(publicIsfDir, { recursive: true })

const files = fs.readdirSync(isfDir).filter(f => f.endsWith('.fs'))

for (const file of files) {
  const src = path.join(isfDir, file)
  const dest = path.join(publicIsfDir, file)
  if (!fs.existsSync(dest)) {
    fs.copyFileSync(src, dest)
  }
}

const indexPath = path.join(publicIsfDir, 'isf-index.json')
fs.writeFileSync(indexPath, JSON.stringify(files, null, 2))

console.log(`Copied ${files.length} ISF files to public/ISF/`)
