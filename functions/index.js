const functions = require("firebase-functions");
const admin = require("firebase-admin");
admin.initializeApp();

const {GoogleGenerativeAI} = require("@google/generative-ai");

// Gemini API 키는 터미널 명령어로 안전하게 설정해야 합니다.
const GEMINI_API_KEY = functions.config().gemini.key;
const genAI = new GoogleGenerativeAI(GEMINI_API_KEY);

/**
 * 사용자의 프롬프트 텍스트를 받아 AI를 통해 분야를 분류하고 반환합니다.
 */
exports.getPromptCategory = functions.https.onCall(async (data, context) => {
  if (!context.auth) {
    throw new functions.https.HttpsError(
        "unauthenticated",
        "The function must be called while authenticated.",
    );
  }

  const promptText = data.promptText;
  if (!promptText) {
    throw new functions.https.HttpsError(
        "invalid-argument",
        "The function must be called with one argument 'promptText'.",
    );
  }

  try {
    const model = genAI.getGenerativeModel({model: "gemini-pro"});
    const classificationPrompt = "Analyze the following text and classify " +
      "it into one of these categories: ['Business', 'Writing', " +
      "'Self-Development', 'Programming', 'Marketing', 'General']. " +
      `Output only the category name. Text: "${promptText}"`;

    const result = await model.generateContent(classificationPrompt);
    const response = await result.response;
    const category = response.text().trim();
    return {category: category};
  } catch (error) {
    console.error("Gemini API 호출 중 에러 발생:", error);
    throw new functions.https.HttpsError(
        "internal",
        "Error calling Gemini API.",
    );
  }
});

/**
 * 매주 월요일 오전 5시에 실행되어 모든 사용자의 랭킹과 티어를 계산합니다.
 */
exports.calculateWeeklyRankings = functions.pubsub
    .schedule("every monday 05:00")
    .timeZone("Asia/Seoul")
    .onRun(async (context) => {
      console.log("주간 랭킹 계산을 시작합니다.");
      const db = admin.firestore();
      const oneWeekAgo = new Date();
      oneWeekAgo.setDate(oneWeekAgo.getDate() - 7);

      const activitiesSnapshot = await db.collectionGroup("activities")
          .where("createdAt", ">=", oneWeekAgo).get();

      if (activitiesSnapshot.empty) {
        console.log("지난 주 활동 기록이 없습니다.");
        return null;
      }

      const userScores = {};
      activitiesSnapshot.forEach((doc) => {
        const activity = doc.data();
        const userId = doc.ref.parent.parent.id;

        if (!userScores[userId]) {
          userScores[userId] = {totalScore: 0, count: 0};
        }
        userScores[userId].totalScore += activity.efficiencyScore;
        userScores[userId].count += 1;
      });

      const userAverages = Object.keys(userScores).map((userId) => ({
        userId,
        avgScore: userScores[userId].totalScore / userScores[userId].count,
      }));

      userAverages.sort((a, b) => b.avgScore - a.avgScore);

      const totalUsers = userAverages.length;
      const tierCutoffs = {
        Master: Math.ceil(totalUsers * 0.01),
        Platinum: Math.ceil(totalUsers * 0.05),
        Gold: Math.ceil(totalUsers * 0.20),
        Silver: Math.ceil(totalUsers * 0.50),
      };

      const batch = db.batch();
      userAverages.forEach((user, index) => {
        let tier = "Bronze";
        const rank = index + 1;

        if (rank <= tierCutoffs.Master) tier = "Master";
        else if (rank <= tierCutoffs.Platinum) tier = "Platinum";
        else if (rank <= tierCutoffs.Gold) tier = "Gold";
        else if (rank <= tierCutoffs.Silver) tier = "Silver";

        const userRef = db.collection("users").doc(user.userId);
        batch.update(userRef, {
          tier: tier,
          avgScore: user.avgScore,
          lastRank: rank,
        });
      });

      await batch.commit();
      console.log(`${totalUsers}명의 주간 랭킹 계산 및 업데이트 완료.`);
      return null;
    });