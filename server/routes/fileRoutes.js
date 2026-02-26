import express from "express";
import auth from "../middleware/auth.js";

const router = express.Router();

router.get("/my-files", auth, async (req, res) => {
    try {
        const files = await File.find({ user: req.user.id });
        res.json(files);
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
});
export default router;