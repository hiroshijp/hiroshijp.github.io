# HTTPセッション管理と認証方式の基礎概念

Webアプリケーション開発において、HTTPのステートレスな性質を補完し、ユーザーの状態（ログイン状態など）を維持する仕組みは不可欠である。本稿では、セッション管理の基本用語、認証方式の比較、SPAにおける実装方針、およびSpring Securityにおける内部挙動について整理する。

---

## 1. 基本用語の定義

まず、セッション管理を構成する主要な要素について定義する。

- **セッション (Session)**
    
    一連の通信の文脈を指す。HTTPは本来ステートレス（状態を持たない）であるため、サーバー側で「特定のクライアントとの一貫したやり取り」を認識するための論理的な概念である。
    
- **クッキー (Cookie)**
    
    ブラウザ（クライアント）側に少量のデータを保存する機構、またはそのデータ自体を指す。サーバーから発行され、以降のリクエスト時にブラウザが自動的に送信する。セッションIDの運搬手段として最も標準的に利用される。
    
- **JWT (JSON Web Token)**
    
    JSON形式のデータをURLで使用可能な文字列として表現するための規格（RFC 7519）。署名が含まれており、改ざん検知が可能であるため、サーバー側で状態を保持しない（ステートレスな）認証情報の受け渡しに利用される。
    

---

## 2. 認証・セッション管理のパターン

現代のWeb開発において、認証状態の管理は大きく分けて「ステートフル」と「ステートレス」の2パターンが存在する。

### ステートフル認証（サーバーサイドセッション）

従来から利用されている標準的な方式である。

- **仕組み:** サーバー側のメモリやデータベースにセッション情報を保存し、クライアントにはその識別子（セッションID）のみをクッキーとして渡す。
    
- **メリット:** サーバー側でセッションを管理しているため、強制ログアウト（セッションの無効化）が容易である。
    
- **デメリット:** サーバーのメモリリソースを消費するため、大規模なアクセスにおいてはスケーリングの設計（Sticky SessionやRedisの導入など）が必要となる。
    

### ステートレス認証（トークンベース）

マイクロサービスやモバイルアプリ連携の文脈で普及した方式である。

- **仕組み:** サーバーは状態を保存せず、ユーザー情報と有効期限を含んだトークン（JWTなど）を発行する。クライアントはリクエスト毎にトークンを送信し、サーバーは署名の検証のみを行う。
    
- **メリット:** サーバーが状態を持たないためスケーラビリティが高い。
    
- **デメリット:** トークン自体が有効期限を持つため、サーバー側からの即時無効化が困難である。
    

#### 補足：不透明トークン（Opaque Token）とPASETO

JWT以外にも以下のトークン形式が利用される。

- **不透明トークン:** 中身がランダムな文字列であり、情報の参照にはサーバー（DBなど）への問い合わせが必要となる形式。APIキーなどで利用される。
    
- **PASETO:** JWTの設計上の脆弱性（暗号化アルゴリズムの選択肢など）を排除し、よりセキュアな実装を強制する次世代のトークン規格。
    

---

## 3. SPAにおけるセッション管理

Single Page Application (SPA) においても、セキュリティの観点からクッキーを用いたセッション方式（ステートフル）が再評価されている。

### LocalStorage vs HttpOnly Cookie

JWTを `LocalStorage` に保存する場合、JavaScriptからのアクセスが容易であるため、XSS（クロスサイトスクリプティング）脆弱性が存在した際にトークンが奪取されるリスクがある。

対して、セッションIDを `HttpOnly` 属性が付与されたクッキーで管理する場合、JavaScriptからのアクセスは遮断される。これにより、XSS攻撃を受けたとしてもセッションID自体の流出を防ぐことが可能となる。

したがって、フロントエンドとバックエンドが同一ドメイン（またはサブドメイン）で運用可能な場合、SPAであってもクッキーベースのセッション管理を採用することが、セキュリティ上堅牢な選択肢となり得る。

---

## 4. Spring Securityにおける挙動

フレームワークを利用した場合、これらのセッション管理や再認証のフローは内部的に処理される。Spring Securityを例にとると、開発者が明示的な分岐を書かずとも未認証ユーザーが弾かれるのは、「フィルターチェーン」の仕組みによるものである。

### 主なフィルターの役割

リクエストはコントローラーに到達する前に、以下のフィルター群によって処理される。

1. **`SecurityContextPersistenceFilter`**
    
    リクエストに含まれるクッキー（JSESSIONID）を確認し、サーバー上のセッション情報と紐付ける。
    
2. **`FilterSecurityInterceptor`**
    
    アクセス制御のルール（例: `.anyRequest().authenticated()`）と照合し、許可されていない場合は例外を送出する。
    
3. **`ExceptionTranslationFilter`**
    
    送出された例外を捕捉し、適切なレスポンス（401 Unauthorized や ログイン画面へのリダイレクト）をクライアントへ返却する。
    

開発者はこの仕組みにより、ビジネスロジック内で認証チェックの記述を省略できる。

---

## 5. 実装サンプル (Java / Spring Security)

最後に、Spring Securityを用いた基本的なセッション管理の実装例を示す。

初回はベーシック認証を行い、成功後はクッキー（JSESSIONID）によってセッションを維持する構成である。

### 依存関係 (pom.xml)

XML

```
<dependencies>
    <dependency>
        <groupId>org.springframework.boot</groupId>
        <artifactId>spring-boot-starter-security</artifactId>
    </dependency>
    <dependency>
        <groupId>org.springframework.boot</groupId>
        <artifactId>spring-boot-starter-web</artifactId>
    </dependency>
</dependencies>
```

### セキュリティ設定 (SecurityConfig.java)

Java

```
import org.springframework.context.annotation.Bean;
import org.springframework.context.annotation.Configuration;
import org.springframework.security.config.Customizer;
import org.springframework.security.config.annotation.web.builders.HttpSecurity;
import org.springframework.security.config.http.SessionCreationPolicy;
import org.springframework.security.web.SecurityFilterChain;

@Configuration
public class SecurityConfig {

    @Bean
    public SecurityFilterChain securityFilterChain(HttpSecurity http) throws Exception {
        http
            // 全てのリクエストに認証を要求
            .authorizeHttpRequests(auth -> auth
                .anyRequest().authenticated()
            )
            // ベーシック認証を有効化
            .httpBasic(Customizer.withDefaults())
            // セッション作成ポリシーの設定（必要に応じて作成）
            .sessionManagement(session -> session
                .sessionCreationPolicy(SessionCreationPolicy.IF_REQUIRED)
            );

        return http.build();
    }
}
```

### コントローラー (HelloController.java)

Java

```
import jakarta.servlet.http.HttpSession;
import org.springframework.security.core.Authentication;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.RestController;

@RestController
public class HelloController {

    @GetMapping("/hello")
    public String hello(Authentication authentication, HttpSession session) {
        return String.format("User: %s\nSession ID: %s", 
                authentication.getName(), 
                session.getId());
    }
}
```

### 設定ファイル (application.properties)

Properties

```
spring.security.user.name=admin
spring.security.user.password=password123
```