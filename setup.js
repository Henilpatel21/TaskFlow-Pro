const { execSync } = require('child_process');
const fs = require('fs');
const readline = require('readline');
const path = require('path');
const os = require('os');

const rl = readline.createInterface({
    input: process.stdin,
    output: process.stdout
});

const question = (query) => new Promise((resolve) => rl.question(query, resolve));

// Colors for console output
const colors = {
    reset: "\x1b[0m",
    bright: "\x1b[1m",
    green: "\x1b[32m",
    yellow: "\x1b[33m",
    cyan: "\x1b[36m",
    red: "\x1b[31m"
};

const log = (msg, color = colors.reset) => console.log(`${color}${msg}${colors.reset}`);

// Configuration
const ROOT_DIR = process.cwd();
const SERVER_DIR = path.join(ROOT_DIR, 'server');
const CLIENT_DIR = path.join(ROOT_DIR, 'client');

// Default Values
const DEFAULT_MONGO_URI = 'mongodb://localhost:27017/taskflow';
const SERVER_PORT = 5000; // Matching client expectation
const CLIENT_PORT = 5173;

async function main() {
    log("\n🚀 Starting TaskFlow Pro Setup Wizard...\n", colors.bright + colors.cyan);

    // 1. Install Dependencies
    log("📦 Installing dependencies...", colors.yellow);
    try {
        log("  - Installing root dependencies...", colors.cyan);
        execSync('npm install', { stdio: 'inherit', cwd: ROOT_DIR });

        log("  - Installing server dependencies...", colors.cyan);
        execSync('npm install', { stdio: 'inherit', cwd: SERVER_DIR });

        log("  - Installing client dependencies...", colors.cyan);
        execSync('npm install', { stdio: 'inherit', cwd: CLIENT_DIR });

        log("✅ All dependencies installed successfully!\n", colors.green);
    } catch (error) {
        log("❌ Error installing dependencies. Please check your Node.js and npm installation.", colors.red);
        process.exit(1);
    }

    // 2. Configure Environment Variables
    log("⚙️  Configuring environment variables...", colors.yellow);

    // Server .env
    const serverEnvPath = path.join(SERVER_DIR, '.env');
    let mongoUri = DEFAULT_MONGO_URI;

    // Ask for Mongo URI
    const userMongoUri = await question(`${colors.bright}Enter MongoDB URI${colors.reset} (default: ${DEFAULT_MONGO_URI}): `);
    if (userMongoUri.trim()) {
        mongoUri = userMongoUri.trim();
    }

    const jwtAccess = require('crypto').randomBytes(32).toString('hex');
    const jwtRefresh = require('crypto').randomBytes(32).toString('hex');

    const serverEnvContent = `# MongoDB Connection
MONGODB_URI=${mongoUri}

# JWT Secrets (Generated automatically)
JWT_ACCESS_SECRET=${jwtAccess}
JWT_REFRESH_SECRET=${jwtRefresh}

# JWT Expiration
JWT_ACCESS_EXPIRES=15m
JWT_REFRESH_EXPIRES=7d

# Server Configuration
PORT=${SERVER_PORT}
NODE_ENV=development

# Frontend URL (for CORS)
FRONTEND_URL=http://localhost:${CLIENT_PORT}

# Cookie Settings
COOKIE_SECURE=false
`;

    fs.writeFileSync(serverEnvPath, serverEnvContent);
    log(`✅ Server .env created at ${serverEnvPath}`, colors.green);

    // Client .env
    const clientEnvPath = path.join(CLIENT_DIR, '.env');
    const clientEnvContent = `# For local development
VITE_API_URL=http://localhost:${SERVER_PORT}/api
VITE_SOCKET_URL=http://localhost:${SERVER_PORT}
`;

    fs.writeFileSync(clientEnvPath, clientEnvContent);
    log(`✅ Client .env created at ${clientEnvPath}\n`, colors.green);

    // 3. Recommended VSCode Extensions (Optional)
    const vscodeDir = path.join(ROOT_DIR, '.vscode');
    if (!fs.existsSync(vscodeDir)) {
        fs.mkdirSync(vscodeDir);
        const extensionsJson = {
            "recommendations": [
                "dbaeumer.vscode-eslint",
                "esbenp.prettier-vscode",
                "mongodb.mongodb-vscode"
            ]
        };
        fs.writeFileSync(path.join(vscodeDir, 'extensions.json'), JSON.stringify(extensionsJson, null, 2));
        log(`✅ VSCode recommended extensions configured in .vscode/extensions.json\n`, colors.green);
    }

    // 4. Start Application (Optional)
    const startApp = await question(`\n${colors.bright}Do you want to start the application now?${colors.reset} (Y/n): `);

    if (startApp.toLowerCase() === '' || startApp.toLowerCase() === 'y' || startApp.toLowerCase() === 'yes') {
        log("\n🚀 Starting TaskFlow Pro...", colors.green);
        log(`\n(Press ${colors.bright}Ctrl+C${colors.reset} to stop the application)\n`);

        // Use spawn to keep the output in the same terminal
        const child = spawn('npm', ['run', 'dev'], { stdio: 'inherit', shell: true, cwd: ROOT_DIR });

        child.on('close', (code) => {
            rl.close();
            process.exit(code);
        });
    } else {
        log(`\n${colors.bright}${colors.green}🎉 Setup Complete!${colors.reset}\n`);
        log(`To start the application later, run:`);
        log(`  ${colors.cyan}npm run dev${colors.reset}`);
        log(`\nThis will start both the backend (port ${SERVER_PORT}) and frontend (port ${CLIENT_PORT}).\n`);
        rl.close();
    }
}

main().catch((err) => {
    console.error(err);
    process.exit(1);
});
