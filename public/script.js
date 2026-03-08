// LinkedIn Job Scraper - Frontend JavaScript
class JobScraper {
    constructor() {
        this.jobs = [];
        this.filteredJobs = [];
        this.currentPage = 1;
        this.jobsPerPage = 12;
        this.bookmarkedJobs = new Set();
        this.currentModal = null;
        
        this.init();
    }

    init() {
        this.bindEvents();
        this.loadBookmarks();
        this.updateBookmarkCount();
    }

    bindEvents() {
        // Search functionality
        document.getElementById('searchBtn').addEventListener('click', () => this.searchJobs());
        document.getElementById('jobQuery').addEventListener('keypress', (e) => {
            if (e.key === 'Enter') this.searchJobs();
        });

        // Filter and sort
        document.querySelectorAll('.chip').forEach(chip => {
            chip.addEventListener('click', (e) => this.filterJobs(e.target.dataset.filter));
        });
        
        document.getElementById('sortJobs').addEventListener('change', (e) => this.sortJobs(e.target.value));

        // Header actions
        document.getElementById('exportBtn').addEventListener('click', () => this.exportJobs());
        document.getElementById('bookmarksBtn').addEventListener('click', () => this.showBookmarks());
        document.getElementById('settingsBtn').addEventListener('click', () => this.showSettings());

        // Modal
        document.getElementById('closeModal').addEventListener('click', () => this.closeModal());
        document.getElementById('jobModal').addEventListener('click', (e) => {
            if (e.target.id === 'jobModal') this.closeModal();
        });

        // Modal actions
        document.getElementById('modalBookmark').addEventListener('click', () => this.toggleBookmarkFromModal());
        document.getElementById('modalApply').addEventListener('click', () => this.applyToJob());

        // Pagination
        document.getElementById('prevPage').addEventListener('click', () => this.changePage(-1));
        document.getElementById('nextPage').addEventListener('click', () => this.changePage(1));

        // Footer actions
        document.getElementById('testGemma').addEventListener('click', () => this.testGemmaConnection());
        document.getElementById('healthCheck').addEventListener('click', () => this.healthCheck());

        // Keyboard shortcuts
        document.addEventListener('keydown', (e) => {
            if (e.key === 'Escape') this.closeModal();
        });
    }

    async searchJobs() {
        const query = document.getElementById('jobQuery').value.trim();
        if (!query) {
            this.showToast('Please enter a search query', 'warning');
            return;
        }

        const skills = document.getElementById('skills').value.trim();
        const experience = document.getElementById('experience').value;
        const jobType = document.getElementById('jobType').value;

        try {
            this.showStatus('Initializing job search...');
            this.updateProgress(10);

            const response = await fetch('/api/search-jobs', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json'
                },
                body: JSON.stringify({
                    query,
                    skills,
                    experience,
                    jobType
                })
            });

            if (!response.ok) {
                throw new Error(`Search failed: ${response.statusText}`);
            }

            this.updateProgress(50);
            this.showStatus('Processing job listings...');

            const data = await response.json();
            
            this.updateProgress(75);
            this.showStatus('Matching jobs with preferences...');

            await this.delay(1000); // Simulate processing time
            
            this.updateProgress(100);
            this.showStatus('Search completed!');

            await this.delay(500);
            this.hideStatus();

            this.jobs = data.jobs || [];
            this.filteredJobs = [...this.jobs];
            this.currentPage = 1;

            this.displayResults(data);
            this.renderJobs();

