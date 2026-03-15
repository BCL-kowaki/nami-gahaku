# なみ画伯のおえかきクイズ

## プロジェクト概要
絵が下手な「なみ画伯」の絵を4択クイズで当てるアプリ。
UGC投稿機能付き。

## 技術スタック
- Next.js 15 (App Router) + TypeScript
- Tailwind CSS v4
- Firebase (Firestore, Auth, Storage)
- Zustand (状態管理)
- Sharp (画像処理)
- Gemini API (AI機能)
- framer-motion (アニメーション)
- Lucide React (アイコン)

## デザインルール
- カラー: 黒白グレーベース（モノトーン）
- border-radius: 全て 5px (rounded-[5px])
- フォント: Noto Sans JP
- レイアウト: max-w-md モバイルファースト
- カード型UI、shadow-sm
- 正解色: #22C55E、不正解色: #EF4444

## コーディング規約
- 日本語でコメントを書く
- コンポーネントは機能単位で分割
- API Routeはサーバーサイドのみで実行
- Firebaseの初期化は lib/firebase/ に集約
- AI関連は lib/ai/ に集約
- 型定義は types/ に集約
- 共通ユーティリティは lib/utils/ に集約
- 状態管理はZustandストア (stores/) に集約

## API共通レスポンス形式
- 成功: { success: true, data: T }
- エラー: { error: string, code: string, details?: string }

## ディレクトリ構成
- src/app/(auth)/ - ログイン・サインアップ
- src/app/(main)/ - 認証後の4画面（play, collection, create, profile）
- src/app/api/ - API Routes
- src/components/ - UIコンポーネント（ui/, quiz/, collection/, create/, layout/）
- src/lib/ - ビジネスロジック（firebase/, ai/, image/, utils/）
- src/hooks/ - カスタムフック
- src/stores/ - Zustandストア
- src/types/ - TypeScript型定義

## 重要な改善点
1. Firestoreのランダム取得にはrandomSeedフィールドを使用
2. 既回答除外はリトライ方式で実装
3. quizzesのセキュリティルールにupdateを追加済み
4. 画像処理結果はBase64で返してクライアントプレビュー
5. reportCount >= 3 で自動非表示（isHiddenフラグ）
