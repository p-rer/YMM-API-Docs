import { remark } from "remark"
import remarkParse from "remark-parse"
import type { Plugin } from "unified"

const parser = remark().use(remarkParse)

function createSummary(value: string) {
  const text = value.replace(/\s+/g, " ").trim()
  return {
    type: "safeSummary",
    data: { hName: "summary" },
    children: [{ type: "text", value: text }],
  }
}

function createDetailsFromMarkdown(markdown: string) {
  const summary = markdown.match(/^\s*<summary\s*>([\s\S]*?)<\/summary\s*>/i)
  const summaryNode = summary ? createSummary(summary[1]) : createSummary("Details")
  const body = summary ? markdown.slice(summary[0].length) : markdown
  const bodyTree = parser.parse(body) as any

  transformChildren(bodyTree)

  return {
    type: "safeDetails",
    data: { hName: "details" },
    children: [summaryNode, ...(bodyTree.children ?? [])],
  }
}

function createDetailsFromNodes(nodes: any[]) {
  const inner = { children: nodes } as any
  transformChildren(inner)

  const children = inner.children ?? []
  if (!children.some((node: any) => node.data?.hName === "summary")) {
    children.unshift(createSummary("Details"))
  }

  return {
    type: "safeDetails",
    data: { hName: "details" },
    children,
  }
}

function transformChildren(parent: any) {
  if (!Array.isArray(parent.children)) return

  const source = parent.children
  const result: any[] = []

  for (let i = 0; i < source.length; i++) {
    const node = source[i]

    if (node.type === "html" && typeof node.value === "string") {
      const value = node.value.trim()

      const completeDetails = value.match(/^<details\s*>([\s\S]*?)<\/details\s*>$/i)
      if (completeDetails) {
        result.push(createDetailsFromMarkdown(completeDetails[1]))
        continue
      }

      const openingDetails = value.match(/^<details\s*>([\s\S]*)$/i)
      if (openingDetails) {
        const innerNodes: any[] = []
        const remainder = openingDetails[1].trim()
        if (remainder) {
          const parsed = parser.parse(remainder) as any
          innerNodes.push(...(parsed.children ?? []))
        }

        let depth = 1
        while (i + 1 < source.length) {
          const next = source[i + 1]
          const nextValue = next.type === "html" && typeof next.value === "string"
            ? next.value.trim()
            : ""

          if (/^<details\s*>/i.test(nextValue)) {
            depth++
            innerNodes.push(next)
            i++
            continue
          }

          if (/^<\/details\s*>$/i.test(nextValue)) {
            depth--
            i++
            if (depth === 0) break
            innerNodes.push(next)
            continue
          }

          innerNodes.push(next)
          i++
        }

        result.push(createDetailsFromNodes(innerNodes))
        continue
      }

      if (/^<\/details\s*>$/i.test(value)) continue

      const summary = value.match(/^<summary\s*>([\s\S]*?)<\/summary\s*>$/i)
      if (summary) {
        result.push(createSummary(summary[1]))
        continue
      }

      if (/^<br\s*\/?>$/i.test(value)) {
        result.push({ type: "safeBreak", data: { hName: "br" } })
      }

      // All other raw HTML is discarded rather than passed to the browser.
      continue
    }

    transformChildren(node)
    result.push(node)
  }

  parent.children = result
}

const remarkSafeHtml: Plugin = () => (tree: any) => {
  transformChildren(tree)
}

export default remarkSafeHtml
