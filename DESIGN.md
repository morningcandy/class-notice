# 개인 알림장 · 학급 알림장 v3 설계

- 최종 갱신일: 2026-08-15
- 기준 저장소: `morningcandy/class-notice`
- 상위 통합 설계: `morningcandy/class-planner`의 `DESIGN.md`

## 단일 원본

Google Sheets를 두 사이트의 단일 원본으로 사용한다. 교사용 사이트는 관리자 토큰으로 개인 일정과 공지 초안을 읽고 쓰며, 학생용 사이트는 Apps Script가 필터한 게시 데이터만 읽는다.

## 공개 경계

| 구성 | 공개 여부 | 역할 |
|---|---|---|
| `class-planner` GitHub Pages | 페이지 코드는 공개, 데이터는 인증 필요 | 교사 입력·검토·승인 |
| `class-notice` GitHub Pages | 공개 | 학생 공지 화면 |
| Google Sheets | 교사만 접근 | 모든 원본 데이터 |
| Apps Script | 공개 엔드포인트 | 관리자 토큰 및 학생 코드 검증 |

관리자 토큰·OpenAI API 키는 Script Properties에 저장하며 저장소에는 넣지 않는다. Claude OAuth 토큰과 브리지 접근 키는 학급 알림장으로 전달하지 않는다.

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

주요 action은 `adminLoad`, `ingest`, `ingestPrepared`, `upsertPlannerItem`, `setPlannerStatus`, `deletePlannerItem`, `createNotice`, `updateNotice`, `setNoticeStatus`, `recordResponse`이다.

## 화면과 권한

- 학생 화면 `/`: 로그인 전에는 게시된 전체 공지만 표시한다.
- 개인 코드 확인 후: 전체 공지와 해당 학생의 개별 공지만 표시한다.
- 관리자 화면 `/admin/`: 관리자 토큰 검증 후 공지 추가·수정·게시·보류·종료를 수행한다.
- 개인 코드와 관리자 토큰의 원문은 저장소에 저장하지 않는다.
- `data.js`에는 공개 가능한 학사일정만 두고 개인 공지는 Apps Script 응답으로만 제공한다.

## AI 정리

OpenAI API 키가 설정되면 Responses API의 JSON Schema 출력으로 일정과 공지 구조를 만든다. 키가 없거나 호출에 실패하면 명령어, 첫 문장, 날짜 표현을 이용한 기본 정리로 저장하며 관리자 화면에 경고를 표시한다. 어떤 경우에도 학생 공개는 관리자 승인을 거친다.

개인 알림장의 Claude 브리지가 정리한 결과는 `ingestPrepared`로 전달하므로 Apps Script에서 OpenAI API를 다시 호출하지 않는다.

## 배포

- 학생 사이트: `https://morningcandy.github.io/class-notice/`
- 관리자 사이트: `https://morningcandy.github.io/class-notice/admin/`
- 배포 기준: GitHub Pages `main` 브랜치 루트
- 데이터 API: `config.js`의 Apps Script URL
- 2026-08-15 확인: 학생 사이트와 관리자 사이트 모두 HTTP 200

## 구현된 내용

- [x] 게시된 전체 공지와 할 일 표시
- [x] 개인 코드 입력 후 본인 개별 공지·할 일 표시
- [x] 다른 학생의 이름·코드·개별 공지를 응답에서 제외하는 API 설계
- [x] 학생 확인·완료 응답 전송 UI
- [x] `/admin/` 관리자 로그인 화면
- [x] 공지 직접 추가·수정·게시·보류·종료·검토대기 전환
- [x] 개인 알림장과 동일한 Apps Script URL 공유
- [x] GitHub Pages 배포

## 남은 개발 항목

- [ ] **P0** `class-planner/apps-script.gs` 최신 v3 코드를 Apps Script에 배포한다.
- [ ] **P0** 배포 후 개인 알림장의 `[학급]` 공지가 검토대기로 생성되고 관리자 게시 후 학생 화면에 표시되는지 확인한다.
- [ ] **P0** 서로 다른 학생 코드 두 개로 개별 공지 격리가 유지되는지 종단 간 테스트한다.
- [ ] **P1** 초기 관리자 비밀번호 `admin1234`를 개인 비밀번호로 변경한다.
- [ ] **P1** 학생 명단과 개인 코드의 중복·누락·비활성 상태를 점검한다.
- [ ] **P1** 휴대전화 화면에서 개인 코드 로그인과 확인·완료 체크를 테스트한다.
- [ ] **P2** 학생에게 개인 코드 분실 시 재발급·문의 방법을 안내한다.

## 최근 작업

### 2026-08-15 — 설계 문서 운영 상태 갱신

- 개발 내용
  - 기존 데이터·권한·API 설계를 현재 Claude 브리지 흐름과 연결
  - 구현된 기능, 남은 개발 항목, 최근 작업 섹션 추가
- 관련 기능 커밋
  - `57aa74e`: 학급 알림장 관리자 대시보드 추가
- 검증
  - 학생 사이트 HTTP 200
  - 관리자 사이트 HTTP 200
  - 운영 Apps Script의 `?action=health`가 v3 health 대신 학생 피드를 반환하여 최신 백엔드 배포가 남아 있음을 확인
- 가장 명확한 다음 단계
  - 최신 Apps Script를 배포한 후 전체 공지와 학생 개별 공지를 실제 개인 코드로 종단 간 검증한다.
