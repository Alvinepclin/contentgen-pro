# 🚀 Vercel Setup Guide

## ✅ Вы вошли в Vercel! Отлично!

## 📋 Следующие шаги в Vercel CLI:

### 1. **Выберите scope:**
```
? Which scope should contain your project?
> alvinepclin's projects  # ВЫБЕРИТЕ ЭТОТ
```

### 2. **Название проекта:**
```
? Link to existing project? [y/N] N
? What's your project's name? contentgen-pro
```

### 3. **Папка проекта:**
```
? In which directory is your code located? ./
```

### 4. **Настройки (Vercel определит автоматически):**
```
? Want to override the settings? [y/N] N
```

## 🔑 **ВАЖНО: Добавьте переменные окружения:**

После деплоя зайдите на https://vercel.com и:

1. **Откройте ваш проект**
2. **Settings → Environment Variables**
3. **Добавьте:**
   ```
   GROQ_API_KEY = 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
   JWT_SECRET = your_super_secret_jwt_key_here_123456789
   ```

## 🌐 **Результат:**
Ваш сайт будет доступен на:
`https://contentgen-pro-alvinepclin.vercel.app`

## ⚡ **Если что-то пошло не так:**

### Отмена и повтор:
```bash
# Отменить текущий деплой
Ctrl+C

# Начать заново
vercel
```

### Удалить проект:
```bash
vercel remove contentgen-pro
vercel
```

## 🎯 **После успешного деплоя:**

1. **Проверьте сайт:** откройте URL
2. **Протестируйте генерацию**
3. **Сделайте скриншоты**
4. **Размещайте объявления**

---

## 💡 **Советы:**

- **Не выбирайте Link to existing project** - это первый раз
- **Оставьте настройки по умолчанию** - Vercel сам все определит
- **Обязательно добавьте GROQ_API_KEY** - иначе ИИ не заработает

## 🚀 **Готово к monetization!**

После деплоя у вас будет:
- ✅ Работающий AI сервис
- ✅ Бесплатный хостинг 24/7
- ✅ SSL сертификат
- ✅ CDN по всему миру

**Деплойте и начинайте зарабатывать! 💰**
