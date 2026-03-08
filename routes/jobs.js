const express = require('express');
const router = express.Router();
const LinkedInScraper = require('../scraper/linkedinScraper');
const GemmaMatcher = require('../ai/gemmaMatcher');

// In-memory storage for demo purposes
let jobsCache = [];
let bookmarkedJobs = new Set();

// Initialize AI matcher
const gemmaMatcher = new GemmaMatcher();

// POST /api/search-jobs - Main job search endpoint
router.post('/search-jobs', async (req, res) => {
    try {
        console.log('🔍 Starting job search...');
        
        const { query, skills, experience, jobType } = req.body;
        
        if (!query) {
            return res.status(400).json({ error: 'Search query is required' });
        }

        // Parse natural language query using Gemma AI
        console.log('🤖 Parsing query with AI...');
        const parsedQuery = await gemmaMatcher.parseQuery(query);
        console.log('📝 Parsed query:', parsedQuery);

        // Initialize LinkedIn scraper
        const scraper = new LinkedInScraper();
        let jobs = [];

        try {
            const initSuccess = await scraper.init();
            if (!initSuccess) {
                throw new Error('Failed to initialize scraper');
            }

            // Optional LinkedIn login (comment out if not using credentials)
            if (process.env.LINKEDIN_EMAIL) {
                console.log('🔐 Logging into LinkedIn...');
                await scraper.loginToLinkedIn();
            }

            // Scrape jobs
            console.log('🕷️ Scraping LinkedIn jobs...');
            jobs = await scraper.searchJobs(parsedQuery);
            
        } catch (scraperError) {
            console.error('Scraper error:', scraperError);
            // Use mock data if scraper fails
            jobs = generateMockJobs(parsedQuery);
        } finally {
            await scraper.close();
        }

        // Match jobs with user preferences using AI
        console.log('🎯 Matching jobs with preferences...');
        const userPreferences = {
            skills: skills ? skills.split(',').map(s => s.trim()) : [],
            experience,
            jobType
        };

        const matchedJobs = await gemmaMatcher.matchJobs(jobs, userPreferences);
        
        // Cache results
        jobsCache = matchedJobs;
        
        console.log(`✅ Successfully processed ${matchedJobs.length} jobs`);
        
        res.json({
            success: true,
            query: parsedQuery,
            totalJobs: matchedJobs.length,
            jobs: matchedJobs,
            timestamp: new Date().toISOString()
        });

    } catch (error) {
        console.error('Job search failed:', error);
        res.status(500).json({
            error: 'Job search failed',
            message: error.message
        });
    }
});

// GET /api/jobs - Get cached jobs
router.get('/jobs', (req, res) => {
    const { page = 1, limit = 20, minScore = 0 } = req.query;
    
    const filteredJobs = jobsCache.filter(job => job.match_score >= parseInt(minScore));
    const startIndex = (parseInt(page) - 1) * parseInt(limit);
    const endIndex = startIndex + parseInt(limit);
    const paginatedJobs = filteredJobs.slice(startIndex, endIndex);
    
    res.json({
        jobs: paginatedJobs,
        pagination: {
            page: parseInt(page),
            limit: parseInt(limit),
            total: filteredJobs.length,
            totalPages: Math.ceil(filteredJobs.length / parseInt(limit))
        }
    });
});

// POST /api/jobs/bookmark - Bookmark a job
router.post('/jobs/bookmark', (req, res) => {
    const { jobId } = req.body;
    
    if (!jobId) {
        return res.status(400).json({ error: 'Job ID is required' });
    }
    
    if (bookmarkedJobs.has(jobId)) {
        bookmarkedJobs.delete(jobId);
        res.json({ bookmarked: false, message: 'Job removed from bookmarks' });
    } else {
        bookmarkedJobs.add(jobId);
        res.json({ bookmarked: true, message: 'Job bookmarked successfully' });
    }
});

// GET /api/jobs/bookmarked - Get bookmarked jobs
router.get('/jobs/bookmarked', (req, res) => {
    const bookmarked = jobsCache.filter(job => bookmarkedJobs.has(job.id));
    res.json({ jobs: bookmarked });
});

