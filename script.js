let currentCategory = '';

// 1. 카테고리 선택
function selectCategory(category) {
    currentCategory = category;
    document.getElementById('step-1').classList.remove('active');
    document.getElementById('step-2').classList.add('active');
    
    const title = category === 'movie' ? '🎬 영화 추천 요청' : '📚 도서 추천 요청';
    document.getElementById('input-title').innerText = title;
}

// 2. 뒤로 가기
function goBack() {
    document.getElementById('step-2').classList.remove('active');
    document.getElementById('step-1').classList.add('active');
}

// 3. AI 추천 요청 (Netlify Function 호출)
async function requestRecommendation() {
    const userInput = document.getElementById('user-input').value;
    if (!userInput.trim()) {
        alert("내용을 입력해주세요!");
        return;
    }

    // UI 전환 (로딩 중)
    document.getElementById('step-2').classList.remove('active');
    document.getElementById('loading').classList.add('active');

    try {
        // 백엔드(Netlify Function) 호출
        const response = await fetch('/.netlify/functions/recommend', {
            method: 'POST',
            body: JSON.stringify({ category: currentCategory, userInput: userInput })
        });

        const data = await response.json();

        if (data.error) throw new Error(data.error);

        displayResults(data.recommendations);

    } catch (error) {
        console.error('Error:', error);
        alert("오류가 발생했습니다: " + error.message);
        reset();
    }
}

// 4. 결과 출력
function displayResults(items) {
    document.getElementById('loading').classList.remove('active');
    document.getElementById('step-3').classList.add('active');
    
    const container = document.getElementById('result-container');
    container.innerHTML = '';

    items.forEach(item => {
        const linkText = currentCategory === 'movie' ? '📺 예고편 보기' : '📖 책 정보 보기';
        
        const card = document.createElement('div');
        card.className = 'card';
        card.innerHTML = `
            <h3>${item.title}</h3>
            <p>${item.reason}</p>
            <a href="${item.link}" target="_blank">${linkText} &rarr;</a>
        `;
        container.appendChild(card);
    });
}

// 5. 리셋
function reset() {
    document.getElementById('step-3').classList.remove('active');
    document.getElementById('loading').classList.remove('active');
    document.getElementById('step-1').classList.add('active');
    document.getElementById('user-input').value = '';
}