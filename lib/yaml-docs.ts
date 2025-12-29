import fs from "fs"
import yaml from "js-yaml"

/**
 * パラメーター/プロパティーの詳細定義
 */
interface ParameterDetail {
    name: string
    type: string
    description: string
    attributes?: string[]
}

/**
 * オーバーロード定義
 */
interface OverloadDefinition {
    name: string
    description: string
    signature?: string
    typeParameters?: Array<{
        name: string
        description: string
    }>
    parameters?: ParameterDetail[]
    returns?: {
        type: string
        description: string
    }
}

/**
 * YAML構造の型定義
 */
interface YAMLDocument {
    title?: string
    description?: string
    namespace?: string
    namespaceUrl?: string  // 名前空間へのリンクURL
    assembly?: string
    type?: string
    summary?: string

    // 基本的なリスト形式
    constructors?: Array<{
        name: string
        description: string
        signature?: string
    }>
    properties?: Array<{
        name: string
        description: string
    }>
    methods?: Array<{
        name: string
        description: string
    }>
    interfaces?: Array<{
        name: string
        description: string
    }>

    // 継承・実装
    inheritance?: string[]
    implements?: string[]

    // オーバーロード対応
    overloads?: Array<OverloadDefinition>

    // カスタムセクション
    sections?: Array<{
        heading: string
        level: number
        id?: string  // アンカーリンク用ID
        content?: string
        table?: {
            headers: string[]
            rows: Array<string[]>
        }
        code?: {
            language: string
            content: string
        }
        list?: Array<{
            title?: string
            items: string[]
        }>
        parameters?: ParameterDetail[]  // パラメーター詳細リスト
        typeParameters?: Array<{  // 型パラメーター
            name: string
            description: string
        }>
        returns?: {  // 戻り値
            type: string
            description: string
        }
    }>
}

/**
 * YAMLからMarkdownを生成
 */
