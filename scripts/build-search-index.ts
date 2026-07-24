import fs from "fs"
import path from "path"
import matter from "gray-matter"
import { Document } from "flexsearch"
import { readDocFileAsMarkdown, resolveDocPath } from "@/lib/doc-markdown"
import { getAllDocPaths } from "@/lib/docs"

export interface SearchMeta {
  id: number
  slug: string
  title: string
  section: string
}

function markdownToPlainText(markdown: string): string {
  return markdown
    .replace(/^#{1,6}\s+/gm, "")
    .replace(/```[\s\S]*?```/g, "")
    .replace(/`([^`]+)`/g, "$1")
    .replace(/\[([^\]]+)]\([^)]+\)/g, "$1")
    .replace(/[*_~>]/g, "")
    .replace(/\s+/g, " ")
    .trim()
}

async function buildSearchIndex() {
  const slugs = getAllDocPaths()

  const index = new Document({
    tokenize: "full",
    resolution: 9,
    cache: false,
    document: {
      id: "id",
      index: [
        { field: "title", tokenize: "full", resolution: 9 },
        { field: "body",  tokenize: "full", resolution: 3 },
      ],
      store: false,
    },
  })

  const bodies: Record<string, string> = {}
  const metaList: SearchMeta[] = []
  let id = 0

  for (const slug of slugs) {
    const fullPath = resolveDocPath(slug, slug === "")
    if (!fullPath) continue
    const raw = readDocFileAsMarkdown(fullPath)
    if (!raw) continue
    const { data, content } = matter(raw)
    const title: string =
      (data.title as string | undefined) ??
      content.match(/^# (.+)$/m)?.[1] ??
      path.basename(slug)
    const body = markdownToPlainText(content)
    const section = slug.split("/")[0] ?? ""

    index.add({ id, slug, title, body })
    bodies[slug] = body
    metaList.push({ id, slug, title, section })
    id++
  }

  // シャードを public/search-index/ に出力
  const shardDir = path.join(process.cwd(), "public", "search-index")
  fs.rmSync(shardDir, { recursive: true, force: true })
  fs.mkdirSync(shardDir, { recursive: true })

  const shardKeys: string[] = []

  await new Promise<void>((resolve) => {
    let pending = 0
    let exportDone = false

    index.export((key: string, data: string | object | undefined) => {
      pending++
      const safeName = String(key).replace(/[^a-zA-Z0-9_-]/g, "_")
      shardKeys.push(safeName)
      const serialized = data === undefined ? "null" : JSON.stringify(data)
      fs.writeFile(
        path.join(shardDir, `${safeName}.json`),
        serialized,
        "utf-8",
        () => {
          pending--
          if (exportDone && pending === 0) resolve()
        },
      )
      exportDone = true
    })

    // export() がコールバックを一切呼ばなかった場合（空インデックス）
    setImmediate(() => {
      exportDone = true
      if (pending === 0) resolve()
    })
  })

  // シャードキー一覧を manifest として保存（クライアントがどのファイルを読むか知るため）
  fs.writeFileSync(
    path.join(shardDir, "manifest.json"),
    JSON.stringify(shardKeys),
    "utf-8",
  )

  const publicDir = path.join(process.cwd(), "public")
  fs.writeFileSync(
    path.join(publicDir, "search-meta.json"),
    JSON.stringify(metaList),
    "utf-8",
  )
  fs.writeFileSync(
    path.join(publicDir, "search-bodies.json"),
    JSON.stringify(bodies),
    "utf-8",
  )

  console.log(`Search index built: ${id} docs, ${shardKeys.length} shards → public/search-index/`)
}

buildSearchIndex().catch((e) => {
  console.error("Failed to build search index:", e)
  process.exit(1)
})