import { readFileSync, writeFileSync } from 'node:fs'
import { dirname, join } from 'node:path'
import { fileURLToPath } from 'node:url'

const rootDir = join(dirname(fileURLToPath(import.meta.url)), '..')
const blogData = JSON.parse(
  readFileSync(join(rootDir, 'src/data/blog-data.json'), 'utf8'),
)

const urls = [
  {
    loc: 'https://www.base212.com/',
    lastmod: '2026-07-13',
    changefreq: 'weekly',
    priority: '1.0',
  },
  {
    loc: 'https://www.base212.com/blogs',
    lastmod: '2026-07-13',
    changefreq: 'weekly',
    priority: '0.9',
  },
  ...blogData.map((post) => ({
    loc: `https://www.base212.com/blogs/${post.slug}`,
    lastmod: post.published_at,
    changefreq: 'monthly',
    priority: '0.8',
  })),
]

const xml = `<?xml version="1.0" encoding="UTF-8"?>
<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">
${urls
  .map(
    (url) => `  <url>
    <loc>${url.loc}</loc>
    <lastmod>${url.lastmod}</lastmod>
    <changefreq>${url.changefreq}</changefreq>
    <priority>${url.priority}</priority>
  </url>`,
  )
  .join('\n')}
</urlset>
`

writeFileSync(join(rootDir, 'public/sitemap.xml'), xml)
console.log(`Generated sitemap with ${urls.length} URLs`)
