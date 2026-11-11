type JsonBodyResult =
  | { success: true; value: unknown }
  | { success: false; reason: "too-large" | "invalid" }

export async function readJsonBody(
  request: Request,
  maxBytes: number,
): Promise<JsonBodyResult> {
  const contentLength = request.headers.get("content-length")
  if (contentLength !== null) {
    const declaredLength = Number(contentLength)
    if (!Number.isFinite(declaredLength) || declaredLength < 0) {
      return { success: false, reason: "invalid" }
    }
    if (declaredLength > maxBytes) {
      return { success: false, reason: "too-large" }
    }
  }

  if (!request.body) return { success: false, reason: "invalid" }

  const reader = request.body.getReader()
  const chunks: Uint8Array[] = []
  let totalBytes = 0

  try {
    while (true) {
      const { done, value } = await reader.read()
      if (done) break
      if (!value) continue

      totalBytes += value.byteLength
      if (totalBytes > maxBytes) {
        await reader.cancel()
        return { success: false, reason: "too-large" }
      }

      chunks.push(value)
    }
  } catch {
    return { success: false, reason: "invalid" }
  } finally {
    reader.releaseLock()
  }

  const body = new Uint8Array(totalBytes)
  let offset = 0
  for (const chunk of chunks) {
    body.set(chunk, offset)
    offset += chunk.byteLength
  }

  try {
    return {
      success: true,
      value: JSON.parse(new TextDecoder("utf-8", { fatal: true }).decode(body)),
    }
  } catch {
    return { success: false, reason: "invalid" }
  }
}
