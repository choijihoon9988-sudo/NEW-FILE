document.addEventListener('DOMContentLoaded', () => {
    // DOM 요소 선택
    const contextInput = document.getElementById('contextInput');
    const clearContextButton = document.getElementById('clearContextButton');
    const questionInput = document.getElementById('questionInput');
    const answerStyleSelect = document.getElementById('answerStyle');
    const toneSelect = document.getElementById('tone');
    const generateButton = document.getElementById('generateButton');
    const resultOutput = document.getElementById('resultOutput');
    const copyButton = document.getElementById('copyButton');

    // API 설정
    const API_KEY = "AIzaSyAATNgc6d-BY2avR5Q55i9HRVOYzLlg-Ls"; // ⚠️ 여기에 자신의 Gemini API 키를 입력하세요!
    const API_URL = `https://generativelanguage.googleapis.com/v1beta/models/gemini-1.5-flash-latest:generateContent?key=${API_KEY}`;

    // [핵심 기능] 팝업이 열릴 때, 저장된 맥락 조각들을 불러와서 형식화
    const loadContextSnippets = () => {
        chrome.storage.local.get({ contextSnippets: [] }, (result) => {
            const snippets = result.contextSnippets;
            if (snippets.length > 0) {
                // 글머리 기호와 함께 각 조각을 줄바꿈으로 연결하여 표시
                contextInput.value = snippets.map(snippet => `• ${snippet}`).join('\n\n');
            } else {
                contextInput.placeholder = "제미나이 대화 중 중요한 부분을 우클릭 ▶ '핵심 맥락으로 추가'를 선택하여 맥락을 수집하세요.";
            }
        });
    };
    
    // 초기 로드
    loadContextSnippets();

    // [새 기능] '맥락 비우기' 버튼 이벤트
    clearContextButton.addEventListener('click', () => {
        // 저장소에서 맥락 조각 데이터 삭제
        chrome.storage.local.remove('contextSnippets', () => {
            contextInput.value = ''; // 화면의 textarea도 비움
            console.log('모든 맥락 조각이 삭제되었습니다.');
        });
    });

    // '최적 프롬프트 생성' 버튼 이벤트 (프롬프트 템플릿은 이전과 동일)
    generateButton.addEventListener('click', () => {
        const context = contextInput.value;
        const question = questionInput.value;
        const answerStyle = answerStyleSelect.value;
        const tone = toneSelect.value;

        if (!question) {
            resultOutput.value = "⚠️ '나의 질문'을 입력해주세요.";
            return;
        }

        const fullPrompt = `
당신은 사용자의 질문을 더 강력한 프롬프트로 재구성하는 'AI 프롬프트 엔지니어'입니다.
당신의 유일한 임무는 주어진 [대화 맥락]과 [단순 질문]을 조합하여, 다른 AI에게 바로 질문할 수 있는 [최적 프롬프트]를 만드는 것입니다.
**절대로 [단순 질문]에 직접 답변해서는 안 됩니다.** 당신의 출력은 오직 재구성된 프롬프트여야 합니다.

---
[대화 맥락]:
${context || "제공된 맥락 없음"}
---
[단순 질문]:
${question}
---
[프롬프트 재구성 조건]:
- 최종적으로 생성될 답변이 '${answerStyle}' 형식을 갖추도록 질문을 구체화하세요.
- 질문의 어조는 '${tone}'의 관점을 반영해야 합니다.
- 맥락을 충분히 활용하여, 질문의 의도가 명확하게 드러나는 상세한 프롬프트로 만들어주세요.
---

이제 위의 조건에 따라 [단순 질문]을 [최적 프롬프트]로 재구성한 결과만 출력하세요.`;
        
        resultOutput.value = "최적의 질문을 생성 중입니다...";
        generateButton.disabled = true;

        fetch(API_URL, {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ contents: [{ parts: [{ text: fullPrompt }] }] })
        })
        .then(response => response.json())
        .then(data => {
            if (data.candidates && data.candidates.length > 0) {
                resultOutput.value = data.candidates[0].content.parts[0].text.trim();
            } else {
                resultOutput.value = "❌ 프롬프트 생성에 실패했습니다.";
                console.error("API 응답 데이터:", data);
            }
        })
        .catch(error => {
            resultOutput.value = `❌ API 호출 오류가 발생했습니다.`;
            console.error('API 호출 중 오류 발생:', error);
        })
        .finally(() => {
            generateButton.disabled = false;
        });
    });

    // 복사 버튼 이벤트
    copyButton.addEventListener('click', () => {
        if (resultOutput.value) {
            navigator.clipboard.writeText(resultOutput.value)
                .then(() => {
                    copyButton.textContent = '완료!';
                    setTimeout(() => { copyButton.textContent = '복사'; }, 1500);
                });
        }
    });
});