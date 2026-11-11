# AGENTS.md: AI 코딩 에이전트 작업 규칙

## 1. 개요
본 문서는 '자영샘 돈으로 하는 오늘의 운세' 웹서비스 개발을 위한 Antigravity AI 코딩 에이전트의 행동 지침입니다. 에이전트는 이 문서와 PRD.md, docs/ 폴더 내의 지침을 엄격히 준수해야 합니다.

## 2. 개발 작업 순서
1. `docs/01-project-setup.md`에 따라 개발 환경 및 패키지, 환경 변수 세팅
2. `docs/04-backend-openai.md`와 `docs/05-supabase-data-security.md`에 따라 백엔드, AI 연동, DB 세팅
3. `docs/02-ui-design.md`와 `docs/03-frontend-interactions.md`에 따라 프론트엔드 UI 및 기능 구현
4. `docs/06-testing-deployment.md`에 따라 로컬 테스트 및 Vercel 배포 진행

## 3. 기술적 제약조건 및 규칙
- **Front-End**: HTML, CSS, Vanilla JavaScript 만을 사용 (React 등 프레임워크 금지)
- **Back-End**: Node.js 환경에서 구성
- **AI**: OpenAI API 활용
- **Database**: Supabase 사용 (피드백 데이터 저장 및 불러오기)
- **Deployment**: Vercel 사용
- **보안**: API 키와 DB 접속 정보는 반드시 `.env` (로컬) 및 환경변수(Vercel)로 관리하며 Git에 업로드하지 않음

## 4. 금지 사항 (Do Not)
- 사용자가 명시하지 않은 추가 기능(로그인, 회원가입, 결제 등) 임의 추가 금지
- 지시되지 않은 외부 라이브러리 남용 금지
- 환경변수에 하드코딩 절대 금지

## 5. 완료 보고 형식
각 구현 단계가 완료될 때마다 "어떤 파일이 생성/수정되었는지", "어떤 테스트를 진행해야 하는지" 명확히 안내할 것.
