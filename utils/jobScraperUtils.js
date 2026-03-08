// Utility functions for LinkedIn Job Scraper
const fs = require('fs').promises;
const path = require('path');

class JobScraperUtils {
    constructor() {
        this.exportDir = path.join(__dirname, '..', 'exports');
        this.ensureExportDir();
    }

    async ensureExportDir() {
        try {
            await fs.access(this.exportDir);
        } catch {
            await fs.mkdir(this.exportDir, { recursive: true });
        }
    }

    // Enhanced CSV Export with custom fields
    async exportToCSV(jobs, options = {}) {
        const {
            filename = `jobs-${new Date().toISOString().split('T')[0]}.csv`,
            fields = ['title', 'company', 'location', 'postedTime', 'match_score', 'match_reason', 'link'],
            includeDescription = false
        } = options;

        let csvContent = '';
        
        // Header
        const headers = [...fields];
        if (includeDescription) headers.push('description');
        csvContent += headers.map(h => `"${h.charAt(0).toUpperCase() + h.slice(1).replace('_', ' ')}"`).join(',') + '\n';
        
        // Rows
        for (const job of jobs) {
            const row = fields.map(field => {
                const value = job[field] || '';
                return `"${String(value).replace(/"/g, '""')}"`;
            });
            
            if (includeDescription) {
                row.push(`"${String(job.description || '').replace(/"/g, '""')}"`);
            }
            
            csvContent += row.join(',') + '\n';
        }

        const filePath = path.join(this.exportDir, filename);
        await fs.writeFile(filePath, csvContent, 'utf8');
        
        return filePath;
    }

    // Export to Excel-compatible format
    async exportToExcel(jobs, filename = `jobs-${new Date().toISOString().split('T')[0]}.xlsx`) {
        // This would require additional dependencies like 'xlsx'
        // For now, we'll export as CSV with Excel-compatible formatting
        return this.exportToCSV(jobs, { 
            filename: filename.replace('.xlsx', '.csv'),
            includeDescription: true 
        });
    }

    // Job Alert System
    async createJobAlert(criteria) {
        const alert = {
            id: this.generateId(),
            criteria,
            createdAt: new Date().toISOString(),
            lastChecked: null,
            isActive: true,
            matchCount: 0
        };

        const alertsFile = path.join(this.exportDir, 'job-alerts.json');
        let alerts = [];
        
        try {
            const data = await fs.readFile(alertsFile, 'utf8');
            alerts = JSON.parse(data);
        } catch (error) {
            // File doesn't exist, start with empty array
        }

        alerts.push(alert);
        await fs.writeFile(alertsFile, JSON.stringify(alerts, null, 2));
        
        return alert;
    }

    // Check job alerts against new jobs
    async checkJobAlerts(newJobs) {
        const alertsFile = path.join(this.exportDir, 'job-alerts.json');
        
        try {
            const data = await fs.readFile(alertsFile, 'utf8');
            const alerts = JSON.parse(data);
            const notifications = [];

            for (const alert of alerts.filter(a => a.isActive)) {
                const matches = this.matchJobsToAlert(newJobs, alert.criteria);
                
                if (matches.length > 0) {
                    notifications.push({
                        alertId: alert.id,
                        criteria: alert.criteria,
                        matches,
                        matchCount: matches.length
                    });

                    // Update alert
                    alert.lastChecked = new Date().toISOString();
                    alert.matchCount += matches.length;
                }
            }

            // Save updated alerts
            await fs.writeFile(alertsFile, JSON.stringify(alerts, null, 2));
            
            return notifications;
        } catch (error) {
            console.error('Error checking job alerts:', error);
            return [];
        }
    }

    matchJobsToAlert(jobs, criteria) {
        return jobs.filter(job => {
            const jobText = `${job.title} ${job.description} ${job.company}`.toLowerCase();
            
            // Check if job matches alert criteria
            let matches = true;
            
            if (criteria.keywords) {
                const hasKeywords = criteria.keywords.some(keyword => 
                    jobText.includes(keyword.toLowerCase())
                );
                matches = matches && hasKeywords;
            }

            if (criteria.location) {
                matches = matches && job.location.toLowerCase().includes(criteria.location.toLowerCase());
            }

            if (criteria.minMatchScore) {
                matches = matches && job.match_score >= criteria.minMatchScore;
            }

            if (criteria.companies) {
                const isFromCompany = criteria.companies.some(company =>
                    job.company.toLowerCase().includes(company.toLowerCase())
                );
                matches = matches && isFromCompany;
            }

            return matches;
        });
    }

    // Job Statistics
    generateJobStatistics(jobs) {
        const stats = {
            totalJobs: jobs.length,
            averageMatchScore: 0,
            topCompanies: {},
            topLocations: {},
            accompaniedByScores: {
                high: 0,    // 70%+
                medium: 0,  // 50-69%
                low: 0      // <50%
            },
            recentJobs: 0, // Posted in last 7 days
            remoteJobs: 0
        };

        if (jobs.length === 0) return stats;

        let totalScore = 0;
        const oneWeekAgo = new Date();
        oneWeekAgo.setDate(oneWeekAgo.getDate() - 7);

        jobs.forEach(job => {
            // Match scores
            totalScore += job.match_score || 0;
            
            if (job.match_score >= 70) stats.accompaniedByScores.high++;
            else if (job.match_score >= 50) stats.accompaniedByScores.medium++;
            else stats.accompaniedByScores.low++;

            // Company statistics
            if (job.company) {
                stats.topCompanies[job.company] = (stats.topCompanies[job.company] || 0) + 1;
            }

            // Location statistics
            if (job.location) {
                stats.topLocations[job.location] = (stats.topLocations[job.location] || 0) + 1;
            }

            // Recent jobs
            if (job.scrapedAt) {
                const jobDate = new Date(job.scrapedAt);
                if (jobDate > oneWeekAgo) stats.recentJobs++;
            }

            // Remote jobs
            if (job.location && job.location.toLowerCase().includes('remote')) {
                stats.remoteJobs++;
            }
        });

        stats.averageMatchScore = Math.round(totalScore / jobs.length);

        // Sort top companies and locations
        stats.topCompanies = Object.entries(stats.topCompanies)
            .sort(([,a], [,b]) => b - a)
            .slice(0, 10)
            .reduce((obj, [key, value]) => ({ ...obj, [key]: value }), {});

        stats.topLocations = Object.entries(stats.topLocations)
            .sort(([,a], [,b]) => b - a)
            .slice(0, 10)
            .reduce((obj, [key, value]) => ({ ...obj, [key]: value }), {});

        return stats;
    }

