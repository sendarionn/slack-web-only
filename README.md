# Slack Web Only Fast v0.4

初回の手動操作を不要にした版です。

## 初回の動作

たとえば初めて以下を開いた場合:

https://example.slack.com/archives/C1234567890

拡張は自動的に次を行います。

1. 開きたかったチャンネルID C1234567890 を一時保存
2. https://example.slack.com/ を自動で開く
3. Slack自身の通常のブラウザ遷移から
   https://app.slack.com/client/T1234567890/...
   を検出
4. T1234567890 を example.slack.com に紐づけて保存
5. 元々開きたかった
   https://app.slack.com/client/T1234567890/C1234567890
   へ即座に再転送

ユーザーが「ブラウザで開く」等を押す必要はありません。

## 2回目以降

保存済みの

example.slack.com -> T1234567890

を使うため、共有URLから app.slack.com/client/... へ直接飛びます。

## 導入

1. v0.1〜v0.3 を削除または無効化
2. ZIPを展開
3. chrome://extensions/
4. デベロッパーモード ON
5. 「パッケージ化されていない拡張機能を読み込む」
6. slack-web-only-fast-v0.4 を指定

## 前提

Chrome上で対象Slackワークスペースにログイン済みである必要があります。
ログインしていない場合、初回はSlackのログイン画面が必要になります。
