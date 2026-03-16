// Quiz Agrishow 2026 - Panther Lubrificantes

const GOOGLE_SCRIPT_URL = 'https://script.google.com/macros/s/AKfycbx3R7gV0ftbYoHDIK694UuUVOnjlU8WdkK1-3j5JDtWSZ-8MzyDdPxhAxtCM_O5ymA/exec';

let stats = {
    players: parseInt(localStorage.getItem('agriPlayers') || '0', 10),
    prizes: parseInt(localStorage.getItem('agriPrizes') || '0', 10)
};

let participants = JSON.parse(localStorage.getItem('agriParticipants') || '[]');
function saveParticipants() {
    localStorage.setItem('agriParticipants', JSON.stringify(participants));
}

let currentSessionId = null;

const TOTAL_QUESTIONS = 7;
const WIN_SCORE = 5;

const questionsBank = [
    {
        q: "Qual e a principal funcao de um lubrificante Panther no motor?",
        answers: ["Aumentar o tamanho do motor", "Reduzir o atrito entre as pecas", "Colorir o motor", "Substituir o combustivel"],
        correct: 1
    },
    {
        q: "A Panther Lubrificantes desenvolve produtos para quais tipos de aplicacao?",
        answers: ["Apenas carros de passeio", "Apenas motos", "Linha automotiva, motos, pesados e agricola", "Apenas maquinas agricolas"],
        correct: 2
    },
    {
        q: "Os lubrificantes Panther sao desenvolvidos para ajudar a:",
        answers: ["Reduzir o desgaste do motor", "Proteger os componentes internos", "Melhorar o desempenho dos equipamentos", "Todas as alternativas"],
        correct: 3
    },
    {
        q: "Para equipamentos agricolas como tratores e colheitadeiras, e importante usar lubrificantes que:",
        answers: ["Tenham qualidade e especificacao correta", "Sejam apenas mais baratos", "Qualquer tipo de oleo serve", "Nao precisam ser trocados"],
        correct: 0
    },
    {
        q: "Utilizar um lubrificante de qualidade, como os da Panther, ajuda a:",
        answers: ["Aumentar a vida util do equipamento", "Reduzir manutencao inesperada", "Melhorar a eficiencia da maquina", "Todas as alternativas"],
        correct: 3
    },
    {
        q: "O que indica a viscosidade de um oleo lubrificante?",
        answers: ["A cor do oleo", "A espessura ou fluidez do oleo", "O cheiro do oleo", "O tamanho da embalagem"],
        correct: 1
    },
    {
        q: "Qual tipo de motor e mais comum em tratores agricolas?",
        answers: ["Motor eletrico", "Motor diesel", "Motor a gas", "Motor hibrido"],
        correct: 1
    },
    {
        q: "Lubrificantes Panther podem ser usados em:",
        answers: ["Motores", "Sistemas hidraulicos", "Transmissoes", "Todas as alternativas"],
        correct: 3
    },
    {
        q: "Em operacoes agricolas intensas, o lubrificante precisa:",
        answers: ["Ser trocado quando escurece", "Ter especificacao correta", "Durar para sempre", "Ser qualquer tipo"],
        correct: 1
    },
    {
        q: "Durante a colheita, parar uma maquina por problema mecanico pode:",
        answers: ["Nao causar impacto", "Atrasar toda a operacao", "Nao fazer diferenca", "Melhorar a producao"],
        correct: 1
    }
];

const PRIZES = [
    "Caneta",
    "Chaveiro Trena",
    "Caneta",
    "Chaveiro Trena",
    "Chapeu",
    "Bone",
    "Squeeze",
    "Caneta",
    "Chaveiro Trena",
    "Caneta",
    "Chaveiro Trena",
    "Chapeu",
    "Bone",
    "Squeeze"
];

