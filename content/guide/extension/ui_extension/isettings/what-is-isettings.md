# 1. YMM4設定プラグインとは何か

## 設定プラグインのさす意味
YMM4（ゆっくりムービーメーカー4）において、設定プラグインは**YMM4の「環境設定」画面に独自のタブを追加し、プラグイン固有の設定項目を管理させる拡張機能**を意味します。
ここでは、クラスのプロパティを定義するだけでUIが自動生成される、柔軟な構成設定機能と思っておいてください。

ここで把握しておく点は

- .NET 10 SDK（およびYMM4本体の動作環境に合わせた.NET SDK）とYMM4のdll群が必要であること
- プロジェクトファイルのターゲットフレームワークが `net10.0-windows` に設定されていること
- `ISettingsPlugin`を継承・実装する必要があること
- 設定項目を保持するクラスには `INotifyPropertyChanged` を実装する必要があること
- `Display` 属性を用いることで、プロパティの型に応じてトグルボタンやテキストボックスなどのUIが自動的に生成されること

です。

## 設定プラグイン上でできることとは

YMM4の設定機能を拡張することで、ユーザーにプラグイン固有の動作設定を提供できます。

設定プラグインを実装すると

- YMM4の環境設定ウィンドウに独自のタブが追加される
- タブ内には、プロパティに基づいて自動生成されたUIが表示される
- 設定した値はYMM4の終了時や保存時に自動的にシリアライズ（保存・復元）される

という結果になります。

## 構成要素の分類
設定プラグインを構築するためのクラスは、主に次の2つに分類することができます。

- **ISettingsPlugin (エントリーポイント)**
- **設定用クラス (データモデル)**

これらは明確に役割が分かれており、この下ではそれぞれについて分けて解説しています。

### ISettingsPlugin

環境設定ウィンドウのタブ名や、設定データを保持するインスタンスを定義する窓口です。

YMM4に対して「この設定タブを追加します」と伝える役割を持ちます。`Settings` プロパティで設定データのインスタンスを返しますが、通常はシングルトンパターンなどを用いて、アプリケーション全体で共有されるインスタンスを返すようにします。

### 設定用クラス

実際のユーザー設定項目を保持するクラスです。

ここでの最大の特徴は、UIを個別に作成する必要がないことです。`Display` 属性を使用し、`bool` 型ならトグルボタン、`string` 型ならテキストボックスといった具合に、YMM4が自動的にUIを構築します。また、設定変更をYMM4側に通知するため、`INotifyPropertyChanged` の実装が必須となります。

## 実装の注意（詰みポイント）

1. `ISettingsPlugin` を実装したクラスが存在するか、タブ名が他と被っていないか確認してください。
2. `Settings` プロパティで返すインスタンスが、毎回新規作成（new）されておらず、単一のインスタンスを返し続けているか確認してください（シングルトンの徹底）。
3. `INotifyPropertyChanged` が正しく実装されており、セッター内で `OnPropertyChanged` が呼ばれているか確認してください。
4. UIのグループ分けを行いたい場合は `Display(GroupName = "...")` を使用してください。

## サンプルコード

このコードは、YMM4の環境設定画面に独自のタブを追加し、設定項目（トグルボタンやテキスト）を表示させる最小構成の検証コードです。

以下のことを検証しています。

1. `ISettingsPlugin` によるタブの追加
2. `Display` 属性によるUIの自動生成
3. `INotifyPropertyChanged` による変更通知

### C#

**SampleSettingsPlugin.cs**
```cs
using YukkuriMovieMaker.Plugin;

namespace YourNamespace
{
    public class SampleSettingsPlugin : ISettingsPlugin
    {
        // 環境設定ウィンドウのタブに表示される名前
        public string Name => "サンプル設定";

        // 設定データを保持するインスタンス
        public object Settings => SampleSettings.Default;
    }
}
```

**SampleSettings.cs**
```cs
using System.ComponentModel;
using System.Runtime.CompilerServices;
using YukkuriMovieMaker.Controls;

namespace YourNamespace
{
    public class SampleSettings : INotifyPropertyChanged
    {
        private static SampleSettings? _default;
        public static SampleSettings Default => _default ??= new SampleSettings();

        private bool _isEnabled = false;
        private string _userName = "名無し";

        // トグルボタン（チェックボックス）として表示される設定
        [Display(Name = "機能の有効化", Description = "サンプル機能を有効にします。")]
        public bool IsEnabled
        {
            get => _isEnabled;
            set
            {
                if (_isEnabled != value)
                {
                    _isEnabled = value;
                    OnPropertyChanged();
                }
            }
        }

        // テキストボックスとして表示される設定
        [Display(Name = "ユーザー名", Description = "プラグインで使用する名前です。")]
        public string UserName
        {
            get => _userName;
            set
            {
                if (_userName != value)
                {
                    _userName = value;
                    OnPropertyChanged();
                }
            }
        }

        public event PropertyChangedEventHandler? PropertyChanged;
        protected void OnPropertyChanged([CallerMemberName] string? propertyName = null)
        {
            PropertyChanged?.Invoke(this, new PropertyChangedEventArgs(propertyName));
        }
    }
}.
```

### 実行手順

1. 上記のコードをビルドしてdllを作成します。
2. YMM4のプラグインフォルダにdllを配置します。
3. YMM4を起動し、「環境設定」メニューを開きます。
4. 「サンプル設定」というタブが追加されていることを確認できます。