# MCP Brave Search Server

Web search through Brave Search

## 🚀 Features

- **TypeScript**: Full type safety with modern TypeScript patterns
- **JSON API Integration**: Fast and accurate search results via Brave Search JSON API
- **HTTP Transport**: RESTful API with Express.js server
- **Session Management**: Stateful connections with proper session handling
- **Configuration Management**: Environment-based configuration with validation
- **Error Handling**: Comprehensive error handling and logging
- **Health Checks**: Built-in health monitoring endpoints
- **Docker Support**: Production-ready containerization
- **Development Tools**: ESLint, Prettier, and testing setup
- **Production Ready**: Optimized for scalability and security

## 📋 Prerequisites

- Node.js 20+
- npm or yarn
- Docker (optional, for containerization)

## 🛠️ Quick Start

### Option 1: Use the Project Generator (Recommended)

```bash
# Clone the template
git clone <your-repo-url>
cd mcp-brave-search

# Create a new project using the generator
./create-mcp-project your-project-name --description "Your project description" --author "Your Name"

# Or use the Node.js script directly
node setup-new-project.js your-project-name --description "Your project description" --author "Your Name"
```

#### Generator Options:

- `--description <desc>`: Project description
- `--author <name>`: Author name
- `--target-dir <dir>`: Target directory (default: mcp-<project-name>)
- `--install-deps`: Install npm dependencies automatically
- `--no-git`: Skip git repository initialization

### Option 2: Manual Setup

```bash
# Clone the template
git clone <your-repo-url>
cd mcp-brave-search

# Install dependencies
npm install

# Copy environment configuration
cp .env.example .env  # Create this file with your settings
```

### 2. API Key Setup

Before using the server, you need to obtain a Brave Search API key:

