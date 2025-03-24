# VideoEffectAttribute クラス

## 定義

名前空間: [YukkuriMovieMaker.Plugin.Effects](../index.md)

アセンブリ: YukkuriMovieMaker.Plugin.dll

<br/>

映像エフェクトの名前、カテゴリーを設定し、[VideoEffectBase](../VideoEffectBase/index.md)に付与する属性です。

```csharp
[AttributeUsage(AttributeTargets.Class)]  
public class VideoEffectAttribute : Attribute
```

継承 [Object](https://learn.microsoft.com/ja-jp/dotnet/api/system.object) → [Attribute](https://learn.microsoft.com/ja-jp/dotnet/api/system.attribute) → VideoEffectAttribute

属性 [AttributeUsage](https://learn.microsoft.com/ja-jp/dotnet/api/system.attributeusageattribute)

## コンストラクター

| 名前                                                                             | 説明                |
| ------------------------------------------------------------------------------ | ----------------- |
| [VideoEffectAttribute(string, string[], string[], bool, bool)](constructor.md) | 映像エフェクトの詳細を設定します。 |

## プロパティー

| 名前                    | 説明                                                      |
| --------------------- | ------------------------------------------------------- |
| Name                  | エフェクトの名前を取得または設定します。                                    |
| Categories            | エフェクトが所属するカテゴリを取得または設定します。                              |
| Keywords              | 検索用キーワードを取得または設定します。                                    |
| IsEffectItemSupported | エフェクトアイテムがこのエフェクトに対応しているかを取得または設定します。                   |
| IsAviUtlSupported     | AviUtlがこのエフェクトに対応しているかを取得または設定します。                      |
| ResourceType          | カスタムリソースの型を取得または設定します。エフェクトのパラメータや名前、カテゴリーの多言語化に使用されます。 |

## メソッド
| 名前              | 説明                    |
| --------------- | --------------------- |
| GetName()       | エフェクトの名前を取得します。       |
| GetCategories() | エフェクトが所属するカテゴリを取得します。 |
