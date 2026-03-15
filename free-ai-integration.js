// Бесплатные ИИ API для старта без затрат

// 1. Groq API (бесплатный tier с высокими лимитами)
class GroqAI {
  constructor(apiKey) {
    this.apiKey = apiKey;
    this.baseURL = 'https://api.groq.com/openai/v1';
  }

  async generate(prompt) {
    try {
      const response = await fetch(`${this.baseURL}/chat/completions`, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${this.apiKey}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          model: 'llama3-8b-8192',
          messages: [
            {
              role: 'system',
              content: 'Ты - профессиональный копирайтер и SMM-специалист. Создавай уникальный, привлекательный контент для бизнеса.'
            },
            {
              role: 'user',
              content: prompt
            }
          ],
          max_tokens: 500,
          temperature: 0.7
        })
      });

      const data = await response.json();
      return data.choices[0].message.content;
    } catch (error) {
      console.error('Groq API error:', error);
      throw error;
    }
  }
}

// 2. Cohere API (бесплатные запросы)
class CohereAI {
  constructor(apiKey) {
    this.apiKey = apiKey;
    this.baseURL = 'https://api.cohere.ai/v1';
  }

  async generate(prompt) {
    try {
      const response = await fetch(`${this.baseURL}/generate`, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${this.apiKey}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          model: 'command',
          prompt: prompt,
          max_tokens: 500,
          temperature: 0.7
        })
      });

      const data = await response.json();
      return data.generations[0].text;
    } catch (error) {
      console.error('Cohere API error:', error);
      throw error;
    }
  }
}

// 3. Hugging Face (бесплатные модели)
class HuggingFaceAI {
  constructor(apiKey) {
    this.apiKey = apiKey;
    this.models = {
      russian: 'mistralai/Mistral-7B-Instruct-v0.2',
      english: 'microsoft/DialoGPT-medium'
    };
  }

  async generate(prompt, model = 'russian') {
    try {
      const response = await fetch(
        `https://api-inference.huggingface.co/models/${this.models[model]}`,
        {
          method: 'POST',
          headers: {
            'Authorization': `Bearer ${this.apiKey}`,
            'Content-Type': 'application/json'
          },
          body: JSON.stringify({
            inputs: prompt,
            parameters: {
              max_new_tokens: 500,
              temperature: 0.7,
              do_sample: true
            }
          })
        }
      );

      const data = await response.json();
      return data[0]?.generated_text || data.generated_text;
    } catch (error) {
      console.error('HuggingFace API error:', error);
      throw error;
    }
  }
}

// 4. Google Gemini (бесплатный tier)
class GeminiAI {
  constructor(apiKey) {
    this.apiKey = apiKey;
    this.baseURL = 'https://generativelanguage.googleapis.com/v1beta';
  }

  async generate(prompt) {
    try {
      const response = await fetch(`${this.baseURL}/models/gemini-pro:generateContent?key=${this.apiKey}`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          contents: [{
            parts: [{
              text: `Ты - профессиональный копирайтер. ${prompt}`
            }]
          }]
        })
      });

      const data = await response.json();
      return data.candidates[0].content.parts[0].text;
    } catch (error) {
      console.error('Gemini API error:', error);
      throw error;
    }
  }
}

// 5. Локальная модель через Web LLM (полностью бесплатно)
class LocalAI {
  constructor() {
    this.model = null;
  }

  async init() {
    // Загрузка модели в браузере
    try {
      const { WebLLM } = window.WebLLM || await import('https://cdn.jsdelivr.net/npm/@mlc-ai/web-llm');
      this.model = await WebLLM.CreateMLCEngine();
      await this.model.reload('qwen1.5-1.8b-chat');
      return true;
    } catch (error) {
      console.error('Local AI init error:', error);
      return false;
    }
  }

  async generate(prompt) {
    if (!this.model) {
      await this.init();
    }

    try {
      const response = await this.model.chat.completions.create({
        messages: [
          {
            role: 'system',
            content: 'Ты - профессиональный копирайтер.'
          },
          {
            role: 'user',
            content: prompt
          }
        ],
        max_tokens: 500
      });

      return response.choices[0].message.content;
    } catch (error) {
      console.error('Local AI error:', error);
      throw error;
    }
  }
}

