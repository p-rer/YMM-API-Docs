# 1. Direct2Dリソースとは何か

## リソースのさす意味
Direct2Dにおいて、リソースは**描画処理を成立させるために内部状態やネイティブリソース（GPUも含む）を保持するCOMオブジェクト**を意味します。
COMオブジェクトはここではWindows APIのインスタンスと思っておいてください。[^1]

ここで把握しておく点は

- 単にデータを保存している構造体ではないこと
- すべての型が`IUnknown`の派生であること
- 参照カウントによって寿命管理されていること
- 内部でネイティブリソースを保持する可能性があること
- 多くの型が `ID2D1Resource` を継承している

です。

## デバイスロストとは

Direct2Dは内部でGPUデバイスを使用しています。 しかしGPUは常に安定しているとは限りません。

デバイスロストは

- GPUドライバの再起動
- ディスプレイモード変更
- リモートデスクトップ切断
- TDR（Timeout Detection and Recovery）

などにより、GPUデバイスが無効化される現象を指します。

Direct2Dではこれが発生すると

- DeviceContextが無効になる
- そこから生成されたリソースも無効になる
- 無効になったリソースを再生成しないと、`D2DERR_RECREATE_TARGET`というエラーが発生

という結果になります。

## リソースの分類
すべてのDirect2Dリソースは次の2つに分類することができます。

- **Device-independent (デバイス非依存)**
- **Device-dependent (デバイス依存)**

この2つは明確に区別する必要があるため[^2]、この下ではそれぞれについて分けて例を挙げて解説しています。

### デバイス非依存

Factoryから直接生成される、GPUリソースを保持しないリソースで、デバイスロストの影響を受けません。ゆえに長期保持が可能です。

#### ID2D1Factory

これはリソースの生成の起点となるオブジェクトで、GPUデバイスを保持しません。したがってデバイスロストとは無関係であり、アプリ終了まで使用することができます。

内部的にはテッセレーションエンジンの初期化や設定管理、オブジェクト生成などを行います。

#### Geometry

ID2D1PathGeometryやID2D1RectangleGeometryなどを指します。

Geometryはセグメント列（Line/Bezier/Arc）や塗りつぶし方法の設定などを保持していて、この時点では三角形データやGPUバッファ情報などを保持していません。

### デバイス依存

GPUリソースを保持する可能性のあるリソースです。Factoryから生成されるDeviceContextと、それから作られるリソースで、デバイスロスト時に無効になります。その際は再生成が必要となります。

#### DeviceContext

描画命令の実行主体です。現在のターゲット、ステートキャッシュ、コマンドストリーム、GPUバックバッファ参照などを保持していて、デバイスロストで最初に無効となります。

D2D1.1以降では構造が以下のようになります：

```
Factory  
└── Device  
    └── DeviceContext
```

#### Bitmap

ビットマップはピクセルフォーマットや幅・高さのサイズに加えGPUテクスチャなどを保持します。デバイスロスト時はGPUテクスチャが破棄され、Bitmapも無効となります。

#### Brush

SolidColorBrushやBitmapBrushなどを指しますが、色値やテクスチャ参照を保持していて、DeviceContextと紐づいているために、デバイスロスト時は無効となります。

#### Effect

入力画像に対して効果を適用して出力します。内部で中間レンダーターゲットなどを保持していて、デバイスロスト時に無効となります。

#### CommandList

描画命令をバイナリ化します。GPU依存なので、デバイスロストで無効となります。

## ID2D1Resource階層

Direct2Dの多くの型は次の継承構造を持ちます。

```
IUnknown  
└── ID2D1Resource  
    └── 具体リソース（Bitmap / Brush / Geometry など）
```

`ID2D1Resource` には次のメソッドがあります。

- `GetFactory()`

このメソッドにより、そのリソースがどのFactoryから生成されたかを取得することができます。

## 実装の注意

1. デバイス非依存は長期保持してください。
2. デバイス依存は再生成が可能な設計としてください。
3. Factoryは基本的に1つを使用してください。

## サンプルコード

このコードはDirect2Dリソースの「デバイス非依存」と「デバイス依存」の違いを実際に確認する最小構成の検証コードです。

以下のことを検証しています。

1. Geometry はデバイス再生成後も使用できる
2. 古い Device 上で作成した Brush は新しい Device では使用できない
3. 新しい Device で Brush を再生成すれば描画は成功する

### C++
<details>
  <summary>コード</summary>

