import fs from 'fs'
import path from 'path'

const isfDir = path.resolve(process.cwd(), '../ISF')
const publicIsfDir = path.resolve(process.cwd(), 'public/ISF')

if (!fs.existsSync(isfDir)) {
  console.warn('ISF directory not found at', isfDir, '- using existing public/ISF/')
}

fs.mkdirSync(publicIsfDir, { recursive: true })

if (fs.existsSync(isfDir)) {
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
} else {
  const existing = fs.readdirSync(publicIsfDir).filter(f => f.endsWith('.fs'))
  const indexPath = path.join(publicIsfDir, 'isf-index.json')
  fs.writeFileSync(indexPath, JSON.stringify(existing, null, 2))
  console.log(`Using ${existing.length} existing ISF files from public/ISF/`)
}
