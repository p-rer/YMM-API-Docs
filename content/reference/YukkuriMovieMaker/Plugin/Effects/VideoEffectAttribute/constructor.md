# コンストラクター

## 定義

名前空間: [YukkuriMovieMaker.Plugin.Effects](../index.md)

アセンブリ: YukkuriMovieMaker.Plugin.dll

<br/>

[VideoEffect](index.md)属性を初期化します。

```csharp
VideoEffectAttribute(string name, string[] categories, string[] keywords, bool isEffectItemSupported = true, bool isAviUtlSupported = true)
```

#### パラメーター

`name` [String](https://learn.microsoft.com/ja-jp/dotnet/api/system.string)

エフェクトの名前。

<br/>

`categories` [String](https://learn.microsoft.com/ja-jp/dotnet/api/system.string)\[]

エフェクトが所属するカテゴリー。

<br/>

`keywords` [String](https://learn.microsoft.com/ja-jp/dotnet/api/system.string)\[]

検索用キーワード。エフェクトの名前以外でも検索でヒットするために、その文字列を設定します。

<br/>

`isEffectItemSupported` [Boolean](https://learn.microsoft.com/ja-jp/dotnet/api/system.boolean)

エフェクトアイテムがこのエフェクトに対応しているか。

<br/>

`isAviUtlSupported` [Boolean](https://learn.microsoft.com/ja-jp/dotnet/api/system.boolean)

AviUtlがこのエフェクトに対応しているか。`false`の場合、エフェクト名の隣にYMMのロゴマークが付きます。