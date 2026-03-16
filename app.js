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

// Enhanced Analysis Logic with Chaining
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
    const loadingText = loadingOverlay.querySelector('p');
    resultSection.classList.add('hidden');
    aiResponseDiv.innerHTML = ""; // Reset previous results

    try {
        let fullResult = "";

        // Stage 1: Core Identity & Palms (Sections 1-5)
        loadingText.innerText = "Đang giải mã bản mệnh và chỉ tay (1/3)...";
        const res1 = await callGeminiAI(apiKey, { fullName, dob, gender, tob, images: palmImages }, 1);
        fullResult += res1 + "\n";

        // Stage 2: Life Path & Relations (Sections 6-10)
        loadingText.innerText = "Đang luận giải quan lộ và nhân duyên (2/3)...";
        const res2 = await callGeminiAI(apiKey, { fullName, dob, gender, tob, images: palmImages }, 2);
        fullResult += res2 + "\n";

        // Stage 3: Current Year & Advice (Sections 11-13)
        loadingText.innerText = "Đang tiên tri vận hạn và lời khuyên (3/3)...";
        const res3 = await callGeminiAI(apiKey, { fullName, dob, gender, tob, images: palmImages }, 3);
        fullResult += res3;

        aiResponseDiv.innerHTML = formatAIResponse(fullResult);
        resultSection.classList.remove('hidden');

        // Stage Extra: Separate Lucky Numbers (Handle at the end or in parallel)
        const luckyRadio = document.querySelector('input[name="lucky-num-type"]:checked');
        const luckyMax = luckyRadio ? luckyRadio.value : null;
        const luckySection = document.getElementById('lucky-numbers-section');
        const luckyContainer = document.getElementById('lucky-numbers-container');

        if (luckyMax) {
            luckySection.classList.remove('hidden');
            luckyContainer.innerHTML = '<div class="spinner"></div>';
            // Scroll to lucky section first to show user it's loading
            luckySection.scrollIntoView({ behavior: 'smooth', block: 'center' });

            try {
                // Chỉ dùng thông tin cá nhân cho con số may mắn theo yêu cầu của USER
                const luckyRes = await callGeminiAI(apiKey, { fullName, dob, gender, tob, maxLucky: luckyMax }, 'lucky');
                const numbers = (luckyRes.match(/\d+/g) || []).slice(0, 6);

                if (numbers.length >= 6) {
                    luckyContainer.innerHTML = numbers.map(num => `<div class="lucky-ball">${num.padStart(2, '0')}</div>`).join('');
                } else {
                    luckyContainer.innerHTML = "<p>Đang giải hạn, vui lòng thử lại sau...</p>";
                }
            } catch (e) {
                console.error("Lucky number error:", e);
                luckySection.classList.add('hidden');
            }
        } else {
            luckySection.classList.add('hidden');
        }

        if (!luckyMax) {
            resultSection.scrollIntoView({ behavior: 'smooth' });
        }
    } catch (error) {
        console.error(error);
        alert('Có lỗi xảy ra: ' + error.message);
    } finally {
        loadingOverlay.classList.add('hidden');
        loadingText.innerText = "Đang giải mã bí mật của các vì sao...";
    }
});

