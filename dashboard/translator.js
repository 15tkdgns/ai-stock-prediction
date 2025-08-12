// Simple Translation System
class SimpleTranslator {
  constructor() {
    this.currentLang = 'en';
    this.translations = {
      en: {
        'AI Stock Predictor': 'AI Stock Predictor',
        Dashboard: 'Dashboard',
        'Model Performance': 'Model Performance',
        'Real-time Predictions': 'Real-time Predictions',
        'News Analysis': 'News Analysis',
        'XAI Analysis': 'XAI Analysis',
        Progress: 'Progress',
        'Data Explorer': 'Data Explorer',
        'Source Code': 'Source Code',
        Online: 'Online',
        'Prediction Chart': 'Prediction Chart',
        'Select Stock for Chart:': 'Select Stock for Chart:',
        'Prediction Confidence': 'Prediction Confidence',
        'Key Market Insights': 'Key Market Insights',
        'Recent News Headlines': 'Recent News Headlines',
        'AI Model Status': 'AI Model Status',
      },
      ko: {
        'AI Stock Predictor': 'AI 주식 예측기',
        Dashboard: '대시보드',
        'Model Performance': '모델 성능',
        'Real-time Predictions': '실시간 예측',
        'News Analysis': '뉴스 분석',
        'XAI Analysis': 'XAI 분석',
        Progress: '진행상황',
        'Data Explorer': '데이터 탐색기',
        'Source Code': '소스 코드',
        Online: '온라인',
        'Prediction Chart': '예측 차트',
        'Select Stock for Chart:': '차트용 종목 선택:',
        'Prediction Confidence': '예측 신뢰도',
        'Key Market Insights': '주요 시장 통찰',
        'Recent News Headlines': '최근 뉴스 헤드라인',
        'AI Model Status': 'AI 모델 상태',
      },
      ja: {
        'AI Stock Predictor': 'AI株価予測システム',
        Dashboard: 'ダッシュボード',
        'Model Performance': 'モデル性能',
        'Real-time Predictions': 'リアルタイム予測',
        'News Analysis': 'ニュース分析',
        'XAI Analysis': 'XAI分析',
        Progress: '進捗',
        'Data Explorer': 'データエクスプローラー',
        'Source Code': 'ソースコード',
        Online: 'オンライン',
        'Prediction Chart': '予測チャート',
        'Select Stock for Chart:': 'チャート用銘柄選択:',
        'Prediction Confidence': '予測信頼度',
        'Key Market Insights': '主要市場洞察',
        'Recent News Headlines': '最新ニュースヘッドライン',
        'AI Model Status': 'AIモデル状態',
      },
      zh: {
        'AI Stock Predictor': 'AI股票预测器',
        Dashboard: '仪表板',
        'Model Performance': '模型性能',
        'Real-time Predictions': '实时预测',
        'News Analysis': '新闻分析',
        'XAI Analysis': 'XAI分析',
        Progress: '进度',
        'Data Explorer': '数据浏览器',
        'Source Code': '源代码',
        Online: '在线',
        'Prediction Chart': '预测图表',
        'Select Stock for Chart:': '选择图表股票:',
        'Prediction Confidence': '预测置信度',
        'Key Market Insights': '关键市场洞察',
        'Recent News Headlines': '最新新闻标题',
        'AI Model Status': 'AI模型状态',
      },
      es: {
        'AI Stock Predictor': 'Predictor de Acciones IA',
        Dashboard: 'Panel de Control',
        'Model Performance': 'Rendimiento del Modelo',
        'Real-time Predictions': 'Predicciones en Tiempo Real',
        'News Analysis': 'Análisis de Noticias',
        'XAI Analysis': 'Análisis XAI',
        Progress: 'Progreso',
        'Data Explorer': 'Explorador de Datos',
        'Source Code': 'Código Fuente',
        Online: 'En Línea',
        'Prediction Chart': 'Gráfico de Predicción',
        'Select Stock for Chart:': 'Seleccionar Acción para Gráfico:',
        'Prediction Confidence': 'Confianza de Predicción',
        'Key Market Insights': 'Perspectivas Clave del Mercado',
        'Recent News Headlines': 'Titulares de Noticias Recientes',
        'AI Model Status': 'Estado del Modelo IA',
      },
      fr: {
        'AI Stock Predictor': "Prédicteur d'Actions IA",
        Dashboard: 'Tableau de Bord',
        'Model Performance': 'Performance du Modèle',
        'Real-time Predictions': 'Prédictions en Temps Réel',
        'News Analysis': 'Analyse des Nouvelles',
        'XAI Analysis': 'Analyse XAI',
        Progress: 'Progrès',
        'Data Explorer': 'Explorateur de Données',
        'Source Code': 'Code Source',
        Online: 'En Ligne',
        'Prediction Chart': 'Graphique de Prédiction',
        'Select Stock for Chart:': 'Sélectionner Action pour Graphique:',
        'Prediction Confidence': 'Confiance de Prédiction',
        'Key Market Insights': 'Perspectives Clés du Marché',
        'Recent News Headlines': 'Gros Titres Récents',
        'AI Model Status': 'Statut du Modèle IA',
      },
      de: {
        'AI Stock Predictor': 'KI-Aktienprediktor',
        Dashboard: 'Dashboard',
        'Model Performance': 'Modellleistung',
        'Real-time Predictions': 'Echtzeitvorhersagen',
        'News Analysis': 'Nachrichtenanalyse',
        'XAI Analysis': 'XAI-Analyse',
        Progress: 'Fortschritt',
        'Data Explorer': 'Daten-Explorer',
        'Source Code': 'Quellcode',
        Online: 'Online',
        'Prediction Chart': 'Vorhersagediagramm',
        'Select Stock for Chart:': 'Aktie für Diagramm auswählen:',
        'Prediction Confidence': 'Vorhersagevertrauen',
        'Key Market Insights': 'Wichtige Markteinblicke',
        'Recent News Headlines': 'Aktuelle Schlagzeilen',
        'AI Model Status': 'KI-Modellstatus',
      },
    };

    this.init();
  }