    // Save job search history
    async saveSearchHistory(searchQuery, results) {
        const historyFile = path.join(this.exportDir, 'search-history.json');
        let history = [];
        
        try {
            const data = await fs.readFile(historyFile, 'utf8');
            history = JSON.parse(data);
        } catch (error) {
            // File doesn't exist, start with empty array
        }

        const searchEntry = {
            id: this.generateId(),
            query: searchQuery,
            timestamp: new Date().toISOString(),
            resultCount: results.length,
            topMatch: results[0] ? {
                title: results[0].title,
                company: results[0].company,
                matchScore: results[0].match_score
            } : null
        };

        history.unshift(searchEntry);
        
        // Keep only last 50 searches
        history = history.slice(0, 50);
        
        await fs.writeFile(historyFile, JSON.stringify(history, null, 2));
        
        return searchEntry;
    }

    // Get search history
    async getSearchHistory(limit = 20) {
        const historyFile = path.join(this.exportDir, 'search-history.json');
        
        try {
            const data = await fs.readFile(historyFile, 'utf8');
            const history = JSON.parse(data);
            return history.slice(0, limit);
        } catch (error) {
            return [];
        }
    }

    // Clean old files
    async cleanupOldFiles(maxAgeDays = 30) {
        try {
            const files = await fs.readdir(this.exportDir);
            const cutoffDate = new Date();
            cutoffDate.setDate(cutoffDate.getDate() - maxAgeDays);
            
            let deletedCount = 0;
            
            for (const filename of files) {
                if (filename.endsWith('.csv') || filename.endsWith('.json')) {
                    const filePath = path.join(this.exportDir, filename);
                    const stats = await fs.stat(filePath);
                    
                    if (stats.birthtime < cutoffDate) {
                        await fs.unlink(filePath);
                        deletedCount++;
                    }
                }
            }
            
            return { deletedFiles: deletedCount };
        } catch (error) {
            console.error('Cleanup failed:', error);
            return { error: error.message };
        }
    }

    // Generate unique ID
    generateId() {
        return Date.now().toString(36) + Math.random().toString(36).substr(2, 9);
    }

    // Validate job object
    validateJob(job) {
        const required = ['title', 'company', 'location'];
        const missing = required.filter(field => !job[field]);
        
        return {
            isValid: missing.length === 0,
            missingFields: missing,
            warnings: this.getJobWarnings(job)
        };
    }

    getJobWarnings(job) {
        const warnings = [];
        
        if (!job.link || !job.link.includes('linkedin.com')) {
            warnings.push('Invalid or missing LinkedIn URL');
        }
        
        if (!job.description || job.description.length < 50) {
            warnings.push('Job description is too short or missing');
        }
        
        if (!job.match_score || job.match_score < 0 || job.match_score > 100) {
            warnings.push('Invalid match score');
        }
        
        return warnings;
    }

    // Format job for display
    formatJobForDisplay(job) {
        return {
            ...job,
            title: job.title?.trim(),
            company: job.company?.trim(),
            location: job.location?.trim(),
            description: job.description?.substring(0, 200) + (job.description?.length > 200 ? '...' : ''),
            match_score: Math.round(job.match_score || 0),
            postedTime: this.formatRelativeTime(job.postedTime),
            salary: this.extractSalary(job.description)
        };
    }

    formatRelativeTime(timeStr) {
        if (!timeStr) return 'Recently';
        
        // If it's already a relative string, return as is
        if (timeStr.includes('ago') || timeStr.includes('Recently')) {
            return timeStr;
        }
        
        // Try to parse as date
        try {
            const date = new Date(timeStr);
            const now = new Date();
            const diffMs = now - date;
            const diffDays = Math.floor(diffMs / (1000 * 60 * 60 * 24));
            
            if (diffDays === 0) return 'Today';
            if (diffDays === 1) return '1 day ago';
            if (diffDays < 7) return `${diffDays} days ago`;
            if (diffDays < 30) return `${Math.floor(diffDays / 7)} weeks ago`;
            return `${Math.floor(diffDays / 30)} months ago`;
        } catch {
            return timeStr;
        }
    }

    extractSalary(description) {
        if (!description) return null;
        
        const salaryPatterns = [
            /₹\s*(\d+(?:,\d+)*(?:\.\d+)?)\s*(?:lakh?s?|crores?)/gi,
            /\$\s*(\d+(?:,\d+)*(?:\.\d+)?)\s*(?:k|thousand)/gi,
            /(\d+(?:,\d+)*(?:\.\d+)?)\s*(?:lpa|per annum)/gi
        ];
        
        for (const pattern of salaryPatterns) {
            const match = description.match(pattern);
            if (match) {
                return match[0];
            }
        }
        
        return null;
    }
}

module.exports = JobScraperUtils;