(() => {
  'use strict';

  const API_URL = window.CLASS_NOTICE_CONFIG.apiUrl;
  const AUTH_KEY = 'classNotice.adminToken.v1';
  const state = { token: '', notices: [], students: [], filter: 'all' };
  const $ = (selector) => document.querySelector(selector);
  const $$ = (selector) => [...document.querySelectorAll(selector)];

  const ui = {
    loginView: $('#loginView'), adminView: $('#adminView'), loginForm: $('#loginForm'),
    passwordInput: $('#passwordInput'), loginError: $('#loginError'), logoutBtn: $('#logoutBtn'),
    plannerLink: $('#plannerLink'), syncText: $('#syncText'), noticeList: $('#noticeList'),
    emptyState: $('#emptyState'), reviewCount: $('#reviewCount'), publishedCount: $('#publishedCount'),
    holdCount: $('#holdCount'), endedCount: $('#endedCount'), newNoticeBtn: $('#newNoticeBtn'),
    dialog: $('#noticeDialog'), form: $('#noticeForm'), dialogTitle: $('#dialogTitle'),
    noticeId: $('#noticeId'), scope: $('#scopeInput'), type: $('#typeInput'),
    studentField: $('#studentField'), studentChoices: $('#studentChoices'), title: $('#titleInput'),
    content: $('#contentInput'), noticeDate: $('#noticeDateInput'), dueDate: $('#dueDateInput'),
    urgent: $('#urgentInput'), formError: $('#formError'), closeDialog: $('#closeDialogBtn'),
    cancelDialog: $('#cancelDialogBtn'), saveNotice: $('#saveNoticeBtn'), toast: $('#toast'),
    studentSetupBanner: $('#studentSetupBanner'), studentSetupText: $('#studentSetupText'), studentSheetLink: $('#studentSheetLink'),
  };

  const esc = (value) => String(value ?? '').replace(/[&<>'"]/g, (char) => ({
    '&': '&amp;', '<': '&lt;', '>': '&gt;', "'": '&#39;', '"': '&quot;',
  })[char]);
  const truthy = (value) => value === true || String(value).toUpperCase() === 'TRUE';
  const today = () => new Date(Date.now() - new Date().getTimezoneOffset() * 60000).toISOString().slice(0, 10);

  async function api(action, payload = {}) {
    const response = await fetch(API_URL, {
      method: 'POST',
      headers: { 'Content-Type': 'text/plain;charset=utf-8' },
      body: JSON.stringify({ action, token: state.token, ...payload }),
    });
    if (!response.ok) throw new Error(`서버 연결 실패 (${response.status})`);
    const result = await response.json();
    if (!result.ok) throw new Error(result.error || '요청을 처리하지 못했습니다.');
    return result;
  }

  function showToast(message, error = false) {
    ui.toast.textContent = message;
    ui.toast.className = `toast show${error ? ' error' : ''}`;
    clearTimeout(showToast.timer);
    showToast.timer = setTimeout(() => { ui.toast.className = 'toast'; }, 2600);
  }

  function setBusy(button, busy) {
    if (!button) return;
    button.disabled = busy;
    if (busy) button.dataset.label = button.textContent;
    button.textContent = busy ? '처리 중…' : (button.dataset.label || button.textContent);
  }

  async function login(token, silent = false) {
    state.token = token.trim();
    if (!state.token) return;
    try {
      const result = await api('adminLoad');
      state.notices = Array.isArray(result.notices) ? result.notices : [];
      state.students = Array.isArray(result.students) ? result.students.filter((student) => student.active !== false) : [];
      sessionStorage.setItem(AUTH_KEY, state.token);
      ui.loginError.textContent = '';
      ui.loginView.classList.add('hidden');
      ui.adminView.classList.remove('hidden');
      ui.syncText.textContent = `마지막 동기화 ${new Date().toLocaleTimeString('ko-KR', { hour: '2-digit', minute: '2-digit' })}`;
      renderStudents();
      renderStudentSetup();
      render();
    } catch (error) {
      state.token = '';
      sessionStorage.removeItem(AUTH_KEY);
      if (!silent) ui.loginError.textContent = error.message;
    }
  }

  async function reload() {
    const result = await api('adminLoad');
    state.notices = Array.isArray(result.notices) ? result.notices : [];
    state.students = Array.isArray(result.students) ? result.students.filter((student) => student.active !== false) : [];
    ui.syncText.textContent = `마지막 동기화 ${new Date().toLocaleTimeString('ko-KR', { hour: '2-digit', minute: '2-digit' })}`;
    renderStudents();
    renderStudentSetup();
    render();
  }

  function renderStudents(selected = []) {
    const selectedSet = new Set(selected.map(String));
    ui.studentChoices.innerHTML = state.students.length
      ? state.students.map((student) => {
        const id = String(student.student_id || '');
        const label = `${student.number || ''}번 ${student.name || ''}`.trim();
        return `<label class="student-choice"><input type="checkbox" value="${esc(id)}" ${selectedSet.has(id) ? 'checked' : ''}><span>${esc(label)}</span></label>`;
      }).join('')
      : '<p class="muted">앱_학생목록에 활성 학생을 입력해주세요.</p>';
  }

  function renderStudentSetup() {
    const coded = state.students.filter((student) => student.has_code).length;
    const ready = state.students.length > 0 && coded === state.students.length;
    ui.studentSetupBanner.classList.toggle('hidden', ready);
    ui.studentSetupText.textContent = state.students.length
      ? `활성 학생 ${state.students.length}명 중 개인 코드가 설정된 학생은 ${coded}명입니다.`
      : '현재 앱_학생목록에 활성 학생이 0명이라 개인 코드 로그인이 작동하지 않습니다.';
    ui.studentSheetLink.href = window.CLASS_NOTICE_CONFIG.sheetUrl || '#';
  }

  function statusCount(status) { return state.notices.filter((notice) => notice.status === status).length; }

  function render() {
    ui.reviewCount.textContent = statusCount('검토대기');
    ui.publishedCount.textContent = statusCount('게시됨');
    ui.holdCount.textContent = statusCount('보류');
    ui.endedCount.textContent = statusCount('종료됨');

    const notices = state.notices
      .filter((notice) => state.filter === 'all' || notice.status === state.filter)
      .sort((a, b) => String(b.created_at || '').localeCompare(String(a.created_at || '')));
    ui.emptyState.classList.toggle('hidden', notices.length > 0);
    ui.noticeList.innerHTML = notices.map(noticeCard).join('');
  }

  function noticeCard(notice) {
    const individual = notice.scope === '학생개별';
    const targets = individual ? targetLabels(notice.target_student_ids) : '학급 전체';
    const urgent = truthy(notice.urgent);
    return `<article class="notice-card" data-id="${esc(notice.notice_id)}" data-status="${esc(notice.status)}">
      <div>
        <div class="notice-meta">
          <span class="badge status">${esc(notice.status || '검토대기')}</span>
          <span class="badge">${esc(notice.notice_type || '공지')}</span>
          <span class="badge">${esc(targets)}</span>
          ${urgent ? '<span class="badge urgent">긴급</span>' : ''}
        </div>
        <h3>${esc(notice.title || '(제목 없음)')}</h3>
        <p class="content">${esc(notice.content || '')}</p>
        <p class="date-line">안내일 ${esc(notice.notice_date || '-')} ${notice.due_date ? ` · 마감 ${esc(notice.due_date)}` : ''}</p>
      </div>
      <div class="card-actions">
        <button class="edit" data-action="edit" type="button">수정</button>
        ${notice.status !== '게시됨' ? '<button class="publish" data-action="게시됨" type="button">게시하기</button>' : ''}
        ${notice.status !== '검토대기' ? '<button class="ghost" data-action="검토대기" type="button">검토로</button>' : ''}
        ${notice.status !== '보류' ? '<button class="hold" data-action="보류" type="button">보류</button>' : ''}
        ${notice.status !== '종료됨' ? '<button class="end" data-action="종료됨" type="button">종료</button>' : ''}
      </div>
    </article>`;
  }

  function targetLabels(ids) {
    const wanted = new Set(String(ids || '').split(',').map((id) => id.trim()).filter(Boolean));
    const labels = state.students.filter((student) => wanted.has(String(student.student_id)))
      .map((student) => `${student.number || ''}번 ${student.name || ''}`.trim());
    return labels.length ? labels.join(', ') : '대상 미지정';
  }

  function openDialog(notice = null) {
    ui.form.reset();
    ui.formError.textContent = '';
    ui.noticeId.value = notice?.notice_id || '';
    ui.dialogTitle.textContent = notice ? '공지 수정' : '공지 직접 추가';
    ui.scope.value = notice?.scope === '학생개별' ? '학생개별' : '학급전체';
    ui.type.value = notice?.notice_type === '할일' ? '할일' : '공지';
    ui.title.value = notice?.title || '';
    ui.content.value = notice?.content || '';
    ui.noticeDate.value = notice?.notice_date || today();
    ui.dueDate.value = notice?.due_date || '';
    ui.urgent.checked = truthy(notice?.urgent);
    renderStudents(String(notice?.target_student_ids || '').split(',').filter(Boolean));
    toggleStudentField();
    ui.dialog.showModal();
  }

  function toggleStudentField() {
    ui.studentField.classList.toggle('hidden', ui.scope.value !== '학생개별');
  }

  function formNotice() {
    return {
      notice_id: ui.noticeId.value,
      scope: ui.scope.value,
      target_student_ids: ui.scope.value === '학생개별'
        ? $$('#studentChoices input:checked').map((input) => input.value).join(',') : '',
      notice_type: ui.type.value,
      title: ui.title.value.trim(),
      content: ui.content.value.trim(),
      notice_date: ui.noticeDate.value,
      due_date: ui.dueDate.value,
      urgent: ui.urgent.checked,
    };
  }

  async function saveNotice(event) {
    event.preventDefault();
    const notice = formNotice();
    if (!notice.title) return;
    setBusy(ui.saveNotice, true);
    ui.formError.textContent = '';
    try {
      await api(notice.notice_id ? 'updateNotice' : 'createNotice', { notice });
      ui.dialog.close();
      await reload();
      showToast(notice.notice_id ? '공지 내용을 수정했습니다.' : '검토 대기 공지를 추가했습니다.');
    } catch (error) {
      ui.formError.textContent = error.message;
    } finally {
      setBusy(ui.saveNotice, false);
    }
  }

  async function changeStatus(noticeId, status, button) {
    const messages = { '게시됨': '학생 화면에 이 공지를 게시할까요?', '종료됨': '이 공지를 종료할까요?' };
    if (messages[status] && !window.confirm(messages[status])) return;
    setBusy(button, true);
    try {
      await api('setNoticeStatus', { noticeId, status });
      await reload();
      showToast(status === '게시됨' ? '학생 화면에 게시했습니다.' : `상태를 ${status}(으)로 변경했습니다.`);
    } catch (error) {
      showToast(error.message, true);
    } finally {
      setBusy(button, false);
    }
  }

  ui.loginForm.addEventListener('submit', async (event) => {
    event.preventDefault();
    const button = ui.loginForm.querySelector('button');
    setBusy(button, true);
    await login(ui.passwordInput.value);
    setBusy(button, false);
  });
  ui.logoutBtn.addEventListener('click', () => {
    sessionStorage.removeItem(AUTH_KEY);
    state.token = '';
    ui.adminView.classList.add('hidden');
    ui.loginView.classList.remove('hidden');
    ui.passwordInput.value = '';
    ui.passwordInput.focus();
  });
  ui.newNoticeBtn.addEventListener('click', () => openDialog());
  ui.scope.addEventListener('change', toggleStudentField);
  ui.form.addEventListener('submit', saveNotice);
  ui.closeDialog.addEventListener('click', () => ui.dialog.close());
  ui.cancelDialog.addEventListener('click', () => ui.dialog.close());
  ui.noticeList.addEventListener('click', (event) => {
    const button = event.target.closest('button[data-action]');
    if (!button) return;
    const card = button.closest('.notice-card');
    const notice = state.notices.find((item) => String(item.notice_id) === card.dataset.id);
    if (!notice) return;
    if (button.dataset.action === 'edit') openDialog(notice);
    else changeStatus(notice.notice_id, button.dataset.action, button);
  });
  $$('.filter').forEach((button) => button.addEventListener('click', () => {
    state.filter = button.dataset.status;
    $$('.filter').forEach((item) => item.classList.toggle('active', item === button));
    render();
  }));

  ui.plannerLink.href = window.CLASS_NOTICE_CONFIG.plannerUrl;
  const existing = sessionStorage.getItem(AUTH_KEY);
  if (existing) login(existing, true);
})();
