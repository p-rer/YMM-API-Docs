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
import { visit } from "unist-util-visit"
import { toString } from "mdast-util-to-string"
import GithubSlugger from 'github-slugger'
import { Plugin } from 'unified';
import { Link } from 'mdast';
import remarkWrapHeadings from "./remarkWrapHeadings"
import remarkRemoveFirstH1 from "./remarkRemoveFirstH1"
import { GITHUB_REPO_BRANCH, GITHUB_REPO_NAME, GITHUB_REPO_USERNAME, IS_GITHUB_REPO_EDITABLE } from "./siteSetting"
import { yamlToMarkdown } from "./yaml-docs"

const DOCS_DIRECTORY = path.join(process.cwd(), "content")


function replaceFootnoteBackrefSymbol(html: string): string {
  const undo2Icon = '<svg xmlns="http://www.w3.org/2000/svg" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M9 14 4 9l5-5"/><path d="M4 9h11a4 4 0 1 1 0 8h-1"/></svg>'
  return html.replace(/(<a[^>]*data-footnote-backref[^>]*>)([\s\S]*?)(<\/a>)/g, `$1${undo2Icon}$3`)
}

// Convert spaces to hyphens in URL paths
function normalizePathForUrl(pathStr: string): string {
  return pathStr.toLowerCase().replace(/\s+/g, "-")
}

// Extract headings for table of contents (h2 and h3 elements)
function extractHeadings() {
  return (tree: any, file: any) => {
    const headings: { depth: number; text: string; id: string }[] = []
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
          })
        }
      });
    }

    // Store the headings in the file data
    file.data.headings = headings
  };
}

// Remark plugin that modifies link nodes.
const remarkLinkModifier: Plugin = () => {
  return (tree: any) => {
    // Traverse all link nodes in the Markdown AST
    visit(tree, 'link', (node: Link) => {
      if (node.url) {
        // Check if the URL is external by testing if it starts with "http://" or "https://"
        const isExternal = /^(http|https):\/\//i.test(node.url);
        if (isExternal) {
          // For external links, add target and rel attributes for opening in a new tab securely.
          if (!node.data) {
            node.data = {};
          }
          if (!node.data.hProperties) {
            node.data.hProperties = {};
          }
          node.data.hProperties.target = '_blank';
          node.data.hProperties.rel = 'noopener noreferrer';
        } else {
          // For internal links, convert the URL to lowercase.
          node.url = node.url.toLowerCase();
        }
      }
    });
  };
};

export default remarkLinkModifier;

// Get all doc paths (including YAML files)
export function getAllDocPaths() {
  return getAllFiles(DOCS_DIRECTORY)
      .map((file) => {
        const relativePath = path.relative(DOCS_DIRECTORY, file)
        // Normalize path separators to forward slashes for URL consistency
        const normalizedPath = relativePath.split(path.sep).join("/")
        const filePathWithoutExt = normalizedPath.replace(/\.(md|yaml|yml)$/, "")

        // Handle index files
        if (path.basename(filePathWithoutExt) === "index") {
          return path.dirname(filePathWithoutExt).split(path.sep).join("/")
        }

        return filePathWithoutExt
      })
      .map(normalizePathForUrl)
}

// Get all files recursively (including YAML files)
function getAllFiles(dir: string): string[] {
  const files: string[] = []

  fs.readdirSync(dir).forEach((file) => {
    const filePath = path.join(dir, file)
    const stat = fs.statSync(filePath)

    if (stat.isDirectory()) {
      files.push(...getAllFiles(filePath))
    } else if (file.endsWith(".md") || file.endsWith(".yaml") || file.endsWith(".yml")) {
      files.push(filePath)
    }
  })

  return files
}

