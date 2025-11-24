// ========================================
// 건강 리포트 페이지 로직
// ========================================

import { initializeApp } from 'firebase/app';
import { getAuth, onAuthStateChanged } from 'firebase/auth';
import { getFirestore, collection, query, where, orderBy, limit, getDocs } from 'firebase/firestore';
import { firebaseConfig } from './firebaseConfig.js';

// Firebase 초기화
const app = initializeApp(firebaseConfig);
const auth = getAuth(app);
const db = getFirestore(app);

// DOM 요소
const userInfo = document.getElementById('userInfo');
const userName = document.getElementById('userName');
const userAvatar = document.getElementById('userAvatar');
const periodSelect = document.getElementById('periodSelect');
const backBtn = document.getElementById('backBtn');
const downloadPdfBtn = document.getElementById('downloadPdfBtn');
const loadingSection = document.getElementById('loadingSection');

// 통계 요소
const avgWeight = document.getElementById('avgWeight');
const avgSleep = document.getElementById('avgSleep');
const totalExercise = document.getElementById('totalExercise');
const avgWater = document.getElementById('avgWater');

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
// 건강 데이터 불러오기 (향후 구현)
// ========================================

async function loadHealthData(userId, days = 7) {
  try {
    loadingSection?.classList.remove('hidden');
    
    // 날짜 계산
    const endDate = new Date();
    const startDate = new Date();
    startDate.setDate(startDate.getDate() - days);
    
    // Firestore 쿼리 (향후 구현)
    // const q = query(
    //   collection(db, 'healthData', userId, 'entries'),
    //   where('date', '>=', startDate),
    //   where('date', '<=', endDate),
    //   orderBy('date', 'desc')
    // );
    
    // const querySnapshot = await getDocs(q);
    // const data = querySnapshot.docs.map(doc => ({
    //   id: doc.id,
    //   ...doc.data()
    // }));
    
    // 임시 데이터 (테스트용)
    const data = generateSampleData(days);
    
    // 통계 계산
    calculateStats(data);
    
    // 차트 렌더링 (향후 Chart.js 구현)
    // renderChart(data);
    
    loadingSection?.classList.add('hidden');
    
    return data;
  } catch (error) {
    console.error('데이터 불러오기 오류:', error);
    loadingSection?.classList.add('hidden');
    showMessage('데이터를 불러오는 중 오류가 발생했습니다.', 'error');
    return [];
  }
}

// ========================================
// 샘플 데이터 생성 (테스트용)
// ========================================

function generateSampleData(days) {
  const data = [];
  const today = new Date();
  
  for (let i = 0; i < days; i++) {
    const date = new Date(today);
    date.setDate(date.getDate() - i);
    
    data.push({
      date: date.toISOString().split('T')[0],
      weight: 60 + Math.random() * 5,
      sleep: 6 + Math.random() * 3,
      exercise: Math.floor(Math.random() * 60),
      water: 6 + Math.random() * 4,
      mood: Math.floor(1 + Math.random() * 5),
      stress: Math.floor(1 + Math.random() * 4)
    });
  }
  
  return data;
}

// ========================================
// 통계 계산
// ========================================

function calculateStats(data) {
  if (!data || data.length === 0) {
    if (avgWeight) avgWeight.textContent = '--';
    if (avgSleep) avgSleep.textContent = '--';
    if (totalExercise) totalExercise.textContent = '--';
    if (avgWater) avgWater.textContent = '--';
    return;
  }
  
  // 평균 계산
  const weights = data.filter(d => d.weight).map(d => d.weight);
  const sleeps = data.filter(d => d.sleep).map(d => d.sleep);
  const exercises = data.filter(d => d.exercise).map(d => d.exercise);
  const waters = data.filter(d => d.water).map(d => d.water);
  
  // 평균 체중
  if (weights.length > 0 && avgWeight) {
    const avg = weights.reduce((a, b) => a + b, 0) / weights.length;
    avgWeight.textContent = `${avg.toFixed(1)} kg`;
  }
  
  // 평균 수면
  if (sleeps.length > 0 && avgSleep) {
    const avg = sleeps.reduce((a, b) => a + b, 0) / sleeps.length;
    avgSleep.textContent = `${avg.toFixed(1)} 시간`;
  }
  
  // 총 운동 시간
  if (exercises.length > 0 && totalExercise) {
    const total = exercises.reduce((a, b) => a + b, 0);
    const hours = Math.floor(total / 60);
    const minutes = Math.floor(total % 60);
    totalExercise.textContent = hours > 0 ? `${hours}시간 ${minutes}분` : `${minutes}분`;
  }
  
  // 평균 수분 섭취
  if (waters.length > 0 && avgWater) {
    const avg = waters.reduce((a, b) => a + b, 0) / waters.length;
    avgWater.textContent = `${avg.toFixed(1)} 컵`;
  }
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
// PDF 다운로드 (향후 구현)
// ========================================

async function downloadPDF() {
  try {
    // html2pdf.js를 사용한 PDF 생성 (향후 구현)
    showMessage('PDF 다운로드 기능은 향후 구현 예정입니다.', 'info');
    
    // 예시 코드:
    // const element = document.querySelector('.main-container');
    // const opt = {
    //   margin: 1,
    //   filename: `건강리포트_${new Date().toISOString().split('T')[0]}.pdf`,
    //   image: { type: 'jpeg', quality: 0.98 },
    //   html2canvas: { scale: 2 },
    //   jsPDF: { unit: 'in', format: 'letter', orientation: 'portrait' }
    // };
    // await html2pdf().set(opt).from(element).save();
  } catch (error) {
    console.error('PDF 다운로드 오류:', error);
    showMessage('PDF 다운로드 중 오류가 발생했습니다.', 'error');
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
    
    // 기본 7일 데이터 로드
    await loadHealthData(user.uid, 7);
  } else {
    console.log('로그인되지 않음 - 메인으로 이동');
    window.location.href = '/';
  }
});

// ========================================
// 이벤트 리스너
// ========================================

// 기간 변경
periodSelect?.addEventListener('change', async (e) => {
  const user = auth.currentUser;
  if (user) {
    const days = parseInt(e.target.value);
    await loadHealthData(user.uid, days);
  }
});

// 홈으로 이동
backBtn?.addEventListener('click', goToHome);

// PDF 다운로드
downloadPdfBtn?.addEventListener('click', downloadPDF);

console.log('건강 리포트 페이지 초기화 완료');
