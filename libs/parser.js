const cheerio = require("cheerio");

class PositionBasedTranslationParser {
  constructor(htmlContent) {
    this.originalHtml = htmlContent;
    this.$ = cheerio.load(htmlContent, {
      decodeEntities: false,
      lowerCaseAttributeNames: false,
    });
    this.textSegments = [];
    this.positionMap = new Map(); // 위치별 매핑
  }

  // 메인 함수: 위치 정보와 함께 텍스트 추출
  extractTextsWithPositions() {
    this.findTextPositions();
    return {
      segments: this.textSegments,
      originalHtml: this.originalHtml,
    };
  }

  // 정확한 위치 정보로 텍스트 찾기
  findTextPositions() {
    let segmentId = 0;
    let searchOffset = 0;

    // DOM 순회로 텍스트 노드 찾기
    this.walkDomForText(this.$.root(), (textNode, text) => {
      if (this.isTranslatable(text.trim())) {
        // 원본 HTML에서 정확한 위치 찾기
        const position = this.findExactPosition(textNode.data, searchOffset);

        if (position !== -1) {
          const segment = {
            id: segmentId++,
            text: text.trim(),
            originalText: textNode.data,
            startPos: position,
            endPos: position + textNode.data.length,
            parentInfo: this.getParentInfo(textNode),
            verification: this.createVerification(textNode.data, position),
          };

          this.textSegments.push(segment);
          this.positionMap.set(position, segment);
          searchOffset = position + textNode.data.length;
        }
      }
    });

    // 위치 순으로 정렬
    this.textSegments.sort((a, b) => a.startPos - b.startPos);

    // ID 재정렬
    this.textSegments.forEach((segment, index) => {
      segment.id = index;
    });
  }

  // DOM 순회하며 텍스트 노드 처리
  walkDomForText(element, callback) {
    element.contents().each((index, node) => {
      if (node.type === "text") {
        callback(node, node.data);
      } else if (node.type === "tag" && !this.isExcludedTag(node.name)) {
        this.walkDomForText(this.$(node), callback);
      }
    });
  }

  // 제외할 태그 확인
  isExcludedTag(tagName) {
    return ["script", "style", "noscript", "template"].includes(
      tagName.toLowerCase()
    );
  }

  // 원본 HTML에서 정확한 위치 찾기
  findExactPosition(textContent, startOffset = 0) {
    // HTML에서 정확히 일치하는 텍스트 찾기
    let position = this.originalHtml.indexOf(textContent, startOffset);

    // 만약 정확한 매치가 안 되면, HTML 엔티티 고려해서 다시 찾기
    if (position === -1) {
      const escapedText = this.escapeHtml(textContent);
      position = this.originalHtml.indexOf(escapedText, startOffset);
    }

    return position;
  }

