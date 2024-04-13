# HubsCloudについてのまとめ

## 目次
1. HubsCloudとは
1. HubsCloudを構成する技術群
1. Reticulumで使用される主要パッケージ
1. Hubs(adminも含む)で使用されている主要パッケージ
1. 現在のHubsCloud
1. HubsCloudCommunityEditionとは
1. セルフホスト事例

## HubsCloudとは
Web上でメタバースを体験できるアプリの技術群  
クライアント-サーバー方式のシステム構成  
AWSマーケットプレイスで,Personal版とEnterprise版サポートされている 

## HubsCloudを構成する技術群


## Reticulumで使用される主要パッケージ
### phoenix
Webフレームワーク
### phoenix_pubsub
Phoenix向けのPub/Sub機能を提供
### ecto
RDBのORMで,クエリ発行やマイグレーションをしてくれる
### postgrex
elixir用のpostgresドライバー
### httpoison
httpクライアント
### cowboy
httpサーバー(phoenixと併用する)
### gettext
多言語化をサポート

## Hubs(adminも含む)で使用されている主要パッケージ
### react
UIフレームワーク
### three.js
WebGLベースの3Dオブジェクトレンダラー
### ammo.js
wasmで書かれた物理エンジン,three-ammoパッケージでthree.jsと連携
### aframe
three.jsのオブジェクトHTMLタグなどだけで扱えるようにした便利パッケージ,VRデバイスをサポートしている
### networked aframe
WebRTCまたはWebSocketを介してaframeでのエンティティ情報を共有しレンダリングしてくれる
### phoenix
phoenixのクライアント用JSライブラリ,WebSocket通信用のモジュールなどを提供している

## 現在のHubsCloud


## HubsCloudCommunityEditionとは


## セルフホスト事例
