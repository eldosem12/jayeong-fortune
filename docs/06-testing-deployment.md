# 06. 테스트, 검증, 배포

## 1. 로컬 구동 및 테스트
1. `node server.js` 실행 후 브라우저에서 `http://localhost:3000` 접속
2. **테스트 항목**:
   - 모든 운세 폼 입력 후 결과가 정상적으로 나오는지 확인
   - 필수 값 미입력 시 클라이언트 오류 메시지가 뜨는지 확인
   - 로그인 없이 피드백 등록이 성공하고, 즉시(또는 새로고침 후) 리스트에 노출되는지 확인
   - 피드백 리스트가 최신순(시간 역순)으로 정렬되었는지 확인

## 2. Git 리포지토리 업로드
1. `.gitignore`에 `.env`와 `node_modules/`가 등록되어 있는지 다시 확인
2. `git init` -> `git add .` -> `git commit -m "Initial commit"` -> 원격 저장소 푸시

## 3. Vercel 배포
1. Vercel 프로젝트 생성 및 GitHub 리포지토리 연동
2. **[매우 중요]** Vercel Dashboard의 'Environment Variables' 설정 메뉴에서 로컬 `.env`에 있던 키값 등록
   - `OPENAI_API_KEY`
   - `SUPABASE_URL`
   - `SUPABASE_SECRET_KEY`
3. 키 등록 후 'Redeploy' 수행하여 정상 적용 확인
4. 배포된 URL 접속 후 운세 및 피드백 기능 라이브 테스트 진행