async function callGeminiAI(apiKey, data, stage) {
    const MODEL_ID = "gemini-2.5-flash";
    const API_URL = `https://generativelanguage.googleapis.com/v1beta/models/${MODEL_ID}:generateContent?key=${apiKey}`;

    const currentYear = new Date().getFullYear();

    let stageGoals = "";
    if (stage === 1) {
        stageGoals = "Mục 1: Tổng quan Bản mệnh & Cốt cách, Mục 2: Ngũ hành & Dụng thần, Mục 3: Tâm tính & Năng lực Thiên bẩm, Mục 4: Luận giải Chỉ tay Tả (Trái) - Tiên thiên, Mục 5: Luận giải Chỉ tay Hữu (Phải) - Hậu thiên.";
    } else if (stage === 2) {
        stageGoals = "Mục 6: Con đường Công danh & Sự nghiệp Trực đời, Mục 7: Cung Tài bạch & Vận may Tiền bạc, Mục 8: Tình duyên, Hôn nhân & Phu thê, Mục 9: Gia đạo, Luận giải Cung Tử tức & Phúc đức, Mục 10: Tiên tri Sức khỏe & Các tai ương cần tránh.";
    } else if (stage === 3) {
        stageGoals = `Mục 11: Tổng quan Vận hạn năm ${currentYear}, Mục 12: Chi tiết biến cố 4 quý trong năm ${currentYear} (Quý 1: tháng 1-3, Quý 2: tháng 4-6, Quý 3: tháng 7-9, Quý 4: tháng 10-12) - viết súc tích theo quý, Mục 13: Lời khuyên Phong thủy & Phương pháp Cải vận.`;
    } else if (stage === 'lucky') {
        const maxNum = data.maxLucky || '55';
        stageGoals = `Hãy tìm ra 6 con số may mắn nhất (từ 01 đến ${maxNum}) dành cho gia chủ dựa trên Họ tên, Ngày sinh và Giới tính. Chỉ trả về đúng 6 con số, ví dụ: 05, 12, 28, 33, 45, 52. Tuyệt đối không viết gì thêm.`;
    }

    const parts = [
        { text: `Gia chủ: ${data.fullName}, Ngày sinh: ${data.dob}, Giới tính: ${data.gender}. Hãy viết các mục sau: ${stageGoals}` }
    ];

    // Only add images if they exist
    if (data.images && data.images.left && data.images.right) {
        parts.push({ inline_data: { mime_type: "image/jpeg", data: data.images.left } });
        parts.push({ inline_data: { mime_type: "image/jpeg", data: data.images.right } });
    }

    const requestBody = {
        system_instruction: {
            parts: [{
                text: `Bạn là bậc thầy Nhân tướng học và Tử vi. 
                NHIỆM VỤ: Luận giải chi tiết các mục được yêu cầu.
                QUY TẮC:
                1. Mỗi mục PHẢI bắt đầu bằng marker chính xác: [[PHAN_X]] (ví dụ: [[PHAN_1]], [[PHAN_2]]...).
                2. Viết cực kỳ chi tiết (200-300 chữ mỗi mục), hành văn uyên bác, trang trọng.
                3. Tuyệt đối không được bỏ sót bất kỳ mục nào được giao trong giai đoạn này.
                4. Tại Mục 14: Hãy dựa vào ngày sinh, họ tên và giới tính để tìm ra 6 con số may mắn nhất (01-${data.maxLucky || '55'}) dành riêng cho gia chủ (không cần tướng tay). Trình bày các con số này thật ấn tượng.
                5. Sử dụng Markdown (in đậm, gạch đầu dòng) để trình bày.`
            }]
        },
        contents: [{
            parts: parts
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
    return json.candidates[0].content.parts[0].text;
}

function formatAIResponse(text) {
    if (!text) return "";

    const standardTitles = {
        "1": "Tổng quan Bản mệnh & Cốt cách",
        "2": "Ngũ hành & Dụng thần",
        "3": "Tâm tính & Năng lực Thiên bẩm",
        "4": "Luận giải Chỉ tay Tả (Trái) - Tiên thiên",
        "5": "Luận giải Chỉ tay Hữu (Phải) - Hậu thiên",
        "6": "Công danh & Sự nghiệp Trọn đời",
        "7": "Cung Tài bạch & Vận may Tiền bạc",
        "8": "Tình duyên, Hôn nhân & Phu thê",
        "9": "Gia đạo, Cung Tử tức & Phúc đức",
        "10": "Tiên tri Sức khỏe & Tai ương",
        "11": "Tổng quan Vận hạn Năm hiện tại",
        "12": "Diễn biến 4 Quý trong năm",
        "13": "Lời khuyên & Phương pháp Cải vận"
    };

    const markerRegex = /\[{2}PHAN_(\d+)\]{2}/gi;
    const parts = text.split(markerRegex);

    let html = "";

    if (parts[0] && parts[0].trim().length > 20) {
        html += `<div class="intro-box">${processMarkdown(parts[0].trim())}</div>`;
    }

    for (let i = 1; i < parts.length; i += 2) {
        const index = parts[i];
        let content = parts[i + 1] ? parts[i + 1].trim() : "";

        if (!content) continue;

        const title = standardTitles[index] || `Phân tích chuyên sâu mục ${index}`;

        html += `
            <div class="result-section-item section-anim-${index % 9}">
                <div class="section-badge">Mục ${index}</div>
                <h2>${title}</h2>
                <div class="section-content">
                    ${processMarkdown(content)}
                </div>
            </div>
        `;
    }

    return html || `<div class="result-section-item"><h2>Kết Quả Phân Tích</h2>${processMarkdown(text)}</div>`;
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

// Download functionality using docx.js for maximum mobile compatibility
document.getElementById('download-btn').addEventListener('click', async () => {
    const { Document, Packer, Paragraph, TextRun, HeadingLevel, AlignmentType, BorderStyle, Table, TableRow, TableCell, WidthType, Spacing } = window.docx;

    const aiResponseDiv = document.getElementById('ai-response');
    const fullNameRaw = document.getElementById('full-name').value.trim() || "Khach_Hang";
    // Remove Vietnamese accents for filename
    const fullName = fullNameRaw.normalize("NFD").replace(/[\u0300-\u036f]/g, "").replace(/đ/g, "d").replace(/Đ/g, "D");

    try {
        const sections = [];

        // 1. Header
        sections.push(new Paragraph({
            text: "KẾT QUẢ LUẬN GIẢI TỬ VI & TƯỚNG SỐ AI",
            heading: HeadingLevel.HEADING_1,
            alignment: AlignmentType.CENTER,
            spacing: { after: 200 },
        }));
        sections.push(new Paragraph({
            text: "Hệ thống phân tích Nhân mệnh chuyên sâu",
            alignment: AlignmentType.CENTER,
            spacing: { after: 400 },
        }));

        // 2. Info Box (using a simple Table for better look in Word)
        const infoData = [
            ["Gia chủ:", fullNameRaw],
            ["Ngày sinh:", document.getElementById('dob').value],
            ["Giới tính:", document.getElementById('gender').value],
            ["Giờ sinh:", document.getElementById('tob').value || "Không rõ"],
            ["Ngày lập quẻ:", new Date().toLocaleDateString('vi-VN')]
        ];

        const infoTable = new Table({
            width: { size: 100, type: WidthType.PERCENTAGE },
            rows: infoData.map(row => new TableRow({
                children: [
                    new TableCell({
                        children: [new Paragraph({ children: [new TextRun({ text: row[0], bold: true })] })],
                        width: { size: 30, type: WidthType.PERCENTAGE },
                    }),
                    new TableCell({
                        children: [new Paragraph({ text: row[1] })],
                        width: { size: 70, type: WidthType.PERCENTAGE },
                    }),
                ],
            })),
        });
        sections.push(infoTable);
        sections.push(new Paragraph({ text: "", spacing: { after: 400 } }));

        // 3. Main Content - Parse the aiResponseDiv categories
        const contentItems = aiResponseDiv.querySelectorAll('.result-section-item');

        if (contentItems.length > 0) {
            contentItems.forEach(item => {
                const badge = item.querySelector('.section-badge')?.innerText || "";
                const title = item.querySelector('h2')?.innerText || "";
                const contentDiv = item.querySelector('.section-content');

                if (badge || title) {
                    sections.push(new Paragraph({
                        children: [
                            new TextRun({ text: badge + " ", bold: true, color: "8e44ad" }),
                            new TextRun({ text: title, bold: true, size: 28 })
                        ],
                        heading: HeadingLevel.HEADING_2,
                        spacing: { before: 400, after: 200 },
                        border: { bottom: { color: "eeeeee", space: 1, style: BorderStyle.SINGLE, size: 6 } }
                    }));
                }

                if (contentDiv) {
                    // Parse children of contentDiv (p, ul/li)
                    Array.from(contentDiv.children).forEach(child => {
                        if (child.tagName === 'P') {
                            sections.push(new Paragraph({
                                text: child.innerText,
                                spacing: { after: 120 },
                                alignment: AlignmentType.JUSTIFY
                            }));
                        } else if (child.tagName === 'UL') {
                            Array.from(child.children).forEach(li => {
                                sections.push(new Paragraph({
                                    text: li.innerText,
                                    bullet: { level: 0 },
                                    spacing: { after: 80 }
                                }));
                            });
                        }
                    });
                }
            });
        } else {
            // Fallback if structure is different (e.g. intro text)
            sections.push(new Paragraph({
                text: aiResponseDiv.innerText,
                spacing: { after: 200 }
            }));
        }

        // 4. Footer
        sections.push(new Paragraph({ text: "", spacing: { before: 800 } }));
        sections.push(new Paragraph({
            children: [
                new TextRun({ text: `Bản quyền © ${new Date().getFullYear()} - Nguyễn Phi Hùng - Zalo 0938750424`, italics: true }),
            ],
            alignment: AlignmentType.CENTER,
            spacing: { before: 200 }
        }));
        sections.push(new Paragraph({
            text: "Thông tin chỉ mang tính chất tham khảo chiêm nghiệm.",
            alignment: AlignmentType.CENTER,
            style: { size: 18 }
        }));

        // Create Document
        const doc = new Document({
            sections: [{
                properties: {},
                children: sections,
            }],
        });

        // Generate Blob and download
        const blob = await Packer.toBlob(doc);

        // Final sanity check on MIME type (though docx library sets it correctly)
        const docxBlob = new Blob([blob], { type: 'application/vnd.openxmlformats-officedocument.wordprocessingml.document' });

        const url = URL.createObjectURL(docxBlob);
        const a = document.createElement('a');
        a.href = url;
        const timestamp = new Date().getTime();
        const safeFileName = `Luan_Giai_${fullName.replace(/[^a-zA-Z0-9]/g, '_')}_${timestamp}.docx`;

        a.download = safeFileName;
        document.body.appendChild(a);
        a.click();

        setTimeout(() => {
            document.body.removeChild(a);
            URL.revokeObjectURL(url);
        }, 200);

    } catch (error) {
        console.error("Error generating DOCX with docx.js:", error);
        alert("Lỗi khi tạo file Word. Đang tải file văn bản thay thế...");

        // Fallback to text
        const content = aiResponseDiv.innerText;
        const blob = new Blob([content], { type: 'text/plain;charset=utf-8' });
        const url = URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = `TuVi_Report_${new Date().getTime()}.txt`;
        document.body.appendChild(a);
        a.click();
        setTimeout(() => {
            document.body.removeChild(a);
            URL.revokeObjectURL(url);
        }, 100);
    }
});
