require('dotenv').config();
const express = require('express');
const cors = require('cors');
const path = require('path');
const OpenAI = require('openai');
const supabase = require('./lib/supabaseClient');

const app = express();
const PORT = process.env.PORT || 3000;

// 미들웨어 설정
app.use(cors());
app.use(express.json({ limit: '1mb' }));
app.use(express.static(path.join(__dirname, 'public')));

// OpenAI 클라이언트 초기화
const openai = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY || ''
});

// 동일 날짜+사주 입력에 대한 일관된 결과를 위한 해시 및 일일 캐시
function hashStringToSeed(str) {
  let hash = 0;
  for (let i = 0; i < str.length; i++) {
    hash = ((hash << 5) - hash) + str.charCodeAt(i);
    hash |= 0;
  }
  return Math.abs(hash);
}

// 당일 운세 인메모리 캐시 (Map)
const fortuneDailyCache = new Map();

// 1. 헬스 체크 엔드포인트
app.get('/api/health', (req, res) => {
  res.json({ status: 'ok', service: 'jayeong-fortune', timestamp: new Date().toISOString() });
});

// 2. 오늘의 운세 분석 API (POST /api/fortune)
app.post('/api/fortune', async (req, res) => {
  try {
    const { name, gender, birthdate, calendarType, birthHour } = req.body || {};

    // 입력값 유효성 검사
    if (!name || typeof name !== 'string' || !name.trim()) {
      return res.status(400).json({ success: false, error: '이름을 입력해주세요.' });
    }
    if (!gender || typeof gender !== 'string' || !gender.trim()) {
      return res.status(400).json({ success: false, error: '성별을 선택해주세요.' });
    }
    if (!birthdate || typeof birthdate !== 'string' || !birthdate.trim()) {
      return res.status(400).json({ success: false, error: '생년월일을 입력해주세요.' });
    }
    if (!calendarType || typeof calendarType !== 'string' || !calendarType.trim()) {
      return res.status(400).json({ success: false, error: '양력/음력을 선택해주세요.' });
    }

    // 생년월일 미래 날짜 제한 검증 (한국 시간 KST 기준 당일 이후 날짜 차단)
    const now = new Date();
    const kstDate = new Date(now.getTime() + (9 * 60 + now.getTimezoneOffset()) * 60000);
    const todayStr = kstDate.toISOString().slice(0, 10);

    if (birthdate > todayStr) {
      return res.status(400).json({
        success: false,
        error: '생년월일은 미래 날짜를 입력할 수 없습니다. 오늘 또는 과거 날짜를 선택해주세요.'
      });
    }

    if (!process.env.OPENAI_API_KEY) {
      return res.status(503).json({
        success: false,
        error: 'OpenAI API 키가 설정되지 않았습니다. 관리자에게 문의해주세요.'
      });
    }

    const trimmedName = name.trim().slice(0, 50);
    const birthTimeDesc = birthHour && birthHour.trim() ? birthHour.trim() : '시간 미상';

    // 당일 동일 사주 캐시 확인 (같은 날 같은 정보로 재요청 시 100% 동일한 결과 반환)
    const cacheKey = `${todayStr}__${trimmedName}__${gender}__${birthdate}__${calendarType}__${birthTimeDesc}`;
    if (fortuneDailyCache.has(cacheKey)) {
      return res.json({
        success: true,
        name: trimmedName,
        fortune: fortuneDailyCache.get(cacheKey),
        cached: true
      });
    }

    // OpenAI Prompt 구성
    const systemPrompt = `너는 사주명식을 분석하여 친절하게 오늘의 운세를 알려주는 운세 전문가 '자영샘'이다.
말투는 다정하면서도 신뢰감 있고 통찰력 있는 어조로 이야기한다.
사주명식의 음양오행과 십신, 일간의 상생상극 원리를 바탕으로 일관되고 안정적인 해석을 제공한다.
사용자의 사주 정보(년월일시 간지 기운)를 살피고, 오늘 하루의 흐름과 기운을 총 3문단으로 알기 쉽게 풀어서 설명해줘.
1문단: 사주 명식 기운 요약 및 오늘 총운
2문단: 재물운, 직장/학업운, 대인관계운 핵심 조언
3문단: 오늘을 잘 보내기 위한 자영샘의 따뜻한 행운 팁(행운의 색, 숫자, 추천 행동 등)`;

    const userPrompt = `오늘 날짜: ${todayStr} (한국 표준시)
사용자 사주 정보:
- 이름: ${trimmedName}
- 성별: ${gender}
- 생년월일: ${birthdate} (${calendarType})
- 태어난 시: ${birthTimeDesc}

위 사주와 오늘(${todayStr})의 일진/간지 기운을 바탕으로 자영샘의 친절하고 통찰력 있는 '오늘의 운세'를 3문단으로 작성해 주세요.`;

    const modelName = process.env.OPENAI_MODEL || 'gpt-4o-mini';
    const seed = hashStringToSeed(cacheKey);

    const completionPayload = {
      model: modelName,
      messages: [
        { role: 'system', content: systemPrompt },
        { role: 'user', content: userPrompt }
      ],
      seed: seed, // 동일 입력값에 대해 일관된 토큰 확률 부여
      max_completion_tokens: 1000
    };

    const completion = await openai.chat.completions.create(completionPayload);

    const fortuneResult = completion.choices[0]?.message?.content || '오늘의 운세를 불러오지 못했습니다. 다시 시도해주세요.';

    // 당일 캐시에 저장
    fortuneDailyCache.set(cacheKey, fortuneResult);

    return res.json({
      success: true,
      name: trimmedName,
      fortune: fortuneResult
    });
  } catch (error) {
    console.error('운세 생성 오류:', error.message);

    // 친절한 에러 메시지 분기
    if (error.status === 429) {
      return res.status(429).json({
        success: false,
        error: '일시적으로 요청이 많아 우주의 기운을 모으는 중입니다. 잠시 후 다시 시도해주세요.'
      });
    }

    return res.status(500).json({
      success: false,
      error: '우주의 기운을 불러오는 데 실패했습니다. 잠시 후 다시 시도해주세요.'
    });
  }
});

