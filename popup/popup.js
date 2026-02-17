document.addEventListener('DOMContentLoaded', () => {
    const startBtn = document.getElementById('startScan');
    const clearBtn = document.getElementById('clearData');
    const fontSel = document.getElementById('fontSelect');
    const toggleStats = document.getElementById('toggleStats');
    const toggleNews = document.getElementById('toggleNews'); // Новый
    const status = document.getElementById('status');

    // Загрузка настроек
    chrome.storage.local.get(['selectedFont', 'showStats', 'showNews'], (res) => {
        if (res.selectedFont) fontSel.value = res.selectedFont;
        toggleStats.checked = res.showStats !== false;
        toggleNews.checked = res.showNews !== false; // По умолчанию включено
    });

    startBtn.onclick = () => {
        chrome.runtime.sendMessage({ action: "scanSubjectsManual" });
        status.innerHTML = `<span style="color: #3291FF;">🚀 Синхронизация...<br>Пожалуйста, подождите</span>`;
        startBtn.disabled = true;
        startBtn.style.opacity = "0.5";

        setTimeout(() => {
            status.innerHTML = `<span style="color: #2ecc71;">✅ Готово!</span>`;
            startBtn.disabled = false;
            startBtn.style.opacity = "1";
        }, 60000);
    };

    clearBtn.onclick = () => {
        if (confirm("Удалить всю собранную статистику?")) {
            chrome.storage.local.set({ 'skyData': {} }, () => {
                refreshContent();
                status.innerHTML = `<span style="color: #FF4D4D;">🧹 Данные стерты</span>`;
            });
        }
    };

    toggleStats.onchange = () => {
        chrome.storage.local.set({ 'showStats': toggleStats.checked }, refreshContent);
    };

    toggleNews.onchange = () => {
        chrome.storage.local.set({ 'showNews': toggleNews.checked }, refreshContent);
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