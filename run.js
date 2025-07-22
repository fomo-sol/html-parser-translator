// const { FinancialDocumentPreprocessor } = require('./libs/preprocessor');
const fs = require("fs");
const { removeUselessTags, removeDisplayNone } = require("./libs/preprocessor");
const { PositionBasedTranslationParser } = require("./libs/parser");

// html 읽기
const html = fs.readFileSync("./data/2488_000000248824000012.html", "utf8");
// 전처리
let preprocessed = removeDisplayNone(html);
preprocessed = removeUselessTags(preprocessed);

// 전처리 된것 저장
fs.writeFileSync("preprocessed.html", preprocessed);

// 1. 위치 기반 파싱
const parser = new PositionBasedTranslationParser(preprocessed);
const result = parser.extractTextsWithPositions();

// 2. 디버깅 정보 확인
// parser.debugInfo();

console.log("--------------------------------");

const data = result.segments
  .map((elem) => {
    return elem.text;
  })
  .join("\n\n␟\n\n");
console.log(data);
fs.writeFileSync("sample.txt", data);

// 3. 번역
// index별로 매핑
const translations = {
  0: "안녕하세요",
  1: "반갑습니다",
  2: "번역2",
  3: "번역3",
  4: "번역4",
  5: "번역5",
  6: "번역6",
  7: "번역7",
};

// 4. HTML 복구
const reconstructedHtml = parser.reconstructHtml(translations);

console.log("\n=== 복구된 HTML ===");

// console.log(reconstructedHtml);

// 복구된 html 저장
fs.writeFileSync("reconstructed.html", reconstructedHtml);

// 5. 복구 검증
// console.log("\n=== 복구 후 검증 ===");
// const verificationParser = new PositionBasedTranslationParser(
//   reconstructedHtml
// );
// const verificationResult = verificationParser.extractTextsWithPositions();
// console.log("복구된 텍스트들:");

// verificationResult.segments.forEach((seg) => {
//   console.log(`[${seg.id}] "${seg.text}"`);
// });
