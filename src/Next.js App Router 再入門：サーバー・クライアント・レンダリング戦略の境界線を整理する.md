## Next.js App Router 再入門：サーバー・クライアント・レンダリング戦略の境界線を整理する

フロントエンド開発において、Next.js (App Router) は「どこで何が動いているのか」という境界線を再定義しました。
「結局、全部に `use client` を書いていないか？」「共通のAPI通信はどう書くのが正解か？」
こうした疑問を解消するため、設計思想から実装パターンまでを整理します。

### 1. なぜ「サーバー」で動かすのが基本なのか？
Next.jsのデフォルトはサーバーコンポーネントです。これには明確な理由があります。

* **ゼロ・バンドルサイズ:** サーバーで実行されるライブラリ（Markdown解析など）はブラウザに送られません。
* **セキュアなリソースアクセス:** DBやAPIキーをブラウザ側に露出させずに処理できます。
* **データ取得の効率化:** サーバーからDBへの通信は、クライアントからの通信より低遅延で安定しています。

### 2. 実装サンプル：サーバー・クライアントでの通信メソッドの共有

「外部API（お天気APIやMicroCMSなど）を叩く処理」は、サーバーとクライアントの両方で必要になることがあります。これを疎結合に保つためのパターンを紹介します。

#### ① 通信ロジックの共通化 (`lib/api.ts`)
ブラウザとNode.jsの両方で動作する `fetch` を使い、環境変数に注意して実装します。

```typescript
// lib/api.ts
// NEXT_PUBLIC_ をつけない変数はサーバーサイドでのみ参照可能
const API_BASE_URL = process.env.NEXT_PUBLIC_API_URL || 'https://api.example.com';

export async function getPostData(id: string) {
  const res = await fetch(`${API_BASE_URL}/posts/${id}`, {
    // サーバーコンポーネントで呼ぶ際はNext.jsのキャッシュ機能が働く
    next: { revalidate: 3600 }, 
  });

  if (!res.ok) throw new Error('Failed to fetch data');
  return res.json();
}
```

#### ② サーバーコンポーネントでの利用 (`app/posts/[id]/page.tsx`)
直接 `async/await` で呼び出します。これが最も推奨される「静的生成」の形です。

```tsx
// サーバーコンポーネント
import { getPostData } from '@/lib/api';

export default async function Page({ params }: { params: { id: string } }) {
  const data = await getPostData(params.id);

  return (
    <article>
      <h1>{data.title}</h1>
      <p>{data.content}</p>
    </article>
  );
}
```

#### ③ クライアントコンポーネントでの利用 (`components/RefreshButton.tsx`)
ユーザー操作をトリガーに、ブラウザから同じメソッドを呼び出します。

```tsx
"use client";
import { getPostData } from '@/lib/api';
import { useState } from 'react';

export default function RefreshButton({ id }: { id: string }) {
  const [data, setData] = useState(null);

  const handleClick = async () => {
    // ブラウザから直接外部APIを叩く
    const updated = await getPostData(id);
    setData(updated);
  };

  return <button onClick={handleClick}>最新情報を取得</button>;
}
```

### 3. 「use-static / use-dynamic」は存在しない
Next.jsには実行タイミングを宣言するキーワードはありません。代わりに、コード内の「不確定要素」から自動判別します。

* **Static（○）:** 外部への依存がない、またはキャッシュされた `fetch` のみを使用。ビルド時に解決。
* **Dynamic（ƒ）:** `cookies()`, `headers()`, または `cache: 'no-store'` の使用。リクエスト時に解決。



### 4. セキュリティの注意点：`server-only`
共有メソッドを作る際、誤って「DBのパスワード」などを含む関数をクライアント側にインポートしてはいけません。サーバー専用にしたいファイルには `import 'server-only'` を記述しましょう。ビルド時にエラーを吐いてくれるため、事故を未然に防げます。

### まとめ：ハイブリッドな設計思想
1.  **データ取得は可能な限り「サーバー」で行う。**
2.  **インタラクションが必要な末端のコンポーネントだけを `use client` にする。**
3.  **共通メソッドは `fetch` をベースに作成し、サーバー/クライアント双方で活用する。**

この「適材適所」の感覚を掴むことで、Next.jsの真価である「爆速な表示」と「リッチな体験」の両立が可能になります。