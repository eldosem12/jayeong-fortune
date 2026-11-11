-- feedbacks 테이블 생성
CREATE TABLE IF NOT EXISTS public.feedbacks (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    content TEXT NOT NULL,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- RLS (Row Level Security) 설정
ALTER TABLE public.feedbacks ENABLE ROW LEVEL SECURITY;

-- 누구나 피드백 목록을 조회(SELECT)할 수 있도록 허용
CREATE POLICY "Allow public read feedbacks" ON public.feedbacks
    FOR SELECT
    USING (true);

-- 누구나 피드백을 등록(INSERT)할 수 있도록 허용
CREATE POLICY "Allow public insert feedbacks" ON public.feedbacks
    FOR INSERT
    WITH CHECK (true);

