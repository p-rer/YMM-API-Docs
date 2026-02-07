import { getAllDocPaths, getDocBySlug } from "@/lib/docs"
import { SITE_URL } from "@/lib/siteSetting"

export const dynamic = "force-static"

export async function GET() {
  const paths = getAllDocPaths()
  const items = await Promise.all(
    paths.map(async (slug) => {
      const doc = await getDocBySlug(slug)
      const loc = slug ? `${SITE_URL}/${slug}` : SITE_URL
      const lastmod = doc?.lastUpdated?.toISOString()
      return `<url><loc>${loc}</loc>${lastmod ? `<lastmod>${lastmod}</lastmod>` : ""}</url>`
    }),
  )

  const xml = `<?xml version="1.0" encoding="UTF-8"?>\n<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">${items.join("")}</urlset>`

  return new Response(xml, {
    headers: {
      "Content-Type": "application/xml; charset=UTF-8",
    },
  })
}
