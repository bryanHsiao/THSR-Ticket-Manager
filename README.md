# THSR Ticket Manager

台灣高鐵車票管理應用程式 - 使用 React + Vite + TypeScript 建構

## 功能特色

- 車票拍照 OCR 辨識
- Google Drive 雲端同步
- 離線使用支援
- PWA 行動裝置體驗

## 快速開始

### 安裝依賴

```bash
npm install
```

### 環境變數設定

複製 `.env.example` 為 `.env` 並填入 Google OAuth Client ID：

```bash
cp .env.example .env
```

編輯 `.env` 檔案，設定您的 Google Client ID：

```
VITE_GOOGLE_CLIENT_ID=your_google_client_id.apps.googleusercontent.com
```

### 啟動開發伺服器

```bash
npm run dev
```

### 建置專案

```bash
npm run build
```

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
   - 正式環境：您的網站網址（例如：`https://your-domain.com`）
7. 點選「建立」
8. 複製顯示的「用戶端 ID」

### 步驟 7：設定環境變數

將步驟 6 取得的用戶端 ID 填入 `.env` 檔案：

```
VITE_GOOGLE_CLIENT_ID=123456789-abcdefg.apps.googleusercontent.com
```

### 注意事項

- **測試模式限制**：在 OAuth 同意畫面未通過 Google 審核之前，僅有新增的測試使用者可以登入
- **正式發布**：若要開放給所有使用者，需要提交 OAuth 同意畫面審核申請
- **安全性**：請勿將 `.env` 檔案提交至版本控制系統

## 技術架構

- **前端框架**：React 18
- **建置工具**：Vite
- **程式語言**：TypeScript
- **樣式框架**：Tailwind CSS
- **狀態管理**：Zustand
- **本機儲存**：IndexedDB (Dexie)
- **OAuth 套件**：@react-oauth/google
- **OCR 引擎**：Tesseract.js

## 授權

MIT License
