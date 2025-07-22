# modules/download_sec_html.py

import requests
from pathlib import Path

SEC_ARCHIVE_BASE = "https://www.sec.gov/Archives/edgar/data"
HEADERS = {
    "User-Agent": "FomoApp (your_email@example.com)"  # 꼭 자신의 이메일로 바꿔주세요!
}

def fetch_and_save_html(cik: int, accession: str, filename: str, save_path: Path):
    """
    SEC 공식 EDGAR URL에서 HTML을 직접 다운로드하여 저장합니다.
    :param cik: 기업의 CIK 번호
    :param accession: 보고서 accession 번호 (예: 0000320193-25-000057)
    :param filename: HTML 파일 이름 (예: aapl-20250331.htm)
    :param save_path: 저장할 경로 (Path 객체)
    """
    # SEC 공식 URL 포맷
    acc_nodash = accession.replace("-", "")
    url = f"{SEC_ARCHIVE_BASE}/{cik}/{acc_nodash}/{filename}"

    try:
        print(f"🔍 직접 요청 URL: {url}")
        response = requests.get(url, headers=HEADERS)
        response.raise_for_status()

        # HTML 저장
        with open(save_path, "w", encoding="utf-8") as f:
            f.write(response.text)

        print(f"✅ HTML 저장 완료: {save_path.name}")
        return True

    except Exception as e:
        print(f"[ERROR] HTML 저장 실패 ({filename}): {e}")
        return False

# 테스트용 단독 실행
if __name__ == "__main__":
    test_cik = 320193
    test_accession = "0000320193-25-000057"
    test_filename = "aapl-20250331.htm"
    save_path = Path("data/raw/AAPL_2025_Q1_en.html")
    fetch_and_save_html(test_cik, test_accession, test_filename, save_path)
