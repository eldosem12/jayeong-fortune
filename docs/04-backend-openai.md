# 04. 백엔드 및 AI API 구현

## 1. Node.js (Express) 서버 기본 설정
- `server.js`에 Express 초기화, CORS 허용, JSON 바디 파서 설정
- 정적 파일 제공 설정: `app.use(express.static('public'))`

## 2. 운세 API 엔드포인트 (`POST /api/fortune`)
- 프론트엔드로부터 받은 데이터 (이름, 성별, 생년월일, 양/음력, 태어난 시) 수신
- **OpenAI API 연동**:
  - `system` 프롬프트: "너는 사주명식을 분석하여 친절하게 오늘의 운세를 알려주는 운세 전문가 '자영샘'이다."
  - `user` 프롬프트: 사용자의 입력 정보를 바탕으로 사주명식을 분석하고, 오늘의 운세를 3문단 정도로 작성하라.
  - 모델: `gpt-3.5-turbo` 또는 `gpt-4o` 등 환경변수에 지정된 모델 사용
- AI 응답 결과를 프론트로 JSON 형태로 반환

## 3. 피드백 라우터 구성
- 데이터베이스 처리는 `05-supabase-data-security.md`의 모듈을 호출하여 연결
- `GET /api/feedback`: Supabase에서 피드백 목록 조회 후 반환
- `POST /api/feedback`: 전달받은 피드백 텍스트를 Supabase에 삽입
