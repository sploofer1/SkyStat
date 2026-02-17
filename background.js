const targetLinks = [
    "https://avatar.skyeng.ru/student/subject/prefession?subjectEnum=soft_skills",
    "https://avatar.skyeng.ru/student/subject/prefession?subjectEnum=career_guidance",
    "https://avatar.skyeng.ru/student/subject/prefession?subjectEnum=python",
    "https://avatar.skyeng.ru/student/subject/english",
    "https://avatar.skyeng.ru/student/subject/prefession?subjectEnum=lessons_about_main",
    "https://avatar.skyeng.ru/student/subject/prefession?subjectEnum=onboarding",
    "https://avatar.skyeng.ru/student/subject/prefession?subjectEnum=managment_of_project",
    "https://avatar.skyeng.ru/student/subject/school?subjectEnum=literature",
    "https://avatar.skyeng.ru/student/subject/school?subjectEnum=chemistry",
    "https://avatar.skyeng.ru/student/subject/school?subjectEnum=biology",
    "https://avatar.skyeng.ru/student/subject/school?subjectEnum=russian",
    "https://avatar.skyeng.ru/student/subject/school?subjectEnum=basics_of_security",
    "https://avatar.skyeng.ru/student/subject/school?subjectEnum=geography",
    "https://avatar.skyeng.ru/student/subject/school?subjectEnum=physics",
    "https://avatar.skyeng.ru/student/subject/school?subjectEnum=social_studies",
    "https://avatar.skyeng.ru/student/subject/school?subjectEnum=history"
];

chrome.runtime.onMessage.addListener((req) => {
    if (req.action === "scanSubjectsManual") {
        processQueue(targetLinks);
    }
});

async function processQueue(links) {
    const BATCH_SIZE = 3; 
    for (let i = 0; i < links.length; i += BATCH_SIZE) {
        const batch = links.slice(i, i + BATCH_SIZE);
        const tabs = await Promise.all(batch.map(url => chrome.tabs.create({ url, active: false })));
        await new Promise(r => setTimeout(r, 8000));
        for (const tab of tabs) {
            if (tab.id) chrome.tabs.remove(tab.id);
        }
    }
    chrome.tabs.query({url: "*://avatar.skyeng.ru/*"}, (tabs) => {
        tabs.forEach(t => chrome.tabs.sendMessage(t.id, { action: "refreshUI" }));
    });
}