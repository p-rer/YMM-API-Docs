import { NextRequest, NextResponse } from "next/server"
import { getDocMarkdownBySlug } from "@/lib/doc-markdown"
import { renderDocPreview } from "@/lib/doc-preview"

export async function GET(request: NextRequest) {
  const href = request.nextUrl.searchParams.get("href")
  if (!href) return NextResponse.json({ html: null }, { status: 400 })

  const url = new URL(href, request.nextUrl.origin)
  if (url.origin !== request.nextUrl.origin) return NextResponse.json({ html: null })

  const slug = decodeURIComponent(url.pathname).replace(/^\/+|\/+$/g, "")
  const markdown = getDocMarkdownBySlug(slug, slug === "")
  if (!markdown) return NextResponse.json({ html: null })

  return NextResponse.json({ html: await renderDocPreview(markdown) })
}
