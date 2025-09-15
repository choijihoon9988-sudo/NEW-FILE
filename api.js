/**
 * Gemini API와 통신하여 최적의 프롬프트를 생성합니다.
 * @param {string} apiKey - 사용자의 Gemini API 키
 * @param {string} prompt - API에 전송할 전체 프롬프트
 * @param {string} modelId - 사용할 AI 모델의 ID
 * @returns {Promise<object>} API 호출 결과를 담은 객체 { success: boolean, data?: string, error?: string }
 */
async function callGeminiAPI(apiKey, prompt, modelId) {
    const modelToUse = modelId || 'gemini-1.5-flash-latest';
    const API_URL = `https://generativelanguage.googleapis.com/v1beta/models/${modelToUse}:generateContent?key=${apiKey}`;

    try {
        const response = await fetch(API_URL, {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ contents: [{ parts: [{ text: prompt }] }] })
        });

        const data = await response.json();

        if (!response.ok) {
            console.error("API Error Response:", data);
            const errorMessage = data.error?.message || `HTTP 에러: ${response.status}`;
            if (response.status === 400) {
                 return { success: false, error: "❌ API 키가 유효하지 않습니다. 확인 후 다시 시도해주세요." };
            }
            return { success: false, error: `❌ API 오류: ${errorMessage}` };
        }

        if (!data.candidates || data.candidates.length === 0 || !data.candidates[0].content) {
            const blockReason = data.promptFeedback?.blockReason;
            if (blockReason) {
                return { success: false, error: `❌ 생성 실패: Gemini의 콘텐츠 정책(${blockReason})에 의해 차단되었습니다.` };
            }
            return { success: false, error: "❌ 프롬프트 생성에 실패했습니다. (내용을 찾을 수 없음)" };
        }
        
        const resultText = data.candidates[0].content.parts[0].text;
        return { success: true, data: resultText.trim() };

    } catch (error) {
        console.error('Fetch API 호출 중 오류 발생:', error);
        return { success: false, error: `❌ 네트워크 오류가 발생했습니다. 인터넷 연결을 확인해주세요.` };
    }
}