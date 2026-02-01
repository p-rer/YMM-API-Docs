# YMM API ドキュメント

YukkuriMovieMaker (YMM4) のプラグイン API ドキュメントサイトです。

## 概要

このプロジェクトは Next.js を使用して構築され、Markdown と YAML ベースのドキュメントシステムを採用しています。

## ドキュメントフォーマット

### Markdown (.md)
チュートリアル、ガイド、サンプルコードなどの記事に使用します。

- フロントマターでタイトルや説明を指定できます。なお、この項目は省略できます。
- 標準的な Markdown 記法をサポートしています。
- コードブロックはシンタックスハイライトされます。

### YAML (.yaml)
API リファレンス（クラス、メソッド、プロパティなど）に使用します。

#### 基本構文

すべての YAML ファイルに共通する必須フィールド：

```yaml
type: class | interface | method | property | field | constructor | namespace
title: "タイトル"
description: "説明"
namespace: "名前空間"
assembly: "アセンブリ名"
summary: "詳細な説明"
```

#### type 別の追加フィールド

**class / interface**
```yaml
code: |
  コード定義
inheritance:
  - 継承元クラス
implements:
  - 実装インターフェース
attributes:
  - 属性
constructors:
  - name: "リンク付きコンストラクタ名"
    description: "説明"
properties:
  - name: "リンク付きプロパティ名"
    description: "説明"
methods:
  - name: "リンク付きメソッド名"
    description: "説明"
fields:
  - name: "リンク付きフィールド名"
    description: "説明"
```

**method**
```yaml
namespaceUrl: "名前空間への相対パス"
overloads:
  - name: "オーバーロード名"
    description: "説明"
    code: |
      コード
    typeParameters:
      - name: "型パラメータ名"
        description: "説明"
    parameters:
      - name: "パラメータ名"
        type: "型"
        description: "説明"
        attributes:
          - 属性
    returns:
      type: "戻り値の型"
      description: "説明"
    remarks: "補足"
    example: "使用例"
```

**property**
```yaml
namespaceUrl: "名前空間への相対パス"
code: |
  コード
propertyType: "プロパティの型"
propertyValue: "値の説明"
attributes:
  - 属性
remarks: "補足"
example: "使用例"
```

**field**
```yaml
namespaceUrl: "名前空間への相対パス"
code: |
  コード
fieldType: "フィールドの型"
fieldValue: "値"
attributes:
  - 属性
```

**constructor**
```yaml
namespaceUrl: "名前空間への相対パス"
overloads:
  - code: |
      コード
    parameters:
      - name: "パラメータ名"
        type: "型"
        description: "説明"
    remarks: "補足"
```

**namespace**
```yaml
namespaces:
  - name: "子名前空間名"
    description: "説明"
classes:
  - name: "クラス名"
    description: "説明"
interfaces:
  - name: "インターフェース名"
    description: "説明"
enums:
  - name: "列挙型名"
    description: "説明"
delegates:
  - name: "デリゲート名"
    description: "説明"
```

### .name ファイル
index.md / index.yaml / .md / .yaml のいずれもないディレクトリに .name ファイルを配置すると、ディレクトリの名前をそのファイルの内容で設定できます。

## 開発環境のセットアップ

### 必要な環境

- Node.js 20 以上
- pnpm

### セットアップ

```bash
# 依存関係をインストール
pnpm install

# 開発サーバーを起動
pnpm dev
```

開発サーバーは http://localhost:3000 で起動します。

### 主なコマンド

- `pnpm dev` - 開発サーバーを起動
- `pnpm build` - 本番用ビルド
- `pnpm start` - ビルド済みアプリケーションを起動