export function yamlToMarkdown(yamlContent: string): string {
    try {
        const data = yaml.load(yamlContent) as YAMLDocument
        let markdown = ""

        // タイトル
        if (data.title) {
            markdown += `# ${data.title}\n\n`
        }

        // 定義セクション
        if (data.namespace || data.assembly) {
            markdown += `## 定義\n\n`
            if (data.namespace) {
                const namespaceUrl = data.namespaceUrl || ".."
                markdown += `名前空間: [${data.namespace}](${namespaceUrl})\n\n`
            }
            if (data.assembly) {
                markdown += `アセンブリ: ${data.assembly}\n\n`
            }
            markdown += `<br/>\n\n`
        }

        // サマリー
        if (data.summary) {
            markdown += `${data.summary}\n\n`
        }

        // 型定義コード
        if (data.type) {
            markdown += "```csharp\n"
            markdown += data.type
            markdown += "\n```\n\n"
        }

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
            markdown += `| 名前 | 説明 |\n`
            markdown += `| --- | --- |\n`
            for (const constructor of data.constructors) {
                markdown += `| ${constructor.name} | ${constructor.description} |\n`
            }
            markdown += `\n`
        }

        // プロパティー
        if (data.properties && data.properties.length > 0) {
            markdown += `## プロパティー\n\n`
            markdown += `| 名前 | 説明 |\n`
            markdown += `| --- | --- |\n`
            for (const property of data.properties) {
                markdown += `| ${property.name} | ${property.description} |\n`
            }
            markdown += `\n`
        }

        // メソッド
        if (data.methods && data.methods.length > 0) {
            markdown += `## メソッド\n\n`
            markdown += `| 名前 | 説明 |\n`
            markdown += `| --- | --- |\n`
            for (const method of data.methods) {
                markdown += `| ${method.name} | ${method.description} |\n`
            }
            markdown += `\n`
        }

        // オーバーロード
        if (data.overloads && data.overloads.length > 0) {
            markdown += `## オーバーロード\n\n`
            markdown += `| 名前 | 説明 |\n`
            markdown += `| --- | --- |\n`
            for (const overload of data.overloads) {
                markdown += `| ${overload.name} | ${overload.description} |\n`
            }
            markdown += `\n`

            // 各オーバーロードの詳細
            for (const overload of data.overloads) {

                // シグネチャ
                if (overload.signature) {
                    markdown += "```csharp\n"
                    markdown += overload.signature
                    markdown += "\n```\n\n"
                }

                // 型パラメーター
                if (overload.typeParameters && overload.typeParameters.length > 0) {
                    markdown += `#### 型パラメーター\n\n`
                    for (const typeParam of overload.typeParameters) {
                        markdown += `\`${typeParam.name}\`\n\n`
                        markdown += `${typeParam.description}\n\n`
                    }
                }

                // パラメーター
                if (overload.parameters && overload.parameters.length > 0) {
                    markdown += `#### パラメーター\n\n`
                    for (const param of overload.parameters) {
                        markdown += `\`${param.name}\` ${param.type}\n\n`
                        markdown += `${param.description}\n\n`

                        // 属性情報
                        if (param.attributes && param.attributes.length > 0) {
                            for (const attr of param.attributes) {
                                markdown += `属性 ${attr}\n\n`
                            }
                        }

                        markdown += `<br/>\n\n`
                    }
                }

                // 戻り値
                if (overload.returns) {
                    markdown += `#### 戻り値\n\n`
                    markdown += `${overload.returns.type}\n\n`
                    markdown += `${overload.returns.description}\n\n`
                }
            }
        }

        // インターフェイスの実装
        if (data.interfaces && data.interfaces.length > 0) {
            markdown += `## 明示的なインターフェイスの実装\n`
            markdown += `| 名前 | 説明 |\n`
            markdown += `| --- | --- |\n`
            for (const iface of data.interfaces) {
                markdown += `| ${iface.name} | ${iface.description} |\n`
            }
            markdown += `\n`
        }

        // カスタムセクション
        if (data.sections) {
            for (const section of data.sections) {
                // 見出し
                const headingPrefix = "#".repeat(section.level || 2)
                markdown += `${headingPrefix} ${section.heading}\n\n`

                // コンテンツ
                if (section.content) {
                    markdown += `${section.content}\n\n`
                }

                // テーブル
                if (section.table) {
                    markdown += `| ${section.table.headers.join(" | ")} |\n`
                    markdown += `| ${section.table.headers.map(() => "---").join(" | ")} |\n`
                    for (const row of section.table.rows) {
                        markdown += `| ${row.join(" | ")} |\n`
                    }
                    markdown += `\n`
                }

                // コード
                if (section.code) {
                    markdown += `\`\`\`${section.code.language}\n`
                    markdown += section.code.content
                    markdown += `\n\`\`\`\n\n`
                }

                // 型パラメーター
                if (section.typeParameters && section.typeParameters.length > 0) {
                    markdown += `#### 型パラメーター\n\n`
                    for (const typeParam of section.typeParameters) {
                        markdown += `\`${typeParam.name}\`\n\n`
                        markdown += `${typeParam.description}\n\n`
                    }
                }

                // パラメーター詳細
                if (section.parameters && section.parameters.length > 0) {
                    markdown += `#### パラメーター\n\n`
                    for (const param of section.parameters) {
                        markdown += `\`${param.name}\` ${param.type}\n\n`
                        markdown += `${param.description}\n\n`

                        // 属性情報
                        if (param.attributes && param.attributes.length > 0) {
                            for (const attr of param.attributes) {
                                markdown += `属性 ${attr}\n\n`
                            }
                        }

                        markdown += `<br/>\n\n`
                    }
                }

                // リスト
                if (section.list) {
                    for (const listGroup of section.list) {
                        if (listGroup.title) {
                            markdown += `**${listGroup.title}**\n\n`
                        }
                        for (const item of listGroup.items) {
                            markdown += `- ${item}\n`
                        }
                        markdown += `\n`
                    }
                }

                // 戻り値
                if (section.returns) {
                    markdown += `#### 戻り値\n\n`
                    markdown += `${section.returns.type}\n\n`
                    markdown += `${section.returns.description}\n\n`
                }
            }
        }

        return markdown.trim()
    } catch (error) {
        console.error("Error parsing YAML:", error)
        throw error
    }
}

/**
 * YAMLファイルが存在するかチェック
 */
export function hasYAMLFile(basePath: string): boolean {
    return fs.existsSync(`${basePath}.yaml`) || fs.existsSync(`${basePath}.yml`)
}

/**
 * YAMLファイルを読み込む
 */
export function readYAMLFile(basePath: string): string | null {
    const yamlPath = fs.existsSync(`${basePath}.yaml`)
        ? `${basePath}.yaml`
        : fs.existsSync(`${basePath}.yml`)
            ? `${basePath}.yml`
            : null

    if (!yamlPath) {
        return null
    }

    return fs.readFileSync(yamlPath, "utf8")
}