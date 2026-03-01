普段、私たちが Spring Boot や Express などのフレームワークを使って Web アプリケーションを開発する際、HTTP は「当たり前にあるもの」として扱われます。しかし、その裏側では **TCP ソケット**という低レイヤーの通信が休むことなく動いています。

今回は、提供された Java のサンプルコードを紐解きながら、**「Web サーバーがいかにして TCP 接続を HTTP という言葉に変換しているのか」**を解説します。

---
# サンプルコード
```java
import java.io.*;
import java.net.*;
import java.nio.file.*;
import java.util.*;
import java.util.concurrent.*;

public class AdvancedHttpServer {
    private final int port;
    private final ExecutorService threadPool;
    private final Map<String, RouteHandler> routes;
    
    public AdvancedHttpServer(int port) {
        this.port = port;
        this.threadPool = Executors.newFixedThreadPool(20);
        this.routes = new HashMap<>();
    }
    
    public void addRoute(String path, RouteHandler handler) {
        routes.put(path, handler);
    }
    
    public void start() {
        try (ServerSocket serverSocket = new ServerSocket(port)) {
            System.out.println("サーバー起動: http://localhost:" + port);
            
            while (true) {
                Socket clientSocket = serverSocket.accept();
                threadPool.execute(new AdvancedRequestHandler(clientSocket, routes));
            }
        } catch (IOException e) {
            e.printStackTrace();
        }
    }
    
    public static void main(String[] args) {
        AdvancedHttpServer server = new AdvancedHttpServer(8080);
        
        // ルートを登録
        server.addRoute("/", (req) -> {
            return new HttpResponse(200, "OK", 
                "<h1>Welcome!</h1><p><a href='/about'>About</a></p>");
        });
        
        server.addRoute("/about", (req) -> {
            return new HttpResponse(200, "OK", 
                "<h1>About</h1><p>This is a Java Socket HTTP Server</p>");
        });
        
        server.addRoute("/api/data", (req) -> {
            String json = "{\"message\": \"Hello API\", \"timestamp\": " + 
                         System.currentTimeMillis() + "}";
            return new HttpResponse(200, "OK", json, "application/json");
        });
        
        server.start();
    }
}

@FunctionalInterface
interface RouteHandler {
    HttpResponse handle(HttpRequest request);
}

class HttpRequest {
    private String method;
    private String path;
    private Map<String, String> headers;
    private String body;
    
    public HttpRequest(String method, String path, 
                      Map<String, String> headers, String body) {
        this.method = method;
        this.path = path;
        this.headers = headers;
        this.body = body;
    }
    
    public String getMethod() { return method; }
    public String getPath() { return path; }
    public Map<String, String> getHeaders() { return headers; }
    public String getBody() { return body; }
}

class HttpResponse {
    private int statusCode;
    private String statusText;
    private String body;
    private String contentType;
    
    public HttpResponse(int statusCode, String statusText, String body) {
        this(statusCode, statusText, body, "text/html; charset=UTF-8");
    }
    
    public HttpResponse(int statusCode, String statusText, 
                       String body, String contentType) {
        this.statusCode = statusCode;
        this.statusText = statusText;
        this.body = body;
        this.contentType = contentType;
    }
    
    public int getStatusCode() { return statusCode; }
    public String getStatusText() { return statusText; }
    public String getBody() { return body; }
    public String getContentType() { return contentType; }
}

class AdvancedRequestHandler implements Runnable {
    private final Socket clientSocket;
    private final Map<String, RouteHandler> routes;
    
    public AdvancedRequestHandler(Socket socket, Map<String, RouteHandler> routes) {
        this.clientSocket = socket;
        this.routes = routes;
    }
    
    @Override
    public void run() {
        try (
            BufferedReader in = new BufferedReader(
                new InputStreamReader(clientSocket.getInputStream())
            );
            OutputStream out = clientSocket.getOutputStream()
        ) {
            // リクエストを解析
            HttpRequest request = parseRequest(in);
            if (request == null) return;
            
            System.out.println(request.getMethod() + " " + request.getPath());
            
            // ルートに応じたレスポンスを生成
            HttpResponse response;
            if (routes.containsKey(request.getPath())) {
                response = routes.get(request.getPath()).handle(request);
            } else {
                response = new HttpResponse(404, "Not Found", 
                    "<h1>404 Not Found</h1><p>The page you requested was not found.</p>");
            }
            
            // レスポンスを送信
            sendResponse(out, response);
            
        } catch (IOException e) {
            e.printStackTrace();
        } finally {
            try {
                clientSocket.close();
            } catch (IOException e) {
                e.printStackTrace();
            }
        }
    }
    
    private HttpRequest parseRequest(BufferedReader in) throws IOException {
        String requestLine = in.readLine();
        if (requestLine == null) return null;
        
        String[] parts = requestLine.split(" ");
        String method = parts[0];
        String path = parts[1];
        
        Map<String, String> headers = new HashMap<>();
        String line;
        while ((line = in.readLine()) != null && !line.isEmpty()) {
            String[] headerParts = line.split(": ", 2);
            if (headerParts.length == 2) {
                headers.put(headerParts[0], headerParts[1]);
            }
        }
        
        // ボディの読み取り（POSTなどの場合）
        StringBuilder body = new StringBuilder();
        if (headers.containsKey("Content-Length")) {
            int contentLength = Integer.parseInt(headers.get("Content-Length"));
            for (int i = 0; i < contentLength; i++) {
                body.append((char) in.read());
            }
        }
        
        return new HttpRequest(method, path, headers, body.toString());
    }
    
    private void sendResponse(OutputStream out, HttpResponse response) throws IOException {
        byte[] bodyBytes = response.getBody().getBytes("UTF-8");
        
        String httpResponse = "HTTP/1.1 " + response.getStatusCode() + 
                             " " + response.getStatusText() + "\r\n" +
                             "Content-Type: " + response.getContentType() + "\r\n" +
                             "Content-Length: " + bodyBytes.length + "\r\n" +
                             "Connection: close\r\n" +
                             "\r\n";
        
        out.write(httpResponse.getBytes("UTF-8"));
        out.write(bodyBytes);
        out.flush();
    }
}
```
## 1. HTTP は「TCP の上で交わされるただのテキスト」

