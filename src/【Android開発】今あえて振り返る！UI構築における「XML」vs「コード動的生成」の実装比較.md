# 【Android開発】今あえて振り返る！UI構築における「XML」vs「コード動的生成」の実装比較

最近はすっかりJetpack Composeが話題の中心ですが、長年稼働しているプロダクトの保守や、AndroidのViewシステムの根本を理解する上で、従来のUI構築手法を知っておくことはまだまだ重要です。

今回は、Jetpack Composeを使わない従来のアプローチである**「XMLによる宣言的UI」**と、**「Kotlinコードによる動的生成」**について、同じUIを作りながらメリット・デメリットを比較してみます！

## 作成するお題：シンプルな挨拶画面
比較のために、以下の超シンプルな画面を作ります。

* **親レイアウト:** 画面全体、要素は縦並びで中央揃え、内側に余白（16dp）
* **テキスト:** 「こんにちは！」（24sp）
* **ボタン:** 「クリック」（横幅いっぱい、上部に余白16dp）

それでは、さっそく2つのアプローチを見ていきましょう。

---

## アプローチ1：王道の「XML」スタイル

まずは、Android開発者にとって最も親しみのあるXMLを使った方法です。

### UIの定義 (`activity_main.xml`)
```xml
<?xml version="1.0" encoding="utf-8"?>
<LinearLayout xmlns:android="http://schemas.android.com/apk/res/android"
    android:layout_width="match_parent"
    android:layout_height="match_parent"
    android:orientation="vertical"
    android:gravity="center"
    android:padding="16dp">

    <TextView
        android:id="@+id/titleTextView"
        android:layout_width="wrap_content"
        android:layout_height="wrap_content"
        android:text="こんにちは！"
        android:textSize="24sp" />

    <Button
        android:id="@+id/actionButton"
        android:layout_width="match_parent"
        android:layout_height="wrap_content"
        android:layout_marginTop="16dp"
        android:text="クリック" />

</LinearLayout>
```

### UIの読み込み (`MainActivity.kt`)
```kotlin
class MainActivity : AppCompatActivity() {
    override fun onCreate(savedInstanceState: Bundle?) {
        super.onCreate(savedInstanceState)
        // 魔法の1行！これだけでUIが表示されます
        setContentView(R.layout.activity_main)
    }
}
```

**💡 ココがポイント**
圧倒的な見通しの良さです。タグの入れ子構造を見れば、そのまま画面の構造がイメージできますよね。Android StudioのLayout Editorを使えばリアルタイムでプレビューできるため、UIデザインの調整もサクサク進みます。ビジネスロジック（Kotlin）と見た目（XML）が完全に分離されているのも素晴らしい点です。

---

## アプローチ2：全部俺がやる「コード動的生成」スタイル

次に、XMLを一切使わず、KotlinのコードだけでViewを生成して組み立てていく手法です。

### UIの構築と表示 (`MainActivity.kt`)
```kotlin
class MainActivity : AppCompatActivity() {
    override fun onCreate(savedInstanceState: Bundle?) {
        super.onCreate(savedInstanceState)

        // 1. px変換の壁（dpは直接使えない！）
        val scale = resources.displayMetrics.density
        val padding16px = (16 * scale + 0.5f).toInt()

        // 2. 親レイアウトの生成
        val rootLayout = LinearLayout(this).apply {
            layoutParams = ViewGroup.LayoutParams(
                ViewGroup.LayoutParams.MATCH_PARENT,
                ViewGroup.LayoutParams.MATCH_PARENT
            )
            orientation = LinearLayout.VERTICAL
            gravity = Gravity.CENTER
            setPadding(padding16px, padding16px, padding16px, padding16px)
        }

        // 3. TextViewの生成
        val titleTextView = TextView(this).apply {
            layoutParams = LinearLayout.LayoutParams(
                LinearLayout.LayoutParams.WRAP_CONTENT,
                LinearLayout.LayoutParams.WRAP_CONTENT
            )
            text = "こんにちは！"
            textSize = 24f // ※textSizeはデフォルトでsp扱い
        }

        // 4. Buttonの生成（マージンの設定が少し面倒）
        val actionButton = Button(this).apply {
            layoutParams = LinearLayout.LayoutParams(
                LinearLayout.LayoutParams.MATCH_PARENT,
                LinearLayout.LayoutParams.WRAP_CONTENT
            ).apply {
                topMargin = padding16px
            }
            text = "クリック"
        }

        // 5. 組み立て
        rootLayout.addView(titleTextView)
        rootLayout.addView(actionButton)

        // 6. 画面にセット
        setContentView(rootLayout)
    }
}
```

**💡 ココがポイント**
同じUIを作っているのに、コード量が跳ね上がりました。
特に厄介なのが**「単位の変換」**と**「LayoutParams」**です。コード上ではパディングやマージンに `dp` を直接指定できず、端末の画面密度を計算して `px` に変換する泥臭い処理が必要になります。また、階層構造がコードの順序でしか表現されないため、レイアウトが複雑になると「今どのViewをどこに追加しているのか」が迷子になりがちです。

---

## まとめ：どう使い分けるべきか？

コードで動的生成する方法は、XMLのパース処理を省けるため理論上は最速ですが、メンテナンス性を犠牲にするほどの価値があるケースは稀です。

**結論：基本はXML、可変要素のみコード**

画面の8〜9割を占める固定レイアウトは素直にXMLで書き、恩恵（プレビュー機能やリソース管理）をフルに受けましょう。「APIから取得したデータの数だけグラフを生成したい」といった、**実行時にしか構造が決まらない部分だけを動的生成**して、XMLで用意した空のコンテナに `addView()` するのが、ノンCompose時代のベストプラクティスです。

皆さんのプロジェクトでは、どんな工夫をしてViewシステムと付き合っていますか？ぜひコメントで教えてください！
