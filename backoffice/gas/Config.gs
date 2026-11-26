/**
 * Grace Rin 共通管理台帳 — 設定・シート定義
 *
 * ここに書いた定義から setupLedgers() がシート・列・入力規則を生成する。
 * 列を増やすときは、末尾に追加すること（既存列の順番を変えると既存データとずれる）。
 *
 * 列定義:
 *   name    : 見出し
 *   type    : 'text' | 'date' | 'yen' | 'number' | 'url' | 'check' | 'list' | 'ref' | 'formula'
 *   list    : type='list' のとき、選択肢マスタの列名
 *   ref     : type='ref' のとき、参照先 'シート名!A2:A'
 *   formula : type='formula' のとき、見出し行に置く配列数式（{見出し; ARRAYFORMULA(...)} 形式）
 */

const SHEET = {
  PARTNER: 'パートナー管理台帳',
  REFERRAL: '紹介案件管理台帳',
  TOOLS: '案件別ツール管理台帳',
  CASES: '案件マスタ',
  REVENUE: '案件収益管理',
  SUMMARY: '案件別サマリー',
  SETTINGS: '設定',
  OPTIONS: '選択肢マスタ',
  LOG: '実行ログ',
};

/** 設定シートの初期値（既にキーがあれば上書きしない） */
const DEFAULT_SETTINGS = [
  ['ENV', 'test', 'test / prod。test中は通知件名に[TEST]を付与'],
  ['CASE_ROOT_FOLDER_ID', '', '案件フォルダを作成する親フォルダのID（共有ドライブ推奨）'],
  ['TEMPLATE_FOLDER_ID', '', 'テンプレート置き場のフォルダID'],
  ['TPL_HEARING_DOC_ID', '', 'ヒアリングシート（Googleドキュメント）のID'],
  ['TPL_DIAGNOSIS_SHEET_ID', '', 'ツール活用診断（スプレッドシート）のID'],
  ['TPL_PROPOSAL_DOC_ID', '', '業務改善提案書（Googleドキュメント）のID'],
  ['NOTIFY_EMAIL', '', '通知先（Grace Rin 管理者のみ）'],
  ['RECHECK_DAYS', 90, 'パートナー情報の再確認周期（日）'],
  ['PROSPECT_STALE_DAYS', 60, '紹介が「見込み」のまま放置とみなす日数'],
  ['LOG_RETENTION_DAYS', 180, '実行ログの保持日数'],
];

/** 選択肢マスタ（列名: 選択肢配列） */
const OPTIONS = {
  'カテゴリ': ['会計', '給与・労務', '予約・顧客管理', 'EC', 'グループウェア', '議事録・AI', '自動化', '資料作成', 'その他'],
  '制度種別': ['紹介パートナー', 'アフィリエイト（ASP経由）', '販売代理店', '制度なし', '未調査'],
  '登録状況': ['未調査', '調査済・未登録', '申請中', '登録済', '否決', '対象外'],
  '可否': ['可', '不可', '要確認'],
  '報酬区分': ['単発', '継続', '単発＋継続'],
  '成果ステータス': ['見込み', '成果発生', '承認済み', '入金済み', '不成立'],
  'ツール名': ['Google Workspace', 'Microsoft 365', 'freee', 'マネーフォワード', 'Slack', 'Chatwork', 'Notion', 'Dropbox', 'ChatGPT', 'Claude', 'Shopify', 'その他'],
  '契約状況': ['契約済', '未契約', '不明'],
  '権限': ['あり', 'なし', '要確認'],
  'API連携': ['可', '不可', '上位プランで可', '要確認'],
  '利用状況': ['活用', '一部活用', '未活用'],
  '進行ステップ': [
    '01_ヒアリング', '02_環境確認', '03_業務分析', '04_改善提案', '05_自動化対象決定',
    '06_新規ツール判断', '07_紹介制度確認', '08_クライアント提案', '09_承認', '10_構築',
    '11_テスト・導入', '12_マニュアル作成', '13_内製化・納品', '14_収益管理', '完了', '保留',
  ],
  'クライアント環境': ['Google Workspace', 'Microsoft 365', '混在', 'その他'],
  '収益区分': ['業務分析・コンサル', 'システム構築', 'ツール導入支援', 'マニュアル作成', '保守・運用支援', '単発紹介報酬', '継続紹介報酬'],
  '収益ステータス': ['見込み', '成果発生', '承認済み', '請求済み', '入金済み'],
};

