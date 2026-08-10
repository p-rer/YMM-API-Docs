# 1. YMM4ツールプラグインとは何か

## ツールプラグインのさす意味
YMM4（ゆっくりムービーメーカー4）において、ツールプラグインは**YMM4のメニューから独自のウィンドウを呼び出し、特定の処理を実行させる拡張機能**を意味します。
ここでは、WPFを使用して独自のUI画面を持たせた外部DLL（動的リンクライブラリ）と思っておいてください。

ここで把握しておく点は

- .NET 10 SDK（およびYMM4本体の動作環境に合わせた.NET SDK）とYMM4のdll群（`YukkuriMovieMaker.Plugin.dll` 等）が必要であること
- プロジェクトファイル（`.csproj`）内でWPFを有効化（`<UseWPF>true</UseWPF>`）し、ターゲットフレームワークを `net10.0-windows` に設定する必要があること
- `IToolPlugin` を継承・実装する必要があること
- UIの裏側を担当するViewModel用のクラス（`INotifyPropertyChanged` の実装が推奨）が必要なこと
- 画面表示を担当するView用のクラス（WPFの `UserControl` を継承）が必要なこと

です。

## ツールプラグイン上でできることとは

YMM4は動画編集ソフトですが、標準機能だけでは補えない自動化や外部連携を行いたい場合があります。

ツールプラグインを実装すると

- YMM4上部の「ツール」メニューに独自のツール名が表示される
- クリックすると、独自のUIを持った独立したウィンドウが表示される
- YMM4本体のプロジェクト情報（タイムラインやアイテムなど）にアクセスできる
- 独自の支援ツール（例：自動カットツール、台本読み込みツール、外部API連携など）として動作させることができる

という結果になります。

## 構成要素の分類
ツールプラグインを構築するためのクラスは、主に次の3つに分類することができます。

- **IToolPlugin (エントリーポイント)**
- **ViewModel (内部ロジック)**
- **View (ユーザーインターフェース)**

これらは「MVVM（Model-View-ViewModel）」パターンとして明確に区別して構築することが前提となっているため、この下ではそれぞれについて分けて解説しています。

### IToolPlugin

ツールプラグインの名前や、UIとロジックを担当するクラスの型、複数起動の可否などを定義する窓口です。

YMM4に対して「このツールを追加します」と伝える役割を持ちます。YMM4はここで定義された型（`Type`）情報を元に自動的にインスタンス化し、Viewの裏側にViewModelを紐づけてくれます。

### ViewModel

ツールの内部ロジックや、UIの表示状態を管理するクラスです。

画面上のテキストボックス等の値が変わったことをUIへ通知するために `INotifyPropertyChanged` を実装します。ボタンが押された時の処理など複雑な機能は、ここにWPFの `ICommand` などを実装して記述します。
また、YMM4が提供するサービスのインターフェースをコンストラクタの引数に指定するだけで、YMM4側から自動的に正しいインスタンスを受け取ること（DI：依存性の注入）ができ、タイムライン操作などの連携が可能になります。

### View

WPFの機能を使って、ツールウィンドウに表示される実際の見た目（UI）を定義するクラスです。

必ずWPFの `UserControl` を継承して作成します。YMM4本体がこの `UserControl` を自動的に独立したウィンドウとして包み込んで表示してくれます。`DataContext` には先述のViewModelが自動的にセットされるため、直接データの連携（データバインディング）が可能です。

## 依存関係と配置ディレクトリ階層

ビルドしたプラグインのdllは、YMM4のプラグインフォルダに対して次のような階層構造で配置します。

```txt
YukkuriMovieMaker4  
└── user  
     └── plugin
         └── プラグイン名
             └── プラグイン名.dll
```

配布時は、プラグイン本体のdllやツール独自の依存dllを同じフォルダに入れます。ただし、`YukkuriMovieMaker.Plugin.dll` など、YMM4本体に含まれるdllは同梱しません。

## 実装の注意（詰みポイント）

