# Reticulumでユーザーの行動ログを取得する方法

## 目次
1. Reticulumのログをのぞいてみよう
1. 座標がブロードキャストされる流れ 
1. Reticulumを改造
1. 今後の課題
1. 参考にした資料リンク集

## Reticulumのログをのぞいてみよう
### 移動や方向転換時に現れるログ
![](ret_log1.png)
特に重要なのは以下の4つ
- **networkId**: hubs_idに相当する
- **owner**: session_idに相当する
- **template**: networkedAframeで定義されている3Dオブジェクトの種類
- **component**: 位置情報が格納されている
  
### 停止時または一定間隔で現れるログ
![](ret_log2.png)  
前に出現したcomponentが複数種類とそれに付随したデータ.現在わかっている限りでは**0はアバター本体,6は向いている方向**を表している

## 座標がブロードキャストされる流れ 
### クライアントサイド
**hub/src/phoenix-adapter.js 52行目**
```javascript
export default class PhoenixAdapter {

    // 一部省略

}

NAF.adapters.register("phoenix", PhoenixAdapter);
```
Reticulum用に拡張したnetworked-aframeオブジェクトを登録しておく

**hub/src/hub.js 561行目**
```javascript
function handleHubChannelJoined(entryManager, hubChannel, messageDispatch, data) {

    // 一部省略

　　scene.setAttribute("networked-scene", {
　　    room: hub.hub_id,
　　    serverURL: `wss://${hub.host}:${hub.port}`,
　　    debug: !!isDebug,
　　    adapter: "phoenix"
　　  });

    // 一部省略

}
```
入室すると,hundlleHubChannelJoined()が呼ばれる.そこでreticulumとdialogとの通信設定が行われる  
またWebSocket通信が確立し、さきほどログで見た情報がサーバーへ適宜送信される  

### サーバーサイド
**reticulum/lib/ret_web/channels/hub_channels.ex 41行目**
```elixir
def join("hub:" <> hub_sid, %{...} = params, socket) do

    # 一部省略

end
```
入室時hubチャネルに接続され,join()がコールされる.

**reticulum/lib/ret_web/channels/hub_channels.ex 152行目**
```elixir
# Captures all inbound NAF messages that result in spawned objects.
  def handle_in(
        "naf" = event,
        %{"data" => %{"isFirstSync" => true, "persistent" => false, "template" => template}} =
          payload,
        socket
      ) do
    data = payload["data"]

    if template |> spawn_permitted?(socket) do
      data =
        data
        |> Map.put("creator", socket.assigns.session_id)
        |> Map.put("owner", socket.assigns.session_id)

      payload = payload |> Map.put("data", data)

      broadcast_from!(
        socket,
        event |> internal_naf_event_for(socket),
        payload |> payload_with_from(socket)
      )

      {:noreply, socket}
    else
      {:noreply, socket}
    end
  end
```
ログで見せたインバウンドメッセージを受け取る関数

**ret/deps/phx/lib/pxh/logger.ex 361行目**
```elixir
def phoenix_channel_handled_in(_, %{duration: duration}, %{socket: socket} = metadata, _) do
    channel_log(:log_handle_in, socket, fn ->
      %{event: event, params: params} = metadata

      [
        "HANDLED ",
        event,
        " INCOMING ON ",
        socket.topic,
        " (",
        inspect(socket.channel),
        ") in ",
        duration(duration),
        "\n  Parameters: ",
        inspect(filter_values(params))
      ]
    end)
end
```
ログのフォーマットはPhowenixモジュールで定義されている. loggerモジュールを拡張したもの

## Reticulumを改造
### 外部モジュールを追加
### トピックにjoinし行動ログをファイル出力するプロセスを作成
### 作成したプロセスのjoinを有効化
### application.exに登録


## 今後の課題


## 参考にした資料リンまた