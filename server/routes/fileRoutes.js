import express from "express";
import multer from "multer";
import auth from "../middleware/auth.js";
import { uploadFile, downloadFile, deleteFile, previewPublicFile, createShareAccessToken, verifyShareAccessToken } from "../controllers/fileController.js";
import File from "../models/File.js";
import ShareLink from "../models/ShareLink.js";
import crypto from "crypto";

const router = express.Router();
const storage = multer.memoryStorage();
const upload = multer({ storage });


router.post("/upload", auth, upload.single("file"), uploadFile);
router.get("/download/:id", auth, downloadFile);
router.delete("/delete/:id", auth, deleteFile); 

router.get("/my-files", auth, async (req, res) => {
    try {
        const files = await File.find({ user: req.user.id });
        res.json(files);
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
});


router.patch("/update-visibility/:id", auth, async (req, res) => {
    try {
        const file = await File.findById(req.params.id);
        if (!file) return res.status(404).json({ message: "File not found" });
        if (file.user.toString() !== req.user.id) {
            return res.status(401).json({ message: "Not authorized" });
        }
        file.visibility = req.body.visibility; 
        await file.save();
        res.json({ message: "Visibility updated", visibility: file.visibility });
    } catch (err) {
        res.status(500).json({ message: "Server error" });
    }
});

router.patch("/update-folder-visibility", auth, async (req, res) => {
    try {
        const { folderPath, visibility } = req.body;
        if (!folderPath || !visibility || !["public", "private"].includes(visibility)) {
            return res.status(400).json({ message: "Invalid folder visibility payload" });
        }

        const normalizedFolder = folderPath.replace(/\\/g, "/");
        const folderMatcher = new RegExp(`^${normalizedFolder.replace(/[.*+?^${}()|[\]\\]/g, "\\$&")}(?:/.*)?$`);

        const files = await File.find({
            user: req.user.id,
            relativePath: { $regex: folderMatcher }
        });

        if (!files.length) {
            return res.status(404).json({ message: "Folder not found" });
        }

        await Promise.all(files.map(file => {
            file.visibility = visibility;
            return file.save();
        }));

        res.json({ message: "Folder visibility updated", visibility });
    } catch (err) {
        res.status(500).json({ message: "Server error", error: err.message });
    }
});

router.get("/discover", async (req, res) => {
    try {
        const publicFiles = await File.find({ visibility: "public" })
            .select("originalName relativePath fileSize uploadedAt shareId")
            .populate("user", "name");
        res.json(publicFiles);
    } catch (err) {
        res.status(500).json({ message: "Error fetching discovery" });
    }
});


router.post("/share-links", auth, async (req, res) => {
    try {
        const { fileId } = req.body;
        const rootEntry = await File.findOne({ _id: fileId, user: req.user.id });
        if (!rootEntry) return res.status(404).json({ message: "File not found" });

        const folderName = rootEntry.relativePath ? rootEntry.relativePath.split('/')[0] : rootEntry.originalName;
        const publicFiles = await File.find({
            user: req.user.id,
            relativePath: new RegExp(`^${folderName}`),
            visibility: "public"
        }).select("_id");
        if (!publicFiles.some(file => file._id.equals(rootEntry._id))) {
            return res.status(403).json({ message: "Make the file or project public before sharing it." });
        }

        const rawToken = crypto.randomBytes(32).toString("hex");
        await ShareLink.create({
            tokenHash: crypto.createHash("sha256").update(rawToken).digest("hex"),
            owner: req.user.id,
            rootFile: rootEntry._id
        });
        res.status(201).json({ token: rawToken });
    } catch (err) {
        res.status(500).json({ message: "Could not create share link" });
    }
});

router.get("/public/:token", async (req, res) => {
    try {
        const tokenHash = crypto.createHash("sha256").update(req.params.token).digest("hex");
        const shareLink = await ShareLink.findOneAndUpdate(
            { tokenHash, usedAt: null },
            { $set: { usedAt: new Date() } },
            { new: true }
        );
        if (!shareLink) {
            const existingLink = await ShareLink.findOne({ tokenHash }).select("_id");
            return res.status(existingLink ? 410 : 404).json({
                message: existingLink ? "This one-time link has already been used." : "Not found"
            });
        }

        const rootEntry = await File.findOne({ _id: shareLink.rootFile, visibility: "public" });
        if (!rootEntry) return res.status(403).json({ message: "This project is private." });
        const folderName = rootEntry.relativePath ? rootEntry.relativePath.split('/')[0] : rootEntry.originalName;

        const filesInProject = await File.find({
            relativePath: new RegExp(`^${folderName}`),
            visibility: "public"
        }).select("originalName relativePath fileSize uploadedAt");

        res.json({
            folderName,
            files: filesInProject,
            accessToken: createShareAccessToken(shareLink._id.toString(), rootEntry._id.toString())
        });
    } catch (err) {
        res.status(500).json({ message: "Server error" });
    }
});


router.get("/public/preview/:id", async (req, res, next) => {
    try {
        const file = await File.findById(req.params.id).select("relativePath");
        const token = req.get("x-share-access-token");
        const access = token && verifyShareAccessToken(token);
        const shareLink = access && await ShareLink.findOne({
            _id: access.shareLinkId,
            rootFile: access.rootFileId,
            usedAt: { $ne: null }
        }).select("rootFile");
        const rootEntry = shareLink && await File.findOne({ _id: shareLink.rootFile }).select("relativePath originalName");
        const folderName = rootEntry?.relativePath
            ? rootEntry.relativePath.split('/')[0]
            : rootEntry?.originalName;
        const belongsToSharedProject = file && folderName && (
            file.relativePath === folderName || file.relativePath?.startsWith(`${folderName}/`)
        );

        if (!file || !access || !rootEntry || !belongsToSharedProject) {
            return res.status(403).json({ message: "This preview session is invalid or expired." });
        }
        return previewPublicFile(req, res);
    } catch (err) {
        return next(err);
    }
});

export default router;