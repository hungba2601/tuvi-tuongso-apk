// DOM Elements
const settingsBtn = document.getElementById('settings-btn');
const settingsModal = document.getElementById('settings-modal');
const saveSettingsBtn = document.getElementById('save-settings');
const closeModalBtn = document.getElementById('close-modal');
const apiKeyInput = document.getElementById('api-key');
const themeToggleBtn = document.getElementById('theme-toggle');

const leftPalmBox = document.getElementById('left-palm-box');
const rightPalmBox = document.getElementById('right-palm-box');
const leftPalmInput = document.getElementById('left-palm-input');
const rightPalmInput = document.getElementById('right-palm-input');
const leftPalmPreview = document.getElementById('left-palm-preview');
const rightPalmPreview = document.getElementById('right-palm-preview');

const analyzeBtn = document.getElementById('analyze-btn');
const resultSection = document.getElementById('result-section');
const aiResponseDiv = document.getElementById('ai-response');
const loadingOverlay = document.getElementById('loading-overlay');

// State
let palmImages = {
    left: null,
    right: null
};

// Initialize
document.addEventListener('DOMContentLoaded', () => {
    // Load Theme
    const savedTheme = localStorage.getItem('app_theme') || 'light';
    document.documentElement.setAttribute('data-theme', savedTheme);
    updateThemeIcon(savedTheme);

    const savedApiKey = localStorage.getItem('gemini_api_key');
    if (savedApiKey) {
        apiKeyInput.value = savedApiKey;
    } else {
        settingsModal.classList.remove('hidden');
    }
});

function updateThemeIcon(theme) {
    const icon = themeToggleBtn.querySelector('i');
    if (theme === 'dark') {
        icon.className = 'fas fa-sun';
    } else {
        icon.className = 'fas fa-moon';
    }
}

// Theme Toggle Logic
themeToggleBtn.addEventListener('click', () => {
    let currentTheme = document.documentElement.getAttribute('data-theme');
    let newTheme = currentTheme === 'dark' ? 'light' : 'dark';

    document.documentElement.setAttribute('data-theme', newTheme);
    localStorage.setItem('app_theme', newTheme);
    updateThemeIcon(newTheme);
});

// Settings Modal Logic
settingsBtn.addEventListener('click', () => {
    settingsModal.classList.remove('hidden');
});

closeModalBtn.addEventListener('click', () => {
    settingsModal.classList.add('hidden');
});

saveSettingsBtn.addEventListener('click', () => {
    const key = apiKeyInput.value.trim();
    if (key) {
        localStorage.setItem('gemini_api_key', key);
        settingsModal.classList.add('hidden');
        alert('Đã lưu API Key thành công!');
    } else {
        alert('Vui lòng nhập API Key!');
    }
});

// Image Upload Logic
function handleImageUpload(input, preview, key) {
    const file = input.files[0];
    if (file) {
        const reader = new FileReader();
        reader.onload = (e) => {
            preview.src = e.target.result;
            preview.classList.remove('hidden');
            input.parentElement.querySelector('.placeholder').classList.add('hidden');
            input.parentElement.querySelector('.remove-btn').classList.remove('hidden');
            palmImages[key] = e.target.result.split(',')[1]; // Base64 content
        };
        reader.readAsDataURL(file);
    }
}

leftPalmBox.addEventListener('click', (e) => {
    if (e.target.closest('.remove-btn')) return;
    leftPalmInput.click();
});

rightPalmBox.addEventListener('click', (e) => {
    if (e.target.closest('.remove-btn')) return;
    rightPalmInput.click();
});

leftPalmInput.addEventListener('change', () => handleImageUpload(leftPalmInput, leftPalmPreview, 'left'));
rightPalmInput.addEventListener('change', () => handleImageUpload(rightPalmInput, rightPalmPreview, 'right'));

// Remove Image Logic
document.querySelectorAll('.remove-btn').forEach(btn => {
    btn.addEventListener('click', (e) => {
        e.stopPropagation();
        const box = e.target.closest('.upload-box');
        const input = box.querySelector('input');
        const preview = box.querySelector('img');
        const placeholder = box.querySelector('.placeholder');

        input.value = '';
        preview.src = '';
        preview.classList.add('hidden');
        placeholder.classList.remove('hidden');
        btn.classList.add('hidden');

        const key = input.id.includes('left') ? 'left' : 'right';
        palmImages[key] = null;
    });
});