let playerName = "";
let playerPhone = "";
let currentQs = [];
let qIndex = 0;
let score = 0;
let shuffledAnswers = [];
let isLocked = false;
let autoResetTimer = null;
let wonPrizeName = "";

let wheelAngle = 0;
let wheelSpun = false;

function normalizeParticipantRecord(record) {
    return {
        id: record.id,
        name: record.name || '',
        phone: record.phone || '',
        date: record.date || '',
        time: record.time || '',
        score: record.score !== null && record.score !== undefined ? record.score : '',
        prize: record.prize || '-',
        code: record.code || '-'
    };
}

async function syncParticipantToGoogleSheets(record) {
    if (!GOOGLE_SCRIPT_URL) {
        return;
    }

    try {
        await fetch(GOOGLE_SCRIPT_URL, {
            method: 'POST',
            headers: {
                'Content-Type': 'text/plain;charset=utf-8'
            },
            body: JSON.stringify({
                action: 'upsertParticipant',
                participant: normalizeParticipantRecord(record)
            })
        });
    } catch (error) {
        console.error('Erro ao enviar participante para Google Sheets:', error);
    }
}

function showScreen(id) {
    document.querySelectorAll('.screen').forEach((screen) => screen.classList.remove('active'));
    const element = document.getElementById('screen-' + id) || document.getElementById(id);
    if (element) {
        element.classList.add('active');
    }
}

function goToRegister() {
    showScreen('register');
}

function submitRegister() {
    const nameEl = document.getElementById('input-name');
    const phoneEl = document.getElementById('input-phone');
    const errEl = document.getElementById('form-error');

    playerName = nameEl.value.trim();
    playerPhone = phoneEl.value.trim();

    if (!playerName || !playerPhone) {
        errEl.classList.remove('hide');
        return;
    }

    errEl.classList.add('hide');
    startQuiz();
}

document.getElementById('input-phone').addEventListener('input', function () {
    this.value = this.value.replace(/[^\d\s()\-+]/g, '');
});

function startQuiz() {
    clearInterval(autoResetTimer);
    score = 0;
    qIndex = 0;

    const bank = [...questionsBank].sort(() => Math.random() - 0.5);
    currentQs = bank.slice(0, TOTAL_QUESTIONS);

    stats.players += 1;
    localStorage.setItem('agriPlayers', String(stats.players));

    const now = new Date();
    currentSessionId = Date.now();
    participants.push({
        id: currentSessionId,
        name: playerName,
        phone: playerPhone,
        date: now.toLocaleDateString('pt-BR'),
        time: now.toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' }),
        score: null,
        prize: '-',
        code: '-'
    });
    saveParticipants();
    syncParticipantToGoogleSheets(participants[participants.length - 1]);

    showScreen('quiz');
    loadQuestion();
}

function loadQuestion() {
    isLocked = false;
    const question = currentQs[qIndex];
    const pct = (qIndex / TOTAL_QUESTIONS) * 100;

    document.getElementById('progress-bar').style.width = pct + '%';
    document.getElementById('question-counter').textContent = `${qIndex + 1} / ${TOTAL_QUESTIONS}`;
    document.getElementById('question-text').textContent = question.q;

    let options = question.answers.map((text, index) => ({
        text,
        isCorrect: index === question.correct
    }));

    options = options.sort(() => Math.random() - 0.5);
    shuffledAnswers = options;

    document.querySelectorAll('.btn-answer').forEach((button, index) => {
        button.textContent = options[index].text;
        button.className = 'btn-answer';
        button.disabled = false;
    });
}

function selectAnswer(index) {
    if (isLocked) {
        return;
    }

    isLocked = true;
    const chosen = shuffledAnswers[index];
    document.getElementById('ans-' + index).classList.add('selected');
    document.querySelectorAll('.btn-answer').forEach((button) => {
        button.disabled = true;
    });

    if (chosen.isCorrect) {
        score += 1;
    }

    setTimeout(() => {
        qIndex += 1;
        if (qIndex < TOTAL_QUESTIONS) {
            loadQuestion();
        } else {
            showResults();
        }
    }, 1200);
}

