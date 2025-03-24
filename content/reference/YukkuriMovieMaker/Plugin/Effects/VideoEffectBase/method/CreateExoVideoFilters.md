# CreateExoVideoFilters メソッド

## 定義

名前空間: [YukkuriMovieMaker.Plugin.Effects](../../index.md)

アセンブリ: YukkuriMovieMaker.Plugin.dll

<br/>

AviUtlで使用可能な.exoファイルとして出力する際に必要なExoFilterを生成します。

```csharp
public abstract IEnumerable<string> CreateExoVideoFilters(int keyFrameIndex, ExoOutputDescription exoOutputDescription);
```

#### パラメーター

`keyFrameIndex` [Int32](https://learn.microsoft.com/ja-jp/dotnet/api/system.int32)

キーフレーム番号。

<br/>

`exoOutputDescription` ExoOutputDescription

exo出力に必要な各種情報。

#### 戻り値

[IEnumerable<string\>](https://learn.microsoft.com/ja-jp/dotnet/api/system.collections.generic.ienumerable-1)

ExoFilterのコレクション。

## 例

次のコード例では、ぼかしをかけるエフェクトを生成するクラスを定義します。このコード例で、CreateExoVideoFiltersを実装し、ExoFilterのコレクションを返しています。

```csharp
// https://github.com/manju-summoner/YukkuriMovieMaker4PluginSamples/blob/master/YMM4SamplePlugin/VideoEffect/SampleD2DVideoEffect/SampleD2DVideoEffect.cs より一部変更して引用
using System;
using System.Collections.Generic;
using System.ComponentModel.DataAnnotations;
using System.Linq;
using System.Text;
using System.Threading.Tasks;
using YukkuriMovieMaker.Commons;
using YukkuriMovieMaker.Controls;
using YukkuriMovieMaker.Exo;
using YukkuriMovieMaker.Player.Video;
using YukkuriMovieMaker.Plugin.Effects;

namespace BlurEffect
{
    [VideoEffect("ぼかし", ["加工"], [])]
    internal class BlurEffect : VideoEffectBase
    {
        // エフェクトの名前
        public override string Label => "ぼかし";

        // アイテム編集エリアに表示するエフェクトの設定項目
        [Display(Name = "ぼかし", Description = "ぼかしの強さ")]
        [AnimationSlider("F0", "", 0, 100)]
        public Animation Blur { get; } = new Animation(10, 0, 100);

        // ExoFilterを作成する
        public override IEnumerable<string> CreateExoVideoFilters(int keyFrameIndex, ExoOutputDescription exoOutputDescription)
        {
            var fps = exoOutputDescription.VideoInfo.FPS;
            return
            [
                $"_name=ぼかし\r\n" +
                $"_disable={(IsEnabled ?1:0)}\r\n" +
                $"範囲={Blur.ToExoString(keyFrameIndex, "F0", fps)}\r\n" +
                $"縦横比=0.0\r\n" +
                $"光の強さ=0\r\n" +
                $"サイズ固定=0\r\n",
            ];
        }

        // 映像エフェクトを作成する
        public override IVideoEffectProcessor CreateVideoEffect(IGraphicsDevicesAndContext devices)
        {
            return new SampleD2DVideoEffectProcessor(devices, this);
        }

        //クラス内のIAnimatableの一覧を取得する
        protected override IEnumerable<IAnimatable> GetAnimatables() => [Blur];
    }
}
```

## 注釈

exoファイルはAviUtlで読み込まれるテキストファイルです。このファイルには、

- 動画の設定（画面サイズ、フレームレートなど）
- タイムライン構成
- 各アイテムのパラメータ

などのデータが含まれています。ここではエフェクトのパラメータのみを出力します。`_name`はAviUtl上のエフェクト名、`_disable`はエフェクトの有効状態を表します（有効は1、無効は0）。`_name`で指定したエフェクトのパラメータは、その名前を用いて各行で設定します。

なお、このエフェクトがAviUtlで代替不能の場合、空のコレクションを返してください。