chrome.runtime.onInstalled.addListener(() => {
  chrome.contextMenus.create({
    id: "addContextSnippet",
    title: "💡 핵심 맥락으로 추가 (Ctrl+Shift+S)",
    contexts: ["selection"],
    documentUrlPatterns: ["*://gemini.google.com/*"]
  });
  chrome.contextMenus.create({
    id: "addAsQuestion",
    title: "💬 단순 질문으로 추가 (Ctrl+Shift+Q)",
    contexts: ["selection"],
    documentUrlPatterns: ["*://gemini.google.com/*"]
  });
});

chrome.contextMenus.onClicked.addListener(async (info) => {
  if (info.menuItemId === "addContextSnippet") {
    await addContextSnippet(info.selectionText);
  }
  if (info.menuItemId === "addAsQuestion") {
    await addAsQuestion(info.selectionText);
  }
});

chrome.commands.onCommand.addListener(async (command, tab) => {
  try {
    const injectionResults = await chrome.scripting.executeScript({
      target: { tabId: tab.id },
      function: () => window.getSelection().toString(),
    });

    if (injectionResults && injectionResults[0] && injectionResults[0].result) {
      const selectedText = injectionResults[0].result;
      if (command === 'add-context-snippet') {
        await addContextSnippet(selectedText);
      } else if (command === 'add-as-question') {
        await addAsQuestion(selectedText);
      }
    }
  } catch (error) {
    console.error("스크립트 실행 중 오류 발생:", error);
  }
});

async function getAiSuggestions(text) {
  try {
    const { geminiApiKey, selectedModel } = await chrome.storage.sync.get(['geminiApiKey', 'selectedModel']);
    if (!geminiApiKey) return null;

    const modelToUse = selectedModel || 'gemini-1.5-flash-latest';
    const API_URL = `https://generativelanguage.googleapis.com/v1beta/models/${modelToUse}:generateContent?key=${geminiApiKey}`;
    
    // 프롬프트 수정: 더 명확하게 JSON 배열만 요청
    const prompt = `Based on the following text, suggest three concise, action-oriented questions a user might want to ask. The questions should be in Korean. IMPORTANT: Your response must be ONLY a valid JSON array of strings, without any other text, explanation, or markdown formatting. For example: ["이 내용 요약해줘", "핵심 키워드 3개 뽑아줘", "긍정적인 부분만 정리해줘"]. Text: "${text}"`;

    const response = await fetch(API_URL, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ contents: [{ parts: [{ text: prompt }] }] })
    });

    if (!response.ok) return null;
    const data = await response.json();

    if (data.candidates && data.candidates[0] && data.candidates[0].content) {
        let suggestionsText = data.candidates[0].content.parts[0].text;
        
        // 파싱 안정성 강화: 마크다운 코드 블록 제거 및 공백 제거
        suggestionsText = suggestionsText.replace(/```json/g, '').replace(/```/g, '').trim();

        // 파싱 전 유효성 검사
        if (suggestionsText.startsWith('[') && suggestionsText.endsWith(']')) {
          try {
            const suggestions = JSON.parse(suggestionsText);
            return suggestions.slice(0, 3); // 최대 3개만 반환
          } catch (e) {
            console.error("JSON 파싱 오류:", e, "원본 텍스트:", suggestionsText);
            return null;
          }
        }
    }
    return null;
  } catch (error) {
    console.error("AI 추천 생성 중 오류:", error);
    return null;
  }
}


async function addContextSnippet(text) {
  if (!text || text.trim() === "") return;
  try {
    const result = await chrome.storage.local.get({ contextSnippets: [] });
    const snippets = result.contextSnippets || [];
    
    if (Array.isArray(snippets)) {
        snippets.push(text.trim());
        await chrome.storage.local.set({ contextSnippets: snippets });
        console.log("맥락이 성공적으로 추가되었습니다.");

        const suggestions = await getAiSuggestions(text);
        if (suggestions) {
            await chrome.storage.local.set({ aiSuggestions: suggestions });
            console.log("AI 추천 질문이 생성되었습니다:", suggestions);
        }

        chrome.runtime.sendMessage({ type: "CONTEXT_UPDATED" }).catch(err => {});
    } else {
        await chrome.storage.local.set({ contextSnippets: [text.trim()] });
        console.warn("기존 맥락 데이터가 배열이 아니므로, 새 배열로 덮어썼습니다.");
    }
  } catch (error) {
    console.error("맥락 추가 중 오류 발생:", error);
  }
}

async function addAsQuestion(text) {
  if (!text || text.trim() === "") return;
  try {
    await chrome.storage.local.set({ simpleQuestion: text.trim() });
    console.log("질문이 성공적으로 저장되었습니다.");
  } catch (error) {
    console.error("질문 추가 중 오류 발생:", error);
  }
}