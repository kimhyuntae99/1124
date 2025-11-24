// ========================================
// My Health Report - 메인 애플리케이션
// Firebase 연동 전 로컬 스토리지 버전
// ========================================

import Chart from 'chart.js/auto';
import html2pdf from 'html2pdf.js';

// ========================================
// 전역 변수
// ========================================

let healthData = JSON.parse(localStorage.getItem('healthData')) || [];
let currentChart = null;
let userName = localStorage.getItem('userName') || '';

// OpenAI API 설정
const OPENAI_API_KEY = import.meta.env.VITE_OPENAI_API_KEY;
const OPENAI_API_URL = 'https://api.openai.com/v1/chat/completions';
let conversationHistory = [];

// ========================================
// DOM 요소
// ========================================

// 탭 관련
const tabButtons = document.querySelectorAll('.tab-button');
const tabContents = document.querySelectorAll('.tab-content');

// 건강 데이터 입력 폼
const healthDataForm = document.getElementById('healthDataForm');
const nameInput = document.getElementById('nameInput');
const dateInput = document.getElementById('dateInput');
const weightInput = document.getElementById('weightInput');
const heightInput = document.getElementById('heightInput');
const sleepInput = document.getElementById('sleepInput');
const exerciseInput = document.getElementById('exerciseInput');
const stepsInput = document.getElementById('stepsInput');
const waterInput = document.getElementById('waterInput');
const moodInput = document.getElementById('moodInput');
const stressInput = document.getElementById('stressInput');
const notesInput = document.getElementById('notesInput');

// 차트 및 통계
const periodSelect = document.getElementById('periodSelect');
const avgWeight = document.getElementById('avgWeight');
const avgSleep = document.getElementById('avgSleep');
const totalExercise = document.getElementById('totalExercise');
const avgSteps = document.getElementById('avgSteps');
const avgWater = document.getElementById('avgWater');
const healthChart = document.getElementById('healthChart');
const recentDataList = document.getElementById('recentDataList');
const healthAdviceContainer = document.getElementById('healthAdviceContainer');

// 챗봇
const chatMessages = document.getElementById('chatMessages');
const chatForm = document.getElementById('chatForm');
const chatInput = document.getElementById('chatInput');

// 템플릿 업로드
const downloadTemplateBtn = document.getElementById('downloadTemplateBtn');
const uploadTemplateBtn = document.getElementById('uploadTemplateBtn');
const templateFileInput = document.getElementById('templateFileInput');

// ========================================
// 초기화
// ========================================

function init() {
  // 오늘 날짜 설정
  const today = new Date().toISOString().split('T')[0];
  if (dateInput) dateInput.value = today;
  
  // 저장된 이름 불러오기
  if (nameInput && userName) {
    nameInput.value = userName;
  }
  
  // 이벤트 리스너 등록
  setupEventListeners();
  
  // 저장된 데이터가 있으면 차트 업데이트
  if (healthData.length > 0) {
    updateStatistics(7);
    updateChart(7);
    updateRecentDataList();
  }
  
  console.log('My Health Report 초기화 완료');
  console.log('저장된 데이터:', healthData.length, '개');
}

// ========================================
// 이벤트 리스너 설정
// ========================================

function setupEventListeners() {
  // 탭 전환
  tabButtons.forEach(button => {
    button.addEventListener('click', () => switchTab(button.dataset.tab));
  });
  
  // 건강 데이터 폼 제출
  healthDataForm?.addEventListener('submit', handleFormSubmit);
  
  // 기간 선택 변경
  periodSelect?.addEventListener('change', (e) => {
    const value = e.target.value;
    const days = value === 'all' ? 'all' : parseInt(value);
    updateStatistics(days);
    updateChart(days);
    updateHealthAdvice(days);
  });
  
  // 템플릿 다운로드
  downloadTemplateBtn?.addEventListener('click', downloadTemplate);
  
  // 템플릿 업로드
  uploadTemplateBtn?.addEventListener('click', () => templateFileInput?.click());
  templateFileInput?.addEventListener('change', handleTemplateUpload);
  
  // 챗봇
  chatForm?.addEventListener('submit', handleChatSubmit);
  
  // 입력 검증
  sleepInput?.addEventListener('input', (e) => validateInput(e, 0, 24));
  exerciseInput?.addEventListener('input', (e) => validateInput(e, 0, 600));
  stepsInput?.addEventListener('input', (e) => validateInput(e, 0, 50000));
  waterInput?.addEventListener('input', (e) => validateInput(e, 0, 20));
}

// ========================================
// 탭 전환
// ========================================

function switchTab(tabName) {
  // 모든 탭 비활성화
  tabButtons.forEach(btn => {
    btn.classList.remove('active');
    btn.setAttribute('aria-selected', 'false');
  });
  
  tabContents.forEach(content => {
    content.classList.remove('active');
  });
  
  // 선택된 탭 활성화
  const selectedButton = document.querySelector(`[data-tab="${tabName}"]`);
  const selectedContent = document.getElementById(`${tabName}Tab`);
  
  if (selectedButton && selectedContent) {
    selectedButton.classList.add('active');
    selectedButton.setAttribute('aria-selected', 'true');
    selectedContent.classList.add('active');
    
    // 차트 탭으로 전환 시 차트 업데이트
    if (tabName === 'chart') {
      const days = parseInt(periodSelect?.value || 7);
      updateStatistics(days);
      updateChart(days);
      updateRecentDataList();
      updateHealthAdvice(days);
    }
  }
}

// ========================================
// 입력 검증
// ========================================

function validateInput(e, min, max) {
  const value = parseFloat(e.target.value);
  if (value < min) e.target.value = min;
  if (value > max) e.target.value = max;
}

// ========================================
// 건강 데이터 저장
// ========================================

function handleFormSubmit(e) {
  e.preventDefault();
  
  // 이름 저장
  if (nameInput?.value) {
    userName = nameInput.value;
    localStorage.setItem('userName', userName);
  }
  
  const newData = {
    id: Date.now(),
    name: nameInput?.value || userName || '사용자',
    date: dateInput.value,
    weight: weightInput.value ? parseFloat(weightInput.value) : null,
    height: heightInput.value ? parseFloat(heightInput.value) : null,
    sleep: sleepInput.value ? parseFloat(sleepInput.value) : null,
    exercise: exerciseInput.value ? parseInt(exerciseInput.value) : null,
    steps: stepsInput.value ? parseInt(stepsInput.value) : null,
    water: waterInput.value ? parseFloat(waterInput.value) : null,
    mood: moodInput.value ? parseInt(moodInput.value) : null,
    stress: stressInput.value ? parseInt(stressInput.value) : null,
    notes: notesInput.value || '',
    createdAt: new Date().toISOString()
  };
  
  // BMI 계산
  if (newData.height && newData.weight) {
    const heightInMeters = newData.height / 100;
    newData.bmi = parseFloat((newData.weight / (heightInMeters * heightInMeters)).toFixed(1));
  }
  
  // 데이터 저장
  healthData.unshift(newData);
  localStorage.setItem('healthData', JSON.stringify(healthData));
  
  // 성공 메시지
  showMessage('건강 데이터가 저장되었습니다! ✅', 'success');
  
  // 건강 조언 업데이트
  updateHealthAdvice(7);
  
  // 폼 초기화 (이름과 날짜는 유지)
  const currentName = nameInput?.value;
  healthDataForm.reset();
  if (nameInput) nameInput.value = currentName;
  const today = new Date().toISOString().split('T')[0];
  dateInput.value = today;
  
  console.log('데이터 저장 완료:', newData);
}

// ========================================
// 통계 계산 및 업데이트
// ========================================

