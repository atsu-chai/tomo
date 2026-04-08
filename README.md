# 寮版トモコレ風 完全ローカルWebアプリ (MVP)

HTML/CSS/JavaScriptのみで動く、完全ローカルの寮生活交流記録アプリです。

## 使い方
1. `index.html` をブラウザで開く
2. 初回セットアップを入力
3. ホーム/マップ/記録/掲示板/設定から利用

## 実装済み機能
- 初回セットアップ（プロフィール + 寮設定）
- 住人テンプレート自動生成（ニックネーム/属性/タグ/コメント/アバターをランダム設定）
- 複数階フロアマップ表示
- 寮生詳細表示
- 出来事カード記録
- 関係ラベル更新
- 控えめ提案表示（1〜3件）
- 掲示板投稿/閲覧
- JSONエクスポート/インポート
- 全データ初期化
- localStorage 永続化（完全オフライン）

## localStorageキー
- `dorm_tomokore_local_app_data`
- `dorm_tomokore_local_backup_meta`


## 開発チェック
- 競合マーカー確認: `./scripts/check-conflict-markers.sh`


## コンフリクト解消（README.md / app.js）
GitHubで `This branch has conflicts that must be resolved` と出た場合は、ローカルで以下を実行してください。

```bash
# 1) main を取り込んでコンフリクトを発生させる
git fetch origin
git merge origin/main

# 2) 今のブランチ側を優先して解消する（今回のケース）
git checkout --ours README.md app.js

# 3) マーカーが消えているか確認
./scripts/check-conflict-markers.sh

# 4) 反映して push
git add README.md app.js
git commit -m "Resolve merge conflicts in README and app logic"
git push
```

`--theirs` を使うと main 側を採用します。今回のようにランダム住人生成を残したい場合は `--ours` を使ってください。