function showResults() {
    const record = participants.find((item) => item.id === currentSessionId);
    if (record) {
        record.score = score;
        saveParticipants();
        syncParticipantToGoogleSheets(record);
    }

    if (score >= WIN_SCORE) {
        document.getElementById('win-score').textContent = score;
        document.getElementById('win-name').textContent = playerName.split(' ')[0];
        showScreen('win');
    } else {
        document.getElementById('lose-score').textContent = score;
        showScreen('lose');
    }
}

function showRoulette() {
    wheelSpun = false;
    const canvas = document.getElementById('wheel-canvas');
    canvas.style.transition = 'none';
    canvas.style.transform = 'rotate(0deg)';
    wheelAngle = 0;

    document.getElementById('prize-reveal').classList.add('hidden');
    document.getElementById('prize-popup').classList.add('hidden');
    document.getElementById('btn-spin').classList.remove('hidden');
    document.getElementById('spin-status').innerHTML = '&nbsp;';
    document.getElementById('confetti-container').innerHTML = '';

    const firstName = playerName ? playerName.split(' ')[0] : 'Visitante';
    document.getElementById('roulette-player-name').textContent = `Boa sorte, ${firstName}!`;

    drawWheel(canvas);
    showScreen('roulette');
}

function drawWheel(canvas) {
    const ctx = canvas.getContext('2d');
    const cx = canvas.width / 2;
    const cy = canvas.height / 2;
    const radius = cx - 40;
    const total = PRIZES.length;
    const arc = (2 * Math.PI) / total;
    const microArc = arc / 3;

    ctx.clearRect(0, 0, canvas.width, canvas.height);

    const outerRing = ctx.createRadialGradient(cx, cy, radius + 8, cx, cy, radius + 34);
    outerRing.addColorStop(0, '#2a2a2a');
    outerRing.addColorStop(0.55, '#111111');
    outerRing.addColorStop(1, '#050505');
    ctx.beginPath();
    ctx.arc(cx, cy, radius + 32, 0, Math.PI * 2);
    ctx.fillStyle = outerRing;
    ctx.fill();

    const innerRing = ctx.createRadialGradient(cx, cy, radius - 10, cx, cy, radius + 18);
    innerRing.addColorStop(0, '#303030');
    innerRing.addColorStop(1, '#171717');
    ctx.beginPath();
    ctx.arc(cx, cy, radius + 16, 0, Math.PI * 2);
    ctx.fillStyle = innerRing;
    ctx.fill();

    PRIZES.forEach((prize, index) => {
        const startAngle = index * arc - Math.PI / 2;
        const middle = startAngle + arc / 2;
        const palette = index % 2 === 0
            ? ['#ffb067', '#ff7a24', '#e64b10']
            : ['#3a3a3a', '#171717', '#050505'];

        for (let step = 0; step < 3; step += 1) {
            const subStart = startAngle + microArc * step;
            const subEnd = subStart + microArc;
            const subMiddle = subStart + microArc / 2;
            const gradient = ctx.createLinearGradient(
                cx + Math.cos(subMiddle) * radius * 0.18,
                cy + Math.sin(subMiddle) * radius * 0.18,
                cx + Math.cos(subMiddle) * radius,
                cy + Math.sin(subMiddle) * radius
            );

            gradient.addColorStop(0, palette[0]);
            gradient.addColorStop(0.42, palette[1]);
            gradient.addColorStop(1, palette[2]);

            ctx.beginPath();
            ctx.moveTo(cx, cy);
            ctx.arc(cx, cy, radius, subStart, subEnd);
            ctx.closePath();
            ctx.fillStyle = gradient;
            ctx.fill();
        }

        ctx.save();
        ctx.translate(cx, cy);
        ctx.rotate(middle);
        ctx.textAlign = 'right';
        ctx.textBaseline = 'middle';
        ctx.font = '800 36px Outfit, sans-serif';
        ctx.fillStyle = '#ffffff';
        ctx.shadowColor = 'rgba(0,0,0,0.3)';
        ctx.shadowBlur = 5;
        ctx.fillText(prize, radius - 62, 0);
        ctx.restore();
    });

    ctx.beginPath();
    ctx.arc(cx, cy, radius + 6, 0, 2 * Math.PI);
    ctx.strokeStyle = '#ff6b1a';
    ctx.lineWidth = 6;
    ctx.stroke();

    const dotCount = total * 12;
    for (let index = 0; index < dotCount; index += 1) {
        const angle = (index / dotCount) * 2 * Math.PI - Math.PI / 2;
        const dx = cx + (radius + 20) * Math.cos(angle);
        const dy = cy + (radius + 20) * Math.sin(angle);
        ctx.beginPath();
        ctx.arc(dx, dy, index % 3 === 0 ? 4 : 2, 0, 2 * Math.PI);
        ctx.fillStyle = index % 3 === 0 ? '#ff7a24' : 'rgba(255,255,255,0.16)';
        ctx.fill();
    }

    const sparkleCount = total * 4;
    for (let index = 0; index < sparkleCount; index += 1) {
        const angle = (index / sparkleCount) * 2 * Math.PI - Math.PI / 2;
        const x1 = cx + (radius - 8) * Math.cos(angle);
        const y1 = cy + (radius - 8) * Math.sin(angle);
        const x2 = cx + (radius - 24) * Math.cos(angle);
        const y2 = cy + (radius - 24) * Math.sin(angle);
        ctx.beginPath();
        ctx.moveTo(x1, y1);
        ctx.lineTo(x2, y2);
        ctx.strokeStyle = index % 2 === 0 ? 'rgba(255,255,255,0.15)' : 'rgba(255,122,36,0.22)';
        ctx.lineWidth = 1.5;
        ctx.stroke();
    }
}