/** 設定値を参照する数式片 */
const settingRef_ = (key) => `VLOOKUP("${key}",'${SHEET.SETTINGS}'!$A:$B,2,FALSE)`;

/** 案件マスタから n 列目を引く配列数式 */
const caseLookup_ = (label, keyCol, n) =>
  `={"${label}";ARRAYFORMULA(IF(${keyCol}2:${keyCol}="","",IFERROR(VLOOKUP(${keyCol}2:${keyCol},'${SHEET.CASES}'!$A:$C,${n},FALSE),"")))}`;

const SCHEMAS = {
  [SHEET.PARTNER]: [
    { name: 'パートナーID', type: 'text' },
    { name: 'サービス名', type: 'text' },
    { name: 'カテゴリ', type: 'list', list: 'カテゴリ' },
    { name: '運営会社', type: 'text' },
    { name: '制度種別', type: 'list', list: '制度種別' },
    { name: '登録状況', type: 'list', list: '登録状況' },
    { name: '個人事業主の登録可否', type: 'list', list: '可否' },
    { name: '登録URL', type: 'url' },
    { name: '紹介専用URL', type: 'url' },
    { name: '紹介報酬', type: 'text' },
    { name: '報酬区分', type: 'list', list: '報酬区分' },
    { name: '報酬期間', type: 'text' },
    { name: '成果条件', type: 'text' },
    { name: '成果報告方法', type: 'text' },
    { name: '顧客特典', type: 'text' },
    { name: '掲載可否（メール）', type: 'list', list: '可否' },
    { name: '掲載可否（提案書）', type: 'list', list: '可否' },
    { name: '掲載可否（Web）', type: 'list', list: '可否' },
    { name: '規約URL', type: 'url' },
    { name: '最終確認日', type: 'date' },
    {
      name: '次回確認期限', type: 'formula', format: 'date',
      formula: `={"次回確認期限";ARRAYFORMULA(IF(T2:T="","",T2:T+${settingRef_('RECHECK_DAYS')}))}`,
    },
    { name: '備考', type: 'text' },
  ],
  [SHEET.REFERRAL]: [
    { name: '紹介ID', type: 'text' },
    { name: '案件ID', type: 'ref', ref: `'${SHEET.CASES}'!A2:A` },
    { name: '案件名', type: 'formula', formula: caseLookup_('案件名', 'B', 3) },
    { name: 'クライアント名', type: 'formula', formula: caseLookup_('クライアント名', 'B', 2) },
    { name: 'パートナーID', type: 'ref', ref: `'${SHEET.PARTNER}'!A2:A` },
    {
      name: '紹介サービス', type: 'formula',
      formula: `={"紹介サービス";ARRAYFORMULA(IF(E2:E="","",IFERROR(VLOOKUP(E2:E,'${SHEET.PARTNER}'!$A:$B,2,FALSE),"")))}`,
    },
    { name: '紹介日', type: 'date' },
    { name: '報酬開示済み', type: 'check' },
    { name: '契約日', type: 'date' },
    { name: '契約プラン', type: 'text' },
    { name: '契約人数', type: 'number' },
    { name: '見込み報酬', type: 'yen' },
    { name: '確定報酬', type: 'yen' },
    { name: '報酬区分', type: 'list', list: '報酬区分' },
    { name: '入金予定日', type: 'date' },
    { name: '入金日', type: 'date' },
    { name: '成果ステータス', type: 'list', list: '成果ステータス' },
    { name: '備考', type: 'text' },
  ],
  [SHEET.TOOLS]: [
    { name: 'レコードID', type: 'text' },
    { name: '案件ID', type: 'ref', ref: `'${SHEET.CASES}'!A2:A` },
    { name: 'クライアント名', type: 'formula', formula: caseLookup_('クライアント名', 'B', 2) },
    { name: 'ツール名', type: 'list', list: 'ツール名' },
    { name: '契約状況', type: 'list', list: '契約状況' },
    { name: '契約プラン', type: 'text' },
    { name: '月額費用', type: 'yen' },
    { name: 'ライセンス数', type: 'number' },
    { name: '管理者権限', type: 'list', list: '権限' },
    { name: 'API連携可否', type: 'list', list: 'API連携' },
    { name: '利用状況', type: 'list', list: '利用状況' },
    { name: '未活用機能', type: 'text' },
    { name: '改善提案', type: 'text' },
    { name: '自動化対象', type: 'text' },
    { name: '新規導入候補', type: 'text' },
    { name: '確認日', type: 'date' },
  ],
  [SHEET.CASES]: [
    { name: '案件ID', type: 'text' },
    { name: 'クライアント名', type: 'text' },
    { name: '案件名', type: 'text' },
    { name: '担当者', type: 'text' },
    { name: '進行ステップ', type: 'list', list: '進行ステップ' },
    { name: '開始日', type: 'date' },
    { name: 'クライアント主環境', type: 'list', list: 'クライアント環境' },
    { name: 'フォルダ作成', type: 'check' },
    { name: '案件フォルダURL', type: 'url' },
    { name: '作成日時', type: 'text' },
    { name: '備考', type: 'text' },
  ],
  [SHEET.REVENUE]: [
    { name: '明細ID', type: 'text' },
    { name: '案件ID', type: 'ref', ref: `'${SHEET.CASES}'!A2:A` },
    { name: '計上月', type: 'date' },
    { name: '報酬区分', type: 'list', list: '収益区分' },
    { name: '金額（税抜）', type: 'yen' },
    { name: 'ステータス', type: 'list', list: '収益ステータス' },
    { name: '稼働工数（h）', type: 'number' },
    { name: '備考', type: 'text' },
  ],
  [SHEET.LOG]: [
    { name: '日時', type: 'text' },
    { name: '環境', type: 'text' },
    { name: '処理名', type: 'text' },
    { name: '結果', type: 'text' },
    { name: '対象', type: 'text' },
    { name: 'メッセージ', type: 'text' },
    { name: '実行者', type: 'text' },
  ],
};