function updateStatistics(days) {
  const filteredData = getFilteredData(days);
  
  // 통계 섹션 제목 업데이트 (옵션)
  const periodText = days === 'all' ? '전체 기간' : `최근 ${days}일`;
  
  if (filteredData.length === 0) {
    if (avgWeight) avgWeight.textContent = '--';
    if (avgSleep) avgSleep.textContent = '--';
    if (totalExercise) totalExercise.textContent = '--';
    if (avgSteps) avgSteps.textContent = '--';
    if (avgWater) avgWater.textContent = '--';
    return;
  }
  
  // 평균 체중
  const weights = filteredData.filter(d => d.weight).map(d => d.weight);
  if (weights.length > 0 && avgWeight) {
    const avg = weights.reduce((a, b) => a + b, 0) / weights.length;
    avgWeight.textContent = `${avg.toFixed(1)} kg`;
  }
  
  // 평균 수면
  const sleeps = filteredData.filter(d => d.sleep).map(d => d.sleep);
  if (sleeps.length > 0 && avgSleep) {
    const avg = sleeps.reduce((a, b) => a + b, 0) / sleeps.length;
    avgSleep.textContent = `${avg.toFixed(1)}시간`;
  }
  
  // 총 운동 시간
  const exercises = filteredData.filter(d => d.exercise).map(d => d.exercise);
  if (exercises.length > 0 && totalExercise) {
    const total = exercises.reduce((a, b) => a + b, 0);
    const hours = Math.floor(total / 60);
    const minutes = total % 60;
    totalExercise.textContent = hours > 0 ? `${hours}시간 ${minutes}분` : `${minutes}분`;
  }
  
  // 평균 걸음 수
  const steps = filteredData.filter(d => d.steps).map(d => d.steps);
  if (steps.length > 0 && avgSteps) {
    const avg = Math.round(steps.reduce((a, b) => a + b, 0) / steps.length);
    avgSteps.textContent = avg.toLocaleString();
  }
  
  // 평균 수분 섭취
  const waters = filteredData.filter(d => d.water).map(d => d.water);
  if (waters.length > 0 && avgWater) {
    const avg = waters.reduce((a, b) => a + b, 0) / waters.length;
    avgWater.textContent = `${avg.toFixed(1)}컵`;
  }
}

// ========================================
// 차트 업데이트
// ========================================

function updateChart(days) {
  if (!healthChart) return;
  
  let filteredData = getFilteredData(days);
  
  if (filteredData.length === 0) {
    if (currentChart) {
      currentChart.destroy();
      currentChart = null;
    }
    return;
  }
  
  // 기술통계 계산 (평균, 최소, 최대, 중앙값)
  const calculateStats = (data) => {
    const validData = data.filter(v => v !== null && v !== undefined && !isNaN(v));
    if (validData.length === 0) return { avg: 0, min: 0, max: 0, median: 0 };
    
    const avg = validData.reduce((a, b) => a + b, 0) / validData.length;
    const min = Math.min(...validData);
    const max = Math.max(...validData);
    
    const sorted = [...validData].sort((a, b) => a - b);
    const mid = Math.floor(sorted.length / 2);
    const median = sorted.length % 2 === 0 ? (sorted[mid - 1] + sorted[mid]) / 2 : sorted[mid];
    
    return { avg, min, max, median };
  };
  
  // 각 지표별 데이터 추출
  const weightValues = filteredData.map(d => d.weight).filter(v => v);
  const sleepValues = filteredData.map(d => d.sleep).filter(v => v);
  const exerciseValues = filteredData.map(d => d.exercise).filter(v => v);
  const waterValues = filteredData.map(d => d.water).filter(v => v);
  
  // 기술통계 계산
  const weightStats = calculateStats(weightValues);
  const sleepStats = calculateStats(sleepValues);
  const exerciseStats = calculateStats(exerciseValues);
  const waterStats = calculateStats(waterValues);
  
  // 기존 차트 제거
  if (currentChart) {
    currentChart.destroy();
  }
  
  // 새 차트 생성 - 막대그래프로 기술통계 시각화
  currentChart = new Chart(healthChart, {
    type: 'bar',
    data: {
      labels: ['체중 (kg)', '수면 (시간)', '운동 (분)', '수분 (컵)'],
      datasets: [
        {
          label: '평균',
          data: [
            weightStats.avg.toFixed(1),
            sleepStats.avg.toFixed(1),
            exerciseStats.avg.toFixed(1),
            waterStats.avg.toFixed(1)
          ],
          backgroundColor: 'rgba(168, 213, 186, 0.8)',
          borderColor: '#a8d5ba',
          borderWidth: 2
        },
        {
          label: '최소',
          data: [
            weightStats.min.toFixed(1),
            sleepStats.min.toFixed(1),
            exerciseStats.min.toFixed(1),
            waterStats.min.toFixed(1)
          ],
          backgroundColor: 'rgba(255, 228, 214, 0.8)',
          borderColor: '#ffe4d6',
          borderWidth: 2
        },
        {
          label: '최대',
          data: [
            weightStats.max.toFixed(1),
            sleepStats.max.toFixed(1),
            exerciseStats.max.toFixed(1),
            waterStats.max.toFixed(1)
          ],
          backgroundColor: 'rgba(200, 230, 201, 0.8)',
          borderColor: '#c8e6c9',
          borderWidth: 2
        },
        {
          label: '중앙값',
          data: [
            weightStats.median.toFixed(1),
            sleepStats.median.toFixed(1),
            exerciseStats.median.toFixed(1),
            waterStats.median.toFixed(1)
          ],
          backgroundColor: 'rgba(77, 184, 255, 0.8)',
          borderColor: '#4db8ff',
          borderWidth: 2
        }
      ]
    },
    options: {
      responsive: true,
      maintainAspectRatio: true,
      interaction: {
        mode: 'index',
        intersect: false
      },
      plugins: {
        legend: {
          display: true,
          position: 'top',
          labels: {
            font: {
              family: "'Noto Sans KR', sans-serif",
              size: 11
            },
            color: '#4a5a4a',
            usePointStyle: true,
            padding: 10,
            boxWidth: 6,
            boxHeight: 6
          }
        },
        tooltip: {
          backgroundColor: 'rgba(255, 255, 255, 0.95)',
          titleColor: '#4a5a4a',
          bodyColor: '#6b7b6b',
          borderColor: '#d4e8d4',
          borderWidth: 1,
          padding: 12,
          bodyFont: {
            family: "'Noto Sans KR', sans-serif"
          },
          titleFont: {
            family: "'Noto Sans KR', sans-serif",
            weight: 'bold'
          },
          callbacks: {
            label: function(context) {
              const label = context.dataset.label || '';
              const value = context.parsed.y;
              return `${label}: ${value}`;
            }
          }
        },
        title: {
          display: true,
          text: '건강 지표 기술통계 (평균, 최소, 최대, 중앙값)',
          font: {
            family: "'Noto Sans KR', sans-serif",
            size: 14,
            weight: 'bold'
          },
          color: '#4a5a4a',
          padding: {
            top: 10,
            bottom: 20
          }
        }
      },
      scales: {
        y: {
          type: 'linear',
          display: true,
          beginAtZero: true,
          position: 'left',
          title: {
            display: true,
            text: '값',
            font: {
              family: "'Noto Sans KR', sans-serif",
              size: 11
            },
            color: '#4a5a4a'
          },
          grid: {
            color: 'rgba(212, 232, 212, 0.3)'
          },
          ticks: {
            font: {
              family: "'Noto Sans KR', sans-serif",
              size: 10
            },
            color: '#6b7b6b'
          }
        },
        x: {
          type: 'category',
          title: {
            display: true,
            text: '건강 지표',
            font: {
              family: "'Noto Sans KR', sans-serif",
              size: 11
            },
            color: '#4a5a4a'
          },
          grid: {
            display: false
          },
          ticks: {
            font: {
              family: "'Noto Sans KR', sans-serif",
              size: 10
            },
            color: '#6b7b6b'
          }
        }
      }
    }
  });
}

