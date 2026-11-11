# 01. 프로젝트 생성과 개발환경 설정

## 1. 디렉토리 구조
```text
project-root/
│
├── public/          # 프론트엔드 정적 파일
│   ├── index.html
│   ├── style.css
│   └── script.js
│
├── server.js        # Node.js 백엔드 진입점
├── package.json     # 의존성 관리
├── .env             # 환경 변수 (Git 제외)
├── .env.example     # 환경 변수 템플릿
└── .gitignore       # Git 제외 목록
```

## 2. 초기화 및 패키지 설치
1. `npm init -y` 실행
2. 필요 패키지 설치: `npm install express cors dotenv openai @supabase/supabase-js`
3. 개발용 패키지(선택): `npm install --save-dev nodemon`

## 3. 환경변수 설정
- `.env` 파일을 생성하고 아래 항목 구성
```env
OPENAI_API_KEY=your_openai_api_key_here
SUPABASE_URL=your_supabase_project_url_here
SUPABASE_SECRET_KEY=your_supabase_anon_or_service_key_here
PORT=3000
```
- `.gitignore`에 반드시 `node_modules`와 `.env` 추가
