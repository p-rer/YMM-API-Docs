# VideoEffectBase クラス

## 定義

名前空間: [YukkuriMovieMaker.Plugin.Effects](..)

アセンブリ: YukkuriMovieMaker.Plugin.dll

<br/>

映像エフェクトの名前、パラメータの保持、変更の通知、プロセッサーの提供などを行うクラスはこれを継承します。

```csharp
public abstract class VideoEffectBase : YukkuriMovieMaker.Commons.Animatable, YukkuriMovieMaker.Plugin.Effects.IVideoEffect, System.ComponentModel.INotifyPropertyChanged, System.ComponentModel.INotifyDataErrorInfo, YukkuriMovieMaker.UndoRedo.IUndoRedoable, YukkuriMovieMaker.ItemEditor.IEditable, YukkuriMovieMaker.Commons.IAnimatable, YukkuriMovieMaker.Project.IFileItem, YukkuriMovieMaker.Project.IResourceItem
```

継承 [Object](https://learn.microsoft.com/ja-jp/dotnet/api/system.object) → Bindable → ValidatableBindable → UndoRedoable → Animatable → VideoEffectBase

実装 [IVideoEffect](../ivideo-effect, [INotifyPropertyChanged](https://learn.microsoft.com/ja-jp/dotnet/api/system.componentmodel.inotifypropertychanged), [INotifyDataErrorInfo](https://learn.microsoft.com/ja-jp/dotnet/api/system.componentmodel.inotifydataerrorinfo), IUndoRedoable, IEditable, Animatable, IFileItem, IResourceItem

## コンストラクター

| 名前                                                                                                         | 説明                |
| ---------------------------------------------------------------------------------------------------------- | ----------------- |
| [VideoEffectBase()](./constructor) | 新しいインスタンスを初期化します。 |

## プロパティー

| 名前                                 | 説明                        |
|------------------------------------| ------------------------- |
| [Label](./property/label)          | エフェクトの名前を設定します。読み取り専用です。  |
| [IsEnabled](./property/is-enabled) | エフェクトの有効または無効を取得または設定します。 |
| [Remark](./property/remark)        | エフェクトについて備考を取得または設定します。   |

## メソッド

| 名前                                                                                    | 説明                                    |
|---------------------------------------------------------------------------------------| ------------------------------------- |
| [Set<T\>(ref T, T, string, params string[])](./method/set)                            | 参照渡しされたストレージに値を設定し、変更を通知します。          |
| [Set<T\>(Expression<Func<T\>\>, T, string, params string[])](./method/set)            | プロパティセレクターを使用してプロパティーに値を設定し、変更を通知します。 |
| [CreateExoVideoFilters(int, ExoOutputDescription)](./method/create-exo-video-filters) | Exoとして出力する際に使用する文字列を生成します。            |
| [CreateVideoEffect(IGraphicsDevicesAndContext)](./method/create-video-effect)         | プロセッサーのインスタンスを生成します。                  |

## 明示的なインターフェイスの実装
| 名前                                    | 説明                                     |
| ------------------------------------- | -------------------------------------- |
| IFileItem.GetFiles()                  | 空の文字列配列を返します。                          |
| IFileItem.ReplaceFile(string, string) | 何も実行されません。                             |
| IResourceItem.GetResources()          | TimelineResource オブジェクトのシーケンスを生成し返します。 |
