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
