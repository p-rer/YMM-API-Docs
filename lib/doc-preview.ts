import { remark } from "remark"
import remarkParse from "remark-parse"
import { toString } from "mdast-util-to-string"

export function renderDocPreview(markdown: string): string {
  const tree = remark().use(remarkParse).parse(markdown) as any
  return (tree.children ?? [])
    .map((node: any) => toString(node))
    .filter((text: string) => text.trim().length > 0)
    .join("\n\n")
}
