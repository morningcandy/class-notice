# 개인 알림장 · 학급 알림장 v3 설계

## 단일 원본

Google Sheets를 두 사이트의 단일 원본으로 사용한다. 교사용 사이트는 관리자 토큰으로 개인 일정과 공지 초안을 읽고 쓰며, 학생용 사이트는 Apps Script가 필터한 게시 데이터만 읽는다.

## 공개 경계

| 구성 | 공개 여부 | 역할 |
|---|---|---|
| `class-planner` GitHub Pages | 페이지 코드는 공개, 데이터는 인증 필요 | 교사 입력·검토·승인 |
| `class-notice` GitHub Pages | 공개 | 학생 공지 화면 |
| Google Sheets | 교사만 접근 | 모든 원본 데이터 |
| Apps Script | 공개 엔드포인트 | 관리자 토큰 및 학생 코드 검증 |

관리자 토큰·OpenAI API 키는 Script Properties에 저장하며 저장소에는 넣지 않는다.

## 상태 전이

```text
공지: 검토대기 → 게시됨 → 종료됨
              ↘ 보류 → 검토대기

개인 일정: 진행 ↔ 완료
```

학생 API는 `게시됨` 상태만 반환한다. 개인 공지는 코드와 일치하는 학생의 `student_id`가 대상 목록에 있을 때만 반환한다.

## 명령어 라우팅

| 명령 | 개인 알림장 | 학생 공지 초안 |
|---|---|---|
| `[개인]` | 개인 | 없음 |
| `[교과]` | 교과 | 없음 |
| `[학급]` | 학급 | 학급 전체 |
| `[학생개별: 이름]` | 학급 | 지정 학생 |

명령어가 공개 범위를 최종 결정한다. AI 결과가 명령어와 다르더라도 서버가 명령어의 분류와 대상을 다시 강제한다.

## API 계약

### 학생 조회

`GET ?code=개인코드`

```json
{
  "ok": true,
  "student": { "num": 1, "name": "1번" },
  "notices": [],
  "tasks": []
}
```

코드가 없거나 틀리면 `student`는 `null`이고 전체 공지만 반환한다.

### 관리자 요청

브라우저의 CORS 사전 요청을 피하기 위해 JSON 문자열을 `text/plain` POST 본문으로 전송한다.

```json
{
  "action": "adminLoad",
  "token": "관리자 토큰"
}
```

주요 action은 `adminLoad`, `ingest`, `upsertPlannerItem`, `setPlannerStatus`, `updateNotice`, `setNoticeStatus`, `recordResponse`이다.

## AI 정리

OpenAI API 키가 설정되면 Responses API의 JSON Schema 출력으로 일정과 공지 구조를 만든다. 키가 없거나 호출에 실패하면 명령어, 첫 문장, 날짜 표현을 이용한 기본 정리로 저장하며 관리자 화면에 경고를 표시한다. 어떤 경우에도 학생 공개는 관리자 승인을 거친다.
