// [보안 경고] 이 파일에 API 키와 같은 민감한 정보를 직접 하드코딩하는 것은 매우 위험합니다.
// 이 정보는 클라이언트 측 코드에 포함되어 브라우저에서 누구나 접근할 수 있게 되므로,
// 심각한 보안 취약점을 야기할 수 있습니다.
//
// [권장 조치]
// 1. 서버 측 환경(예: Firebase Functions, Node.js 서버 등)을 구축하세요.
// 2. 민감한 키는 서버의 '환경 변수'로 안전하게 저장하세요.
// 3. 클라이언트(확장 프로그램)는 직접 API를 호출하는 대신, 자체 서버에 요청을 보내고
//    서버가 환경 변수를 사용하여 안전하게 외부 API(Firebase, Gemini 등)를 호출하도록 아키텍처를 변경해야 합니다.
//
// 아래 설정은 실제 키 대신 플레이스홀더로 대체되었습니다.
// 이 프로젝트에서 Firebase 기능이 실제로 필요한 경우, 반드시 서버리스 함수(Firebase Functions)를 통해 접근하도록 재구성해야 합니다.

const firebaseConfig = {
    apiKey: "YOUR_SERVER_SIDE_API_KEY", // 절대 클라이언트에 노출 금지
    authDomain: "YOUR_PROJECT_ID.firebaseapp.com",
    projectId: "YOUR_PROJECT_ID",
    storageBucket: "YOUR_PROJECT_ID.appspot.com",
    messagingSenderId: "YOUR_MESSAGING_SENDER_ID",
    appId: "YOUR_APP_ID",
    measurementId: "YOUR_MEASUREMENT_ID"
};