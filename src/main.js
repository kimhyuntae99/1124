// ========================================
// 대시보드 페이지 - 건강 데이터 입력
// ========================================

import { initializeApp } from 'firebase/app';
import { getAuth, onAuthStateChanged } from 'firebase/auth';
import { getFirestore, collection, addDoc, query, where, orderBy, limit, getDocs, Timestamp } from 'firebase/firestore';
import { firebaseConfig } from './firebaseConfig.js';

// Firebase 초기화
const app = initializeApp(firebaseConfig);
const auth = getAuth(app);
const db = getFirestore(app);

// DOM 요소
const userInfo = document.getElementById('userInfo');
const userName = document.getElementById('userName');
const userAvatar = document.getElementById('userAvatar');
const healthDataForm = document.getElementById('healthDataForm');
const backBtn = document.getElementById('backBtn');
const recentDataSection = document.getElementById('recentDataSection');
const recentDataList = document.getElementById('recentDataList');

// 폼 입력 요소
const dateInput = document.getElementById('dateInput');
const weightInput = document.getElementById('weightInput');
const heightInput = document.getElementById('heightInput');
const sleepInput = document.getElementById('sleepInput');
const exerciseInput = document.getElementById('exerciseInput');
const waterInput = document.getElementById('waterInput');
const moodInput = document.getElementById('moodInput');
const stressInput = document.getElementById('stressInput');
const notesInput = document.getElementById('notesInput');

// ========================================
// 사용자 정보 표시
// ========================================

function showUserInfo(user) {
  if (userInfo) userInfo.classList.remove('hidden');
  if (userName) userName.textContent = user.displayName || '사용자';
  if (userAvatar) {
    userAvatar.src = user.photoURL || 'https://via.placeholder.com/50';
    userAvatar.alt = `${user.displayName || '사용자'}의 프로필 사진`;
  }
}

// ========================================
// 오늘 날짜로 초기화
// ========================================

function initializeDateInput() {
  if (dateInput) {
    const today = new Date().toISOString().split('T')[0];
    dateInput.value = today;
  }
}

// ========================================
// 폼 제출 처리
// ========================================

async function handleFormSubmit(e) {
  e.preventDefault();
  
  const user = auth.currentUser;
  if (!user) {
    showMessage('로그인이 필요합니다.', 'error');
    window.location.href = '/';
    return;
  }
  
  try {
    // 폼 데이터 수집
    const healthData = {
      userId: user.uid,
      date: dateInput?.value || new Date().toISOString().split('T')[0],
      weight: weightInput?.value ? parseFloat(weightInput.value) : null,
      height: heightInput?.value ? parseFloat(heightInput.value) : null,
      sleep: sleepInput?.value ? parseFloat(sleepInput.value) : null,
      exercise: exerciseInput?.value ? parseInt(exerciseInput.value) : null,
      water: waterInput?.value ? parseFloat(waterInput.value) : null,
      mood: moodInput?.value ? parseInt(moodInput.value) : null,
      stress: stressInput?.value ? parseInt(stressInput.value) : null,
      notes: notesInput?.value || '',
      createdAt: Timestamp.now()
    };
    
    // BMI 계산 (키와 체중이 있는 경우)
    if (healthData.height && healthData.weight) {
      const heightInMeters = healthData.height / 100;
      healthData.bmi = (healthData.weight / (heightInMeters * heightInMeters)).toFixed(1);
    }
    
    // Firestore에 저장 (향후 구현)
    console.log('저장할 데이터:', healthData);
    
    // 실제 Firestore 저장 코드 (주석 처리 - Firebase 설정 완료 후 활성화)
    // await addDoc(collection(db, 'healthData', user.uid, 'entries'), healthData);
    
    showMessage('건강 데이터가 저장되었습니다! ✅', 'success');
    
    // 폼 초기화
    healthDataForm?.reset();
    initializeDateInput();
    
    // 최근 데이터 다시 로드
    await loadRecentData(user.uid);
    
  } catch (error) {
    console.error('데이터 저장 오류:', error);
    showMessage('데이터 저장 중 오류가 발생했습니다.', 'error');
  }
}

