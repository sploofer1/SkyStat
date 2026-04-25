let isProcessing = false;
let autoFetchTimer = null;

const fontLink = document.createElement('link');
fontLink.rel = 'stylesheet';
fontLink.href = 'https://fonts.googleapis.com/css2?family=Inter:wght@400;700&family=Comfortaa:wght@400;700&family=Kelly+Slab&family=Neucha&family=Caveat:wght@700&display=swap';
document.head.appendChild(fontLink);

const styleTag = document.createElement('style');
styleTag.id = "sky-font-style";
document.head.appendChild(styleTag);

const nativeStyleTag = document.createElement('style');
nativeStyleTag.id = "sky-native-style";
document.head.appendChild(nativeStyleTag);

const rabbitStyleTag = document.createElement('style');
rabbitStyleTag.id = "sky-rabbit-style";
document.head.appendChild(rabbitStyleTag);

const DOT_LABELS = {
    lessonMetric:     'Уроки',
    homeworkMetric:   'Домашки',
    courseWorkMetric: 'Курсовые',
    testsMetric:      'Тесты',
    journalMetric:    'Журнал',
    aiTeacherLessons: 'Уроки AI',
    stt:              'STT, минут',
    drilling:         'Drilling',
    sr:               'SR',
    tests:            'Тесты',
    cefr:             'CEFR',
    exam:             'Экзамен',
    score:            'Балл',
};

const SUBJECT_NAMES = {
    lessons_about_main:   'Курс Сингулярности',
    soft_skills:          'Soft Skills',
    career_guidance:      'Профориентация',
    python:               'Python',
    english:              'Английский',
    math:                 'Математика',
    onboarding:           'Онбординг',
    managment_of_project: 'Менеджмент проектов',
    literature:           'Литература',
    chemistry:            'Химия',
    biology:              'Биология',
    russian:              'Русский язык',
    basics_of_security:   'Основы безопасности',
    geography:            'География',
    physics:              'Физика',
    social_studies:       'Обществознание',
    history:              'История',
};

const LEVEL_VALUE = { green: 0, yellow: 1, red: 2 };

function gradeEmoji(grade) {
    const g = parseInt(grade);
    if (isNaN(g)) return { emoji: '❓', color: '#99AABB' };
    if (g === 5) return { emoji: '🌟', color: '#2ecc71' };
    if (g === 4) return { emoji: '👍', color: '#2ecc71' };
    if (g === 3) return { emoji: '😬', color: '#f39c12' };
    if (g === 2) return { emoji: '💀', color: '#FF4D4D' };
    return { emoji: '❓', color: '#99AABB' };
}

function automatEmoji(status) {
    if (status === '5') return { emoji: '🏆', color: '#2ecc71' };
    if (status === '4') return { emoji: '✅', color: '#2ecc71' };
    if (status === '3') return { emoji: '😅', color: '#f39c12' };
    if (status === 'pass') return { emoji: '🎫', color: '#f39c12' };
    return { emoji: '😨', color: '#FF4D4D' };
}

function applyFont(fontName) {
    if (!fontName || fontName === 'inherit') {
        styleTag.innerHTML = '';
    } else {
        styleTag.innerHTML = `
    p, span, a, h1, h2, h3, h4, h5, h6, li, td, th, label, button,
    input, textarea, select, div:not([class*="icon"]):not([class*="Icon"]) {
        font-family: ${fontName} !important;
    }
    .sky-info-row div { font-family: 'Inter', sans-serif !important; }
`;
    }
}

function applyRabbit(hide) {
    rabbitStyleTag.innerHTML = hide
        ? 'background-flashlight { display: none !important; }'
        : '';
}

async function apiFetch(url) {
    try {
        const resp = await fetch(url, {
            method: 'GET',
            credentials: 'include',
            headers: {
                'accept': 'application/json, text/plain, */*',
                'origin': 'https://avatar.skyeng.ru',
                'referer': 'https://avatar.skyeng.ru/',
            }
        });
        if (!resp.ok) { console.warn('[SkyPlus] API error:', resp.status, url); return null; }
        return await resp.json();
    } catch (e) {
        console.warn('[SkyPlus] fetch error:', e); return null;
    }
}

function parseAPIResponse(json) {
    const skyData = {};
    const allSubjects = [
        ...(json.mainSubjects || []),
        ...(json.lowPrioritySubjects?.subjects || []),
    ];
    allSubjects.forEach(subject => {
        const name = SUBJECT_NAMES[subject.subjectCode] || subject.subjectCode;
        skyData[name] = {};
        if (subject.debts !== null && subject.debts !== undefined) {
            skyData[name]['_debts'] = subject.debts.count;
        }
        if (subject.subjectCode === 'math') return;
        (subject.dots || []).forEach(dot => {
            const label = DOT_LABELS[dot.name] || dot.name;
            skyData[name][label] = LEVEL_VALUE[dot.level] ?? 0;
        });
    });
    return skyData;
}

function parseMathData(mathJson, skyData) {
    const name = 'Математика';
    if (!skyData[name]) skyData[name] = {};
    const lastGrade = (mathJson.lastGrades || []).find(g => g !== 'N' && g !== null);
    if (lastGrade !== undefined) skyData[name]['_lastGrade'] = lastGrade;
    const autoStatus = mathJson.examsPrepareCurrentState?.status;
    if (autoStatus !== undefined) skyData[name]['_automat'] = autoStatus;
}

