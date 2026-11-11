import { visit } from "unist-util-visit"
import type { Plugin } from "unified"
import path from "path"

const DOCS_DIRECTORY = path.join(process.cwd(), "content")

/**
 * remark plugin: Resolves relative image paths in Markdown to absolute URLs
 * that are served by the content-images API route.
 *
 * ./screenshot.png (in content/reference/some-page/index.md)
 * → /content-images/reference/some-page/screenshot.png
 */
const remarkResolveContentImages = (filePath: string): Plugin => {
  return () => {
    return (tree: any) => {
      visit(tree, "image", (node: any) => {
        const src: string = node.url
        if (!src) return

        if (/^(https?:\/\/|\/\/)/i.test(src)) return
        if (src.startsWith("/")) return

        const mdDir = path.dirname(filePath)
        const absoluteImagePath = path.resolve(mdDir, src)
        const relative = path.relative(DOCS_DIRECTORY, absoluteImagePath)
        if (
          relative === ".." ||
          relative.startsWith(`..${path.sep}`) ||
          path.isAbsolute(relative)
        ) {
          node.type = "text"
          node.value = typeof node.alt === "string" ? node.alt : ""
          delete node.url
          delete node.alt
          delete node.title
          return
        }
        node.url = "/content-images/" + relative.split(path.sep).join("/")
      })
    }
  }
}

export default remarkResolveContentImages