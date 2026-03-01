# CLIツールにGoogleログイン（OAuth 2.0）を組み込む仕組みと実装ガイド

自作のCLIツールで「Googleでログイン」機能を実装したい場合、Webサービスとは異なる**「パブリッククライアント」**特有の設計が必要になります。本記事では、その標準的な仕組みである「Authorization Code Flow with PKCE」と、Go言語の定番フレームワーク **Cobra** を使った実装方法を解説します。

---

## 1. CLIログインの仕組み：ローカルループバック

CLIにはブラウザがないため、ログインを完結させるために**一時的なローカルWebサーバー**を立ち上げる手法が一般的です。

### 認証の流れ

1. **認可URLの生成**: CLIがGoogleの認可エンドポイントURLを作成します。
    
2. **待機**: CLI内部で一時的なHTTPサーバー（例: `localhost:8080`）を起動します。
    
3. **ブラウザ起動**: ユーザーの標準ブラウザで認可URLを開きます。
    
4. **ユーザー認証**: ユーザーがブラウザ上でGoogleログインを承認します。
    
5. **リダイレクト**: Googleが認可コードを `http://localhost:8080?code=...` に送信します。
    
6. **トークン交換**: CLIがそのコードをキャッチし、バックエンドでGoogleと通信して「アクセストークン」を取得します。
    

---

## 2. Go + Cobra による実装

### 依存ライブラリのインストール

Bash

```
go get github.com/spf13/cobra
go get golang.org/x/oauth2
go get golang.org/x/oauth2/google
```

### 実装コード例 (`cmd/login.go`)

以下は、`login` コマンドを実行するとブラウザが開き、認証後にトークンを表示する最小構成のコードです。

Go

```go
package cmd

import (
	"context"
	"fmt"
	"net/http"
	"os/exec"
	"runtime"

	"github.com/spf13/cobra"
	"golang.org/x/oauth2"
	"golang.org/x/oauth2/google"
)

var loginCmd = &cobra.Command{
	Use:   "login",
	Short: "Googleアカウントでログイン",
	Run: func(cmd *cobra.Command, args []string) {
		handleLogin()
	},
}

func handleLogin() {
	ctx := context.Background()

	// 1. OAuth2 設定
	// ClientID/Secret は Google Cloud Console で「デスクトップアプリ」として作成したもの
	conf := &oauth2.Config{
		ClientID:     "YOUR_CLIENT_ID.apps.googleusercontent.com",
		ClientSecret: "YOUR_CLIENT_SECRET",
		Scopes:       []string{"https://www.googleapis.com/auth/userinfo.email"},
		Endpoint:     google.Endpoint,
		RedirectURL:  "http://localhost:18080",
	}

	// 2. 認可コード受け取り用のチャネル
	codeChan := make(chan string)

	// 3. ローカルサーバーの起動
	server := &http.Server{Addr: ":18080"}
	http.HandleFunc("/", func(w http.ResponseWriter, r *http.Request) {
		code := r.URL.Query().Get("code")
		if code != "" {
			fmt.Fprintf(w, "ログインが完了しました。ターミナルに戻ってください。")
			codeChan <- code // コードをメイン処理に送る
		}
	})

	go func() {
		if err := server.ListenAndServe(); err != http.ErrServerClosed {
			fmt.Printf("Server error: %v\n", err)
		}
	}()

	// 4. ブラウザで認証ページを開く
	authURL := conf.AuthCodeURL("state-token", oauth2.AccessTypeOffline)
	fmt.Printf("ブラウザを開いています...\n%s\n", authURL)
	openBrowser(authURL)

	// 5. コード取得までブロック
	code := <-codeChan
	
	// 6. トークン交換
	tok, err := conf.Exchange(ctx, code)
	if err != nil {
		fmt.Printf("トークン交換失敗: %v\n", err)
		return
	}

	fmt.Println("\nログイン成功！")
	fmt.Printf("Access Token: %s\n", tok.AccessToken)

	// サーバーをクリーンアップ
	server.Shutdown(ctx)
}

// OSごとにブラウザを開く補助関数
func openBrowser(url string) {
	var err error
	switch runtime.GOOS {
	case "linux":
		err = exec.Command("xdg-open", url).Start()
	case "windows":
		err = exec.Command("rundll32", "url.dll,FileProtocolHandler", url).Start()
	case "darwin":
		err = exec.Command("open", url).Start()
	}
	if err != nil {
		fmt.Printf("ブラウザを自動で開けませんでした: %v\n", err)
	}
}
```

---

## 3. 実践的なアドバイス

### セキュリティ：PKCEの導入

CLI（パブリッククライアント）はバイナリを解析されると Client Secret が漏洩するリスクがあります。そのため、現在は **PKCE (Proof Key for Code Exchange)** を併用するのがベストプラクティスです。`golang.org/x/oauth2` を使う場合、`S256` チャレンジを生成して `AuthCodeURL` のオプションに渡すことで実装可能です。

### トークンの保存先

取得した `tok.AccessToken` や `tok.RefreshToken` は、平文のファイルではなく、OS標準のセキュアなストレージに保存することを検討してください。

- **macOS**: Keychain
    
- **Linux**: Secret Service / libsecret
    
- **Windows**: Credential Locker
    

Goでは [keyring](https://github.com/zalando/go-keyring) ライブラリなどを使うと簡単に扱えます。

---

## まとめ

CLIでのGoogleログインは、「ローカルWebサーバーを立ててリダイレクトを待ち受ける」という少しトリッキーな動きをします。しかし、この流れを理解すれば、Google以外の多くのSaaS（GitHubやAWSなど）のCLIログインも同じ仕組みで実装できることがわかるはずです。
