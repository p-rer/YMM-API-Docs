# 映像エフェクト

## Direct2Dのエフェクトを使用したエフェクトプラグイン

### 必要なツール

- .Net9 SDK
- YMM4のdll群と本体
- （推奨）C#開発環境

### プロジェクト参照

- `YukkuriMovieMaker.Controls.dll`
- `YukkuriMovieMaker.Plugin.dll`
- `SharpGen.Runtime.dll`
- `SharpGen.Runtime.COM.dll`
- `Vortice.Direct2D1.dll`
- `Vortice.DirectX.dll`
- `Vortice.Mathematics.dll`

### 継承が必要なクラス

- [VideoEffectBase](/reference/yukkuri-movie-maker/plugin/effects/video-effect-base/)
- IVideoEffectProcessor

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

### 2. IVideoEffectProcessorを継承する

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

## HLSLシェーダーコードを使用したエフェクトプラグイン

### 必要なツール

- .Net9 SDK
- HLSL コードコンパイラ（推奨：Visual StudioからインストールするWindows Kits内のfxc.exe）
- YMM4のdll群と本体
- （推奨）C#開発環境

### プロジェクト参照

- `YukkuriMovieMaker.Controls.dll`
- `YukkuriMovieMaker.Plugin.dll`
- `SharpGen.Runtime.dll`
- `SharpGen.Runtime.COM.dll`
- `Vortice.Direct2D1.dll`
- `Vortice.DirectX.dll`
- `Vortice.Mathematics.dll`

### 継承が必要なクラス

- [VideoEffectBase](/reference/yukkuri-movie-maker/plugin/effects/video-effect-base/)
- IVideoEffectProcessor
- D2D1CustomShaderEffectBase

### 1. シェーダーコードをコンパイルする

#### C++プロジェクトからコンパイルする場合

1. IDE（Visual Studioなど）にシェーダーコードファイルを配置する。
2. ファイルの扱い方をシェーダーとして設定する。
3. ビルドする。

`csproj`の依存関係のアイテムグループに次のコードを挿入する方法もあります：

