# Set メソッド

## 定義

名前空間: [YukkuriMovieMaker.Plugin.Effects](../../index.md)

アセンブリ: YukkuriMovieMaker.Plugin.dll

<br/>

参照、または式で与えられるプロパティーに値を設定し、変更があった場合YMMはそれを検知します。

## オーバーロード

| 名前                                                                                                              | 説明                                     |
| --------------------------------------------------------------------------------------------------------------- | -------------------------------------- |
| [Set<T\>(ref T, T, string, params string[])](Set.md#settref-t-t-string-params-string)                           | 参照渡しされたストレージに値を設定し、変更を通知します。           |
| [Set<T\>(Expression<Func<T\>\>, T, string, params string[])](Set.md#settexpressionfunct-t-string-params-string) | プロパティーセレクターを使用してプロパティーに値を設定し、変更を通知します。 |

## Set<T\>(ref T, T, string, params string\[])

参照で指定したプロパティーに値を設定し、変更があった場合YMMにそれを通知します。

```csharp
protected override bool Set<T>(ref T storage, T value, [CallerMemberName] string name = "", params string[] etcChangedPropertyNames);
```

#### 型パラメーター

`T`

設定するプロパティーの型。

#### パラメーター

`storage` T

変更するプロパティーへの参照。

<br/>

`value` T

`storage`に設定する設定する新しい値。

<br/>

`name` [String](https://learn.microsoft.com/ja-jp/dotnet/api/system.string)

変更されるプロパティー名。指定がない場合、呼び出し元の名前が自動で設定されます。

属性 [CallerMemberName](https://learn.microsoft.com/ja-jp/dotnet/api/system.runtime.compilerservices.callermembernameattribute)

<br/>

`etcChangedPropertyNames` [String](https://learn.microsoft.com/ja-jp/dotnet/api/system.string)\[]

値の変更通知が必要な他のプロパティー名を可変長引数として指定します。複数のプロパティーが関係する場合に利用されます。

## Set<T\>(Expression<Func<T\>\>, T, string, params string\[])

式で与えられたプロパティーに値を設定し、変更があった場合YMMにそれを通知します。

```csharp
protected override bool Set<T>(Expression<Func<T>> propertySelector, T value, [CallerMemberName] string name = "", params string[] etcChangedPropertyNames);
```

#### 型パラメーター

`T`

設定するプロパティーの型。

#### プロパティー

`propertySelector` [Expression](https://learn.microsoft.com/ja-jp/dotnet/api/system.linq.expressions.expression-1)<[Func](https://learn.microsoft.com/ja-jp/dotnet/api/system.func-1)<T\>\>

値を格納するプロパティーを選択する式。

<br/>

`value` T

`propertySelector`で指定したプロパティーに設定する新しい値。

<br/>

`name` [String](https://learn.microsoft.com/ja-jp/dotnet/api/system.string)

変更されるプロパティー名。指定がない場合、呼び出し元の名前が自動で設定されます。

属性 [CallerMemberName](https://learn.microsoft.com/ja-jp/dotnet/api/system.runtime.compilerservices.callermembernameattribute)

<br/>

`etcChangedPropertyNames` [String](https://learn.microsoft.com/ja-jp/dotnet/api/system.string)\[]

値の変更通知が必要な他のプロパティー名を可変長引数として指定します。複数のプロパティーが関係する場合に利用されます。