# dice recorder
過年大戰紀錄骰子的小工具

特別感謝 @stanley2058 為本專案做出的貢獻。

## 功能
- 逐筆記錄骰子點數（每局三顆）
- 完整統計（骰面分佈、大小/豹子、單雙、和值分佈、對子/豹子/順子、連續趨勢、熱門冷門）
- 撤銷最新一筆記錄（Undo Last）並同步更新所有統計
- Reset 清空所有紀錄

## GitHub Pages 部署
本專案是純靜態頁面，`index.html` 直接載入 `src/main.js`，不需要額外 web server 或打包流程。

## 測試
```bash
npm install
npm test
```

`npm test` 會執行 Vitest 並驗證 coverage 門檻。
