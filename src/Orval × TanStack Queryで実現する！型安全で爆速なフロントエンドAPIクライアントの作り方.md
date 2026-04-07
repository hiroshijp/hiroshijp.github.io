# Orval × TanStack Queryで実現する！型安全で爆速なフロントエンドAPIクライアントの作り方

こんにちは！フロントエンド開発におけるAPI連携、皆さんはどう実装していますか？

手書きで `fetch` や `axios` のラッパー関数を作り、型定義をチマチマと同期し、Reactの `useEffect` と `useState` でローディング状態を管理する……。そんな「API通信のボイラープレート地獄」に疲弊している方も多いのではないでしょうか。

今回は、そんなフロントエンドのAPI連携を劇的に快適にする**「Orval + TanStack Query」**の最強コンビについて解説します。OpenAPI（Swagger）の仕様書から、型安全なデータフェッチ用Hooksを全自動生成する構成です。

---

## 🚀 なぜこの組み合わせが最強なのか？

結論から言うと、この構成を採用することで以下のメリットが得られます。

- **完全な型安全**: OpenAPIの定義がそのままTypeScriptの型になります。バックエンドの仕様変更があれば、フロントエンドのビルド時に型エラーとして気づけます。
    
- **ボイラープレートの消滅**: 通信処理やキャッシュ管理のコードを手書きする必要がなくなります。
    
- **最高のUX**: TanStack Queryの強力なキャッシュ機能により、画面遷移時のローディングを極限まで減らせます。
    

では、さっそく具体的な実装と、その裏側で何が起きているのかを見ていきましょう！

---

## 🛠️ Step 1: OpenAPIからHooksを自動生成する

まずはOrvalを使って、API仕様書からコードを生成します。

必要なパッケージをインストールします。

Bash

```
npm install @tanstack/react-query axios
npm install -D orval
```

次に、プロジェクトのルートに `orval.config.ts` を配置します。

TypeScript

```
import { defineConfig } from 'orval';

export default defineConfig({
  sampleApi: {
    input: './openapi.yaml', // バックエンドから提供されたOpenAPI仕様書
    output: {
      target: './src/api/generated.ts',
      client: 'react-query', // TanStack Query用のコードを生成！
    },
  },
});
```

あとは `npx orval` を叩くだけ。これだけで `src/api/generated.ts` に、型定義とReact Hooks（`useGetUsers` など）がズラッと生成されます。魔法のようですね。

---

## 🧠 Step 2: TanStack Queryの「脳」をセットアップする

生成されたHooksを使う前に、アプリの根幹に `QueryClientProvider` を設定します。

TypeScript

```
// App.tsx
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { UserList } from './UserList';

// キャッシュの中央ストレージ（脳）を作成
const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      staleTime: 1000 * 60 * 5, // 5分間は裏側で再フェッチを行わない
      retry: 1,                 // エラー時は1回だけ再試行
    },
  },
});

export default function App() {
  return (
    // 脳をアプリ全体に共有
    <QueryClientProvider client={queryClient}>
      <UserList />
    </QueryClientProvider>
  );
}
```

### なぜProviderが必要なの？

このProviderは、アプリ全体の**「キャッシュストレージ兼司令塔」**です。

ある画面で取得したデータをここに一時保存（キャッシュ）しておくことで、ユーザーが別の画面から戻ってきたときに「さっきのデータ持ってるよ！」と即座に画面に表示してくれます。これにより、不必要なローディングスピナーを見せずに済むのです。

---

## 🎣 Step 3: 生成されたHooksの正体と使い方

Orvalが生成したHooksの裏側は、実はTanStack Queryの `useQuery`（取得用）や `useMutation`（更新用）をラップしたものです。それぞれの役割を見てみましょう。

### 1. データの取得・購読 (`useQuery` ベース)

データの一覧などを取得する場合は、自動生成された `useGetUsers` を使います。

TypeScript

```
import { useGetUsers } from './api/generated'; 

export function UserList() {
  // 自動生成フックを呼ぶだけ。型推論もバッチリ！
  const { data, isLoading, isError, isFetching } = useGetUsers();

  if (isLoading) return <p>初回読み込み中...</p>;
  if (isError) return <p>エラーが発生しました。</p>;

  return (
    <div>
      <h2>ユーザー一覧 {isFetching && "（裏側で更新中...）"}</h2>
      <ul>
        {data?.data.map((user) => (
          <li key={user.id}>{user.name}</li>
        ))}
      </ul>
    </div>
  );
}
```

**💡 ポイント：キャッシュの賢い管理**

通常、TanStack Queryを手書きすると `queryKey: ['users']` のようにキャッシュのキーを自分で管理する必要があります。これがタイポやキー被りの温床になるのですが、**Orvalはこの `queryKey` の生成すら自動でやってくれます。**

さらに、`isLoading`（初回ロード）と `isFetching`（キャッシュを表示しながら裏で最新データを取得中）が分かれているため、サクサク動くモダンなUIを簡単に構築できます。

### 2. データの更新 (`useMutation` ベース)

ユーザーの追加（POST）など、意図的なタイミングでデータを更新する際は `useMutation` ベースのHooksを使います。

TypeScript

```
import { useCreateUser } from './api/generated';
import { useQueryClient } from '@tanstack/react-query';

export function CreateUserForm() {
  const queryClient = useQueryClient();
  const mutation = useCreateUser({
    mutation: {
      // 成功時の黄金コンボ！
      onSuccess: () => {
        // 'users' に関するキャッシュを「古い」とマークし、最新を再フェッチさせる
        queryClient.invalidateQueries({ queryKey: ['/users'] });
        alert('登録しました！');
      }
    }
  });

  const handleSubmit = () => {
    mutation.mutate({ data: { name: '新しいユーザー' } });
  };

  return (
    <button onClick={handleSubmit} disabled={mutation.isPending}>
      {mutation.isPending ? '保存中...' : 'ユーザーを保存'}
    </button>
  );
}
```

**💡 ポイント：invalidateQueriesとの黄金コンボ**

データをPOSTした後は、現在画面に表示されている一覧データが古くなりますよね。そこで `onSuccess` の中で `queryClient.invalidateQueries` を呼びます。

これをすると、TanStack Queryは「一覧データが古くなった！」と検知し、自動的に裏側で最新の一覧を取り直して画面を更新してくれます。手動で状態を同期するバケツリレーとはここでおさらばです。

---

## 🎉 まとめ

OrvalとTanStack Queryを組み合わせることで、フロントエンドのデータフェッチ周りのDX（開発者体験）は劇的に向上します。

1. **Orval** がAPI通信の型定義と面倒な設定（Query Key管理など）をすべて隠蔽し、使いやすい「窓口」を作る。
    
2. **TanStack Query** が取得したデータを効率よく使い回し、最高の「パフォーマンス」を提供する。
    

まだ `useEffect` でデータフェッチを書いているプロジェクトがあれば、ぜひこの構成の導入を検討してみてください！世界が変わるはずです。