まず、ネットワークの階層構造を思い出してみましょう。HTTP（アプリケーション層）は、TCP（トランスポート層）という土台の上に乗っています。

サンプルコードの `ServerSocket` は、この TCP 層で「特定のポート（今回は 8080）」を開放し、クライアントからの接続を待ち受ける役割を担います。

Java

```java
try (ServerSocket serverSocket = new ServerSocket(port)) {
    while (true) {
        Socket clientSocket = serverSocket.accept(); // ここで接続を待機
        threadPool.execute(new AdvancedRequestHandler(clientSocket, routes));
    }
}
```

TCP は「データの通り道」を確保するだけで、その中身が HTTP なのか、はたまた別のプロトコルなのかは関知しません。Web サーバーの最初の仕事は、この**「生のバイト流」を HTTP というルールに従って解釈する**ことです。

---

## 2. リクエスト解析：バイトの羅列をオブジェクトへ

`AdvancedRequestHandler` クラスの `parseRequest` メソッドを見てみましょう。ここでは、TCP を通じて送られてきたテキストデータを読み取っています。

Java

```java
private HttpRequest parseRequest(BufferedReader in) throws IOException {
    String requestLine = in.readLine(); // 例: "GET /index.html HTTP/1.1"
    // ...
    while ((line = in.readLine()) != null && !line.isEmpty()) {
        // ヘッダーを解析 (Key: Value)
    }
    // ...
    // ボディの読み取り
}
```

HTTP リクエストは、実は非常にシンプルな構造をしています。

1. **リクエストライン**: メソッド（GET/POST）とパス。
    
2. **ヘッダー**: `Content-Type` や `User-Agent` など。
    
3. **空行**: ヘッダーの終わりを示す印。
    
4. **メッセージボディ**: 送信されるデータ本体。
    

このコードでは `BufferedReader` を使って 1 行ずつ読み込み、`HttpRequest` という Java オブジェクトにマッピングしています。これが、モダンなフレームワークが `Controller` にリクエストを渡す前に行っている「型への変換」の正体です。

---

## 3. ルーティング：パスと処理を紐付ける

`AdvancedHttpServer` では、`Map<String, RouteHandler>` を使ってルーティングを管理しています。

Java

```java
server.addRoute("/api/data", (req) -> {
    String json = "{\"message\": \"Hello API\"}";
    return new HttpResponse(200, "OK", json, "application/json");
});
```

Web サーバーは、解析したパス（`/api/data` など）をキーにして、実行すべき関数（ハンドラー）を特定します。この仕組みがあるおかげで、私たちは「どの URL でどの処理を動かすか」を宣言的に記述できるのです。

---

## 4. レスポンス：正しい作法で返答する

処理が終われば、クライアントに結果を返します。ここでも HTTP の「作法」が重要です。

Java

```java
private void sendResponse(OutputStream out, HttpResponse response) throws IOException {
    String httpResponse = "HTTP/1.1 " + response.getStatusCode() + ...
                         "\r\n" + // ヘッダーとボディの区切り
                         "\r\n";
    out.write(httpResponse.getBytes("UTF-8"));
    out.write(bodyBytes);
}
```

Web ブラウザが正しく画面を表示できるのは、サーバーが `HTTP/1.1 200 OK` といったステータスラインや、`Content-Length`（データの長さ）を**正しい順序で、バイトデータとして書き込んでいるから**です。

---

## 5. 並行処理：なぜスレッドプールが必要か？

このコードの重要なポイントは `ExecutorService`（スレッドプール）の使用です。

Java

```java
private final ExecutorService threadPool = Executors.newFixedThreadPool(20);
```

もしスレッドを使わずに 1 つずつ処理していたら、あるユーザーの重い処理（例：巨大なファイルの読み込み）が終わるまで、他のすべてのユーザーが待たされることになります。

TCP 接続を受け取った瞬間に、その処理を別スレッドに丸投げすることで、サーバーはすぐに次の接続を受け付けられる（高いスループットを維持できる）ようになります。

---

## まとめ

私たちが普段使っている Web サーバーの裏側では、以下のような「地味ながらも緻密な変換」が行われています。

1. **TCP** で「土管」を繋ぐ。
    
2. **テキスト**を読み取り、**HTTP オブジェクト**へ変換する。
    
3. **パス**を元に処理を振り分ける。
    
4. 結果を **HTTP の形式**に整えて、**バイトデータ**として送り返す。
    
5. これらを**マルチスレッド**で効率よく回す。
    

このサンプルコードは、普段隠されている「Web の土台」を理解するための素晴らしい教科書です。

**次は、このサーバーに「静的ファイルの配信機能（File IO）」を追加してみるのはいかがでしょうか？** もし興味があれば、その実装方法についてもサポートできますよ！