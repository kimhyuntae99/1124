// ========================================
// Firebase 설정
// ========================================
// 
// 아래 설정값들은 Firebase Console에서 가져와야 합니다:
// 1. Firebase Console (https://console.firebase.google.com/) 접속
// 2. 프로젝트 생성 또는 선택
// 3. 프로젝트 설정 > 일반 > 내 앱 섹션에서 웹 앱 추가
// 4. Firebase SDK 구성 정보 복사
// 5. Authentication > Sign-in method에서 Google 로그인 활성화
// 6. Firestore Database 생성 (규칙 설정 필요)
// ========================================

export const firebaseConfig = {
  apiKey: "YOUR_API_KEY",                    // Firebase API 키
  authDomain: "YOUR_PROJECT_ID.firebaseapp.com",
  projectId: "YOUR_PROJECT_ID",
  storageBucket: "YOUR_PROJECT_ID.appspot.com",
  messagingSenderId: "YOUR_MESSAGING_SENDER_ID",
  appId: "YOUR_APP_ID",
  measurementId: "YOUR_MEASUREMENT_ID"       // (선택사항)
};

// ========================================
// 설정 방법 안내
// ========================================
/*
1. Firebase 프로젝트 생성:
   - https://console.firebase.google.com/
   - "프로젝트 만들기" 클릭
   - 프로젝트 이름 입력 (예: my-health-report)

2. Authentication 설정:
   - 좌측 메뉴 > Authentication 선택
   - "시작하기" 클릭
   - Sign-in method 탭 > Google 활성화
   - 공개용 프로젝트 이름과 지원 이메일 입력 후 저장

3. Firestore Database 설정:
   - 좌측 메뉴 > Firestore Database 선택
   - "데이터베이스 만들기" 클릭
   - 테스트 모드로 시작 (개발 단계)
   - 지역 선택 (asia-northeast3: 서울 권장)

4. 웹 앱 추가:
   - 프로젝트 개요 페이지에서 웹 아이콘(</>) 클릭
   - 앱 닉네임 입력
   - Firebase SDK 구성 코드 복사
   - 위의 firebaseConfig 객체에 붙여넣기

5. 보안 규칙 설정 (Firestore):
   rules_version = '2';
   service cloud.firestore {
     match /databases/{database}/documents {
       // 사용자는 자신의 데이터만 읽고 쓸 수 있음
       match /users/{userId} {
         allow read, write: if request.auth != null && request.auth.uid == userId;
       }
       match /healthData/{userId}/{document=**} {
         allow read, write: if request.auth != null && request.auth.uid == userId;
       }
       match /reports/{userId}/{document=**} {
         allow read, write: if request.auth != null && request.auth.uid == userId;
       }
     }
   }
*/

// ========================================
// 환경 변수 사용 (프로덕션 권장)
// ========================================
/*
프로덕션 환경에서는 환경 변수를 사용하는 것을 권장합니다:

// .env 파일 생성:
VITE_FIREBASE_API_KEY=your_api_key
VITE_FIREBASE_AUTH_DOMAIN=your_auth_domain
VITE_FIREBASE_PROJECT_ID=your_project_id
VITE_FIREBASE_STORAGE_BUCKET=your_storage_bucket
VITE_FIREBASE_MESSAGING_SENDER_ID=your_messaging_sender_id
VITE_FIREBASE_APP_ID=your_app_id

// firebaseConfig.js:
export const firebaseConfig = {
  apiKey: import.meta.env.VITE_FIREBASE_API_KEY,
  authDomain: import.meta.env.VITE_FIREBASE_AUTH_DOMAIN,
  projectId: import.meta.env.VITE_FIREBASE_PROJECT_ID,
  storageBucket: import.meta.env.VITE_FIREBASE_STORAGE_BUCKET,
  messagingSenderId: import.meta.env.VITE_FIREBASE_MESSAGING_SENDER_ID,
  appId: import.meta.env.VITE_FIREBASE_APP_ID
};

// .gitignore에 .env 추가하여 키 노출 방지
*/
