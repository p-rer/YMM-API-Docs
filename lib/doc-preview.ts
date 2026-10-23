import { remark } from "remark"
import remarkGfm from "remark-gfm"
import remarkParse from "remark-parse"
import remarkRehype from "remark-rehype"
import rehypeStringify from "rehype-stringify"
import remarkLinkModifier from "./docs"
import remarkRemoveFirstH1 from "./remarkRemoveFirstH1"

export async function renderDocPreview(markdown: string): Promise<string> {
  const introductoryMarkdown = markdown.split(/^##\s/m, 1)[0]
  const result = await remark()
    .use(remarkParse)
    .use(remarkRemoveFirstH1)
    .use(remarkLinkModifier)
    .use(remarkGfm)
    .use(remarkRehype, { allowDangerousHtml: true })
    .use(rehypeStringify, { allowDangerousHtml: true })
    .process(introductoryMarkdown)

  return result.toString()
}
