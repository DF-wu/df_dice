# df dice recorder

三骰（大小 / 豹子）紀錄與統計工具。純前端、零依賴、零後端；資料只存你的瀏覽器 localStorage。

特別感謝 @stanley2058 為本專案做出的貢獻。

## 功能

- 快速輸入：點骰子圖片或鍵盤 `1-6`
- 多局管理：新局 / 改名 / 刪局 / 清空本局
- 紀錄：每回合 3 顆骰，顯示和值與結果（大 / 小 / 豹子）
- 統計：
  - 點數分布（所有骰）
  - 和值分布（每回合）
  - 大 / 小 / 豹子比例 + 連莊（目前/最長）
  - 單 / 雙（不含豹子）
  - 對子 / 任意對子 / 指定對子（含豹子）
  - 熱門牌型 Top 10
  - 指定豹子統計（1-6）
- 基本偏骰檢查：χ²(df=5)（樣本太少時會提示）
- 備份：
  - 匯出 JSON（完整備份，含多局）
  - 匯出 CSV（當前局）
  - 匯入 JSON（新增到現有資料，不覆蓋）

## 使用方式

- 直接打開 `index.html`
- 或用任意靜態伺服器（推薦，避免瀏覽器對檔案存取限制）：

```bash
python -m http.server 5173
```

然後開啟 `http://localhost:5173/`

## GitHub Pages

本專案是純靜態檔案（`index.html` + JS/CSS + 圖片），可直接在 GitHub Pages 啟用：

- Settings → Pages → Build and deployment
- Source 選 `Deploy from a branch`
- Branch 選 `master`（或你的分支）+ `/ (root)`

## 資料存放

- localStorage key: `df_dice_state_v2`
- 舊版 key `dice_history` 會自動搬移（第一次開啟新版時）

## 測試

```bash
cd df_dice
npm test
npm run test:coverage
```
