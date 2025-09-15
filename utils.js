// utils.js

/**
 * 간단한 휴리스틱을 사용하여 텍스트의 예상 토큰 수를 계산합니다.
 * 한국어의 경우, 글자 수를 2로 나누어 대략적인 값을 추정합니다.
 * @param {string} text - 토큰 수를 계산할 텍스트
 * @returns {number} 예상 토큰 수
 */
function estimateTokens(text) {
    if (!text) return 0;
    // 매우 단순한 추정치: 글자 수 / 2 (실제 토크나이저와는 다름)
    return Math.round(text.length / 2);
}

const TOKEN_LIMIT = 4000; // API 호출 시 토큰 제한 (안전 마진 포함)