#!/usr/bin/env node
import { Command } from "commander";
import axios from "axios";
import fs from "fs";
import path from "path";
import os from "os";
import FormData from "form-data";
import inquirer from "inquirer";

const program = new Command();
const API_URL = "http://localhost:3000/api";
const CONFIG_PATH = path.join(os.homedir(), ".vaultcfg");

// --- Helper: Configuration Management ---
const saveConfig = (data) => fs.writeFileSync(CONFIG_PATH, JSON.stringify(data, null, 2));
const getConfig = () => {
    if (fs.existsSync(CONFIG_PATH)) {
        return JSON.parse(fs.readFileSync(CONFIG_PATH, "utf-8"));
    }
    return null;
};

// --- Helper: Recursive File List with Ignore Logic ---
const IGNORE_LIST = ["node_modules", ".git", ".env", "dist", ".DS_Store"];

const getAllFiles = (dirPath, arrayOfFiles = []) => {
    const files = fs.readdirSync(dirPath);

    files.forEach((file) => {
        // Skip ignored directories and files
        if (IGNORE_LIST.includes(file)) return;

        const fullPath = path.join(dirPath, file);
        if (fs.statSync(fullPath).isDirectory()) {
            arrayOfFiles = getAllFiles(fullPath, arrayOfFiles);
        } else {
            arrayOfFiles.push(fullPath);
        }
    });

    return arrayOfFiles;
};

program
    .name("vault")
    .description("CLI for SecureVault: Encrypted Cloud Storage")
    .version("1.0.0");

// --- Command: Login ---
program
    .command("login")
    .description("Log in to your SecureVault account")
    .action(async () => {
        const answers = await inquirer.prompt([
            { type: "input", name: "email", message: "Email:" },
            { type: "password", name: "password", message: "Password:" }
        ]);

        try {
            const res = await axios.post(`${API_URL}/auth/login`, answers);
            saveConfig({ token: res.data.token, user: res.data.user });
            console.log("Login successful! Session saved.");
        } catch (err) {
            console.error("Login failed:", err.response?.data?.message || err.message);
        }
    });

// --- Command: Status ---
program
    .command("status")
    .description("Check connection and account status")
    .action(() => {
        const config = getConfig();
        if (!config) return console.log("Not logged in. Run 'vault login'.");
        console.log(`Logged in as: ${config.user.name} (${config.user.email})`);
    });

// --- Command: Upload (Refined for Dashboard folders) ---
program
    .command("upload <targetPath>")
    .description("Encrypt and upload a file or folder to the cloud")
    .action(async (targetPath) => {
        const config = getConfig();
        if (!config) return console.log("Please login first.");

        const absolutePath = path.resolve(targetPath);
        if (!fs.existsSync(absolutePath)) return console.error("Target not found.");

        const stats = fs.statSync(absolutePath);
        let filesToUpload = [];

        if (stats.isDirectory()) {
            console.log(`Scanning directory: ${targetPath} (Ignoring system files)`);
            filesToUpload = getAllFiles(absolutePath);
        } else {
            filesToUpload = [absolutePath];
        }

        console.log(`Preparing to secure ${filesToUpload.length} file(s)...`);

        for (const filePath of filesToUpload) {
            const form = new FormData();
            form.append("file", fs.createReadStream(filePath));

            // Ensure consistent forward slashes for the Web Dashboard logic
            const relativePath = stats.isDirectory() 
                ? path.relative(path.dirname(absolutePath), filePath).replace(/\\/g, '/')
                : path.basename(filePath);

            form.append("relativePath", relativePath);

            try {
                await axios.post(`${API_URL}/files/upload`, form, {
                    headers: {
                        ...form.getHeaders(),
                        Authorization: `Bearer ${config.token}`
                    }
                });
                console.log(`Secured: ${relativePath}`);
            } catch (err) {
                console.error(`Failed: ${relativePath} -> ${err.response?.data?.message || err.message}`);
                // Stop upload if storage is full
                if (err.response?.status === 400) {
                    console.log("Upload halted: Storage limit reached.");
                    break;
                }
            }
        }
        console.log("\nAll operations complete.");
    });