（routersys様：[X](https://x.com/routersys)/[GitHub](https://github.com/routersys)による）
```xml
<PropertyGroup>
  <ShaderObjectDirectory>$(IntermediateOutputPath)Shaders\</ShaderObjectDirectory>
</PropertyGroup>

<ItemGroup>
  <HLSLFile Include="Shaders\*.hlsl" />
</ItemGroup>

<Target Name="ResolveFxcToolPath" BeforeTargets="CompileHLSLFiles">
  <PropertyGroup>
    <FxcToolPath Condition="'$(FxcToolPath)' == '' AND '$(WindowsSdkDir)' != '' AND '$(TargetPlatformVersion)' != ''">$([System.IO.Path]::Combine('$(WindowsSdkDir)', 'bin', '$(TargetPlatformVersion)', 'x64', 'fxc.exe'))</FxcToolPath>
    <FxcToolPath Condition="'$(FxcToolPath)' == '' OR !Exists('$(FxcToolPath)')">fxc.exe</FxcToolPath>
  </PropertyGroup>

  <Error Text="シェーダーコンパイラ fxc.exe が見つかりませんでした。Windows SDKが正しくインストールされているか、fxc.exeへのパスが通っているか確認してください。検索パス: $(FxcToolPath)"
         Condition="!Exists('$(FxcToolPath)') AND '$(FxcToolPath)' != 'fxc.exe'"/>
  <Message Text="Using fxc.exe: $(FxcToolPath)" Importance="high" />
</Target>

<Target Name="CompileHLSLFiles"
        BeforeTargets="BeforeCompile"
        Inputs="@(HLSLFile)"
        Outputs="$(ShaderObjectDirectory)%(HLSLFile.Filename).cso">

  <MakeDir Directories="$(ShaderObjectDirectory)" />

  <Message Text="Compiling HLSL: %(HLSLFile.FullPath)" Importance="normal"/>
  <Exec Command="&quot;$(FxcToolPath)&quot; /T ps_5_0 /E main /Fo &quot;$(ShaderObjectDirectory)%(HLSLFile.Filename).cso&quot; &quot;%(HLSLFile.FullPath)&quot;" />

  <ItemGroup>
    <EmbeddedResource Include="$(ShaderObjectDirectory)%(HLSLFile.Filename).cso">
      <LogicalName>$(RootNamespace).Shaders.%(Filename)%(Extension)</LogicalName>
    </EmbeddedResource>
  </ItemGroup>
</Target>
```


#### 直接コンパイラを呼び出す場合

コンパイラが`C:\Program Files (x86)\Windows Kits\10\bin\10.0.26100.0\x64\fxc.exe`の時、以下のバッチファイルに対象のシェーダーファイルを指定して実行することで、バイナリファイルが生成されます。

```bat
@echo off

if "%1"=="" (
    echo Usage: CompileShader.bat input_shader.hlsl
    pause
    exit /b 1
)

set INPUT_SHADER=%1
if not exist "%INPUT_SHADER%" (
    echo Input file "%INPUT_SHADER%" not found.
    pause
    exit /b 1
)
set OUTPUT_SHADER=%~dpn1.cso

"C:\Program Files (x86)\Windows Kits\10\bin\10.0.26100.0\x64\fxc.exe" /T ps_4_1 /E main /Fo %OUTPUT_SHADER% /O3 %INPUT_SHADER%

if %ERRORLEVEL% NEQ 0 (
    echo Shader compilation failed.
) else (
    echo Compilation successful: %OUTPUT_SHADER%
)

pause
```

### 2. VideoEffectBaseを継承する

[上記](#1-videoeffectbaseを継承する)と同様。

### 3. IVideoEffectProcessorを継承する

[GitHub](https://github.com/manju-summoner/YukkuriMovieMaker4PluginSamples/blob/master/YMM4SamplePlugin/VideoEffect/SampleHLSLShaderVideoEffect/SampleHLSLShaderVideoEffectProcessor.cs)より引用

```cs
using Vortice.Direct2D1;
using YukkuriMovieMaker.Commons;
using YukkuriMovieMaker.Player.Video;

namespace YMM4SamplePlugin.VideoEffect.SampleHLSLShaderVideoEffect
{
    internal class SampleHLSLShaderVideoEffectProcessor : IVideoEffectProcessor
    {
        readonly SampleHLSLShaderVideoEffect item;
        bool isFirst = true;
        double value;

        readonly SampleHLSLShaderCustomEffect? effect;
        readonly ID2D1Image? output;
        ID2D1Image? input;

        /// <summary>
        /// エフェクトの出力画像
        /// </summary>
        public ID2D1Image Output => output ?? input ?? throw new NullReferenceException();

        public SampleHLSLShaderVideoEffectProcessor(IGraphicsDevicesAndContext devices, SampleHLSLShaderVideoEffect item)
        {
            this.item = item;

            effect = new SampleHLSLShaderCustomEffect(devices);
            if (!effect.IsEnabled)
            {
                //GPU性能によってエフェクトの読み込みに失敗することがある
                effect.Dispose();
                effect = null;
            }
            else
            {
                output = effect.Output;//EffectからgetしたOutputは必ずDisposeする必要がある。Effect内部では開放されない。
            }
        }

        /// <summary>
        /// エフェクトの入力画像を変更する
        /// </summary>
        /// <param name="input"></param>
        public void SetInput(ID2D1Image? input)
        {
            this.input = input;
            effect?.SetInput(0, input, true);
        }

        /// <summary>
        /// エフェクトの入力画像をクリアする
        /// </summary>
        public void ClearInput()
        {
            effect?.SetInput(0, null, true);
        }

        /// <summary>
        /// エフェクトを更新する
        /// </summary>
        /// <param name="effectDescription">エフェクトの描画に必要な各種情報</param>
        /// <returns>描画位置等</returns>
        public DrawDescription Update(EffectDescription effectDescription)
        {
            if (effect is null)
                return effectDescription.DrawDescription;

            var frame = effectDescription.ItemPosition.Frame;
            var length = effectDescription.ItemDuration.Frame;
            var fps = effectDescription.FPS;

            var value = item.Value.GetValue(frame, length, fps) / 100;

            if (isFirst || this.value != value)
                effect.Value = (float)value;

            isFirst = false;
            this.value = value;

            return effectDescription.DrawDescription;
        }

        /// <summary>
        /// エフェクトの各種リソースを開放する
        /// </summary>
        public void Dispose()
        {
            output?.Dispose();//EffectからgetしたOutputは必ずDisposeする必要がある。Effect内部では開放されない。
            effect?.SetInput(0, null, true);//Inputは必ずnullに戻す。
            effect?.Dispose();
        }
    }
}
```
- エフェクトの出力をYMM4が読み取るためのプロパティ、<br/>`public ID2D1Image Output { get; }`<br/>を置く。
- コンストラクタで必要なシェーダーカスタムエフェクト（下記参照）のインスタンスを初期化する。この際、GPUがエフェクトの読み込みに成功したかを`effect.IsEnabled`で判定し、失敗していたらインスタンスを開放する。また、上で定義した`VideoEffectBase`の継承オブジェクトをクラスのインスタンス内で保持する。エフェクトの出力を`Output` プロパティに代入する。
- SetInput 関数でシェーダーカスタムエフェクトに入力画像を設定する。
- ClearInput 関数でシェーダーカスタムエフェクトの入力画像をnullにする。
- Update 関数で、コンストラクタで受け取った`VideoEffectBase`から設定項目の値を読み取り、エフェクトのパラメータを設定する。
- Dispose 関数でエフェクトと`Output`を開放する。

### 4. D2D1CustomShaderEffectBaseを継承する

[GitHub]()より引用

```cs
using System.Runtime.InteropServices;
using Vortice.Direct2D1;
using YukkuriMovieMaker.Commons;
using YukkuriMovieMaker.Player.Video;

namespace YMM4SamplePlugin.VideoEffect.SampleHLSLShaderVideoEffect
{
    /// <summary>
    /// ID2D1Effectとして動作するカスタムエフェクト
    /// D2D1CustomShaderEffectBaseを継承する
    /// </summary>
    internal class SampleHLSLShaderCustomEffect : D2D1CustomShaderEffectBase
    {
        public float Value
        {
            set => SetValue((int)EffectImpl.Properties.Value, value);
            get => GetFloatValue((int)EffectImpl.Properties.Value);
        }

        public SampleHLSLShaderCustomEffect(IGraphicsDevicesAndContext devices) : base(Create<EffectImpl>(devices))
        {

        }

        /// <summary>
        /// エフェクトの実装
        /// [CustomEffect]を設定する必要がある。inputCountは入力画像の数。
        /// </summary>
        [CustomEffect(1)]
        class EffectImpl : D2D1CustomShaderEffectImplBase<EffectImpl>
        {
            /// <summary>
            /// HLSLに渡すバッファ
            /// </summary>
            ConstantBuffer constantBuffer;

            /// <summary>
            /// エフェクトのプロパティ
            /// [CustomEffectProperty]属性でプロパティの型とIDを設定する必要がある。
            /// </summary>
            [CustomEffectProperty(PropertyType.Float, (int)Properties.Value)]
            public float Value
            {
                get => constantBuffer.Value;
                set
                {
                    constantBuffer.Value = value;
                    UpdateConstants();
                }
            }

            public EffectImpl() : base(ShaderResourceLoader.GetShaderResource("PixelShader.cso")/*ここでシェーダーのbyte列を渡す*/)
            {

            }

            /// <summary>
            /// 設定をシェーダーに渡す
            /// </summary>
            protected override void UpdateConstants()
            {
                drawInformation?.SetPixelShaderConstantBuffer(constantBuffer);
            }

            /// <summary>
            /// 入力画像の範囲から出力画像の範囲を計算する
            /// 例:
            /// 画像に対して10pxの縁取りエフェクトを掛ける場合、outputRectをinputRectsの範囲から10px大きくする
            /// 画像に対して10pxのモザイクエフェクトをかける場合、出力範囲は変わらないのでinputRects[0]をそのままoutputRectに設定する
            /// </summary>
            /// <param name="inputRects">入力画像の範囲。inputの数だけ渡される。最適化のため、入力画像の範囲がそのまま渡されるわけではなく、分割されることもある。</param>
            /// <param name="inputOpaqueSubRects">入力画像の不透明な部分の範囲。最適化のため、入力画像の範囲がそのまま渡されるわけではなく、分割されることもある。</param>
            /// <param name="outputRect">入力画像をもとに計算した出力画像の範囲。</param>
            /// <param name="outputOpaqueSubRect">入力画像を元に計算した出力画像の不透明な部分</param>
            public override void MapInputRectsToOutputRect(Vortice.RawRect[] inputRects, Vortice.RawRect[] inputOpaqueSubRects, out Vortice.RawRect outputRect, out Vortice.RawRect outputOpaqueSubRect)
            {
                base.MapInputRectsToOutputRect(inputRects, inputOpaqueSubRects, out outputRect, out outputOpaqueSubRect);
            }

            /// <summary>
            /// 出力画像を生成するために入力する必要のある入力画像の範囲を計算する
            /// 例:
            /// 画像に対して10pxの縁取りエフェクトを掛ける場合、縁取りの計算に周囲10pxの画像が必要なのでinputRects[0]をoutputRectから10px大きくしたものに設定する
            /// 画像に対して10pxのモザイクエフェクトを掛ける場合、モザイクの計算に周囲10pxの画像が必要なのでinputRects[0]をoutputRectから10px大きくしたものに設定する
            /// </summary>
            /// <param name="outputRect">出力画像の範囲。最適化のため、出力画像の範囲がそのまま渡されるわけではなく、分割されることもある。</param>
            /// <param name="inputRects">出力画像を生成するために入力する必要のある入力画像の範囲。</param>
            public override void MapOutputRectToInputRects(Vortice.RawRect outputRect, Vortice.RawRect[] inputRects)
            {
                base.MapOutputRectToInputRects(outputRect, inputRects);
            }

            [StructLayout(LayoutKind.Sequential)]
            struct ConstantBuffer
            {
                public float Value;
            }
            public enum Properties
            {
                Value = 0
            }
        }
    }
}
```
- エフェクトのパラメータとなるプロパティを置く。
- シェーダーの実行を行うクラスを`D2D1CustomShaderEffectImplBase`を継承して定義・実装する。
    - クラスではHLSLに渡すバッファとなる構造体のインスタンスを保持する。この構造体は、メモリ配列が途切れないように、<br>`[StructLayout(LayoutKind.Sequential)]`<br>をつける。
    - プロパティ名の列挙体を定義する。
    - CustomEffectProperty 属性のプロパティを定義する。読み書きはバッファに対して行い、書き込み時は<br>`UpdateConstants()`<br>を呼び出す。
    - コンストラクタでは、基底クラスのコンストラクタを、シェーダーのバイナリを渡す。ここで使用されている`ShaderResourceLoader.GetShaderResource()`関数は、アセンブリのリソースから名前でその内容を抽出し、`byte[]`に代入する関数。詳しくは[GitHub](https://github.com/manju-summoner/YukkuriMovieMaker4PluginSamples/blob/master/YMM4SamplePlugin/VideoEffect/SampleHLSLShaderVideoEffect/ShaderResourceLoader.cs)を参照。
    - `UpdateConstants()`は、コード例をそのままコピー。
    - `MapInputRectsToOutputRect()`では、引数の入力画像のサイズを利用して、出力される画像のサイズを計算し、これらを`base.MapInputRectsToOutputRect()`関数の呼び出しで渡します。
    - `MapOutputRectToInputRects()`では、引数の出力画像のサイズを利用して、必要な入力画像のサイズを計算し、これらを`base.MapOutputRectToInputRects()`関数の呼び出しで渡します。
- 直上で定義したクラスを型引数として`Create()`関数を基底クラスのコンストラクタに与えるコンストラクタを例のように定義する。

