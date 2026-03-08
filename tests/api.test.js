// Test file for LinkedIn Job Scraper API
const request = require('supertest');
const app = require('../server');

describe('LinkedIn Job Scraper API', () => {
    
    describe('GET /api/health', () => {
        it('should return health status', async () => {
            const response = await request(app)
                .get('/api/health')
                .expect(200);
            
            expect(response.body).toHaveProperty('status', 'healthy');
            expect(response.body).toHaveProperty('timestamp');
        });
    });

    describe('POST /api/test-gemma', () => {
        it('should test Gemma AI connection', async () => {
            const response = await request(app)
                .post('/api/test-gemma')
                .expect(200);
            
            expect(response.body).toHaveProperty('connected');
            expect(response.body).toHaveProperty('message');
        });
    });

    describe('POST /api/search-jobs', () => {
        it('should require a query parameter', async () => {
            const response = await request(app)
                .post('/api/search-jobs')
                .send({})
                .expect(400);
            
            expect(response.body).toHaveProperty('error');
        });

        it('should search jobs with valid query', async () => {
            const response = await request(app)
                .post('/api/search-jobs')
                .send({
                    query: 'Python developer in Mumbai',
                    skills: 'Python, Django',
                    experience: '1-3 years'
                })
                .expect(200);
            
            expect(response.body).toHaveProperty('success', true);
            expect(response.body).toHaveProperty('jobs');
            expect(Array.isArray(response.body.jobs)).toBe(true);
        });
    });

    describe('GET /api/jobs', () => {
        it('should return paginated jobs', async () => {
            const response = await request(app)
                .get('/api/jobs')
                .expect(200);
            
            expect(response.body).toHaveProperty('jobs');
            expect(response.body).toHaveProperty('pagination');
            expect(Array.isArray(response.body.jobs)).toBe(true);
        });
    });

    describe('POST /api/jobs/bookmark', () => {
        it('should require jobId parameter', async () => {
            const response = await request(app)
                .post('/api/jobs/bookmark')
                .send({})
                .expect(400);
            
            expect(response.body).toHaveProperty('error');
        });

        it('should bookmark a job with valid jobId', async () => {
            const response = await request(app)
                .post('/api/jobs/bookmark')
                .send({ jobId: 'test-job-id' })
                .expect(200);
            
            expect(response.body).toHaveProperty('bookmarked');
            expect(response.body).toHaveProperty('message');
        });
    });

    describe('GET /api/jobs/export', () => {
        it('should export jobs as CSV', async () => {
            const response = await request(app)
                .get('/api/jobs/export?format=csv')
                .expect(200);
            
            expect(response.headers['content-type']).toMatch(/text\/csv/);
        });

        it('should export jobs as JSON', async () => {
            const response = await request(app)
                .get('/api/jobs/export?format=json')
                .expect(200);
            
            expect(response.body).toHaveProperty('jobs');
            expect(Array.isArray(response.body.jobs)).toBe(true);
        });
    });
});

// Test AI matcher
describe('Gemma Matcher', () => {
    const GemmaMatcher = require('../ai/gemmaMatcher');
    let matcher;

    beforeEach(() => {
        matcher = new GemmaMatcher();
    });

    describe('parseQuery', () => {
        it('should parse natural language query', async () => {
            const result = await matcher.parseQuery('Python developer in Mumbai last 7 days');
            
            expect(result).toHaveProperty('role');
            expect(result).toHaveProperty('location');
            expect(result).toHaveProperty('time_filter');
        });

        it('should handle fallback parsing', async () => {
            // Test with mock Gemma API failure
            matcher.apiKey = 'invalid-key';
            
            const result = await matcher.parseQuery('Frontend engineer remote');
            
            expect(result).toHaveProperty('role');
            expect(result).toHaveProperty('location');
            expect(result).toHaveProperty('time_filter');
        });
    });

    describe('matchJobs', () => {
        it('should calculate match scores for jobs', async () => {
            const jobs = [
                {
                    title: 'Python Developer',
                    company: 'Tech Corp',
                    description: 'Python Django developer needed',
                    location: 'Mumbai'
                }
            ];

            const preferences = {
                skills: ['Python', 'Django'],
                experience: '1-3 years',
                jobType: 'Full-time'
            };

            const result = await matcher.matchJobs(jobs, preferences);
            
            expect(Array.isArray(result)).toBe(true);
            expect(result[0]).toHaveProperty('match_score');
            expect(result[0]).toHaveProperty('match_reason');
            expect(result[0]).toHaveProperty('match_color');
        });
    });
});

// Test LinkedIn Scraper
describe('LinkedIn Scraper', () => {
    const LinkedInScraper = require('../scraper/linkedinScraper');
    let scraper;

    beforeEach(() => {
        scraper = new LinkedInScraper();
    });

    describe('parsePostedTime', () => {
        it('should parse ISO datetime', () => {
            const result = scraper.parsePostedTime('2024-01-01T10:00:00.000Z');
            expect(typeof result).toBe('string');
        });

        it('should handle relative time strings', () => {
            const result = scraper.parsePostedTime('2 days ago');
            expect(result).toBe('2 days ago');
        });

        it('should handle empty input', () => {
            const result = scraper.parsePostedTime('');
            expect(result).toBe('Recently posted');
        });
    });
});

// Integration tests
describe('Integration Tests', () => {
    it('should complete full job search workflow', async () => {
        // 1. Search for jobs
        const searchResponse = await request(app)
            .post('/api/search-jobs')
            .send({
                query: 'JavaScript developer remote',
                skills: 'JavaScript, React',
                experience: '2-4 years'
            });

        expect(searchResponse.status).toBe(200);
        expect(searchResponse.body.success).toBe(true);

        // 2. Get jobs with pagination
        const jobsResponse = await request(app)
            .get('/api/jobs?page=1&limit=5');

        expect(jobsResponse.status).toBe(200);
        expect(jobsResponse.body.pagination.limit).toBe(5);

        // 3. Export jobs
        const exportResponse = await request(app)
            .get('/api/jobs/export?format=csv');

        expect(exportResponse.status).toBe(200);
        expect(exportResponse.headers['content-type']).toMatch(/text\/csv/);
    });
});