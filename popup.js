// Firebase SDK 모듈을 임포트합니다.
import { initializeApp } from './firebase-sdk/firebase-app.js';
import { getAuth, onAuthStateChanged, GoogleAuthProvider, signInWithPopup, signOut } from './firebase-sdk/firebase-auth.js';
import { getFirestore, doc, setDoc, serverTimestamp } from './firebase-sdk/firebase-firestore.js';
import { getFunctions, httpsCallable } from './firebase-sdk/firebase-functions.js';
import { firebaseConfig } from './firebase-config.js';

// Firebase 앱 초기화
const app = initializeApp(firebaseConfig);
const auth = getAuth(app);
const db = getFirestore(app);
const functions = getFunctions(app, 'asia-northeast3');

document.addEventListener('DOMContentLoaded', () => {
    // --- DOM 요소 캐싱 ---
    // HTML의 id와 정확히 일치하도록 수정
    const elements = {
        loginButton: document.getElementById('login-button'),
        logoutButton: document.getElementById('logout-button'),
        userName: document.getElementById('user-name'),
        mainContent: document.getElementById('main-content'),
        generateButton: document.getElementById('generate-button'),
        copyButton: document.getElementById('copy-button'),
        likeButton: document.getElementById('like-button'),
        userInput: document.getElementById('user-input'),
        modelSelect: document.getElementById('model-select'),
        resultOutput: document.getElementById('result-output'),
    };

    // --- 상태 관리 ---
    let currentUser = null;
    let selectedModel = 'gemini-1.5-flash-latest';
    const userFlowData = {};

    // --- UI 업데이트 함수 ---
    const updateUI = (user) => {
        if (user) {
            elements.userName.textContent = user.displayName || '사용자';
            elements.loginButton.classList.add('hidden');
            elements.logoutButton.classList.remove('hidden');
            elements.mainContent.style.display = 'block';
        } else {
            elements.userName.textContent = '';
            elements.loginButton.classList.remove('hidden');
            elements.logoutButton.classList.add('hidden');
            elements.mainContent.style.display = 'none';
        }
    };

    // --- 인증 관련 함수 ---
    const handleLogin = async () => {
        const provider = new GoogleAuthProvider();
        try {
            const result = await signInWithPopup(auth, provider);
            const user = result.user;
            const userRef = doc(db, 'users', user.uid);
            await setDoc(userRef, {
                displayName: user.displayName,
                email: user.email,
                lastLogin: serverTimestamp(),
            }, { merge: true });
        } catch (error) {
            console.error("로그인 중 오류 발생:", error);
        }
    };

    const handleLogout = async () => {
        try {
            await signOut(auth);
        } catch (error) {
            console.error("로그아웃 중 오류 발생:", error);
        }
    };

    // --- 핵심 로직: 프롬프트 생성 ---
    const generatePrompt = async () => {
        if (!currentUser) {
            elements.resultOutput.value = "⚠️ 로그인이 필요합니다.";
            return;
        }

        // 1. 사용자 데이터 수집
        const step1 = document.querySelector('#step-1 .option.selected');
        const step2 = document.querySelector('#step-2 .option.selected');
        const step3 = document.querySelector('#step-3 .option.selected');
        
        userFlowData.purpose = step1 ? step1.textContent.trim() : '콘텐츠 제작';
        userFlowData.role = step2 ? step2.textContent.trim() : '전문가';
        userFlowData.format = step3 ? step3.textContent.trim() : '글머리 기호';
        userFlowData.userInput = elements.userInput.value;

        // 2. 고품질 metaPrompt 생성
        const metaPrompt = `당신은 ${userFlowData.role}이고, ${userFlowData.purpose}를 위해 다음 내용을 ${userFlowData.format} 형식으로 작성해야 합니다: "${userFlowData.userInput}"`;

        // 3. UI 처리
        flowManager.navigateTo('step-5');
        elements.resultOutput.value = `✨ 최적 프롬프트를 생성 중입니다... (${selectedModel.includes('pro') ? 'Pro' : 'Flash'} 모델 사용)`;
        elements.generateButton.disabled = true;

        // 4. Firebase 함수 호출
        try {
            const generateOptimalPrompt = httpsCallable(functions, 'generateOptimalPrompt');
            const result = await generateOptimalPrompt({ prompt: metaPrompt, model: selectedModel });
            const { success, data } = result.data;

            if (success) {
                elements.resultOutput.value = data;
                elements.likeButton.style.display = 'block';
            } else {
                elements.resultOutput.value = `⚠️ 서버에서 오류가 발생했습니다: ${result.data.error || '알 수 없는 오류'}`;
            }
        } catch (error) {
            console.error("Firebase Function 호출 중 오류 발생:", error);
            elements.resultOutput.value = `⚠️ 서버와 통신 중 심각한 오류가 발생했습니다: ${error.message}`;
        } finally {
            elements.generateButton.disabled = false;
        }
    };
    
    // --- 유틸리티 함수 ---
    const copyToClipboard = () => {
        navigator.clipboard.writeText(elements.resultOutput.value)
            .then(() => {
                elements.copyButton.textContent = '복사 완료!';
                setTimeout(() => { elements.copyButton.textContent = '복사'; }, 2000);
            })
            .catch(err => console.error('복사 실패:', err));
    };

    // --- 플로우 관리 ---
    const flowManager = {
        steps: document.querySelectorAll('.flow-step'),
        navigateTo: (stepId) => {
            flowManager.steps.forEach(step => {
                step.classList.toggle('hidden', step.id !== stepId);
            });
        }
    };

    // --- 이벤트 리스너 바인딩 ---
    onAuthStateChanged(auth, user => {
        currentUser = user;
        updateUI(user);
        if (user) {
            flowManager.navigateTo('step-1');
        }
    });

    elements.loginButton.addEventListener('click', handleLogin);
    elements.logoutButton.addEventListener('click', handleLogout);
    elements.generateButton.addEventListener('click', generatePrompt);
    elements.copyButton.addEventListener('click', copyToClipboard);
    elements.modelSelect.addEventListener('change', (e) => selectedModel = e.target.value);
    
    document.querySelectorAll('.option').forEach(button => {
        button.addEventListener('click', (e) => {
            // 선택 효과
            e.target.parentElement.querySelectorAll('.option').forEach(btn => btn.classList.remove('selected'));
            e.target.classList.add('selected');
            // 다음 단계로 이동
            const nextStep = e.target.dataset.next;
            if (nextStep) {
                flowManager.navigateTo(nextStep);
            }
        });
    });

    document.querySelectorAll('.back-button').forEach(button => {
        button.addEventListener('click', (e) => {
            const prevStep = e.target.dataset.prev;
            if (prevStep) {
                flowManager.navigateTo(prevStep);
            }
        });
    });

    // 초기 상태 설정
    updateUI(null);
    flowManager.navigateTo('step-1'); // 로그인 안해도 첫 단계는 보이도록
});