/** 案件マスタの列番号（1始まり）。CaseFolder.gs で使用 */
const CASE_COL = {
  ID: 1, CLIENT: 2, NAME: 3, CREATE_FLAG: 8, FOLDER_URL: 9, CREATED_AT: 10,
};

/** 案件フォルダのサブフォルダ構成（templates/01_案件別フォルダ構成.md と一致させる） */
const CASE_SUBFOLDERS = [
  '01_ヒアリング', '01_ヒアリング/議事録',
  '02_環境調査',
  '03_業務分析',
  '04_提案',
  '05_構築', '05_構築/設計書', '05_構築/テスト記録',
  '06_マニュアル・納品',
  '99_社内限定',
];

/** テンプレートのコピー先 [設定キー, 配置サブフォルダ, 書類名] */
const CASE_TEMPLATES = [
  ['TPL_HEARING_DOC_ID', '01_ヒアリング', 'ヒアリングシート'],
  ['TPL_DIAGNOSIS_SHEET_ID', '02_環境調査', 'ツール活用診断'],
  ['TPL_PROPOSAL_DOC_ID', '04_提案', '業務改善提案書'],
];

/** 設定シートから値を取得（必須キーが空なら例外） */
function getSetting(key, required) {
  const sh = SpreadsheetApp.getActive().getSheetByName(SHEET.SETTINGS);
  if (!sh) throw new Error('設定シートがありません。先に setupLedgers() を実行してください。');
  const rows = sh.getDataRange().getValues();
  const hit = rows.find((r) => r[0] === key);
  const value = hit ? hit[1] : '';
  if (required && (value === '' || value === null)) {
    throw new Error(`設定「${key}」が未入力です。設定シートに入力してください。`);
  }
  return value;
}

function isProd_() {
  return String(getSetting('ENV')).toLowerCase() === 'prod';
}