// Get doc content by slug (with YAML support)
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

  // Check for both formats (with spaces and with hyphens) and both file types (md, yaml, yml)
  const possiblePaths = [
    path.join(DOCS_DIRECTORY, `${filePathWithSpaces}.md`),
    path.join(DOCS_DIRECTORY, filePathWithSpaces, "index.md"),
    path.join(DOCS_DIRECTORY, `${filePath}.md`),
    path.join(DOCS_DIRECTORY, filePath, "index.md"),

    path.join(DOCS_DIRECTORY, `${filePathWithSpaces}.yaml`),
    path.join(DOCS_DIRECTORY, filePathWithSpaces, "index.yaml"),
    path.join(DOCS_DIRECTORY, `${filePath}.yaml`),
    path.join(DOCS_DIRECTORY, filePath, "index.yaml"),

    path.join(DOCS_DIRECTORY, `${filePathWithSpaces}.yml`),
    path.join(DOCS_DIRECTORY, filePathWithSpaces, "index.yml"),
    path.join(DOCS_DIRECTORY, `${filePath}.yml`),
    path.join(DOCS_DIRECTORY, filePath, "index.yml"),
  ]

  let fullPath = ""
  for (const p of possiblePaths) {
    if (fs.existsSync(p)) {
      fullPath = p
      break
    }
  }

  if (!fullPath) {
    console.warn(`No file found for ${slug}`)
    return null
  }

  try {
    const isYAML = fullPath.endsWith(".yaml") || fullPath.endsWith(".yml")
    const fileContents = isYAML
        ? yamlToMarkdown(fs.readFileSync(fullPath, "utf8"))
        : fs.readFileSync(fullPath, "utf8")
    if (!fileContents) return null
    const { data, content } = matter(fileContents)

    // Process markdown content
    let contentHtml: string
    try {
      const processor = remark()
        .use(remarkParse)
        .use(remarkRemoveFirstH1)
        .use(remarkLinkModifier)
        .use(remarkMath)
        .use(remarkGfm)
        .use(remarkWrapHeadings)
        .use(remarkRehype, { allowDangerousHtml: true })
        .use(rehypeShiki, {
          theme: 'aurora-x'
        })
        .use(rehypeKatex)
        .use(rehypeStringify, { allowDangerousHtml: true })

      const processedContent = await processor.process(content)
      contentHtml = replaceFootnoteBackrefSymbol(processedContent.toString())
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
        const filename = path.basename(fullPath, path.extname(fullPath))
        title = filename === "index" ? path.basename(path.dirname(fullPath)) : filename

        // Clean up and capitalize filename
        title = title
          .replace(/-/g, " ")
          .split(" ")
          .map((word :string) => word.charAt(0).toUpperCase() + word.slice(1))
          .join(" ")
      }
    }

    if (!description) {
      const plainText = content
        .replace(/^#\s+.+$/gm, "")
        .replace(/```[\s\S]*?```/g, "")
        .replace(/`([^`]+)`/g, "$1")
        .replace(/\[([^\]]+)\]\(([^)]+)\)/g, "$1")
        .replace(/[*_>#-]/g, " ")
        .replace(/\s+/g, " ")
        .trim()
      description = plainText.slice(0, 160)
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
    const pathParts = relativePath.replace(/\.(md|yaml|yml)$/, "").split(path.sep)

    // Handle index files for breadcrumbs
    if (pathParts[pathParts.length - 1] === "index") {
      pathParts.pop()
    }

    // Create breadcrumbs
    let breadcrumbs: { label: string; href: string | null }[] = [];
    if (!isHome) {
      breadcrumbs = await Promise.all(pathParts.map(async (part, index) => {
        let href: string | null = "/" + pathParts.slice(0, index + 1).join("/")

        const filePathParts = href.split("/").map((part) => part.replace(/-/g, " "))
        const filePathWithSpaces = filePathParts.join("/")
        const possiblePaths = [
          path.join(DOCS_DIRECTORY, `${filePathWithSpaces}.md`),
          path.join(DOCS_DIRECTORY, filePathWithSpaces, "index.md"),
          path.join(DOCS_DIRECTORY, `${href}.md`),
          path.join(DOCS_DIRECTORY, href, "index.md"),

          path.join(DOCS_DIRECTORY, `${filePathWithSpaces}.yaml`),
          path.join(DOCS_DIRECTORY, filePathWithSpaces, "index.yaml"),
          path.join(DOCS_DIRECTORY, `${href}.yaml`),
          path.join(DOCS_DIRECTORY, href, "index.yaml"),

          path.join(DOCS_DIRECTORY, `${filePathWithSpaces}.yml`),
          path.join(DOCS_DIRECTORY, filePathWithSpaces, "index.yml"),
          path.join(DOCS_DIRECTORY, `${href}.yml`),
          path.join(DOCS_DIRECTORY, href, "index.yml"),

          path.join(DOCS_DIRECTORY, filePathWithSpaces, ".name"),
          path.join(DOCS_DIRECTORY, href, ".name"),
        ]
        let fullPath = ""
        for (const p of possiblePaths) {
          if (fs.existsSync(p)) {
            fullPath = p
            break
          }
        }

        let label = part.replace(/-/g, " ")

        if (fullPath && !fullPath.endsWith(".name")) {
          try {
            const isYAML = fullPath.endsWith(".yaml") || fullPath.endsWith(".yml")
            const fileContents = isYAML
                ? yamlToMarkdown(fs.readFileSync(fullPath, "utf8"))
                : fs.readFileSync(fullPath, "utf8")

            if (fileContents) {
              const { data, content } = matter(fileContents)

              if (data.title) {
                label = data.title
              } else {
                const h1Match = content.match(/^# (.+)$/m)
                if (h1Match) {
                  label = h1Match[1]
                } else {
                  label = part.replace(/-/g, " ")
                      .split(" ")
                      .map((word: string) => word.charAt(0).toUpperCase() + word.slice(1))
                      .join(" ")
                }
              }
            }
          } catch (error) {
            console.warn(`Error reading breadcrumb file ${fullPath}:`, error)
          }
        } else {
          href = null

          if (fullPath.endsWith(".name")) {
            label = fs.readFileSync(fullPath, "utf8")
          }
        }

        return { label, href }
      }))
    }

    return {
      slug,
      title,
      description,
      content: contentHtml,
      toc,
      lastUpdated,
      breadcrumbs,
      frontmatter: data,
      githubEditUrl: IS_GITHUB_REPO_EDITABLE
       ? `https://github.com/${GITHUB_REPO_USERNAME}/${GITHUB_REPO_NAME}/edit/${GITHUB_REPO_BRANCH}/content/` + relativePath.replaceAll("\\", "/")
        : null
    }
  } catch (error) {
    console.error(`Error processing ${slug}:`, error)
    return null
  }
}