// 3. 피드백 조회 API (GET /api/feedback)
app.get('/api/feedback', async (req, res) => {
  try {
    const userToken = (req.query.userToken || '').toString().slice(0, 100);

    const { data, error } = await supabase
      .from('feedbacks')
      .select('id, content, created_at')
      .order('created_at', { ascending: false });

    if (error) {
      console.error('피드백 조회 오류:', error.message);
      return res.status(500).json({
        success: false,
        error: '피드백 목록을 불러오는 중 문제가 발생했습니다.',
        data: []
      });
    }

    const items = (data || []).map(item => {
      const contentRaw = item.content || '';
      const match = contentRaw.match(/^([\s\S]*?)(?:\n<!--REACTIONS:([\s\S]*?)-->)?$/);
      const cleanContent = match ? match[1].trim() : contentRaw;
      
      let reactionsData = {};
      try {
        if (match && match[2]) {
          reactionsData = JSON.parse(match[2]);
        }
      } catch (e) {
        reactionsData = {};
      }

      const reactionCounts = {};
      const userReactions = [];

      for (const [rId, users] of Object.entries(reactionsData)) {
        if (Array.isArray(users)) {
          if (users.length > 0) {
            reactionCounts[rId] = users.length;
          }
          if (userToken && users.includes(userToken)) {
            userReactions.push(rId);
          }
        }
      }

      return {
        id: item.id,
        content: cleanContent,
        created_at: item.created_at,
        reactions: reactionCounts,
        userReactions: userReactions
      };
    });

    return res.json({
      success: true,
      data: items
    });
  } catch (error) {
    console.error('피드백 조회 예외:', error.message);
    return res.status(500).json({
      success: false,
      error: '피드백 목록을 불러오지 못했습니다.',
      data: []
    });
  }
});

// 4. 피드백 등록 API (POST /api/feedback)
app.post('/api/feedback', async (req, res) => {
  try {
    const { content } = req.body || {};

    if (!content || typeof content !== 'string' || !content.trim()) {
      return res.status(400).json({
        success: false,
        error: '피드백 내용을 입력해주세요.'
      });
    }

    // 악의적인 메타데이터 주입 방지 및 500자 제한
    const cleanInput = content.trim().replace(/\n?<!--REACTIONS:[\s\S]*?-->/g, '');
    if (!cleanInput) {
      return res.status(400).json({
        success: false,
        error: '피드백 내용을 입력해주세요.'
      });
    }

    if (cleanInput.length > 500) {
      return res.status(400).json({
        success: false,
        error: '피드백은 최대 500자까지 작성하실 수 있습니다.'
      });
    }

    const { data, error } = await supabase
      .from('feedbacks')
      .insert([{ content: cleanInput }])
      .select();

    if (error) {
      console.error('피드백 등록 오류:', error.message);
      return res.status(500).json({
        success: false,
        error: '피드백 등록에 실패했습니다. Supabase 테이블 설정을 확인해주세요.'
      });
    }

    const newItem = data && data[0] ? {
      id: data[0].id,
      content: data[0].content,
      created_at: data[0].created_at,
      reactions: {},
      userReactions: []
    } : null;

    return res.status(201).json({
      success: true,
      message: '소중한 피드백이 등록되었습니다. 감사합니다!',
      data: newItem
    });
  } catch (error) {
    console.error('피드백 등록 예외:', error.message);
    return res.status(500).json({
      success: false,
      error: '서버 내부 오류로 피드백을 등록하지 못했습니다.'
    });
  }
});