  // HTML 엔티티 이스케이프
  escapeHtml(text) {
    return text
      .replace(/&/g, "&amp;")
      .replace(/</g, "&lt;")
      .replace(/>/g, "&gt;")
      .replace(/"/g, "&quot;")
      .replace(/'/g, "&#x27;");
  }

  // 부모 요소 정보 수집
  getParentInfo(textNode) {
    if (!textNode.parent) return null;

    const $parent = this.$(textNode.parent);
    return {
      tagName: textNode.parent.name,
      attributes: { ...textNode.parent.attribs },
      outerHtml: $parent.toString(),
      textContent: $parent.text(),
    };
  }

  // 검증 정보 생성 (복구 시 정확성 확인용)
  createVerification(originalText, position) {
    const before = this.originalHtml.substring(
      Math.max(0, position - 10),
      position
    );
    const after = this.originalHtml.substring(
      position + originalText.length,
      position + originalText.length + 10
    );

    return {
      before: before,
      after: after,
      length: originalText.length,
      checksum: this.simpleChecksum(originalText),
    };
  }

  // 간단한 체크섬 생성
  simpleChecksum(text) {
    let hash = 0;
    for (let i = 0; i < text.length; i++) {
      const char = text.charCodeAt(i);
      hash = (hash << 5) - hash + char;
      hash = hash & hash; // 32비트 정수로 변환
    }
    return hash;
  }

  // 번역 가능한 텍스트 판단
  isTranslatable(text) {
    if (!text || text.length < 2) return false;
    if (/^\s*$/.test(text)) return false; // 공백만
    if (/^[\d\s\.,;:!?\-()]*$/.test(text)) return false; // 숫자/기호만
    return true;
  }

  // 번역 결과로 HTML 복구
  reconstructHtml(translations) {
    let resultHtml = this.originalHtml;
    let offsetAdjustment = 0;

    // 위치 순으로 정렬된 세그먼트를 순차 처리
    for (const segment of this.textSegments) {
      if (translations.hasOwnProperty(segment.id)) {
        const translatedText = translations[segment.id];

        // 현재 오프셋 조정된 위치 계산
        const adjustedStartPos = segment.startPos + offsetAdjustment;
        const adjustedEndPos = segment.endPos + offsetAdjustment;

        // 검증: 해당 위치의 텍스트가 예상과 일치하는지 확인
        const currentText = resultHtml.substring(
          adjustedStartPos,
          adjustedEndPos
        );

        if (this.verifyPosition(currentText, segment)) {
          // 안전하게 교체
          const before = resultHtml.substring(0, adjustedStartPos);
          const after = resultHtml.substring(adjustedEndPos);

          resultHtml = before + translatedText + after;

          // 오프셋 조정 계산
          const lengthDiff =
            translatedText.length - segment.originalText.length;
          offsetAdjustment += lengthDiff;
        } else {
          console.warn(
            `Position verification failed for segment ${segment.id}: "${segment.text}"`
          );
          // 실패한 경우 fallback 방법 사용
          resultHtml = this.fallbackReplace(
            resultHtml,
            segment,
            translatedText
          );
        }
      }
    }

    // HTML의 <head> 태그 바로 아래에 meta 태그를 추가합니다.
    // 만약 <head>가 없다면, 아무 작업도 하지 않습니다.
    const metaTag =
      '<meta http-equiv="Content-Type" content="text/html; charset=UTF-8">';
    // 정규식으로 <head> 태그를 찾아서 바로 뒤에 삽입
    if (/<head[^>]*>/i.test(resultHtml)) {
      resultHtml = resultHtml.replace(/(<head[^>]*>)/i, `$1\n    ${metaTag}`);
    }

    return resultHtml;
  }

  // 위치 검증
  verifyPosition(currentText, segment) {
    // 정확한 텍스트 매치 확인
    if (currentText === segment.originalText) {
      return true;
    }

    // 체크섬으로 검증
    if (this.simpleChecksum(currentText) === segment.verification.checksum) {
      return true;
    }

    // 공백 제거 후 비교
    if (currentText.trim() === segment.originalText.trim()) {
      return true;
    }

    return false;
  }

  // Fallback 교체 방법
  fallbackReplace(html, segment, translatedText) {
    // 원본 텍스트를 직접 찾아서 첫 번째 매치만 교체
    const originalText = segment.originalText;
    const index = html.indexOf(originalText);

    if (index !== -1) {
      return (
        html.substring(0, index) +
        translatedText +
        html.substring(index + originalText.length)
      );
    }

    console.warn(`Fallback replace failed for: "${segment.text}"`);
    return html;
  }

  // 번역용 텍스트 맵 생성
  getTranslationMap() {
    return this.textSegments.reduce((map, segment) => {
      map[segment.id] = segment.text;
      return map;
    }, {});
  }

  // 복구 가능성 검증 (번역 전 미리 확인)
  validateRecovery() {
    const issues = [];

    for (const segment of this.textSegments) {
      const extractedText = this.originalHtml.substring(
        segment.startPos,
        segment.endPos
      );

      if (extractedText !== segment.originalText) {
        issues.push({
          segmentId: segment.id,
          expected: segment.originalText,
          found: extractedText,
          position: segment.startPos,
        });
      }
    }

    return {
      valid: issues.length === 0,
      issues: issues,
    };
  }

  // 디버깅 정보 출력
  debugInfo() {
    console.log("=== 위치 기반 텍스트 세그먼트 ===");
    this.textSegments.forEach((segment) => {
      console.log(`[${segment.id}] "${segment.text}"`);
      console.log(
        `  위치: ${segment.startPos}-${segment.endPos} (길이: ${
          segment.endPos - segment.startPos
        })`
      );
      console.log(`  부모: <${segment.parentInfo?.tagName || "unknown"}>`);
      console.log(
        `  검증: ${segment.verification.before}|${segment.originalText}|${segment.verification.after}`
      );
      console.log("---");
    });

    // 복구 검증
    const validation = this.validateRecovery();
    console.log(`\n복구 검증: ${validation.valid ? "PASS" : "FAIL"}`);
    if (!validation.valid) {
      console.log("Issues:", validation.issues);
    }
  }
}

module.exports = { PositionBasedTranslationParser };
