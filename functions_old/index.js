// functions/index.js 파일의 전체 내용을 이 코드로 교체하세요.

const {onCall, HttpsError} = require("firebase-functions/v2/https");
const {onSchedule} = require("firebase-functions/v2/scheduler");
const admin = require("firebase-admin");
const {GoogleGenerativeAI} = require("@google/generative-ai");
const logger = require("firebase-functions/logger");

admin.initializeApp();

// 환경 변수에서 API 키를 안전하게 로드합니다.
// 이 방식은 최신 버전에서 권장됩니다.
const GEMINI_API_KEY = process.env.GEMINI_KEY;
if (!GEMINI_API_KEY) {
  logger.error("Gemini API 키가 환경 변수에 설정되지 않았습니다.");
  throw new Error("환경 변수 설정 필요: GEMINI_KEY");
}
const genAI = new GoogleGenerativeAI(GEMINI_API_KEY);

// 메인 함수: 프롬프트 생성
exports.generateOptimalPrompt = onCall(
    {
      region: "asia-northeast3", // 지역: 서울
      minInstances: 1, // 콜드 스타트 방지
      secrets: ["GEMINI_KEY"], // 사용할 API 키 환경 변수 지정
    },
    async (request) => {
      if (!request.auth) {
        throw new HttpsError("unauthenticated", "인증이 필요합니다.");
      }

      const {prompt, model: modelId = "gemini-1.5-flash-latest"} = request.data;
      if (!prompt) {
        throw new HttpsError("invalid-argument", "프롬프트가 비어있습니다.");
      }

      try {
        const model = genAI.getGenerativeModel({model: modelId});
        const result = await model.generateContent(prompt);
        const response = await result.response;
        return {success: true, data: response.text().trim()};
      } catch (error) {
        logger.error("Gemini API 호출 중 오류:", error);
        throw new HttpsError(
            "internal",
            "AI 모델을 호출하는 중 서버 오류가 발생했습니다.",
        );
      }
    },
);

// 주간 랭킹 계산 함수 (최신 문법 적용)
exports.calculateWeeklyRankings = onSchedule(
    {
      schedule: "every monday 05:00",
      timeZone: "Asia/Seoul",
    },
    async (event) => {
      logger.log("주간 랭킹 계산을 시작합니다.");
      // 여기에 기존 랭킹 계산 로직을 추가하세요.
      return null;
    },
);