// ========================================
// 최근 데이터 목록 업데이트
// ========================================

function updateRecentDataList() {
  if (!recentDataList) return;
  
  const recentData = healthData.slice(0, 10);
  
  if (recentData.length === 0) {
    recentDataList.innerHTML = '<p class="message message-info">아직 저장된 데이터가 없습니다.</p>';
    return;
  }
  
  recentDataList.innerHTML = recentData.map(item => {
    const parts = [];
    if (item.weight) parts.push(`체중: ${item.weight}kg`);
    if (item.sleep) parts.push(`수면: ${item.sleep}h`);
    if (item.exercise) parts.push(`운동: ${item.exercise}분`);
    if (item.steps) parts.push(`걸음: ${item.steps.toLocaleString()}`);
    if (item.water) parts.push(`수분: ${item.water}컵`);
    
    const moodEmoji = item.mood ? ['😢', '😟', '😐', '🙂', '😄'][item.mood - 1] : '';
    
    return `
      <div class="recent-data-item">
        <div>
          <div class="recent-data-date">${item.date} ${moodEmoji}</div>
          <div class="recent-data-info">${parts.join(' · ') || '데이터 없음'}</div>
          ${item.notes ? `<div class="recent-data-notes">${item.notes}</div>` : ''}
        </div>
      </div>
    `;
  }).join('');
}

// ========================================
// 기간 필터링
// ========================================

function getFilteredData(days) {
  // '전체' 옵션인 경우 모든 데이터 반환
  if (days === 'all' || days === Infinity) {
    return healthData;
  }
  
  const endDate = new Date();
  const startDate = new Date();
  startDate.setDate(startDate.getDate() - days);
  
  return healthData.filter(item => {
    const itemDate = new Date(item.date);
    return itemDate >= startDate && itemDate <= endDate;
  });
}

// ========================================
// 맞춤형 건강 조언 업데이트
// ========================================

function updateHealthAdvice(days) {
  if (!healthAdviceContainer) return;
  
  const filteredData = getFilteredData(days);
  
  if (filteredData.length === 0) {
    healthAdviceContainer.innerHTML = '<p class="health-advice-placeholder">데이터를 입력하면 맞춤형 건강 조언을 확인할 수 있습니다.</p>';
    return;
  }
  
  const advices = [];
  
  // 체중 분석
  const weights = filteredData.filter(d => d.weight).map(d => d.weight);
  if (weights.length > 0) {
    const avgWeight = weights.reduce((a, b) => a + b, 0) / weights.length;
    const trend = weights.length > 1 ? weights[weights.length - 1] - weights[0] : 0;
    
    if (trend > 2) {
      advices.push({
        icon: '⚠️',
        title: '체중 증가 경향',
        message: `최근 체중이 ${trend.toFixed(1)}kg 증가했습니다. 균형 잡힌 식사와 규칙적인 운동을 고려해보세요.`,
        type: 'warning'
      });
    } else if (trend < -2) {
      advices.push({
        icon: '⚠️',
        title: '체중 감소 경향',
        message: `최근 체중이 ${Math.abs(trend).toFixed(1)}kg 감소했습니다. 충분한 영양 섭취를 확인해주세요.`,
        type: 'warning'
      });
    } else {
      advices.push({
        icon: '✅',
        title: '안정적인 체중',
        message: '체중이 안정적으로 유지되고 있습니다. 현재의 생활 패턴을 계속 유지하세요!',
        type: 'success'
      });
    }
  }
  
  // 수면 분석
  const sleeps = filteredData.filter(d => d.sleep).map(d => d.sleep);
  if (sleeps.length > 0) {
    const avgSleep = sleeps.reduce((a, b) => a + b, 0) / sleeps.length;
    
    if (avgSleep < 7) {
      advices.push({
        icon: '😴',
        title: '수면 부족',
        message: `평균 수면 시간이 ${avgSleep.toFixed(1)}시간입니다. 중고등학생은 8-10시간의 수면이 필요합니다. 규칙적인 수면 시간을 만들어보세요.`,
        type: 'warning'
      });
    } else if (avgSleep >= 8 && avgSleep <= 10) {
      advices.push({
        icon: '✅',
        title: '충분한 수면',
        message: `평균 ${avgSleep.toFixed(1)}시간의 충분한 수면을 취하고 있습니다. 훌륙해요!`,
        type: 'success'
      });
    } else if (avgSleep > 10) {
      advices.push({
        icon: '💡',
        title: '과도한 수면',
        message: `평균 수면 시간이 ${avgSleep.toFixed(1)}시간으로 많습니다. 피로가 축적된 것일 수 있으니 컸디션을 확인해보세요.`,
        type: 'info'
      });
    }
  }
  
  // 운동 분석
  const exercises = filteredData.filter(d => d.exercise).map(d => d.exercise);
  if (exercises.length > 0) {
    const avgExercise = exercises.reduce((a, b) => a + b, 0) / exercises.length;
    
    if (avgExercise < 30) {
      advices.push({
        icon: '💪',
        title: '운동 부족',
        message: `하루 평균 ${avgExercise.toFixed(0)}분 운동 중입니다. 하루 30분 이상 운동을 권장합니다. 간단한 산책이나 줄넘기부터 시작해보세요!`,
        type: 'warning'
      });
    } else {
      advices.push({
        icon: '✅',
        title: '규칙적인 운동',
        message: `하루 평균 ${avgExercise.toFixed(0)}분 운동을 하고 있습니다. 훌릉한 습관이에요!`,
        type: 'success'
      });
    }
  }
  
  // 걸음 수 분석
  const steps = filteredData.filter(d => d.steps).map(d => d.steps);
  if (steps.length > 0) {
    const avgSteps = steps.reduce((a, b) => a + b, 0) / steps.length;
    
    if (avgSteps < 8000) {
      advices.push({
        icon: '👟',
        title: '활동량 부족',
        message: `하루 평균 ${Math.round(avgSteps).toLocaleString()}보 걷고 있습니다. 10,000보를 목표로 설정해보세요. 계단 이용, 걸어서 통학하기 등이 도움됩니다.`,
        type: 'warning'
      });
    } else {
      advices.push({
        icon: '✅',
        title: '충분한 활동량',
        message: `하루 평균 ${Math.round(avgSteps).toLocaleString()}보를 걷고 있습니다. 훌룍해요!`,
        type: 'success'
      });
    }
  }
  
  // 수분 섭취 분석
  const waters = filteredData.filter(d => d.water).map(d => d.water);
  if (waters.length > 0) {
    const avgWater = waters.reduce((a, b) => a + b, 0) / waters.length;
    
    if (avgWater < 6) {
      advices.push({
        icon: '💧',
        title: '수분 섭취 부족',
        message: `하루 평균 ${avgWater.toFixed(1)}컵(약 ${(avgWater * 200).toFixed(0)}ml)의 물을 마시고 있습니다. 하루 8컵(1.5-2L) 이상을 권장합니다.`,
        type: 'warning'
      });
    } else {
      advices.push({
        icon: '✅',
        title: '충분한 수분 섭취',
        message: `하루 평균 ${avgWater.toFixed(1)}컵의 물을 마시고 있습니다. 좋은 습관이에요!`,
        type: 'success'
      });
    }
  }
  
  // 스트레스 분석
  const stresses = filteredData.filter(d => d.stress).map(d => d.stress);
  if (stresses.length > 0) {
    const avgStress = stresses.reduce((a, b) => a + b, 0) / stresses.length;
    
    // 스트레스 변화 추이 분석
    const recentStress = stresses.slice(0, 3); // 최근 3개 데이터
    const oldStress = stresses.slice(3, 6); // 이전 3개 데이터
    let trendMessage = '';
    
    if (recentStress.length >= 2 && oldStress.length >= 2) {
      const recentAvg = recentStress.reduce((a, b) => a + b, 0) / recentStress.length;
      const oldAvg = oldStress.reduce((a, b) => a + b, 0) / oldStress.length;
      
      if (recentAvg > oldAvg + 0.5) {
        trendMessage = ' 최근 스트레스가 증가하는 추세입니다.';
      } else if (recentAvg < oldAvg - 0.5) {
        trendMessage = ' 스트레스가 감소하는 긍정적인 추세입니다!';
      }
    }
    
    if (avgStress >= 3.5) {
      advices.push({
        icon: '🚨',
        title: '높은 스트레스 - 즉시 관리 필요',
        message: `평균 스트레스 수준이 매우 높습니다(${avgStress.toFixed(1)}/4).${trendMessage} 다음을 시도해보세요:\n• 즉시: 5분 심호흡 (4초 들이쉬기, 7초 참기, 8초 내쉬기)\n• 매일: 20분 이상 산책이나 가벼운 운동\n• 전문가 상담 고려 (학교 상담교사, 부모님과 대화)\n• 충분한 수면과 휴식 우선순위`,
        type: 'error'
      });
    } else if (avgStress >= 2.5) {
      advices.push({
        icon: '🧘',
        title: '스트레스 관리 필요',
        message: `스트레스 수준이 높은 편입니다(${avgStress.toFixed(1)}/4).${trendMessage} 관리 방법:\n• 하루 10분 명상이나 요가\n• 좋아하는 취미 활동 시간 확보\n• 친구나 가족과 대화하기\n• 규칙적인 운동으로 스트레스 해소\n• 충분한 수면 (8-10시간)`,
        type: 'warning'
      });
    } else if (avgStress >= 1.5) {
      advices.push({
        icon: '💆',
        title: '스트레스 주의',
        message: `스트레스가 보통 수준입니다(${avgStress.toFixed(1)}/4).${trendMessage} 예방적 관리:\n• 규칙적인 운동 습관 유지\n• 충분한 휴식과 여가 시간\n• 스트레칭으로 긴장 이완\n• 긍정적인 생각과 감사 일기`,
        type: 'info'
      });
    } else {
      advices.push({
        icon: '😌',
        title: '스트레스 관리 우수',
        message: `스트레스를 잘 관리하고 있습니다(${avgStress.toFixed(1)}/4).${trendMessage} 현재의 좋은 습관을 계속 유지하세요! 스트레스가 낮은 상태를 유지하는 것은 정신 건강과 학업 성취에 큰 도움이 됩니다.`,
        type: 'success'
      });
    }
  }
  
  // 종합 조언
  const successCount = advices.filter(a => a.type === 'success').length;
  const warningCount = advices.filter(a => a.type === 'warning').length;
  
  if (successCount > warningCount && successCount > 0) {
    advices.unshift({
      icon: '🎉',
      title: '훌룍한 건강 관리!',
      message: '대부분의 건강 지표가 양호합니다. 현재의 좋은 습관을 계속 유지하세요!',
      type: 'success'
    });
  }
  
  // HTML 생성
  if (advices.length === 0) {
    healthAdviceContainer.innerHTML = '<p class="health-advice-placeholder">충분한 데이터가 없어 조언을 생성할 수 없습니다. 더 많은 데이터를 입력해주세요.</p>';
  } else {
    healthAdviceContainer.innerHTML = advices.map(advice => `
      <div class="advice-card advice-${advice.type}">
        <div class="advice-icon">${advice.icon}</div>
        <div class="advice-content">
          <h4 class="advice-title">${advice.title}</h4>
          <p class="advice-message">${advice.message}</p>
        </div>
      </div>
    `).join('');
  }
}

