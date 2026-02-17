let isProcessing = false;

// Шрифты
const fontLink = document.createElement('link');
fontLink.rel = 'stylesheet';
fontLink.href = 'https://fonts.googleapis.com/css2?family=Inter:wght@400;700&family=Comfortaa:wght@400;700&family=Kelly+Slab&family=Neucha&family=Caveat:wght@700&display=swap';
document.head.appendChild(fontLink);

const styleTag = document.createElement('style');
styleTag.id = "sky-font-style";
document.head.appendChild(styleTag);

function applyFont(fontName) {
    if (!fontName || fontName === 'inherit') {
        styleTag.innerHTML = '';
    } else {
        styleTag.innerHTML = `* { font-family: ${fontName} !important; } .sky-info-row div { font-family: 'Inter', sans-serif !important; font-weight: bold; }`;
    }
}

function findElementByText(text) {
    const nodes = document.querySelectorAll('div, span, app-subject-metric-block, .metric-title');
    return Array.from(nodes).find(el => el.textContent.trim() === text);
}

function scrapeData() {
    if (!location.href.includes('/subject')) return;
    const h1 = document.querySelector('h1')?.innerText?.trim() || document.querySelector('.title')?.innerText?.trim();
    if (!h1) return;

    chrome.storage.local.get('skyData', (res) => {
        const data = res.skyData || {};
        if (!data[h1]) data[h1] = {};
        const types = ['Уроки', 'Домашки', 'Курсовые', 'Тесты', 'Интерактивный учебник', 'Журнал', 'Уроки AI', 'STT, минут', 'Drilling', 'SR'];
        let changed = false;
        
        types.forEach(type => {
            const label = findElementByText(type);
            if (label) {
                const cont = label.closest('app-subject-metric-block') || label.parentElement;
                const l = cont.querySelector('.left')?.innerText;
                const r = cont.querySelector('.right')?.innerText;
                if (l && r) {
                    const val = parseInt(r) - parseInt(l);
                    if (data[h1][type] !== val) { data[h1][type] = val; changed = true; }
                }
            }
        });
        if (changed) chrome.storage.local.set({ 'skyData': data });
    });
}

function injectData() {
    chrome.storage.local.get(['skyData', 'showStats', 'showNews'], (res) => {
        // 1. Логика новостей
        const newsBlock = document.querySelector('student-dashboard-news');
        if (newsBlock) {
            newsBlock.style.display = (res.showNews !== false) ? 'block' : 'none';
        }

        // 2. Логика плашек
        if (!location.href.includes('/student') || isProcessing) return;
        
        const data = res.skyData;
        const visible = res.showStats !== false;
        
        if (!visible || !data) {
            document.querySelectorAll('.sky-info-row').forEach(row => row.remove());
            return;
        }

        isProcessing = true;
        // Ищем все заголовки предметов
        document.querySelectorAll('.speech-title, .s-speech-title, .subject-title, .title, .name').forEach(el => {
            const name = el.innerText.trim();
            
            // 1. Проверяем, есть ли данные и ВИДИМ ли элемент на странице (убирает баг внизу)
            if (!data[name] || el.offsetParent === null) return;

            // 2. Проверяем, нет ли уже плашек
            if (el.parentElement.querySelector('.sky-info-row')) return;

            // 3. Исключаем добавление в технические контейнеры (фикс для нижнего края)
            if (el.parentElement.classList.contains('content') || el.parentElement.tagName === 'BODY') return;

            const row = document.createElement('div');
            row.className = 'sky-info-row';
            row.style.cssText = 'margin-top: 8px; display: flex; gap: 6px; flex-wrap: wrap; pointer-events: none;';
            
            Object.keys(data[name]).forEach(type => {
                const b = document.createElement('div');
                const val = data[name][type];
                b.style.cssText = `background: rgba(50, 145, 255, 0.1); color: ${val <= 0 ? '#2ecc71' : '#FFFFFF'}; padding: 4px 10px; border-radius: 8px; font-size: 11px; border: 1px solid ${val <= 0 ? '#2ecc71' : 'rgba(255,255,255,0.15)'}; font-weight: bold;`;
                b.innerText = val <= 0 ? `✅ ${type}` : `${type}: ${val}`;
                row.appendChild(b);
            });
            
            el.parentElement.appendChild(row);
        });
        isProcessing = false;
    });
}

chrome.runtime.onMessage.addListener((msg) => {
    if (msg.action === "changeFont") applyFont(msg.font);
    if (msg.action === "refreshUI") injectData();
});

chrome.storage.local.get(['selectedFont'], (res) => applyFont(res.selectedFont));
setInterval(scrapeData, 2500);
setInterval(injectData, 1000); // Чуть чаще для отзывчивости интерфейса