// Get document tree for navigation (including YAML files)
export async function getDocTree() {
  const files = getAllFiles(DOCS_DIRECTORY)
  const tree: any = { children: {} }

  for (const file of files) {
    const relativePath = path.relative(DOCS_DIRECTORY, file)
    const pathParts = relativePath.split(path.sep)
    const fileName = pathParts.pop() || ""

    // Skip non-document files
    if (!fileName.endsWith(".md") && !fileName.endsWith(".yaml") && !fileName.endsWith(".yml")) continue
    if (fileName === ".md" || fileName === ".yaml" || fileName === ".yml") continue

    const isYAML = file.endsWith(".yaml") || file.endsWith(".yml")
    const fileContents = isYAML
        ? yamlToMarkdown(fs.readFileSync(file, "utf8"))
        : fs.readFileSync(file, "utf8")
    if (!fileContents) return null
    const { data, content } = matter(fileContents)

    // Determine title
    let title = data.title
    if (!title) {
      const h1Match = content.match(/^# (.+)$/m)
      if (h1Match) {
        title = h1Match[1]
      } else {
        title = path.basename(fileName, path.extname(fileName)).replace(/-/g, " ")
        title = title
            .split(" ")
            .map((word :string) => word.charAt(0).toUpperCase() + word.slice(1))
            .join(" ")
      }
    }

    // Handle index files
    const isIndex = path.basename(fileName, path.extname(fileName)) === "index"
    const urlPath = isIndex
        ? pathParts.map(normalizePathForUrl).join("/")
        : [...pathParts, path.basename(fileName, path.extname(fileName))].map(normalizePathForUrl).join("/")

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
      const fileNameWithoutExt = path.basename(fileName, path.extname(fileName))
      current.children[fileNameWithoutExt] = {
        name: fileNameWithoutExt,
        title,
        url: "/" + urlPath,
        path: [...(current.path || []), fileNameWithoutExt].map(normalizePathForUrl).join("/"),
        children: {},
      }
    }
  }

  function applyNameFiles(node: any, currentPath: string[] = []) {
    if (node.children) {
      for (const key in node.children) {
        const child = node.children[key]
        const childPath = [...currentPath, child.name]

        if (!child.title) {
          const nameFilePath = path.join(DOCS_DIRECTORY, ...childPath, ".name")
          if (fs.existsSync(nameFilePath)) {
            try {
              child.title = fs.readFileSync(nameFilePath, "utf8").trim()
            } catch (error) {
              console.warn(`Error reading .name file ${nameFilePath}:`, error)
            }
          }
        }

        applyNameFiles(child, childPath)
      }
    }
    return node
  }

  applyNameFiles(tree)

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
