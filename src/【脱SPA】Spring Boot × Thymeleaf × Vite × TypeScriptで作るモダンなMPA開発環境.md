# 【脱SPA】Spring Boot × Thymeleaf × Vite × TypeScriptで作るモダンなMPA開発環境

## はじめに
最近のWeb開発といえば「バックエンドはAPI化し、フロントエンドはReactやNext.jsでSPA（Single Page Application）を作る」というアーキテクチャがすっかり主流になりました。

しかし、社内向けの管理画面やシンプルなCRUDアプリを作る際、「わざわざフロントエンドのルーティングや状態管理を作り込むのはオーバースペックでは？」「SEOや初回表示速度を考えると、従来のMPA（Multi-Page Application）の方が適しているのでは？」と感じることも多いはずです。

そこで今回は、**Spring Boot + Thymeleafという王道のサーバーサイドレンダリング（SSR）環境を活かしつつ、フロントエンドの処理にはViteとTypeScriptを導入する**という、「いいとこ取り」のアプローチをご紹介します。

## この構成のメリット
1. **初回表示が速い:** Thymeleafが完成したHTMLを返すため、SPA特有の「最初は真っ白」がありません。SEOにも強いです。
2. **型安全なフロントエンド:** 複雑なフォームバリデーションやDOM操作を、TypeScriptの恩恵を受けながら安全に記述できます。
3. **ルーティングがシンプル:** URLの管理や画面遷移はすべてSpring MVC（Java側）にお任せできます。
4. **開発体験（DX）が最高:** Viteによる爆速ビルドと、Spring Boot DevToolsを組み合わせることで、サクサク開発できます。

## アーキテクチャの全体像
SPAにするわけではないので、TypeScriptは画面全体を描画しません。Thymeleafが生成したHTMLに対して、**「部分的に動きをつける（DOM操作や非同期通信を行う）」**という役割に徹します。

ディレクトリ構成は以下のようになります。

```text
my-spring-app/
 ├── build.gradle
 ├── package.json        // Node.jsとViteの管理
 ├── vite.config.ts      // Viteのビルド設定
 ├── src/
 │    ├── main/
 │    │    ├── java/          # Springのコントローラー群
 │    │    ├── resources/
 │    │    │    ├── templates/ # Thymeleaf (index.html 等)
 │    │    │    └── static/    # [自動生成] Viteの出力先
 │    │    │         └── assets/
 │    │    └── frontend/      # TypeScriptのソースコード！
 │    │         └── main.ts
```

## 実装ステップ

### 1. フロントエンド環境のセットアップ
まずはSpring Bootプロジェクトのルートディレクトリで、`package.json` を作成し、必要なパッケージをインストールします。

```bash
npm init -y
npm install -D vite typescript
```

### 2. Viteの設定 (`vite.config.ts`)
ここが一番のキモです。ViteがビルドしたJavaScriptファイルを、Spring Bootが読み込める静的リソースフォルダ（`static`）に直接出力するように設定します。

```typescript
import { defineConfig } from 'vite';
import { resolve } from 'path';

export default defineConfig({
  build: {
    // 出力先をSpringのstaticフォルダに指定
    outDir: 'src/main/resources/static',
    // ビルドのたびに古いファイルを削除
    emptyOutDir: true,
    rollupOptions: {
      input: {
        // エントリーポイントを指定
        main: resolve(__dirname, 'src/main/frontend/main.ts'),
      },
      output: {
        // ハッシュ値をつけず、固定のファイル名で出力する（Thymeleafから読み込みやすくするため）
        entryFileNames: 'assets/[name].js',
        chunkFileNames: 'assets/[name].js',
        assetFileNames: 'assets/[name].[ext]'
      }
    }
  }
});
```

開発用に `package.json` の `scripts` も追記しておきます。

```json
"scripts": {
  "dev": "vite build --watch",
  "build": "vite build"
}
```

### 3. TypeScriptコードの記述
フロントエンドの処理を書きます。今回は例としてシンプルなクリックイベントを実装します。

```typescript
// src/main/frontend/main.ts
document.addEventListener('DOMContentLoaded', () => {
  const button = document.getElementById('action-btn') as HTMLButtonElement;
  const message = document.getElementById('message') as HTMLParagraphElement;

  if (button && message) {
    button.addEventListener('click', () => {
      message.textContent = 'TypeScriptから操作しました！🎉';
      message.style.color = '#10b981'; // Tailwindのemerald-500
    });
  }
});
```

### 4. Thymeleafからの読み込み
Spring Boot側で作成するHTMLに、ビルドされたJSファイルを読み込ませます。

```html
<!DOCTYPE html>
<html xmlns:th="http://www.thymeleaf.org">
<head>
    <meta charset="UTF-8">
    <title>Spring Boot + Vite + TS</title>
</head>
<body>
    <h1>モダンMPAの世界へようこそ</h1>
    <p id="message">ボタンを押してください</p>
    <button id="action-btn">クリック</button>

    <script th:src="@{/assets/main.js}"></script>
</body>
</html>
```

## 快適な開発ワークフロー
開発中は、ターミナルを2つ開いて以下のコマンドを実行します。

1. **フロントエンドの監視（ターミナル1）**
   `npm run dev`
   ※TypeScriptを保存するたびに、一瞬でビルドされて `static/assets/main.js` が上書きされます。

2. **バックエンドの起動（ターミナル2 または IDE）**
   `./gradlew bootRun` （または IntelliJ等の実行ボタン）

### 💡 さらに便利にするコツ
Spring Bootの依存関係に `spring-boot-devtools` を入れておきましょう。
TSファイルを保存してViteがJSを再生成すると、DevToolsがその変更を検知してくれます。ブラウザのLiveReload機能と組み合わせれば、**「TSを保存した瞬間にブラウザが自動リロードされる」**という、SPA顔負けのシームレスな開発体験が手に入ります。

## おわりに
SPA全盛期の今だからこそ、「画面はサーバーで作り、リッチにしたい部分だけTypeScriptで装飾する」という昔ながらのMPAアプローチが見直されています。

Viteの圧倒的なビルドスピードのおかげで、Javaエンジニアにとってもフロントエンド環境の構築が非常に手軽になりました。社内システムや中規模なWebアプリケーションを作る際は、ぜひこの「Spring Boot × Vite」構成を試してみてください！