// 5. 피드백 리액션 토글 API (POST /api/feedback/:id/react)
app.post('/api/feedback/:id/react', async (req, res) => {
  try {
    const { id } = req.params;
    const { reactionId, userToken } = req.body || {};

    const VALID_REACTIONS = ['check', 'fix', 'thanks', 'clap'];
    if (!reactionId || !VALID_REACTIONS.includes(reactionId)) {
      return res.status(400).json({ success: false, error: '올바른 반응 종류를 선택해주세요.' });
    }
    if (!userToken || typeof userToken !== 'string' || userToken.length > 100) {
      return res.status(400).json({ success: false, error: '유효한 사용자 정보가 필요합니다.' });
    }

    // 1) 대상 피드백 조회
    const { data, error } = await supabase
      .from('feedbacks')
      .select('id, content')
      .eq('id', id)
      .single();

    if (error || !data) {
      return res.status(404).json({ success: false, error: '해당 피드백을 찾을 수 없습니다.' });
    }

    const contentRaw = data.content || '';
    const match = contentRaw.match(/^([\s\S]*?)(?:\n<!--REACTIONS:([\s\S]*?)-->)?$/);
    const cleanContent = match ? match[1].trim() : contentRaw;

    let reactionsData = {};
    try {
      if (match && match[2]) {
        reactionsData = JSON.parse(match[2]);
      }
    } catch (e) {
      reactionsData = {};
    }

    if (!Array.isArray(reactionsData[reactionId])) {
      reactionsData[reactionId] = [];
    }

    // 2) 내가 누른 반응이면 취소(토글 OFF), 아니면 추가(토글 ON)
    const userIdx = reactionsData[reactionId].indexOf(userToken);
    if (userIdx > -1) {
      reactionsData[reactionId].splice(userIdx, 1);
      if (reactionsData[reactionId].length === 0) {
        delete reactionsData[reactionId];
      }
    } else {
      reactionsData[reactionId].push(userToken);
    }

    // 3) Supabase DB에 업데이트 반영
    const reactionsJson = Object.keys(reactionsData).length > 0 ? JSON.stringify(reactionsData) : '';
    const updatedContent = reactionsJson ? `${cleanContent}\n<!--REACTIONS:${reactionsJson}-->` : cleanContent;

    const { error: updateError } = await supabase
      .from('feedbacks')
      .update({ content: updatedContent })
      .eq('id', id);

    if (updateError) {
      console.error('리액션 저장 DB 오류:', updateError.message);
      return res.status(500).json({ success: false, error: '리액션을 저장하지 못했습니다.' });
    }

    // 4) 모든 사용자에게 표시될 전체 카운트 및 요청자 본인 활성화 상태 집계
    const reactionCounts = {};
    const userReactions = [];

    for (const [rId, users] of Object.entries(reactionsData)) {
      if (Array.isArray(users)) {
        if (users.length > 0) {
          reactionCounts[rId] = users.length;
        }
        if (users.includes(userToken)) {
          userReactions.push(rId);
        }
      }
    }

    return res.json({
      success: true,
      reactions: reactionCounts,
      userReactions: userReactions
    });
  } catch (err) {
    console.error('리액션 토글 예외:', err.message);
    return res.status(500).json({ success: false, error: '서버 내부 오류가 발생했습니다.' });
  }
});

// 정적 HTML 서빙 및 SPA 폴백 라우트
app.use((req, res) => {
  res.sendFile(path.join(__dirname, 'public', 'index.html'));
});

// 로컬 단독 실행 시에만 포트 리슨 (테스트 및 Vercel Serverless Function import 시 포트 충돌 방지)
if (require.main === module) {
  app.listen(PORT, () => {
    console.log(`🌌 '자영샘 돈으로 하는 오늘의 운세' 서버 실행 중: http://localhost:${PORT}`);
  });
}

module.exports = app;
