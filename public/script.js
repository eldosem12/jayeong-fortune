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

  // 한국 표준시(KST) 기준 오늘 날짜 계산 (YYYY-MM-DD)
  function getTodayKST() {
    const now = new Date();
    const kstOffset = 9 * 60; // UTC+9
    const utc = now.getTime() + (now.getTimezoneOffset() * 60000);
    const kstDate = new Date(utc + (kstOffset * 60000));
    const yyyy = kstDate.getFullYear();
    const mm = String(kstDate.getMonth() + 1).padStart(2, '0');
    const dd = String(kstDate.getDate()).padStart(2, '0');
    return `${yyyy}-${mm}-${dd}`;
  }

  // 오늘 날짜 이후(미래)는 생년월일 달력에서 아예 선택할 수 없도록 max 속성 부여
  const todayKST = getTodayKST();
  birthDateInput.max = todayKST;

  // 생년월일 입력값 변경 시 실시간 미래 날짜 검증
  birthDateInput.addEventListener('change', () => {
    if (birthDateInput.value && birthDateInput.value > todayKST) {
      birthDateError.textContent = '생년월일은 미래 날짜를 선택할 수 없습니다.';
    } else {
      birthDateError.textContent = '';
    }
  });

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
    } else if (birthdate > todayKST) {
      birthDateError.textContent = '생년월일은 미래 날짜를 입력할 수 없습니다. 오늘 또는 과거 날짜를 선택해주세요.';
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

        // 하단 메타 & 카톡 스타일 리액션 영역
        const footerEl = document.createElement('div');
        footerEl.className = 'feedback-item-footer';

        const reactionsWrapper = document.createElement('div');
        reactionsWrapper.className = 'feedback-reactions-wrapper';
        renderReactionsUI(reactionsWrapper, item.id);

        const timeEl = document.createElement('time');
        timeEl.className = 'feedback-item-time';
        timeEl.textContent = formatTimeAgo(item.created_at);

        footerEl.appendChild(reactionsWrapper);
        footerEl.appendChild(timeEl);

        itemEl.appendChild(contentEl);
        itemEl.appendChild(footerEl);
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

  // ==========================================
  // 3. 카카오톡 스타일 피드백 리액션 이모티콘 4종
  // ==========================================
  const AVAILABLE_REACTIONS = [
    { id: 'check', label: '확인완료', emoji: '✅' },
    { id: 'fix', label: '수정완료', emoji: '🛠️' },
    { id: 'thanks', label: '감사합니다', emoji: '🙏' },
    { id: 'clap', label: '짝짝짝', emoji: '👏' }
  ];

  function getStoredReactions(feedbackId) {
    try {
      const counts = JSON.parse(localStorage.getItem('fortune_reactions_counts') || '{}');
      const myReactions = JSON.parse(localStorage.getItem('fortune_my_reactions') || '{}');
      return {
        counts: counts[feedbackId] || {},
        mine: myReactions[feedbackId] || []
      };
    } catch {
      return { counts: {}, mine: [] };
    }
  }

  function toggleReaction(feedbackId, reactionId) {
    try {
      const allCounts = JSON.parse(localStorage.getItem('fortune_reactions_counts') || '{}');
      const allMine = JSON.parse(localStorage.getItem('fortune_my_reactions') || '{}');

      const counts = allCounts[feedbackId] || {};
      const mine = allMine[feedbackId] || [];

      const isAlreadySelected = mine.includes(reactionId);

      if (isAlreadySelected) {
        // 반응 취소
        allMine[feedbackId] = mine.filter(id => id !== reactionId);
        counts[reactionId] = Math.max(0, (counts[reactionId] || 1) - 1);
        if (counts[reactionId] === 0) delete counts[reactionId];
      } else {
        // 반응 추가
        mine.push(reactionId);
        allMine[feedbackId] = mine;
        counts[reactionId] = (counts[reactionId] || 0) + 1;
      }

      allCounts[feedbackId] = counts;
      localStorage.setItem('fortune_reactions_counts', JSON.stringify(allCounts));
      localStorage.setItem('fortune_my_reactions', JSON.stringify(allMine));
    } catch (err) {
      console.error('리액션 저장 오류:', err);
    }
  }

  function renderReactionsUI(container, feedbackId) {
    container.innerHTML = '';
    const { counts, mine } = getStoredReactions(feedbackId);

    // 활성화된 리액션 뱃지들 렌더링
    AVAILABLE_REACTIONS.forEach(r => {
      const count = counts[r.id] || 0;
      const isMine = mine.includes(r.id);

      if (count > 0 || isMine) {
        const badge = document.createElement('button');
        badge.type = 'button';
        badge.className = `reaction-badge ${isMine ? 'active' : ''}`;
        badge.title = isMine ? '클릭하여 반응 취소' : '클릭하여 공감하기';
        badge.innerHTML = `<span>${r.emoji}</span> <span>${r.label}</span> <span class="reaction-count">${count}</span>`;
        badge.addEventListener('click', (e) => {
          e.stopPropagation();
          toggleReaction(feedbackId, r.id);
          renderReactionsUI(container, feedbackId);
        });
        container.appendChild(badge);
      }
    });

    // + 반응 추가 버튼
    const addBtn = document.createElement('button');
    addBtn.type = 'button';
    addBtn.className = 'reaction-add-btn';
    addBtn.innerHTML = `<span>+</span> <span>반응</span>`;

    addBtn.addEventListener('click', (e) => {
      e.stopPropagation();

      // 기존 팝오버 제거
      document.querySelectorAll('.reaction-picker-popover').forEach(p => p.remove());

      const popover = document.createElement('div');
      popover.className = 'reaction-picker-popover';

      AVAILABLE_REACTIONS.forEach(r => {
        const optBtn = document.createElement('button');
        optBtn.type = 'button';
        optBtn.className = 'reaction-option-btn';
        optBtn.innerHTML = `<span>${r.emoji}</span> <span>${r.label}</span>`;
        optBtn.addEventListener('click', (ev) => {
          ev.stopPropagation();
          toggleReaction(feedbackId, r.id);
          popover.remove();
          renderReactionsUI(container, feedbackId);
        });
        popover.appendChild(optBtn);
      });

      container.appendChild(popover);

      // 외부 영역 클릭 시 팝오버 닫기
      const onDocClick = (clickEvent) => {
        if (!popover.contains(clickEvent.target) && clickEvent.target !== addBtn) {
          popover.remove();
          document.removeEventListener('click', onDocClick);
        }
      };
      setTimeout(() => {
        document.addEventListener('click', onDocClick);
      }, 0);
    });

    container.appendChild(addBtn);
  }

  // 초기 피드백 목록 로드
  fetchFeedbacks();
});

