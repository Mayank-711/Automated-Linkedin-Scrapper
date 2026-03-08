# 🚀 LinkedIn Job Scraper - AI Powered Job Search

A modern, full-stack web application that scrapes LinkedIn jobs and uses AI to match them with your preferences. Built with Node.js, Playwright, Gemma AI, and a beautiful glassmorphism UI.

![LinkedIn Job Scraper](https://via.placeholder.com/800x400/667eea/ffffff?text=LinkedIn+Job+Scraper)

## ✨ Features

### 🔍 Smart Job Search
- **Natural Language Queries**: Search using phrases like "Python developer in Mumbai last 7 days"
- **AI-Powered Parsing**: Gemma AI converts natural language to structured search parameters
- **Advanced Filtering**: Filter by skills, experience level, and job type

### 🕷️ Intelligent Scraping
- **Playwright Integration**: Robust web scraping with bot detection avoidance
- **Dynamic Content Loading**: Handles JavaScript-rendered job listings
- **Anti-Detection**: Smart delays and human-like browsing patterns

### 🤖 AI-Powered Matching
- **Job Matching**: AI analyzes job descriptions against your preferences
- **Match Scoring**: Get percentage match scores with detailed explanations
- **Preference Learning**: System learns from your interactions

### 🎨 Modern UI
- **Glassmorphism Design**: Beautiful frosted glass aesthetic
- **Dark Theme**: Easy on the eyes with gradient backgrounds
- **Responsive Layout**: Works perfectly on desktop and mobile
- **Smooth Animations**: Engaging user experience with fluid transitions

### 📊 Advanced Features
- **Job Bookmarking**: Save interesting opportunities for later
- **CSV Export**: Export job listings for external analysis
- **Pagination**: Efficiently browse through large result sets
- **Real-time Status**: Live updates during scraping process

## 🛠️ Tech Stack

### Backend
- **Node.js** - Runtime environment
- **Express.js** - Web framework
- **Playwright** - Web scraping and automation
- **Cheerio** - Server-side HTML parsing
- **Axios** - HTTP client for API calls

### Frontend
- **HTML5** - Semantic markup
- **CSS3** - Modern styling with glassmorphism effects
- **Vanilla JavaScript** - No dependencies, pure performance
- **Font Awesome** - Icon library
- **Google Fonts** - Typography (Inter)

### AI & APIs
- **Gemma AI** - Google's AI model for query parsing and job matching
- **Google AI Studio** - AI API management

## 📁 Project Structure

```
linkedin-job-scraper/
├── 📁 scraper/
│   └── 📄 linkedinScraper.js    # Playwright scraping logic
├── 📁 ai/
│   └── 📄 gemmaMatcher.js       # Gemma AI integration
├── 📁 routes/
│   └── 📄 jobs.js               # API endpoints
├── 📁 public/
│   ├── 📄 index.html            # Main UI
│   ├── 📄 style.css             # Glassmorphism styling
│   └── 📄 script.js             # Frontend logic
├── 📁 .github/
│   └── 📄 copilot-instructions.md
├── 📄 server.js                 # Main server file
├── 📄 package.json              # Dependencies & scripts
├── 📄 .env                      # Environment variables
├── 📄 .gitignore                # Git ignore rules
└── 📄 README.md                 # This file
```

## 🚀 Quick Start

### Prerequisites
- **Node.js** (v16 or higher)
- **npm** (v8 or higher)
- **Gemma API Key** from [Google AI Studio](https://makersuite.google.com/app/apikey)

### Installation

1. **Clone the repository**
   ```bash
   git clone https://github.com/yourusername/linkedin-job-scraper.git
   cd linkedin-job-scraper
   ```

2. **Install dependencies**
   ```bash
   npm install
   ```

3. **Install Playwright browsers**
   ```bash
   npx playwright install
   ```

4. **Configure environment variables**
   ```bash
   cp .env .env.local
   # Edit .env.local with your actual values
   ```

5. **Start the application**
   ```bash
   npm run dev
   ```

6. **Open your browser**
   Navigate to `http://localhost:5000`

## ⚙️ Configuration

### Environment Variables

Create a `.env.local` file with the following variables:

```bash
# Required
PORT=5000
GEMMA_API_KEY=your_gemma_api_key_here

# Optional (for LinkedIn login)
LINKEDIN_EMAIL=your_email@example.com
LINKEDIN_PASSWORD=your_password

# Scraping settings
SCRAPE_DELAY=2000
MAX_JOBS_PER_SEARCH=50
BROWSER_HEADLESS=true
```

### Getting a Gemma API Key

1. Visit [Google AI Studio](https://makersuite.google.com/app/apikey)
2. Sign in with your Google account
3. Create a new API key
4. Copy the key to your `.env` file

### LinkedIn Credentials (Optional)

⚠️ **Warning**: Using LinkedIn credentials may violate their Terms of Service. Use with caution and consider LinkedIn's official API for production use.

- The scraper can work without credentials using public job listings
- Credentials may provide access to more detailed job information
- Use a dedicated LinkedIn account for scraping activities

## 🎯 Usage Guide

### Basic Job Search

1. **Enter a natural language query**:
   - "Python developer in Mumbai last 7 days"
   - "Frontend engineer remote past week"
   - "Data scientist NYC past month"

2. **Set your preferences** (optional):
   - Skills: "Python, Django, REST API"
   - Experience: Select from dropdown
   - Job Type: Full-time, Part-time, Contract, Remote

3. **Click "Search Jobs"** and wait for results

### Understanding Results

- **Match Score**: AI-calculated percentage based on your preferences
- **Color Coding**:
  - 🟢 Green: High match (70%+)
  - 🟡 Yellow: Medium match (50-69%)
  - 🔴 Red: Low match (<50%)
- **Match Reason**: AI explanation of why the job matches

### Advanced Features

- **Bookmark Jobs**: Click bookmark icon to save for later
- **Export Data**: Download job listings as CSV
- **Filter Results**: Use chips to filter by match score
- **Sort Options**: Sort by match score, date, or company

## 🔧 API Endpoints

### POST `/api/search-jobs`
Search for jobs using natural language query.

**Request Body:**
```json
{
  "query": "Python developer in Mumbai last 7 days",
  "skills": "Python, Django, REST API",
  "experience": "1-3 years",
  "jobType": "Full-time"
}
```

**Response:**
```json
{
  "success": true,
  "query": {
    "role": "Python Developer",
    "location": "Mumbai",
    "time_filter": "past week"
  },
  "totalJobs": 25,
  "jobs": [...],
  "timestamp": "2024-01-01T00:00:00.000Z"
}
```

### GET `/api/jobs`
Get cached job results with pagination.

**Query Parameters:**
- `page`: Page number (default: 1)
- `limit`: Jobs per page (default: 20)
- `minScore`: Minimum match score (default: 0)

### POST `/api/jobs/bookmark`
Bookmark or unbookmark a job.

### GET `/api/jobs/export`
Export jobs to CSV format.

### GET `/api/health`
Health check endpoint.

## 🧪 Testing

### Run Tests
```bash
npm test
```

### Test AI Connection
```bash
curl -X POST http://localhost:5000/api/test-gemma
```

### Health Check
```bash
curl http://localhost:5000/api/health
```

## 🚀 Deployment

### Environment Setup
```bash
NODE_ENV=production
BROWSER_HEADLESS=true
PORT=80
```

### Docker Deployment (Optional)
```dockerfile
FROM node:18-alpine
WORKDIR /app
COPY package*.json ./
RUN npm ci --only=production
COPY . .
RUN npx playwright install --with-deps chromium
EXPOSE 5000
CMD ["npm", "start"]
```

### Process Manager (PM2)
```bash
npm install -g pm2
pm2 start server.js --name "job-scraper"
pm2 startup
pm2 save
```

## 🛡️ Security Considerations

- **Rate Limiting**: Built-in API rate limiting
- **Input Validation**: All inputs are sanitized
- **Environment Variables**: Sensitive data stored in `.env`
- **CORS Protection**: Configurable CORS origins
- **LinkedIn ToS**: Be mindful of LinkedIn's Terms of Service

## 🐛 Troubleshooting

### Common Issues

1. **Scraper not working**:
   - Check if Playwright browsers are installed
   - Verify LinkedIn access (try without credentials first)
   - Check console logs for errors

2. **AI not responding**:
   - Verify Gemma API key is correct
   - Check internet connection
   - Test with `/api/test-gemma` endpoint

3. **No jobs found**:
   - Try broader search terms
   - Check if LinkedIn changed their HTML structure
   - Verify search parameters

### Debug Mode
```bash
DEBUG_MODE=true npm run dev
```

## 📈 Performance Optimization

- **Caching**: Results cached for 1 hour
- **Compression**: Gzip compression enabled
- **Rate Limiting**: Prevents API abuse
- **Lazy Loading**: Jobs loaded on demand
- **Debounced Search**: Prevents excessive API calls

## 🤝 Contributing

1. Fork the repository
2. Create a feature branch
3. Make your changes
4. Add tests (if applicable)
5. Submit a pull request

### Code Style
- Use ESLint configuration
- Follow existing naming conventions
- Add comments for complex logic
- Update documentation

## 📄 License

This project is licensed under the MIT License - see the [LICENSE](LICENSE) file for details.

## ⚠️ Disclaimer

This tool is for educational and personal use only. Web scraping should be done responsibly and in accordance with the target website's Terms of Service and robots.txt file. The authors are not responsible for any misuse of this tool.

## 🆘 Support

- **Issues**: [GitHub Issues](https://github.com/yourusername/linkedin-job-scraper/issues)
- **Discussions**: [GitHub Discussions](https://github.com/yourusername/linkedin-job-scraper/discussions)
- **Email**: support@jobscraper.com

## 🎯 Roadmap

- [ ] **Database Integration** - PostgreSQL/MongoDB support
- [ ] **User Authentication** - Login and personalized preferences
- [ ] **Job Alerts** - Email/Slack notifications for new matches
- [ ] **Analytics Dashboard** - Job market insights and trends
- [ ] **Mobile App** - React Native or Flutter app
- [ ] **LinkedIn API** - Official API integration
- [ ] **Multi-platform** - Indeed, Glassdoor, etc.
- [ ] **AI Improvements** - Better matching algorithms
- [ ] **Chrome Extension** - Browser extension for quick searches

## 🌟 Acknowledgments

- **Playwright Team** - For the amazing browser automation framework
- **Google AI Team** - For the powerful Gemma AI model
- **Open Source Community** - For the incredible tools and libraries

---

Made with ❤️ by the LinkedIn Job Scraper Team

**Star ⭐ this repository if you found it helpful!**