// ========================================
// PDF 리포트 생성
// ========================================

async function generatePDFReport() {
  if (healthData.length === 0) {
    showMessage('저장된 건강 데이터가 없습니다. 먼저 데이터를 입력해주세요.', 'error');
    return;
  }
  
  showMessage('PDF 리포트를 생성하는 중...', 'info');
  
  try {
    const days = parseInt(periodSelect?.value || 7);
    const filteredData = getFilteredData(days);
    const currentUserName = userName || healthData[0]?.name || '사용자';
    const reportDate = new Date().toLocaleDateString('ko-KR');
    
    // PDF 컨텐츠 생성
    const pdfContent = document.createElement('div');
    pdfContent.style.padding = '40px';
    pdfContent.style.fontFamily = "'Noto Sans KR', sans-serif";
    pdfContent.style.backgroundColor = '#ffffff';
    pdfContent.style.width = '210mm';
    
    pdfContent.innerHTML = `
      <div style="text-align: center; margin-bottom: 40px;">
        <h1 style="color: #a8d5ba; font-size: 36px; margin-bottom: 10px;">🌿 건강 리포트</h1>
        <h2 style="color: #6b7b6b; font-size: 20px; font-weight: 400;">My Health Report</h2>
      </div>
      
      <div style="background: #f5f0e8; padding: 20px; border-radius: 15px; margin-bottom: 30px;">
        <div style="display: flex; justify-content: space-between; margin-bottom: 10px;">
          <div><strong>이름:</strong> ${currentUserName}</div>
          <div><strong>리포트 생성일:</strong> ${reportDate}</div>
        </div>
        <div><strong>분석 기간:</strong> ${days}일 (${filteredData.length}개 데이터)</div>
      </div>
      
      ${generateHealthSummaryHTML(filteredData)}
      ${generateChartImageHTML()}
      ${generateHealthTipsHTML(filteredData)}
      ${generateDetailedDataHTML(filteredData.slice(0, 5))}
    `;
    
    document.body.appendChild(pdfContent);
    
    // PDF 생성 옵션
    const options = {
      margin: [10, 10, 10, 10],
      filename: `건강리포트_${currentUserName}_${new Date().toISOString().split('T')[0]}.pdf`,
      image: { type: 'jpeg', quality: 0.98 },
      html2canvas: { 
        scale: 2,
        useCORS: true,
        logging: false
      },
      jsPDF: { 
        unit: 'mm', 
        format: 'a4', 
        orientation: 'portrait'
      }
    };
    
    // PDF 생성
    await html2pdf().set(options).from(pdfContent).save();
    
    // 임시 요소 제거
    document.body.removeChild(pdfContent);
    
    showMessage('PDF 리포트가 다운로드되었습니다! 📥', 'success');
    
  } catch (error) {
    console.error('PDF 생성 오류:', error);
    showMessage('PDF 생성 중 오류가 발생했습니다.', 'error');
  }
}

