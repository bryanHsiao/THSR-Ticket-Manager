# THSR 車票管理系統 - 開發筆記

## 專案概述
高鐵車票管理 PWA 應用程式，支援 OCR 辨識車票、手動新增/編輯車票紀錄、匯出報表等功能。

## 近期修改記錄

### 2026-01-14: 表單 UI 優化（手機版）

#### 修改目標
- 出差目的欄位移至表單最上方
- 確定/取消按鈕固定在 Modal 底部，無需捲動即可按到
- 手機版表單更緊湊，一個螢幕內可看完所有欄位

#### 修改內容

**`src/components/TicketForm.tsx`**
- 表單結構改為 `flex flex-col h-full`，內容區可捲動，按鈕區固定底部
- 出差目的（Purpose）欄位移至票號下方
- 移除方向（Direction）下拉選單，改為自動依起訖站計算
- 日期/時間、起站/迄站 欄位改為永遠並排（`grid-cols-2`）
- 縮小手機版 padding 和字體大小（`px-2 py-2`、`text-xs`）

**`src/App.tsx`**
- Modal 結構改為 `flex flex-col overflow-hidden`
- Modal Header 加上 `flex-shrink-0`
- Modal Content 加上 `flex-1 min-h-0`

**`src/index.css`**
- 修正 iOS 日期/時間輸入框溢出問題
- 加入 `-webkit-appearance: none` 和 `max-width: 100%`

#### 技術要點
- Tailwind CSS 響應式設計：`sm:` 斷點用於 640px 以上
- Modal 內捲動區與固定區分離：使用 flex 布局 + `overflow-y-auto`
- 方向欄位由 `getDirectionFromStations()` 自動計算

## Git Worktree

目前有一個平行開發分支用於「下載憑證」功能：
- 路徑：`C:\Users\siaob\code\20260114-thsr-download-receipt`
- 命名規則：`{日期}-{功能名稱}`
- 合併後應刪除 worktree

## 常用指令

```bash
# 開發伺服器
npm run dev

# 建置
npm run build

# Worktree 操作
git worktree list
git worktree remove <path>
```