function spinWheel() {
    if (wheelSpun) {
        return;
    }

    wheelSpun = true;
    document.getElementById('btn-spin').classList.add('hidden');
    document.getElementById('spin-status').innerHTML = '&nbsp;';

    const total = PRIZES.length;
    const sliceDeg = 360 / total;
    const winIdx = Math.floor(Math.random() * total);
    const targetAngle = -(winIdx * sliceDeg + sliceDeg / 2);
    const totalRotation = wheelAngle + (360 * 8) + targetAngle - (wheelAngle % 360);

    const canvas = document.getElementById('wheel-canvas');
    canvas.style.transition = 'transform 4s ease-out';
    canvas.style.transform = `rotate(${totalRotation}deg)`;
    wheelAngle = totalRotation;

    setTimeout(() => {
        wonPrizeName = PRIZES[winIdx];
        document.getElementById('prize-name-display').textContent = wonPrizeName;
        document.getElementById('prize-popup-name').textContent = wonPrizeName;
        document.getElementById('prize-reveal').classList.remove('hidden');
        document.getElementById('prize-popup').classList.remove('hidden');

        launchConfetti();

        stats.prizes += 1;
        localStorage.setItem('agriPrizes', String(stats.prizes));
    }, 4100);
}

function launchConfetti() {
    const container = document.getElementById('confetti-container');
    const colors = ['#E84011', '#FF5C2E', '#FFFFFF', '#E0E0E0', '#C2330D', '#F5F5F5'];
    const shapes = ['square', 'circle', 'strip'];

    for (let index = 0; index < 28; index += 1) {
        setTimeout(() => {
            const piece = document.createElement('div');
            const color = colors[Math.floor(Math.random() * colors.length)];
            const shape = shapes[Math.floor(Math.random() * shapes.length)];
            const duration = 1.5 + Math.random() * 0.9;

            piece.className = `confetti-piece ${shape}`;
            piece.style.cssText = `
                left:${Math.random() * 100}%;
                background:${color};
                animation-duration:${duration}s;
                animation-delay:${Math.random() * 0.2}s;
                transform:rotate(${Math.random() * 360}deg);
            `;
            container.appendChild(piece);
            setTimeout(() => piece.remove(), (duration + 0.6) * 1000);
        }, index * 22);
    }
}

