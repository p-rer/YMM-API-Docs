import yaml from "js-yaml"

/**
 * ドキュメントタイプの列挙
 */
type DocumentType =
    | "class"
    | "constructor"
    | "method"
    | "property"
    | "field"
    | "interface"
    | "enum"
    | "delegate"

/**
 * 基本情報（全タイプ共通）
 */
interface BaseInfo {
    type: DocumentType
    title: string
    description?: string
    namespace: string
    namespaceUrl?: string
    assembly: string
    summary: string
}

/**
 * クラスドキュメント
 */
interface ClassDocument extends BaseInfo {
    type: "class"
    code: string
    inheritance?: string[]
    implements?: string[]
    constructors?: Array<{ name: string; description: string }>
    properties?: Array<{ name: string; description: string }>
    fields?: Array<{ name: string; description: string }>
    methods?: Array<{ name: string; description: string }>
    interfaces?: Array<{ name: string; description: string }>
}

/**
 * コンストラクタードキュメント
 */
interface ConstructorDocument extends BaseInfo {
    type: "constructor"
    overloads?: Array<{
        code: string
        typeParameters?: Array<{ name: string; description: string }>
        parameters?: Array<{
            name: string
            type: string
            description: string
            attributes?: string[]
        }>
        remarks?: string
        example?: string
    }>
}

/**
 * メソッドドキュメント
 */
interface MethodDocument extends BaseInfo {
    type: "method"
    overloads: Array<{
        name: string
        description: string
        code: string
        typeParameters?: Array<{ name: string; description: string }>
        parameters?: Array<{
            name: string
            type: string
            description: string
            attributes?: string[]
        }>
        returns?: {
            type: string
            description: string
        }
        remarks?: string
        example?: string
    }>
}

/**
 * プロパティドキュメント
 */
interface PropertyDocument extends BaseInfo {
    type: "property"
    code: string
    propertyType: string
    remarks?: string
    example?: string
}

/**
 * フィールドドキュメント
 */
interface FieldDocument extends BaseInfo {
    type: "field"
    code: string
    fieldType: string
    remarks?: string
    example?: string
}

/**
 * 統合ドキュメント型
 */
type YAMLDocument =
    | ClassDocument
    | ConstructorDocument
    | MethodDocument
    | PropertyDocument
    | FieldDocument

/**
 * YAMLからMarkdownを生成
 */
export function yamlToMarkdown(yamlContent: string): string {
    try {
        const data = yaml.load(yamlContent) as YAMLDocument

        // ドキュメントタイプによって処理を分岐
        switch (data.type) {
            case "class":
                return generateClassMarkdown(data as ClassDocument)
            case "constructor":
                return generateConstructorMarkdown(data as ConstructorDocument)
            case "method":
                return generateMethodMarkdown(data as MethodDocument)
            case "property":
                return generatePropertyMarkdown(data as PropertyDocument)
            case "field":
                return generateFieldMarkdown(data as FieldDocument)
            default:
                throw new Error(`Unknown document type: ${(data as any).type}`)
        }
    } catch (error) {
        console.error("Error parsing YAML:", error)
    }
}

/**
 * 共通ヘッダー生成
 */
function generateCommonHeader(data: BaseInfo): string {
    let markdown = ""

    // タイトル
    markdown += `# ${data.title}\n\n`

    // 定義セクション
    markdown += `## 定義\n\n`
    const namespaceUrl = data.namespaceUrl || ".."
    markdown += `名前空間: [${data.namespace}](${namespaceUrl})\n\n`
    markdown += `アセンブリ: ${data.assembly}\n\n`
    markdown += `<br/>\n\n`

    // サマリー
    markdown += `${data.summary}\n\n`

    return markdown
}

/**
 * クラスドキュメント生成
 */
function generateClassMarkdown(data: ClassDocument): string {
    let markdown = generateCommonHeader(data)

    // クラス定義コード
    markdown += "```csharp\n"
    markdown += data.code
    markdown += "\n```\n\n"

    // 継承情報
    if (data.inheritance && data.inheritance.length > 0) {
        markdown += `継承 ${data.inheritance.join(" → ")}\n\n`
    }

    // 実装情報
    if (data.implements && data.implements.length > 0) {
        markdown += `実装 ${data.implements.join(", ")}\n\n`
    }

    // コンストラクター
    if (data.constructors && data.constructors.length > 0) {
        markdown += `## コンストラクター\n\n`
        markdown += generateTable(["名前", "説明"], data.constructors)
    }

    // プロパティー
    if (data.properties && data.properties.length > 0) {
        markdown += `## プロパティー\n\n`
        markdown += generateTable(["名前", "説明"], data.properties)
    }

    // フィールド
    if (data.fields && data.fields.length > 0) {
        markdown += `## フィールド\n\n`
        markdown += generateTable(["名前", "説明"], data.fields)
    }

    // メソッド
    if (data.methods && data.methods.length > 0) {
        markdown += `## メソッド\n\n`
        markdown += generateTable(["名前", "説明"], data.methods)
    }

    // インターフェイス実装
    if (data.interfaces && data.interfaces.length > 0) {
        markdown += `## 明示的なインターフェイスの実装\n`
        markdown += generateTable(["名前", "説明"], data.interfaces)
    }

    return markdown.trim()
}

/**
 * コンストラクタードキュメント生成
 */
