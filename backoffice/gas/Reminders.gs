/**
 * 日次チェック（毎朝の時間主導トリガー）
 *  - パートナー情報の再確認期限切れ
 *  - 入金予定日を過ぎた未入金の紹介報酬
 *  - 「見込み」のまま長期間放置された紹介
 *  - 契約済なのに報酬開示が未チェックの紹介
 *  - 古い実行ログの削除
 * 指摘がある日だけ管理者に1通まとめて通知する。
 */
function dailyCheck() {
  withRun_('dailyCheck', () => {
    const ss = SpreadsheetApp.getActive();
    const today = startOfDay_(new Date());
    const issues = [];

    // パートナー：次回確認期限（U列=21）
    rows_(ss, SHEET.PARTNER).forEach((r) => {
      const due = r[20];
      if (r[1] && due instanceof Date && due < today) {
        issues.push(`[再確認] ${r[0]} ${r[1]}：公式情報の確認期限切れ（最終確認 ${fmt_(r[19])}）`);
      }
    });

    // 紹介案件
    const staleDays = Number(getSetting('PROSPECT_STALE_DAYS')) || 60;
    rows_(ss, SHEET.REFERRAL).forEach((r) => {
      const [id, , , client, , service, referredAt, disclosed, contractAt, , , , , , payDue, paidAt, status] = r;
      if (!id) return;
      if (payDue instanceof Date && payDue < today && !paidAt && status !== '不成立' && status !== '入金済み') {
        issues.push(`[未入金] ${id} ${client} / ${service}：入金予定日 ${fmt_(payDue)} を経過`);
      }
      if (status === '見込み' && referredAt instanceof Date && daysBetween_(referredAt, today) > staleDays) {
        issues.push(`[状況確認] ${id} ${client} / ${service}：紹介から${staleDays}日以上「見込み」のまま`);
      }
      if (contractAt && disclosed !== true) {
        issues.push(`[開示漏れ] ${id} ${client} / ${service}：契約済だが「報酬開示済み」が未チェック`);
      }
    });

    purgeOldLogs_(ss);

    if (issues.length) {
      notify_(`日次チェック：要対応 ${issues.length} 件`, issues.join('\n') + `\n\n台帳：${ss.getUrl()}`);
    }
    return `要対応 ${issues.length} 件`;
  });
}

function rows_(ss, name) {
  const sh = ss.getSheetByName(name);
  if (!sh || sh.getLastRow() < 2) return [];
  return sh.getRange(2, 1, sh.getLastRow() - 1, sh.getLastColumn()).getValues();
}

function purgeOldLogs_(ss) {
  const days = Number(getSetting('LOG_RETENTION_DAYS')) || 180;
  const sh = ss.getSheetByName(SHEET.LOG);
  if (!sh || sh.getLastRow() < 2) return;
  const limit = new Date(Date.now() - days * 86400000);
  const values = sh.getRange(2, 1, sh.getLastRow() - 1, 1).getValues();
  // ログは時系列に追記されるので、先頭から古い行を数えて一括削除
  let n = 0;
  while (n < values.length && new Date(values[n][0]) < limit) n++;
  if (n > 0) sh.deleteRows(2, n);
}

const startOfDay_ = (d) => new Date(d.getFullYear(), d.getMonth(), d.getDate());
const daysBetween_ = (a, b) => Math.floor((startOfDay_(b) - startOfDay_(a)) / 86400000);
const fmt_ = (d) => (d instanceof Date ? Utilities.formatDate(d, 'Asia/Tokyo', 'yyyy/MM/dd') : '-');
