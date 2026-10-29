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
  if (!href) return NextResponse.json({ html: null }, { status: 400 })

  let url: URL
  try {
    url = new URL(href, request.nextUrl.origin)
  } catch {
    return NextResponse.json({ html: null }, { status: 400 })
  }
  if (url.origin !== request.nextUrl.origin) return NextResponse.json({ html: null })

  const resolvedPath = resolveInternalRedirect(url.pathname)
  const slug = decodeURIComponent(resolvedPath).replace(/^\\/+|\\/+$/g, "")
  const markdown = getDocMarkdownBySlug(slug, slug === "")
  if (!markdown) return NextResponse.json({ html: null })

  return NextResponse.json({ html: await renderDocPreview(markdown) })
}
