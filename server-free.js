const express = require('express');
const cors = require('cors');
const dotenv = require('dotenv');
const sqlite3 = require('sqlite3').verbose();
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const helmet = require('helmet');
const { RateLimiterMemory } = require('rate-limiter-flexible');
const { initFreeAIServices, createFreePrompt } = require('./free-ai-integration');

dotenv.config();

const app = express();
const PORT = process.env.PORT || 3000;

// Безопасность
app.use(helmet());
app.use(cors());
app.use(express.json());

// Rate limiting
const rateLimiter = new RateLimiterMemory({
  keyGenerator: (req) => req.ip,
  points: 20, // Увеличим лимит для бесплатных сервисов
  duration: 60,
});

// База данных
const db = new sqlite3.Database('./database.sqlite');

// Инициализация БД
db.serialize(() => {
  db.run(`CREATE TABLE IF NOT EXISTS users (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    email TEXT UNIQUE NOT NULL,
    password TEXT NOT NULL,
    plan TEXT DEFAULT 'free',
    api_limit INTEGER DEFAULT 50,
    api_used INTEGER DEFAULT 0,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    subscription_end DATETIME
  )`);

  db.run(`CREATE TABLE IF NOT EXISTS subscriptions (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    user_id INTEGER,
    plan TEXT NOT NULL,
    amount INTEGER NOT NULL,
    status TEXT DEFAULT 'active',
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (user_id) REFERENCES users (id)
  )`);

  db.run(`CREATE TABLE IF NOT EXISTS generations (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    user_id INTEGER,
    content_type TEXT NOT NULL,
    platform TEXT NOT NULL,
    topic TEXT NOT NULL,
    keywords TEXT,
    tone TEXT,
    generated_content TEXT,
    ai_service TEXT,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (user_id) REFERENCES users (id)
  )`);
});

// Инициализация ИИ сервисов
let aiManager;
initFreeAIServices().then(manager => {
  aiManager = manager;
  console.log('AI Services initialized:', manager.services.length, 'services available');
}).catch(error => {
  console.error('AI Services initialization failed:', error);
});

// Middleware для проверки JWT
const authenticateToken = (req, res, next) => {
  const authHeader = req.headers['authorization'];
  const token = authHeader && authHeader.split(' ')[1];

  if (!token) {
    return res.status(401).json({ error: 'Требуется авторизация' });
  }

  jwt.verify(token, process.env.JWT_SECRET || 'default_secret', (err, user) => {
    if (err) return res.status(403).json({ error: 'Неверный токен' });
    req.user = user;
    next();
  });
};

// Проверка лимитов генерации
const checkGenerationLimit = async (userId) => {
  return new Promise((resolve, reject) => {
    db.get(
      'SELECT plan, api_limit, api_used FROM users WHERE id = ?',
      [userId],
      (err, row) => {
        if (err) reject(err);
        
        if (!row) reject(new Error('Пользователь не найден'));
        
        if (row.plan === 'free' && row.api_used >= row.api_limit) {
          reject(new Error('Бесплатный лимит исчерпан. Попробуйте завтра или получите Pro тариф'));
        } else {
          resolve(row);
        }
      }
    );
  });
};

// Регистрация
app.post('/api/register', async (req, res) => {
  try {
    const { email, password } = req.body;

    if (!email || !password) {
      return res.status(400).json({ error: 'Email и пароль обязательны' });
    }

    const hashedPassword = await bcrypt.hash(password, 10);

    db.run(
      'INSERT INTO users (email, password) VALUES (?, ?)',
      [email, hashedPassword],
      function(err) {
        if (err) {
          if (err.message.includes('UNIQUE constraint failed')) {
            return res.status(400).json({ error: 'Email уже существует' });
          }
          return res.status(500).json({ error: 'Ошибка регистрации' });
        }

        const token = jwt.sign({ userId: this.lastID }, process.env.JWT_SECRET || 'default_secret');
        res.json({ token, userId: this.lastID });
      }
    );
  } catch (error) {
    res.status(500).json({ error: 'Ошибка сервера' });
  }
});

// Вход
app.post('/api/login', (req, res) => {
  const { email, password } = req.body;

  db.get(
    'SELECT * FROM users WHERE email = ?',
    [email],
    async (err, user) => {
      if (err || !user) {
        return res.status(401).json({ error: 'Неверные учетные данные' });
      }

      const validPassword = await bcrypt.compare(password, user.password);
      if (!validPassword) {
        return res.status(401).json({ error: 'Неверные учетные данные' });
      }

      const token = jwt.sign({ userId: user.id }, process.env.JWT_SECRET || 'default_secret');
      res.json({ 
        token, 
        user: { 
          id: user.id, 
          email: user.email, 
          plan: user.plan,
          api_limit: user.api_limit,
          api_used: user.api_used
        } 
      });
    }
  );
});