// --- Command: List ---
program
    .command("list")
    .description("List all encrypted files in your vault")
    .action(async () => {
        const config = getConfig();
        if (!config) return console.log("Please login first.");

        try {
            const res = await axios.get(`${API_URL}/files/my-files`, {
                headers: { Authorization: `Bearer ${config.token}` }
            });
            console.table(res.data.map(f => ({
                Name: f.relativePath || f.originalName,
                Size: (f.fileSize / 1024).toFixed(2) + " KB",
                Uploaded: new Date(f.createdAt).toLocaleDateString()
            })));
        } catch (err) {
            console.error("Failed to fetch list.");
        }
    });

// --- Command: Download  ---
program
    .command("download <vaultPath>")
    .description("Download and decrypt a file or folder back to local storage")
    .action(async (vaultPath) => {
        const config = getConfig();
        if (!config) return console.log("Please login first.");

        try {
            const res = await axios.get(`${API_URL}/files/my-files`, {
                headers: { Authorization: `Bearer ${config.token}` }
            });

            const targets = res.data.filter(f => 
                f.relativePath === vaultPath || f.relativePath.startsWith(vaultPath + "/")
            );

            if (targets.length === 0) return console.log("No matching item found.");

            console.log(`Downloading ${targets.length} item(s)...`);

            for (const item of targets) {
                const downloadRes = await axios.get(`${API_URL}/files/download/${item._id}`, {
                    headers: { Authorization: `Bearer ${config.token}` },
                    responseType: "arraybuffer"
                });

                const localPath = path.join(process.cwd(), item.relativePath);
                const localDir = path.dirname(localPath);

                if (!fs.existsSync(localDir)) fs.mkdirSync(localDir, { recursive: true });
                fs.writeFileSync(localPath, Buffer.from(downloadRes.data));
                console.log(`  - Restored: ${item.relativePath}`);
            }
            console.log("\nDownload complete.");
        } catch (err) {
            console.error("Download error:", err.message);
        }
    });

// --- Command: Delete ---
program
    .command("delete <vaultPath>")
    .description("Delete a file or an entire folder from the vault")
    .action(async (vaultPath) => {
        const config = getConfig();
        if (!config) return console.log("Please login first.");

        const { confirm } = await inquirer.prompt([
            { type: "confirm", name: "confirm", message: `Permanently delete '${vaultPath}' and its contents?`, default: false }
        ]);

        if (!confirm) return;

        try {
            const res = await axios.get(`${API_URL}/files/my-files`, {
                headers: { Authorization: `Bearer ${config.token}` }
            });

            const targets = res.data.filter(f => 
                f.relativePath === vaultPath || f.relativePath.startsWith(vaultPath + "/")
            );

            if (targets.length === 0) return console.log("No matching item found.");

            console.log(`Deleting ${targets.length} item(s)...`);
            for (const item of targets) {
                await axios.delete(`${API_URL}/files/delete/${item._id}`, {
                    headers: { Authorization: `Bearer ${config.token}` }
                });
                console.log(`  - Deleted: ${item.relativePath}`);
            }
            console.log("\nCleanup complete.");
        } catch (err) {
            console.error("Error during deletion:", err.response?.data?.message || err.message);
        }
    });

// --- Command: Storage ---
program
    .command("storage")
    .description("View current vault storage usage and limit")
    .action(async () => {
        const config = getConfig();
        if (!config) return console.log("Please login first.");

        try {
            const res = await axios.get(`${API_URL}/files/my-files`, {
                headers: { Authorization: `Bearer ${config.token}` }
            });
            const totalBytes = res.data.reduce((acc, f) => acc + (f.fileSize || 0), 0);
            const usedMB = (totalBytes / (1024 * 1024)).toFixed(2);
            const limitMB = 1024;
            const percentage = ((usedMB / limitMB) * 100).toFixed(1);

            console.log(`\nVault Storage Report`);
            console.log(`Used:   ${usedMB} MB / ${limitMB} MB (${percentage}%)`);
            if (percentage > 90) console.log("Warning: Storage almost full!");
        } catch (err) {
            console.error("Failed to fetch stats.");
        }
    });

// --- Command: Logout ---
program
    .command("logout")
    .description("Remove local session")
    .action(() => {
        if (fs.existsSync(CONFIG_PATH)) {
            fs.unlinkSync(CONFIG_PATH);
            console.log("Logged out successfully.");
        }
    });

program.parse(process.argv);