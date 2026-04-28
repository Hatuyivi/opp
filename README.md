# FloorPlan Rooms

> Electron-приложение для macOS: загружает планировку, автоматически находит помещения, даёт выбрать нужные и сохранить в SVG/JSON.

![screenshot placeholder](docs/screenshot.png)

---

## Возможности

| Функция | Описание |
|---|---|
| 📂 Загрузка планировки | Drag & Drop или нативный диалог macOS |
| 🔍 Детекция помещений | Flood-fill алгоритм на Canvas API, строит полигоны |
| 🖼 Интерактивный просмотр | Hover и клик по полигонам прямо на изображении |
| ✅ Выбор помещений | Список с чекбоксами, выбрать все / сбросить |
| 💾 Сохранение | Нативный диалог сохранения → SVG или JSON |
| 📋 Лог | Полный лог событий, доступен по кнопке, можно очистить |

---

## Разработка

```bash
# Установка зависимостей
npm install

# Запуск в режиме разработки (Vite dev server + Electron)
npm run dev
```

---

## Сборка DMG

### Локально

```bash
# Intel (x64)
npm run build:dmg:x64

# Apple Silicon (arm64)
npm run build:dmg:arm64

# Обе архитектуры сразу
npm run build:electron
```

Готовые `.dmg` файлы появятся в папке `release/`.

### Через GitHub Actions (рекомендуется)

1. Форкните / клонируйте репозиторий на GitHub
2. Создайте тег:
   ```bash
   git tag v1.0.0
   git push origin v1.0.0
   ```
3. GitHub Actions автоматически соберёт:
   - `FloorPlan-Rooms-x64.dmg` — для Intel Mac
   - `FloorPlan-Rooms-arm64.dmg` — для Apple Silicon
4. Файлы появятся в разделе **Releases**

---

## Подписание (опционально)

Для распространения без предупреждений macOS Gatekeeper нужна подпись.  
Добавьте в **Settings → Secrets** вашего репозитория:

| Secret | Описание |
|---|---|
| `CSC_LINK` | Base64-encoded `.p12` сертификат |
| `CSC_KEY_PASSWORD` | Пароль от сертификата |
| `APPLE_ID` | Apple ID разработчика |
| `APPLE_APP_SPECIFIC_PASSWORD` | App-specific password |
| `APPLE_TEAM_ID` | Team ID из Apple Developer Portal |

Раскомментируйте соответствующие строки в `.github/workflows/build.yml`.

---

## Структура проекта

```
floorplan-rooms/
├── electron/
│   ├── main.ts          # Electron main process (IPC, dialogs, logging)
│   └── preload.ts       # Context bridge (renderer ↔ main)
├── src/
│   ├── components/
│   │   ├── DropZone.tsx         # Drag & drop / file picker
│   │   ├── FloorPlanCanvas.tsx  # Canvas renderer + hit-test
│   │   ├── RoomList.tsx         # Sidebar с чекбоксами
│   │   └── LogModal.tsx         # Модальное окно лога
│   ├── utils/
│   │   ├── roomDetector.ts      # Алгоритм детекции + SVG/JSON экспорт
│   │   └── logger.ts            # Логгер (IPC → файл)
│   ├── types/
│   │   └── electron.d.ts        # TypeScript типы для window.electronAPI
│   ├── App.tsx
│   ├── main.tsx
│   └── index.css
├── .github/
│   └── workflows/
│       └── build.yml    # CI: сборка dmg x64 + arm64 + GitHub Release
├── electron-builder.yml
├── tsconfig.json
├── tsconfig.electron.json
└── vite.config.ts
```

---

## Системные требования

- macOS 11.0+ (Big Sur)
- Поддерживаемые форматы планировок: PNG, JPG, BMP, TIFF, WebP
- Рекомендуется чёрно-белая или штриховая планировка с чёткими стенами