// 건강 요약 HTML 생성
function generateHealthSummaryHTML(data) {
  if (data.length === 0) return '<p>데이터가 없습니다.</p>';
  
  const weights = data.filter(d => d.weight).map(d => d.weight);
  const sleeps = data.filter(d => d.sleep).map(d => d.sleep);
  const exercises = data.filter(d => d.exercise).map(d => d.exercise);
  const steps = data.filter(d => d.steps).map(d => d.steps);
  const waters = data.filter(d => d.water).map(d => d.water);
  
  const avgWeight = weights.length > 0 ? (weights.reduce((a, b) => a + b, 0) / weights.length).toFixed(1) : '--';
  const avgSleep = sleeps.length > 0 ? (sleeps.reduce((a, b) => a + b, 0) / sleeps.length).toFixed(1) : '--';
  const totalExerciseMin = exercises.length > 0 ? exercises.reduce((a, b) => a + b, 0) : 0;
  const avgSteps = steps.length > 0 ? Math.round(steps.reduce((a, b) => a + b, 0) / steps.length) : '--';
  const avgWater = waters.length > 0 ? (waters.reduce((a, b) => a + b, 0) / waters.length).toFixed(1) : '--';
  
  return `
    <div style="margin-bottom: 30px;">
      <h3 style="color: #4a5a4a; border-bottom: 2px solid #a8d5ba; padding-bottom: 10px; margin-bottom: 20px;">
        📊 건강 지표 요약
      </h3>
      <div style="display: grid; grid-template-columns: repeat(2, 1fr); gap: 15px;">
        <div style="background: #fef9e7; padding: 15px; border-radius: 10px; border-left: 4px solid #a8d5ba;">
          <div style="color: #6b7b6b; font-size: 14px;">⚖️ 평균 체중</div>
          <div style="color: #4a5a4a; font-size: 24px; font-weight: bold;">${avgWeight} kg</div>
        </div>
        <div style="background: #fef9e7; padding: 15px; border-radius: 10px; border-left: 4px solid #c8e6c9;">
          <div style="color: #6b7b6b; font-size: 14px;">😴 평균 수면</div>
          <div style="color: #4a5a4a; font-size: 24px; font-weight: bold;">${avgSleep} 시간</div>
        </div>
        <div style="background: #fef9e7; padding: 15px; border-radius: 10px; border-left: 4px solid #ffe4d6;">
          <div style="color: #6b7b6b; font-size: 14px;">💪 총 운동</div>
          <div style="color: #4a5a4a; font-size: 24px; font-weight: bold;">${Math.floor(totalExerciseMin / 60)}시간 ${totalExerciseMin % 60}분</div>
        </div>
        <div style="background: #fef9e7; padding: 15px; border-radius: 10px; border-left: 4px solid #90c9a4;">
          <div style="color: #6b7b6b; font-size: 14px;">👟 평균 걸음</div>
          <div style="color: #4a5a4a; font-size: 24px; font-weight: bold;">${typeof avgSteps === 'number' ? avgSteps.toLocaleString() : avgSteps}</div>
        </div>
        <div style="background: #fef9e7; padding: 15px; border-radius: 10px; border-left: 4px solid #4db8ff;">
          <div style="color: #6b7b6b; font-size: 14px;">💧 평균 수분</div>
          <div style="color: #4a5a4a; font-size: 24px; font-weight: bold;">${avgWater} 컵</div>
        </div>
      </div>
    </div>
  `;
}

// 차트 이미지 HTML 생성
function generateChartImageHTML() {
  if (!currentChart) return '';
  
  try {
    const chartImage = currentChart.toBase64Image();
    return `
      <div style="margin-bottom: 30px; page-break-inside: avoid;">
        <h3 style="color: #4a5a4a; border-bottom: 2px solid #a8d5ba; padding-bottom: 10px; margin-bottom: 20px;">
          📈 건강 트렌드
        </h3>
        <div style="text-align: center;">
          <img src="${chartImage}" style="max-width: 100%; height: auto; border-radius: 10px;" />
        </div>
      </div>
    `;
  } catch (error) {
    console.error('차트 이미지 생성 오류:', error);
    return '';
  }
}

// 건강 팁 HTML 생성
function generateHealthTipsHTML(data) {
  const tips = [];
  
  if (data.length === 0) return '';
  
  // 수면 분석
  const sleeps = data.filter(d => d.sleep).map(d => d.sleep);
  if (sleeps.length > 0) {
    const avg = sleeps.reduce((a, b) => a + b, 0) / sleeps.length;
    if (avg < 7) {
      tips.push('😴 <strong>수면 부족:</strong> 중고등학생은 하루 8-10시간의 수면이 필요합니다. 규칙적인 수면 시간을 만들어보세요.');
    } else if (avg >= 8 && avg <= 10) {
      tips.push('✅ <strong>수면 충분:</strong> 적절한 수면 시간을 유지하고 있습니다. 훌륭해요!');
    }
  }
  
  // 운동 분석
  const exercises = data.filter(d => d.exercise).map(d => d.exercise);
  if (exercises.length > 0) {
    const avgDaily = exercises.reduce((a, b) => a + b, 0) / exercises.length;
    if (avgDaily < 30) {
      tips.push('💪 <strong>운동 권장:</strong> 하루 30분 이상의 운동을 권장합니다. 걷기, 줄넘기 등 간단한 운동부터 시작해보세요!');
    } else {
      tips.push('✅ <strong>운동 양호:</strong> 규칙적인 운동을 하고 있습니다. 계속 유지하세요!');
    }
  }
  
  // 걸음 수 분석
  const steps = data.filter(d => d.steps).map(d => d.steps);
  if (steps.length > 0) {
    const avg = steps.reduce((a, b) => a + b, 0) / steps.length;
    if (avg < 8000) {
      tips.push('👟 <strong>활동량 증가:</strong> 하루 10,000보를 목표로 설정해보세요. 계단 이용, 걸어서 통학 등이 도움됩니다.');
    } else {
      tips.push('✅ <strong>활동량 우수:</strong> 충분한 일일 활동량을 유지하고 있습니다!');
    }
  }
  
  // 스트레스 분석
  const stresses = data.filter(d => d.stress).map(d => d.stress);
  if (stresses.length > 0) {
    const avg = stresses.reduce((a, b) => a + b, 0) / stresses.length;
    if (avg >= 3) {
      tips.push('😰 <strong>스트레스 관리:</strong> 스트레스 수준이 높습니다. 명상, 심호흡, 취미 활동으로 스트레스를 관리하세요. 힘들 때는 주변에 도움을 요청하세요.');
    } else if (avg >= 2) {
      tips.push('🧘 <strong>스트레스 주의:</strong> 스트레스가 보통 수준입니다. 규칙적인 운동과 충분한 휴식으로 관리하세요.');
    } else {
      tips.push('✅ <strong>스트레스 양호:</strong> 스트레스를 잘 관리하고 있습니다. 계속 유지하세요!');
    }
  }
  
  // 일반 건강 팁
  tips.push('💧 <strong>수분 섭취:</strong> 하루 8잔(약 1.5-2L)의 물을 마시세요.');
  tips.push('🥗 <strong>영양 균형:</strong> 과일, 채소, 단백질을 골고루 섭취하세요.');
  tips.push('🌙 <strong>숙면 팁:</strong> 잠자기 1시간 전 전자기기 사용을 줄이고 편안한 환경을 만드세요.');
  
  return `
    <div style="margin-bottom: 30px; page-break-inside: avoid;">
      <h3 style="color: #4a5a4a; border-bottom: 2px solid #a8d5ba; padding-bottom: 10px; margin-bottom: 20px;">
        💡 맞춤형 건강 조언
      </h3>
      <div style="background: #f5f0e8; padding: 20px; border-radius: 10px;">
        ${tips.map(tip => `<p style="margin: 10px 0; line-height: 1.8;">${tip}</p>`).join('')}
      </div>
    </div>
  `;
}

