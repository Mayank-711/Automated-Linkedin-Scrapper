const { chromium } = require('playwright');
const cheerio = require('cheerio');

class LinkedInScraper {
    constructor() {
        this.browser = null;
        this.page = null;
    }

    async init() {
        try {
            // Launch browser with anti-detection settings
            this.browser = await chromium.launch({
                headless: process.env.BROWSER_HEADLESS === 'true', // Respect env variable
                args: [
                    '--no-sandbox',
                    '--disable-setuid-sandbox',
                    '--disable-blink-features=AutomationControlled',
                    '--disable-features=VizDisplayCompositor'
                ]
            });

            this.page = await this.browser.newPage();
            
            // Set user agent to avoid detection - using proper method
            await this.page.setExtraHTTPHeaders({
                'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36'
            });
            
            return true;
        } catch (error) {
            console.error('Failed to initialize browser:', error);
            return false;
        }
    }

    async loginToLinkedIn() {
        try {
            await this.page.goto('https://www.linkedin.com/login');
            await this.page.waitForTimeout(2000);

            // Enter credentials if provided
            if (process.env.LINKEDIN_EMAIL && process.env.LINKEDIN_PASSWORD) {
                await this.page.fill('#username', process.env.LINKEDIN_EMAIL);
                await this.page.fill('#password', process.env.LINKEDIN_PASSWORD);
                
                await this.page.click('[type="submit"]');
                await this.page.waitForTimeout(3000);
                
                // Handle potential 2FA or captcha
                const currentUrl = this.page.url();
                if (currentUrl.includes('challenge')) {
                    console.log('⚠️ LinkedIn requires additional verification. Please complete it manually.');
                    await this.page.waitForTimeout(30000); // Wait for manual intervention
                }
            }
            
            return true;
        } catch (error) {
            console.error('Login failed:', error);
            return false;
        }
    }

    async searchJobs(searchParams) {
        try {
            const { role, location, timeFilter } = searchParams;
            
            // Build search URL
            const baseUrl = 'https://www.linkedin.com/jobs/search';
            const params = new URLSearchParams();
            
            if (role) params.append('keywords', role);
            if (location) params.append('location', location);
            if (timeFilter) {
                const timeMap = {
                    'past 24 hours': 'r86400',
                    'past week': 'r604800',
                    'past month': 'r2592000'
                };
                params.append('f_TPR', timeMap[timeFilter] || 'r604800');
            }

            const searchUrl = `${baseUrl}?${params.toString()}`;
            console.log(`🔍 Searching: ${searchUrl}`);

            await this.page.goto(searchUrl);
            await this.page.waitForTimeout(3000);

            // Wait for job listings to load
            await this.page.waitForSelector('.jobs-search__results-list', { timeout: 10000 });

            // Scroll to load more jobs
            await this.scrollAndLoadJobs();

            // Extract job data
            const jobs = await this.extractJobData();
            
            return jobs;
        } catch (error) {
            console.error('Job search failed:', error);
            throw error;
        }
    }

    async scrollAndLoadJobs() {
        try {
            let previousHeight = 0;
            let currentHeight = await this.page.evaluate(() => document.body.scrollHeight);
            let scrollAttempts = 0;
            const maxScrolls = 5; // Limit scrolling to avoid infinite loops

            while (previousHeight !== currentHeight && scrollAttempts < maxScrolls) {
                previousHeight = currentHeight;
                
                // Scroll to bottom
                await this.page.evaluate(() => window.scrollTo(0, document.body.scrollHeight));
                await this.page.waitForTimeout(2000);
                
                // Check for "Load more" button
                const loadMoreButton = await this.page.$('.infinite-scroller__show-more-button');
                if (loadMoreButton) {
                    await loadMoreButton.click();
                    await this.page.waitForTimeout(2000);
                }
                
                currentHeight = await this.page.evaluate(() => document.body.scrollHeight);
                scrollAttempts++;
            }
            
            console.log(`📜 Scrolled ${scrollAttempts} times to load jobs`);
        } catch (error) {
            console.error('Scrolling failed:', error);
        }
    }

    async extractJobData() {
        try {
            const html = await this.page.content();
            const $ = cheerio.load(html);
            const jobs = [];

            $('.jobs-search__results-list .result-card').each((index, element) => {
                try {
                    const $job = $(element);
                    
                    const title = $job.find('.result-card__title').text().trim();
                    const company = $job.find('.result-card__subtitle').text().trim();
                    const location = $job.find('.job-result-card__location').text().trim();
                    const link = $job.find('.result-card__title a').attr('href');
                    const postedTime = $job.find('time').attr('datetime') || 
                                     $job.find('.job-result-card__listdate').text().trim();
                    const description = $job.find('.job-result-card__snippet').text().trim();

                    if (title && company) {
                        jobs.push({
                            title,
                            company,
                            location: location || 'Not specified',
                            link: link ? `https://www.linkedin.com${link}` : '',
                            postedTime: this.parsePostedTime(postedTime),
                            description: description || 'No description available',
                            id: `job_${Date.now()}_${index}`,
                            scrapedAt: new Date().toISOString()
                        });
                    }
                } catch (err) {
                    console.warn('Failed to parse job:', err);
                }
            });

            // Alternative selector if primary one doesn't work
            if (jobs.length === 0) {
                $('.job-search-card').each((index, element) => {
                    try {
                        const $job = $(element);
                        
                        const title = $job.find('.base-search-card__title').text().trim();
                        const company = $job.find('.base-search-card__subtitle').text().trim();
                        const location = $job.find('.job-search-card__location').text().trim();
                        const link = $job.find('a.base-card__full-link').attr('href');
                        const postedTime = $job.find('time').attr('datetime');
                        const description = $job.find('.job-search-card__snippet').text().trim();

                        if (title && company) {
                            jobs.push({
                                title,
                                company,
                                location: location || 'Not specified',
                                link: link || '',
                                postedTime: this.parsePostedTime(postedTime),
                                description: description || 'No description available',
                                id: `job_${Date.now()}_${index}`,
                                scrapedAt: new Date().toISOString()
                            });
                        }
                    } catch (err) {
                        console.warn('Failed to parse job (alternative):', err);
                    }
                });
            }

            console.log(`✅ Scraped ${jobs.length} jobs`);
            return jobs;
        } catch (error) {
            console.error('Data extraction failed:', error);
            return [];
        }
    }

    parsePostedTime(timeStr) {
        if (!timeStr) return 'Recently posted';
        
        // Handle ISO datetime
        if (timeStr.includes('T')) {
            const date = new Date(timeStr);
            const now = new Date();
            const diffTime = Math.abs(now - date);
            const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
            
            if (diffDays === 1) return '1 day ago';
            if (diffDays < 7) return `${diffDays} days ago`;
            if (diffDays < 30) return `${Math.floor(diffDays/7)} weeks ago`;
            return `${Math.floor(diffDays/30)} months ago`;
        }
        
        // Return as is for relative time strings
        return timeStr;
    }

    async close() {
        try {
            if (this.browser) {
                await this.browser.close();
                console.log('🔒 Browser closed');
            }
        } catch (error) {
            console.error('Failed to close browser:', error);
        }
    }
}

module.exports = LinkedInScraper;