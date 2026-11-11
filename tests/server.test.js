const test = require('node:test');
const assert = require('node:assert/strict');
const http = require('node:http');
const app = require('../server');

let server;
let baseUrl;

test.before(async () => {
  await new Promise((resolve) => {
    server = http.createServer(app);
    server.listen(0, () => {
      const port = server.address().port;
      baseUrl = `http://127.0.0.1:${port}`;
      resolve();
    });
  });
});

test.after(async () => {
  await new Promise((resolve) => server.close(resolve));
});

test('T-01: GET /api/health 정상 응답 확인', async () => {
  const res = await fetch(`${baseUrl}/api/health`);
  assert.equal(res.status, 200);
  const data = await res.json();
  assert.equal(data.status, 'ok');
  assert.equal(data.service, 'jayeong-fortune');
});

test('T-02: POST /api/fortune - 이름 누락 시 400 에러 반환', async () => {
  const res = await fetch(`${baseUrl}/api/fortune`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      gender: '남성',
      birthdate: '1995-05-15',
      calendarType: '양력'
    })
  });
  assert.equal(res.status, 400);
  const data = await res.json();
  assert.equal(data.success, false);
  assert.match(data.error, /이름/);
});

test('T-03: POST /api/fortune - 생년월일 누락 시 400 에러 반환', async () => {
  const res = await fetch(`${baseUrl}/api/fortune`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      name: '홍길동',
      gender: '남성',
      calendarType: '양력'
    })
  });
  assert.equal(res.status, 400);
  const data = await res.json();
  assert.equal(data.success, false);
  assert.match(data.error, /생년월일/);
});

test('T-04: POST /api/fortune - 성별 누락 시 400 에러 반환', async () => {
  const res = await fetch(`${baseUrl}/api/fortune`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      name: '홍길동',
      birthdate: '1995-05-15',
      calendarType: '양력'
    })
  });
  assert.equal(res.status, 400);
  const data = await res.json();
  assert.equal(data.success, false);
  assert.match(data.error, /성별/);
});

test('T-05: POST /api/fortune - 양력/음력 누락 시 400 에러 반환', async () => {
  const res = await fetch(`${baseUrl}/api/fortune`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      name: '홍길동',
      gender: '남성',
      birthdate: '1995-05-15'
    })
  });
  assert.equal(res.status, 400);
  const data = await res.json();
  assert.equal(data.success, false);
  assert.match(data.error, /양력\/음력/);
});

test('T-06: POST /api/feedback - 빈 피드백 등록 시 400 에러 반환', async () => {
  const res = await fetch(`${baseUrl}/api/feedback`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ content: '   ' })
  });
  assert.equal(res.status, 400);
  const data = await res.json();
  assert.equal(data.success, false);
  assert.match(data.error, /피드백 내용/);
});

test('T-07: POST /api/feedback - 500자 초과 시 400 에러 반환', async () => {
  const longContent = 'A'.repeat(501);
  const res = await fetch(`${baseUrl}/api/feedback`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ content: longContent })
  });
  assert.equal(res.status, 400);
  const data = await res.json();
  assert.equal(data.success, false);
  assert.match(data.error, /500자/);
});

test('T-08: GET /api/feedback - 피드백 목록 엔드포인트 응답 형식 확인', async () => {
  const res = await fetch(`${baseUrl}/api/feedback`);
  assert.ok(res.status === 200 || res.status === 500);
  const data = await res.json();
  assert.ok('data' in data);
});

test('T-09: POST /api/fortune - 정상 요청 시 200 및 자영샘 운세 텍스트 반환', async () => {
  const res = await fetch(`${baseUrl}/api/fortune`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      name: '김테스트',
      gender: '여성',
      birthdate: '1998-03-24',
      calendarType: '양력',
      birthHour: '사시 (09:30 ~ 11:29)'
    })
  });
  assert.equal(res.status, 200);
  const data = await res.json();
  assert.equal(data.success, true);
  assert.equal(data.name, '김테스트');
  assert.ok(typeof data.fortune === 'string' && data.fortune.length > 20);
});

