import requests
import json

SEC_SUB_API = "https://data.sec.gov/submissions/CIK{cik:0>10}.json"
HEADERS = {"User-Agent": "FomoApp (contact@example.com)"}  # 실제 이메일로 교체 권장


def get_latest_filings(cik, max_count=8):
    try:
        response = requests.get(SEC_SUB_API.format(cik=cik), headers=HEADERS)
        response.raise_for_status()
        data = response.json()

        forms = data.get("filings", {}).get("recent", {}).get("form", [])
        accessions = data.get("filings", {}).get("recent", {}).get("accessionNumber", [])
        report_dates = data.get("filings", {}).get("recent", {}).get("reportDate", [])
        documents = data.get("filings", {}).get("recent", {}).get("primaryDocument", [])

        result = []
        for form, acc, date, doc in zip(forms, accessions, report_dates, documents):
            if form in ["10-Q", "10-K"]:
                result.append({
                    "accession": acc,
                    "form": form,
                    "reportDate": date,
                    "filename": doc  # 🔥 실제 HTML 문서 이름
                })
            if len(result) >= max_count:
                break
        return result

    except Exception as e:
        print(f"[ERROR] {cik}: {e}")
        return []


def get_accession_list(input_path: str, target_cik: int = None, top_rank_limit=50):
    with open(input_path, "r", encoding="utf-8") as f:
        companies = json.load(f)

    result_list = []

    for company in companies:
        cik = int(company["CIK"])

        if target_cik is not None and cik != target_cik:
            continue

        rank = company.get("rank", 999)
        max_reports = 8 if rank <= top_rank_limit else 1

        filings = get_latest_filings(cik, max_count=max_reports)
        for filing in filings:
            result_list.append({
                "symbol": company["symbol"],
                "company": company["company"],
                "CIK": cik,
                "accession": filing["accession"],
                "form": filing["form"],
                "reportDate": filing["reportDate"],
                "filename": filing["filename"]  # ✅ 추가됨
            })

        print(f"✅ {company['company']} - {len(filings)}개 보고서 수집 완료")

        if target_cik is not None:
            break

    return result_list


# 테스트용 단독 실행
if __name__ == "__main__":
    accession_data = get_accession_list("stock_new.json", top_rank_limit=50)
    with open("accession_list.json", "w", encoding="utf-8") as f:
        json.dump(accession_data, f, indent=2)
    print("📄 저장 완료: accession_list.json")
