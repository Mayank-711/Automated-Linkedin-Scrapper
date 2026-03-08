const axios = require('axios');

class GemmaMatcher {
    constructor() {
        this.apiKey = process.env.GEMMA_API_KEY;
        this.model = process.env.GEMMA_MODEL || 'gemma-3-27b-it';
        this.baseURL = 'https://generativelanguage.googleapis.com/v1beta';
    }

    async parseQuery(naturalQuery) {
        try {
            console.log('🤖 Attempting AI parsing for:', naturalQuery);
            const prompt = `
Parse this job search query into structured JSON format:
"${naturalQuery}"

Extract:
- role: Job title/position
- location: City, state, or country
- time_filter: Convert time expressions to one of: "past 24 hours", "past week", "past month"

Examples:
"Python developer in Mumbai last 7 days" → {"role": "Python Developer", "location": "Mumbai", "time_filter": "past week"}
"Frontend engineer remote past month" → {"role": "Frontend Engineer", "location": "remote", "time_filter": "past month"}
"Data scientist NYC yesterday" → {"role": "Data Scientist", "location": "NYC", "time_filter": "past 24 hours"}
"Python developer, Mumbai, 7 days" → {"role": "Python developer", "location": "Mumbai", "time_filter": "past week"}

Return ONLY valid JSON, no explanation:`;

            const response = await this.makeGemmaRequest(prompt);
            
            try {
                const parsed = JSON.parse(response);
                console.log('✅ AI parsing successful:', parsed);
                return {
                    role: parsed.role || '',
                    location: parsed.location || '',
                    time_filter: parsed.time_filter || 'past week'
                };
            } catch (parseError) {
                console.warn('⚠️ Failed to parse AI response, using fallback parser');
                return this.fallbackQueryParse(naturalQuery);
            }
        } catch (error) {
            console.error('❌ AI parsing failed, using fallback parser:', error.message);
            return this.fallbackQueryParse(naturalQuery);
        }
    }

    fallbackQueryParse(query) {
        const result = {
            role: '',
            location: '',
            time_filter: 'past week'
        };

        console.log('🔍 Fallback parsing query:', query);

        // Check if query has comma-separated format (e.g., "Python developer, Mumbai, 7 days")
        if (query.includes(',')) {
            const parts = query.split(',').map(part => part.trim());
            console.log('📝 Comma-separated parts:', parts);
            
            // First part is usually the role
            if (parts[0]) {
                result.role = parts[0];
            }
            
            // Look for location in subsequent parts
            for (let i = 1; i < parts.length; i++) {
                const part = parts[i].toLowerCase();
                const locationKeywords = ['mumbai', 'delhi', 'bangalore', 'pune', 'hyderabad', 'chennai', 'kolkata', 'ahmedabad', 'remote', 'nyc', 'sf', 'london', 'toronto', 'boston', 'seattle', 'chicago'];
                
                if (locationKeywords.some(loc => part.includes(loc))) {
                    result.location = parts[i];
                    break;
                }
            }
            
            // Look for time indicators in any part
            const fullQuery = query.toLowerCase();
            if (fullQuery.includes('yesterday') || fullQuery.includes('24 hour') || fullQuery.includes('today') || fullQuery.includes('1 day')) {
                result.time_filter = 'past 24 hours';
            } else if (fullQuery.includes('week') || fullQuery.includes('7 days') || fullQuery.includes('7') || fullQuery.includes('seven')) {
                result.time_filter = 'past week';
            } else if (fullQuery.includes('month') || fullQuery.includes('30 days')) {
                result.time_filter = 'past month';
            }
        } else {
            // Original parsing for "in/at/from" format
            const lowerQuery = query.toLowerCase();
            
            // Time filters
            if (lowerQuery.includes('yesterday') || lowerQuery.includes('24 hour') || lowerQuery.includes('today')) {
                result.time_filter = 'past 24 hours';
            } else if (lowerQuery.includes('week') || lowerQuery.includes('7 days')) {
                result.time_filter = 'past week';
            } else if (lowerQuery.includes('month') || lowerQuery.includes('30 days')) {
                result.time_filter = 'past month';
            }

            // Location extraction
            const locationKeywords = ['in', 'at', 'from', 'remote', 'mumbai', 'delhi', 'bangalore', 'pune', 'hyderabad', 'chennai', 'nyc', 'sf', 'london', 'toronto'];
            const words = query.split(' ');
            
            for (let i = 0; i < words.length; i++) {
                if (locationKeywords.includes(words[i].toLowerCase()) && i + 1 < words.length) {
                    result.location = words[i + 1];
                    break;
                }
            }

            // Role extraction (everything else)
            result.role = query.replace(/\b(in|at|from|last|past|yesterday|today|week|month|days?|remote)\b/gi, '').trim();
        }
        
        console.log('✅ Parsed result:', result);
        return result;
    }

