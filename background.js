chrome.runtime.onMessage.addListener((req) => {
    if (req.action === "scanSubjectsManual") {
        chrome.tabs.query({ url: "*://avatar.skyeng.ru/*" }, (tabs) => {
            tabs.forEach(t => chrome.tabs.sendMessage(t.id, { action: "manualScan" }));
        });
    }
});