// 상세 데이터 HTML 생성
function generateDetailedDataHTML(data) {
  if (data.length === 0) return '';
  
  return `
    <div style="margin-bottom: 30px; page-break-inside: avoid;">
      <h3 style="color: #4a5a4a; border-bottom: 2px solid #a8d5ba; padding-bottom: 10px; margin-bottom: 20px;">
        📋 최근 기록 상세
      </h3>
      <table style="width: 100%; border-collapse: collapse; font-size: 12px;">
        <thead>
          <tr style="background: #a8d5ba; color: white;">
            <th style="padding: 10px; text-align: left;">날짜</th>
            <th style="padding: 10px; text-align: center;">체중</th>
            <th style="padding: 10px; text-align: center;">수면</th>
            <th style="padding: 10px; text-align: center;">운동</th>
            <th style="padding: 10px; text-align: center;">걸음</th>
            <th style="padding: 10px; text-align: center;">수분</th>
          </tr>
        </thead>
        <tbody>
          ${data.map((item, index) => `
            <tr style="background: ${index % 2 === 0 ? '#fef9e7' : '#ffffff'};">
              <td style="padding: 10px;">${item.date}</td>
              <td style="padding: 10px; text-align: center;">${item.weight || '-'}</td>
              <td style="padding: 10px; text-align: center;">${item.sleep ? item.sleep + 'h' : '-'}</td>
              <td style="padding: 10px; text-align: center;">${item.exercise ? item.exercise + '분' : '-'}</td>
              <td style="padding: 10px; text-align: center;">${item.steps ? item.steps.toLocaleString() : '-'}</td>
              <td style="padding: 10px; text-align: center;">${item.water ? item.water + '컵' : '-'}</td>
            </tr>
          `).join('')}
        </tbody>
      </table>
    </div>
    
    <div style="margin-top: 40px; padding-top: 20px; border-top: 1px solid #d4e8d4; text-align: center; color: #8a9a8a; font-size: 12px;">
      <p>이 리포트는 My Health Report에서 자동 생성되었습니다.</p>
      <p>생성일: ${new Date().toLocaleString('ko-KR')}</p>
    </div>
  `;
}

// ========================================
// 템플릿 다운로드
// ========================================

function downloadTemplate() {
  // CSV 헤더 및 예시 데이터
  const csvContent = [
    // 헤더
    ['날짜', '이름', '체중(kg)', '키(cm)', '수면시간(h)', '운동시간(분)', '걸음수', '수분섭취(컵)', '기분(1-5)', '스트레스(1-4)', '메모'],
    // 예시 데이터 1
    ['2025-11-17', '홍길동', '60.5', '170.0', '7.5', '30', '10000', '8', '4', '2', '오늘 기분이 좋았음'],
    // 예시 데이터 2
    ['2025-11-16', '홍길동', '60.3', '170.0', '8.0', '45', '12000', '9', '5', '1', '충분히 휴식함'],
    // 빈 행 (사용자 입력용)
    ['', '', '', '', '', '', '', '', '', '', '']
  ].map(row => row.join(',')).join('\n');
  
  // BOM 추가 (한글 깨짐 방지)
  const BOM = '\uFEFF';
  const blob = new Blob([BOM + csvContent], { type: 'text/csv;charset=utf-8;' });
  const url = URL.createObjectURL(blob);
  
  const link = document.createElement('a');
  link.href = url;
  link.download = `건강데이터_템플릿_${new Date().toISOString().split('T')[0]}.csv`;
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
  URL.revokeObjectURL(url);
  
  showMessage('템플릿이 다운로드되었습니다! 📥', 'success');
}

// ========================================
// 템플릿 업로드 처리
// ========================================

function handleTemplateUpload(e) {
  const file = e.target.files[0];
  if (!file) return;
  
  const fileName = file.name.toLowerCase();
  
  // CSV 파일만 지원
  if (!fileName.endsWith('.csv')) {
    showMessage('CSV 파일만 업로드 가능합니다. 템플릿을 다운로드하여 사용해주세요.', 'error');
    templateFileInput.value = '';
    return;
  }
  
  const reader = new FileReader();
  
  reader.onload = function(event) {
    try {
      const csvData = event.target.result;
      const parsedData = parseCSV(csvData);
      
      if (parsedData.length === 0) {
        showMessage('템플릿에 유효한 데이터가 없습니다.', 'error');
        return;
      }
      
      // 데이터 저장
      let successCount = 0;
      let errorCount = 0;
      
      parsedData.forEach(data => {
        try {
          // 필수 필드 검증
          if (!data.date) {
            errorCount++;
            return;
          }
          
          // 데이터 저장
          const newData = {
            id: Date.now() + Math.random(), // 고유 ID 생성
            name: data.name || userName || '사용자',
            date: data.date,
            weight: data.weight,
            height: data.height,
            sleep: data.sleep,
            exercise: data.exercise,
            steps: data.steps,
            water: data.water,
            mood: data.mood,
            stress: data.stress,
            notes: data.notes || '',
            createdAt: new Date().toISOString()
          };
          
          // BMI 계산
          if (newData.height && newData.weight) {
            const heightInMeters = newData.height / 100;
            newData.bmi = parseFloat((newData.weight / (heightInMeters * heightInMeters)).toFixed(1));
          }
          
          healthData.unshift(newData);
          successCount++;
          
        } catch (err) {
          console.error('데이터 저장 오류:', err);
          errorCount++;
        }
      });
      
      // 로컬 스토리지에 저장
      localStorage.setItem('healthData', JSON.stringify(healthData));
      
      // 결과 메시지
      if (successCount > 0) {
        showMessage(`✅ ${successCount}개 데이터가 업로드되었습니다!${errorCount > 0 ? ` (${errorCount}개 실패)` : ''}`, 'success');
        
        // 업로드된 데이터를 모두 보여주기 위해 기간을 '전체'로 설정
        if (periodSelect) {
          periodSelect.value = 'all';
        }
        
        // 차트 업데이트 (전체 데이터)
        updateStatistics('all');
        updateChart('all');
        updateRecentDataList();
        updateHealthAdvice('all');
      } else {
        showMessage('데이터 업로드에 실패했습니다. 템플릿 형식을 확인해주세요.', 'error');
      }
      
    } catch (error) {
      console.error('템플릿 파싱 오류:', error);
      showMessage('파일 처리 중 오류가 발생했습니다.', 'error');
    }
    
    // 파일 입력 초기화
    templateFileInput.value = '';
  };
  
  reader.onerror = function() {
    showMessage('파일 읽기에 실패했습니다.', 'error');
    templateFileInput.value = '';
  };
  
  reader.readAsText(file, 'UTF-8');
}

// ========================================
// CSV 파싱 함수
// ========================================

function parseCSV(csvText) {
  const lines = csvText.split('\n').filter(line => line.trim());
  
  if (lines.length < 2) {
    return [];
  }
  
  // 헤더는 건너뛰고 데이터 행만 처리
  const dataLines = lines.slice(1);
  const parsedData = [];
  
  dataLines.forEach(line => {
    // CSV 파싱 (쉼표로 분리, 따옴표 처리)
    const values = line.split(',').map(v => v.trim().replace(/^"|"$/g, ''));
    
    // 날짜가 없으면 건너뛰기
    if (!values[0]) return;
    
    const data = {
      date: values[0] || '',
      name: values[1] || '',
      weight: values[2] ? parseFloat(values[2]) : null,
      height: values[3] ? parseFloat(values[3]) : null,
      sleep: values[4] ? parseFloat(values[4]) : null,
      exercise: values[5] ? parseInt(values[5]) : null,
      steps: values[6] ? parseInt(values[6]) : null,
      water: values[7] ? parseFloat(values[7]) : null,
      mood: values[8] ? parseInt(values[8]) : null,
      stress: values[9] ? parseInt(values[9]) : null,
      notes: values[10] || ''
    };
    
    parsedData.push(data);
  });
  
  return parsedData;
}

// ========================================
// 기존 함수들 계속...
// ========================================