async function collectData(source = 'auto') {
    const [json, mathJson] = await Promise.all([
        apiFetch('https://edu-avatar.skyeng.ru/api/v1/college-student-cabinet/single-student-account'),
        apiFetch('https://edu-avatar.skyeng.ru/api/v1/college-student-cabinet/single-student-account/math'),
    ]);
    if (!json) return;
    const skyData = parseAPIResponse(json);
    if (mathJson) parseMathData(mathJson, skyData);
    await chrome.storage.local.set({ skyData, lastUpdated: Date.now(), lastSource: source });
    console.log(`[SkyPlus] Обновлено (${source})`);
    injectData();
}

function startAutoFetch() {
    if (autoFetchTimer) clearInterval(autoFetchTimer);
    collectData('auto');
    autoFetchTimer = setInterval(() => collectData('auto'), 5 * 60 * 1000);
}

// Плашка в стиле сайта 
function makeBadge(emoji, text, type) {
    // type: 'good' | 'warn' | 'bad' | 'info'
    const styles = {
        good: { bg: 'rgba(0,210,110,0.12)', border: 'rgba(0,210,110,0.35)', color: '#00d26e' },
        warn: { bg: 'rgba(255,185,0,0.12)',  border: 'rgba(255,185,0,0.35)',  color: '#ffb900' },
        bad:  { bg: 'rgba(255,60,60,0.12)',  border: 'rgba(255,60,60,0.35)',  color: '#ff4d4d' },
        info: { bg: 'rgba(255,255,255,0.06)', border: 'rgba(255,255,255,0.12)', color: '#aaaaaa' },
    };
    const s = styles[type] || styles.info;
    const b = document.createElement('div');
    b.style.cssText = `
        display: inline-flex; align-items: center; gap: 5px;
        background: ${s.bg};
        color: ${s.color};
        padding: 3px 10px;
        border-radius: 20px;
        font-size: 11px;
        font-weight: 600;
        border: 1px solid ${s.border};
        letter-spacing: 0.2px;
        font-family: Inter, sans-serif;
        pointer-events: none;
        white-space: nowrap;
    `;
    b.innerHTML = `<span style="font-size:13px">${emoji}</span><span>${text}</span>`;
    return b;
}

function injectData() {
    chrome.storage.local.get(['skyData', 'showStats', 'showNews', 'showNative', 'showRabbit'], (res) => {
        // Нативные кружки
        nativeStyleTag.innerHTML = (res.showNative === false)
            ? '.debts-badge { display: none !important; }' : '';

        // Зайчик
        applyRabbit(res.showRabbit === false);

        // Новости
        const newsBlock = document.querySelector('student-dashboard-news');
        if (newsBlock) newsBlock.style.display = (res.showNews !== false) ? '' : 'none';

        if (!location.href.includes('/student') || isProcessing) return;

        const data = res.skyData;
        const visible = res.showStats !== false;

        if (!visible || !data) {
            document.querySelectorAll('.sky-info-row').forEach(r => r.remove());
            return;
        }

        isProcessing = true;
        document.querySelectorAll('.speech-title, .s-speech-title, .subject-title, .title, .name').forEach(el => {
            const name = el.innerText.trim();
            if (!data[name] || el.offsetParent === null) return;
            if (el.parentElement.querySelector('.sky-info-row')) return;
            if (el.parentElement.classList.contains('content') || el.parentElement.tagName === 'BODY') return;

            const subjectData = data[name];
            const row = document.createElement('div');
            row.className = 'sky-info-row';
            row.style.cssText = 'margin-top: 10px; display: flex; gap: 6px; flex-wrap: wrap;';

            if (name === 'Математика') {
                const lastGrade = subjectData['_lastGrade'];
                const automat = subjectData['_automat'];
                if (lastGrade !== undefined) {
                    const { emoji } = gradeEmoji(lastGrade);
                    const g = parseInt(lastGrade);
                    const t = g >= 4 ? 'good' : g === 3 ? 'warn' : 'bad';
                    row.appendChild(makeBadge(emoji, `Последняя: ${lastGrade}`, t));
                }
                if (automat !== undefined) {
                    const { emoji } = automatEmoji(automat);
                    const label = automat === 'pass' ? 'Автомат: зачёт' : `Автомат: ${automat}`;
                    const a = parseInt(automat);
                    const t = a >= 4 ? 'good' : a === 3 ? 'warn' : 'bad';
                    row.appendChild(makeBadge(emoji, label, t));
                }
            } else {
                Object.entries(subjectData).forEach(([type, val]) => {
                    if (type.startsWith('_')) return;
                    const isGood = val <= 0;
                    const isWarn = val === 1;
                    const badgeType = isGood ? 'good' : isWarn ? 'warn' : 'bad';
                    const emoji = isGood ? '✅' : isWarn ? '⚠️' : '❌';
                    const debts = subjectData['_debts'];
                    const text = (!isGood && !isWarn && debts) ? `${type}: ${debts}` : type;
                    row.appendChild(makeBadge(emoji, text, badgeType));
                });
            }

            if (row.children.length > 0) el.parentElement.appendChild(row);
        });
        isProcessing = false;
    });
}

chrome.runtime.onMessage.addListener((msg) => {
    if (msg.action === "changeFont") applyFont(msg.font);
    if (msg.action === "refreshUI") injectData();
    if (msg.action === "manualScan") collectData('manual');
});

chrome.storage.local.get(['selectedFont', 'showRabbit'], (res) => {
    applyFont(res.selectedFont);
    applyRabbit(res.showRabbit === false);
});
startAutoFetch();
setInterval(injectData, 1000);