```cpp
#include <windows.h>
#include <d2d1_1.h>
#include <d2d1_1helper.h>
#include <d3d11.h>
#include <dxgi1_2.h>
#include <wincodec.h>
#include <wrl/client.h>
#include <iostream>

#pragma comment(lib,"d2d1.lib")
#pragma comment(lib,"d3d11.lib")
#pragma comment(lib,"dxgi.lib")
#pragma comment(lib,"windowscodecs.lib")

using Microsoft::WRL::ComPtr;

ComPtr<ID2D1Factory1> g_factory;
ComPtr<ID2D1PathGeometry> g_geometry;

ComPtr<IWICImagingFactory> g_wicFactory;
ComPtr<IWICBitmap> g_wicBitmap;

ComPtr<ID3D11Device> g_d3d;
ComPtr<IDXGIDevice> g_dxgi;
ComPtr<ID2D1Device> g_d2dDevice;
ComPtr<ID2D1DeviceContext> g_ctx;

ComPtr<ID2D1SolidColorBrush> g_oldBrush;

void CreateFactory()
{
    D2D1CreateFactory(
        D2D1_FACTORY_TYPE_SINGLE_THREADED,
        __uuidof(ID2D1Factory1),
        nullptr,
        reinterpret_cast<void**>(g_factory.GetAddressOf()));

    CoInitialize(nullptr);
    CoCreateInstance(
        CLSID_WICImagingFactory,
        nullptr,
        CLSCTX_INPROC_SERVER,
        IID_PPV_ARGS(&g_wicFactory));
}

void CreateGeometry()
{
    g_factory->CreatePathGeometry(&g_geometry);

    ComPtr<ID2D1GeometrySink> sink;
    g_geometry->Open(&sink);
    sink->BeginFigure(D2D1::Point2F(0,0), D2D1_FIGURE_BEGIN_FILLED);
    sink->AddLine(D2D1::Point2F(100,0));
    sink->AddLine(D2D1::Point2F(100,100));
    sink->EndFigure(D2D1_FIGURE_END_CLOSED);
    sink->Close();

    std::cout << "Geometry created\n";
}

void CreateDevice()
{
    D3D_FEATURE_LEVEL lvl;

    D3D11CreateDevice(nullptr,
        D3D_DRIVER_TYPE_HARDWARE,
        nullptr,
        D3D11_CREATE_DEVICE_BGRA_SUPPORT,
        nullptr,0,
        D3D11_SDK_VERSION,
        &g_d3d,
        &lvl,
        nullptr);

    g_d3d.As(&g_dxgi);

    g_factory->CreateDevice(g_dxgi.Get(), &g_d2dDevice);
    g_d2dDevice->CreateDeviceContext(
        D2D1_DEVICE_CONTEXT_OPTIONS_NONE,
        &g_ctx);

    // WIC Bitmap作成（CPU側ターゲット）
    g_wicFactory->CreateBitmap(
        256,
        256,
        GUID_WICPixelFormat32bppPBGRA,
        WICBitmapCacheOnLoad,
        &g_wicBitmap);

    ComPtr<ID2D1Bitmap1> d2dBitmap;

    D2D1_BITMAP_PROPERTIES1 props =
        D2D1::BitmapProperties1(
            D2D1_BITMAP_OPTIONS_TARGET,
            D2D1::PixelFormat(
                DXGI_FORMAT_B8G8R8A8_UNORM,
                D2D1_ALPHA_MODE_PREMULTIPLIED));

    g_ctx->CreateBitmapFromWicBitmap(
        g_wicBitmap.Get(),
        &props,
        &d2dBitmap);

    g_ctx->SetTarget(d2dBitmap.Get());

    std::cout << "Device created and target set\n";
}

void Draw(ID2D1Brush* brush)
{
    g_ctx->BeginDraw();
    g_ctx->Clear(D2D1::ColorF(D2D1::ColorF::Black));
    g_ctx->FillGeometry(g_geometry.Get(), brush);
    HRESULT hr = g_ctx->EndDraw();

    if (FAILED(hr))
        std::cout << "Draw failed hr=0x" << std::hex << hr << "\n";
    else
        std::cout << "Draw success\n";
}

int main()
{
    CreateFactory();
    CreateGeometry();

    // Device A
    CreateDevice();
    g_ctx->CreateSolidColorBrush(
        D2D1::ColorF(D2D1::ColorF::Red),
        &g_oldBrush);

    std::cout << "First draw\n";
    Draw(g_oldBrush.Get());

    // Device破棄
    g_ctx.Reset();
    g_d2dDevice.Reset();
    g_dxgi.Reset();
    g_d3d.Reset();

    std::cout << "Device destroyed\n";

    // Device B
    CreateDevice();

    std::cout << "Second draw with OLD brush\n";
    Draw(g_oldBrush.Get()); // 失敗する

    ComPtr<ID2D1SolidColorBrush> newBrush;
    g_ctx->CreateSolidColorBrush(
        D2D1::ColorF(D2D1::ColorF::Green),
        &newBrush);

    std::cout << "Third draw with NEW brush\n";
    Draw(newBrush.Get()); // 成功する

    return 0;
}

```
</details>

<details>
    <summary>実行結果</summary>

```
Geometry created
Device created and target set
First draw
Draw success
Device destroyed
Device created and target set
Second draw with OLD brush
Draw failed hr=0x88990015
Third draw with NEW brush
Draw success
```
</details>

---
[^1]: 正しい意味はこの[Qiitaの記事](https://qiita.com/mintcandy/items/979a4a2669c8fc1f4f2f)がわかりやすく説明しています。
[^2]: デバイスロスト時に破棄されるかが異なるため。
