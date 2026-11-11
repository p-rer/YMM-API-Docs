import { google, type GoogleLanguageModelOptions } from "@ai-sdk/google"
import { generateText } from "ai"
import { unstable_cache } from "next/cache"
import { NextResponse } from "next/server"
import { z } from "zod"
import { getDocMarkdownBySlug } from "@/lib/doc-markdown"

export const maxDuration = 10

export const runtime = "nodejs"

const RequestSchema = z.object({
  articleId: z.string().min(1, "articleId は必須です").max(512).refine((id) =>
    id === "home" ||
    (
      !id.startsWith("/") &&
      !id.includes("\\") &&
      !id.includes("\0") &&
      id.split("/").every((part) => part.length > 0 && part !== "." && part !== "..")
    )
  ),
}).strict()

const MAX_REQUEST_BYTES = 2048

type SummarizeResponse =
  | { summary: string; cached: boolean }
  | { error: string }

async function generateSummary(text: string): Promise<string> {
  const { text: summary } = await generateText({
    model: google("gemini-3.1-flash-lite"),
    prompt: `以下の文章を5行以内で簡潔に要約してください：\n\n${text}`,
    maxRetries: 0,
    abortSignal: AbortSignal.timeout(8000),
    maxOutputTokens: 512,
    providerOptions: {
      google: {
        thinkingConfig: { thinkingLevel: "low" },
      } satisfies GoogleLanguageModelOptions,
    },
  })

  const trimmed = summary.trim()
  if (!trimmed) {
    throw new Error("モデルが空の応答を返しました")
  }
  return trimmed
}

class ArticleNotFoundError extends Error {}
class MissingApiKeyError extends Error {}

const getCachedSummary = unstable_cache(
  async (articleId: string): Promise<string> => {
    const markdown = getDocMarkdownBySlug(articleId === "home" ? "" : articleId, articleId === "home")

    if (!markdown) {
      throw new ArticleNotFoundError("指定された記事が見つかりません")
    }

    if (!process.env.GOOGLE_GENERATIVE_AI_API_KEY) {
      throw new MissingApiKeyError("サーバー設定エラー: GOOGLE_GENERATIVE_AI_API_KEY が未設定です")
    }

    return generateSummary(markdown)
  },
  ["article-summary"],
  {
    tags: ["summary"],
    revalidate: false,
  },
)

// ---- POST ハンドラ --------------------------------------------------------

export async function POST(request: Request): Promise<NextResponse<SummarizeResponse>> {
  // JSON パース前にリクエストサイズを制限する
  const contentLength = Number(request.headers.get("content-length") ?? 0)
  if (Number.isFinite(contentLength) && contentLength > MAX_REQUEST_BYTES) {
    return NextResponse.json({ error: "リクエストボディが大きすぎます" }, { status: 413 })
  }

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

  const { articleId } = parsed.data

  try {
    const summary = await getCachedSummary(articleId)
    return NextResponse.json({ summary, cached: true })
  } catch (error) {
    if (error instanceof ArticleNotFoundError) {
      return NextResponse.json({ error: error.message }, { status: 404 })
    }

    if (error instanceof MissingApiKeyError) {
      return NextResponse.json({ error: error.message }, { status: 500 })
    }

    console.error("[summarize] generation failed:", error)
    return NextResponse.json(
      { error: "要約の生成に失敗しました" },
      { status: 502 },
    )
  }
}
