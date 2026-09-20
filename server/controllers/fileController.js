import { PutObjectCommand, GetObjectCommand, DeleteObjectCommand } from "@aws-sdk/client-s3";
import crypto from "crypto";
import jwt from "jsonwebtoken";
import fs from "fs";
import path from "path";
import s3 from "../config/s3.js";
import File from "../models/File.js";

const STORAGE_LIMIT_BYTES = 1024 * 1024 * 1024;
const LOCAL_STORAGE_ROOT = path.join(process.cwd(), "server", "local-storage");

const saveEncryptedFileLocally = (s3Key, encryptedBuffer) => {
    const localPath = path.join(LOCAL_STORAGE_ROOT, s3Key);
    fs.mkdirSync(path.dirname(localPath), { recursive: true });
    fs.writeFileSync(localPath, encryptedBuffer);
};

const readEncryptedFileLocally = (s3Key) => {
    const localPath = path.join(LOCAL_STORAGE_ROOT, s3Key);
    if (!fs.existsSync(localPath)) return null;
    return fs.readFileSync(localPath);
};

const deleteEncryptedFileLocally = (s3Key) => {
    const localPath = path.join(LOCAL_STORAGE_ROOT, s3Key);
    if (fs.existsSync(localPath)) {
        fs.unlinkSync(localPath);
    }
};

export const fileMatchesFolderPath = (relativePath = "", folderPath = "") => {
    if (!relativePath) return false;
    if (!folderPath) return !relativePath.includes("/");

    const normalizedRelativePath = relativePath.replace(/\\/g, "/");
    const normalizedFolderPath = folderPath.replace(/\\/g, "/");

    if (normalizedRelativePath === normalizedFolderPath) return true;
    return normalizedRelativePath.startsWith(`${normalizedFolderPath}/`);
};

export const canPreviewPublicFile = (req, file) => {
    return Boolean(file && file.visibility === "public");
};

export const createShareAccessToken = (shareLinkId, rootFileId) => jwt.sign(
    { shareLinkId, rootFileId, purpose: "one-time-share" },
    process.env.JWT_SECRET,
    { expiresIn: "15m" }
);

export const verifyShareAccessToken = (token) => {
    try {
        const payload = jwt.verify(token, process.env.JWT_SECRET);
        if (payload.purpose !== "one-time-share") return false;
        return payload;
    } catch {
        return false;
    }
};

const streamToBuffer = (stream) =>
    new Promise((resolve, reject) => {
        const chunks = [];
        stream.on("data", (chunk) => chunks.push(chunk));
        stream.on("error", reject);
        stream.on("end", () => resolve(Buffer.concat(chunks)));
    });

const readEncryptedFile = async (s3Key) => {
    try {
        const response = await s3.send(new GetObjectCommand({
            Bucket: process.env.S3_BUCKET_NAME,
            Key: s3Key,
        }));
        return await streamToBuffer(response.Body);
    } catch {
        const localBuffer = readEncryptedFileLocally(s3Key);
        if (!localBuffer) throw new Error("File not found in S3 or local storage");
        return localBuffer;
    }
};

export const uploadFile = async (req, res) => {
    try {
        if (!req.file) return res.status(400).json({ message: "No file uploaded" });

        const stats = await File.aggregate([
            { $match: { user: req.user.id } },
            { $group: { _id: null, totalSize: { $sum: "$fileSize" } } }
        ]);
        const currentUsage = stats.length > 0 ? stats[0].totalSize : 0;
        
        if (currentUsage + req.file.size > STORAGE_LIMIT_BYTES) {
            return res.status(400).json({ message: "Storage limit of 1GB exceeded." });
        }


        const iv = crypto.randomBytes(16);
        const cipher = crypto.createCipheriv(
            "aes-256-cbc",
            Buffer.from(process.env.ENCRYPTION_KEY),
            iv
        );

        const encryptedBuffer = Buffer.concat([
            cipher.update(req.file.buffer),
            cipher.final(),
        ]);

        const s3Key = `uploads/${req.user.id}/${Date.now()}-${req.file.originalname}.enc`;

        try {
            await s3.send(new PutObjectCommand({
                Bucket: process.env.S3_BUCKET_NAME,
                Key: s3Key,
                Body: encryptedBuffer,
                ContentType: req.file.mimetype,
            }));
        } catch (s3Err) {
            saveEncryptedFileLocally(s3Key, encryptedBuffer);
        }

        const { relativePath } = req.body; 

        const newFile = await File.create({
            user: req.user.id,
            originalName: req.file.originalname,
            relativePath: relativePath || req.file.originalname,
            s3key: s3Key,
            mimeType: req.file.mimetype,
            fileSize: req.file.size,
            encryptionIV: iv.toString("hex"),
        });

        res.status(201).json(newFile);
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
};

export const previewPublicFile = async (req, res) => {
    try {
        const file = await File.findById(req.params.id);
        if (!file) return res.status(404).json({ message: "File not found" });

        if (!canPreviewPublicFile(req, file)) {
            return res.status(403).json({ message: "Unauthorized access" });
        }

        const encryptedBuffer = await readEncryptedFile(file.s3key);
        const iv = Buffer.from(file.encryptionIV, "hex");
        const decipher = crypto.createDecipheriv(
            "aes-256-cbc",
            Buffer.from(process.env.ENCRYPTION_KEY),
            iv
        );

        const decryptedBuffer = Buffer.concat([
            decipher.update(encryptedBuffer),
            decipher.final(),
        ]);

        const previewText = decryptedBuffer.toString("utf8");
        res.setHeader("Content-Type", "text/plain; charset=utf-8");
        res.send(previewText);
    } catch (err) {
        res.status(500).json({ message: "Retrieval Error", error: err.message });
    }
};

export const downloadFile = async (req, res) => {
    try {
        const fileData = await File.findOne({ _id: req.params.id, user: req.user.id });
        if (!fileData) return res.status(404).json({ message: "File not found" });

        let encryptedBuffer;

        try {
            const command = new GetObjectCommand({
                Bucket: process.env.S3_BUCKET_NAME,
                Key: fileData.s3key,
            });

            const response = await s3.send(command);
            encryptedBuffer = await streamToBuffer(response.Body);
        } catch (s3Err) {
            encryptedBuffer = readEncryptedFileLocally(fileData.s3key);
            if (!encryptedBuffer) {
                return res.status(404).json({ message: "File not found in S3 or local storage" });
            }
        }

        const iv = Buffer.from(fileData.encryptionIV, "hex");
        const decipher = crypto.createDecipheriv(
            "aes-256-cbc",
            Buffer.from(process.env.ENCRYPTION_KEY),
            iv
        );

        const decryptedBuffer = Buffer.concat([
            decipher.update(encryptedBuffer),
            decipher.final(),
        ]);

        res.setHeader("Content-Type", fileData.mimeType || "application/octet-stream");
        res.setHeader("Content-Disposition", `attachment; filename=${fileData.originalName}`);
        res.send(decryptedBuffer);
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
};

export const deleteFile = async (req, res) => {
    try {
        const file = await File.findOne({ _id: req.params.id, user: req.user.id });
        if (!file) return res.status(404).json({ message: "File not found" });

        try {
            await s3.send(new DeleteObjectCommand({
                Bucket: process.env.S3_BUCKET_NAME,
                Key: file.s3key,
            }));
        } catch (s3Err) {
            deleteEncryptedFileLocally(file.s3key);
        }

        await File.findByIdAndDelete(req.params.id);
        res.status(200).json({ message: "File deleted successfully" });
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
};