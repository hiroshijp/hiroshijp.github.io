# AIチャットでよくみるUIについて

ChatGPTやGeminiなどのLLM（大規模言語モデル）を使ったサービスを使っていると、回答のテキストが「パラパラと1文字ずつ」順番に表示されていくお馴染みのUIがありますよね。

一見すると「人間がタイピングしているように見せるための演出」のように思えるかもしれませんが、実はこれは**LLMの仕組み上の制約と、ユーザー体験（UX）を両立させるための理にかなった技術**です。

今回は、あのストリーミングUIがどのようなアーキテクチャで動いているのか、そしてGoとJavaScriptを使った具体的な実装方法について解説します。

## なぜ1文字ずつ表示するのか？

LLMは回答の文章を一度に丸ごと生成しているわけではありません。「トークン」と呼ばれる単語や文字の切れ端を、確率計算によって1つずつ順番に予測して生成しています。

長文になると生成完了までに数十秒かかることもあるため、すべて完成するまで画面をローディング状態にしてしまうと、ユーザーは「フリーズしたのでは？」と離脱してしまいます。そこで、**サーバー側で生成できた文字から順番にクライアントへ送り続け、届いた端から画面に描画していく**ストリーミング技術が採用されています。

全体のアーキテクチャは以下の3ステップのリレーになります。

1. **バックエンド（LLM）:** 1文字ずつテキストを生成する。
2. **ネットワーク:** 生成されたデータの破片（チャンク）をできたそばから通信に乗せる。
3. **フロントエンド:** データを受信するたびに、現在のテキストの末尾に継ぎ足して再描画する。

## フロントエンドの実装（JavaScript）

特別なライブラリは不要で、ブラウザ標準の `Fetch API` と `ReadableStream` で実装できます。

```javascript
async function startStreaming() {
  const chatBox = document.getElementById('chat-box');
  chatBox.innerText = ""; 
  let accumulatedText = "";

  const response = await fetch('http://localhost:8080/chat', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ prompt: "こんにちは！" })
  });

  const reader = response.body.getReader();
  const decoder = new TextDecoder('utf-8');

  while (true) {
    const { done, value } = await reader.read();
    if (done) break;

    // stream: true で日本語のマルチバイト文字の途切れ（文字化け）を防ぐ
    accumulatedText += decoder.decode(value, { stream: true });
    chatBox.innerText = accumulatedText;
  }
}

```

ポイントは `response.body.getReader()` を使うことです。これによって、全データを受信するのを待たずに、届いた小包から順番に開封して処理することができます。

## バックエンドの実装（Go + Gemini API）

Go言語は並行処理が得意であり、このようなストリーミングサーバーの構築に非常に適しています。今回はGemini APIを例に実装します。

```go
package main

import (
	"context"
	"fmt"
	"log"
	"net/http"
	"os"

	"github.com/google/generative-ai-go/genai"
	"google.golang.org/api/iterator"
	"google.golang.org/api/option"
)

func chatHandler(w http.ResponseWriter, r *http.Request) {
	// ストリーミング用のヘッダー設定
	w.Header().Set("Content-Type", "text/plain; charset=utf-8")
	w.Header().Set("Cache-Control", "no-cache")
	w.Header().Set("Connection", "keep-alive")

	flusher, ok := w.(http.Flusher)
	if !ok {
		http.Error(w, "Streaming unsupported", http.StatusInternalServerError)
		return
	}

	ctx := context.Background()
	client, _ := genai.NewClient(ctx, option.WithAPIKey(os.Getenv("GEMINI_API_KEY")))
	defer client.Close()

	model := client.GenerativeModel("gemini-2.5-flash")
	
	// Streamメソッドで生成開始
	iter := model.GenerateContentStream(ctx, genai.Text("こんにちは！"))

	for {
		resp, err := iter.Next()
		if err == iterator.Done { break }
		if err != nil { break }

		for _, c := range resp.Candidates {
			if c.Content != nil {
				for _, part := range c.Content.Parts {
					fmt.Fprint(w, part)
					// バッファに溜めず、即座にフロントエンドへデータを押し出す
					flusher.Flush() 
				}
			}
		}
	}
}

func main() {
	http.HandleFunc("/chat", chatHandler)
	log.Fatal(http.ListenAndServe(":8080", nil))
}

```

ここで最も重要なのが `flusher.Flush()` です。通常、Goのサーバーは効率化のためにある程度データが溜まってから送信しようとしますが、Flushを呼ぶことで「少しでもデータができたら今すぐ送れ」と強制することができます。

---

> ### 💡 コラム：htmxを使った超シンプルな実装アプローチ
> 
> 
> 最近注目を集めている**htmx**を使えば、JavaScriptを1行も書かずにこのUIを実現することも可能です。複雑な状態管理が不要な管理画面などでは、強力な選択肢になります。
> htmxのSSE（Server-Sent Events）拡張機能を使えば、HTML側に以下のように記述するだけです。
> ```html
> <div hx-ext="sse" sse-connect="http://localhost:8080/chat-stream">
>   <div sse-swap="message" hx-swap="beforeend"></div>
> </div>
> 
> ```
> 
> 
> サーバー側（Go）は、送信フォーマットを `data: {テキスト}\n\n` というSSEの規格に合わせるだけで動きます。
> ただし、LLM特有の「Markdown形式のテキスト」をリアルタイムにリッチに装飾して表示したい場合は、そのままHTMLに追記するとタグが壊れるなどの問題が発生します。プレーンテキストのみを扱うシンプルな用途であれば、htmxは最高の開発体験を提供してくれます。

