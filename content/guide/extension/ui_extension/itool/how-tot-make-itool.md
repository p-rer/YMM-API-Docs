# 2. YMM4ツールプラグインの実践的な実装

前章では、YMM4上に独自のウィンドウを表示する「最小構成」のツールプラグインを作成しました。しかし、実際のツール開発では単に画面を出すだけでなく、「YMM4本体のタイムラインを操作する」「現在のプロジェクト情報を読み取る」といった、YMM4本体との連携が不可欠です。

本章では、YMM4の機能にアクセスするための「依存性の注入（DI）」の仕組みと、ボタン操作などをMVVMパターンで処理するより実践的な実装手法について解説します。

---

## YMM4本体のサービスを利用する（DI機構）

YMM4のツールプラグインにおいて、本体のデータや機能（タイムライン、プロジェクト情報、アイテム操作など）にアクセスするには、**依存性の注入（Dependency Injection = DI）**という仕組みを利用します。

仕組みは非常にシンプルで、**ViewModelのコンストラクタの引数に、使いたいサービスのインターフェースを指定するだけ**です。プラグインが読み込まれる際、YMM4本体が自動的に正しいインスタンス（実体）を渡してくれます。

### 代表的なサービス（例）
YMM4が提供するAPIの仕様はバージョンによって拡張されますが、主に以下のようなサービスがインジェクト可能です（※正確なインターフェース名や仕様は、公式のAPIリファレンスやサンプルリポジトリの最新版を参照してください）。

* **`IProject` / `IProjectService` 系**：現在のプロジェクトの解像度、FPS、タイムラインの長さなどの情報。
* **`ITimeline` 系**：シークバーの現在位置や、再生・停止の制御。
* **`IItemManager` 系**：タイムラインへの新しいアイテム（テキスト、画像、音声など）の追加や削除。

---

## WPFにおけるコマンド（ICommand）の実装

MVVMパターンでは、View（XAML）に配置したボタンのクリック処理などを、Viewのコードビハインド（`.xaml.cs`）に直接書くことは推奨されません。代わりに **`ICommand`** という仕組みを使って、ViewModel内のメソッドを直接バインディングします。

.NET 10.0以降の最新の開発環境では、Microsoftが提供する `CommunityToolkit.Mvvm` パッケージ（NuGet）を導入するのが現在の主流です。これを使うと、複雑な `ICommand` の実装を省略し、属性（Attribute）をつけるだけで自動生成してくれます。

---

## 実践的なサンプルコード

ここでは「ボタンを押すと、YMM4のプロジェクト情報（またはダミーの連携処理）をメッセージとして画面に表示する」という実践的なViewModelとViewのコードを提示します。

※このサンプルでは、MVVMを補助するために `CommunityToolkit.Mvvm` を導入している想定で記述します。

### ViewModel の実装

YMM4からサービスを受け取り、ボタンが押された時のコマンド処理を実装します。

**SampleToolViewModel.cs**
```cs
using System;
using CommunityToolkit.Mvvm.ComponentModel;
using CommunityToolkit.Mvvm.Input;

namespace YourNamespace
{
    // CommunityToolkit.Mvvm の ObservableObject を継承することで
    // INotifyPropertyChanged の実装を省略できます
    public partial class SampleToolViewModel : ObservableObject
    {
        // 画面に表示するメッセージ
        [ObservableProperty]
        private string _statusMessage = "待機中...";

        // YMM4から受け取るサービスを保持する変数
        // (ここでは仮に IServiceProvider を受け取る形にしています。
        // 実際には IProjectService などのインターフェースを指定します)
        private readonly IServiceProvider _ymmService;

        // コンストラクタ（ここでYMM4からサービスが注入される）
        public SampleToolViewModel(IServiceProvider serviceProvider)
        {
            // 注入されたサービスをクラス内で使えるように保持
            _ymmService = serviceProvider;
        }

        // ボタンが押されたときに実行されるコマンド
        // RelayCommand属性をつけることで、自動的に ExecuteActionCommand が生成されます
        [RelayCommand]
        private void ExecuteAction()
        {
            try
            {
                // ここにYMM4のサービスを利用した処理を書く
                // 例: _ymmService を使ってタイムラインにアイテムを追加する等
                
                StatusMessage = $"実行完了！時刻: {DateTime.Now:HH:mm:ss}";
            }
            catch (Exception ex)
            {
                StatusMessage = $"エラーが発生しました: {ex.Message}";
            }
        }
    }
}
```

### View (XAML) の実装

ViewModelで定義した `StatusMessage` プロパティと、`ExecuteActionCommand`（`[RelayCommand]`によって自動生成されたコマンド）をバインディングします。

**SampleToolView.xaml**
```xml
<UserControl x:Class="YourNamespace.SampleToolView"
             xmlns="[http://schemas.microsoft.com/winfx/2006/xaml/presentation](http://schemas.microsoft.com/winfx/2006/xaml/presentation)"
             xmlns:x="[http://schemas.microsoft.com/winfx/2006/xaml](http://schemas.microsoft.com/winfx/2006/xaml)"
             Background="White">
    <Grid Margin="10">
        <Grid.RowDefinitions>
            <RowDefinition Height="Auto"/>
            <RowDefinition Height="Auto"/>
            <RowDefinition Height="*"/>
        </Grid.RowDefinitions>

        <TextBlock Grid.Row="0" 
                   FontSize="16" 
                   FontWeight="Bold" 
                   Text="YMM4 連携ツール" 
                   Margin="0,0,0,10"/>

        <Button Grid.Row="1" 
                Content="YMM4へ処理を実行する" 
                Command="{Binding ExecuteActionCommand}" 
                Padding="10,5" 
                Margin="0,0,0,15"/>

        <TextBlock Grid.Row="2" 
                   Text="{Binding StatusMessage}" 
                   TextWrapping="Wrap" 
                   Foreground="DarkSlateGray"/>
    </Grid>
</UserControl>
```

---

## ウィンドウのドッキングとレイアウト管理について

YMM4のツールプラグイン特有の強力な機能として、**ドッキング可能なウィンドウ（ツールペイン）**としての動作が挙げられます。

* **初期状態:** ツールメニューから起動した直後は、独立した「フローティング状態（子ウィンドウ）」として画面上に表示されます。
* **ドッキング操作:** ウィンドウのタイトルバーをドラッグし、YMM4本体の画面端（タイムラインやアイテムリストの横など）に持っていくことで、UIの一部としてドッキング（埋め込み）させることができます。
* **状態の保存:** 一度ドッキングさせると、YMM4はそのレイアウト状態を記憶します。次回YMM4を起動した際やツールを呼び出した際は、自動的に前回ドッキングした位置に復元されます。

基本的には `UserControl` を作って `IToolPlugin` に登録するだけで、この高度なドッキング機構のガワ（AvalonDockによるウィンドウ管理）はYMM4側がすべて自動でラップしてくれます。開発者は「中身のUI」と「連携ロジック」の開発に集中することができます。
>>>>