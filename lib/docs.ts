import { execSync } from "child_process"
import fs from "fs"
import path from "path"
import matter from "gray-matter"
import { remark } from "remark"
import remarkGfm from "remark-gfm"
import remarkParse from "remark-parse"
import remarkRehype from "remark-rehype"
import remarkMath from 'remark-math'
import rehypeKatex from 'rehype-katex'
import rehypeShiki from '@shikijs/rehype'
import rehypeStringify from "rehype-stringify"
import rehypeSlug from "rehype-slug"
import { visit } from "unist-util-visit"
import { toString } from "mdast-util-to-string"
import GithubSlugger from 'github-slugger'

const DOCS_DIRECTORY = path.join(process.cwd(), "content")

// Convert spaces to hyphens in URL paths
function normalizePathForUrl(pathStr: string): string {
  return pathStr.toLowerCase().replace(/\s+/g, "-")
}

// Extract headings for table of contents (h2 and h3 elements)
function extractHeadings() {
  return (tree: any, file: any) => {
    const headings: { depth: number; text: string; id: string }[] = [];
    // Create an instance of github-slugger to generate slugs following rehypeSlug rules
    const slugger = new GithubSlugger();

    if (tree && typeof tree === "object") {
      visit(tree, "heading", (node) => {
        // Process only h2 and h3 headings (depth: 2, 3)
        if (node && node.children && (node.depth === 2 || node.depth === 3)) {
          const text = toString(node);
          // Generate a slug based on the heading text using github-slugger
          const slug = slugger.slug(text);

          headings.push({
            depth: node.depth,
            text,
            id: slug,
          });
        }
      });
    }

    // Store the headings in the file data
    file.data.headings = headings;
  };
}

// Get all doc paths
export function getAllDocPaths() {
  return getAllFiles(DOCS_DIRECTORY)
    .map((file) => {
      const relativePath = path.relative(DOCS_DIRECTORY, file)
      // Normalize path separators to forward slashes for URL consistency
      const normalizedPath = relativePath.split(path.sep).join("/")
      const filePathWithoutExt = normalizedPath.replace(/\.md$/, "")

      // Handle index.md files
      if (path.basename(filePathWithoutExt) === "index") {
        return path.dirname(filePathWithoutExt).split(path.sep).join("/")
      }

      return filePathWithoutExt
    })
    .map(normalizePathForUrl)
}

// Get all files recursively
function getAllFiles(dir: string): string[] {
  const files: string[] = []

  fs.readdirSync(dir).forEach((file) => {
    const filePath = path.join(dir, file)
    const stat = fs.statSync(filePath)

    if (stat.isDirectory()) {
      files.push(...getAllFiles(filePath))
    } else if (file.endsWith(".md")) {
      files.push(filePath)
    }
  })

  return files
}

