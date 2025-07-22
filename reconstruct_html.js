const fs = require("fs");
const path = require("path");
const { PositionBasedTranslationParser } = require("./libs/parser");

// 파일 경로
const baseName = "AAPL_2023_Q3";
const segmentsPath = `data/segments/${baseName}_parser.json`;
const translationsPath = `data/translations/${baseName}_translated.txt`;
const outputPath = `data/translated/${baseName}_translated.html`;

// 1. 파서 재생성
const parserData = fs.readFileSync(segmentsPath, "utf8");
const parserObj = JSON.parse(parserData);

// 💡 PositionBasedTranslationParser는 class라서 직접 JSON을 불러서 복원 불가
// 대신, 동일한 HTML로 파서 새로 생성 + segments 덮어쓰기
const originalHtml = fs.readFileSync(
  `data/preprocessed/${baseName}_clean.html`,
  "utf8"
);
const parser = new PositionBasedTranslationParser(originalHtml);
parser.textSegments = parserObj.textSegments;

// 2. 번역 텍스트 로드 및 맵핑
const translatedText = fs.readFileSync(translationsPath, "utf8");
const translatedSegments = translatedText.split("\n\n␟\n\n"); // 구분자 기준

// 매핑 객체 생성
const translationMap = {};
parser.textSegments.forEach((seg, idx) => {
  translationMap[seg.id] = translatedSegments[idx] || seg.text; // fallback 원문
});

// 3. HTML 복구
const resultHtml = parser.reconstructHtml(translationMap);

// 4. 저장
fs.mkdirSync(path.dirname(outputPath), { recursive: true });
fs.writeFileSync(outputPath, resultHtml, "utf8");

console.log(`✅ 번역 HTML 저장 완료: ${outputPath}`);