// ========================================
// 최근 데이터 불러오기 (향후 구현)
// ========================================

async function loadRecentData(userId) {
  try {
    // Firestore 쿼리 (향후 구현)
    // const q = query(
    //   collection(db, 'healthData', userId, 'entries'),
    //   orderBy('date', 'desc'),
    //   limit(5)
    // );
    
    // const querySnapshot = await getDocs(q);
    // const data = querySnapshot.docs.map(doc => ({
    //   id: doc.id,
    //   ...doc.data()
    // }));
    
    // 임시 데이터 (테스트용)
    const data = [
      { date: '2025-11-17', weight: 62.5, sleep: 7.5, exercise: 30 },
      { date: '2025-11-16', weight: 62.3, sleep: 8.0, exercise: 45 },
      { date: '2025-11-15', weight: 62.8, sleep: 6.5, exercise: 20 }
    ];
    
    if (data.length > 0) {
      renderRecentData(data);
      recentDataSection?.classList.remove('hidden');
    }
  } catch (error) {
    console.error('최근 데이터 불러오기 오류:', error);
  }
}

// ========================================
// 최근 데이터 렌더링
// ========================================

function renderRecentData(data) {
  if (!recentDataList) return;
  
  recentDataList.innerHTML = data.map(item => `
    <div class="recent-data-item">
      <div>
        <div class="recent-data-date">${item.date}</div>
        <div class="recent-data-info">
          ${item.weight ? `체중: ${item.weight}kg` : ''} 
          ${item.sleep ? `· 수면: ${item.sleep}h` : ''} 
          ${item.exercise ? `· 운동: ${item.exercise}분` : ''}
        </div>
      </div>
    </div>
  `).join('');
}

// ========================================
// 메시지 표시
// ========================================

function showMessage(message, type = 'info') {
  const messageEl = document.createElement('div');
  messageEl.className = `message message-${type}`;
  messageEl.textContent = message;
  
  const container = document.querySelector('.main-container');
  if (container) {
    container.appendChild(messageEl);
    setTimeout(() => messageEl.remove(), 3000);
  }
}

// ========================================
// 페이지 이동
// ========================================

function goToHome() {
  window.location.href = '/';
}

// ========================================
// 인증 상태 관찰
// ========================================

onAuthStateChanged(auth, async (user) => {
  if (user) {
    console.log('사용자 로그인 확인:', user.displayName);
    showUserInfo(user);
    initializeDateInput();
    await loadRecentData(user.uid);
  } else {
    console.log('로그인되지 않음 - 메인으로 이동');
    window.location.href = '/';
  }
});

// ========================================
// 이벤트 리스너
// ========================================

// 폼 제출
healthDataForm?.addEventListener('submit', handleFormSubmit);

// 홈으로 이동
backBtn?.addEventListener('click', goToHome);

// 입력 검증
weightInput?.addEventListener('input', (e) => {
  if (e.target.value < 0) e.target.value = 0;
  if (e.target.value > 200) e.target.value = 200;
});

heightInput?.addEventListener('input', (e) => {
  if (e.target.value < 0) e.target.value = 0;
  if (e.target.value > 250) e.target.value = 250;
});

sleepInput?.addEventListener('input', (e) => {
  if (e.target.value < 0) e.target.value = 0;
  if (e.target.value > 24) e.target.value = 24;
});

exerciseInput?.addEventListener('input', (e) => {
  if (e.target.value < 0) e.target.value = 0;
  if (e.target.value > 600) e.target.value = 600;
});

waterInput?.addEventListener('input', (e) => {
  if (e.target.value < 0) e.target.value = 0;
  if (e.target.value > 20) e.target.value = 20;
});

console.log('대시보드 페이지 초기화 완료');

