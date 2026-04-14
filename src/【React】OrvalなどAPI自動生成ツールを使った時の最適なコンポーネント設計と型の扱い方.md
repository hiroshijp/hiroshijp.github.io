
# 【React】OrvalなどAPI自動生成ツールを使った時の最適なコンポーネント設計と型の扱い方

フロントエンド開発において、OpenAPIのスキーマからAPIクライアントや型定義、さらにはReact QueryのHooksまで自動生成してくれる **Orval** などのツールは、もはや欠かせない存在になりつつあります。

しかし、これらのツールを導入した際、多くのReact開発者がぶつかる壁があります。

**「自動生成されたAPIのレスポンス型を、コンポーネント間でどうやって受け渡すべきか？」**

今回は、この課題に対する最適な設計アプローチと、具体的な実装パターンについて解説します。

## ❌ アンチパターン：生成モデルをそのままUIに渡す（密結合）

開発初期にやってしまいがちなのが、親コンポーネントで取得したデータ（DTOなど）を、そのまま子コンポーネントのPropsとして渡してしまう設計です。

```tsx
// ❌ 避けるべき設計：UIコンポーネントがAPI仕様を熟知してしまっている
import { Components } from '@/generated/api';

type Props = {
  user: Components.Schemas.UserDto; // 自動生成された型に直接依存
};

export const UserCard = ({ user }: Props) => (
  <div>
    <img src={user.profile_image_url} alt="profile" />
    <p>{user.first_name} {user.last_name}</p>
  </div>
);
```

一見シンプルで実装も早いですが、運用が進むにつれて以下の問題が浮き彫りになります。

1. **バックエンドの変更に極めて弱い**
   APIのレスポンススキーマが変わった瞬間、影響範囲が親（データフェッチ層）だけでなく、その型を参照しているすべての末端UIコンポーネントにまで波及します。
2. **Storybook（カタログ）が辛くなる**
   コンポーネントのテストやStorybookでモックデータを作る際、UIに関係のない必須プロパティ（例：`created_at` や `is_deleted` など）まで全て用意しなければならず、開発体験が悪化します。

## 🌟 ベストプラクティス：Container / Presenter で境界線を引く

中〜大規模なアプリケーションで推奨されるのは、**「親コンポーネントで取得・変換し、子コンポーネント専用の型で渡す」** というアプローチです。いわゆるContainer / Presenterパターンの考え方です。

### 1. Presenter（子コンポーネント）の設計
UIコンポーネントは「APIの形」を一切知らず、純粋に描画に必要な最小限の型だけを自前で定義します。

```tsx
// ✅ 推奨される設計：UIコンポーネントは独自の型を持つ
type UserCardProps = {
  name: string;
  avatarUrl: string;
};

export const UserCard = ({ name, avatarUrl }: UserCardProps) => (
  <div>
    <img src={avatarUrl} alt="profile" />
    <p>{name}</p>
  </div>
);
```
これにより、Storybookでのモック化が劇的に簡単になり、コンポーネントの汎用性・再利用性も高まります。

### 2. Container（親コンポーネント）の設計
親コンポーネントは、Orvalが生成したHooksを使ってデータを取得し、それを子コンポーネントのPropsの形に**マッピング（変換）**して渡す責務を担います。

```tsx
// ✅ 親（Container）でAPIモデルとUIモデルの変換を行う
import { useGetUser } from '@/generated/api';
import { UserCard } from './UserCard';

export const UserPage = ({ userId }: { userId: string }) => {
  const { data: userDto, isLoading } = useGetUser(userId);
  
  if (isLoading) return <p>Loading...</p>;
  if (!userDto) return null;

  return (
    <UserCard 
      // ここでAPIのデータ構造から、UIが必要とする形に変換！
      name={`${userDto.first_name} ${userDto.last_name}`} 
      avatarUrl={userDto.profile_image_url} 
    />
  );
};
```
バックエンドの仕様変更が起きても、このContainer層の「変換ロジック」を修正するだけで済み、UIコンポーネントは無傷で守られます。

## 💡 一歩進んだ設計：OrvalのHooksはどこで呼ぶべきか？

親コンポーネントで `useGetUser` のような自動生成Hooksを直接呼ぶのも全く問題ありません（むしろOrvalの恩恵を一番受けられます）。

しかし、プロジェクトが成長し**「複数の画面で同じ変換ロジックを書いている」「API呼び出しに依存する複雑なビジネスロジックがある」**といったケースが出てきたら、**ドメイン領域のカスタムフックでラップする**アーキテクチャが強力です。

```tsx
// 📁 hooks/domain/useCurrentUser.ts
import { useGetUser } from '@/generated/api';

// 自動生成Hooksを隠蔽し、フロントエンドが使いやすい形に整えて返す
export const useCurrentUser = (userId: string) => {
  const { data, isLoading, error } = useGetUser(userId);

  // ドメイン層でのデータ成形
  const formattedUser = data ? {
    id: data.user_id,
    fullName: `${data.first_name} ${data.last_name}`,
    isAdmin: data.role === 'ADMIN',
  } : null;

  return {
    user: formattedUser,
    isLoading,
    error,
  };
};
```

このようにすることで、UIコンポーネント（PageやContainer）のコードはより宣言的でクリーンになり、APIクライアントの自動生成ツールという強力な武器を、負債にすることなく使い倒すことができます。

## まとめ

* 自動生成されたAPIモデルを、末端のUIコンポーネントまで引き回すのは避ける。
* UIコンポーネントは専用の型（Props）を定義し、APIの知識から切り離す。
* 親コンポーネント（またはカスタムフック）を「変換層（アダプター）」として機能させる。