  init() {
    // Store original texts before any translation
    this.storeOriginalTexts();

    // Initialize dropdown functionality
    const translateBtn = document.getElementById('translate-btn');
    const dropdown = document.getElementById('language-dropdown');
    const languageOptions = document.querySelectorAll('.language-option');

    if (translateBtn && dropdown && languageOptions.length > 0) {
      translateBtn.addEventListener('click', (e) => {
        e.stopPropagation();
        dropdown.classList.toggle('show');
      });

      // Close dropdown when clicking outside
      document.addEventListener('click', () => {
        dropdown.classList.remove('show');
      });

      // Handle language selection
      languageOptions.forEach((option) => {
        option.addEventListener('click', (e) => {
          const lang = e.target.getAttribute('data-lang');
          if (lang) {
            this.setLanguage(lang);
            dropdown.classList.remove('show');
          }
        });
      });
    } else {
      console.warn(
        'Translation elements not found. Translation functionality disabled.'
      );
    }
  }

  storeOriginalTexts() {
    const elementsToStore = document.querySelectorAll(
      'h1, h2, h3, h4, h5, h6, .nav-link, .status-text, .widget h3, .stock-selector-label'
    );

    elementsToStore.forEach((element) => {
      if (!element.getAttribute('data-original-text')) {
        if (element.classList.contains('nav-link')) {
          const iconSpan = element.querySelector('.nav-icon');
          const textOnly = element.textContent
            .replace(iconSpan ? iconSpan.textContent : '', '')
            .trim();
          element.setAttribute('data-original-text', textOnly);
        } else {
          element.setAttribute(
            'data-original-text',
            element.textContent.trim()
          );
        }
      }
    });
  }

  setLanguage(lang) {
    if (!this.translations[lang]) return;

    this.currentLang = lang;

    // Update button text
    const langNames = {
      en: 'EN',
      ko: 'Korean',
      ja: '日本語',
      zh: '中文',
      es: 'ES',
      fr: 'FR',
      de: 'DE',
    };

    const translateBtn = document.getElementById('translate-btn');
    if (translateBtn) {
      translateBtn.innerHTML = `<span>🌐</span> ${langNames[lang]}`;
    }

    // Translate all elements
    this.translatePage();

    // Save preference
    try {
      localStorage.setItem('preferredLanguage', lang);
    } catch (e) {
      console.warn('Unable to save language preference:', e);
    }
  }

  translatePage() {
    const translations = this.translations[this.currentLang];

    // Translate by stored original text
    const elementsToTranslate = document.querySelectorAll(
      'h1, h2, h3, h4, h5, h6, .nav-link, .status-text, .widget h3, .stock-selector-label, .chart-description'
    );

    elementsToTranslate.forEach((element) => {
      const originalText =
        element.getAttribute('data-original-text') ||
        element.textContent.trim();

      // Store original text if not already stored
      if (!element.getAttribute('data-original-text')) {
        if (element.classList.contains('nav-link')) {
          const iconSpan = element.querySelector('.nav-icon');
          const textOnly = element.textContent
            .replace(iconSpan ? iconSpan.textContent : '', '')
            .trim();
          element.setAttribute('data-original-text', textOnly);
        } else {
          element.setAttribute(
            'data-original-text',
            element.textContent.trim()
          );
        }
      }

      // Translate using original text
      if (element.classList.contains('nav-link')) {
        const iconSpan = element.querySelector('.nav-icon');
        const translatedText = translations[originalText] || originalText;
        element.innerHTML =
          (iconSpan ? iconSpan.outerHTML + ' ' : '') + translatedText;
      } else if (translations[originalText]) {
        element.textContent = translations[originalText];
      }
    });

    // Translate specific elements by their text content
    this.translateSpecificElements();
  }

  translateSpecificElements() {
    const translations = this.translations[this.currentLang];

    // Translate chart description dynamically
    const chartDesc = document.getElementById('prediction-chart-description');
    if (chartDesc && translations['Select Stock for Chart:']) {
      // This will be updated when stock changes, but set a default translation key
      chartDesc.setAttribute('data-translate-key', 'chart-description');
    }
  }

  // Load saved language preference
  loadSavedLanguage() {
    try {
      const saved = localStorage.getItem('preferredLanguage');
      if (saved && this.translations[saved]) {
        this.setLanguage(saved);
      }
    } catch (e) {
      console.warn('Unable to load saved language preference:', e);
    }
  }
}

// Initialize translator when DOM is loaded
document.addEventListener('DOMContentLoaded', () => {
  try {
    window.translator = new SimpleTranslator();
    // Load saved language after a short delay to ensure all elements are rendered
    setTimeout(() => {
      if (
        window.translator &&
        typeof window.translator.loadSavedLanguage === 'function'
      ) {
        window.translator.loadSavedLanguage();
      }
    }, 500); // Increased delay to ensure all elements are loaded
  } catch (error) {
    console.error('Failed to initialize translator:', error);
  }
});
