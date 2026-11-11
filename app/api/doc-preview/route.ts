import { NextRequest, NextResponse } from "next/server"
import { getDocMarkdownBySlug } from "@/lib/doc-markdown"
import { renderDocPreview } from "@/lib/doc-preview"
import { buildApiDocRedirects } from "@/lib/api-docs/build-redirects"

function resolveInternalRedirect(pathname: string): string {
  const redirects = buildApiDocRedirects()
  const visited = new Set<string>()
  let current = pathname

  while (!visited.has(current)) {
    visited.add(current)
    const redirect = redirects.find((entry) => entry.source.toLowerCase() === current.toLowerCase())
    if (!redirect) break
    current = redirect.destination
  }

  return current
}

export async function GET(request: NextRequest) {
  const href = request.nextUrl.searchParams.get("href")
  if (!href || href.length > 2048) {
    return NextResponse.json({ text: null }, { status: 400 })
  }

  let url: URL
  try {
    url = new URL(href, request.nextUrl.origin)
  } catch {
    return NextResponse.json({ text: null }, { status: 400 })
  }
  if (url.origin !== request.nextUrl.origin) {
    return NextResponse.json({ text: null }, { status: 400 })
  }

  let decodedPath: string
  try {
    decodedPath = decodeURIComponent(url.pathname)
  } catch {
    return NextResponse.json({ text: null }, { status: 400 })
  }

  const resolvedPath = resolveInternalRedirect(decodedPath)
  const slug = resolvedPath.replace(/^\/+|\/+$/g, "")
  const markdown = getDocMarkdownBySlug(slug, slug === "")
  if (!markdown) return NextResponse.json({ text: null })

  const previewMarkdown = markdown.length > 3000
    ? `${markdown.slice(0, 3000).replace(/\s+$/, "")}\n\n…`
    : markdown
  const text = renderDocPreview(previewMarkdown)

  return NextResponse.json({ text }, {
    headers: {
      "Cache-Control": "public, max-age=300, s-maxage=3600, stale-while-revalidate=86400",
    },
  })
}