// Analysis Logic
analyzeBtn.addEventListener('click', async () => {
    const apiKey = localStorage.getItem('gemini_api_key');
    if (!apiKey) {
        alert('Vui lòng cấu hình API Key trong phần cài đặt!');
        settingsModal.classList.remove('hidden');
        return;
    }

    const fullName = document.getElementById('full-name').value.trim();
    const dob = document.getElementById('dob').value;
    const gender = document.getElementById('gender').value;
    const tob = document.getElementById('tob').value;

    if (!fullName || !dob) {
        alert('Vui lòng nhập đầy đủ họ tên và ngày sinh!');
        return;
    }

    if (!palmImages.left || !palmImages.right) {
        alert('Vui lòng tải lên cả hai ảnh chỉ tay (trái và phải)!');
        return;
    }

    loadingOverlay.classList.remove('hidden');
    resultSection.classList.add('hidden');

    try {
        const result = await callGeminiAI(apiKey, {
            fullName, dob, gender, tob,
            images: palmImages
        });

        aiResponseDiv.innerHTML = formatAIResponse(result);
        resultSection.classList.remove('hidden');
        resultSection.scrollIntoView({ behavior: 'smooth' });
    } catch (error) {
        console.error(error);
        alert('Có lỗi xảy ra khi phân tích: ' + error.message);
    } finally {
        loadingOverlay.classList.add('hidden');
    }
});

async function callGeminiAI(apiKey, data) {
    const MODEL_ID = "gemini-2.5-flash";
    const API_URL = `https://generativelanguage.googleapis.com/v1beta/models/${MODEL_ID}:generateContent?key=${apiKey}`;

    const currentYear = new Date().getFullYear();
    const requestBody = {
        system_instruction: {
            parts: [{
                text: `Bạn là bậc thầy Nhân tướng học và Huyền học Á Đông. 
            NHIỆM VỤ: Lập hồ sơ vận mệnh gồm ĐÚNG 8 PHẦN. 
            QUY TẮC: 
            1. Mỗi phần bắt đầu bằng marker: [[PHAN_X]] (X từ 1 đến 8).
            2. Viết chi tiết, chuyên sâu nhưng súc tích (khoảng 300-400 chữ/phần) để đảm bảo không bị ngắt quãng nửa chừng.
            3. Tuyệt đối không dừng lại cho đến khi viết xong [[PHAN_8]].` }]
        },
        contents: [{
            parts: [
                {
                    text: `Lập đại luận giải vận mệnh cho: ${data.fullName}, sinh ngày: ${data.dob}, giới tính: ${data.gender}.
                
                DANH SÁCH 8 PHẦN CẦN HOÀN THÀNH:
                [[PHAN_1]] TỔNG QUAN BẢN MỆNH & NGŨ HÀNH
                [[PHAN_2]] PHÂN TÍCH CHI TIẾT TỪNG LỚI CHỈ TAY
                [[SECTION_3]] CON ĐƯỜNG QUAN LỘ & SỰ NGHIỆP
                [[PHAN_4]] TÌNH DUYÊN, GIA ĐẠO & NHÂN DUYÊN
                [[PHAN_5]] TIÊN TRI SỨC KHỎE THEO NHÂN TƯỚNG
                [[PHAN_6]] TỔNG QUAN VẬN HẠN NĂM ${currentYear}
                [[PHAN_7]] CHI TIẾT BIẾN CỐ 12 THÁNG TRONG NĂM ${currentYear}
                [[PHAN_8]] PHƯƠNG PHÁP CẢI VẬN & LỜI KHUYÊN PHONG THỦY` },
                { inline_data: { mime_type: "image/jpeg", data: data.images.left } },
                { inline_data: { mime_type: "image/jpeg", data: data.images.right } }
            ]
        }],
        generationConfig: {
            temperature: 0.7,
            maxOutputTokens: 8192,
        },
        safetySettings: [
            { category: "HARM_CATEGORY_HARASSMENT", threshold: "BLOCK_NONE" },
            { category: "HARM_CATEGORY_HATE_SPEECH", threshold: "BLOCK_NONE" },
            { category: "HARM_CATEGORY_SEXUALLY_EXPLICIT", threshold: "BLOCK_NONE" },
            { category: "HARM_CATEGORY_DANGEROUS_CONTENT", threshold: "BLOCK_NONE" }
        ]
    };

    const response = await fetch(API_URL, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(requestBody)
    });

    if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error?.message || 'Lỗi kết nối API');
    }

    const json = await response.json();
    if (!json.candidates || !json.candidates[0].content) {
        throw new Error('AI không phản hồi. Hãy thử lại.');
    }
    return json.candidates[0].content.parts[0].text;
}