function showCode() {
    const random = Math.floor(1000 + Math.random() * 9000);
    const code = `AGRISHOW-${random}`;
    document.getElementById('rescue-code').textContent = code;
    document.getElementById('code-prize-name').textContent = wonPrizeName;

    const record = participants.find((item) => item.id === currentSessionId);
    if (record) {
        record.prize = wonPrizeName;
        record.code = code;
        saveParticipants();
        syncParticipantToGoogleSheets(record);
    }

    showScreen('code');
    startAutoReset();
}

function startAutoReset() {
    let seconds = 10;
    document.getElementById('timer-sec').textContent = seconds;
    autoResetTimer = setInterval(() => {
        seconds -= 1;
        document.getElementById('timer-sec').textContent = seconds;
        if (seconds <= 0) {
            clearInterval(autoResetTimer);
            resetApp();
        }
    }, 1000);
}

function resetApp() {
    clearInterval(autoResetTimer);
    document.getElementById('input-name').value = '';
    document.getElementById('input-phone').value = '';
    showScreen('home');
}

function testRoulette() {
    clearInterval(autoResetTimer);
    playerName = 'Teste';
    showRoulette();
}

let tapCount = 0;
let tapClear = null;

document.getElementById('admin-trigger').addEventListener('click', () => {
    tapCount += 1;
    clearTimeout(tapClear);
    if (tapCount >= 5) {
        tapCount = 0;
        openAdmin();
    } else {
        tapClear = setTimeout(() => {
            tapCount = 0;
        }, 1200);
    }
});

function openAdmin() {
    document.getElementById('stat-players').textContent = stats.players;
    document.getElementById('stat-prizes').textContent = stats.prizes;
    const panel = document.getElementById('admin-panel');
    panel.classList.remove('hide');
    panel.classList.add('active');
}

function closeAdmin() {
    const panel = document.getElementById('admin-panel');
    panel.classList.add('hide');
    panel.classList.remove('active');
}

function resetStats() {
    if (!confirm('Zerar todos os dados? Esta acao nao pode ser desfeita.')) {
        return;
    }

    stats = { players: 0, prizes: 0 };
    participants = [];
    localStorage.setItem('agriPlayers', '0');
    localStorage.setItem('agriPrizes', '0');
    saveParticipants();
    openAdmin();
}

function exportCSV() {
    if (participants.length === 0) {
        alert('Nenhum participante registrado.');
        return;
    }

    const header = ['Nome', 'Telefone', 'Data', 'Hora', 'Acertos', 'Premio', 'Codigo'];
    const rows = participants.map((item) => [
        `"${(item.name || '').replace(/"/g, '""')}"`,
        `"${(item.phone || '').replace(/"/g, '""')}"`,
        item.date || '',
        item.time || '',
        item.score !== null ? item.score : '-',
        `"${(item.prize || '-').replace(/"/g, '""')}"`,
        item.code || '-'
    ]);

    const csv = [header.join(';'), ...rows.map((row) => row.join(';'))].join('\n');
    const blob = new Blob(['\uFEFF' + csv], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    const now = new Date();
    const ts = `${now.getFullYear()}${String(now.getMonth() + 1).padStart(2, '0')}${String(now.getDate()).padStart(2, '0')}_${String(now.getHours()).padStart(2, '0')}${String(now.getMinutes()).padStart(2, '0')}`;

    link.href = url;
    link.download = `agrishow_participantes_${ts}.csv`;
    link.click();
    URL.revokeObjectURL(url);
}
