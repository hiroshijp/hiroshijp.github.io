# HubsCloudについてのまとめ

## 目次
1. HubsCloudとは
1. HubsCloudを構成する技術群
1. Reticulumで使用される主要パッケージ
1. Hubs(adminも含む)で使用されている主要パッケージ
1. 現在のHubsCloud
1. HubsCloudCommunityEditionとは
1. セルフホスト事例
1. その他関連リンク集


## HubsCloudとは
Web上でメタバースを体験できるアプリの技術群  
クライアント-サーバー方式のシステム構成  
AWSマーケットプレイスで,Personal版とEnterprise版サポートされている 
MozillaHubsはMozillaがホストしているHubsCloudといった感じ  

## HubsCloudを構成する技術群
![](hubs_cloud_stacks.dio.svg)　　
あくまで上の図はざっくりとした構成です    
より詳しい構成は,グリー株式会社さまが求めてくれた[資料](https://vr.gree.net/wp-content/uploads/2020/07/Hubs-Shirai-20200715.pdf)を参照してください


## Reticulumで使用される主要パッケージ
### **phoenix**
Webフレームワーク
### **phoenix_pubsub**
Phoenix向けのPub/Sub機能を提供
### **ecto**
RDBのORMで,クエリ発行やマイグレーションをしてくれる
### **postgrex**
elixir用のpostgresドライバー
### **httpoison**
httpクライアント
### **cowboy**
httpサーバー(phoenixと併用する)
### **gettext**
多言語化をサポート

## Hubs(adminも含む)で使用されている主要パッケージ
### **react**
UIフレームワーク
### **three.js**
WebGLベースの3Dオブジェクトレンダラー
### **ammo.js**
wasmで書かれた物理エンジン,three-ammoパッケージでthree.jsと連携
### **aframe**
three.jsのオブジェクトHTMLタグなどだけで扱えるようにした便利パッケージ,VRデバイスをサポートしている
### **networked aframe**
WebRTCまたはWebSocketを介してaframeでのエンティティ情報を共有しレンダリングしてくれる
### **phoenix**
phoenixのクライアント用JSライブラリ,WebSocket通信用のモジュールなどを提供している

## 現在のHubsCloud
- **2024年1月1日** HubsCloud on AWSの新規サブスクとサポートを停止
- **2024年3月1日** MozillaHubsの新規のサブスクを停止,なお既存のものは継続
- **2024年5月31日** MozillaHubsの既存インスタンスとでもサーバーをすべて停止

>**参照**  
>[https://hubs.mozilla.com/labs/sunset/](https://hubs.mozilla.com/labs/sunset/)  
>[https://hubs.mozilla.com/labs/professional-plan-and-community-edition/](https://hubs.mozilla.com/labs/professional-plan-and-community-edition/) 

Mozillaはサポートを順次終了し,コミュニティー版への移行を推奨している  

## HubsCloudCommunityEditionとは
Community Edition は、開発者が AWS、Google Cloud、さらには自分のコンピュータを含む Linux ベースのインフラストラクチャに完全な Hubs スタックをデプロイできるように設計されています。 Hubs Cloud が、Hubs チームが Mozilla によって管理されるサーバーを実行する方法を模倣したのと同じように、Community Edition は、私たちのチームがマネージド サブスクリプション サービスに使用するインフラストラクチャを模倣します。 Community Edition は、コンテナ化されたソフトウェア オーケストレーション システムである **Kubernetes を使用して、複雑な導入プロセスのほとんどを簡素化**し、自動化します。

Community Edition のようなソリューションの明らかな利点は、開発者がハブをホスティングするためのより多くの選択肢を提供できることです。あまり明らかではない利点は、ホスティング プラットフォームへの重要な更新を処理する際の柔軟性が向上することです。以前は、AWS プラットフォームにメジャーなアップデートがあった場合、Hubs Cloud 開発者は、チームが AWS 起動構成の新しいバージョンをリリースするまで待つ必要がありました。 Community Edition では、この制限がなくなりました。  

>[https://hubs.mozilla.com/labs/welcoming-community-edition/](https://hubs.mozilla.com/labs/welcoming-community-edition/)より引用

## セルフホスト事例
- [GCPを使った公式のケーススタディー](https://hubs.mozilla.com/labs/community-edition-case-study-quick-start-on-google-cloud-with-aws-services-ri-ben-yu-ban/)
- [自前の物理サーバーとk3sを使ったセルフホスト](https://qiita.com/dodolia907/items/c350f9a69deca6e3b831)
- [OVH(フランスのクラウドサービス)を使ったセルフホスト](https://fabien.benetou.fr/Tools/HubsSelfHosting)

## その他関連リンク集
- [公式が作成したローカル用のdocker-compose環境](https://github.com/mozilla/hubs-compose)
- [有志が作ったCE版ができる前のセルフホストガイド](https://github.com/albirrkarim/mozilla-hubs-installation-detailed)
- [(株)フレームシンセシス様のHubsCloudまとめ](https://tech.framesynthesis.co.jp/hubs/)
- [HubsCloudドキュメント日本語訳](https://github.com/gree/hubs-docs-jp)