/**
 * 管理メニューとトリガー管理
 */
function onOpen() {
  SpreadsheetApp.getUi().createMenu('Grace Rin')
    .addItem('案件フォルダを作成（☑の行）', 'processPendingFolders')
    .addItem('日次チェックを今すぐ実行', 'dailyCheck')
    .addSeparator()
    .addItem('台帳をセットアップ／更新', 'setupLedgers')
    .addItem('入力規則を再適用', 'reapplyValidations')
    .addItem('診断シートのテンプレートを作成', 'buildDiagnosisTemplate')
    .addSeparator()
    .addItem('自動実行トリガーを設定', 'installTriggers')
    .addItem('自動実行トリガーを解除', 'removeTriggers')
    .addToUi();
}

const MANAGED_HANDLERS = ['processPendingFolders', 'dailyCheck'];

/** トリガーを（重複しないよう張り直して）設定。PCを閉じていてもクラウドで実行される */
function installTriggers() {
  removeTriggers();
  ScriptApp.newTrigger('processPendingFolders').timeBased().everyMinutes(10).create();
  ScriptApp.newTrigger('dailyCheck').timeBased().everyDays(1).atHour(8).inTimezone('Asia/Tokyo').create();
  logRun_('installTriggers', 'OK', '', MANAGED_HANDLERS.join(', '));
}

function removeTriggers() {
  ScriptApp.getProjectTriggers()
    .filter((t) => MANAGED_HANDLERS.indexOf(t.getHandlerFunction()) !== -1)
    .forEach((t) => ScriptApp.deleteTrigger(t));
}