function handleChatSubmit(e) {
  e.preventDefault();
  
  const userMessage = chatInput.value.trim();
  if (!userMessage) return;
  
  // 사용자 메시지 추가
  addChatMessage(userMessage, 'user');
  chatInput.value = '';
  
  // GPT API가 설정되어 있으면 API 호출, 아니면 기본 응답
  if (OPENAI_API_KEY && OPENAI_API_KEY !== 'your-api-key-here') {
    // 로딩 메시지 표시
    const loadingId = addChatMessage('답변을 생성하고 있습니다...', 'bot', true);
    
    // GPT API 호출
    callGPTAPI(userMessage, loadingId);
  } else {
    // 기본 응답 (GPT API 미설정 시)
    setTimeout(() => {
      const response = generateBotResponse(userMessage);
      addChatMessage(response, 'bot');
    }, 500);
  }
}

function addChatMessage(message, type, isLoading = false) {
  if (!chatMessages) return;
  
  const messageDiv = document.createElement('div');
  messageDiv.className = `chat-message ${type}-message`;
  
  // 로딩 메시지인 경우 ID 부여
  if (isLoading) {
    messageDiv.id = `loading-${Date.now()}`;
  }
  
  if (type === 'bot') {
    messageDiv.innerHTML = `
      <div class="message-avatar">🤖</div>
      <div class="message-content">
        ${isLoading ? '<p class="loading-dots">답변을 생성하고 있습니다<span>.</span><span>.</span><span>.</span></p>' : `<p>${message}</p>`}
      </div>
    `;
  } else {
    messageDiv.innerHTML = `
      <div class="message-content">
        <p>${message}</p>
      </div>
      <div class="message-avatar">👤</div>
    `;
  }
  
  chatMessages.appendChild(messageDiv);
  chatMessages.scrollTop = chatMessages.scrollHeight;
  
  return messageDiv.id;
}

// ========================================
// GPT API 호출
// ========================================

