import OpenAI from 'openai';

const openai = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY || 'dummy-key',
  baseURL: process.env.LITELLM_BASE_URL,
});

export async function summarizeHandover(content: string) {
  if (!process.env.OPENAI_API_KEY && !process.env.LITELLM_BASE_URL) {
    console.warn('OPENAI_API_KEY or LITELLM_BASE_URL is not set. Skipping AI summary.');
    return null;
  }

  try {
    const response = await openai.chat.completions.create({
      model: 'gemini/gemini-3-flash',
      messages: [
        {
          role: 'system',
          content: `당신은 매장 관리 앱의 인수인계 요약 비서입니다. 
주어진 인수인계 내용을 바탕으로, 수신자가 한눈에 알아볼 수 있도록 핵심적인 내용만 1~2문장으로 요약해주세요. 
요약된 텍스트만 응답해주세요.`,
        },
        {
          role: 'user',
          content,
        },
      ],
      temperature: 0.5,
      max_tokens: 150,
    });

    const summary = response.choices[0]?.message?.content?.trim();
    return summary ? { text: summary } : null;
  } catch (error) {
    console.error('Error generating AI summary:', error);
    return null;
  }
}