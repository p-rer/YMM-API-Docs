import type { MetadataRoute } from "next"
import { getAllDocPaths, getDocBySlug } from "@/lib/docs"
import { SITE_URL } from "@/lib/siteSetting"

export const dynamic = "force-static"

export default async function sitemap(): Promise<MetadataRoute.Sitemap> {
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

  return entries
}