1. Visit the [Brave Search API Dashboard](https://api.search.brave.com/)
2. Sign up for an account or log in
3. Create a new API subscription
4. Copy your API key from the dashboard

### 3. Environment Configuration

Create a `.env` file in the root directory:

```env
# Server Configuration
PORT=3000
LOG_LEVEL=info

# Brave Search API Configuration
BRAVE_API_KEY=your_brave_search_api_key_here

# Add your custom environment variables here
```

### 4. Development

```bash
# Start development server with hot reload
npm run dev

# Build for production
npm run build

# Start production server
npm start

# Run tests
npm test

# Lint and format code
npm run lint
npm run lint:fix
```

## 🏗️ Project Structure

```
mcp-brave-search/
├── src/
│   ├── config/           # Configuration management
│   │   └── index.ts      # Main config file
│   ├── domain/           # Core business logic
│   │   └── brave.ts      # Brave Search API integration
│   ├── types.ts          # TypeScript type definitions
│   └── index.ts          # Main server application
├── tests/                # Test files
│   ├── integration/      # Integration tests
│   └── setup.ts          # Test setup utilities
├── create-mcp-project    # Bash script for project generation
├── setup-new-project.js  # Node.js project generator
├── Dockerfile            # Docker configuration
├── package.json          # Dependencies and scripts
├── tsconfig.json         # TypeScript configuration
└── README.md            # This file
```

## 🔧 Project Generator

This template includes powerful project generation tools to quickly create new MCP servers:

### Features:

- **Automatic Name Conversion**: Converts kebab-case names to all required formats (camelCase, PascalCase, etc.)
- **File Templating**: Updates all files with the new project name and details
- **Git Integration**: Optionally initializes a new git repository
- **Dependency Management**: Can automatically install npm dependencies
- **Smart Copy Logic**: Excludes development files and prevents infinite recursion

### Usage Examples:

```bash
# Basic usage
./create-mcp-project weather-service

# With full options
./create-mcp-project task-manager \
  --description "AI-powered task management MCP server" \
  --author "Your Name" \
  --install-deps

# Custom target directory
./create-mcp-project file-processor --target-dir ./my-custom-server

# Skip git initialization
./create-mcp-project data-analyzer --no-git
```

## 🔧 Architecture

### Core Components

1. **McpServerApp**: Main application class that orchestrates the MCP server
2. **Brave Search Integration**: Direct JSON API integration with Brave Search
3. **Configuration**: Environment-based configuration with type safety and API key management
4. **Session Management**: HTTP-based stateful sessions with cleanup
5. **Transport Layer**: StreamableHTTPServerTransport for MCP communication
6. **Error Handling**: Comprehensive error handling with proper HTTP responses

### HTTP Endpoints

- `GET /health` - Health check endpoint
- `POST /mcp` - Main MCP communication endpoint
- `GET /mcp` - Server-to-client notifications via SSE
- `DELETE /mcp` - Session termination

## 🛠️ Customization Guide

### Adding New Tools

To add a new MCP tool, modify the `createServer()` method in `src/index.ts`:

```typescript
// Register your custom tool
server.tool(
  'brave_web_search',
  'Search the web using Brave Search API',
  {
    // Define input schema using Zod
    query: z.string().describe('Search query'),
    count: z
      .number()
      .optional()
      .describe('Number of results to return (default: 10)'),
    safesearch: z
      .enum(['strict', 'moderate', 'off'])
      .optional()
      .describe('SafeSearch level'),
  },
  async ({ query, count, safesearch }) => {
    try {
      // Your tool implementation here
      const result = await performWebSearch({ query, count, safesearch });

      return {
        content: [
          {
            type: 'text',
            text: result,
          } as TextContent,
        ],
      };
    } catch (error) {
      const errorMessage =
        error instanceof Error ? error.message : String(error);
      throw new Error(`Error in brave_web_search: ${errorMessage}`);
    }
  }
);
```

### Configuration Management

Add new configuration options in `src/config/index.ts`:

```typescript
interface Config {
  logging: LoggingConfig;
  server: ServerConfig;
  // Add your custom config sections
  brave: {
    apiKey: string;
    baseUrl: string;
  };
  database: {
    url: string;
    timeout: number;
  };
}

const config: Config = {
  // ... existing config
  brave: {
    apiKey: process.env.BRAVE_API_KEY || '',
    baseUrl: 'https://api.search.brave.com/res/v1/web/search',
  },
  database: {
    url: process.env.DATABASE_URL || 'sqlite://memory',
    timeout: parseInt(process.env.DB_TIMEOUT || '5000', 10),
  },
};
```

### Adding Middleware

Add Express middleware in the `run()` method:

```typescript
async run() {
  const app = express();
  app.use(express.json());

  // Add your custom middleware
  app.use(cors()); // CORS support
  app.use(helmet()); // Security headers
  app.use(morgan('combined')); // Request logging

  // ... rest of the setup
}
```

## 🐳 Docker Deployment

### Build and Run

```bash
# Build Docker image
docker build -t mcp-brave-search-server .

# Run container
docker run -p 3000:3000 --env-file .env mcp-brave-search-server
```

### Docker Compose (Recommended)

Create a `docker-compose.yml`:

```yaml
version: '3.8'
services:
  mcp-server:
    build: .
    ports:
      - '3000:3000'
    environment:
      - NODE_ENV=production
      - PORT=3000
      - LOG_LEVEL=info
      - BRAVE_API_KEY=${BRAVE_API_KEY}
    restart: unless-stopped
    healthcheck:
      test: ['CMD', 'curl', '-f', 'http://localhost:3000/health']
      interval: 30s
      timeout: 10s
      retries: 3
```

Run with:

```bash
docker-compose up -d
```

## 🔒 Security Best Practices

This template implements several security measures:

- **Input Validation**: Zod schema validation for all tool parameters
- **Error Handling**: Safe error responses without information leakage
- **Session Management**: Proper session cleanup and validation
- **HTTP Security**: Ready for security headers and CORS configuration
- **Environment Variables**: Secure configuration management

### Recommended Additional Security

```typescript
// Add security middleware
import helmet from 'helmet';
import cors from 'cors';
import rateLimit from 'express-rate-limit';

app.use(helmet());
app.use(
  cors({
    origin: process.env.ALLOWED_ORIGINS?.split(',') || false,
  })
);

const limiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 100, // Limit each IP to 100 requests per windowMs
});
app.use('/mcp', limiter);
```

## 📊 Monitoring and Logging

The template includes basic logging setup. For production, consider adding:

- **Structured Logging**: Winston with JSON format
- **Metrics Collection**: Prometheus metrics
- **Health Checks**: Comprehensive health endpoints
- **APM Integration**: Application Performance Monitoring

## 🧪 Testing

```bash
# Run all tests
npm test

# Run tests in watch mode
npm run test:watch

# Run tests with coverage
npm run test:coverage
```

### Writing Tests

Create test files in `src/**/*.test.ts`:

```typescript
import { describe, test, expect } from '@jest/globals';
// Your test imports

describe('YourComponent', () => {
  test('should handle valid input', async () => {
    // Test implementation
  });
});
```

## 🚀 Production Deployment

### Environment Variables

```env
NODE_ENV=production
PORT=3000
LOG_LEVEL=warn

# Brave Search API Configuration
BRAVE_API_KEY=your_production_brave_api_key

# Add your production-specific variables
DATABASE_URL=postgresql://...
REDIS_URL=redis://...
```

### Performance Optimization

- Enable gzip compression
- Implement proper caching headers
- Use connection pooling for databases
- Monitor memory usage and implement limits
- Set up log rotation

### Scaling Considerations

- Load balancing across multiple instances
- Database connection pooling
- Session store externalization (Redis)
- Horizontal pod autoscaling in Kubernetes

## 📚 References

- [Model Context Protocol Documentation](https://modelcontextprotocol.io/)
- [MCP SDK Documentation](https://github.com/modelcontextprotocol/typescript-sdk)
- [Brave Search API Documentation](https://api.search.brave.com/app/documentation/web-search/get-started)
- [Brave Search API Dashboard](https://api.search.brave.com/)
- [Express.js Documentation](https://expressjs.com/)
- [TypeScript Documentation](https://www.typescriptlang.org/)

## 🤝 Contributing

1. Fork the repository
2. Create a feature branch
3. Make your changes
4. Add tests for new functionality
5. Run the test suite
6. Submit a pull request

## 📝 License

This project is licensed under the MIT License - see the LICENSE file for details.

## 🆘 Support

For questions and support:

- Check the [MCP Documentation](https://modelcontextprotocol.io/)
- Review existing issues
- Create a new issue with detailed information

---

**Happy coding! 🎉**
