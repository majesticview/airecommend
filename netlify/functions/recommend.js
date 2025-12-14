const GEMINI_API_KEY = process.env.GEMINI_API_KEY;

exports.handler = async function(event, context) {
    if (event.httpMethod !== "POST") {
        return { statusCode: 405, body: "Method Not Allowed" };
    }

    try {
        const { category, userInput } = JSON.parse(event.body);
        
        // 1. Gemini에게 추천 요청 (프롬프트는 동일)
        const prompt = `
            사용자가 ${category === 'movie' ? '영화' : '책'}를 추천받고 싶어합니다.
            사용자 입력: "${userInput}"
            
            위 입력을 바탕으로 3개의 ${category === 'movie' ? '영화' : '책'}를 추천해주세요.
            반드시 아래 JSON 포맷으로만 응답해주세요. 마크다운이나 다른 말은 쓰지 마세요.
            [
                {"title": "제목1", "reason": "추천 이유 요약"},
                {"title": "제목2", "reason": "추천 이유 요약"},
                {"title": "제목3", "reason": "추천 이유 요약"}
            ]
        `;

        const geminiUrl = `https://generativelanguage.googleapis.com/v1beta/models/gemini-pro:generateContent?key=${GEMINI_API_KEY}`;
        
        const aiResponse = await fetch(geminiUrl, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
                contents: [{ parts: [{ text: prompt }] }]
            })
        });

        const aiData = await aiResponse.json();
        
        // 데이터 파싱
        let rawText = aiData.candidates[0].content.parts[0].text;
        rawText = rawText.replace(/```json/g, "").replace(/```/g, "").trim();
        const recommendations = JSON.parse(rawText);

        // 2. 검색 링크 생성 (API 호출 없이 문자열로 바로 생성)
        const enrichedResults = recommendations.map(item => {
            let link = '#';

            if (category === 'movie') {
                // 유튜브 검색 결과 페이지로 바로 연결
                // 예: https://www.youtube.com/results?search_query=아이언맨+예고편
                const query = encodeURIComponent(item.title + " 예고편");
                link = `https://www.youtube.com/results?search_query=${query}`;
            } else {
                // 도서는 교보문고 검색 결과 페이지로 연결
                // 예: https://search.kyobobook.co.kr/search?keyword=해리포터
                const query = encodeURIComponent(item.title);
                link = `https://search.kyobobook.co.kr/search?keyword=${query}`;
            }

            return { ...item, link };
        });

        return {
            statusCode: 200,
            body: JSON.stringify({ recommendations: enrichedResults })
        };

    } catch (error) {
        console.error("Server Error:", error);
        return {
            statusCode: 500,
            body: JSON.stringify({ error: "추천을 가져오는 중 문제가 발생했습니다." })
        };
    }
};