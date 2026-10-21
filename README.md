# Fran:D Data Analysis

품목별 시장·공급망·구매 원가 분석을 모으는 저장소입니다.

## 웹 사이트

- [품목별 분석 목록](https://saminpark.github.io/data-analysis/)
- [돼지고기 분석](https://saminpark.github.io/data-analysis/pork/)

GitHub Pages는 main 브랜치의 루트에서 배포됩니다. main에 변경 사항을 반영하면 사이트가 자동 갱신됩니다.

## 페이지

- `index.html`: 품목별 분석 목록
- `pork/index.html`: 돼지고기 / 족발 원가 인텔리전스 — 차트, 필터 및 구매 시나리오를 포함한 독립 페이지
- `pork/src/`: 분석 데이터, JavaScript, HTML 템플릿 및 재생성 스크립트

저장소를 다운로드한 후 `index.html`을 브라우저에서 열면 됩니다. 별도 설치나 서버 없이 작동합니다.

## 품목 추가

1. 품목별 폴더(`<품목 영문명>/`)를 만듭니다.
2. 해당 폴더의 `index.html`에 분석 페이지를 추가합니다.
3. 원자료와 생성 코드가 있으면 해당 품목의 `src/`에 보관합니다.
4. 루트 `index.html`에 해당 페이지로 연결되는 카드를 추가합니다.
5. 분석 기간, 데이터 출처, 실측값과 시나리오의 구분을 각 페이지에 기록합니다.

## 돼지고기 페이지 재생성

```sh
python pork/src/build_data.py
node --check pork/src/app.js
```

원본: https://frand-pork-market-brief.samin-park.chatgpt.site/

원본의 분석 내용과 기능을 유지하고, 품목 목록으로 돌아가는 링크를 추가했습니다. 데이터는 2026년 9월까지의 스냅샷이며 자동 갱신되지 않습니다. 사용자 승인에 따라 저장소와 웹 페이지를 공개합니다.
