document.addEventListener('DOMContentLoaded', () => {
    const startBtn = document.getElementById('startScan');
    const clearBtn = document.getElementById('clearData');
    const fontSel = document.getElementById('fontSelect');
    const toggleStats = document.getElementById('toggleStats');
    const toggleNews = document.getElementById('toggleNews');
    // ИСПРАВЛЕНО: Добавил эту строку
    const toggleNative = document.getElementById('toggleNative');
    const status = document.getElementById('status');

    // Вставка версии из manifest.json
    const verSpan = document.getElementById('ver');
    if (verSpan) {
        verSpan.innerText = `v${chrome.runtime.getManifest().version}`;
    }

    // ИСПРАВЛЕНО: Добавил 'showNative' в массив ключей
    // Загрузка настроек
    chrome.storage.local.get(['selectedFont', 'showStats', 'showNews', 'showNative'], (res) => {
        if (res.selectedFont) fontSel.value = res.selectedFont;
        toggleStats.checked = res.showStats !== false;
        toggleNews.checked = res.showNews !== false; 
        // ИСПРАВЛЕНО: Добавил эту строку
        toggleNative.checked = res.showNative !== false;
    });

    // Очистка данных без подтверждения + автоматическая перезагрузка
    clearBtn.onclick = () => {
        //  Очищаем хранилище
        chrome.storage.local.set({ 'skyData': {} }, () => {
            
            //  Ищем активную вкладку и перезагружаем её
            chrome.tabs.query({ active: true, currentWindow: true }, (tabs) => {
                if (tabs[0]) {
                    chrome.tabs.reload(tabs[0].id);
                }
            });

            //  Визуальный отклик в самом попапе
            status.innerHTML = `<span style="color: #FF4D4D;">🪄 Данные стерты</span>`;
            
            // Окно НЕ закрываем, просто убираем надпись через 3 секунды
            setTimeout(() => { status.innerHTML = ''; }, 3000);
        });
    };

    // Запуск сканирования (сигнал в background.js)
    startBtn.onclick = () => {
        chrome.runtime.sendMessage({ action: "scansSubjectsManual" });
        status.innerHTML = `<span style="color: #3291FF;">🚀 Сбор запущен (20 сек)...</span>`;
    };

    // ПЕРЕКЛЮЧАТЕЛИ
    toggleStats.onchange = () => {
        chrome.storage.local.set({ 'showStats': toggleStats.checked }, refreshContent);
    };

    toggleNews.onchange = () => {
        chrome.storage.local.set({ 'showNews': toggleNews.checked }, refreshContent);
    };

    // ИСПРАВЛЕНО: Добавил этот обработчик
    toggleNative.onchange = () => {
        chrome.storage.local.set({ 'showNative': toggleNative.checked }, refreshContent);
    };

    fontSel.onchange = () => {
        const val = fontSel.value;
        chrome.storage.local.set({ 'selectedFont': val }, () => {
            chrome.tabs.query({active: true, currentWindow: true}, (tabs) => {
                if (tabs[0]) chrome.tabs.sendMessage(tabs[0].id, { action: "changeFont", font: val });
            });
        });
    };

    function refreshContent() {
        chrome.tabs.query({active: true, currentWindow: true}, (tabs) => {
            if (tabs[0]) chrome.tabs.sendMessage(tabs[0].id, { action: "refreshUI" });
        });
    }
});