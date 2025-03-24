# ResourceType プロパティー

## 定義

名前空間: [YukkuriMovieMaker.Plugin.Effects](../../index.md)

アセンブリ: YukkuriMovieMaker.Plugin.dll

<br/>

カスタムリソースの型を取得または設定します。このリソースはエフェクトの名前やカテゴリーの多言語化などに用いられます。このプロパティーを利用するには、リソースクラスに[String](https://learn.microsoft.com/ja-jp/dotnet/api/system.string)型の静的プロパティーを用意してください。カテゴリー名にそのプロパティー名を用いることで、YMM4はリソースクラスの指定された名前のプロパティーから文字列を読み込みます。[YukkuriMovieMaker.Generator](https://github.com/manju-summoner/YukkuriMovieMaker.Generator)を使用する場合も生成されるクラスの型を設定してください。

```csharp
public Type? ResourceType { get; set; }
```

#### プロパティー値
[Type](https://learn.microsoft.com/ja-jp/dotnet/api/system.type)

リソースクラスの型。