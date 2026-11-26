/**
 * 案件フォルダの自動作成
 *
 * 起動：メニュー「案件フォルダを作成」または 10分ごとの時間主導トリガー
 * 対象：案件マスタで「フォルダ作成」☑ かつ「案件フォルダURL」が空の行
 *
 * 重複防止：
 *   1) LockService で同時実行を排除
 *   2) URL列が埋まっている行はスキップ
 *   3) 親フォルダに同名フォルダが既にあれば新規作成せず再利用（URL書込み前に失敗した場合の再実行対策）
 */
function processPendingFolders() {
  const lock = LockService.getScriptLock();
  if (!lock.tryLock(30 * 1000)) {
    logRun_('processPendingFolders', 'WARN', '', '別の実行中のためスキップ');
    return;
  }
  try {
    withRun_('processPendingFolders', () => {
      const sh = SpreadsheetApp.getActive().getSheetByName(SHEET.CASES);
      const last = sh.getLastRow();
      if (last < 2) return '対象なし';
      const values = sh.getRange(2, 1, last - 1, SCHEMAS[SHEET.CASES].length).getValues();
      let created = 0;
      values.forEach((row, i) => {
        const flag = row[CASE_COL.CREATE_FLAG - 1] === true;
        const url = row[CASE_COL.FOLDER_URL - 1];
        if (!flag || url) return;
        const caseId = String(row[CASE_COL.ID - 1]).trim();
        const client = String(row[CASE_COL.CLIENT - 1]).trim();
        if (!caseId || !client) {
          logRun_('processPendingFolders', 'WARN', `行${i + 2}`, '案件IDまたはクライアント名が空のためスキップ');
          return;
        }
        try {
          const folder = createCaseFolder_(caseId, client);
          const r = i + 2;
          sh.getRange(r, CASE_COL.FOLDER_URL).setValue(folder.getUrl());
          sh.getRange(r, CASE_COL.CREATED_AT).setValue(
            Utilities.formatDate(new Date(), 'Asia/Tokyo', 'yyyy/MM/dd HH:mm'));
          SpreadsheetApp.flush();
          logRun_('createCaseFolder', 'OK', caseId, folder.getUrl());
          created++;
        } catch (e) {
          // 1件の失敗で他の案件を止めない。エラーは記録・通知
          logRun_('createCaseFolder', 'ERROR', caseId, e.message);
          notify_(`案件フォルダ作成エラー: ${caseId}`, e.stack || e.message);
        }
      });
      return `作成 ${created} 件`;
    });
  } finally {
    lock.releaseLock();
  }
}

function createCaseFolder_(caseId, client) {
  const root = DriveApp.getFolderById(getSetting('CASE_ROOT_FOLDER_ID', true));
  const name = `${caseId}_${client}`;
  const caseFolder = getOrCreateChild_(root, name);

  const folders = {};
  CASE_SUBFOLDERS.forEach((path) => {
    const parts = path.split('/');
    let parent = caseFolder;
    parts.forEach((p) => { parent = getOrCreateChild_(parent, p); });
    folders[path] = parent;
  });

  const ymd = Utilities.formatDate(new Date(), 'Asia/Tokyo', 'yyyyMMdd');
  const ymdLabel = Utilities.formatDate(new Date(), 'Asia/Tokyo', 'yyyy年M月d日');
  CASE_TEMPLATES.forEach(([key, sub, docName]) => {
    const tplId = getSetting(key);
    if (!tplId) return; // テンプレート未設定ならコピーしない
    const dest = folders[sub];
    const fileName = `${caseId}_${docName}_${ymd}`;
    if (dest.getFilesByName(fileName).hasNext()) return; // 再実行時の重複防止
    const copy = DriveApp.getFileById(tplId).makeCopy(fileName, dest);
    if (copy.getMimeType() === MimeType.GOOGLE_DOCS) {
      fillPlaceholders_(copy.getId(), { '案件ID': caseId, 'クライアント名': client, '日付': ymdLabel });
    }
  });
  return caseFolder;
}

function getOrCreateChild_(parent, name) {
  const it = parent.getFoldersByName(name);
  return it.hasNext() ? it.next() : parent.createFolder(name);
}

/** ドキュメント内の {{キー}} を置換 */
function fillPlaceholders_(docId, map) {
  const doc = DocumentApp.openById(docId);
  const targets = [doc.getBody(), doc.getHeader(), doc.getFooter()].filter(Boolean);
  Object.keys(map).forEach((k) => {
    const pattern = `\\{\\{${k}\\}\\}`;
    targets.forEach((t) => t.replaceText(pattern, map[k]));
  });
  doc.saveAndClose();
}
