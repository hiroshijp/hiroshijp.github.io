# 主要なパターンの比較

| パターン               | メリット           | デメリット            | 現在の位置づけ           |
| ------------------ | -------------- | ---------------- | ----------------- |
| Handler            | シンプル、低レベル制御    | 冗長、ライフサイクル管理が手動  | レガシー              |
| AsyncTask          | 分かりやすい         | 非推奨、構成変更に弱い      | 非推奨               |
| コールバック             | 直感的            | ネストが深くなる、例外処理が複雑 | 基本パターンだが単独ではレガシー  |
| RxJava             | 強力、柔軟          | 学習曲線が急、コード量      | 一部プロジェクトで使用       |
| LiveData+ViewModel | ライフサイクル認識、シンプル | 変換機能に制限あり        | 現役標準（徐々にFlowへ移行中） |
| コルーチン+Flow         | 言語レベル統合、読みやすい  | 新しい概念の習得         | 現在の推奨アプローチ        |
| Compose+コルーチン      | UI層との統合、宣言的    | まだ新しい技術          | 次世代の推奨アプローチ       |

現在のAndroidアプリ開発では、コルーチン+FlowまたはLiveDataを組み合わせたパターンが最も推奨されており、UIがJetpack Composeに移行するにつれて、Compose+コルーチンパターンへ進化しています

## 1. Handler / Looperパターン（伝統的なアプローチ）

```kotlin
// UIスレッドのHandlerを作成
val handler = Handler(Looper.getMainLooper())

// バックグラウンドスレッドで処理
Thread {
    // バックグラウンド処理
    val result = performHeavyTask()
    
    // UIスレッドで結果を反映
    handler.post {
        textView.text = result
    }
}.start()
```

**特徴：**
- Android初期からある基本的なメカニズム
- 低レベルAPI、直接的なスレッド管理が必要
- コードが冗長になりがち
- ライフサイクル考慮が手動

## 2. AsyncTask（Android 11で非推奨）

```kotlin
private class DownloadTask : AsyncTask<String, Int, Bitmap>() {
    override fun doInBackground(vararg urls: String): Bitmap {
        // バックグラウンド処理
        return downloadImage(urls[0])
    }
    
    override fun onProgressUpdate(vararg values: Int) {
        progressBar.progress = values[0]
    }
    
    override fun onPostExecute(result: Bitmap) {
        imageView.setImageBitmap(result)
    }
}

// 使用方法
DownloadTask().execute("https://example.com/image.jpg")
```

**特徴：**
- Android特有のAPI、現在は非推奨
- シンプルな実装
- 設定変更で破棄される問題
- メモリリークのリスク

## 3. コールバックパターン

```kotlin
interface NetworkCallback {
    fun onSuccess(data: Data)
    fun onError(error: Exception)
}

// レポジトリクラス
fun fetchData(callback: NetworkCallback) {
    executor.execute {
        try {
            val result = api.getData()
            mainThreadExecutor.execute {
                callback.onSuccess(result)
            }
        } catch (e: Exception) {
            mainThreadExecutor.execute {
                callback.onError(e)
            }
        }
    }
}

// 使用例
repository.fetchData(object : NetworkCallback {
    override fun onSuccess(data: Data) {
        textView.text = data.toString()
    }
    
    override fun onError(error: Exception) {
        showErrorMessage(error.message)
    }
})
```

**特徴：**
- コールバック地獄になりやすい
- エラーハンドリングが複雑化
- コード追跡が難しい

## 4. RxJavaアプローチ

```java
repository.getData()
    .subscribeOn(Schedulers.io())
    .observeOn(AndroidSchedulers.mainThread())
    .subscribe({ result ->
        textView.text = result.toString()
    }, { error ->
        showError(error.message)
    })
    .addTo(compositeDisposable) // ライフサイクルに合わせて破棄
```

**特徴：**
- 強力なストリーム処理
- 豊富な演算子
- 学習曲線が急
- 明示的な購読解除が必要

## 5. LiveDataとViewModelパターン（Jetpack）

```kotlin
class MyViewModel : ViewModel() {
    private val _data = MutableLiveData<String>()
    val data: LiveData<String> = _data
    
    fun loadData() {
        viewModelScope.launch {
            try {
                val result = repository.fetchData()
                _data.value = result
            } catch (e: Exception) {
                _data.value = "Error: ${e.message}"
            }
        }
    }
}

// Activityまたはフラグメントでの使用
viewModel.data.observe(viewLifecycleOwner) { data ->
    textView.text = data
}
viewModel.loadData()
```

**特徴：**
- ライフサイクル認識
- 構成変更に強い
- MVVM設計との親和性
- コード分離が容易

## 6. Kotlin コルーチン + Flow

```kotlin
class MyViewModel : ViewModel() {
    private val _dataFlow = MutableStateFlow<UiState>(UiState.Loading)
    val dataFlow = _dataFlow.asStateFlow()
    
    fun loadData() {
        viewModelScope.launch {
            _dataFlow.value = UiState.Loading
            try {
                val result = withContext(Dispatchers.IO) {
                    repository.fetchData() 
                }
                _dataFlow.value = UiState.Success(result)
            } catch (e: Exception) {
                _dataFlow.value = UiState.Error(e.message ?: "Unknown error")
            }
        }
    }
}

// Fragmentでの収集
lifecycleScope.launch {
    repeatOnLifecycle(Lifecycle.State.STARTED) {
        viewModel.dataFlow.collect { state ->
            when (state) {
                is UiState.Loading -> showLoading()
                is UiState.Success -> showData(state.data)
                is UiState.Error -> showError(state.message)
            }
        }
    }
}
```

**特徴：**
- Kotlin言語との統合
- 構造化された同時実行性
- 読みやすいコード
- Flow変換演算子の豊富さ
- StateFlow/SharedFlowによる状態管理

## 7. Jetpack Compose + コルーチン

```kotlin
class MyViewModel : ViewModel() {
    private val _dataFlow = MutableStateFlow<UiState>(UiState.Loading)
    val dataFlow = _dataFlow.asStateFlow()
    
    fun loadData() {
        viewModelScope.launch {
            _dataFlow.value = UiState.Loading
            try {
                val result = withContext(Dispatchers.IO) {
                    repository.fetchData() 
                }
                _dataFlow.value = UiState.Success(result)
            } catch (e: Exception) {
                _dataFlow.value = UiState.Error(e.message ?: "Unknown error")
            }
        }
    }
}

// Fragmentでの収集
lifecycleScope.launch {
    repeatOnLifecycle(Lifecycle.State.STARTED) {
        viewModel.dataFlow.collect { state ->
            when (state) {
                is UiState.Loading -> showLoading()
                is UiState.Success -> showData(state.data)
                is UiState.Error -> showError(state.message)
            }
        }
    }
}
```

**特徴：**
- 宣言的UIとの統合
- UIステート駆動アプローチ
- 副作用の明示的管理
- リアクティブなデータフロー