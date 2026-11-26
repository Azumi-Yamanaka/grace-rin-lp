/**
 * 台帳のセットアップ（冪等：何度実行しても既存データは消さない）
 */

/** 初期投入するパートナー候補（登録状況はすべて未調査。報酬・URLは公式確認後に手入力） */
const PARTNER_SEEDS = [
  ['Google Workspace', 'グループウェア'],
  ['freee会計', '会計'],
  ['freee人事労務（給与計算）', '給与・労務'],
  ['freee予約', '予約・顧客管理'],
  ['マネーフォワード クラウド', '会計'],
  ['Shopify', 'EC'],
  ['Notta', '議事録・AI'],
  ['Make', '自動化'],
  ['n8n', '自動化'],
  ['Gamma', '資料作成'],
];

function setupLedgers() {
  withRun_('setupLedgers', () => {
    const ss = SpreadsheetApp.getActive();
    setupSettings_(ss);
    setupOptions_(ss);
    // 参照先（案件マスタ等）が先に存在するよう、全シートを先に作る
    Object.keys(SCHEMAS).forEach((name) => getOrCreateSheet_(ss, name));
    Object.keys(SCHEMAS).forEach((name) => setupSheet_(ss, name, SCHEMAS[name]));
    setupSummary_(ss);
    seedPartners_(ss);
    applyConditionalFormats_(ss);
    return 'シート・列・入力規則を作成／更新しました';
  });
}

/** 選択肢マスタ編集後に入力規則だけ張り直す */
function reapplyValidations() {
  withRun_('reapplyValidations', () => {
    const ss = SpreadsheetApp.getActive();
    Object.keys(SCHEMAS).forEach((name) => applyValidations_(ss, ss.getSheetByName(name), SCHEMAS[name]));
    return '入力規則を再適用しました';
  });
}

function getOrCreateSheet_(ss, name) {
  return ss.getSheetByName(name) || ss.insertSheet(name);
}

function setupSettings_(ss) {
  const sh = getOrCreateSheet_(ss, SHEET.SETTINGS);
  if (sh.getLastRow() === 0) {
    sh.getRange(1, 1, 1, 3).setValues([['キー', '値', '説明']]).setFontWeight('bold');
    sh.setFrozenRows(1);
  }
  const existing = sh.getLastRow() > 1
    ? sh.getRange(2, 1, sh.getLastRow() - 1, 1).getValues().map((r) => r[0])
    : [];
  const missing = DEFAULT_SETTINGS.filter((row) => existing.indexOf(row[0]) === -1);
  if (missing.length) {
    sh.getRange(sh.getLastRow() + 1, 1, missing.length, 3).setValues(missing);
  }
  sh.getRange('A:A').setFontFamily('Roboto Mono');
}

function setupOptions_(ss) {
  const sh = getOrCreateSheet_(ss, SHEET.OPTIONS);
  const keys = Object.keys(OPTIONS);
  const headers = sh.getLastColumn() > 0
    ? sh.getRange(1, 1, 1, sh.getLastColumn()).getValues()[0]
    : [];
  keys.forEach((key) => {
    if (headers.indexOf(key) !== -1) return; // 既存列は編集内容を尊重して触らない
    const col = sh.getLastColumn() + 1;
    sh.getRange(1, col).setValue(key).setFontWeight('bold');
    sh.getRange(2, col, OPTIONS[key].length, 1).setValues(OPTIONS[key].map((v) => [v]));
    headers.push(key);
  });
  sh.setFrozenRows(1);
}

function setupSheet_(ss, name, schema) {
  const sh = getOrCreateSheet_(ss, name);
  const header = sh.getRange(1, 1, 1, schema.length);

  if (sh.getLastRow() === 0) {
    header.setValues([schema.map((c) => (c.type === 'formula' ? '' : c.name))]);
  } else {
    // 既存シート：見出しの食い違いを警告するだけで上書きしない
    const current = header.getValues()[0];
    schema.forEach((c, i) => {
      if (c.type !== 'formula' && current[i] !== '' && current[i] !== c.name) {
        logRun_('setupSheet', 'WARN', name, `${i + 1}列目の見出しが「${current[i]}」（定義:「${c.name}」）`);
      }
      if (c.type !== 'formula' && current[i] === '') sh.getRange(1, i + 1).setValue(c.name);
    });
  }

  // 配列数式の見出し
  schema.forEach((c, i) => {
    if (c.type === 'formula') sh.getRange(1, i + 1).setFormula(c.formula);
  });

  header.setFontWeight('bold').setBackground('#f3efe6').setWrap(true);
  sh.setFrozenRows(1);
  if (name !== SHEET.LOG) sh.setFrozenColumns(Math.min(2, schema.length));

  applyFormats_(sh, schema);
  applyValidations_(ss, sh, schema);
}

