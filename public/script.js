/**
 * 자영샘 돈으로 하는 오늘의 운세 - 프론트엔드 인터랙션 (script.js)
 */

document.addEventListener('DOMContentLoaded', () => {
  // DOM 요소 참조 - 운세 폼
  const fortuneForm = document.getElementById('fortuneForm');
  const submitBtn = document.getElementById('submitBtn');
  const btnText = submitBtn.querySelector('.btn-text');
  const spinner = submitBtn.querySelector('.spinner');
  const formAlert = document.getElementById('formAlert');

  // 필드 에러 메시지
  const nameInput = document.getElementById('userName');
  const birthDateInput = document.getElementById('birthDate');
  const nameError = document.getElementById('nameError');
  const birthDateError = document.getElementById('birthDateError');

  // 결과 영역
  const resultSection = document.getElementById('resultSection');
  const resultTitle = document.getElementById('resultTitle');
  const resultContent = document.getElementById('resultContent');
  const retryBtn = document.getElementById('retryBtn');

  // 피드백 관련 요소
  const feedbackForm = document.getElementById('feedbackForm');
  const feedbackContent = document.getElementById('feedbackContent');
  const feedbackCharCount = document.getElementById('feedbackCharCount');
  const feedbackSubmitBtn = document.getElementById('feedbackSubmitBtn');
  const feedbackAlert = document.getElementById('feedbackAlert');
  const feedbackList = document.getElementById('feedbackList');
  const feedbackTotalCount = document.getElementById('feedbackTotalCount');

  // ==========================================
  // 1. 운세 폼 유효성 검사 및 요청
  // ==========================================
  fortuneForm.addEventListener('submit', async (e) => {
    e.preventDefault();
    clearFormErrors();

    const name = nameInput.value.trim();
    const gender = fortuneForm.querySelector('input[name="gender"]:checked')?.value;
    const birthdate = birthDateInput.value;
    const calendarType = fortuneForm.querySelector('input[name="calendarType"]:checked')?.value;
    const birthHour = document.getElementById('birthHour').value;

    let isValid = true;

    if (!name) {
      nameError.textContent = '이름을 입력해주세요.';
      nameInput.focus();
      isValid = false;
    }

    if (!birthdate) {
      birthDateError.textContent = '생년월일을 선택해주세요.';
      if (isValid) birthDateInput.focus();
      isValid = false;
    }

    if (!isValid) return;

    // 로딩 상태 시작
    setFortuneLoading(true);

    try {
      const response = await fetch('/api/fortune', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ name, gender, birthdate, calendarType, birthHour })
      });

      const data = await response.json();

      if (!response.ok || !data.success) {
        throw new Error(data.error || '우주의 기운을 불러오는 데 실패했습니다.');
      }

      // 결과 렌더링
      renderFortuneResult(data.name, data.fortune);

    } catch (err) {
      showFormAlert(err.message || '네트워크 오류가 발생했습니다. 잠시 후 다시 시도해주세요.');
    } finally {
      setFortuneLoading(false);
    }
  });

  // 운세 결과 렌더링 함수
  function renderFortuneResult(name, fortuneText) {
    resultTitle.textContent = `${name}님을 위한 오늘의 운세`;
    
    // 문단 분리 후 <p> 태그 래핑
    const paragraphs = fortuneText
      .split(/\n\s*\n/)
      .map(p => p.trim())
      .filter(p => p.length > 0);

    resultContent.innerHTML = '';
    if (paragraphs.length > 0) {
      paragraphs.forEach(text => {
        const p = document.createElement('p');
        p.textContent = text;
        resultContent.appendChild(p);
      });
    } else {
      const p = document.createElement('p');
      p.textContent = fortuneText;
      resultContent.appendChild(p);
    }

    resultSection.classList.remove('hidden');
    resultSection.scrollIntoView({ behavior: 'smooth', block: 'start' });
  }

  // 다시 분석하기 버튼
  retryBtn.addEventListener('click', () => {
    resultSection.classList.add('hidden');
    fortuneForm.scrollIntoView({ behavior: 'smooth', block: 'start' });
    nameInput.focus();
  });

  // 로딩 상태 UI 제어
  function setFortuneLoading(isLoading) {
    submitBtn.disabled = isLoading;
    if (isLoading) {
      btnText.textContent = '우주의 기운을 읽는 중...';
      spinner.classList.remove('hidden');
      formAlert.classList.add('hidden');
    } else {
      btnText.textContent = '운세 보기';
      spinner.classList.add('hidden');
    }
  }

  function clearFormErrors() {
    nameError.textContent = '';
    birthDateError.textContent = '';
    formAlert.classList.add('hidden');
  }

  function showFormAlert(message) {
    formAlert.textContent = message;
    formAlert.classList.remove('hidden');
  }

  // ==========================================
  // 2. 피드백 전송 및 목록 불러오기
  // ==========================================

  // 글자 수 실시간 반영
  feedbackContent.addEventListener('input', () => {
    const len = feedbackContent.value.length;
    feedbackCharCount.textContent = `${len} / 500자`;
  });

  // 피드백 제출
  feedbackForm.addEventListener('submit', async (e) => {
    e.preventDefault();
    const content = feedbackContent.value.trim();

    if (!content) {
      showFeedbackAlert('피드백 내용을 입력해주세요.', false);
      feedbackContent.focus();
      return;
    }

    setFeedbackLoading(true);

    try {
      const res = await fetch('/api/feedback', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ content })
      });

      const data = await res.json();

      if (!res.ok || !data.success) {
        throw new Error(data.error || '피드백 등록에 실패했습니다.');
      }

      feedbackContent.value = '';
      feedbackCharCount.textContent = '0 / 500자';
      showFeedbackAlert('소중한 피드백이 등록되었습니다. 감사합니다!', true);

      // 목록 새로고침
      await fetchFeedbacks();

    } catch (err) {
      showFeedbackAlert(err.message || '피드백 전송 중 오류가 발생했습니다.', false);
    } finally {
      setFeedbackLoading(false);
    }
  });

  function setFeedbackLoading(isLoading) {
    feedbackSubmitBtn.disabled = isLoading;
    const txt = feedbackSubmitBtn.querySelector('.btn-text');
    const sp = feedbackSubmitBtn.querySelector('.spinner-small');
    if (isLoading) {
      txt.textContent = '등록 중...';
      sp.classList.remove('hidden');
    } else {
      txt.textContent = '남기기';
      sp.classList.add('hidden');
    }
  }

  function showFeedbackAlert(msg, isSuccess) {
    feedbackAlert.textContent = msg;
    feedbackAlert.classList.remove('hidden');
    if (isSuccess) {
      feedbackAlert.classList.add('success');
      setTimeout(() => {
        feedbackAlert.classList.add('hidden');
      }, 3500);
    } else {
      feedbackAlert.classList.remove('success');
    }
  }

  // 피드백 목록 가져오기
  async function fetchFeedbacks() {
    try {
      const res = await fetch('/api/feedback');
      const result = await res.json();

      if (!res.ok || !result.success) {
        renderFeedbackEmpty('피드백을 불러오지 못했습니다.');
        return;
      }

      const items = result.data || [];
      feedbackTotalCount.textContent = items.length;

      if (items.length === 0) {
        renderFeedbackEmpty('아직 등록된 피드백이 없습니다. 첫 번째 피드백을 남겨보세요!');
        return;
      }

      feedbackList.innerHTML = '';
      items.forEach(item => {
        const itemEl = document.createElement('div');
        itemEl.className = 'feedback-item';

        const contentEl = document.createElement('div');
        contentEl.className = 'feedback-item-content';
        contentEl.textContent = item.content;

        const timeEl = document.createElement('time');
        timeEl.className = 'feedback-item-time';
        timeEl.textContent = formatTimeAgo(item.created_at);

        itemEl.appendChild(contentEl);
        itemEl.appendChild(timeEl);
        feedbackList.appendChild(itemEl);
      });

    } catch (err) {
      console.error('피드백 로드 오류:', err);
      renderFeedbackEmpty('피드백 목록을 불러오는 중 통신 오류가 발생했습니다.');
    }
  }

  function renderFeedbackEmpty(text) {
    feedbackList.innerHTML = `<div class="empty-placeholder">${text}</div>`;
  }

  // 상대 시간 계산 (예: "방금 전", "5분 전", "2시간 전", "2026.11.11")
  function formatTimeAgo(dateString) {
    if (!dateString) return '';
    const date = new Date(dateString);
    const now = new Date();
    const diffSec = Math.floor((now - date) / 1000);

    if (diffSec < 60) return '방금 전';
    if (diffSec < 3600) return `${Math.floor(diffSec / 60)}분 전`;
    if (diffSec < 86400) return `${Math.floor(diffSec / 3600)}시간 전`;

    const year = date.getFullYear();
    const month = String(date.getMonth() + 1).padStart(2, '0');
    const day = String(date.getDate()).padStart(2, '0');
    return `${year}.${month}.${day}`;
  }

  // 초기 피드백 목록 로드
  fetchFeedbacks();
});
