import { execFileSync } from "child_process"
import path from "path"
import { AUTHOR_GITHUB_MAP } from "./author-github-map"
import { GITHUB_REPO_BRANCH, GITHUB_REPO_NAME, GITHUB_REPO_USERNAME } from "./siteSetting"

export interface DocPerson {
  name: string
  github: string | null
}

export interface DocContributors {
  authors: DocPerson[]
  editors: DocPerson[]
  contributors: DocPerson[]
}

interface Identity {
  sha: string
  name: string
  email: string
  login: string | null
}

const GITHUB_LOGIN_RE = /^[a-z\d](?:[a-z\d]|-(?=[a-z\d])){0,38}$/i
const NOREPLY_RE = /^(?:(\d+)\+)?([^@+]+)@users\.noreply\.github\.com$/i
const GITHUB_API = "https://api.github.com"

function normalizeLogin(value: string): string | null {
  const login = value.trim().replace(/^@/, "")
  return GITHUB_LOGIN_RE.test(login) ? login : null
}

function isBot(id: Identity): boolean {
  return (
    /\[bot\]$/i.test(id.name) ||
    /\[bot\]@users\.noreply\.github\.com$/i.test(id.email) ||
    id.email.toLowerCase() === "noreply@github.com"
  )
}

// 対応表
let authorMap: Map<string, string> | null = null

function resolveMappedLogin(name: string, email: string): string | null {
  if (!authorMap) {
    authorMap = new Map()
    for (const [key, value] of Object.entries(AUTHOR_GITHUB_MAP)) {
      const login = normalizeLogin(value)
      if (login) authorMap.set(key.trim().toLowerCase(), login)
    }
  }
  return (email && authorMap.get(email.toLowerCase())) || authorMap.get(name.toLowerCase()) || null
}

// Git
function runGit(args: string[]): string {
  return execFileSync("git", args, {
    cwd: process.cwd(),
    encoding: "utf8",
    stdio: ["ignore", "pipe", "ignore"],
    maxBuffer: 16 * 1024 * 1024,
  })
}

let gitUsable: boolean | null = null

function isGitHistoryUsable(): boolean {
  if (gitUsable === null) {
    try {
      gitUsable = runGit(["rev-parse", "--is-shallow-repository"]).trim() === "false"
    } catch {
      gitUsable = false
    }
  }
  return gitUsable
}

function readGitIdentities(fullPath: string): Identity[] | null {
  if (!isGitHistoryUsable()) return null
  try {
    const out = runGit(["log", "--follow", "--format=%H%x1f%aN%x1f%aE", "--", fullPath])
    return out
      .split(/\r?\n/)
      .filter(Boolean)
      .map((line) => {
        const [sha, name, email] = line.split("\x1f")
        return { sha, name: name ?? "", email: email ?? "", login: null }
      })
  } catch {
    return null
  }
}

// ── GitHub API
let apiDisabled = false

async function githubApi<T>(pathAndQuery: string): Promise<T | null> {
  if (apiDisabled) return null
  try {
    const headers: Record<string, string> = {
      Accept: "application/vnd.github+json",
      "User-Agent": `${GITHUB_REPO_NAME}-docs`,
    }
    if (process.env.GITHUB_TOKEN) headers.Authorization = `Bearer ${process.env.GITHUB_TOKEN}`

    const res = await fetch(`${GITHUB_API}${pathAndQuery}`, {
      headers,
      signal: AbortSignal.timeout(8000),
    })
    if (res.status === 401 || res.status === 403 || res.status === 429) {
      apiDisabled = true
      return null
    }
    return res.ok ? ((await res.json()) as T) : null
  } catch {
    apiDisabled = true
    return null
  }
}

const REPO_API = `/repos/${GITHUB_REPO_USERNAME}/${GITHUB_REPO_NAME}`
const loginByEmail = new Map<string, Promise<string | null>>()

function lookupLoginByCommit(email: string, sha: string): Promise<string | null> {
  const key = email.toLowerCase()
  let result = loginByEmail.get(key)
  if (!result) {
    result = githubApi<{ author: { login: string } | null }>(`${REPO_API}/commits/${sha}`).then((commit) =>
      commit?.author?.login ? normalizeLogin(commit.author.login) : null,
    )
    loginByEmail.set(key, result)
  }
  return result
}

// リポジトリのコントリビューター一覧
let contributorLoginsById: Promise<Map<number, string>> | null = null

function getContributorLoginsById(): Promise<Map<number, string>> {
  if (!contributorLoginsById) {
    contributorLoginsById = (async () => {
      const logins = new Map<number, string>()
      // 先頭 500 メールアドレス分までしかアカウントに紐付かない仕様なので 5 ページで足りる
      for (let page = 1; page <= 5; page++) {
        const list = await githubApi<{ id?: number; login?: string; type?: string }[]>(
          `${REPO_API}/contributors?per_page=100&page=${page}`,
        )
        if (!list) break
        for (const c of list) {
          const login = c.login ? normalizeLogin(c.login) : null
          if (c.type === "User" && login && typeof c.id === "number") logins.set(c.id, login)
        }
        if (list.length < 100) break
      }
      return logins
    })()
  }
  return contributorLoginsById
}

