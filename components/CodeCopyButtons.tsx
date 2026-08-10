"use client"

import { Check, Copy, ChevronDown, ChevronUp } from "lucide-react"
import { useEffect, useState } from "react"
import { createPortal } from "react-dom"
import { usePathname } from "next/navigation"

type Target = {
  id: string
  element: HTMLElement
  pre: HTMLElement
  wrapper: HTMLElement
  language: string
  isCollapsed: boolean
  lineCount: number
}

function normalizeLanguage(value: string) {
  return value.replace(/[_-]+/g, " ").trim()
}

function resolveLanguage(preElement: HTMLElement) {
  const code = preElement.querySelector("code")
  const candidates = [
    preElement.dataset.language,
    preElement.dataset.lang,
    code?.getAttribute("data-language") || undefined,
    code?.getAttribute("data-lang") || undefined,
    preElement.className.match(/language-([\w-]+)/)?.[1],
    code?.className.match(/language-([\w-]+)/)?.[1],
  ]

  for (const candidate of candidates) {
    if (candidate && candidate.trim()) return normalizeLanguage(candidate)
  }

  return "text"
}

export function CodeCopyButtons() {
  const pathname = usePathname()
  const [targets, setTargets] = useState<Target[]>([])
  const [copiedId, setCopiedId] = useState<string | null>(null)

  useEffect(() => {
    const existingWrappers = Array.from(document.querySelectorAll("[data-code-copy-wrapper='true']")) as HTMLElement[]
    for (const wrapper of existingWrappers) {
      const pre = wrapper.querySelector("pre")
      if (pre) wrapper.replaceWith(pre)
      else wrapper.remove()
    }

    const preElements = Array.from(document.querySelectorAll(".prose pre")) as HTMLElement[]
    const mapped: Target[] = []

    for (const [index, preElement] of preElements.entries()) {
      const parent = preElement.parentElement
      if (!parent) continue

      const wrapper = document.createElement("div")
      wrapper.dataset.codeCopyWrapper = "true"
      wrapper.dataset.codeCopyId = `code-copy-${index}`
      wrapper.className = "relative"

      parent.insertBefore(wrapper, preElement)
      wrapper.append(preElement)

      const host = document.createElement("div")
      host.dataset.codeCopyHost = "true"
      host.className = "code-copy-header"
      wrapper.prepend(host)

      const language = resolveLanguage(preElement)
      
      // 行数を計算
      const code = preElement.querySelector("code")
      const text = code?.textContent || preElement.textContent || ""
      const lineCount = text.split('\n').length

      // 行番号を追加
      const linesContainer = document.createElement("div")
      linesContainer.className = "code-line-numbers"
      linesContainer.dataset.codeLineNumbers = "true"
      
      // pre要素の実際のline-heightを取得
      const computedStyle = window.getComputedStyle(preElement)
      const actualLineHeight = parseFloat(computedStyle.lineHeight) || 1.5
      const actualFontSize = parseFloat(computedStyle.fontSize) || 14
      
      linesContainer.style.cssText = `
        position: absolute;
        left: 0;
        top: 40px;
        bottom: 0;
        width: 40px;
        background: #0b0f17;
        border-right: 1px solid #2a3140;
        padding: 10px 0;
        text-align: right;
        padding-right: 8px;
        font-family: monospace;
        font-size: ${actualFontSize * 0.85}px;
        color: #6b7280;
        line-height: ${actualLineHeight}px;
        user-select: none;
        overflow: hidden;
        pointer-events: none;
        z-index: 10;
      `
      
      const lines = text.split('\n')
      lines.forEach((_, i) => {
        const lineNum = document.createElement("div")
        lineNum.textContent = (i + 1).toString()
        lineNum.style.cssText = `height: ${actualLineHeight}px; line-height: ${actualLineHeight}px;`
        linesContainer.appendChild(lineNum)
      })
      
      wrapper.prepend(linesContainer)
      
      // pre要素をラップしてスクロールバーの位置を調整
      const preWrapper = document.createElement("div")
      preWrapper.style.cssText = `
        margin-left: 40px;
        position: relative;
      `
      
      // pre要素をwrapperから削除してpreWrapperに追加
      wrapper.removeChild(preElement)
      preWrapper.appendChild(preElement)
      wrapper.appendChild(preWrapper)
      
      // pre要素にパディングを追加して行番号と重ならないように
      preElement.style.paddingLeft = "10px"
      
      // 高さを設定する関数
      const setHeights = () => {
        const preWrapperHeight = preWrapper.offsetHeight
        wrapper.style.height = (preWrapperHeight + 40) + "px"
        
        // 行番号コンテナの高さもpreWrapperの高さに合わせる
        linesContainer.style.height = preWrapperHeight + "px"
      }
      
      // 即時実行 + 遅延実行で確実に高さを設定
      setHeights()
      setTimeout(setHeights, 0)
      setTimeout(setHeights, 100)

      mapped.push({ id: `code-copy-${index}`, element: host, pre: preElement, wrapper, language, isCollapsed: false, lineCount })
    }

    setTargets(mapped)

    return () => {
      for (const target of mapped) {
        // pre要素のパディングをリセット
        target.pre.style.paddingLeft = ""
        if (target.wrapper.parentElement) {
          target.wrapper.replaceWith(target.pre)
        }
      }
    }
  }, [pathname])

  async function handleCopy(target: Target) {
    const code = target.pre.querySelector("code")
    const text = code?.textContent || target.pre.textContent || ""
    if (!text) return
    await navigator.clipboard.writeText(text)
    setCopiedId(target.id)
    setTimeout(() => setCopiedId((prev) => (prev === target.id ? null : prev)), 1200)
  }

  function handleToggleCollapse(target: Target) {
    setTargets((prev) =>
      prev.map((t) => {
        if (t.id === target.id) {
          const newCollapsedState = !t.isCollapsed
          t.pre.style.display = newCollapsedState ? "none" : ""
          
          // 行番号コンテナも表示/非表示
          const lineNumbers = t.wrapper.querySelector('[data-code-line-numbers="true"]')
          if (lineNumbers) {
            (lineNumbers as HTMLElement).style.display = newCollapsedState ? "none" : ""
          }
          
          // 折りたたみ時にwrapperの高さも調整
          if (newCollapsedState) {
            t.wrapper.style.height = "40px" // ヘッダーの高さのみ
          } else {
            t.wrapper.style.height = (t.pre.offsetHeight + 40) + "px"
          }
          
          return { ...t, isCollapsed: newCollapsedState }
        }
        return t
      })
    )
  }

  return (
    <>
      {targets.map((target) =>
        createPortal(
          <div key={target.id} className="flex h-10 items-center justify-between border-b border-[#2a3140] bg-[#0b0f17] px-3 text-sm text-[#e5e7eb]">
            <div className="flex items-center gap-2">
              <button
                type="button"
                onClick={() => handleToggleCollapse(target)}
                className="pointer-events-auto inline-flex h-6 w-6 items-center justify-center bg-transparent text-[#e5e7eb] hover:text-white transition-colors"
                aria-label={target.isCollapsed ? "Expand code" : "Collapse code"}
              >
                {target.isCollapsed ? <ChevronDown className="h-4 w-4" /> : <ChevronUp className="h-4 w-4" />}
              </button>
              <span className="font-mono text-xs uppercase tracking-wide">{target.language}</span>
            </div>
            <button
              type="button"
              onClick={() => void handleCopy(target)}
              className="pointer-events-auto inline-flex h-7 w-7 items-center justify-center bg-transparent text-[#e5e7eb]"
              aria-label="Copy code"
            >
              {copiedId === target.id ? <Check className="h-4 w-4" /> : <Copy className="h-4 w-4" />}
            </button>
          </div>,
          target.element,
        ),
      )}
    </>
  )
}