function applyFormats_(sh, schema) {
  const rows = Math.max(sh.getMaxRows() - 1, 1);
  schema.forEach((c, i) => {
    const range = sh.getRange(2, i + 1, rows, 1);
    if (c.type === 'date') range.setNumberFormat('yyyy/mm/dd');
    if (c.type === 'yen') range.setNumberFormat('¥#,##0');
    if (c.type === 'number') range.setNumberFormat('#,##0.##');
    if (c.type === 'formula') range.setBackground('#fafafa').setFontColor('#555555');
    if (c.format === 'date') range.setNumberFormat('yyyy/mm/dd');
  });
}

function applyValidations_(ss, sh, schema) {
  const rows = Math.max(sh.getMaxRows() - 1, 1);
  const opt = ss.getSheetByName(SHEET.OPTIONS);
  const optHeaders = opt.getRange(1, 1, 1, opt.getLastColumn()).getValues()[0];

  schema.forEach((c, i) => {
    const range = sh.getRange(2, i + 1, rows, 1);
    let rule = null;
    if (c.type === 'list') {
      const col = optHeaders.indexOf(c.list) + 1;
      if (col === 0) throw new Error(`選択肢マスタに「${c.list}」列がありません`);
      rule = SpreadsheetApp.newDataValidation()
        .requireValueInRange(opt.getRange(2, col, opt.getMaxRows() - 1, 1), true)
        .setAllowInvalid(false).build();
    } else if (c.type === 'ref') {
      rule = SpreadsheetApp.newDataValidation()
        .requireValueInRange(ss.getRange(c.ref), true)
        .setAllowInvalid(false).build();
    } else if (c.type === 'check') {
      rule = SpreadsheetApp.newDataValidation().requireCheckbox().build();
    } else if (c.type === 'date') {
      rule = SpreadsheetApp.newDataValidation().requireDate()
        .setAllowInvalid(false).setHelpText('日付を入力してください').build();
    } else if (c.type === 'url') {
      rule = SpreadsheetApp.newDataValidation().requireTextIsUrl()
        .setAllowInvalid(false).setHelpText('正規のURLのみ（架空のURLは入力しない）').build();
    } else if (c.type === 'yen' || c.type === 'number') {
      rule = SpreadsheetApp.newDataValidation().requireNumberGreaterThanOrEqualTo(0)
        .setAllowInvalid(false).build();
    }
    if (rule) range.setDataValidation(rule);
  });
}

function setupSummary_(ss) {
  const sh = getOrCreateSheet_(ss, SHEET.SUMMARY);
  const rev = `'${SHEET.REVENUE}'`;
  const cases = `'${SHEET.CASES}'`;
  const sumifs = (label, extra) =>
    `={"${label}";MAP(A2:A,LAMBDA(id,IF(id="","",SUMIFS(${extra}))))}`;

  const formulas = [
    `={"案件ID";IFERROR(FILTER(${cases}!A2:A,${cases}!A2:A<>""),"")}`,
    `={"クライアント名";ARRAYFORMULA(IF(A2:A="","",IFERROR(VLOOKUP(A2:A,${cases}!$A:$B,2,FALSE),"")))}`,
  ];
  OPTIONS['収益区分'].forEach((kind) => {
    formulas.push(sumifs(kind, `${rev}!E:E,${rev}!B:B,id,${rev}!D:D,"${kind}",${rev}!F:F,"<>見込み"`));
  });
  formulas.push(sumifs('売上合計（確定）', `${rev}!E:E,${rev}!B:B,id,${rev}!F:F,"<>見込み"`));
  formulas.push(sumifs('見込み額', `${rev}!E:E,${rev}!B:B,id,${rev}!F:F,"見込み"`));
  formulas.push(sumifs('稼働工数（h）', `${rev}!G:G,${rev}!B:B,id`));
  const total = formulas.length - 2; // 売上合計の列番号（1始まり）
  const hours = formulas.length;
  const col = (n) => String.fromCharCode(64 + n);
  formulas.push(
    `={"時間単価";ARRAYFORMULA(IF(A2:A="","",IFERROR(${col(total)}2:${col(total)}/${col(hours)}2:${col(hours)},"")))}`,
  );

  sh.clear();
  formulas.forEach((f, i) => sh.getRange(1, i + 1).setFormula(f));
  sh.getRange(1, 1, 1, formulas.length).setFontWeight('bold').setBackground('#f3efe6').setWrap(true);
  sh.getRange(2, 3, sh.getMaxRows() - 1, formulas.length - 2).setNumberFormat('¥#,##0');
  sh.getRange(2, hours, sh.getMaxRows() - 1, 1).setNumberFormat('#,##0.0');
  sh.setFrozenRows(1);
  sh.setFrozenColumns(2);
}