// 6. Anthropic Claude (бесплатные запросы)
class ClaudeAI {
  constructor(apiKey) {
    this.apiKey = apiKey;
    this.baseURL = 'https://api.anthropic.com/v1';
  }

  async generate(prompt) {
    try {
      const response = await fetch(`${this.baseURL}/messages`, {
        method: 'POST',
        headers: {
          'x-api-key': this.apiKey,
          'Content-Type': 'application/json',
          'anthropic-version': '2023-06-01'
        },
        body: JSON.stringify({
          model: 'claude-3-haiku-20240307',
          max_tokens: 500,
          messages: [{
            role: 'user',
            content: `Ты - профессиональный копирайтер. ${prompt}`
          }]
        })
      });

      const data = await response.json();
      return data.content[0].text;
    } catch (error) {
      console.error('Claude API error:', error);
      throw error;
    }
  }
}

// Менеджер ИИ сервисов с фоллбэками
class AIManager {
  constructor() {
    this.services = [];
    this.currentService = 0;
  }

  addService(service) {
    this.services.push(service);
  }

  async generate(prompt) {
    // Пробуем каждый сервис по очереди
    for (let i = 0; i < this.services.length; i++) {
      try {
        console.log(`Trying service ${i + 1}/${this.services.length}`);
        const result = await this.services[i].generate(prompt);
        return result;
      } catch (error) {
        console.error(`Service ${i + 1} failed:`, error.message);
        continue;
      }
    }

    throw new Error('All AI services failed');
  }
}

// Инициализация бесплатных сервисов
async function initFreeAIServices() {
  const aiManager = new AIManager();

  // Groq (самый быстрый и щедрый бесплатный tier)
  if (process.env.GROQ_API_KEY) {
    aiManager.addService(new GroqAI(process.env.GROQ_API_KEY));
  }

  // Google Gemini (15 запросов/мин бесплатно)
  if (process.env.GEMINI_API_KEY) {
    aiManager.addService(new GeminiAI(process.env.GEMINI_API_KEY));
  }

  // Cohere (1000 запросов/месяц бесплатно)
  if (process.env.COHERE_API_KEY) {
    aiManager.addService(new CohereAI(process.env.COHERE_API_KEY));
  }

  // Hugging Face (30,000 запросов/месяц бесплатно)
  if (process.env.HUGGINGFACE_API_KEY) {
    aiManager.addService(new HuggingFaceAI(process.env.HUGGINGFACE_API_KEY));
  }

  // Claude (бесплатные запросы)
  if (process.env.CLAUDE_API_KEY) {
    aiManager.addService(new ClaudeAI(process.env.CLAUDE_API_KEY));
  }

  // Локальная модель (полностью бесплатно)
  aiManager.addService(new LocalAI());

  return aiManager;
}

// Обновленный промпт для бесплатных моделей
function createFreePrompt(contentType, platform, topic, keywords, tone) {
  const toneMap = {
    'friendly': 'дружелюбный',
    'professional': 'профессиональный',
    'humorous': 'с юмором',
    'formal': 'официальный'
  };

  const platformInstructions = {
    'instagram': 'для Instagram с эмодзи и хештегами',
    'vk': 'для VKонтакте с форматированием',
    'telegram': 'для Telegram с четкой структурой',
    'wildberries': 'для Wildberries с характеристиками и преимуществами',
    'ozon': 'для Ozon с детальным описанием и SEO-оптимизацией'
  };

  if (contentType === 'social') {
    return `Создай короткий ${toneMap[tone]} пост для соцсетей ${platformInstructions[platform]}.
    
Тема: ${topic}
Ключевые слова: ${keywords}

Сделай текст лаконичным и привлекательным. Добавь призыв к действию.`;
  } else {
    return `Создай ${toneMap[tone]} описание товара для маркетплейса ${platformInstructions[platform]}.
    
Название: ${topic}
Ключевые слова: ${keywords}

Опиши преимущества и характеристики кратко и убедительно.`;
  }
}

module.exports = {
  GroqAI,
  CohereAI,
  HuggingFaceAI,
  GeminiAI,
  ClaudeAI,
  LocalAI,
  AIManager,
  initFreeAIServices,
  createFreePrompt
};
