import os
import sys
import json
import time
from pathlib import Path

# modules 경로 추가
current_dir = os.path.dirname(os.path.abspath(__file__))
modules_path = os.path.join(current_dir, "modules")
sys.path.insert(0, modules_path)

from get_accession_list import get_accession_list
from download_sec_html import fetch_and_save_html

# 설정
COMPANY_META_PATH = "stock_new.json"
RAW_HTML_DIR = Path("data/raw")
RAW_HTML_DIR.mkdir(parents=True, exist_ok=True)

# 기업 메타 정보 불러오기
with open(COMPANY_META_PATH, encoding="utf-8") as f:
    company_meta = json.load(f)

# 기업별 처리
for company in company_meta:
    cik = company["CIK"]
    symbol = company["symbol"]

    print(f"\n{symbol} (CIK: {cik}) 보고서 수집 중...")

    try:
        report_list = get_accession_list(COMPANY_META_PATH, target_cik=cik)
        print(f"{symbol} - {len(report_list)}개 보고서 수집 완료")
    except Exception as e:
        print(f"[ERROR] {symbol}: 보고서 수집 실패 - {e}")
        continue

    for info in report_list:
        accession = info["accession"]
        filename = info["filename"]
        report_date = info["reportDate"]  # '2025-03-31' 형식

        # 연도 및 분기 계산
        year = report_date[:4]
        month = int(report_date[5:7])
        if 1 <= month <= 3:
            quarter = 1
        elif 4 <= month <= 6:
            quarter = 2
        elif 7 <= month <= 9:
            quarter = 3
        else:
            quarter = 4

        # 저장 파일명 생성
        base_filename = f"{symbol}_{year}_Q{quarter}_en"
        html_path = RAW_HTML_DIR / f"{base_filename}.html"

        print(f"{symbol} - {accession} 저장 중 → {html_path.name}")

        try:
            fetch_and_save_html(cik, accession, filename, html_path)
        except Exception as e:
            print(f"[ ERROR] {symbol} ({accession}): {e}")

        time.sleep(0.5)

print("\n모든 raw HTML 저장 완료")
