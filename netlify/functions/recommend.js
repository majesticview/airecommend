// 필요한 API 키는 Netlify 환경변수에서 가져옵니다.
const GEMINI_API_KEY = process.env.GEMINI_API_KEY;
const YOUTUBE_API_KEY = process.env.YOUTUBE_API_KEY;

exports.handler = async function(event, context) {
    // POST 요청만 허용
    if (event.httpMethod !== "POST") {
        return { statusCode: 405, body: "Method Not Allowed" };
    }

    try {
        const { category, userInput } = JSON.parse(event.body);
        
        // 1. Gemini에게 추천 목록(JSON) 요청
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
        
        // Gemini 응답 파싱 (안전 장치 추가)
        let rawText = aiData.candidates[0].content.parts[0].text;
        // 마크다운 코드 블록 제거 (```json ... ```)
        rawText = rawText.replace(/```json/g, "").replace(/```/g, "").trim();
        const recommendations = JSON.parse(rawText);

        // 2. 추천 목록을 순회하며 링크 정보 확보 (YouTube API 또는 Google Books API)
        const enrichedResults = await Promise.all(recommendations.map(async (item) => {
            let link = '#';

            if (category === 'movie') {
                // 유튜브 검색 API 호출
                const query = encodeURIComponent(item.title + " trailer");
                const youtubeUrl = `https://www.googleapis.com/youtube/v3/search?part=snippet&q=${query}&key=${YOUTUBE_API_KEY}&type=video&maxResults=1`;
                
                try {
                    const ytRes = await fetch(youtubeUrl);
                    const ytData = await ytRes.json();
                    if (ytData.items && ytData.items.length > 0) {
                        link = `https://www.youtube.com/watch?v=${ytData.items[0].id.videoId}`;
                    } else {
                        // 할당량 초과 혹은 에러 시 검색 링크로 대체
                        link = `https://www.youtube.com/results?search_query=${query}`;
                    }
                } catch (e) {
                    link = `https://www.youtube.com/results?search_query=${query}`;
                }

            } else {
                // 도서: Google Books API (별도 키 없이 사용 가능하거나 공개 API 활용)
                const query = encodeURIComponent(item.title);
                const bookUrl = `https://www.googleapis.com/books/v1/volumes?q=${query}&maxResults=1`;
                
                try {
                    const bookRes = await fetch(bookUrl);
                    const bookData = await bookRes.json();
                    if (bookData.items && bookData.items.length > 0) {
                        link = bookData.items[0].volumeInfo.infoLink; // Google Books 정보 페이지
                    } else {
                        link = `https://search.kyobobook.co.kr/search?keyword=${query}`; // 교보문고 검색 백업
                    }
                } catch (e) {
                    link = `https://search.kyobobook.co.kr/search?keyword=${query}`;
                }
            }

            return { ...item, link };
        }));

        // 3. 최종 결과 반환
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