async function callGPTAPI(userMessage, loadingId) {
  try {
    // 대화 히스토리에 사용자 메시지 추가
    conversationHistory.push({
      role: 'user',
      content: userMessage
    });
    
    // 건강 데이터 컨텍스트 생성
    const healthContext = createHealthContext();
    
    // 시스템 프롬프트
    const systemPrompt = `당신은 중고등학생을 위한 친절한 AI 건강 상담 챗봇입니다. 
다음 역할을 수행합니다:
- 건강 데이터를 기반으로 맞춤형 조언 제공
- 운동, 식습관, 수면, 스트레스 관리에 대한 실용적인 팁 제공
- 긍정적이고 격려하는 톤으로 대화
- 전문적인 의료 조언이 필요한 경우 의사 상담 권장

사용자의 최근 건강 데이터:
${healthContext}

항상 친절하고 이해하기 쉬운 언어로 답변하세요.`;
    
    // API 요청
    const response = await fetch(OPENAI_API_URL, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${OPENAI_API_KEY}`
      },
      body: JSON.stringify({
        model: 'gpt-4o-mini',
        messages: [
          { role: 'system', content: systemPrompt },
          ...conversationHistory.slice(-10) // 최근 10개 대화만 유지
        ],
        temperature: 0.7,
        max_tokens: 1000
      })
    });
    
    if (!response.ok) {
      throw new Error(`API 오류: ${response.status}`);
    }
    
    const data = await response.json();
    const botResponse = data.choices[0].message.content;
    
    // 대화 히스토리에 봇 응답 추가
    conversationHistory.push({
      role: 'assistant',
      content: botResponse
    });
    
    // 로딩 메시지 제거 및 실제 응답 표시
    const loadingElement = document.getElementById(loadingId);
    if (loadingElement) {
      loadingElement.remove();
    }
    
    addChatMessage(botResponse, 'bot');
    
  } catch (error) {
    console.error('GPT API 호출 오류:', error);
    
    // 로딩 메시지 제거
    const loadingElement = document.getElementById(loadingId);
    if (loadingElement) {
      loadingElement.remove();
    }
    
    // 오류 발생 시 기본 응답으로 대체
    const fallbackResponse = generateBotResponse(userMessage);
    addChatMessage(fallbackResponse + '\n\n⚠️ API 연결 오류로 기본 응답을 제공했습니다.', 'bot');
  }
}

// ========================================
// 건강 데이터 컨텍스트 생성
// ========================================

function createHealthContext() {
  if (healthData.length === 0) {
    return '아직 저장된 건강 데이터가 없습니다.';
  }
  
  const recent = healthData.slice(0, 7); // 최근 7일 데이터
  const latest = recent[0];
  
  let context = `최근 건강 데이터 (최근 7일):\n\n`;
  
  // 최신 데이터
  context += `[가장 최근 기록 - ${latest.date}]\n`;
  if (latest.weight && latest.height) {
    const heightInMeters = latest.height / 100;
    const bmi = (latest.weight / (heightInMeters * heightInMeters)).toFixed(1);
    context += `- 체중: ${latest.weight}kg, 키: ${latest.height}cm, BMI: ${bmi}\n`;
  }
  if (latest.sleep !== null) context += `- 수면: ${latest.sleep}시간\n`;
  if (latest.exercise !== null) context += `- 운동: ${latest.exercise}분\n`;
  if (latest.steps !== null) context += `- 걸음 수: ${latest.steps.toLocaleString()}보\n`;
  if (latest.water !== null) context += `- 물 섭취: ${latest.water}컵\n`;
  if (latest.mood) {
    const moods = ['', '매우 나쁨', '나쁨', '보통', '좋음', '매우 좋음'];
    context += `- 기분: ${moods[latest.mood]}\n`;
  }
  if (latest.stress) {
    const stress = ['', '낮음', '보통', '높음', '매우 높음'];
    context += `- 스트레스: ${stress[latest.stress]}\n`;
  }
  
  // 평균 계산
  if (recent.length > 1) {
    const avgSleep = recent.filter(d => d.sleep).reduce((sum, d) => sum + d.sleep, 0) / recent.filter(d => d.sleep).length;
    const avgExercise = recent.filter(d => d.exercise).reduce((sum, d) => sum + d.exercise, 0) / recent.filter(d => d.exercise).length;
    
    context += `\n[7일 평균]\n`;
    if (avgSleep) context += `- 평균 수면: ${avgSleep.toFixed(1)}시간\n`;
    if (avgExercise) context += `- 평균 운동: ${avgExercise.toFixed(0)}분\n`;
  }
  
  return context;
}

function generateBotResponse(userMessage) {
  const lowerMessage = userMessage.toLowerCase();
  
  // 건강 조언
  if (lowerMessage.includes('건강') || lowerMessage.includes('조언')) {
    return '💚 **건강한 생활을 위한 기본 수칙**:\n\n1. **규칙적인 운동**: 하루 30분 이상, 주 5회\n2. **충분한 수면**: 중고등학생은 8-10시간 권장\n3. **균형 잡힌 식사**: 채소, 단백질, 통곡물 포함\n4. **수분 섭취**: 하루 8잔 이상 물 마시기\n5. **스트레스 관리**: 명상, 취미 활동, 충분한 휴식\n\n어떤 부분에 대해 더 자세히 알고 싶으신가요?';
  }
  
  // 운동 관련
  if (lowerMessage.includes('운동') || lowerMessage.includes('추천') || lowerMessage.includes('계획')) {
    return '🏃 **중고등학생 운동 가이드**:\n\n**유산소 운동** (주 3-5회):\n- 달리기, 자전거, 줄넘기, 수영 등\n- 30-60분, 적당한 강도\n\n**근력 운동** (주 2-3회):\n- 팔굽혀펴기, 스쿼트, 플랭크\n- 각 운동 3세트 × 10-15회\n\n**유연성 운동** (매일):\n- 스트레칭 10-15분\n\n💡 처음엔 무리하지 말고 가볍게 시작하세요!';
  }
  
  // 수면 관련
  if (lowerMessage.includes('수면') || lowerMessage.includes('잠') || lowerMessage.includes('불면')) {
    return '😴 **양질의 수면을 위한 팁**:\n\n**수면 전 (1-2시간)**:\n- 📱 전자기기 사용 줄이기\n- ☕ 카페인 섭취 피하기\n- 🛁 따뜻한 샤워하기\n\n**수면 환경**:\n- 🌡️ 시원한 온도 유지 (18-20°C)\n- 🌑 어둡고 조용한 환경\n- 🛏️ 편안한 침구\n\n**규칙적인 수면 패턴**:\n- 매일 같은 시간에 자고 일어나기\n- 낮잠은 20분 이내로\n\n중고등학생은 하루 8-10시간 수면이 필요합니다!';
  }
  
  // 식습관 관련
  if (lowerMessage.includes('식사') || lowerMessage.includes('음식') || lowerMessage.includes('다이어트')) {
    return '🍎 **건강한 식습관**:\n\n**아침 식사** (필수!):\n- 통곡물, 계란, 우유, 과일\n- 두뇌 활동과 집중력 향상\n\n**점심/저녁**:\n- 채소 50%, 단백질 25%, 탄수화물 25%\n- 천천히 꼭꼭 씹어 먹기\n\n**간식**:\n- 견과류, 과일, 요구르트\n- 가공식품, 탄산음료 줄이기\n\n**수분**:\n- 하루 8잔 이상 물 마시기\n- 운동 시 추가 수분 섭취\n\n⚠️ 무리한 다이어트는 성장에 악영향!';
  }
  
  // 스트레스 관리
  if (lowerMessage.includes('스트레스') || lowerMessage.includes('걱정') || lowerMessage.includes('불안')) {
    return '🧘 **스트레스 관리 방법**:\n\n**즉각적인 이완**:\n- 깊은 호흡 (4초 들이마시고, 4초 내쉬기)\n- 5분 산책\n- 좋아하는 음악 듣기\n\n**장기적 관리**:\n- 규칙적인 운동\n- 충분한 수면\n- 취미 활동\n- 친구, 가족과 대화\n\n**공부 스트레스**:\n- 50분 공부 + 10분 휴식\n- 목표를 작은 단위로 나누기\n- 완벽주의 버리기\n\n😊 스트레스를 느끼는 것은 자연스러운 일입니다!\n너무 힘들면 부모님이나 선생님과 상담하세요.';
  }
  
  // BMI/체중 관련
  if (lowerMessage.includes('체중') || lowerMessage.includes('살') || lowerMessage.includes('bmi')) {
    return '⚖️ **건강한 체중 관리**:\n\n**BMI 기준** (청소년):\n- 저체중: 18.5 미만\n- 정상: 18.5-23\n- 과체중: 23-25\n- 비만: 25 이상\n\n**건강한 체중 관리**:\n- 급격한 체중 변화 피하기\n- 한 달에 1-2kg 감량이 적당\n- 식사량 조절 + 운동 병행\n- 성장기이므로 무리한 다이어트 금지!\n\n**식습관**:\n- 아침 꼭 먹기\n- 천천히 먹기\n- 야식 피하기\n- 단 음료 대신 물 마시기\n\n💡 체중보다 건강한 생활습관이 중요합니다!';
  }
  
  // 데이터 분석
  if (lowerMessage.includes('분석') || lowerMessage.includes('어때')) {
    if (healthData.length === 0) {
      return '아직 저장된 건강 데이터가 없어요. 먼저 "건강 입력" 탭에서 데이터를 입력해주세요! 체중, 수면, 운동 등을 기록하면 맞춤형 건강 조언을 받을 수 있습니다. 🌿';
    }
    
    const recent = healthData[0];
    let analysis = '📊 **최근 건강 데이터 분석**:\n\n';
    
    // 수면 분석
    if (recent.sleep !== null) {
      if (recent.sleep < 7) {
        analysis += `😴 수면 시간이 ${recent.sleep}시간으로 부족합니다.\n→ 중고등학생은 8-10시간 수면이 필요합니다.\n→ 일찍 자고 일찍 일어나는 습관을 들이세요!\n\n`;
      } else if (recent.sleep >= 8 && recent.sleep <= 10) {
        analysis += `✅ 수면 시간 ${recent.sleep}시간! 이상적입니다!\n\n`;
      } else if (recent.sleep > 10) {
        analysis += `😴 수면 시간이 ${recent.sleep}시간으로 많습니다.\n→ 적절한 수면 시간은 8-10시간입니다.\n\n`;
      }
    }
    
    // 운동 분석
    if (recent.exercise !== null) {
      if (recent.exercise < 30) {
        analysis += `🏃 운동 시간이 ${recent.exercise}분으로 부족합니다.\n→ 하루 30분 이상 운동하는 것을 목표로 하세요!\n→ 계단 이용, 걸어서 등하교부터 시작해보세요.\n\n`;
      } else {
        analysis += `✅ 운동 ${recent.exercise}분! 훌륭합니다!\n→ 이 페이스를 유지하세요!\n\n`;
      }
    }
    
    // 걸음 수 분석
    if (recent.steps !== null) {
      if (recent.steps < 8000) {
        analysis += `👟 걸음 수가 ${recent.steps.toLocaleString()}보입니다.\n→ 하루 10,000보를 목표로 해보세요!\n\n`;
      } else {
        analysis += `✅ ${recent.steps.toLocaleString()}보! 활동량이 좋습니다!\n\n`;
      }
    }
    
    // 수분 섭취 분석
    if (recent.water !== null) {
      if (recent.water < 8) {
        analysis += `💧 물 섭취가 ${recent.water}컵으로 부족합니다.\n→ 하루 8컵 이상 물을 마시세요!\n\n`;
      } else {
        analysis += `✅ 물 ${recent.water}컵! 수분 섭취가 충분합니다!\n\n`;
      }
    }
    
    // 스트레스 분석
    if (recent.stress && recent.stress >= 3) {
      analysis += `😰 스트레스 수준이 높습니다.\n→ 깊은 호흡, 산책, 운동으로 스트레스를 관리하세요.\n→ 힘들면 주변 사람들과 이야기하세요!\n\n`;
    }
    
    analysis += '💪 더 궁금한 점이 있으면 "운동", "수면", "식습관" 등을 물어보세요!';
    
    return analysis;
  }
  
  // 기본 응답
  return '🌿 **AI 건강 상담 챗봇입니다!**\n\n다음과 같은 주제로 질문해보세요:\n\n• 💪 **운동**: "운동 추천해줘", "운동 계획"\n• 😴 **수면**: "잘 못 자요", "수면 팁"\n• 🍎 **식습관**: "건강한 식사", "다이어트"\n• 🧘 **스트레스**: "스트레스 관리", "명상"\n• 📊 **데이터 분석**: "내 건강 어때?"\n• ⚖️ **체중 관리**: "체중 감량", "BMI"\n\n💡 GPT API를 설정하면 더 정교한 맞춤형 건강 조언을 받을 수 있습니다!';
}

// ========================================
// 메시지 표시
// ========================================

function showMessage(message, type = 'info') {
  const messageEl = document.createElement('div');
  messageEl.className = `message message-${type}`;
  messageEl.textContent = message;
  messageEl.style.cssText = 'position: fixed; top: 20px; left: 50%; transform: translateX(-50%); z-index: 1000; animation: slideDown 0.3s ease-out;';
  
  document.body.appendChild(messageEl);
  
  setTimeout(() => {
    messageEl.style.animation = 'fadeOut 0.3s ease-out';
    setTimeout(() => messageEl.remove(), 300);
  }, 3000);
}

// ========================================
// 앱 초기화 실행
// ========================================

document.addEventListener('DOMContentLoaded', init);

