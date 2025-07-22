// step 1 : 원본 -> 세그먼트 추출
const fs = require("fs");
const { removeUselessTags, removeDisplayNone } = require("./libs/preprocessor");
const { PositionBasedTranslationParser } = require("./libs/parser");

const inputPath = "data/raw/AAPL_2023_Q3_en.html";
const outputDir = "data/segments";
const baseName = "AAPL_2023_Q3"; // 확장자 제외

const html = fs.readFileSync(inputPath, "utf8");

// 전처리
let preprocessed = removeDisplayNone(html);
preprocessed = removeUselessTags(preprocessed);

// 전처리 HTML 저장 (선택)
fs.writeFileSync(`data/preprocessed/${baseName}_clean.html`, preprocessed);

// 파서 적용
const parser = new PositionBasedTranslationParser(preprocessed);
const result = parser.extractTextsWithPositions();

// 분리된 텍스트 저장 (separator: ␟)
const textJoined = result.segments.map((s) => s.text).join("\n\n␟\n\n");
fs.writeFileSync(`${outputDir}/${baseName}_joined.txt`, textJoined);

// parser 객체 저장 (나중에 복구 시 필요)
fs.writeFileSync(
  `data/segments/${baseName}_parser.json`,
  JSON.stringify(parser)
);
