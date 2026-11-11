import fs from "fs"
import path from "path"
import matter from "gray-matter"
import { yamlToMarkdown } from "./yaml-docs"
import { isApiDocument, renderApiDocToMarkdown } from "@/lib/api-docs/render-api-doc"

const DOCS_DIRECTORY = path.join(process.cwd(), "content")

function extractHiddenNumberAndRest(filename: string): { number: number | null; rest: string } {
  const match = filename.match(/^\((\d+)\)~/)
  if (match) {
    return { number: parseInt(match[1], 10), rest: filename.slice(match[0].length) }
  }
  return { number: null, rest: filename }
}

function findFileInDir(
  dir: string,
  targetBase: string,
  extensions: string[] = [".md", ".yaml", ".yml"]
): string | null {
  if (!fs.existsSync(dir)) return null
  const files = fs.readdirSync(dir)
  for (const file of files) {
    const ext = path.extname(file)
    if (!extensions.includes(ext)) continue
    const nameWithoutExt = path.basename(file, ext)
    const { rest } = extractHiddenNumberAndRest(nameWithoutExt)
    if (rest === targetBase) {
      return path.join(dir, file)
    }
  }
  return null
}

export function getAllDocSlugs(): string[] {
  function getContentFiles(directory: string): string[] {
    const files: string[] = []

    for (const entry of fs.readdirSync(directory, { withFileTypes: true })) {
      const entryPath = path.join(directory, entry.name)
      if (entry.isDirectory()) {
        files.push(...getContentFiles(entryPath))
      } else if (entry.isFile() && /\.(md|yaml|yml)$/i.test(entry.name)) {
        files.push(entryPath)
      }
    }

    return files
  }

  return getContentFiles(DOCS_DIRECTORY).map((file) => {
    const relativePath = path.relative(DOCS_DIRECTORY, file)
    const normalizedPath = relativePath.split(path.sep).join("/")
    const withoutExtension = normalizedPath.replace(/\.(md|yaml|yml)$/i, "")

    if (path.basename(withoutExtension).toLowerCase() === "index") {
      return path.dirname(withoutExtension).split(path.sep).join("/")
        .toLowerCase().replace(/\s+/g, "-")
        .replace(/^\.\/$/, "")
        .replace(/^\.$/, "")
    }

    const filename = path.basename(withoutExtension)
    const hiddenNumber = filename.match(/^\(\d+\)~/)
    const visibleFilename = hiddenNumber
      ? filename.slice(hiddenNumber[0].length)
      : filename
    const slug = path.join(path.dirname(withoutExtension), visibleFilename)
    return slug.split(path.sep).join("/").toLowerCase().replace(/\s+/g, "-")
  })
}

export function readDocFileAsMarkdown(fullPath: string): string | null {
  const isYAML = fullPath.endsWith(".yaml") || fullPath.endsWith(".yml")
  const rawFile = fs.readFileSync(fullPath, "utf8")
  const fileContents = isYAML
    ? isApiDocument(rawFile)
      ? renderApiDocToMarkdown(rawFile)
      : yamlToMarkdown(rawFile)
    : rawFile
  return fileContents || null
}

export function getDocMarkdownBySlug(slug: string, isHome = false): string | null {
  const fullPath = resolveDocPath(slug, isHome)
  if (!fullPath) {
    console.warn(`No file found for ${slug}`)
    return null
  }
  try {
    const fileContents = readDocFileAsMarkdown(fullPath)
    if (!fileContents) return null
    return matter(fileContents).content
  } catch (error) {
    console.error(`Error reading markdown for ${slug}:`, error)
    return null
  }
}

function isWithinDirectory(root: string, candidate: string): boolean {
  const relative = path.relative(root, candidate)
  return relative === "" || (
    relative !== ".." &&
    !relative.startsWith(`..${path.sep}`) &&
    !path.isAbsolute(relative)
  )
}

function isSafeContentFile(candidate: string): boolean {
  if (!isWithinDirectory(DOCS_DIRECTORY, candidate) || !fs.existsSync(candidate)) return false

  try {
    const realRoot = fs.realpathSync(DOCS_DIRECTORY)
    const realCandidate = fs.realpathSync(candidate)
    return isWithinDirectory(realRoot, realCandidate) && fs.statSync(realCandidate).isFile()
  } catch {
    return false
  }
}

function isSafeContentDirectory(candidate: string): boolean {
  if (!isWithinDirectory(DOCS_DIRECTORY, candidate) || !fs.existsSync(candidate)) return false

  try {
    const realRoot = fs.realpathSync(DOCS_DIRECTORY)
    const realCandidate = fs.realpathSync(candidate)
    return isWithinDirectory(realRoot, realCandidate) && fs.statSync(realCandidate).isDirectory()
  } catch {
    return false
  }
}

export function resolveDocPath(slug: string, isHome = false): string | null {
  if (
    typeof slug !== "string" ||
    slug.length > 512 ||
    slug.includes("\0") ||
    slug.includes("\\") ||
    path.isAbsolute(slug) ||
    (slug !== "" && slug.split("/").some((part) => part === "." || part === ".." || part === ""))
  ) {
    return null
  }

  let filePath = slug

  if (filePath === "" && !isHome) {
    filePath = "index"
  }

  const filePathParts = filePath.split("/").map((part) => part.replace(/-/g, " "))
  const filePathWithSpaces = filePathParts.join("/")
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

  const found = possiblePaths.find(isSafeContentFile)
  if (found) return found

  const dirPath = path.dirname(filePath)
  const baseName = path.basename(filePath)

  const potentialDir = path.join(DOCS_DIRECTORY, filePath)
  if (isSafeContentDirectory(potentialDir)) {
    const indexFile = findFileInDir(potentialDir, "index")
    if (indexFile && isSafeContentFile(indexFile)) return indexFile
  }

  const parentDir = path.join(DOCS_DIRECTORY, dirPath)
  if (!isSafeContentDirectory(parentDir)) return null

  const fileMatch = findFileInDir(parentDir, baseName)
  return fileMatch && isSafeContentFile(fileMatch) ? fileMatch : null
}
