import { createElement, Fragment, type ReactNode } from "react"

type HastNode = {
  type: string
  tagName?: string
  value?: string
  properties?: Record<string, unknown>
  children?: HastNode[]
}

const ALLOWED_TAGS = new Set([
  "a", "abbr", "article", "blockquote", "br", "caption", "code", "dd", "del",
  "details", "div", "dl", "dt", "em", "figcaption", "figure", "h1", "h2", "h3",
  "h4", "h5", "h6", "hr", "img", "li", "ol", "p", "pre", "section", "strong",
  "summary", "sup", "sub", "table", "tbody", "td", "th", "thead", "tr", "ul",
  "span", "math", "semantics", "annotation", "annotation-xml",
])

const ALLOWED_PROPERTIES = new Set([
  "align", "alt", "accent", "accentUnder", "ariaAtomic", "ariaBusy", "ariaChecked",
  "ariaControls", "ariaCurrent", "ariaDescribedBy", "ariaDisabled", "ariaExpanded",
  "ariaHidden", "ariaInvalid", "ariaLabel", "ariaLabelledBy", "ariaLevel",
  "ariaLive", "ariaPressed", "ariaSelected", "ariaSort", "ariaValueMax",
  "ariaValueMin", "ariaValueNow", "ariaValueText", "className", "cite", "colSpan",
  "depth", "display", "encoding", "fence", "form", "height", "href", "id",
  "largeOp", "lang", "linethickness", "lspace", "mathBackground", "mathColor",
  "mathVariant", "maxsize", "minsize", "movableLimits", "name", "open", "rel",
  "role", "rowSpan", "rspace", "scope", "separator", "src", "start", "stretchy",
  "style", "summary", "symmetric", "tabIndex", "target", "title", "type", "value",
  "width", "xmlns", "xmlnsXLink",
])

const PROPERTY_NAME_MAP: Record<string, string> = {
  accentUnder: "accentunder",
  ariaAtomic: "aria-atomic",
  ariaBusy: "aria-busy",
  ariaChecked: "aria-checked",
  ariaControls: "aria-controls",
  ariaCurrent: "aria-current",
  ariaDescribedBy: "aria-describedby",
  ariaDisabled: "aria-disabled",
  ariaExpanded: "aria-expanded",
  ariaHidden: "aria-hidden",
  ariaInvalid: "aria-invalid",
  ariaLabel: "aria-label",
  ariaLabelledBy: "aria-labelledby",
  ariaLevel: "aria-level",
  ariaLive: "aria-live",
  ariaPressed: "aria-pressed",
  ariaSelected: "aria-selected",
  ariaSort: "aria-sort",
  ariaValueMax: "aria-valuemax",
  ariaValueMin: "aria-valuemin",
  ariaValueNow: "aria-valuenow",
  ariaValueText: "aria-valuetext",
  largeOp: "largeop",
  mathBackground: "mathbackground",
  mathColor: "mathcolor",
  mathVariant: "mathvariant",
  movableLimits: "movablelimits",
  xmlnsXLink: "xmlns:xlink",
}

function parseStyle(value: unknown): Record<string, string> | undefined {
  if (typeof value !== "string") return undefined

  const style: Record<string, string> = {}
  for (const declaration of value.split(";")) {
    const separator = declaration.indexOf(":")
    if (separator <= 0) continue

    const property = declaration.slice(0, separator).trim()
    const cssValue = declaration.slice(separator + 1).trim()
    if (
      !/^--[a-z\d_-]+$|^[a-z-]+$/i.test(property) ||
      cssValue.length === 0 ||
      cssValue.length > 160 ||
      /url\s*\(|expression\s*\(|@import|javascript:/i.test(cssValue)
    ) {
      continue
    }

    const reactProperty = property.startsWith("--")
      ? property
      : property.replace(/-([a-z])/g, (_, char: string) => char.toUpperCase())
    style[reactProperty] = cssValue
  }

  return Object.keys(style).length > 0 ? style : undefined
}

function isSafeUrl(value: string, kind: "href" | "src"): boolean {
  const url = value.trim()
  if (!url || /^[\u0000-\u0020]*(?:javascript|vbscript|data):/i.test(url)) return false

  const scheme = /^([a-z][a-z\d+.-]*):/i.exec(url)?.[1]?.toLowerCase()
  if (!scheme) return true
  if (kind === "src") return scheme === "http" || scheme === "https"
  return scheme === "http" || scheme === "https" || scheme === "mailto" || scheme === "tel"
}

function toReactProperties(properties: Record<string, unknown> = {}): Record<string, unknown> {
  const result: Record<string, unknown> = {}

  for (const [name, rawValue] of Object.entries(properties)) {
    if (/^on/i.test(name) || !ALLOWED_PROPERTIES.has(name) && !name.startsWith("data")) continue

    if (name === "style") {
      const style = parseStyle(rawValue)
      if (style) result.style = style
      continue
    }

    if (name === "href" || name === "src") {
      if (typeof rawValue !== "string" || !isSafeUrl(rawValue, name)) continue
      result[name] = name === "href" && rawValue.startsWith("#")
        ? `#doc-${rawValue.slice(1)}`
        : rawValue
      continue
    }

    if (name === "id") {
      if (typeof rawValue === "string") result.id = `doc-${rawValue}`
      continue
    }

    if (name === "className") {
      result.className = Array.isArray(rawValue) ? rawValue.join(" ") : rawValue
      continue
    }

    if (name === "rel" || name.startsWith("aria") || name.startsWith("data")) {
      result[PROPERTY_NAME_MAP[name] ?? name] = Array.isArray(rawValue)
        ? rawValue.join(" ")
        : rawValue === true && name.startsWith("data")
          ? ""
          : rawValue
      continue
    }

    result[PROPERTY_NAME_MAP[name] ?? name] = rawValue
  }

  return result
}

function renderNode(node: HastNode, key?: number): ReactNode {
  if (node.type === "text") return node.value ?? ""
  if (node.type === "root") {
    return createElement(
      Fragment,
      null,
      ...(node.children ?? []).map((child, index) => renderNode(child, index)),
    )
  }

  if (node.type !== "element" || !node.tagName) return null

  const tagName = node.tagName.toLowerCase()
  if (!ALLOWED_TAGS.has(tagName) && !/^m[a-z]+$/i.test(tagName)) {
    return (node.children ?? []).map((child, index) => renderNode(child, index))
  }

  const properties = toReactProperties(node.properties)
  if (key !== undefined) properties.key = key

  return createElement(
    tagName,
    properties,
    ...(node.children ?? []).map((child, index) => renderNode(child, index)),
  )
}

export function hastToReact(tree: unknown): ReactNode {
  return renderNode(tree as HastNode)
}
