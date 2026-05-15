// api/gemini.js
// Vercel Serverless Function for Gemini API calls

export default async function handler(req, res) {
    res.setHeader('Access-Control-Allow-Origin', '*');
    res.setHeader('Access-Control-Allow-Methods', 'POST, OPTIONS');
    
    if (req.method === 'OPTIONS') {
        return res.status(200).end();
    }
    
    if (req.method !== 'POST') {
        return res.status(405).json({ error: 'Method not allowed' });
    }
    
    const GEMINI_KEY = process.env.GEMINI_API_KEY;
    
    if (!GEMINI_KEY) {
        return res.status(500).json({ error: 'Gemini API key not configured' });
    }
    
    try {
        const { prompt, model } = req.body;
        const MODEL_NAME = model || 'models/gemini-2.5-flash-lite';
        
        const response = await fetch(
            `https://generativelanguage.googleapis.com/v1beta/${MODEL_NAME}:generateContent?key=${GEMINI_KEY}`,
            {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    contents: [{
                        parts: [{ text: prompt }]
                    }]
                })
            }
        );
        
        const data = await response.json();
        res.status(200).json(data);
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
}