function seedPartners_(ss) {
  const sh = ss.getSheetByName(SHEET.PARTNER);
  if (sh.getLastRow() > 1) return; // データがあれば投入しない
  const width = 20; // A〜T列（U列=次回確認期限は配列数式のため書き込まない）
  const rows = PARTNER_SEEDS.map(([service, category], i) => {
    const row = new Array(width).fill('');
    row[0] = 'P' + String(i + 1).padStart(3, '0');
    row[1] = service;
    row[2] = category;
    row[4] = '未調査';
    row[5] = '未調査';
    return row;
  });
  sh.getRange(2, 1, rows.length, width).setValues(rows);
}

function applyConditionalFormats_(ss) {
  const red = '#f8d7da';

  const partner = ss.getSheetByName(SHEET.PARTNER);
  const due = partner.getRange('A2:V');
  const referral = ss.getSheetByName(SHEET.REFERRAL);
  const ref = referral.getRange('A2:R');

  partner.setConditionalFormatRules([
    SpreadsheetApp.newConditionalFormatRule()
      .whenFormulaSatisfied('=AND($U2<>"",$U2<TODAY())')
      .setBackground(red).setRanges([due]).build(),
  ]);
  referral.setConditionalFormatRules([
    // 入金予定日超過・未入金
    SpreadsheetApp.newConditionalFormatRule()
      .whenFormulaSatisfied('=AND($O2<>"",$O2<TODAY(),$P2="",$Q2<>"不成立")')
      .setBackground(red).setRanges([ref]).build(),
    // 契約済なのに報酬開示が未チェック
    SpreadsheetApp.newConditionalFormatRule()
      .whenFormulaSatisfied('=AND($I2<>"",$H2<>TRUE)')
      .setBackground('#fff3cd').setRanges([ref]).build(),
  ]);
}

/**
 * ツール活用診断シートのテンプレートを新規作成（templates/03 の構成）
 * 作成場所：設定 TEMPLATE_FOLDER_ID（未設定ならマイドライブ直下）
 */
function buildDiagnosisTemplate() {
  withRun_('buildDiagnosisTemplate', () => {
    const tpl = SpreadsheetApp.create('TPL_ツール活用診断');
    const tools = OPTIONS['ツール名'];
    const def = [
      ['1_契約状況',
        ['ツール', '契約状況', 'プラン', '月額費用', 'ライセンス数', '管理者（社内）', '管理者権限をGRに付与可', 'API連携', '利用状況', '未活用機能（メモ）', '確認方法・確認日'],
        tools.map((t) => [t])],
      ['2_機能活用チェック',
        ['機能', 'プランで利用可', '活用度（0〜3）', '活用例（バックオフィス）', '改善余地'],
        ['Gmail', 'Google Drive／共有ドライブ', 'Google スプレッドシート', 'Google ドキュメント', 'Google フォーム',
          'Google カレンダー（予約スケジュール）', 'Google Apps Script', 'Google サイト', 'AppSheet',
          'Looker Studio', 'Gemini', 'Google Chat／Meet'].map((f) => [f])],
      ['3_業務×ツール対応',
        ['#', '業務名', '現在のツール', '既存契約で代替・自動化できる機能', '追加費用', 'API連携の要否'], []],
      ['4_診断結果',
        ['#', '業務名', '分類', '理由', '打ち手', '優先度', '想定削減時間（h/月）'], []],
    ];
    def.forEach(([name, headers, rows], i) => {
      const sh = i === 0 ? tpl.getSheets()[0].setName(name) : tpl.insertSheet(name);
      sh.getRange(1, 1, 1, headers.length).setValues([headers])
        .setFontWeight('bold').setBackground('#f3efe6');
      if (rows.length) sh.getRange(2, 1, rows.length, 1).setValues(rows);
      sh.setFrozenRows(1);
    });
    const v = (list) => SpreadsheetApp.newDataValidation().requireValueInList(list, true).build();
    const s1 = tpl.getSheetByName('1_契約状況');
    s1.getRange('B2:B50').setDataValidation(v(OPTIONS['契約状況']));
    s1.getRange('G2:G50').setDataValidation(v(['可', '不可']));
    s1.getRange('H2:H50').setDataValidation(v(OPTIONS['API連携']));
    s1.getRange('I2:I50').setDataValidation(v(OPTIONS['利用状況']));
    s1.getRange('D2:D50').setNumberFormat('¥#,##0');
    tpl.getSheetByName('2_機能活用チェック').getRange('C2:C50').setDataValidation(v(['0', '1', '2', '3']));
    tpl.getSheetByName('4_診断結果').getRange('C2:C100').setDataValidation(
      v(['廃止', '簡略化', '標準化', '人が担う', 'AIに任せる', 'システムで自動化']));
    tpl.getSheetByName('4_診断結果').getRange('F2:F100').setDataValidation(v(['A', 'B', 'C']));

    const folderId = getSetting('TEMPLATE_FOLDER_ID');
    if (folderId) DriveApp.getFileById(tpl.getId()).moveTo(DriveApp.getFolderById(folderId));
    return `作成: ${tpl.getUrl()}（IDを設定 TPL_DIAGNOSIS_SHEET_ID に入力してください）`;
  });
}
