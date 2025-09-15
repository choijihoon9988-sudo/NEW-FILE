// [핵심 기능] 확장 프로그램이 설치될 때 컨텍스트 메뉴를 생성합니다.
chrome.runtime.onInstalled.addListener(() => {
  chrome.contextMenus.create({
    id: "addContextSnippet",
    title: "💡 핵심 맥락으로 추가",
    contexts: ["selection"], // 텍스트를 선택했을 때만 메뉴가 나타남
    // 이 메뉴가 gemini.google.com 에서만 나타나도록 제한합니다.
    documentUrlPatterns: ["*://gemini.google.com/*"]
  });
});

// 컨텍스트 메뉴가 클릭되었을 때 실행될 이벤트 리스너입니다.
chrome.contextMenus.onClicked.addListener((info, tab) => {
  if (info.menuItemId === "addContextSnippet" && info.selectionText) {
    // 1. 기존에 저장된 맥락 조각들을 불러옵니다.
    chrome.storage.local.get({ contextSnippets: [] }, (result) => {
      const snippets = result.contextSnippets;
      // 2. 새로 선택한 텍스트를 배열에 추가합니다.
      snippets.push(info.selectionText);
      // 3. 업데이트된 배열을 다시 저장소에 저장합니다.
      chrome.storage.local.set({ contextSnippets: snippets }, () => {
        console.log("새로운 맥락 조각이 추가되었습니다.");
      });
    });
  }
});