function formatAIResponse(text) {
    if (!text) return "";

    // Bộ lọc đa năng nhận diện mọi kiểu marker (PHAN_X, SECTION_X, Mục X)
    const splitter = /\[{1,2}(?:PHAN|SECTION|MUC|PHẦN)_\d+\]{1,2}|#+\s*\d+[\.\s\-]+|^\d+[\.\s\-]+/gim;
    const parts = text.split(splitter);
    const headers = text.match(splitter) || [];

    let html = "";

    // Hiển thị intro
    if (parts[0] && parts[0].trim().length > 10) {
        html += `<div class="intro-box">${processMarkdown(parts[0].trim())}</div>`;
    }

    // Nếu AI viết liền một mạch, hiển thị toàn bộ
    if (parts.length <= 1) {
        return `<div class="result-section-item"><h2>Kết Quả Luận Giải Chi Tiết</h2>${processMarkdown(text)}</div>`;
    }

    const standardTitles = [
        "Tổng Quan Bản Mệnh",
        "Phân Tích Chỉ Tay",
        "Sự Nghiệp & Tài Lộc",
        "Tình Duyên & Gia Đạo",
        "Tiên Tri Sức Khỏe",
        "Vận Hạn Năm Hiện Tại",
        "Chi Tiết 12 Tháng",
        "Lời Khuyên Phong Thủy"
    ];

    for (let i = 1; i < parts.length; i++) {
        let content = parts[i].trim();
        if (!content || content.length < 5) continue;

        let title = standardTitles[i - 1] || `Phân tích mục ${i}`;

        // Làm sạch nội dung (loại bỏ dòng tiêu đề lặp lại nếu AI tự viết thêm)
        const lines = content.split('\n');
        if (lines[0].length < 100 && lines[0].includes(title.substring(0, 5))) {
            content = lines.slice(1).join('\n').trim();
        }

        html += `
            <div class="result-section-item section-anim-${i % 9}">
                <div class="section-badge">Mục ${i}</div>
                <h2>${title}</h2>
                <div class="section-content">
                    ${processMarkdown(content)}
                </div>
            </div>
        `;
    }

    return html;
}

function processMarkdown(text) {
    if (!text) return "";
    return text
        .replace(/\*\*(.*?)\*\*/g, '<strong>$1</strong>')
        .replace(/\*(.*?)\*/g, '<em>$1</em>')
        .split('\n')
        .map(line => {
            const trimmed = line.trim();
            if (!trimmed) return "";
            if (trimmed.startsWith('-') || trimmed.startsWith('*') || trimmed.startsWith('•')) {
                return `<li>${trimmed.replace(/^[\-\*\•]\s*/, '')}</li>`;
            }
            return `<p>${trimmed}</p>`;
        })
        .join('')
        .replace(/(<li>.*?<\/li>)+/gs, '<ul>$&</ul>');
}

// Download functionality
document.getElementById('download-btn').addEventListener('click', () => {
    const aiResponseDiv = document.getElementById('ai-response');
    const content = aiResponseDiv.innerText;
    const blob = new Blob([content], { type: 'text/plain' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `TuVi_Full_Report_${new Date().getTime()}.txt`;
    a.click();
    URL.revokeObjectURL(url);
});
