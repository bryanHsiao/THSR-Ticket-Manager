# 隱私權政策 / Privacy Policy

**最後更新日期**：2026-09-01

THSR Ticket Manager（以下簡稱「本應用程式」）是一個個人使用的高鐵車票管理工具。本文件說明本應用程式如何處理您的資料。

---

## 1. 我們收集哪些資料

本應用程式**不會將您的資料傳送到本應用程式擁有或維護的伺服器**。所有處理均在您的瀏覽器或您授權的第三方服務中進行。

以下資料會在您使用時被處理：

- **車票照片與 OCR 結果**：您上傳的高鐵車票影像、辨識後的票號、日期、起訖站、金額等欄位。
- **Google 帳號基本資訊**：您登入 Google 時提供的 email 與名稱（僅用於顯示與 Drive 同步識別）。
- **您設定的 OpenAI API Key**：僅儲存在瀏覽器 localStorage，僅用於呼叫 OpenAI API 進行 OCR。

---

## 2. 資料儲存位置

- **您的瀏覽器**：票券紀錄、設定值儲存在 IndexedDB / localStorage。
- **您的 Google Drive**：啟用同步後，車票照片與 JSON 資料會存到您 Google Drive 的「應用程式資料夾」內，僅本應用程式能存取。

本應用程式使用 [`drive.file`](https://developers.google.com/identity/protocols/oauth2/scopes#drive) OAuth scope，**僅能存取由本應用程式自身建立的檔案**，無法讀取或修改您 Drive 上的其他任何資料。

---

## 3. 使用的第三方服務

| 服務 | 用途 | 資料傳送內容 |
|---|---|---|
| Google OAuth 2.0 | 登入驗證 | Google 帳號基本資訊 |
| Google Drive API | 車票資料同步 | 您上傳的車票影像與 JSON 檔 |
| OpenAI API (GPT-4o) | 車票 OCR 辨識 | 您上傳的車票影像（僅在辨識當下） |

各服務的隱私權政策：
- [Google Privacy Policy](https://policies.google.com/privacy)
- [OpenAI Privacy Policy](https://openai.com/privacy)

---

## 4. 資料保留與刪除

- 您可以在應用程式內隨時刪除票券紀錄。
- 要完全移除 Google Drive 上的資料：可到 [Google Drive 設定 → 管理應用程式](https://drive.google.com/drive/settings) 撤銷本應用程式的存取權，並刪除應用程式資料夾。
- 要撤銷 OAuth 存取權：到 [Google 帳戶 → 第三方應用程式與服務](https://myaccount.google.com/permissions)。

---

## 5. Cookie 與追蹤

本應用程式**不使用 cookie，也不進行任何形式的使用者追蹤、廣告或分析**。

---

## 6. 聯絡方式

本應用程式為個人專案，如有隱私權相關問題請於 GitHub 開 issue：
[https://github.com/bryanHsiao/THSR-Ticket-Manager/issues](https://github.com/bryanHsiao/THSR-Ticket-Manager/issues)
