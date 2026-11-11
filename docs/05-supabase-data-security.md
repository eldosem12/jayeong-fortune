# 05. 데이터베이스 및 보안 (Supabase)

## 1. Supabase 테이블 설계
- 프로젝트 생성 후 `feedbacks` 테이블 생성
- **컬럼 구성**:
  - `id` (uuid, primary key)
  - `content` (text, 피드백 내용)
  - `created_at` (timestamp with time zone, default: now())

## 2. DB 연동 코드
- 백엔드에 `supabaseClient.js` 또는 `server.js` 내에 Supabase 클라이언트 초기화
- `@supabase/supabase-js` 패키지 활용
- **초기화 코드 예시**:
  ```javascript
  const { createClient } = require('@supabase/supabase-js');
  const supabase = createClient(process.env.SUPABASE_URL, process.env.SUPABASE_SECRET_KEY);
  ```

## 3. 데이터 입출력 (보안)
- 프론트엔드에서 직접 Supabase와 통신하지 않음. 반드시 Node.js 서버를 거쳐 통신.
- **GET 처리**: `supabase.from('feedbacks').select('*').order('created_at', { ascending: false })`
- **POST 처리**: `supabase.from('feedbacks').insert([{ content: req.body.content }])`
- 환경 변수 `.env` 관리를 철저히 하고, GitHub 업로드 시 실수로 노출되지 않도록 주의