function generateConstructorMarkdown(data: ConstructorDocument): string {
    let markdown = generateCommonHeader(data)

    // オーバーロードがない場合（単一コンストラクター）
    if (!data.overloads || data.overloads.length === 0) {
        return markdown.trim()
    }

    // オーバーロードがある場合
    if (data.overloads.length > 1) {
        markdown += `## オーバーロード\n\n`
        const overloadList = data.overloads.map(o => ({
            name: extractMethodName(o.code),
            description: ""
        }))
        markdown += generateTable(["名前", "説明"], overloadList)
    }

    // 各オーバーロードの詳細
    for (const overload of data.overloads) {
        if (data.overloads.length > 1) {
            const methodName = extractMethodName(overload.code)
            markdown += `## ${methodName}\n\n`
        }

        // コード
        markdown += "```csharp\n"
        markdown += overload.code
        markdown += "\n```\n\n"

        // 型パラメーター
        if (overload.typeParameters && overload.typeParameters.length > 0) {
            markdown += generateTypeParameters(overload.typeParameters)
        }

        // パラメーター
        if (overload.parameters && overload.parameters.length > 0) {
            markdown += generateParameters(overload.parameters)
        }

        // 例
        if (overload.example) {
            markdown += `## 例\n\n${overload.example}\n\n`
        }

        // 注釈
        if (overload.remarks) {
            markdown += `## 注釈\n\n${overload.remarks}\n\n`
        }
    }

    return markdown.trim()
}

/**
 * メソッドドキュメント生成
 */
function generateMethodMarkdown(data: MethodDocument): string {
    let markdown = generateCommonHeader(data)

    // オーバーロード一覧
    if (data.overloads.length > 1) {
        markdown += `## オーバーロード\n\n`
        markdown += generateTable(["名前", "説明"], data.overloads)
    }

    // 各オーバーロードの詳細
    for (const overload of data.overloads) {
        if (data.overloads.length > 1) {
            markdown += `## ${overload.name}\n\n`
            markdown += `${overload.description}\n\n`
        }

        // コード
        markdown += "```csharp\n"
        markdown += overload.code
        markdown += "\n```\n\n"

        // 型パラメーター
        if (overload.typeParameters && overload.typeParameters.length > 0) {
            markdown += generateTypeParameters(overload.typeParameters)
        }

        // パラメーター
        if (overload.parameters && overload.parameters.length > 0) {
            markdown += generateParameters(overload.parameters)
        }

        // 戻り値
        if (overload.returns) {
            markdown += `#### 戻り値\n\n`
            markdown += `${overload.returns.type}\n\n`
            markdown += `${overload.returns.description}\n\n`
        }

        // 例
        if (overload.example) {
            markdown += `## 例\n\n${overload.example}\n\n`
        }

        // 注釈
        if (overload.remarks) {
            markdown += `## 注釈\n\n${overload.remarks}\n\n`
        }
    }

    return markdown.trim()
}

/**
 * プロパティドキュメント生成
 */
function generatePropertyMarkdown(data: PropertyDocument): string {
    let markdown = generateCommonHeader(data)

    // プロパティ定義コード
    markdown += "```csharp\n"
    markdown += data.code
    markdown += "\n```\n\n"

    // 型
    markdown += `#### 型\n\n`
    markdown += `${data.propertyType}\n\n`

    // 例
    if (data.example) {
        markdown += `## 例\n\n${data.example}\n\n`
    }

    // 注釈
    if (data.remarks) {
        markdown += `## 注釈\n\n${data.remarks}\n\n`
    }

    return markdown.trim()
}

/**
 * フィールドドキュメント生成
 */
function generateFieldMarkdown(data: FieldDocument): string {
    let markdown = generateCommonHeader(data)

    // フィールド定義コード
    markdown += "```csharp\n"
    markdown += data.code
    markdown += "\n```\n\n"

    // 型
    markdown += `#### 型\n\n`
    markdown += `${data.fieldType}\n\n`

    // 例
    if (data.example) {
        markdown += `## 例\n\n${data.example}\n\n`
    }

    // 注釈
    if (data.remarks) {
        markdown += `## 注釈\n\n${data.remarks}\n\n`
    }

    return markdown.trim()
}

/**
 * テーブル生成ヘルパー
 */
function generateTable(headers: string[], items: Array<{ name: string; description: string }>): string {
    let markdown = `| ${headers.join(" | ")} |\n`
    markdown += `| ${headers.map(() => "---").join(" | ")} |\n`
    for (const item of items) {
        markdown += `| ${item.name} | ${item.description} |\n`
    }
    markdown += `\n`
    return markdown
}

/**
 * 型パラメーター生成ヘルパー
 */
function generateTypeParameters(typeParams: Array<{ name: string; description: string }>): string {
    let markdown = `#### 型パラメーター\n\n`
    for (const typeParam of typeParams) {
        markdown += `\`${typeParam.name}\`\n\n`
        markdown += `${typeParam.description}\n\n`
    }
    return markdown
}

/**
 * パラメーター生成ヘルパー
 */
function generateParameters(params: Array<{
    name: string
    type: string
    description: string
    attributes?: string[]
}>): string {
    let markdown = `#### パラメーター\n\n`
    for (const param of params) {
        markdown += `\`${param.name}\` ${param.type}\n\n`
        markdown += `${param.description}\n\n`

        if (param.attributes && param.attributes.length > 0) {
            for (const attr of param.attributes) {
                markdown += `属性 ${attr}\n\n`
            }
        }

        markdown += `<br/>\n\n`
    }
    return markdown
}

/**
 * コードからメソッド名を抽出
 */
function extractMethodName(code: string): string {
    const match = code.match(/\s+(\w+(?:<[^>]+>)?)\s*\(/)
    return match ? match[1] : "Unknown"
}
