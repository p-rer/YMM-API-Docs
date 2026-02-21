import { getAllDocPaths, getDocBySlug } from "@/lib/docs"
import { SITE_URL } from "@/lib/siteSetting"

export const dynamic = "force-static"

export async function GET() {
  const paths = getAllDocPaths()
  const entries = await Promise.all(
    paths.map(async (slug) => {
      const doc = await getDocBySlug(slug)
      return {
        url: slug ? `${SITE_URL}/${slug}` : SITE_URL,
        lastModified: doc?.lastUpdated,
      }
    }),
  )

  const body = `<?xml version="1.0" encoding="UTF-8"?>\n<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">\n${entries
    .map((entry) => {
      const lastMod = entry.lastModified ? `\n    <lastmod>${new Date(entry.lastModified).toISOString()}</lastmod>` : ""
      return `  <url>\n    <loc>${entry.url}</loc>${lastMod}\n  </url>`
    })
    .join("\n")}\n</urlset>\n`

  return new Response(body, {
    headers: {
      "Content-Type": "application/xml; charset=utf-8",
      "Cache-Control": "public, max-age=0, s-maxage=3600",
    },
  })
}