1. csprojファイルに `<UseWPF>true</UseWPF>` および `<TargetFramework>net10.0-windows</TargetFramework>` が設定されているか確認してください。これがないとビルドに失敗します。
2. dllを正しいプラグインフォルダ（`user/plugin/プラグイン名/`）に配置できているか確認してください。
3. ビルドターゲット（`.NET 10.0` 等）や、参照しているYMM4本体のdllバージョンが一致しているか確認してください。
4. `IToolPlugin` で指定する `ViewModelType` や `ViewType` の型が間違っていないか、`View` が `UserControl` を継承しているか確認してください。
5. `ViewModel` のコンストラクタで、YMM4側に存在しない型を引数として要求していないか確認してください（最初は引数なしで画面が出るか試すのが確実です）。

## サンプルコード

このコードは、YMM4上でツールプラグインの独自のウィンドウを呼び出し、UIを表示する最小構成の検証コードです。

以下のことを検証しています。

1. `IToolPlugin` を介してYMM4メニューへ登録できること
2. `ViewModel` による内部ロジック（データバインディング機構）が機能すること
3. `View` によってWPF画面が描画されること

### C# および XAML

**SampleToolPlugin.cs**
```cs
using System;
using YukkuriMovieMaker.Plugin;

namespace YourNamespace
{
    public class SampleToolPlugin : IToolPlugin
    {
        // YMM4の「ツール」メニューに表示される名前
        public string Name => "サンプルツール";

        // ツールウィンドウの複数同時起動を許可するかどうか
        public bool AllowMultipleInstances => false;

        // ツールのUIロジックを担当するViewModelの型
        public Type ViewModelType => typeof(SampleToolViewModel);

        // ツールの見た目(UI)を担当するView(UserControl)の型
        public Type ViewType => typeof(SampleToolView);
    }
}
```

**SampleToolViewModel.cs**
```cs
using System.ComponentModel;
using System.Runtime.CompilerServices;

namespace YourNamespace
{
    public class SampleToolViewModel : INotifyPropertyChanged
    {
        private string _message = "こんにちは、YMM4！";

        public string Message
        {
            get => _message;
            set
            {
                if (_message != value)
                {
                    _message = value;
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
}
```

**SampleToolView.xaml**
```xml
<UserControl x:Class="YourNamespace.SampleToolView"
             xmlns="[http://schemas.microsoft.com/winfx/2006/xaml/presentation](http://schemas.microsoft.com/winfx/2006/xaml/presentation)"
             xmlns:x="[http://schemas.microsoft.com/winfx/2006/xaml](http://schemas.microsoft.com/winfx/2006/xaml)"
             xmlns:mc="[http://schemas.openxmlformats.org/markup-compatibility/2006](http://schemas.openxmlformats.org/markup-compatibility/2006)" 
             xmlns:d="[http://schemas.microsoft.com/expression/blend/2008](http://schemas.microsoft.com/expression/blend/2008)" 
             mc:Ignorable="d" 
             d:DesignHeight="300" d:DesignWidth="400"
             Background="White">
    <Grid>
        <StackPanel Margin="10">
            <TextBlock FontSize="20" FontWeight="Bold" Margin="0,0,0,10" Text="サンプルツール"/>
            <TextBox Margin="0,0,0,10" Text="{Binding Message, UpdateSourceTrigger=PropertyChanged}"/>
            <TextBlock Foreground="Blue" Text="{Binding Message}"/>
        </StackPanel>
    </Grid>
</UserControl>
```

**SampleToolView.xaml.cs**
```cs
using System.Windows.Controls;

namespace YourNamespace
{
    public partial class SampleToolView : UserControl
    {
        public SampleToolView()
        {
            InitializeComponent();
        }
    }
}
```

### 実行手順

1. 上記のコードをビルドしてdllを作成します。
2. YMM4のプラグインフォルダ（`user/plugin/サンプルツール/サンプルツール.dll`）にdllを配置します。
3. YMM4を起動し、上部の「ツール」メニューから「サンプルツール」を選びます。
4. 独立したウィンドウとしてツール画面が表示されることが確認できます。