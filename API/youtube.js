// api/youtube.js
// This is a Vercel Serverless Function
// Your API key stays on Vercel's servers — never exposed to the browser

export default async function handler(req, res) {
    // Enable CORS for your frontend
    res.setHeader('Access-Control-Allow-Origin', '*');
    res.setHeader('Access-Control-Allow-Methods', 'GET, OPTIONS');
    
    if (req.method === 'OPTIONS') {
        return res.status(200).end();
    }
    
    const { endpoint, params } = req.query;
    
    // Your YouTube API key — stored securely as Vercel Environment Variable
    const YOUTUBE_KEY = process.env.YOUTUBE_API_KEY;
    
    if (!YOUTUBE_KEY) {
        return res.status(500).json({ error: 'YouTube API key not configured' });
    }
    
    try {
        // Forward the request to YouTube API
        let url = `https://www.googleapis.com/youtube/v3/${endpoint}?key=${YOUTUBE_KEY}`;
        
        // Add additional parameters
        if (params) {
            url += `&${params}`;
        }
        
        const response = await fetch(url);
        const data = await response.json();
        
        res.status(200).json(data);
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
}
