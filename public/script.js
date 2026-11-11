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

    // 한국 표준시 기준 당일 운세 영구 캐시 키 (오늘 날짜 + 사주 정보)
    const currentToday = getTodayKST();
    const cacheKey = `jayeong_fortune_${currentToday}_${name}_${gender}_${birthdate}_${calendarType}_${birthHour || 'none'}`;

    // 1) 오늘 이미 분석했던 동일 사주 이력이 있으면 다른 사주를 거쳤더라도 무조건 동일한 결과를 즉시 표시
    try {
      const cached = localStorage.getItem(cacheKey);
      if (cached) {
        const parsed = JSON.parse(cached);
        renderFortuneResult(parsed.name, parsed.fortune);
        resultSection.scrollIntoView({ behavior: 'smooth', block: 'start' });
        return;
      }
    } catch (e) {
      console.warn('캐시 읽기 예외:', e);
    }

    // 2) 오늘 처음 분석하는 사주인 경우에만 서버에 요청
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

      // 오늘 하루 동안 다른 사주를 몇 번 조회하고 다시 돌아와도 100% 동일하게 나오도록 브라우저에 영구 저장
      try {
        localStorage.setItem(cacheKey, JSON.stringify({
          name: data.name,
          fortune: data.fortune,
          date: currentToday
        }));

        // 지난 날짜의 오래된 캐시는 자동 정리
        for (let i = localStorage.length - 1; i >= 0; i--) {
          const k = localStorage.key(i);
          if (k && k.startsWith('jayeong_fortune_') && !k.startsWith(`jayeong_fortune_${currentToday}`)) {
            localStorage.removeItem(k);
          }
        }
      } catch (e) {
        console.warn('캐시 저장 예외:', e);
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

  // 사용자 고유 식별 토큰 (브라우저별 1개 생성 및 유지)
  function getUserToken() {
    let token = localStorage.getItem('jayeong_fortune_user_token');
    if (!token) {
      token = 'usr_' + Math.random().toString(36).substring(2, 10) + Date.now().toString(36);
      localStorage.setItem('jayeong_fortune_user_token', token);
    }
    return token;
  }

  // 피드백 목록 가져오기
  async function fetchFeedbacks() {
    try {
      const userToken = getUserToken();
      const res = await fetch(`/api/feedback?userToken=${encodeURIComponent(userToken)}`);
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
        renderReactionsUI(reactionsWrapper, item.id, item.reactions || {}, item.userReactions || []);

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
  // 3. 카카오톡 스타일 피드백 리액션 이모티콘 4종 (서버 전역 동기화)
  // ==========================================
  const AVAILABLE_REACTIONS = [
    { id: 'check', label: '확인완료', emoji: '✅' },
    { id: 'fix', label: '수정완료', emoji: '🛠️' },
    { id: 'thanks', label: '감사합니다', emoji: '🙏' },
    { id: 'clap', label: '짝짝짝', emoji: '👏' }
  ];

  // 리액션 토글 함수 (낙관적 UI 업데이트 + 서버 Supabase 동기화)
  async function toggleReaction(feedbackId, reactionId, container, counts, userReactions) {
    const userToken = getUserToken();
    const isMine = userReactions.includes(reactionId);

    // 1) 즉각적인 UI 반영 (낙관적 업데이트)
    const nextCounts = { ...counts };
    const nextUserReactions = [...userReactions];

    if (isMine) {
      // 본인이 누른 것 취소
      const idx = nextUserReactions.indexOf(reactionId);
      if (idx > -1) nextUserReactions.splice(idx, 1);
      nextCounts[reactionId] = Math.max(0, (nextCounts[reactionId] || 1) - 1);
      if (nextCounts[reactionId] === 0) delete nextCounts[reactionId];
    } else {
      // 새로운 반응 추가
      nextUserReactions.push(reactionId);
      nextCounts[reactionId] = (nextCounts[reactionId] || 0) + 1;
    }

    renderReactionsUI(container, feedbackId, nextCounts, nextUserReactions);

    // 2) 서버 API 호출하여 DB에 영구 저장 (다른 접속자에게도 표시되도록)
    try {
      const res = await fetch(`/api/feedback/${feedbackId}/react`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ reactionId, userToken })
      });
      const data = await res.json();
      if (res.ok && data.success) {
        // 서버에서 최종 확정된 카운트와 사용자 반응으로 동기화
        renderReactionsUI(container, feedbackId, data.reactions || {}, data.userReactions || []);
      }
    } catch (err) {
      console.error('리액션 동기화 실패:', err);
    }
  }

  function renderReactionsUI(container, feedbackId, counts = {}, userReactions = []) {
    container.innerHTML = '';

    // 활성화된 리액션 뱃지들 렌더링 (다른 사람이 누른 카운트도 모두 표시)
    AVAILABLE_REACTIONS.forEach(r => {
      const count = counts[r.id] || 0;
      const isMine = userReactions.includes(r.id);

      if (count > 0 || isMine) {
        const badge = document.createElement('button');
        badge.type = 'button';
        badge.className = `reaction-badge ${isMine ? 'active' : ''}`;
        badge.title = isMine ? '클릭하여 내 반응 취소' : '클릭하여 나도 공감하기';
        badge.innerHTML = `<span>${r.emoji}</span> <span>${r.label}</span> <span class="reaction-count">${count}</span>`;
        badge.addEventListener('click', (e) => {
          e.stopPropagation();
          toggleReaction(feedbackId, r.id, container, counts, userReactions);
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
        const isMine = userReactions.includes(r.id);
        const optBtn = document.createElement('button');
        optBtn.type = 'button';
        optBtn.className = `reaction-option-btn ${isMine ? 'active' : ''}`;
        optBtn.innerHTML = `<span>${r.emoji}</span> <span>${r.label}</span> ${isMine ? '<span class="reaction-check">✓</span>' : ''}`;
        optBtn.addEventListener('click', (ev) => {
          ev.stopPropagation();
          popover.remove();
          toggleReaction(feedbackId, r.id, container, counts, userReactions);
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

  // ==========================================
  // 4. 흩날리는 매화 꽃잎 & 잎사귀 캔버스 효과
  // ==========================================
  function initFallingPetals() {
    const canvas = document.getElementById('petalCanvas');
    if (!canvas) return;

    const ctx = canvas.getContext('2d');
    let width = (canvas.width = window.innerWidth);
    let height = (canvas.height = window.innerHeight);

    window.addEventListener('resize', () => {
      width = canvas.width = window.innerWidth;
      height = canvas.height = window.innerHeight;
    });

    const PETAL_COUNT = 30;
    const PETAL_COLORS = [
      'rgba(255, 230, 238, 0.88)', // 은은한 연분홍 매화 꽃잎
      'rgba(246, 195, 210, 0.82)', // 화사한 핑크 매화 꽃잎
      'rgba(255, 252, 245, 0.88)', // 맑은 백매화 꽃잎
      'rgba(235, 145, 170, 0.75)', // 진분홍 꽃잎
      'rgba(205, 225, 190, 0.78)'  // 연두빛 여린 잎사귀
    ];

    class Petal {
      constructor() {
        this.reset(true);
      }

      reset(initial = false) {
        this.x = Math.random() * (width + 80) - 40;
        this.y = initial ? Math.random() * height : -30;
        this.size = Math.random() * 8 + 8; // 8px ~ 16px 크기
        this.speedY = Math.random() * 1.0 + 0.7; // 부드러운 하강 속도
        this.speedX = Math.random() * 0.7 + 0.3; // 우측으로 자연스럽게 부는 바람
        this.sway = Math.random() * Math.PI * 2;
        this.swaySpeed = Math.random() * 0.02 + 0.015;
        this.swayAmplitude = Math.random() * 22 + 10;
        this.angle = Math.random() * Math.PI * 2;
        this.angularSpeed = (Math.random() - 0.5) * 0.02;
        this.flip = Math.random() * Math.PI;
        this.flipSpeed = Math.random() * 0.03 + 0.01;
        this.color = PETAL_COLORS[Math.floor(Math.random() * PETAL_COLORS.length)];
      }

      update() {
        this.sway += this.swaySpeed;
        this.flip += this.flipSpeed;
        this.angle += this.angularSpeed;

        this.x += this.speedX + Math.sin(this.sway) * 0.5;
        this.y += this.speedY;

        // 화면 바닥이나 우측 경계를 넘어가면 다시 상단에서 리스폰
        if (this.y > height + 25 || this.x > width + 40) {
          this.reset(false);
        }
      }

      draw() {
        ctx.save();
        ctx.translate(this.x + Math.sin(this.sway) * this.swayAmplitude * 0.25, this.y);
        ctx.rotate(this.angle);
        ctx.scale(Math.cos(this.flip), 1);

        ctx.fillStyle = this.color;
        ctx.beginPath();

        // 자연스러운 꽃잎 베지어 곡선
        const r = this.size;
        ctx.moveTo(0, -r);
        ctx.bezierCurveTo(r * 0.8, -r * 0.6, r * 0.9, r * 0.5, 0, r);
        ctx.bezierCurveTo(-r * 0.9, r * 0.5, -r * 0.8, -r * 0.6, 0, -r);
        ctx.fill();

        ctx.restore();
      }
    }

    const petals = Array.from({ length: PETAL_COUNT }, () => new Petal());

    function animate() {
      ctx.clearRect(0, 0, width, height);
      petals.forEach(p => {
        p.update();
        p.draw();
      });
      requestAnimationFrame(animate);
    }

    animate();
  }

  initFallingPetals();
});

