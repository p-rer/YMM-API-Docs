# 映像エフェクト

## 必要なツール

- .Net9 SDK
- YMM4のdll群と本体
- （推奨）C#開発環境

## プロジェクト参照

- `YukkuriMovieMaker.Controls.dll`
- `YukkuriMovieMaker.Plugin.dll`
- `SharpGen.Runtime.dll`
- `SharpGen.Runtime.COM.dll`
- `Vortice.Direct2D1.dll`
- `Vortice.DirectX.dll`
- `Vortice.Mathematics.dll`

## 継承が必要なクラス

- [VideoEffectBase](/reference/yukkuri-movie-maker/plugin/effects/video-effect-base/)
- IVideoEffectProcessor

## Direct2Dのエフェクトを使用したエフェクトプラグイン

### 1. VideoEffectBaseを継承する

エフェクトのプロパティなどの情報を設定する。

[GitHub](https://github.com/manju-summoner/YukkuriMovieMaker4PluginSamples/blob/master/YMM4SamplePlugin/VideoEffect/SampleD2DVideoEffect/SampleD2DVideoEffect.cs)より引用
```cs
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

namespace YMM4SamplePlugin.VideoEffect.SampleD2DVideoEffect
{
    /// <summary>
    /// 映像エフェクト
    /// 映像エフェクトには必ず[VideoEffect]属性を設定してください。
    /// </summary>
    [VideoEffect("サンプルD2Dエフェクト", ["サンプル"], [])]
    internal class SampleD2DVideoEffect : VideoEffectBase
    {
        /// <summary>
        /// エフェクトの名前
        /// </summary>
        public override string Label => "サンプルD2Dエフェクト";

        /// <summary>
        /// アイテム編集エリアに表示するエフェクトの設定項目。
        /// [Display]と[AnimationSlider]等のアイテム編集コントロール属性の2つを設定する必要があります。
        /// [AnimationSlider]以外のアイテム編集コントロール属性の一覧はSamplePropertyEditorsプロジェクトを参照してください。
        /// </summary>
        [Display(Name = "ぼかし", Description = "ぼかしの強さ")]
        [AnimationSlider("F0", "", 0, 100)]
        public Animation Blur { get; } = new Animation(10, 0, 100);

        /// <summary>
        /// ExoFilterを作成する
        /// </summary>
        /// <param name="keyFrameIndex">キーフレーム番号</param>
        /// <param name="exoOutputDescription">exo出力に必要な各種パラメーター</param>
        /// <returns></returns>
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

        /// <summary>
        /// 映像エフェクトを作成する
        /// </summary>
        /// <param name="devices">デバイス</param>
        /// <returns>映像エフェクト</returns>
        public override IVideoEffectProcessor CreateVideoEffect(IGraphicsDevicesAndContext devices)
        {
            return new SampleD2DVideoEffectProcessor(devices, this);
        }

        /// <summary>
        /// クラス内のIAnimatableの一覧を取得する
        /// </summary>
        /// <returns></returns>
        protected override IEnumerable<IAnimatable> GetAnimatables() => [Blur];
    }
}
```

- [VideoEffect 属性](/reference/yukkuri-movie-maker/plugin/effects/video-effect-attribute/)を付与して、エフェクトの表示名、カテゴリ、キーワードを指定する。
- [Label プロパティ](/reference/yukkuri-movie-maker/plugin/effects/video-effect-base/property/label/)をオーバーライドしてエフェクト名を指定する。
- エフェクトの設定項目のプロパティを用意する。
    - アイテム編集欄に表示するとき、Display 属性でその項目の名前などを指定し、項目に対するコントロールの属性を付与する。
- [CreateExoVideoFilters 関数](/reference/yukkuri-movie-maker/plugin/effects/video-effect-base/method/create-exo-video-filters/)をオーバーライドして、必要に応じてEXO出力する際のテキストを返すようにする。
    - エフェクトがAviUtl互換性を必要としない場合、空配列を返してもよい：`return [];`
- [CreateVideoEffect 関数](/reference/yukkuri-movie-maker/plugin/effects/video-effect-base/method/create-video-effect/)をオーバーライドして、後述の処理用のクラスのインスタンスを返すようにする。
- アニメーション可能な項目がある場合、GetAnimatables 関数のオーバーライドでそのプロパティを入れた配列を返す。

### 2. IVideoEffectProcessor

エフェクトの実行処理を定義する。

[GitHub](https://github.com/manju-summoner/YukkuriMovieMaker4PluginSamples/blob/master/YMM4SamplePlugin/VideoEffect/SampleD2DVideoEffect/SampleD2DVideoEffectProcessor.cs)より引用
```cs
using Vortice.Direct2D1;
using YukkuriMovieMaker.Commons;
using YukkuriMovieMaker.Player.Video;

namespace YMM4SamplePlugin.VideoEffect.SampleD2DVideoEffect
{
    internal class SampleD2DVideoEffectProcessor : IVideoEffectProcessor
    {
        readonly SampleD2DVideoEffect item;
        readonly Vortice.Direct2D1.Effects.GaussianBlur blurEffect;

        public ID2D1Image Output { get; }

        bool isFirst = true;
        double blur;

        public SampleD2DVideoEffectProcessor(IGraphicsDevicesAndContext devices, SampleD2DVideoEffect item)
        {
            this.item = item;

            blurEffect = new Vortice.Direct2D1.Effects.GaussianBlur(devices.DeviceContext);
            Output = blurEffect.Output;//EffectからgetしたOutputは必ずDisposeする。Effect側ではDisposeされない。
        }

        /// <summary>
        /// エフェクトに入力する映像を設定する
        /// </summary>
        /// <param name="input"></param>
        public void SetInput(ID2D1Image? input)
        {
            blurEffect.SetInput(0, input, true);
        }

        /// <summary>
        /// エフェクトに入力する映像をクリアする
        /// </summary>
        public void ClearInput()
        {
            blurEffect.SetInput(0, null, true);
        }

        /// <summary>
        /// エフェクトを更新する
        /// </summary>
        /// <param name="effectDescription">エフェクトの描画に必要な各種設定項目</param>
        /// <returns>描画関連の設定項目</returns>
        public DrawDescription Update(EffectDescription effectDescription)
        {
            var frame = effectDescription.ItemPosition.Frame;
            var length = effectDescription.ItemDuration.Frame;
            var fps = effectDescription.FPS;

            var blur = item.Blur.GetValue(frame, length, fps);

            if (isFirst || this.blur != blur)
                blurEffect.StandardDeviation = (float)blur;

            isFirst = false;
            this.blur = blur;

            return effectDescription.DrawDescription;
        }

        public void Dispose()
        {
            blurEffect.SetInput(0, null, true);//Inputは必ずnullに戻す。
            Output.Dispose();//EffectからgetしたOutputは必ずDisposeする。Effect側ではDisposeされない。
            blurEffect.Dispose();
        }
    }
}
```
- エフェクトの出力をYMM4が読み取るためのプロパティ、<br/>`public ID2D1Image Output { get; }`<br/>を置く。
- コンストラクタで必要なDirect2Dエフェクトのインスタンスを初期化する。また、上で定義した`VideoEffectBase`の継承オブジェクトをクラスのインスタンス内で保持する。エフェクトの出力を`Output` プロパティに代入する。
- SetInput 関数でDirect2Dエフェクトに入力画像を設定する。
- ClearInput 関数でDirect2Dエフェクトの入力画像をnullにする。
- Update 関数で、コンストラクタで受け取った`VideoEffectBase`から設定項目の値を読み取り、エフェクトのパラメータを設定する。
- Dispose 関数でエフェクトと`Output`を開放する。