test('T-10: POST /api/fortune - 미래 생년월일 입력 시 400 에러 반환', async () => {
  const futureYear = new Date().getFullYear() + 2;
  const res = await fetch(`${baseUrl}/api/fortune`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      name: '미래인',
      gender: '남성',
      birthdate: `${futureYear}-01-01`,
      calendarType: '양력'
    })
  });
  assert.equal(res.status, 400);
  const data = await res.json();
  assert.equal(data.success, false);
  assert.match(data.error, /미래/);
});

test('T-11: POST /api/feedback/:id/react - 잘못된 reactionId 요청 시 400 에러 반환', async () => {
  const res = await fetch(`${baseUrl}/api/feedback/dummy-id/react`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      reactionId: 'invalid_reaction',
      userToken: 'test_token_123'
    })
  });
  assert.equal(res.status, 400);
  const data = await res.json();
  assert.equal(data.success, false);
  assert.match(data.error, /반응 종류/);
});

test('T-12: POST /api/feedback/:id/react - userToken 누락 시 400 에러 반환', async () => {
  const res = await fetch(`${baseUrl}/api/feedback/dummy-id/react`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      reactionId: 'clap'
    })
  });
  assert.equal(res.status, 400);
  const data = await res.json();
  assert.equal(data.success, false);
  assert.match(data.error, /사용자/);
});

test('T-13: 피드백 리액션 멀티 유저 공유 및 개별 취소 검증', async () => {
  // 1. 임시 피드백 생성
  const postRes = await fetch(`${baseUrl}/api/feedback`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ content: '리액션 멀티유저 테스트 피드백' })
  });
  assert.equal(postRes.status, 201);
  const postData = await postRes.json();
  const feedbackId = postData.data.id;
  assert.ok(feedbackId);

  // 2. 유저 A가 'clap'(짝짝짝) 반응 등록
  const userA = 'test_device_user_A';
  const reactResA = await fetch(`${baseUrl}/api/feedback/${feedbackId}/react`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ reactionId: 'clap', userToken: userA })
  });
  assert.equal(reactResA.status, 200);
  const dataA = await reactResA.json();
  assert.equal(dataA.reactions.clap, 1);
  assert.ok(dataA.userReactions.includes('clap'));

  // 3. 유저 B(다른 기기/브라우저)가 피드백 목록 조회 시 유저 A가 누른 'clap' 카운트 1 확인
  const userB = 'test_device_user_B';
  const getResB = await fetch(`${baseUrl}/api/feedback?userToken=${userB}`);
  assert.equal(getResB.status, 200);
  const listB = await getResB.json();
  const targetItemB = listB.data.find(item => item.id === feedbackId);
  assert.ok(targetItemB);
  assert.equal(targetItemB.reactions.clap, 1); // 유저 A가 누른 카운트가 유저 B에게도 보임!
  assert.equal(targetItemB.userReactions.includes('clap'), false); // 유저 B 본인은 아직 누르지 않음

  // 4. 유저 B도 'clap' 반응 등록 -> 카운트가 2로 증가
  const reactResB = await fetch(`${baseUrl}/api/feedback/${feedbackId}/react`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ reactionId: 'clap', userToken: userB })
  });
  assert.equal(reactResB.status, 200);
  const dataB = await reactResB.json();
  assert.equal(dataB.reactions.clap, 2);
  assert.ok(dataB.userReactions.includes('clap'));

  // 5. 유저 A가 'clap' 취소 -> 카운트가 1로 감소하고 유저 B의 반응은 여전히 보존
  const unreactResA = await fetch(`${baseUrl}/api/feedback/${feedbackId}/react`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ reactionId: 'clap', userToken: userA })
  });
  assert.equal(unreactResA.status, 200);
  const dataAfterA = await unreactResA.json();
  assert.equal(dataAfterA.reactions.clap, 1);
  assert.equal(dataAfterA.userReactions.includes('clap'), false);
});
