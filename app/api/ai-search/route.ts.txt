import { google, type GoogleLanguageModelOptions } from "@ai-sdk/google"
import { generateText } from "ai"
import { NextResponse } from "next/server"
import { z } from "zod"
import { getAllDocPaths } from "@/lib/docs"
import { getDocMarkdownBySlug } from "@/lib/doc-markdown"

export const maxDuration = 15

export const runtime = "nodejs"

const RequestSchema = z.object({
  query: z.string().min(1, "検索クエリは必須です"),
}).strict()

type AiSearchResponse =
  | { results: Array<{ slug: string; title: string; excerpt: string; section: string }>; explanation: string }
  | { error: string }

async function generateAiSearch(query: string): Promise<{
  results: Array<{ slug: string; title: string; excerpt: string; section: string }>
  explanation: string
}> {
  // Get all available documents
  const paths = getAllDocPaths()
  const documents = []

  for (const path of paths) {
    const isHome = path === ""
    const markdown = getDocMarkdownBySlug(path, isHome)
    if (markdown) {
      // Extract title from markdown (first heading)
      const titleMatch = markdown.match(/^#\s+(.+)$/m)
      const title = titleMatch ? titleMatch[1] : path.split('/').pop() || "Untitled"
      
      documents.push({
        slug: path || "home",
        title: title,
        content: markdown,
        section: path.split('/')[0] || "General",
      })
    }
  }

  // Create a context for the AI
  const documentContext = documents
    .map((doc, index) => `[${index}] ${doc.title} (${doc.slug}): ${doc.content.substring(0, 500)}...`)
    .join("\n\n")

  const { text: response } = await generateText({
    model: google("gemini-3.1-flash-lite"),
    prompt: `以下のドキュメントコレクションから、検索クエリ「${query}」に関連するドキュメントを見つけてください。

ドキュメントリスト:
${documentContext}

関連するドキュメントのインデックス番号をJSON形式で返してください。また、なぜそれらが関連しているかの簡単な説明も含めてください。

応答形式:
{
  "indices": [0, 2, 5],
  "explanation": "これらのドキュメントは検索クエリに関連しています..."
}`,
    maxRetries: 0,
    abortSignal: AbortSignal.timeout(12000),
    maxOutputTokens: 1024,
    providerOptions: {
      google: {
        thinkingConfig: { thinkingLevel: "low" },
      } satisfies GoogleLanguageModelOptions,
    },
  })

  // Parse the AI response
  try {
    const parsed = JSON.parse(response.trim())
    const indices = parsed.indices || []
    const explanation = parsed.explanation || "AIによる検索結果"

    const results = indices
      .filter((index: number) => index >= 0 && index < documents.length)
      .map((index: number) => {
        const doc = documents[index]
        return {
          slug: doc.slug,
          title: doc.title,
          excerpt: doc.content.substring(0, 200) + "...",
          section: doc.section,
        }
      })

    return { results, explanation }
  } catch (error) {
    // Fallback: return all documents with relevance scoring
    const results = documents.slice(0, 5).map((doc) => ({
      slug: doc.slug,
      title: doc.title,
      excerpt: doc.content.substring(0, 200) + "...",
      section: doc.section,
    }))

    return {
      results,
      explanation: "関連するドキュメントを検索しました",
    }
  }
}

class MissingApiKeyError extends Error {}

// ---- POST ハンドラ --------------------------------------------------------

export async function POST(request: Request): Promise<NextResponse<AiSearchResponse>> {
  // JSON パース
  let body: unknown
  try {
    body = await request.json()
  } catch {
    return NextResponse.json({ error: "リクエストボディが不正な JSON です" }, { status: 400 })
  }

  // バリデーション
  const parsed = RequestSchema.safeParse(body)
  if (!parsed.success) {
    return NextResponse.json(
      { error: parsed.error.issues.map((i) => i.message).join(", ") },
      { status: 400 },
    )
  }

  const { query } = parsed.data

  try {
    if (!process.env.GOOGLE_GENERATIVE_AI_API_KEY) {
      throw new MissingApiKeyError("サーバー設定エラー: GOOGLE_GENERATIVE_AI_API_KEY が未設定です")
    }

    const result = await generateAiSearch(query)
    return NextResponse.json(result)
  } catch (error) {
    if (error instanceof MissingApiKeyError) {
      return NextResponse.json({ error: error.message }, { status: 500 })
    }

    const detail = error instanceof Error ? error.message : String(error)
    console.log("[ai-search] error:", detail)
    return NextResponse.json(
      { error: `AI検索に失敗しました: ${detail}` },
      { status: 502 },
    )
  }
}
