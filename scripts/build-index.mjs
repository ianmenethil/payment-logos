/**
 * Reads all SVG files from assets/ and generates src/index.ts
 * with named exports for each logo (kebab-case → camelCase).
 *
 * Run: node scripts/build-index.mjs
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

  const files = fs
    .readdirSync(dir)
    .filter((f) => f.endsWith('.svg'))
    .sort()

  lines.push(`// ── ${category.toUpperCase()} ${'─'.repeat(50 - category.length)}`)

  for (const file of files) {
    const name = path.basename(file, '.svg')
    const base = toCamelCase(name)
    const exportName = prefixedCategories.has(category)
      ? toCamelCase(category) + base.charAt(0).toUpperCase() + base.slice(1)
      : base
    const svgRaw = fs.readFileSync(path.join(dir, file), 'utf-8').trim()

    // Escape backticks and template literal $ signs inside the SVG
    const escaped = svgRaw.replace(/\\/g, '\\\\').replace(/`/g, '\\`').replace(/\$\{/g, '\\${')

    lines.push(`/** \`assets/${category}/${name}.svg\` */`)
    lines.push(`export const ${exportName}: string = \`${escaped}\``)
    lines.push('')
    count++
  }
}

fs.mkdirSync(srcDir, { recursive: true })
fs.writeFileSync(outputFile, lines.join('\n'), 'utf-8')

console.log(`✅  Generated ${count} exports → src/index.ts`)
