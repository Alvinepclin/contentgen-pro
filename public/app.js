// API конфигурация
const API_BASE_URL = window.location.origin + '/api';

// Глобальные переменные
let currentUser = null;
let authToken = localStorage.getItem('token');

// Инициализация приложения
document.addEventListener('DOMContentLoaded', () => {
  checkAuth();
  setupEventListeners();
});

// Проверка авторизации
async function checkAuth() {
  if (authToken) {
    try {
      const response = await fetch(`${API_BASE_URL}/user`, {
        headers: {
          'Authorization': `Bearer ${authToken}`
        }
      });
      
      if (response.ok) {
        currentUser = await response.json();
        updateUIForAuthenticatedUser();
      } else {
        logout();
      }
    } catch (error) {
      console.error('Auth check failed:', error);
      logout();
    }
  }
}

// Обновление UI для авторизованного пользователя
function updateUIForAuthenticatedUser() {
  // Обновить навигацию
  const nav = document.querySelector('nav .flex.items-center.space-x-4');
  nav.innerHTML = `
    <button class="text-gray-600 hover:text-purple-600 transition">Функции</button>
    <button class="text-gray-600 hover:text-purple-600 transition">Тарифы</button>
    <button class="text-gray-600 hover:text-purple-600 transition" onclick="showHistory()">История</button>
    <span class="text-purple-600 font-semibold">${currentUser.email}</span>
    <button class="bg-purple-600 text-white px-4 py-2 rounded-lg hover:bg-purple-700 transition" onclick="scrollToGenerator()">
      Генерировать
    </button>
    <button class="bg-gray-200 text-gray-700 px-4 py-2 rounded-lg hover:bg-gray-300 transition" onclick="logout()">
      Выход
    </button>
  `;

  // Обновить информацию о тарифе
  updatePlanInfo();
}

// Обновление информации о тарифе
function updatePlanInfo() {
  const planBadge = document.createElement('div');
  planBadge.className = 'fixed top-20 right-4 bg-purple-100 text-purple-700 px-4 py-2 rounded-lg shadow-lg z-40';
  planBadge.innerHTML = `
    <div class="text-sm font-semibold">Тариф: ${currentUser.plan.toUpperCase()}</div>
    <div class="text-xs">Генераций: ${currentUser.api_used}/${currentUser.api_limit}</div>
  `;
  document.body.appendChild(planBadge);
}

// Настройка обработчиков событий
function setupEventListeners() {
  // Обработчики для кнопок тарифов
  document.addEventListener('click', (e) => {
    if (e.target.closest('button')?.textContent?.includes('Купить')) {
      const plan = e.target.closest('.pricing-card').querySelector('h3').textContent.toLowerCase();
      if (plan.includes('про')) {
        subscribe('pro');
      } else if (plan.includes('бизнес')) {
        subscribe('business');
      }
    }
  });
}

// Регистрация
async function register(email, password) {
  try {
    const response = await fetch(`${API_BASE_URL}/register`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({ email, password })
    });

    const data = await response.json();

    if (response.ok) {
      authToken = data.token;
      localStorage.setItem('token', authToken);
      currentUser = data.user;
      updateUIForAuthenticatedUser();
      showSuccess('Регистрация успешна!');
      return true;
    } else {
      showError(data.error);
      return false;
    }
  } catch (error) {
    showError('Ошибка регистрации');
    return false;
  }
}

// Вход
async function login(email, password) {
  try {
    const response = await fetch(`${API_BASE_URL}/login`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({ email, password })
    });

    const data = await response.json();

    if (response.ok) {
      authToken = data.token;
      localStorage.setItem('token', authToken);
      currentUser = data.user;
      updateUIForAuthenticatedUser();
      showSuccess('Вход выполнен!');
      return true;
    } else {
      showError(data.error);
      return false;
    }
  } catch (error) {
    showError('Ошибка входа');
    return false;
  }
}

// Выход
function logout() {
  authToken = null;
  currentUser = null;
  localStorage.removeItem('token');
  location.reload();
}

