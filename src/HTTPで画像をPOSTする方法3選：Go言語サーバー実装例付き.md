# HTTPで画像をPOSTする方法3選：Go言語サーバー実装例付き

### 1. フォームデータ形式で送信：`multipart/form-data` (最も一般的)

ウェブブラウザのフォームからファイルをアップロードする際に標準的に使われる、最も一般的な方法です。一つのリクエストでファイルデータとその他のテキストデータ（ファイル名、説明など）を同時に送信できます。

#### 🔹 特徴

- **用途:** Webアプリケーションでのファイルアップロード、複数のフィールドを持つフォーム送信。
    
- **構造:** リクエストボディが「境界線（Boundary）」で区切られ、ファイルやテキストデータがそれぞれ独立したパートとして格納されます。
    

#### 🔹 クライアント側の設定

- **メソッド:** `POST`
    
- **`Content-Type`:** `multipart/form-data`
    

#### 🔹 Goサーバーでの処理

Goの標準ライブラリには、この形式を簡単に扱うための便利な関数が用意されています。

Go

```
// サーバーコードの該当部分
func handleMultipartUpload(w http.ResponseWriter, r *http.Request) {
    // r.FormFile("フィールド名") でファイルを簡単に取得できる
    file, _, err := r.FormFile("image_file") 
    if err != nil {
        http.Error(w, "ファイルが不正です", http.StatusBadRequest)
        return
    }
    defer file.Close()
    
    // file (io.Reader) の中身をio.Copyで保存先ファイルへ書き込む
    // ...
}
```

---

### 2. 生のバイナリデータとして送信：`application/octet-stream` (RESTfulな更新)

ファイルの内容そのもの（バイナリデータ）をリクエストボディとして送信する方法です。これは、ファイル自体を特定のリソースとして扱いたい場合や、APIの設計をシンプルに保ちたい場合に適しています。

#### 🔹 特徴

- **用途:** RESTfulなファイルリソースの作成（`POST`）や完全な更新（`PUT`）。
    
- **構造:** リクエストボディに、ファイルの中身のバイナリデータのみを含めます。メタデータは通常、カスタムヘッダーやクエリパラメータで渡します。
    
- **効率:** `multipart/form-data`のようなフォーマットのオーバーヘッドがないため、非常にシンプルです。
    

#### 🔹 クライアント側の設定

- **メソッド:** `POST` または `PUT`
    
- **`Content-Type`:** 画像のMIMEタイプ（例: `image/jpeg`）または `application/octet-stream`
    

#### 🔹 Goサーバーでの処理

リクエストボディ全体を読み込み、ファイルとして保存します。

Go

```
// サーバーコードの該当部分
func handleRawBinaryUpload(w http.ResponseWriter, r *http.Request) {
    // r.Body (io.Reader) から直接、データの読み込みを行う
    
    // 保存先ファイルをos.Createで作成...
    
    // リクエストボディの内容を保存先ファイルへコピー
    // _, err := io.Copy(dst, r.Body) 
    // ...
}
```

---

### 3. Base64エンコードしてJSONで送信：`application/json` (API統一)

画像ファイルをBase64文字列にエンコードし、その文字列をJSONオブジェクトの一部として送信する方法です。すべてのAPI通信をJSONに統一したい場合や、小さな画像ファイル（アバターなど）の送信によく使われます。

#### 🔹 特徴

- **用途:** APIのインターフェースをJSONで統一したい場合。
    
- **構造:** ファイルデータとメタデータが、単一のJSON構造として送信されます。
    
- **注意点:** Base64エンコードによりデータ量が約33%増加するため、大きなファイルには不向きです。
    

#### 🔹 クライアント側の設定

- **メソッド:** `POST`
    
- **`Content-Type`:** `application/json`
    

#### 🔹 Goサーバーでの処理

JSONをパースした後、`encoding/base64`パッケージを使って画像データをデコード（復元）します。

Go

```
// サーバーコードの該当部分
func handleBase64Upload(w http.ResponseWriter, r *http.Request) {
    // 1. JSONを構造体にデコード
    // var req FileUploadRequest
    // json.NewDecoder(r.Body).Decode(&req)
    
    // 2. Base64文字列をデコード
    // decodedData, err := base64.StdEncoding.DecodeString(req.Data)
    
    // 3. デコードされたバイナリデータ (decodedData) をos.WriteFileで保存
    // ...
}
```