import assert from "node:assert/strict"
import { renderToStaticMarkup } from "react-dom/server"
import { remark } from "remark"
import remarkParse from "remark-parse"
import remarkRehype from "remark-rehype"
import remarkSafeHtml from "@/lib/remarkSafeHtml"
import remarkWrapHeadings from "@/lib/remarkWrapHeadings"
import { hastToReact } from "@/lib/hast-to-react"

async function main() {
  const markdown = [
    "## Stored content",
    "",
    "[unsafe link](javascript:alert(1))",
    "",
    "<details>",
    "<summary>Show example</summary>",
    "",
    "```html",
    "<script>alert(1)</script>",
    "```",
    "",
    "<img src=x onerror=alert(1)>",
    "</details>",
    "",
    "<br/>",
  ].join("\n")

  const processor = remark()
    .use(remarkParse)
    .use(remarkSafeHtml)
    .use(remarkWrapHeadings)
    .use(remarkRehype)

  const tree = await processor.run(processor.parse(markdown))
  const html = renderToStaticMarkup(hastToReact(tree))

  assert.match(html, /<details>/, "allowlisted details element should remain")
  assert.match(html, /<summary>Show example<\/summary>/, "allowlisted summary should remain")
  assert.match(html, /id="doc-stored-content"/, "document IDs should be prefixed")
  assert.match(html, /<br\s*\/>/, "allowlisted br element should remain")
  assert.doesNotMatch(html, /<script\b/i, "script elements must not be rendered")
  assert.doesNotMatch(html, /onerror=/i, "event handler attributes must not be rendered")
  assert.doesNotMatch(html, /href="javascript:/i, "unsafe URL schemes must be removed")
  assert.doesNotMatch(html, /<img\b/i, "unapproved raw HTML elements must be removed")

  console.log("Stored-XSS rendering regression checks passed.")
}

void main()
