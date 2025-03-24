# CreateVideoEffect メソッド

## 定義

名前空間: [YukkuriMovieMaker.Plugin.Effects](../../index.md)

アセンブリ: YukkuriMovieMaker.Plugin.dll

<br/>

入力画像に対し効果を適用し出力する機能を持つ映像エフェクトオブジェクトを生成します。

```csharp
public abstract IVideoEffectProcessor CreateVideoEffect(IGraphicsDevicesAndContext devices);
```

#### パラメーター

`devices` IGraphicsDevicesAndContext

デバイス。デバイスコンテキストを含む。

#### 戻り値

IVideoEffectProcessor

生成された映像エフェクト。