// GET /api/jobs/export - Export jobs to CSV
router.get('/jobs/export', (req, res) => {
    try {
        const { format = 'csv' } = req.query;
        
        if (format === 'csv') {
            const csvHeader = 'Title,Company,Location,Posted Time,Match Score,Match Reason,Link\n';
            const csvRows = jobsCache.map(job => 
                `"${job.title}","${job.company}","${job.location}","${job.postedTime}",${job.match_score},"${job.match_reason}","${job.link}"`
            ).join('\n');
            
            const csvContent = csvHeader + csvRows;
            
            res.setHeader('Content-Type', 'text/csv');
            res.setHeader('Content-Disposition', 'attachment; filename="linkedin-jobs.csv"');
            res.send(csvContent);
        } else {
            res.json({ jobs: jobsCache });
        }
    } catch (error) {
        console.error('Export failed:', error);
        res.status(500).json({ error: 'Export failed' });
    }
});

// POST /api/test-gemma - Test Gemma AI connection
router.post('/test-gemma', async (req, res) => {
    try {
        const isConnected = await gemmaMatcher.testConnection();
        res.json({ 
            connected: isConnected,
            message: isConnected ? 'Gemma AI is connected' : 'Gemma AI connection failed'
        });
    } catch (error) {
        res.status(500).json({ 
            connected: false, 
            error: error.message 
        });
    }
});

// GET /api/health - Health check endpoint
router.get('/health', (req, res) => {
    res.json({
        status: 'healthy',
        timestamp: new Date().toISOString(),
        cachedJobs: jobsCache.length,
        bookmarkedJobs: bookmarkedJobs.size
    });
});

// Mock job generator for fallback
function generateMockJobs(parsedQuery) {
    console.log('🤖 Generating mock data for parsed query:', parsedQuery);
    
    const baseLocation = parsedQuery.location || 'Mumbai';
    const baseRole = parsedQuery.role || 'Software Engineer';
    
    const mockJobs = [
        {
            id: 'mock_1',
            title: `Senior ${baseRole}`,
            company: 'Tata Consultancy Services',
            location: baseLocation,
            postedTime: '2 days ago',
            description: `We are seeking an experienced ${baseRole} to join our dynamic team in ${baseLocation}. Strong expertise in Python, Django, and REST APIs required.`,
            link: 'https://linkedin.com/jobs/mock-job-1',
            scrapedAt: new Date().toISOString()
        },
        {
            id: 'mock_2',
            title: `${baseRole} - Team Lead`,
            company: 'Infosys Limited',
            location: baseLocation,
            postedTime: '1 day ago',
            description: `Looking for a talented ${baseRole} to lead our development team in ${baseLocation}. Experience with cloud technologies and agile methodologies preferred.`,
            link: 'https://linkedin.com/jobs/mock-job-2',
            scrapedAt: new Date().toISOString()
        },
        {
            id: 'mock_3',
            title: `Junior ${baseRole}`,
            company: 'Wipro Technologies',
            location: baseLocation,
            postedTime: '3 days ago',
            description: `Exciting opportunity for a junior ${baseRole} to start their career in ${baseLocation}. Training provided for the right candidate.`,
            link: 'https://linkedin.com/jobs/mock-job-3',
            scrapedAt: new Date().toISOString()
        },
        {
            id: 'mock_4',
            title: `${baseRole} - Remote`,
            company: 'Zomato',
            location: `Remote (${baseLocation})`,
            postedTime: '5 days ago',
            description: `Join our remote team as a ${baseRole}. Flexible working hours and competitive compensation package.`,
            link: 'https://linkedin.com/jobs/mock-job-4',
            scrapedAt: new Date().toISOString()
        },
        {
            id: 'mock_5',
            title: `${baseRole} - Full Stack`,
            company: 'Flipkart',
            location: baseLocation,
            postedTime: '1 week ago',
            description: `We're hiring a full-stack ${baseRole} for our ${baseLocation} office. Experience with modern frameworks and databases essential.`,
            link: 'https://linkedin.com/jobs/mock-job-5',
            scrapedAt: new Date().toISOString()
        }
    ];
    
    console.log(`🤖 Generated ${mockJobs.length} mock jobs for location: ${baseLocation}, role: ${baseRole}`);
    return mockJobs;
}

module.exports = router;