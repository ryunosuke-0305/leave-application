//「休暇届のテンプレート」ファイルのID
// https://docs.google.com/document/d/**********/edit
const TEMPLATE_FILE_ID = "";
// 「電子印鑑.png」ファイルのID
// https://drive.google.com/file/d/**********/view
const SEAL_FILE_ID = "";
// 「休暇届」フォルダのID（作成した休暇届のPDFを格納するフォルダ）
// https://drive.google.com/drive/u/0/folders/***********/
const FOLDER_ID = "";


// googleフォームが送信された際に実行される
// e：googleフォームの回答内容
function onFormSubmit(e) {

  // googleフォームの回答を利用しやすい形式にフォーマット
  const data = formatFormData(e);

  // 作成するPDFのファイル名を作成
  const fileName = buildFileName(data);

  // PDF作成
  generatePDF(data, fileName);

  Logger.log("PDF生成完了！");
}


// googleフォームの回答を利用しやすい形式にフォーマット
// e：googleフォームの回答内容
function formatFormData(e) {

  // googleフォームの回答を取得
  const applyDate = new Date(e.namedValues["タイムスタンプ"][0]);
  const belong = e.namedValues["所属"][0];
  const position = e.namedValues["役職"][0];
  const employeeId = e.namedValues["社員番号"][0];
  const name = e.namedValues["氏名"][0];
  const applyType = e.namedValues["適用区分"][0]; 
  const startDate = new Date(e.namedValues["期間（休暇取得開始日）"][0]);
  const endDate = new Date(e.namedValues["期間（休暇取得終了日）"][0]);
  const reason = e.namedValues["理由"][0];

  // 有給取得日数（有給取得終了日 - 有給取得開始日 + 1）
  const diff = endDate - startDate;
  const period = diff / (1000 * 60 * 60 * 24) + 1;

  return {
    // 有給申請日（googleフォーム送信時のシステム日付）
    applyDate: {
      y: applyDate.getFullYear(),
      m: applyDate.getMonth() + 1,
      d: applyDate.getDate()
    },
    // 有給取得開始日
    startDate: {
      m: startDate.getMonth() + 1,
      d: startDate.getDate(),
      w: getDayOfWeek(startDate)
    },
    // 有給取得終了日
    endDate: {
      m: endDate.getMonth() + 1,
      d: endDate.getDate(),
      w: getDayOfWeek(endDate)
    },
    // 所属
    belong: belong,
    // 役職
    position: position,
    // 社員番号
    employeeId: employeeId,
    // 氏名
    name: name,
    // 適用区分
    applyType: applyType,
    // 有給取得日数
    period: period,
    // 有給取得理由
    reason: reason,
  };

}


// 作成するPDFのファイル名を作成
// data：フォーマットしたgoogleフォームの回答
function buildFileName(data) {

  // 有給取得日数が1日の場合
  // XX0001 山田太郎_mm月dd日_有給休暇申請書
  // 有給取得日数が複数日の場合
  // XX0001 山田太郎_mm月dd日～mm月dd日_有給休暇申請書
  if (data.period === 1) {
    return `${data.employeeId} ${data.name}_${data.startDate.m}月${data.startDate.d}日_${data.applyType}申請書`;
  } else {
    return `${data.employeeId} ${data.name}_${data.startDate.m}月${data.startDate.d}日〜${data.endDate.m}月${data.endDate.d}日_${data.applyType}申請書`;
  }
}

// PDF生成
function generatePDF(data, fileName) {
  
  //「休暇届のテンプレート」のファイルオブジェクトを取得
  const templateFile = DriveApp.getFileById(TEMPLATE_FILE_ID);
  // PDFを格納するフォルダのオブジェクトを取得
  const folder = DriveApp.getFolderById(FOLDER_ID);
  //「休暇届のテンプレート」のコピーを生成
  const copiedFile = templateFile.makeCopy(fileName, folder);

  // 生成したコピーにデータを挿入する
  const copiedId = copiedFile.getId();
  const doc = DocumentApp.openById(copiedId);
  const body = doc.getBody();

  // 有給申請日
  body.replaceText("{{y}}", data.applyDate.y);
  body.replaceText("{{m}}", data.applyDate.m);
  body.replaceText("{{d}}", data.applyDate.d);

  // 所属
  body.replaceText("{{belong}}", data.belong);

  // 役職
  body.replaceText("{{position}}", data.position);

  // 社員番号
  body.replaceText("{{employeeId}}", data.employeeId);

  // 氏名
  body.replaceText("{{name}}", data.name);

  // 適用区分
  const map = {
    "有給休暇": "{{yukyu}}",
    "特別休暇": "{{tokubetsu}}",
    "振替休暇": "{{furikae}}",
    "慶弔休暇": "{{keicho}}"
  };

  const targetPlaceholder = map[data.applyType] || "";

  Object.values(map).forEach(ph => {
    body.replaceText(ph, ph === targetPlaceholder ? "✓" : "");
  });

  // 有給取得開始日
  body.replaceText("{{sm}}", data.startDate.m);
  body.replaceText("{{sd}}", data.startDate.d);
  body.replaceText("{{sw}}", data.startDate.w);

  // 有給取得終了日
  body.replaceText("{{em}}", data.endDate.m);
  body.replaceText("{{ed}}", data.endDate.d);
  body.replaceText("{{ew}}", data.endDate.w);

  // 有給取得日数
  body.replaceText("{{period}}", data.period);

  // 理由
  body.replaceText("{{reason}}", data.reason);

  // 電子印鑑を挿入
  insertSeal(body);

  doc.saveAndClose();

  // PDF形式で保存
  const pdfBlob = DriveApp.getFileById(copiedId).getAs("application/pdf");
  folder.createFile(pdfBlob).setName(fileName + ".pdf");
}


// 電子印鑑を挿入
function insertSeal(body) {

  const file = DriveApp.getFileById(SEAL_FILE_ID);
  sealBlob = file.getBlob();

  const range = body.findText("{{seal}}");
  if (!range) return;

  const elem = range.getElement();
  elem.asText().setText("");

  // 画像を挿入して、その画像オブジェクトを取得
  const inlineImage = elem.getParent().insertInlineImage(0, sealBlob);

  // サイズ調整
  inlineImage.setWidth(50);   // 横幅 50px
  inlineImage.setHeight(50);  // 高さ 50px

}

// 曜日を日本語で返す
function getDayOfWeek(date) {
  const week = ["日", "月", "火", "水", "木", "金", "土"];
  return week[date.getDay()];
}