            this.showToast(`Found ${this.jobs.length} jobs matching your criteria`, 'success');

        } catch (error) {
            console.error('Search failed:', error);
            this.hideStatus();
            this.showToast(`Search failed: ${error.message}`, 'error');
        }
    }

    showStatus(message) {
        document.getElementById('statusSection').style.display = 'block';
        document.getElementById('resultsSection').style.display = 'none';
        document.getElementById('statusText').textContent = message;
    }

    updateProgress(percentage) {
        document.getElementById('progressFill').style.width = `${percentage}%`;
    }

    hideStatus() {
        document.getElementById('statusSection').style.display = 'none';
    }

    displayResults(data) {
        document.getElementById('resultsSection').style.display = 'block';
        document.getElementById('resultsTitle').textContent = `Job Results for "${data.query.role || 'All Positions'}"`;
        document.getElementById('resultsCount').textContent = `Found ${data.totalJobs} jobs`;
    }

    renderJobs() {
        const jobsGrid = document.getElementById('jobsGrid');
        jobsGrid.innerHTML = '';

        if (this.filteredJobs.length === 0) {
            jobsGrid.innerHTML = `
                <div class="no-results glass">
                    <i class="fas fa-search" style="font-size: 3rem; margin-bottom: 1rem; opacity: 0.5;"></i>
                    <h3>No jobs found</h3>
                    <p>Try adjusting your search criteria or filters</p>
                </div>
            `;
            return;
        }

        const startIndex = (this.currentPage - 1) * this.jobsPerPage;
        const endIndex = startIndex + this.jobsPerPage;
        const jobsToShow = this.filteredJobs.slice(startIndex, endIndex);

        jobsToShow.forEach(job => {
            const jobCard = this.createJobCard(job);
            jobsGrid.appendChild(jobCard);
        });

        this.updatePagination();
    }

    createJobCard(job) {
        const card = document.createElement('div');
        card.className = `job-card glass match-${job.match_color}`;
        card.addEventListener('click', () => this.showJobDetails(job));

        const isBookmarked = this.bookmarkedJobs.has(job.id);
        
        card.innerHTML = `
            <div class="job-header">
                <div>
                    <div class="job-title">${this.escapeHtml(job.title)}</div>
                    <div class="job-company">${this.escapeHtml(job.company)}</div>
                </div>
                <div class="match-score">
                    <div class="score-badge">${job.match_score}%</div>
                    <button class="bookmark-btn ${isBookmarked ? 'bookmarked' : ''}" 
                            onclick="event.stopPropagation(); jobScraper.toggleBookmark('${job.id}')" 
                            title="${isBookmarked ? 'Remove bookmark' : 'Add bookmark'}">
                        <i class="fas fa-bookmark"></i>
                    </button>
                </div>
            </div>
            
            <div class="job-meta">
                <div><i class="fas fa-map-marker-alt"></i> ${this.escapeHtml(job.location)}</div>
                <div><i class="fas fa-clock"></i> ${this.escapeHtml(job.postedTime)}</div>
                <div><i class="fas fa-chart-line"></i> ${this.escapeHtml(job.match_reason)}</div>
            </div>
            
            <div class="job-description">
                ${this.escapeHtml(job.description)}
            </div>
            
            <div class="job-actions">
                <button class="btn-secondary" onclick="event.stopPropagation(); jobScraper.showJobDetails('${job.id}')">
                    <i class="fas fa-info-circle"></i> Details
                </button>
                <button class="btn-primary" onclick="event.stopPropagation(); window.open('${job.link}', '_blank')">
                    <i class="fas fa-external-link-alt"></i> Apply
                </button>
            </div>
        `;

        return card;
    }

    showJobDetails(jobOrId) {
        let job;
        if (typeof jobOrId === 'string') {
            job = this.jobs.find(j => j.id === jobOrId);
        } else {
            job = jobOrId;
        }

        if (!job) return;

        this.currentModal = job;
        
        document.getElementById('modalJobTitle').textContent = job.title;
        document.getElementById('modalJobCompany').textContent = job.company;
        document.getElementById('modalJobLocation').textContent = job.location;
        document.getElementById('modalJobPosted').textContent = job.postedTime;
        document.getElementById('modalMatchScore').textContent = `${job.match_score}%`;
        document.getElementById('modalJobDescription').textContent = job.description;
        document.getElementById('modalMatchReason').textContent = job.match_reason;
        
        const bookmarkBtn = document.getElementById('modalBookmark');
        const isBookmarked = this.bookmarkedJobs.has(job.id);
        bookmarkBtn.innerHTML = isBookmarked ? 
            '<i class="fas fa-bookmark"></i> Remove Bookmark' : 
            '<i class="fas fa-bookmark"></i> Bookmark';
        bookmarkBtn.className = isBookmarked ? 'btn-secondary bookmarked' : 'btn-secondary';

        document.getElementById('jobModal').classList.add('show');
    }

    closeModal() {
        document.getElementById('jobModal').classList.remove('show');
        this.currentModal = null;
    }

    toggleBookmark(jobId) {
        if (this.bookmarkedJobs.has(jobId)) {
            this.bookmarkedJobs.delete(jobId);
            this.showToast('Job removed from bookmarks', 'success');
        } else {
            this.bookmarkedJobs.add(jobId);
            this.showToast('Job bookmarked successfully', 'success');
        }
        
        this.saveBookmarks();
        this.updateBookmarkCount();
        this.renderJobs(); // Re-render to update bookmark status
    }

    toggleBookmarkFromModal() {
        if (this.currentModal) {
            this.toggleBookmark(this.currentModal.id);
            // Update modal bookmark button
            const bookmarkBtn = document.getElementById('modalBookmark');
            const isBookmarked = this.bookmarkedJobs.has(this.currentModal.id);
            bookmarkBtn.innerHTML = isBookmarked ? 
                '<i class="fas fa-bookmark"></i> Remove Bookmark' : 
                '<i class="fas fa-bookmark"></i> Bookmark';
            bookmarkBtn.className = isBookmarked ? 'btn-secondary bookmarked' : 'btn-secondary';
        }
    }

    applyToJob() {
        if (this.currentModal && this.currentModal.link) {
            window.open(this.currentModal.link, '_blank');
            this.closeModal();
        }
    }

    filterJobs(filter) {
        // Update active chip
        document.querySelectorAll('.chip').forEach(chip => {
            chip.classList.remove('active');
        });
        document.querySelector(`[data-filter="${filter}"]`).classList.add('active');

        // Filter jobs
        switch (filter) {
            case 'green':
                this.filteredJobs = this.jobs.filter(job => job.match_score >= 70);
                break;
            case 'yellow':
                this.filteredJobs = this.jobs.filter(job => job.match_score >= 50 && job.match_score < 70);
                break;
            case 'red':
                this.filteredJobs = this.jobs.filter(job => job.match_score < 50);
                break;
            default:
                this.filteredJobs = [...this.jobs];
        }

        this.currentPage = 1;
        this.renderJobs();
        
        const filterText = filter === 'all' ? 'All Jobs' : 
                          filter === 'green' ? 'High Match Jobs' :
                          filter === 'yellow' ? 'Medium Match Jobs' : 'Low Match Jobs';
        this.showToast(`Showing ${this.filteredJobs.length} ${filterText}`, 'success');
    }

    sortJobs(sortBy) {
        switch (sortBy) {
            case 'match':
                this.filteredJobs.sort((a, b) => b.match_score - a.match_score);
                break;
            case 'date':
                this.filteredJobs.sort((a, b) => new Date(b.scrapedAt) - new Date(a.scrapedAt));
                break;
            case 'company':
                this.filteredJobs.sort((a, b) => a.company.localeCompare(b.company));
                break;
        }

        this.renderJobs();
    }

    updatePagination() {
        const totalPages = Math.ceil(this.filteredJobs.length / this.jobsPerPage);
        const paginationDiv = document.getElementById('pagination');
        
        if (totalPages <= 1) {
            paginationDiv.style.display = 'none';
            return;
        }

        paginationDiv.style.display = 'flex';
        document.getElementById('pageInfo').textContent = `Page ${this.currentPage} of ${totalPages}`;
        document.getElementById('prevPage').disabled = this.currentPage === 1;
        document.getElementById('nextPage').disabled = this.currentPage === totalPages;
    }

    changePage(direction) {
        const totalPages = Math.ceil(this.filteredJobs.length / this.jobsPerPage);
        
        if (direction === 1 && this.currentPage < totalPages) {
            this.currentPage++;
        } else if (direction === -1 && this.currentPage > 1) {
            this.currentPage--;
        }

        this.renderJobs();
        document.querySelector('.jobs-grid').scrollIntoView({ behavior: 'smooth' });
    }

    async exportJobs() {
        try {
            const response = await fetch('/api/jobs/export?format=csv');
            if (!response.ok) throw new Error('Export failed');

            const blob = await response.blob();
            const url = window.URL.createObjectURL(blob);
            const a = document.createElement('a');
            a.href = url;
            a.download = `linkedin-jobs-${new Date().toISOString().split('T')[0]}.csv`;
            document.body.appendChild(a);
            a.click();
            document.body.removeChild(a);
            window.URL.revokeObjectURL(url);

            this.showToast('Jobs exported successfully', 'success');
        } catch (error) {
            console.error('Export failed:', error);
            this.showToast('Export failed', 'error');
        }
    }

    showBookmarks() {
        const bookmarkedJobs = this.jobs.filter(job => this.bookmarkedJobs.has(job.id));
        
        if (bookmarkedJobs.length === 0) {
            this.showToast('No bookmarked jobs found', 'warning');
            return;
        }

        this.filteredJobs = bookmarkedJobs;
        this.currentPage = 1;
        this.renderJobs();
        
        // Update results header
        document.getElementById('resultsTitle').textContent = 'Bookmarked Jobs';
        document.getElementById('resultsCount').textContent = `${bookmarkedJobs.length} bookmarked jobs`;
        document.getElementById('resultsSection').style.display = 'block';

        this.showToast(`Showing ${bookmarkedJobs.length} bookmarked jobs`, 'success');
    }

    showSettings() {
        this.showToast('Settings panel coming soon!', 'warning');
    }

    async testGemmaConnection() {
        try {
            const response = await fetch('/api/test-gemma', { method: 'POST' });
            const data = await response.json();
            
            if (data.connected) {
                this.showToast('Gemma AI is connected and working', 'success');
            } else {
                this.showToast('Gemma AI connection failed', 'error');
            }
        } catch (error) {
            console.error('Gemma test failed:', error);
            this.showToast('Failed to test Gemma connection', 'error');
        }
    }

    async healthCheck() {
        try {
            const response = await fetch('/api/health');
            const data = await response.json();
            
            if (data.status === 'healthy') {
                this.showToast(`Server is healthy. ${data.cachedJobs} jobs cached, ${data.bookmarkedJobs} bookmarked`, 'success');
            } else {
                this.showToast('Server health check failed', 'error');
            }
        } catch (error) {
            console.error('Health check failed:', error);
            this.showToast('Health check failed', 'error');
        }
    }

    saveBookmarks() {
        localStorage.setItem('bookmarkedJobs', JSON.stringify([...this.bookmarkedJobs]));
    }

    loadBookmarks() {
        const saved = localStorage.getItem('bookmarkedJobs');
        if (saved) {
            this.bookmarkedJobs = new Set(JSON.parse(saved));
        }
    }

    updateBookmarkCount() {
        document.getElementById('bookmarkCount').textContent = this.bookmarkedJobs.size;
    }

    showToast(message, type = 'info') {
        const toastContainer = document.getElementById('toastContainer');
        const toast = document.createElement('div');
        toast.className = `toast ${type}`;
        toast.innerHTML = `
            <i class="fas fa-${type === 'success' ? 'check-circle' : 
                              type === 'error' ? 'exclamation-circle' : 
                              type === 'warning' ? 'exclamation-triangle' : 'info-circle'}"></i>
            ${message}
        `;

        toastContainer.appendChild(toast);

        // Remove toast after 4 seconds
        setTimeout(() => {
            if (toast.parentNode) {
                toast.parentNode.removeChild(toast);
            }
        }, 4000);
    }

    escapeHtml(text) {
        if (!text) return '';
        const div = document.createElement('div');
        div.textContent = text;
        return div.innerHTML;
    }

    delay(ms) {
        return new Promise(resolve => setTimeout(resolve, ms));
    }
}