// Генерация контента
async function generateContent() {
  if (!authToken) {
    showAuthModal();
    return;
  }

  const platform = document.getElementById('platform').value;
  const topic = document.getElementById('topic').value;
  const keywords = document.getElementById('keywords').value;
  const tone = document.getElementById('tone').value;
  const contentType = currentContentType;

  if (!topic || !keywords) {
    showError('Пожалуйста, заполните все поля');
    return;
  }

  // Показываем загрузку
  const resultDiv = document.getElementById('result');
  const generatedText = document.getElementById('generated-text');
  
  resultDiv.classList.remove('hidden');
  generatedText.innerHTML = '<i class="fas fa-spinner fa-spin mr-2"></i> Генерация контента с ИИ...';

  try {
    const response = await fetch(`${API_BASE_URL}/generate`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${authToken}`
      },
      body: JSON.stringify({
        contentType,
        platform,
        topic,
        keywords,
        tone
      })
    });

    const data = await response.json();

    if (response.ok) {
      generatedText.textContent = data.content;
      updatePlanInfo(); // Обновить счетчик генераций
      showSuccess('Контент успешно сгенерирован!');
    } else {
      generatedText.innerHTML = '';
      showError(data.error);
      
      // Если лимит исчерпан, показать модал с предложением обновить тариф
      if (response.status === 429) {
        setTimeout(() => showUpgradeModal(), 2000);
      }
    }
  } catch (error) {
    generatedText.innerHTML = '';
    showError('Ошибка генерации. Попробуйте еще раз.');
  }
}

// Подписка на тариф
async function subscribe(plan) {
  if (!authToken) {
    showAuthModal();
    return;
  }

  try {
    const response = await fetch(`${API_BASE_URL}/create-checkout-session`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${authToken}`
      },
      body: JSON.stringify({ plan })
    });

    const data = await response.json();

    if (response.ok) {
      // Перенаправление на Stripe Checkout
      const stripe = Stripe('pk_test_your_publishable_key'); // Замените на ваш ключ
      stripe.redirectToCheckout({ sessionId: data.sessionId });
    } else {
      showError(data.error);
    }
  } catch (error) {
    showError('Ошибка создания платежа');
  }
}

// Показать модальное окно авторизации
function showAuthModal() {
  const modal = document.createElement('div');
  modal.className = 'fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50';
  modal.innerHTML = `
    <div class="bg-white rounded-lg p-8 max-w-md w-full mx-4">
      <h2 class="text-2xl font-bold mb-6 text-center">Вход или регистрация</h2>
      
      <div class="space-y-4">
        <div>
          <label class="block text-sm font-medium text-gray-700 mb-2">Email</label>
          <input type="email" id="auth-email" class="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-purple-600 focus:border-transparent" placeholder="your@email.com">
        </div>
        
        <div>
          <label class="block text-sm font-medium text-gray-700 mb-2">Пароль</label>
          <input type="password" id="auth-password" class="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-purple-600 focus:border-transparent" placeholder="••••••••">
        </div>
        
        <div class="flex space-x-4">
          <button onclick="performLogin()" class="flex-1 bg-purple-600 text-white py-2 rounded-lg hover:bg-purple-700 transition">
            Войти
          </button>
          <button onclick="performRegister()" class="flex-1 bg-gray-200 text-gray-700 py-2 rounded-lg hover:bg-gray-300 transition">
            Регистрация
          </button>
        </div>
      </div>
      
      <button onclick="closeAuthModal()" class="absolute top-4 right-4 text-gray-400 hover:text-gray-600">
        <i class="fas fa-times"></i>
      </button>
    </div>
  `;
  
  document.body.appendChild(modal);
}

// Выполнить вход
async function performLogin() {
  const email = document.getElementById('auth-email').value;
  const password = document.getElementById('auth-password').value;
  
  if (await login(email, password)) {
    closeAuthModal();
  }
}

// Выполнить регистрацию
async function performRegister() {
  const email = document.getElementById('auth-email').value;
  const password = document.getElementById('auth-password').value;
  
  if (await register(email, password)) {
    closeAuthModal();
  }
}

// Закрыть модальное окно авторизации
function closeAuthModal() {
  const modal = document.querySelector('.fixed.inset-0');
  if (modal) {
    modal.remove();
  }
}

