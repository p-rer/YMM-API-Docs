import fs from "fs"
import path from "path"
import { NextRequest, NextResponse } from "next/server"

const DOCS_DIRECTORY = path.resolve(process.cwd(), "content")
const MAX_IMAGE_SIZE = 25 * 1024 * 1024

const MIME_TYPES: Record<string, string> = {
  ".png": "image/png",
  ".jpg": "image/jpeg",
  ".jpeg": "image/jpeg",
  ".gif": "image/gif",
  ".webp": "image/webp",
  ".svg": "image/svg+xml",
  ".avif": "image/avif",
}

function isWithinDirectory(root: string, candidate: string): boolean {
  const relative = path.relative(root, candidate)
  return relative === "" || (
    relative !== ".." &&
    !relative.startsWith(`..${path.sep}`) &&
    !path.isAbsolute(relative)
  )
}

export async function GET(
  _request: NextRequest,
  { params }: { params: Promise<{ path: string[] }> },
) {
  const { path: pathSegments } = await params
  if (
    pathSegments.some((segment) =>
      segment === "." ||
      segment === ".." ||
      segment.includes("\0") ||
      segment.includes("\\")
    )
  ) {
    return new NextResponse("Forbidden", { status: 403 })
  }

  const resolved = path.resolve(DOCS_DIRECTORY, ...pathSegments)
  if (!isWithinDirectory(DOCS_DIRECTORY, resolved)) {
    return new NextResponse("Forbidden", { status: 403 })
  }

  let realPath: string
  try {
    realPath = fs.realpathSync(resolved)
    const realRoot = fs.realpathSync(DOCS_DIRECTORY)
    if (!isWithinDirectory(realRoot, realPath)) {
      return new NextResponse("Forbidden", { status: 403 })
    }
  } catch {
    return new NextResponse("Not found", { status: 404 })
  }

  const ext = path.extname(realPath).toLowerCase()
  const mimeType = MIME_TYPES[ext]
  if (mimeType === undefined) {
    return new NextResponse("Unsupported file type", { status: 415 })
  }

  const stats = fs.statSync(realPath)
  if (!stats.isFile()) {
    return new NextResponse("Not found", { status: 404 })
  }
  if (stats.size > MAX_IMAGE_SIZE) {
    return new NextResponse("Image too large", { status: 413 })
  }

  const file = fs.readFileSync(realPath)

  return new NextResponse(file, {
    headers: {
      "Content-Type": mimeType,
      "X-Content-Type-Options": "nosniff",
      "Cross-Origin-Resource-Policy": "same-origin",
      "Content-Security-Policy": "default-src 'none'; style-src 'unsafe-inline'; sandbox",
      "Cache-Control": "public, max-age=3600, s-maxage=86400, stale-while-revalidate=604800",
    },
  })
}
