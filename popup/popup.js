document.addEventListener('DOMContentLoaded', () => {
    const startBtn = document.getElementById('startScan');
    const clearBtn = document.getElementById('clearData');
    const fontSel = document.getElementById('fontSelect');
    const toggleStats = document.getElementById('toggleStats');
    const toggleNews = document.getElementById('toggleNews');
    const toggleNative = document.getElementById('toggleNative');
    const toggleRabbit = document.getElementById('toggleRabbit');
    const status = document.getElementById('status');
    const lastUpdatedEl = document.getElementById('lastUpdated');

    // Версия
    const verSpan = document.getElementById('ver');
    if (verSpan) verSpan.innerText = `v${chrome.runtime.getManifest().version}`;

    // Загрузка настроек + время последнего обновления
    chrome.storage.local.get(['selectedFont', 'showStats', 'showNews', 'showNative', 'showRabbit', 'lastUpdated'], (res) => {
        if (res.selectedFont) fontSel.value = res.selectedFont;
        toggleStats.checked = res.showStats !== false;
        toggleNews.checked = res.showNews !== false;
        toggleNative.checked = res.showNative !== false;
        toggleRabbit.checked = res.showRabbit !== false;
        showLastUpdated(res.lastUpdated);
    });

    function showLastUpdated(ts) {
        if (!ts) { lastUpdatedEl.innerText = 'Ещё не обновлялось'; return; }
        const d = new Date(ts);
        const pad = n => String(n).padStart(2, '0');
        lastUpdatedEl.innerText = `Обновлено: ${pad(d.getHours())}:${pad(d.getMinutes())}:${pad(d.getSeconds())}`;
    }

    // Обновлять время каждую секунду пока попап открыт
    const ticker = setInterval(() => {
        chrome.storage.local.get(['lastUpdated'], (res) => showLastUpdated(res.lastUpdated));
    }, 1000);
    window.addEventListener('unload', () => clearInterval(ticker));

    // Очистка
    clearBtn.onclick = () => {
        chrome.storage.local.set({ skyData: {} }, () => {
            chrome.tabs.query({ active: true, currentWindow: true }, (tabs) => {
                if (tabs[0]) chrome.tabs.reload(tabs[0].id);
            });
            status.innerHTML = `<span style="color:#FF4D4D;">🪄 Данные стерты</span>`;
            setTimeout(() => { status.innerHTML = ''; }, 3000);
        });
    };

    // Ручное обновление - просто сигнал в content.js, никаких вкладок
    startBtn.onclick = () => {
        chrome.tabs.query({ url: "*://avatar.skyeng.ru/*" }, (tabs) => {
            tabs.forEach(t => chrome.tabs.sendMessage(t.id, { action: "manualScan" }));
        });
        status.innerHTML = `<span style="color:#3291FF;">🔄 Обновляем...</span>`;
        setTimeout(() => { status.innerHTML = ''; }, 3000);
    };

    // Переключатели
    toggleStats.onchange = () => chrome.storage.local.set({ showStats: toggleStats.checked }, refreshContent);
    toggleNews.onchange = () => chrome.storage.local.set({ showNews: toggleNews.checked }, refreshContent);
    toggleNative.onchange = () => chrome.storage.local.set({ showNative: toggleNative.checked }, refreshContent);
    toggleRabbit.onchange = () => chrome.storage.local.set({ showRabbit: toggleRabbit.checked }, refreshContent);

    fontSel.onchange = () => {
        const val = fontSel.value;
        chrome.storage.local.set({ selectedFont: val }, () => {
            chrome.tabs.query({ active: true, currentWindow: true }, (tabs) => {
                if (tabs[0]) chrome.tabs.sendMessage(tabs[0].id, { action: "changeFont", font: val });
            });
        });
    };

    function refreshContent() {
        chrome.tabs.query({ active: true, currentWindow: true }, (tabs) => {
            if (tabs[0]) chrome.tabs.sendMessage(tabs[0].id, { action: "refreshUI" });
        });
    }
});