// Get doc content by slug
export async function getDocBySlug(slug: string, isHome = false) {
  // Convert slug to file path
  let filePath = slug

  // Handle root path
  if (filePath === "") {
    if (!isHome) {
      filePath = "index"
    }
  }

  // Convert hyphens back to spaces for file lookup
  const filePathParts = filePath.split("/").map((part) => part.replace(/-/g, " "))
  const filePathWithSpaces = filePathParts.join("/")

  // Check for both formats (with spaces and with hyphens)
  const possiblePaths = [
    path.join(DOCS_DIRECTORY, `${filePathWithSpaces}.md`),
    path.join(DOCS_DIRECTORY, filePathWithSpaces, "index.md"),
    path.join(DOCS_DIRECTORY, `${filePath}.md`),
    path.join(DOCS_DIRECTORY, filePath, "index.md"),
  ]

  let fullPath = ""
  for (const p of possiblePaths) {
    if (fs.existsSync(p)) {
      fullPath = p
      break
    }
  }

  if (!fullPath) {
    return null
  }

  try {
    const fileContents = fs.readFileSync(fullPath, "utf8")
    const { data, content } = matter(fileContents)

    // Process markdown content
    let contentHtml: string
    try {
      const processor = remark()
        .use(remarkParse)
        .use(remarkMath)
        .use(remarkGfm)
        .use(remarkRehype, { allowDangerousHtml: true })
        .use(rehypeShiki, {
          theme: 'aurora-x'
        })
        .use(rehypeKatex)
        .use(rehypeSlug)
        .use(rehypeStringify, { allowDangerousHtml: true })

      const processedContent = await processor.process(content)
      contentHtml = processedContent.toString()
    } catch (error) {
      console.error(`Error processing markdown for ${slug}:`, error)
      contentHtml = `<p>Error processing content. Please check the markdown file.</p>`
    }

    // Extract headings for table of contents separately
    let toc: { depth: number; text: string; id: string }[] = []
    try {
      const tocProcessor = remark().use(remarkParse).use(extractHeadings)

      const result = await tocProcessor.process(content) as any
      toc = (result.data?.headings as { depth: number; text: string; id: string }[]) || []

      // Ensure toc is an array
      if (!Array.isArray(toc)) {
        console.warn(`TOC is not an array for ${slug}, converting to empty array`)
        toc = []
      }
    } catch (error) {
      console.error(`Error extracting TOC for ${slug}:`, error)
      toc = []
    }

    // Determine title with proper prioritization: frontmatter > h1 > filename
    let title = data.title
    let description = data.description

    if (!title) {
      // Try to extract from first h1
      const h1Match = content.match(/^# (.+)$/m)
      if (h1Match) {
        title = h1Match[1]
      } else {
        // Use filename as fallback
        const filename = path.basename(fullPath, ".md")
        title = filename === "index" ? path.basename(path.dirname(fullPath)) : filename

        // Clean up and capitalize filename
        title = title
          .replace(/-/g, " ")
          .split(" ")
          .map((word :string) => word.charAt(0).toUpperCase() + word.slice(1))
          .join(" ")
      }
    }

    // Get last updated date (from Git if possible, fallback to file stats)
    let lastUpdated
    try {
      // Get last commit time for the file
      const gitTime = execSync(
        `git log -1 --format="%at" -- "${fullPath}"`
      ).toString().trim()

      // Check if Git history is available
      if (gitTime && gitTime.length > 0) {
        // Convert Unix timestamp to JavaScript date
        lastUpdated = new Date(parseInt(gitTime, 10) * 1000)
      } else {
        // Use file system stats as fallback
        const stats = fs.statSync(fullPath)
        lastUpdated = stats.mtime
      }
    } catch (error) {
      // Use file system stats as fallback
      console.warn(`Could not get Git history for ${fullPath}:`, error)
      const stats = fs.statSync(fullPath)
      lastUpdated = stats.mtime
    }

    // Get relative path for breadcrumbs
    const relativePath = path.relative(DOCS_DIRECTORY, fullPath)
    const pathParts = relativePath.replace(/\.md$/, "").split(path.sep)

    // Handle index.md files for breadcrumbs
    if (pathParts[pathParts.length - 1] === "index") {
      pathParts.pop()
    }

    // Create breadcrumbs
    let breadcrumbs: { label: string; href: string }[] = [];
    if (!isHome)
      breadcrumbs = pathParts.map((part, index) => {
        const label = part.replace(/-/g, " ")
        const href = "/" + pathParts.slice(0, index + 1).join("/")
        return { label, href }
      })

    return {
      slug,
      title,
      description,
      content: contentHtml,
      toc,
      lastUpdated,
      breadcrumbs,
      frontmatter: data
    }
  } catch (error) {
    console.error(`Error processing ${slug}:`, error)
    return null
  }
}

// Get document tree for navigation
export async function getDocTree() {
  const files = getAllFiles(DOCS_DIRECTORY)
  const tree: any = { children: {} }

  for (const file of files) {
    const relativePath = path.relative(DOCS_DIRECTORY, file)
    const pathParts = relativePath.split(path.sep)
    const fileName = pathParts.pop() || ""

    // Skip non-markdown files and home
    if (!fileName.endsWith(".md") || fileName === ".md") continue

    // Read frontmatter for title
    const fileContents = fs.readFileSync(file, "utf8")
    const { data, content } = matter(fileContents)

    // Determine title
    let title = data.title
    if (!title) {
      const h1Match = content.match(/^# (.+)$/m)
      if (h1Match) {
        title = h1Match[1]
      } else {
        title = path.basename(fileName, ".md").replace(/-/g, " ")
        title = title
          .split(" ")
          .map((word :string) => word.charAt(0).toUpperCase() + word.slice(1))
          .join(" ")
      }
    }

    // Handle index.md files
    const isIndex = fileName === "index.md"
    const urlPath = isIndex
      ? pathParts.map(normalizePathForUrl).join("/")
      : [...pathParts, path.basename(fileName, ".md")].map(normalizePathForUrl).join("/")

    // Build tree structure
    let current = tree
    for (const part of pathParts) {
      if (!current.children[part]) {
        current.children[part] = {
          name: part,
          path: [...(current.path || []), part].map(normalizePathForUrl).join("/"),
          children: {},
        }
      }
      current = current.children[part]
    }

    // Add file to tree
    if (isIndex) {
      current.title = title
      current.isIndex = true
      current.url = "/" + urlPath
    } else {
      const fileNameWithoutExt = path.basename(fileName, ".md")
      current.children[fileNameWithoutExt] = {
        name: fileNameWithoutExt,
        title,
        url: "/" + urlPath,
        path: [...(current.path || []), fileNameWithoutExt].map(normalizePathForUrl).join("/"),
        children: {},
      }
    }
  }

  // Convert children objects to arrays for easier rendering
  function convertToArray(node: any) {
    if (node.children) {
      node.children = Object.values(node.children)
        .map((child: any) => convertToArray(child))
        .sort((a: any, b: any) => {
          // Sort by whether it's an index file first, then by name
          if (a.isIndex && !b.isIndex) return -1
          if (!a.isIndex && b.isIndex) return 1
          return a.name.localeCompare(b.name)
        })
    }
    return node
  }

  return convertToArray(tree).children
}

// Get next and previous docs
export async function getNextAndPrevDocs(slug: string) {
  const allPaths = getAllDocPaths()

  // Sort paths alphabetically to maintain consistent navigation
  const sortedPaths = [...allPaths].sort((a, b) => {
    // Handle root path specially
    if (a === "") return -1
    if (b === "") return 1
    return a.localeCompare(b)
  })

  const currentIndex = sortedPaths.indexOf(slug)

  const prev = currentIndex > 0 ? sortedPaths[currentIndex - 1] : null
  const next = currentIndex < sortedPaths.length - 1 ? sortedPaths[currentIndex + 1] : null

  const result: { prev?: { slug: string; title: string }; next?: { slug: string; title: string } } = {}

  if (prev !== null) {
    const prevDoc = await getDocBySlug(prev)
    if (prevDoc) {
      result.prev = { slug: prev, title: prevDoc.title }
    }
  }

  if (next !== null) {
    const nextDoc = await getDocBySlug(next)
    if (nextDoc) {
      result.next = { slug: next, title: nextDoc.title }
    }
  }

  return result
}

// Make sure this line is at the top of the exports

