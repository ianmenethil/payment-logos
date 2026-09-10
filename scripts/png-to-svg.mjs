import fs from 'fs'

const pngPath = 'assets/zp/slice.png'
const data = fs.readFileSync(pngPath)
const base64 = data.toString('base64')

const width = data.readUInt32BE(16)
const height = data.readUInt32BE(20)

const svg = [
  `<svg xmlns="http://www.w3.org/2000/svg" xmlns:xlink="http://www.w3.org/1999/xlink"`,
  `     viewBox="0 0 ${width} ${height}" width="${width}" height="${height}">`,
  `  <image href="data:image/png;base64,${base64}" width="${width}" height="${height}"/>`,
  `</svg>`,
].join('\n')

fs.writeFileSync('assets/zp/slice.svg', svg, 'utf-8')
console.log(`Done: ${width}x${height}px → assets/zp/slice.svg`)
