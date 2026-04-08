# Typescript文法講座、Reactを添えて

ReactとTypeScriptの組み合わせは、現在のフロントエンド開発におけるデファクトスタンダードです。しかし、いざ書き始めると「この型はどう定義するの？」「この記号（`...` や `?.`）は何？」と手が止まってしまうことも多いはずです。

この記事では、Reactで開発する際によく登場するTypeScript（および最新JavaScript）の文法・概念を、実務ベースでギュッとまとめて解説します。

---

## 1. コンポーネントとPropsの基本

### `type` と `interface` （迷ったら `type`！）

コンポーネントに渡すPropsの型定義には、主にこの2つが使われます。どちらもオブジェクトの形を定義できますが、最近のReact開発では**柔軟性が高く安全な `type` に統一する**のがトレンドです。

TypeScript

```
// ? をつけると省略可能（オプショナル）になります
type ButtonProps = {
  label: string;
  onClick: () => void;
  disabled?: boolean; 
};

export const Button = ({ label, onClick, disabled = false }: ButtonProps) => {
  return <button onClick={onClick} disabled={disabled}>{label}</button>;
};
```

### React固有の型（Childrenとイベント）

Reactが用意している型を使うと、開発体験がグッと上がります。

- **`React.ReactNode`**: `children` として渡せる全ての要素（JSX、文字列など）を許可する型です。
    
- **イベントの型**: `React.ChangeEvent<HTMLInputElement>`（入力変更）や `React.MouseEvent<HTMLButtonElement>`（クリック）など、発生元を指定することで安全にイベントを扱えます。
    

---

## 2. 柔軟に型を操る（ジェネリクス・ユニオン・交差）

### ジェネリクス `<T>`

`useState` のように「どんな状態を持つか」を動的に指定する際に使います。初期値から推論できない場合に必須です。

TypeScript

```
type User = { id: number; name: string };
// 初期値がnullの場合、<User | null> と明示的に伝える
const [user, setUser] = useState<User | null>(null);
```

### ユニオン型 `|` と 交差型 `&`

- **ユニオン型 (`|`)**: 「A または B」を表します。特定の値しか受け付けないように制限（文字列リテラル型）するのに便利です。
    
- **交差型 (`&`)**: 「A かつ B」を表します。既存の型をガッチャンコして拡張したい時によく使います。
    

TypeScript

```
// ユニオン型の例
type Status = 'success' | 'error' | 'loading';

// 交差型の例（既存のPropsに新しいプロパティを追加）
type BaseProps = { id: string };
type ExtendedProps = BaseProps & { className?: string };
```

### `typeof` と `keyof` のコンボ

すでに存在するオブジェクトの値から、型を逆算して作るテクニックです。

TypeScript

```
const COLORS = { primary: '#007bff', danger: '#dc3545' } as const;
type ColorKey = keyof typeof COLORS; // "primary" | "danger" になる！
```

---

## 3. 安全で簡潔なデータ操作（JS/TS構文）

### 「...」の正体（スプレッド構文 / レスト構文）

文脈によって2つの顔を持ちます。Reactでは状態の更新やPropsの受け渡しで超頻出します。

- **スプレッド構文（展開）**: オブジェクトや配列の中身を展開します。ReactのStateを更新する際の**「イミュータビリティ（不変性）」**を保つために必須です（`push` などを直接使わず、コピーして新しいものを作る）。
    
- **レスト構文（集約）**: 一部のプロパティだけを取り出し、残りをひとまとめにします。
    

TypeScript

```
// レスト構文（title以外をrestにまとめる）
const Card = ({ title, ...rest }: CardProps) => {
  // スプレッド構文（restの中身を展開して丸投げする）
  return <div {...rest}>{title}</div>;
};
```

### オプショナルチェーン `?.` と Null合体演算子 `??`

APIから取得したデータなど、「あるかどうかわからない」値を安全に扱うための構文です。

TypeScript

```
// userがnullでもエラーにならず、addressがなければスキップされる
// 全てダメだった場合は ?? の右側（"未設定"）が表示される
const city = user?.address?.city ?? "未設定";
```

### `undefined` と `null` の違い

どちらも「データがない」ことを表しますが、実務のTypeScriptでは**「迷ったら `undefined` に統一する」**のがおすすめです。TSのオプショナルプロパティ（`?`）が自動的に `undefined` として扱われるため、コードがシンプルに保てます。

---

## 4. 宣言的UIと型ガード

### `map` と `filter`

Reactは関数型プログラミングと相性が良く、`for` ループではなく配列メソッドを使って宣言的にUIを構築します。

TypeScript

```
<ul>
  {todos.filter(t => t.completed).map(t => (
    <li key={t.id}>{t.text}</li>
  ))}
</ul>
```

### ユーザー定義型ガード（`is`）

`filter` などを通した後にTSがうまく型を推論できない場合、「この変数はこの型だ」とTSに教え込む関数を作れます。

TypeScript

```
const isString = (item: string | null): item is string => item !== null;
const stringsOnly = mixedArray.filter(isString); // string[] として推論される
```

---

## 5. 知っておくと便利な独特なキーワード

最後に、JS/TSならではの少し特殊なキーワードを紹介します。

- **`debugger`**: コードに書いておくと、ブラウザの開発者ツールを開いている際にそこで処理が一時停止します。バグ調査の最強の味方です。
    
- **`in`**: オブジェクトの中に特定のキーが存在するかを確認します（例: `"price" in data`）。
    
- **`readonly`**: プロパティを「変更不可」にします。Reactのイミュータビリティを型レベルで強制できるため非常に有用です。
    
- **`as` (型アサーション)**: TypeScriptの推論を強制的に上書きします（例: `element as HTMLInputElement`）。強力ですが、多用すると型の安全性が壊れるため**「最終兵器」**として扱いましょう。
    

---

React × TypeScriptは覚えることが多いように感じますが、これらの「頻出パターン」を押さえてしまえば、コードの8〜9割はスラスラと読めるようになります。

ぜひ、実際のプロジェクトでこれらの文法を意識しながらコーディングしてみてください！