# 2학년 3반 학급 안내 (학생용)

학생용 학급 안내 사이트입니다. 학생은 개인 코드를 입력해 개인 공지를 확인하고, 제출/할 일을 체크할 수 있습니다.

## ⚠️ 공개 사이트 — 개인정보 주의
GitHub Pages는 공개 사이트라 `data.js`를 누구나 열람할 수 있습니다.
그래서 이 저장소의 `data.js`에는 **학생 실명·학번을 넣지 않고 "번호 + 자음 이니셜"로만** 표기합니다 (예: `1번 ㄱㅁㅎ`).
- 실명 매핑(번호 → 실제 이름)은 **이 저장소에 올리지 말고** 선생님만 따로 보관하세요.
- 개인 코드는 학생 각자에게 개별로 알려주세요.

## 내용 수정
`data.js`만 고치면 내용이 바뀝니다:
- `students` — 학생 명단(익명, 코드)
- `notices` — 공지사항
- `tasks` — 제출/할 일
- `calendarEvents` / `holidays` / `specialRanges` — 달력

## 파일
- `index.html` — 앱 (수정할 필요 없음)
- `data.js` — 내용
- `snack_icon_full.png` — 앱 아이콘

## 배포 (GitHub Pages)
Settings → Pages → Branch `main` / `/(root)` →
`https://<사용자명>.github.io/<저장소이름>/`