    async matchJobs(jobs, userPreferences) {
        try {
            const matchedJobs = [];
            
            for (const job of jobs) {
                const matchScore = await this.calculateMatchScore(job, userPreferences);
                matchedJobs.push({
                    ...job,
                    match_score: matchScore.score,
                    match_reason: matchScore.reason,
                    match_color: this.getMatchColor(matchScore.score)
                });
            }

            // Sort by match score
            matchedJobs.sort((a, b) => b.match_score - a.match_score);
            
            return matchedJobs;
        } catch (error) {
            console.error('Job matching failed:', error);
            // Return jobs with default scores
            return jobs.map(job => ({
                ...job,
                match_score: 50,
                match_reason: 'Unable to calculate match score',
                match_color: 'yellow'
            }));
        }
    }

    async calculateMatchScore(job, preferences) {
        try {
            const prompt = `
Analyze this job against user preferences and provide a match score (0-100):

JOB:
Title: ${job.title}
Company: ${job.company}
Location: ${job.location}
Description: ${job.description}

USER PREFERENCES:
Skills: ${preferences.skills ? preferences.skills.join(', ') : 'Not specified'}
Experience: ${preferences.experience || 'Not specified'}
Job Type: ${preferences.jobType || 'Not specified'}

Scoring criteria:
- Skills match (40 points): How well job requirements match user skills
- Experience level (25 points): Job experience requirements vs user experience
- Location preference (20 points): Location compatibility
- Job type (15 points): Full-time/part-time/remote match

Return JSON format:
{
  "score": 85,
  "reason": "Strong match - requires Python & Django (user skills), 2-3 years experience (matches user), remote work available"
}

Return ONLY valid JSON:`;

            const response = await this.makeGemmaRequest(prompt);
            
            try {
                const result = JSON.parse(response);
                return {
                    score: Math.min(Math.max(result.score || 50, 0), 100),
                    reason: result.reason || 'Match calculated'
                };
            } catch (parseError) {
                return this.fallbackMatchScore(job, preferences);
            }
        } catch (error) {
            return this.fallbackMatchScore(job, preferences);
        }
    }

    fallbackMatchScore(job, preferences) {
        let score = 50; // Base score
        let reasons = [];

        const jobText = `${job.title} ${job.description}`.toLowerCase();
        
        // Skills matching
        if (preferences.skills && preferences.skills.length > 0) {
            const matchedSkills = preferences.skills.filter(skill => 
                jobText.includes(skill.toLowerCase())
            );
            const skillsScore = (matchedSkills.length / preferences.skills.length) * 40;
            score += skillsScore;
            
            if (matchedSkills.length > 0) {
                reasons.push(`Skills match: ${matchedSkills.join(', ')}`);
            }
        }

        // Experience level
        if (preferences.experience) {
            if (jobText.includes('entry') || jobText.includes('junior')) {
                score += preferences.experience.includes('0-1') ? 25 : 10;
                reasons.push('Experience level matches');
            } else if (jobText.includes('senior')) {
                score += preferences.experience.includes('5+') ? 25 : 5;
                reasons.push('Senior level position');
            } else {
                score += 15; // Mid-level
                reasons.push('Mid-level position');
            }
        }

        // Location preference
        if (job.location.toLowerCase().includes('remote')) {
            score += 20;
            reasons.push('Remote work available');
        }

        return {
            score: Math.min(Math.max(Math.round(score), 0), 100),
            reason: reasons.length > 0 ? reasons.join(', ') : 'Basic compatibility match'
        };
    }

    getMatchColor(score) {
        if (score >= 70) return 'green';
        if (score >= 50) return 'yellow';
        return 'red';
    }

    async makeGemmaRequest(prompt) {
        try {
            const response = await axios.post(
                `${this.baseURL}/models/${this.model}:generateContent?key=${this.apiKey}`,
                {
                    contents: [{
                        parts: [{
                            text: prompt
                        }]
                    }],
                    generationConfig: {
                        temperature: 0.7,
                        topK: 40,
                        topP: 0.95,
                        maxOutputTokens: 1024,
                    }
                },
                {
                    headers: {
                        'Content-Type': 'application/json'
                    },
                    timeout: 15000
                }
            );

            return response.data.candidates[0].content.parts[0].text;
        } catch (error) {
            console.error('Gemma API request failed:', error.response?.data || error.message);
            throw error;
        }
    }

    async testConnection() {
        try {
            const response = await this.makeGemmaRequest('Hello, respond with "Connected" if you can read this.');
            return response.toLowerCase().includes('connected');
        } catch (error) {
            console.error('Gemma connection test failed:', error);
            return false;
        }
    }
}

module.exports = GemmaMatcher;