// Показать модальное окно обновления тарифа
function showUpgradeModal() {
  const modal = document.createElement('div');
  modal.className = 'fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50';
  modal.innerHTML = `
    <div class="bg-white rounded-lg p-8 max-w-md w-full mx-4 text-center">
      <i class="fas fa-rocket text-4xl text-purple-600 mb-4"></i>
      <h2 class="text-2xl font-bold mb-4">Лимит исчерпан!</h2>
      <p class="text-gray-600 mb-6">Обновите тариф для безлимитных генераций</p>
      
      <div class="space-y-3">
        <button onclick="subscribe('pro'); closeUpgradeModal();" class="w-full bg-purple-600 text-white py-3 rounded-lg hover:bg-purple-700 transition">
          Pro - 990₽/мес
        </button>
        <button onclick="subscribe('business'); closeUpgradeModal();" class="w-full bg-gray-800 text-white py-3 rounded-lg hover:bg-gray-900 transition">
          Business - 2990₽/мес
        </button>
      </div>
      
      <button onclick="closeUpgradeModal()" class="mt-4 text-gray-500 hover:text-gray-700">
        Позже
      </button>
    </div>
  `;
  
  document.body.appendChild(modal);
}

// Закрыть модальное окно обновления тарифа
function closeUpgradeModal() {
  const modal = document.querySelector('.fixed.inset-0');
  if (modal) {
    modal.remove();
  }
}

// Показать историю генераций
async function showHistory() {
  if (!authToken) {
    showAuthModal();
    return;
  }

  try {
    const response = await fetch(`${API_BASE_URL}/generations`, {
      headers: {
        'Authorization': `Bearer ${authToken}`
      }
    });

    const generations = await response.json();

    const modal = document.createElement('div');
    modal.className = 'fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50';
    modal.innerHTML = `
      <div class="bg-white rounded-lg p-8 max-w-4xl w-full mx-4 max-h-[80vh] overflow-y-auto">
        <h2 class="text-2xl font-bold mb-6">История генераций</h2>
        
        <div class="space-y-4">
          ${generations.length === 0 ? 
            '<p class="text-gray-500 text-center py-8">Пока нет генераций</p>' :
            generations.map(gen => `
              <div class="border rounded-lg p-4">
                <div class="flex justify-between items-start mb-2">
                  <div>
                    <span class="font-semibold">${gen.platform}</span>
                    <span class="text-sm text-gray-500 ml-2">${new Date(gen.created_at).toLocaleString()}</span>
                  </div>
                  <button onclick="copyToClipboard('${encodeURIComponent(gen.generated_content)}')" class="text-purple-600 hover:text-purple-700">
                    <i class="fas fa-copy"></i>
                  </button>
                </div>
                <div class="text-sm text-gray-600 mb-2">Тема: ${gen.topic}</div>
                <div class="text-gray-700 whitespace-pre-line">${gen.generated_content}</div>
              </div>
            `).join('')
          }
        </div>
        
        <button onclick="closeHistoryModal()" class="mt-6 w-full bg-gray-200 text-gray-700 py-2 rounded-lg hover:bg-gray-300 transition">
          Закрыть
        </button>
      </div>
    `;
    
    document.body.appendChild(modal);
  } catch (error) {
    showError('Ошибка загрузки истории');
  }
}

// Закрыть модальное окно истории
function closeHistoryModal() {
  const modal = document.querySelector('.fixed.inset-0');
  if (modal) {
    modal.remove();
  }
}

// Копировать в буфер обмена
function copyContent() {
  const text = document.getElementById('generated-text').textContent;
  copyToClipboard(text);
}

function copyToClipboard(text) {
  const decodedText = decodeURIComponent(text);
  navigator.clipboard.writeText(decodedText).then(() => {
    showSuccess('Скопировано в буфер обмена!');
  });
}

// Показать уведомление об успехе
function showSuccess(message) {
  showNotification(message, 'success');
}

// Показать уведомление об ошибке
function showError(message) {
  showNotification(message, 'error');
}

// Показать уведомление
function showNotification(message, type) {
  const notification = document.createElement('div');
  notification.className = `fixed top-20 right-4 px-6 py-3 rounded-lg shadow-lg z-50 ${
    type === 'success' ? 'bg-green-500 text-white' : 'bg-red-500 text-white'
  }`;
  notification.innerHTML = `
    <div class="flex items-center">
      <i class="fas ${type === 'success' ? 'fa-check-circle' : 'fa-exclamation-circle'} mr-2"></i>
      ${message}
    </div>
  `;
  
  document.body.appendChild(notification);
  
  setTimeout(() => {
    notification.style.opacity = '0';
    notification.style.transition = 'opacity 0.3s';
    setTimeout(() => notification.remove(), 300);
  }, 3000);
}

// Прокрутка к генератору
function scrollToGenerator() {
  document.getElementById('generator').scrollIntoView({ behavior: 'smooth' });
}
