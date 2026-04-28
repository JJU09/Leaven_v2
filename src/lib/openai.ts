import OpenAI from 'openai';

const openai = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY || process.env.LITELLM_API_KEY || 'dummy-key',
  baseURL: process.env.LITELLM_BASE_URL,
});

// 시스템 프롬프트를 상수로 분리하여 관리
const SUMMARIZER_SYSTEM_PROMPT = `당신은 매장 관리 앱의 전문 인수인계 요약 비서입니다.
사용자가 입력한 내용을 바탕으로 대시보드에 표시할 '핵심 요약'을 작성하세요.

[규칙]
1. 행동 중심: 누가, 무엇을 해야 하는지 명확하게 작성 (예: "~ 확인 바랍니다", "~ 완료했습니다")
2. 길이 제안: 원문이 길면 중요도 높은 순으로 1-2문장 요약, 짧으면 자연스러운 문장으로 다듬기.
3. 형식 엄수: 마크다운(-, *, #)이나 줄바꿈 없이 오직 한 줄의 평문(Plain Text)으로만 응답할 것.
4. 예외 처리: 인수인계와 관련 없는 내용이면 "등록된 주요 인수인계 사항이 없습니다."라고 응답하세요.

[출력 예시]
- 입력: "오늘 포스기에 만원 부족해요. 그리고 시재 점검할 때 조심하세요. 쓰레기봉투 다 썼습니다."
- 출력: "포스기 시재 1만 원 부족하니 점검 시 주의가 필요하며, 쓰레기봉투 구매가 필요합니다."`;

export async function summarizeHandover(content: string) {
  // 1. 환경 변수 체크
  const hasConfig = process.env.OPENAI_API_KEY || (process.env.LITELLM_BASE_URL && process.env.LITELLM_API_KEY);
  if (!hasConfig) {
    console.warn('AI Configuration is missing. Skipping summary.');
    return null;
  }

  // 2. 입력값 유효성 검사 (너무 짧거나 빈 값인 경우 API 호출 방지)
  const trimmedContent = content.trim();
  if (!trimmedContent || trimmedContent.length < 5) {
    return { text: trimmedContent || "내용이 없습니다." };
  }

  try {
    const response = await openai.chat.completions.create({
      model: 'gemini/gemini-2.5-flash',
      messages: [
        { role: 'system', content: SUMMARIZER_SYSTEM_PROMPT },
        { role: 'user', content: trimmedContent },
      ],
      temperature: 0.2, // 더 일관된 결과를 위해 하향 조정
      max_tokens: 400,   // 대시보드용 요약이므로 제한
    });

    const summary = response.choices[0]?.message?.content?.replace(/\n/g, ' ').trim();
    
    return summary ? { text: summary } : { text: "요약을 생성할 수 없습니다." };
  } catch (error) {
    console.error('Error generating AI summary:', error);
    // 에러 발생 시 원본의 일부라도 보여주는 폴백 전략 고려 가능
    return { text: trimmedContent.slice(0, 50) + '...' }; 
  }
}