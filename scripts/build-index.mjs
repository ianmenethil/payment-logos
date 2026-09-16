/**
 * Reads every SVG and PNG under assets/ and generates src/index.ts with a named
 * string export per logo (kebab-case → camelCase). SVGs export their markup;
 * PNGs export a data URI.
 *
 * Run: pnpm run build:index
 */

import fs from 'fs'
import path from 'path'
import { fileURLToPath } from 'url'

const __dirname = path.dirname(fileURLToPath(import.meta.url))
const root = path.resolve(__dirname, '..')
const assetsDir = path.join(root, 'assets')
const srcDir = path.join(root, 'src')
const outputFile = path.join(srcDir, 'index.ts')

/** Convert kebab-case to camelCase: apple-pay → applePay */
function toCamelCase(str) {
  return str.replace(/-([a-z0-9])/g, (_, c) => c.toUpperCase())
}

const categories = ['cards', 'wallets', 'generic', 'apm', 'zp']

/** Categories whose exports are prefixed to avoid name collisions */
const prefixedCategories = new Set(['zp'])

const lines = [
  '// AUTO-GENERATED — do not edit by hand.',
  '// Re-generate with: npm run build:index',
  '',
]

let count = 0

for (const category of categories) {
  const dir = path.join(assetsDir, category)
  if (!fs.existsSync(dir)) continue

  const entries = fs.readdirSync(dir).sort()
  const svgNames = new Set(
    entries.filter((f) => f.endsWith('.svg')).map((f) => path.basename(f, '.svg'))
  )
  const files = entries.filter((f) => f.endsWith('.svg') || f.endsWith('.png'))

  lines.push(`// ── ${category.toUpperCase()} ${'─'.repeat(50 - category.length)}`)

  for (const file of files) {
    const ext = path.extname(file)
    const name = path.basename(file, ext)

    // An SVG and a PNG of the same name would generate the same export; the SVG wins.
    if (ext === '.png' && svgNames.has(name)) continue

    const base = toCamelCase(name)
    const exportName = prefixedCategories.has(category)
      ? toCamelCase(category) + base.charAt(0).toUpperCase() + base.slice(1)
      : base

    let value
    if (ext === '.png') {
      // PNGs cannot be inlined as markup, so they ship as data URIs instead.
      const b64 = fs.readFileSync(path.join(dir, file)).toString('base64')
      value = `data:image/png;base64,${b64}`
    } else {
      const svgRaw = fs.readFileSync(path.join(dir, file), 'utf-8').trim()
      // Escape backticks and template literal $ signs inside the SVG
      value = svgRaw.replace(/\\/g, '\\\\').replace(/`/g, '\\`').replace(/\$\{/g, '\\${')
    }

    lines.push(`/** \`assets/${category}/${name}${ext}\` */`)
    lines.push(`export const ${exportName}: string = \`${value}\``)
    lines.push('')
    count++
  }
}

fs.mkdirSync(srcDir, { recursive: true })
fs.writeFileSync(outputFile, lines.join('\n'), 'utf-8')

console.log(`✅  Generated ${count} exports → src/index.ts`)
