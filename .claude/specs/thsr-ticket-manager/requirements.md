# Requirements Document

## Introduction

高鐵車票管理工具是一個 Web 應用程式，幫助經常搭乘高鐵出差的使用者管理車票紀錄。透過拍照或上傳車票圖片的方式，自動提取車票資訊（票號、搭乘時間、方向），並提供手動輸入出差目的的功能，方便雙月底報帳時下載憑證。

## Alignment with Product Vision

此功能解決了出差族群在報帳時需要手動紀錄車票資訊的痛點，透過 OCR 技術自動化提取資訊，減少人工輸入錯誤，提升報帳效率。

## Requirements

### Requirement 1: 車票圖片上傳與 OCR 辨識

**User Story:** As a 經常搭高鐵出差的員工, I want 透過拍照或上傳車票圖片來記錄車票資訊, so that 不需要手動抄寫車票號碼和時間

#### Acceptance Criteria

1. WHEN 使用者上傳車票圖片 THEN 系統 SHALL 接受 JPG、PNG、HEIC 格式的圖片
2. WHEN 圖片上傳成功 THEN 系統 SHALL 使用 OCR 技術提取車票號碼
3. WHEN OCR 辨識完成 THEN 系統 SHALL 提取搭乘日期與時間
4. WHEN OCR 辨識完成 THEN 系統 SHALL 辨識乘車方向（台北→左營 或 左營→台北）
5. IF OCR 辨識結果不確定 THEN 系統 SHALL 允許使用者手動修正
6. WHEN 使用者使用手機瀏覽 THEN 系統 SHALL 支援直接開啟相機拍照

### Requirement 2: 車票紀錄管理

**User Story:** As a 需要報帳的員工, I want 管理我的車票紀錄清單, so that 可以在報帳時快速查詢所有車票

#### Acceptance Criteria

1. WHEN 車票資訊提取成功 THEN 系統 SHALL 自動建立一筆車票紀錄
2. WHEN 建立車票紀錄時 THEN 系統 SHALL 允許使用者輸入出差目的/備註
3. WHEN 使用者查看紀錄清單 THEN 系統 SHALL 顯示票號、日期、方向、目的
4. WHEN 使用者篩選紀錄 THEN 系統 SHALL 支援按月份、方向篩選
5. IF 使用者要編輯紀錄 THEN 系統 SHALL 允許修改所有欄位
6. IF 使用者要刪除紀錄 THEN 系統 SHALL 要求確認後刪除

### Requirement 3: 資料持久化與雲端同步

**User Story:** As a 經常搭高鐵出差的員工, I want 我的車票紀錄能同步到 Google 雲端硬碟, so that 可以在不同裝置間存取，且不怕資料遺失

#### Acceptance Criteria

1. WHEN 使用者首次使用 THEN 系統 SHALL 提供 Google 帳號登入選項
2. WHEN 使用者授權 Google Drive 存取 THEN 系統 SHALL 在雲端建立專屬資料夾儲存紀錄
3. WHEN 車票紀錄建立或修改 THEN 系統 SHALL 自動同步至 Google Drive
4. WHEN 使用者在新裝置登入 THEN 系統 SHALL 從 Google Drive 載入所有紀錄
5. IF 使用者未登入 Google THEN 系統 SHALL 使用本機儲存作為備援
6. IF 網路斷線 THEN 系統 SHALL 暫存變更，待連線後自動同步
7. IF 使用者要匯出資料 THEN 系統 SHALL 支援匯出為 CSV 格式

### Requirement 4: 憑證下載輔助（Phase 2 - 待研究）

**User Story:** As a 需要報帳的員工, I want 能快速取得高鐵憑證, so that 不需要手動一張一張到網站下載

#### Acceptance Criteria

1. WHEN 使用者選擇車票紀錄 THEN 系統 SHALL 提供高鐵憑證下載頁面連結
2. WHEN 使用者點擊連結 THEN 系統 SHALL 開啟新視窗至高鐵網站
3. WHEN 可行時 THEN 系統 SHALL 自動帶入票號參數（需研究高鐵網站 API）

## Non-Functional Requirements

### Performance
- OCR 辨識應在 5 秒內完成
- 頁面載入時間應在 2 秒內
- 支援離線瀏覽已儲存的紀錄

### Security
- 車票圖片僅儲存在使用者本機或其個人 Google Drive，不上傳至第三方伺服器
- OCR 處理應在客戶端進行或使用安全的 API
- Google Drive 存取應使用 OAuth 2.0 授權，僅請求必要的權限範圍
- 使用者可隨時撤銷 Google 授權

### Reliability
- 本機儲存應防止資料遺失
- 支援資料匯出備份

### Usability
- 支援響應式設計，適配手機與桌面瀏覽器
- 拍照/上傳流程應在 3 步內完成
- 介面支援繁體中文

### Compatibility
- 支援紙本車票 OCR 辨識
- 支援高鐵 T-EX App 電子票截圖 OCR 辨識