async function resolveNoreplyLogin(email: string): Promise<string | null> {
  const match = NOREPLY_RE.exec(email)
  if (!match) return null
  if (match[1]) {
    const current = (await getContributorLoginsById()).get(Number(match[1]))
    if (current) return current
  }
  return normalizeLogin(match[2])
}

async function fetchApiIdentities(fullPath: string): Promise<Identity[]> {
  const relativePath = path.relative(process.cwd(), fullPath).split(path.sep).join("/")
  const query = new URLSearchParams({ sha: GITHUB_REPO_BRANCH, path: relativePath, per_page: "100" })
  const commits = await githubApi<
    {
      sha: string
      author: { login: string } | null
      commit: { author: { name: string; email: string } | null }
    }[]
  >(`${REPO_API}/commits?${query}`)
  if (!commits) return []
  return commits.map((c) => ({
    sha: c.sha,
    name: c.commit.author?.name ?? c.author?.login ?? "",
    email: c.commit.author?.email ?? "",
    login: c.author?.login ? normalizeLogin(c.author.login) : null,
  }))
}

// ファイルに関わった全ユーザー
async function loadGitPeople(fullPath: string): Promise<DocPerson[]> {
  const fromGit = readGitIdentities(fullPath)
  const identities = fromGit ?? (await fetchApiIdentities(fullPath))

  // 古い順/各コミット者の GitHub ユーザー名を解決
  const entries: { name: string; email: string; login: string | null }[] = []
  for (const id of [...identities].reverse()) {
    if (!id.name || isBot(id)) continue
    let login = id.login ?? resolveMappedLogin(id.name, id.email) ?? (await resolveNoreplyLogin(id.email))
    if (!login && fromGit && id.email) login = await lookupLoginByCommit(id.email, id.sha)
    entries.push({ name: id.name, email: id.email, login })
  }

  const parent = entries.map((_, i) => i)
  const find = (i: number): number => (parent[i] === i ? i : (parent[i] = find(parent[i])))
  const firstByKey = new Map<string, number>()
  entries.forEach((entry, i) => {
    const keys = [
      entry.email && `email:${entry.email.toLowerCase()}`,
      entry.login && `gh:${entry.login.toLowerCase()}`,
    ]
    for (const key of keys) {
      if (!key) continue
      const first = firstByKey.get(key)
      if (first === undefined) {
        firstByKey.set(key, i)
      } else {
        const a = find(first)
        const b = find(i)
        if (a !== b) parent[Math.max(a, b)] = Math.min(a, b)
      }
    }
  })

  const people = new Map<number, DocPerson>()
  entries.forEach((entry, i) => {
    const root = find(i)
    const person = people.get(root) ?? { name: entry.name, github: null }
    if (!person.github && entry.login) person.github = entry.login
    people.set(root, person)
  })
  return [...people.values()]
}

const gitPeopleCache = new Map<string, Promise<DocPerson[]>>()

function getGitPeople(fullPath: string): Promise<DocPerson[]> {
  let people = gitPeopleCache.get(fullPath)
  if (!people) {
    people = loadGitPeople(fullPath).catch((error) => {
      console.warn(`Could not resolve contributors for ${fullPath}:`, error)
      return []
    })
    gitPeopleCache.set(fullPath, people)
  }
  return people
}

// フロントマター
function parseFrontmatterPeople(value: unknown): DocPerson[] {
  const items = Array.isArray(value) ? value : value == null ? [] : [value]
  const people: DocPerson[] = []

  for (const item of items) {
    if (typeof item === "string") {
      const login = normalizeLogin(item)
      if (login) {
        people.push({ name: login, github: login })
      } else if (item.trim()) {
        people.push({ name: item.trim(), github: resolveMappedLogin(item.trim(), "") })
      }
    } else if (item && typeof item === "object") {
      const { name, github } = item as { name?: unknown; github?: unknown }
      const login = typeof github === "string" ? normalizeLogin(github) : null
      const displayName = typeof name === "string" && name.trim() ? name.trim() : login
      if (!displayName) continue
      people.push({ name: displayName, github: login ?? resolveMappedLogin(displayName, "") })
    }
  }
  return people
}

export async function resolveDocContributors(
  fullPath: string,
  frontmatter: Record<string, unknown>,
): Promise<DocContributors | null> {
  try {
    if (frontmatter.ignoreMetadata === true) return null

    const authors = parseFrontmatterPeople(frontmatter.authors)
    const editors = parseFrontmatterPeople(frontmatter.editors)
    if (authors.length > 0 || editors.length > 0) {
      return { authors, editors, contributors: [] }
    }

    const contributors = await getGitPeople(fullPath)
    return contributors.length > 0 ? { authors: [], editors: [], contributors } : null
  } catch (error) {
    console.warn(`Could not resolve contributors for ${fullPath}:`, error)
    return null
  }
}
