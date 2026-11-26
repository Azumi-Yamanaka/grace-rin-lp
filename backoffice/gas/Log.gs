/**
 * 実行ログ・エラー通知
 */

/** 処理を包んで、開始〜結果を記録し、例外時は通知する */
function withRun_(name, fn) {
  try {
    const result = fn();
    logRun_(name, 'OK', '', result || '');
    return result;
  } catch (e) {
    logRun_(name, 'ERROR', '', e.message);
    notify_(`エラー: ${name}`, e.stack || e.message);
    throw e;
  }
}

function logRun_(name, status, target, message) {
  try {
    const ss = SpreadsheetApp.getActive();
    const sh = ss.getSheetByName(SHEET.LOG) || ss.insertSheet(SHEET.LOG);
    let env = '';
    try { env = getSetting('ENV'); } catch (_) { env = '(未設定)'; }
    sh.appendRow([
      Utilities.formatDate(new Date(), 'Asia/Tokyo', 'yyyy/MM/dd HH:mm:ss'),
      env, name, status, target, String(message).slice(0, 1000),
      Session.getActiveUser().getEmail() || Session.getEffectiveUser().getEmail(),
    ]);
  } catch (e) {
    console.error('ログ書き込み失敗', e); // ログ失敗で本処理を止めない
  }
}

/**
 * 管理者への通知（宛先は設定 NOTIFY_EMAIL のみ。クライアントには送らない）
 * test 環境では件名に [TEST] を付ける。
 */
function notify_(subject, body) {
  let to = '';
  try { to = getSetting('NOTIFY_EMAIL'); } catch (_) { /* 設定シート未作成 */ }
  if (!to) {
    console.warn('NOTIFY_EMAIL 未設定のため通知を送信しませんでした:', subject);
    return;
  }
  const prefix = isProd_() ? '[GR台帳]' : '[TEST][GR台帳]';
  MailApp.sendEmail({ to: to, subject: `${prefix} ${subject}`, body: body });
}
