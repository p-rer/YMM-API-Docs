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

export function resolveDocPath(slug: string, isHome = false): string | null {
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

  const found = possiblePaths.find((p) => fs.existsSync(p))
  if (found) return found

  const dirPath = path.dirname(filePath)
  const baseName = path.basename(filePath)

  const potentialDir = path.join(DOCS_DIRECTORY, filePath)
  if (fs.existsSync(potentialDir) && fs.statSync(potentialDir).isDirectory()) {
    const indexFile = findFileInDir(potentialDir, "index")
    if (indexFile) return indexFile
  }

  const parentDir = path.join(DOCS_DIRECTORY, dirPath)
  const fileMatch = findFileInDir(parentDir, baseName)
  if (fileMatch) return fileMatch

  return null
}