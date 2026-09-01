# THSR Ticket Manager

台灣高鐵車票管理應用程式 - 使用 React + Vite + TypeScript 建構

**線上版本**：https://bryanHsiao.github.io/THSR-Ticket-Manager/

## 功能特色

- 車票拍照 OCR 辨識（使用 OpenAI GPT-4o）
- Google Drive 雲端同步
- 離線使用支援
- PWA 行動裝置體驗
- 憑證下載功能

## 快速開始

### 安裝依賴

```bash
npm install
```

### 啟動開發伺服器

```bash
npm run dev
```

### 建置專案

```bash
npm run build
```

## 在新機器上重建環境

依用途分兩種情境。

### 情境 A：只用網頁版

換新瀏覽器、新手機、平板就是這種。到 [線上版本](https://bryanHsiao.github.io/THSR-Ticket-Manager/) 做以下事：

1. 登入 Google 帳號 → 自動從 Drive 同步票券資料回來
2. 點右上角齒輪 → 填入 OpenAI API Key（存在 localStorage，每個瀏覽器都要填一次）

> **限制**：憑證下載功能無法用，因為它需要 Playwright 在本機跑（見情境 B）。

### 情境 B：完整開發環境（含憑證下載腳本）

新電腦要能改程式、跑 dev server、下載憑證 PDF。

#### 前置需求

- Node.js 20 以上
- Git

#### 步驟

1. **Clone repo**

   ```bash
   git clone https://github.com/bryanHsiao/THSR-Ticket-Manager.git
   cd THSR-Ticket-Manager
   ```

2. **安裝依賴**

   ```bash
   npm install
   npx playwright install chromium
   ```

   Playwright 的瀏覽器不會跟 `npm install` 一起裝，`npm run receipt` 會用到。

3. **建立 `.env` 檔案**（專案根目錄）

   ```
   VITE_GOOGLE_CLIENT_ID=<你的 Google OAuth Client ID>
   ```

   Client ID 從 [Google Cloud Console](https://console.cloud.google.com/) → APIs & Services → Credentials 找回舊的，或依照下方「Google Cloud Console 設定指南」建立新的。建議另外存進密碼管理器。

4. **更新憑證下載指令的專案路徑**

   ⚠️ [src/App.tsx](src/App.tsx) 裡 `handleDownloadReceipt` 有一行硬寫的專案路徑，新機器路徑不同要改：

   ```ts
   const projectDir = 'C:\\Users\\siaob\\code\\20260112-claude-code-spec-workflow';
   ```

5. **啟動 dev server 驗證**

   ```bash
   npm run dev
   ```

   到 `http://localhost:5173` 檢查能不能登入 Google、看到票券清單。

6. **測試憑證下載腳本**

   在網頁點下載憑證按鈕 → 複製指令 → 開 terminal 貼上執行 → 檢查 `downloads/高鐵憑證/` 有沒有 PDF。

7. **（選）設定 GitHub Pages 自動部署**

   若 fork 到自己 repo 才需要。到 GitHub → Settings → Pages 選 GitHub Actions 為來源，push 到 `main` 後看 Actions 頁確認 `Deploy to GitHub Pages` workflow 有跑起來。

#### 需要另外備份的機密

不會進 git、換機器要另外準備：

| 項目 | 存哪 | 補救方法 |
|---|---|---|
| `VITE_GOOGLE_CLIENT_ID` | 本機 `.env` | Google Cloud Console → Credentials 找回 |
| OpenAI API Key | 瀏覽器 localStorage | 到 [platform.openai.com](https://platform.openai.com/) 重新產生 |
| 票券資料與照片 | Google Drive | 登入後自動同步下來 |

## OCR 辨識設定

本應用程式使用 OpenAI GPT-4o 進行車票 OCR 辨識。

### 設定 API Key

1. 開啟應用程式
2. 點選右上角的齒輪圖示（設定按鈕）
3. 輸入您的 OpenAI API Key
4. 點選「儲存」

API Key 僅儲存在您的瀏覽器中（localStorage），不會傳送至任何伺服器。

若未設定 API Key 或網路不通，系統會自動切換為手動輸入模式。

## Google Cloud Console 設定指南

本應用程式使用 Google OAuth 2.0 進行身份驗證，並使用 Google Drive API 進行雲端同步。請依照以下步驟設定：

### 步驟 1：建立 Google Cloud 專案

1. 前往 [Google Cloud Console](https://console.cloud.google.com/)
2. 點選頁面頂部的專案選擇器
3. 點選「新增專案」
4. 輸入專案名稱（例如：THSR Ticket Manager）
5. 點選「建立」

### 步驟 2：啟用 Google Drive API

1. 在左側選單中，點選「API 和服務」>「程式庫」
2. 搜尋「Google Drive API」
3. 點選搜尋結果中的「Google Drive API」
4. 點選「啟用」按鈕

### 步驟 3：設定 OAuth 同意畫面

1. 在左側選單中，點選「API 和服務」>「OAuth 同意畫面」
2. 選擇使用者類型：
   - 若僅供個人使用，選擇「外部」
   - 若為 Google Workspace 組織內部使用，選擇「內部」
3. 點選「建立」
4. 填寫應用程式資訊：
   - 應用程式名稱：THSR Ticket Manager
   - 使用者支援電子郵件：您的電子郵件
   - 開發人員聯絡資訊：您的電子郵件
5. 點選「儲存並繼續」

### 步驟 4：設定範圍（Scopes）

1. 在「範圍」頁面，點選「新增或移除範圍」
2. 搜尋並勾選以下範圍：
   - `https://www.googleapis.com/auth/drive.file`
   （此範圍僅允許存取由本應用程式建立的檔案，確保最小權限原則）
3. 點選「更新」
4. 點選「儲存並繼續」

### 步驟 5：新增測試使用者（若選擇「外部」類型）

1. 在「測試使用者」頁面，點選「新增使用者」
2. 輸入您要用於測試的 Google 帳號電子郵件
3. 點選「儲存並繼續」

### 步驟 6：建立 OAuth 2.0 用戶端 ID

1. 在左側選單中，點選「API 和服務」>「憑證」
2. 點選頁面頂部的「建立憑證」
3. 選擇「OAuth 用戶端 ID」
4. 應用程式類型選擇「網頁應用程式」
5. 輸入名稱（例如：THSR Ticket Manager Web Client）
6. 在「已授權的 JavaScript 來源」區塊，新增：
   - 開發環境：`http://localhost:5173`
   - 正式環境：`https://your-username.github.io`
7. 點選「建立」

### 注意事項

- **測試模式限制**：在 OAuth 同意畫面未通過 Google 審核之前，僅有新增的測試使用者可以登入
- **正式發布**：若要開放給所有使用者，需要提交 OAuth 同意畫面審核申請

## 技術架構

- **前端框架**：React 18
- **建置工具**：Vite
- **程式語言**：TypeScript
- **樣式框架**：Tailwind CSS
- **狀態管理**：Zustand
- **本機儲存**：IndexedDB (Dexie)
- **OAuth 套件**：@react-oauth/google
- **OCR 引擎**：OpenAI GPT-4o（手動輸入備援）
- **部署平台**：GitHub Pages

## 授權

MIT License