// Initialize the application
const jobScraper = new JobScraper();

// Add some demo data for testing UI
window.addEventListener('load', () => {
    // Add sample search suggestions
    const searchInput = document.getElementById('jobQuery');
    const suggestions = [
        'Python developer in Mumbai last 7 days',
        'Frontend engineer remote past week',
        'Data scientist NYC past month',
        'Full stack developer Bangalore recent',
        'DevOps engineer London past week'
    ];

    let currentSuggestion = 0;
    
    function rotatePlaceholder() {
        if (searchInput.value === '') {
            searchInput.placeholder = suggestions[currentSuggestion];
            currentSuggestion = (currentSuggestion + 1) % suggestions.length;
        }
    }

    // Rotate placeholder text every 3 seconds
    setInterval(rotatePlaceholder, 3000);

    // Show welcome message
    setTimeout(() => {
        jobScraper.showToast('Welcome to LinkedIn Job Scraper! Start by entering a search query.', 'success');
    }, 1000);
});

// Service Worker for offline support (optional)
if ('serviceWorker' in navigator) {
    window.addEventListener('load', () => {
        navigator.serviceWorker.register('/sw.js')
            .then(registration => {
                console.log('SW registered: ', registration);
            })
            .catch(registrationError => {
                console.log('SW registration failed: ', registrationError);
            });
    });
}

// Global error handler for unhandled promises
window.addEventListener('unhandledrejection', event => {
    console.error('Unhandled promise rejection:', event.reason);
    jobScraper.showToast('An unexpected error occurred', 'error');
});

// Network status detection
window.addEventListener('online', () => {
    jobScraper.showToast('Internet connection restored', 'success');
});

window.addEventListener('offline', () => {
    jobScraper.showToast('Internet connection lost', 'warning');
});

// Keyboard shortcuts
document.addEventListener('keydown', (e) => {
    // Ctrl/Cmd + K to focus search
    if ((e.ctrlKey || e.metaKey) && e.key === 'k') {
        e.preventDefault();
        document.getElementById('jobQuery').focus();
    }
    
    // Ctrl/Cmd + Enter to search
    if ((e.ctrlKey || e.metaKey) && e.key === 'Enter') {
        e.preventDefault();
        jobScraper.searchJobs();
    }
});

// Export jobScraper to global scope for HTML onclick handlers
window.jobScraper = jobScraper;