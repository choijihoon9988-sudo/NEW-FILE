document.addEventListener('DOMContentLoaded', () => {
    // --- DOM 요소 캐싱 ---
    const elements = {
        // API 및 설정
        apiKeySection: document.getElementById('apiKeySection'),
        apiKeyInput: document.getElementById('apiKeyInput'),
        saveApiKeyButton: document.getElementById('saveApiKeyButton'),
        apiKeySaved: document.getElementById('apiKeySaved'),
        changeApiKeyButton: document.getElementById('changeApiKeyButton'),
        modelSelect: document.getElementById('modelSelect'),
        settingsButton: document.getElementById('settingsButton'),
        // 플로우 단계별 컨테이너
        steps: document.querySelectorAll('.flow-step'),
        // 진행률 바
        progressBar: document.getElementById('progressBar'),
        progressText: document.getElementById('progressText'),
        // 템플릿 관련
        templateDrawer: document.getElementById('templateDrawer'),
        templateToggleButton: document.getElementById('templateToggleButton'),
        templateSelectButton: document.getElementById('templateSelectButton'),
        templateDropdownContent: document.getElementById('templateDropdownContent'),
        // 맥락 관련
        contextList: document.getElementById('contextList'),
        clearContextButton: document.getElementById('clearContextButton'),
        undoButton: document.getElementById('undoButton'),
        tokenCounter: document.getElementById('tokenCounter'),
        // 질문 관련
        questionInput: document.getElementById('questionInput'),
        suggestionContainer: document.getElementById('suggestionContainer'),
        // 스타일 관련
        answerStyleSelect: document.getElementById('answerStyle'),
        toneSelect: document.getElementById('tone'),
        // 생성 및 결과
        generateButton: document.getElementById('generateButton'),
        resultOutput: document.getElementById('resultOutput'),
        likeButton: document.getElementById('likeButton'),
        copyButton: document.getElementById('copyButton'),
        // 네비게이션 버튼
        backButton: document.getElementById('backButton'),
        nextButton: document.getElementById('nextButton'),
        restartButton: document.getElementById('restartButton'),
        goalButtons: document.querySelectorAll('.goal-btn'),
        quickStartButton: document.getElementById('quickStartButton'),
        // 템플릿 수정 모달
        editTemplateModal: document.getElementById('editTemplateModal'),
        editTemplateName: document.getElementById('editTemplateName'),
        editTemplateGoal: document.getElementById('editTemplateGoal'),
        editTemplateQuestion: document.getElementById('editTemplateQuestion'),
        editTemplateStyle: document.getElementById('editTemplateStyle'),
        editTemplateTone: document.getElementById('editTemplateTone'),
        saveTemplateChangesButton: document.getElementById('saveTemplateChangesButton'),
        cancelEditButton: document.getElementById('cancelEditButton'),
    };

    // --- 상태 관리 변수 ---
    let snippets = [], apiKey = null, historyStack = [];
    let templates = [];
    let currentlyEditingTemplateIndex = null;
    let selectedModel = 'gemini-1.5-flash-latest';
    
    const TOTAL_STEPS = 4;
    let currentStep = 1;
    let userFlowData = { goal: '', question: '', style: '', tone: '' };

    // --- 플로우 관리 ---
    const flowManager = {
        updateProgressBar() {
            const progress = currentStep > TOTAL_STEPS ? 100 : ((currentStep - 1) / TOTAL_STEPS) * 100;
            elements.progressBar.style.width = `${progress}%`;
            if (currentStep > TOTAL_STEPS) {
                elements.progressText.textContent = '프롬프트 생성 완료!';
            } else {
                elements.progressText.textContent = `단계 ${currentStep} / ${TOTAL_STEPS}`;
            }
        },
        navigateTo(step) {
            currentStep = step;
            elements.steps.forEach(s => s.classList.remove('active'));
            document.getElementById(`step${step}`).classList.add('active');
            this.updateNavButtons();
            this.updateProgressBar();
        },
        updateNavButtons() {
            elements.backButton.style.display = (currentStep > 1 && currentStep <= TOTAL_STEPS) ? 'block' : 'none';
            elements.nextButton.style.display = (currentStep >= 1 && currentStep < TOTAL_STEPS) ? 'block' : 'none';
            if (currentStep === 1) {
                elements.nextButton.style.display = 'none';
            }
        },
        next() {
            if (currentStep < TOTAL_STEPS) {
                 if (currentStep === 3 && elements.questionInput.value.trim() === '') {
                    alert('핵심 질문을 입력해주세요.');
                    return;
                }
                this.navigateTo(currentStep + 1);
            }
        },
        back() {
            if (currentStep > 1) {
                this.navigateTo(currentStep - 1);
            }
        },
        restart() {
            userFlowData = { goal: '', question: '', style: '', tone: '' };
            elements.questionInput.value = '';
            elements.resultOutput.value = '';
            elements.likeButton.style.display = 'none';
            this.navigateTo(1);
        },
        handleGoalSelection(goal) {
            userFlowData.goal = goal;
            const placeholders = {
                '요약': '어떤 내용을 요약할까요? 핵심 주제를 알려주세요.',
                '브레인스토밍': '어떤 주제에 대한 아이디어가 필요한가요?',
                '코드 분석': '어떤 코드의 기능이나 개선점을 분석할까요?',
                '자유 질문': '무엇이든지 물어보세요.'
            };
            elements.questionInput.placeholder = placeholders[goal] || placeholders['자유 질문'];
            this.navigateTo(2);
        }
    };

    // --- 템플릿 관리 ---
    const templateManager = {
        render() {
            elements.templateDropdownContent.innerHTML = '';
            elements.templateSelectButton.textContent = "템플릿 선택...";
            if (templates.length === 0) {
                const noItem = document.createElement('div');
                noItem.textContent = "저장된 템플릿이 없습니다.";
                noItem.style.padding = "12px";
                noItem.style.color = "var(--font-color-secondary)";
                elements.templateDropdownContent.appendChild(noItem);
                return;
            }
            templates.forEach((template, index) => {
                const item = document.createElement('div');
                item.className = 'dropdown-item';
                const nameSpan = document.createElement('span');
                nameSpan.className = 'template-name';
                nameSpan.textContent = template.name;
                nameSpan.onclick = () => this.apply(index);
                const actionsDiv = document.createElement('div');
                actionsDiv.className = 'template-actions';
                const editBtn = document.createElement('button'); editBtn.className = 'template-action-btn'; editBtn.textContent = '✏️';
                editBtn.onclick = (e) => { e.stopPropagation(); this.edit(index); };
                const deleteBtn = document.createElement('button'); deleteBtn.className = 'template-action-btn'; deleteBtn.textContent = '🗑️';
                deleteBtn.onclick = (e) => { e.stopPropagation(); this.delete(index); };
                actionsDiv.appendChild(editBtn); actionsDiv.appendChild(deleteBtn);
                item.appendChild(nameSpan); item.appendChild(actionsDiv);
                elements.templateDropdownContent.appendChild(item);
            });
        },
        save() {
            const name = prompt("템플릿 이름을 입력하세요:", userFlowData.question.substring(0, 20) || userFlowData.goal);
            if (name && name.trim() !== "") {
                const newTemplate = { name: name.trim(), ...userFlowData };
                templates.unshift(newTemplate);
                chrome.storage.sync.set({ templates }, () => {
                    this.render();
                    alert(`'${name.trim()}' 템플릿이 저장되었습니다.`);
                });
            }
        },
        apply(index) {
            const template = templates[index];
            userFlowData = { goal: template.goal, question: template.question, style: template.style, tone: template.tone };
            elements.questionInput.value = userFlowData.question;
            elements.answerStyleSelect.value = userFlowData.style;
            elements.toneSelect.value = userFlowData.tone;
            elements.templateSelectButton.textContent = template.name;
            elements.templateDropdownContent.classList.remove('show');
            elements.templateDrawer.style.display = 'none';
            alert(`'${template.name}' 템플릿이 적용되었습니다. 마지막 단계로 이동합니다.`);
            flowManager.navigateTo(4);
        },
        edit(index) {
            currentlyEditingTemplateIndex = index;
            const template = templates[index];
            elements.editTemplateName.value = template.name;
            elements.editTemplateGoal.value = template.goal;
            elements.editTemplateQuestion.value = template.question;
            elements.editTemplateStyle.value = template.style;
            elements.editTemplateTone.value = template.tone;
            elements.editTemplateModal.style.display = 'flex';
        },
        hideEditModal() {
            elements.editTemplateModal.style.display = 'none';
            currentlyEditingTemplateIndex = null;
        },
        saveChanges() {
            if (currentlyEditingTemplateIndex === null) return;
            const updatedTemplate = {
                name: elements.editTemplateName.value.trim(),
                goal: elements.editTemplateGoal.value,
                question: elements.editTemplateQuestion.value,
                style: elements.editTemplateStyle.value,
                tone: elements.editTemplateTone.value
            };
            if (!updatedTemplate.name) { alert("템플릿 이름은 비워둘 수 없습니다."); return; }
            templates[currentlyEditingTemplateIndex] = updatedTemplate;
            chrome.storage.sync.set({ templates }, () => {
                this.render(); this.hideEditModal();
            });
        },
        delete(index) {
            if (confirm(`정말로 '${templates[index].name}' 템플릿을 삭제하시겠습니까?`)) {
                templates.splice(index, 1);
                chrome.storage.sync.set({ templates }, this.render);
            }
        }
    };

    // --- 데이터 로딩 및 초기화 ---
    const loadDataFromStorage = async () => {
        try {
            const localResult = await chrome.storage.local.get(['contextSnippets', 'simpleQuestion', 'aiSuggestions']);
            const syncResult = await chrome.storage.sync.get(['geminiApiKey', 'selectedModel', 'templates']);
            snippets = localResult.contextSnippets || [];
            apiKey = syncResult.geminiApiKey || null;
            templates = syncResult.templates || [];
            selectedModel = syncResult.selectedModel || 'gemini-1.5-flash-latest';
            elements.modelSelect.value = selectedModel;
            if (localResult.simpleQuestion) { elements.questionInput.value = localResult.simpleQuestion; chrome.storage.local.remove('simpleQuestion'); }
            if (localResult.aiSuggestions) { renderSuggestions(localResult.aiSuggestions); chrome.storage.local.remove('aiSuggestions'); }
            renderContextSnippets();
            templateManager.render();
            updateApiSectionUI();
            updateUndoButtonState();
        } catch (error) { console.error("데이터 로딩 중 오류 발생:", error); }
    };

    const populateModalDropdowns = () => {
        ['요약', '브레인스토밍', '코드 분석', '자유 질문'].forEach(g => {
            elements.editTemplateGoal.add(new Option(g, g));
        });
        Array.from(elements.answerStyleSelect.options).forEach(opt => elements.editTemplateStyle.add(opt.cloneNode(true)));
        Array.from(elements.toneSelect.options).forEach(opt => elements.editTemplateTone.add(opt.cloneNode(true)));
    };


    // --- UI 렌더링 함수 ---
    const renderContextSnippets = () => {
        elements.contextList.innerHTML = '';
        if (snippets.length === 0) { elements.contextList.innerHTML = `<p class="placeholder">맥락을 추가하면 AI가 더 정확한 답변을 합니다.</p>`; }
        else {
            snippets.forEach((snippet, index) => {
                const item = document.createElement('div'); item.className = 'context-item';
                const snippetText = document.createElement('p'); snippetText.className = 'snippet-text'; snippetText.textContent = snippet;
                const deleteButton = document.createElement('button'); deleteButton.className = 'delete-snippet-btn'; deleteButton.textContent = '×'; deleteButton.dataset.index = index;
                item.appendChild(snippetText); item.appendChild(deleteButton);
                elements.contextList.appendChild(item);
            });
        }
        updateTokenCount();
    };
    const updateTokenCount = () => {
        const count = Math.round(snippets.join(' ').length / 2);
        elements.tokenCounter.textContent = count;
        elements.tokenCounter.style.color = count > 4000 ? '#e74c3c' : 'var(--accent-color-primary)';
    };
    const renderSuggestions = (suggestions) => {
        elements.suggestionContainer.innerHTML = '';
        suggestions.forEach(text => {
            const btn = document.createElement('button'); btn.className = 'suggestion-btn';
            btn.textContent = text; btn.onclick = () => { elements.questionInput.value = text; elements.suggestionContainer.innerHTML = ''; };
            elements.suggestionContainer.appendChild(btn);
        });
    };
    const updateApiSectionUI = () => {
        elements.apiKeyInput.parentElement.style.display = apiKey ? 'none' : 'flex';
        elements.apiKeySaved.style.display = apiKey ? 'flex' : 'none';
    };
    const updateUndoButtonState = () => { elements.undoButton.disabled = historyStack.length === 0; };


    // --- 핵심 로직: 프롬프트 생성 ---
    const generatePrompt = async () => {
        if (!apiKey) {
            alert("API 키를 먼저 저장해주세요.");
            elements.settingsButton.click();
            return;
        }
        userFlowData.question = elements.questionInput.value.trim();
        userFlowData.style = elements.answerStyleSelect.value;
        userFlowData.tone = elements.toneSelect.value;
        const contextText = snippets.join('\n\n');

        const metaPrompt = `당신은 사용자의 요청을 분석하여 최적의 프롬프트를 생성하는 'AI 프롬프트 엔지니어'입니다. 주어진 [작업 목표]와 [핵심 질문], 그리고 [대화 맥락]을 종합하여, 아래 [출력 조건]에 맞는 최종 프롬프트만 출력해주세요. 다른 설명은 일절 포함하지 마세요.\n\n---\n[작업 목표]: ${userFlowData.goal}\n[핵심 질문]: ${userFlowData.question}\n[대화 맥락]: ${contextText || "없음"}\n---\n[출력 조건]:\n- 최종 답변 형식: '${userFlowData.style}'\n- 어조/관점: '${userFlowData.tone}'\n- 맥락과 질문의 의도를 명확히 결합하여, AI가 풍부한 답변을 생성하도록 상세하게 질문을 재구성할 것.\n---`;
        
        flowManager.navigateTo(5);
        elements.resultOutput.value = `✨ 최적 프롬프트를 생성 중입니다...`;
        elements.generateButton.disabled = true;

        try {
            // Firebase Functions 대신 원래의 callGeminiAPI를 직접 호출
            const result = await callGeminiAPI(apiKey, metaPrompt, selectedModel);
            if (result.success) {
                elements.resultOutput.value = result.data;
                elements.likeButton.style.display = 'block';
            } else {
                elements.resultOutput.value = `⚠️ 오류 발생:\n\n${result.error}`;
            }
        } catch (error) {
            console.error("generatePrompt 함수에서 심각한 오류 발생:", error);
            elements.resultOutput.value = `⚠️ 예측하지 못한 오류가 발생했습니다. 개발자 콘솔을 확인해주세요: ${error.message}`;
        } finally {
            elements.generateButton.disabled = false;
        }
    };


    // --- 이벤트 리스너 바인딩 ---
    function initializeEventListeners() {
        elements.goalButtons.forEach(button => button.addEventListener('click', () => flowManager.handleGoalSelection(button.dataset.goal)));
        elements.nextButton.addEventListener('click', () => flowManager.next());
        elements.backButton.addEventListener('click', () => flowManager.back());
        elements.restartButton.addEventListener('click', () => flowManager.restart());
        elements.quickStartButton.addEventListener('click', () => {
            flowManager.handleGoalSelection('자유 질문');
            flowManager.navigateTo(3);
        });

        elements.settingsButton.addEventListener('click', () => {
            elements.apiKeySection.style.display = elements.apiKeySection.style.display === 'none' ? 'block' : 'none';
            elements.templateDrawer.style.display = 'none';
        });
        elements.templateToggleButton.addEventListener('click', () => {
             elements.templateDrawer.style.display = elements.templateDrawer.style.display === 'none' ? 'block' : 'none';
             elements.apiKeySection.style.display = 'none';
        });

        elements.saveApiKeyButton.addEventListener('click', () => {
            const newApiKey = elements.apiKeyInput.value.trim();
            if (newApiKey) { apiKey = newApiKey; chrome.storage.sync.set({ geminiApiKey: apiKey }, updateApiSectionUI); elements.apiKeyInput.value = ''; }
        });
        elements.changeApiKeyButton.addEventListener('click', () => { apiKey = null; chrome.storage.sync.remove('geminiApiKey', updateApiSectionUI); });
        elements.modelSelect.addEventListener('change', () => { selectedModel = elements.modelSelect.value; chrome.storage.sync.set({ selectedModel: selectedModel }); });

        elements.clearContextButton.addEventListener('click', () => {
            if (snippets.length > 0) {
                historyStack.push([...snippets]);
                snippets = [];
                chrome.storage.local.set({ contextSnippets: snippets }, () => {
                    renderContextSnippets(); updateUndoButtonState();
                });
            }
        });
        elements.undoButton.addEventListener('click', () => {
            if (historyStack.length > 0) {
                snippets = historyStack.pop();
                chrome.storage.local.set({ contextSnippets: snippets }, () => {
                    renderContextSnippets(); updateUndoButtonState();
                });
            }
        });
        elements.contextList.addEventListener('click', (event) => {
            if (event.target.classList.contains('delete-snippet-btn')) {
                historyStack.push([...snippets]);
                snippets.splice(parseInt(event.target.dataset.index, 10), 1);
                chrome.storage.local.set({ contextSnippets: snippets }, () => {
                    renderContextSnippets(); updateUndoButtonState();
                });
            }
        });

        elements.generateButton.addEventListener('click', generatePrompt);
        elements.copyButton.addEventListener('click', () => {
            if (elements.resultOutput.value) { navigator.clipboard.writeText(elements.resultOutput.value).then(() => { elements.copyButton.textContent = '완료!'; setTimeout(() => { elements.copyButton.textContent = '복사'; }, 1500); });}
        });
        elements.likeButton.addEventListener('click', () => templateManager.save());

        elements.templateSelectButton.addEventListener('click', (e) => { e.stopPropagation(); elements.templateDropdownContent.classList.toggle('show'); });
        window.addEventListener('click', () => { if (elements.templateDropdownContent.classList.contains('show')) { elements.templateDropdownContent.classList.remove('show'); } });
        elements.saveTemplateChangesButton.addEventListener('click', () => templateManager.saveChanges());
        elements.cancelEditButton.addEventListener('click', () => templateManager.hideEditModal());

        chrome.runtime.onMessage.addListener((message) => { if (message.type === 'CONTEXT_UPDATED') { loadDataFromStorage(); } return true; });
    }

    // --- 앱 시작 ---
    function main() {
        populateModalDropdowns();
        initializeEventListeners();
        loadDataFromStorage();
        flowManager.navigateTo(1);
    }

    main();
});