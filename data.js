/* =========================================================================
   이 파일만 수정하면 사이트 내용이 바뀝니다. (index.html은 건드릴 필요 없음)

   ★ 공개 배포 버전 ★
   - 이 파일은 인터넷에 그대로 공개됩니다(주소로 누구나 열람 가능).
   - 그래서 학생 실명·학번은 넣지 않고, "번호 + 자음 이니셜"로만 표기합니다.
     (예: 강민희 → "1번 ㄱㅁㅎ")  누가 몇 번인지는 선생님만 따로 알고 계세요.
   - students      : 학생 명단(익명). code는 학생이 개인 공지를 확인할 때 입력하는 코드.
   - notices       : 공지사항. audience는 'all'(전체) 또는 학생 id(개인)
   - tasks         : 제출/할 일. audience는 'all'(전체) 또는 학생 id(개인)
   - calendarEvents: 학사일정. holidays: 공휴일. specialRanges: 고사기간 등.
   ========================================================================= */

const students = [
  {id:1,  num:1,  name:'1번 ㄱㅁㅎ',  code:'6573'},
  {id:2,  num:2,  name:'2번 ㄱㄷㅇ',  code:'9565'},
  {id:3,  num:3,  name:'3번 ㄱㅁㅅ',  code:'1555'},
  {id:4,  num:4,  name:'4번 ㄱㅅㅈ',  code:'6922'},
  {id:5,  num:5,  name:'5번 ㄱㅅㅎ',  code:'9303'},
  {id:6,  num:6,  name:'6번 ㄱㅈㅇ',  code:'1962'},
  {id:7,  num:7,  name:'7번 ㅂㅈㅎ',  code:'8091'},
  {id:8,  num:8,  name:'8번 ㅅㄷㅇ',  code:'9471'},
  {id:9,  num:9,  name:'9번 ㅅㅇㅈ',  code:'2933'},
  {id:10, num:10, name:'10번 ㅅㅇㅅ', code:'2708'},
  {id:11, num:11, name:'11번 ㅅㅇㅇ', code:'3529'},
  {id:12, num:12, name:'12번 ㅅㅈㅇ', code:'5227'},
  {id:13, num:13, name:'13번 ㅅㅎㅅ', code:'1644'},
  {id:14, num:14, name:'14번 ㅅㅎㅇ', code:'4284'},
  {id:15, num:15, name:'15번 ㅇㅇㄴ', code:'3195'},
  {id:16, num:16, name:'16번 ㅇㅅㅈ', code:'1261'},
  {id:17, num:17, name:'17번 ㅇㅅㅎ', code:'4756'},
  {id:18, num:18, name:'18번 ㅇㅅㅇ', code:'3877'},
  {id:19, num:19, name:'19번 ㅇㅇㄴ', code:'9227'},
  {id:20, num:20, name:'20번 ㅇㅎㅈ', code:'4524'},
  {id:21, num:21, name:'21번 ㅈㅊㅎ', code:'8538'},
  {id:22, num:22, name:'22번 ㅈㅅㅇ', code:'7315'},
  {id:23, num:23, name:'23번 ㅈㅇㅇ', code:'9435'},
  {id:24, num:24, name:'24번 ㅈㅇㅅ', code:'1831'},
  {id:25, num:25, name:'25번 ㅊㅇㄹ', code:'9324'},
  {id:26, num:26, name:'26번 ㅊㅇㅅ', code:'7037'},
  {id:27, num:27, name:'27번 ㅎㅈㅎ', code:'5452'},
  {id:28, num:28, name:'28번 ㅊㅁㅅ', code:'3201'},
];

const notices = [
  {id:1, title:'내일 체육복 지참', content:'내일은 체육 실기 평가가 있습니다. 체육복을 꼭 챙겨오세요.', date:'2026-08-14', audience:'all', urgent:true},
  {id:2, title:'과학 수행평가 준비물', content:'다음 주 화요일 과학 수행평가 준비물(관찰일지)을 미리 확인하세요.', date:'2026-08-13', audience:'all', urgent:false},
];

const tasks = [
  {id:1, title:'독서록 제출', dueDate:'2026-08-17', audience:'all'},
  {id:2, title:'과학 관찰일지 제출', dueDate:'2026-08-19', audience:'all'},
  {id:3, title:'수학 오답노트 제출', dueDate:'2026-08-10', audience:'all'},
];

/* 학생이 체크할 때 자동으로 기록되는 구글폼 연결 정보 (선생님이 구글시트에서 제출/확인 현황을 볼 수 있음)
   * 공개 배포라 학생 이름 대신 "번호 + 자음 이니셜"이 기록됩니다. 누가 몇 번인지는 선생님만 아세요. */
const GOOGLE_FORM_CONFIG = {
  action: 'https://docs.google.com/forms/u/0/d/e/1FAIpQLSc3zgADiehAaHCzHY-LpfZQEY-KGEu0x2rkkpXdFU0kJhcWvA/formResponse',
  entryStudent: 'entry.1015689208',
  entryTask: 'entry.1750846628',
  entryStatus: 'entry.1315951409',
};