// Генерация контента с бесплатными ИИ
app.post('/api/generate', authenticateToken, async (req, res) => {
  try {
    await rateLimiter.consume(req.ip);
    
    const { contentType, platform, topic, keywords, tone } = req.body;
    const userId = req.user.userId;

    // Проверка лимитов
    await checkGenerationLimit(userId);

    if (!aiManager) {
      return res.status(503).json({ error: 'ИИ сервисы недоступны. Попробуйте позже.' });
    }

    // Создание промпта
    const prompt = createFreePrompt(contentType, platform, topic, keywords, tone);

    // Генерация с бесплатными ИИ
    let generatedContent;
    let usedService = 'unknown';

    try {
      generatedContent = await aiManager.generate(prompt);
      
      // Определяем, какой сервис сработал
      if (generatedContent) {
        usedService = aiManager.services[aiManager.currentService]?.constructor?.name || 'unknown';
      }
    } catch (error) {
      console.error('All AI services failed:', error);
      
      // Фоллбэк - базовый шаблон
      generatedContent = createFallbackContent(contentType, platform, topic, keywords, tone);
      usedService = 'fallback';
    }

    // Сохранение в БД
    db.run(
      'INSERT INTO generations (user_id, content_type, platform, topic, keywords, tone, generated_content, ai_service) VALUES (?, ?, ?, ?, ?, ?, ?, ?)',
      [userId, contentType, platform, topic, keywords, tone, generatedContent, usedService]
    );

    // Обновление счетчика использований
    db.run(
      'UPDATE users SET api_used = api_used + 1 WHERE id = ?',
      [userId]
    );

    res.json({ 
      content: generatedContent,
      service: usedService,
      message: usedService === 'fallback' ? 'Использован базовый шаблон (ИИ сервисы временно недоступны)' : null
    });
  } catch (error) {
    if (error.message.includes('Лимит генераций')) {
      return res.status(429).json({ error: error.message });
    }
    console.error('Generation error:', error);
    res.status(500).json({ error: 'Ошибка генерации контента' });
  }
});

// Фоллбэк контент, если все ИИ сервисы недоступны
function createFallbackContent(contentType, platform, topic, keywords, tone) {
  const toneMap = {
    'friendly': '🌟',
    'professional': '📋',
    'humorous': '😄',
    'formal': '🏢'
  };

  const keywordsArray = keywords.split(',').map(k => k.trim()).filter(k => k);

  if (contentType === 'social') {
    return `${toneMap[tone]} ${topic}

${keywordsArray.map(k => `#${k.replace(/\s+/g, '')}`).join(' ')}

${topic} - это то, что вам нужно! ✨

📞 Связаться с нами: [контакты]
📍 Наш адрес: [адрес]

#новость #акция #предложение`;
  } else {
    return `${topic}

Описание товара:
• ${keywordsArray[0] || 'Качественный материал'}
• ${keywordsArray[1] || 'Надежная конструкция'}
• ${keywordsArray[2] || 'Современный дизайн'}

Преимущества:
✅ Гарантия качества
✅ Быстрая доставка
✅ Отличные отзывы

 Закажите прямо сейчас!`;
  }
}

// Получение информации о пользователе
app.get('/api/user', authenticateToken, (req, res) => {
  db.get(
    'SELECT id, email, plan, api_limit, api_used, subscription_end FROM users WHERE id = ?',
    [req.user.userId],
    (err, user) => {
      if (err || !user) {
        return res.status(404).json({ error: 'Пользователь не найден' });
      }
      res.json(user);
    }
  );
});

// Получение истории генераций
app.get('/api/generations', authenticateToken, (req, res) => {
  db.all(
    'SELECT * FROM generations WHERE user_id = ? ORDER BY created_at DESC LIMIT 50',
    [req.user.userId],
    (err, rows) => {
      if (err) {
        return res.status(500).json({ error: 'Ошибка получения истории' });
      }
      res.json(rows);
    }
  );
});

// Информация о доступных ИИ сервисах
app.get('/api/ai-status', (req, res) => {
  res.json({
    services: aiManager ? aiManager.services.length : 0,
    available: aiManager ? true : false,
    message: 'Используются бесплатные ИИ сервисы'
  });
});

// Статический сервер для фронтенда
app.use(express.static('public'));

app.listen(PORT, () => {
  console.log(`Сервер запущен на порту ${PORT}`);
  console.log(`API: http://localhost:${PORT}/api`);
  console.log(`Используются бесплатные ИИ сервисы!`);
});
