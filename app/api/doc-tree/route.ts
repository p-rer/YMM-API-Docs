import { NextResponse } from "next/server"
import { getDocTree } from "@/lib/docs"

// The navigation data is shared by every documentation page. Generate it
// once and let the CDN/browser cache the common static response.
export const dynamic = "force-static"

export async function GET() {
  const docTree = await getDocTree()

  return NextResponse.json(docTree, {
    headers: {
      "Cache-Control": "public, max-age=300, s-maxage=86400, stale-while-revalidate=604800",
    },
  })
}