/* 2학기 학사일정 */
const calendarEvents = [
  {date:'2026-08-17', title:'대체휴일'},
  {date:'2026-08-18', title:'개학식(2학기)', short:'개학식', alwaysShow:true},
  {date:'2026-08-19', title:'학교폭력예방교육(6교시) / 2학기 정부회장 임명장 수여식(7교시)'},
  {date:'2026-08-26', title:'금요일 시간표로 수업'},
  {date:'2026-08-27', title:'동아리활동(6,7교시) / 수요일 시간표로 수업'},
  {date:'2026-08-28', title:'축제'},
  {date:'2026-08-31', title:'환경미화'},
  {date:'2026-09-02', title:'전국연합학력평가(1,2학년)'},
  {date:'2026-09-04', title:'국가수준 학업성취도평가(2학년)'},
  {date:'2026-09-05', title:'2학기 리더십캠프'},
  {date:'2026-09-09', title:'성폭력·성매매 예방교육(6,7교시)'},
  {date:'2026-09-16', title:'흡연예방교육(6교시) / 약물오남용 및 마약류 예방교육(7교시)'},
  {date:'2026-09-22', title:'금요일 시간표로 수업'},
  {date:'2026-09-23', title:'학급회의(6교시) / 사회정서교육(7교시)'},
  {date:'2026-09-30', title:'도박예방교육(6교시) / 사회정서교육(7교시)'},
  {date:'2026-10-07', title:'사회정서교육(6,7교시) / 인터넷 중독 예방교육'},
  {date:'2026-10-20', title:'전국연합학력평가(1,2,3학년)'},
  {date:'2026-10-23', title:'학급별 체험학습'},
  {date:'2026-10-28', title:'학교폭력예방교육(6교시) / 아동학대예방교육(7교시)'},
  {date:'2026-11-02', title:'학부모 상담주간 시작(~11.6) / 학술제'},
  {date:'2026-11-03', title:'학부모 상담주간'},
  {date:'2026-11-04', title:'사회정서교육(6,7교시) / 학부모 상담주간'},
  {date:'2026-11-05', title:'학부모 상담주간'},
  {date:'2026-11-06', title:'학교 공개의 날 / 학부모 상담주간'},
  {date:'2026-11-11', title:'사회정서교육(6,7교시)'},
  {date:'2026-11-16', title:'목요일 시간표로 수업'},
  {date:'2026-11-17', title:'금요일 시간표로 수업'},
  {date:'2026-11-25', title:'봉사활동평가(6교시) / 동아리활동(7교시)'},
  {date:'2026-11-27', title:'배드민턴 한마당'},
  {date:'2026-12-02', title:'학생인권교육(6,7교시)'},
  {date:'2026-12-09', title:'실종유괴예방/방지교육(6,7교시)'},
  {date:'2026-12-23', title:'사회정서교육(6,7교시) / 글맞대첩'},
  {date:'2026-12-29', title:'2027 학생회장단 선거'},
  {date:'2026-12-30', title:'방학식', short:'방학식', alwaysShow:true},
  {date:'2027-02-01', title:'개학식', short:'개학식', alwaysShow:true},
  {date:'2027-02-03', title:'사회정서교육(6,7교시)'},
  {date:'2027-02-05', title:'종업식(1,2학년)'},
];

const holidays = [
  {date:'2026-08-15', title:'광복절', short:'광복절'},
  {date:'2026-08-17', title:'광복절 대체공휴일', short:'대체공휴일'},
  {date:'2026-09-24', title:'추석연휴', short:'추석연휴'},
  {date:'2026-09-25', title:'추석', short:'추석'},
  {date:'2026-09-26', title:'추석연휴', short:'추석연휴'},
  {date:'2026-10-03', title:'개천절', short:'개천절'},
  {date:'2026-10-05', title:'개천절 대체공휴일', short:'대체공휴일'},
  {date:'2026-10-09', title:'한글날', short:'한글날'},
  {date:'2026-11-19', title:'대학수학능력시험일(수능) - 재량휴업', short:'수능'},
  {date:'2026-11-20', title:'재량휴업일', short:'재량휴업'},
  {date:'2026-12-25', title:'성탄절', short:'성탄절'},
  {date:'2027-02-04', title:'졸업식 (2학년은 등교하지 않음)', short:'졸업식'},
  {date:'2027-02-08', title:'설날', short:'설날'},
  {date:'2027-02-09', title:'설날 대체공휴일', short:'대체공휴일'},
];

const specialRanges = [
  {start:'2026-10-13', end:'2026-10-16', title:'중간고사', type:'exam'},
  {start:'2026-12-10', end:'2026-12-16', title:'기말고사', type:'exam'},
  {start:'2027-02-22', end:'2027-02-25', title:'신학년 집중준비기간', type:'prep'},
];

const vacationRanges = [
  {start:'2026-12-31', end:'2027-01-31', title:'겨울방학'},
  {start:'2027-02-06', end:'2027-02-21', title:'학기말 정리기간', weekdayOnly:true},
];
