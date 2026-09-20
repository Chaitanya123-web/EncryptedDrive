import express from "express";
import bcrypt from "bcryptjs";
import jwt from "jsonwebtoken";
import user from "../models/User.js";
import auth from "../middleware/auth.js";
import multer from "multer";
import { PutObjectCommand } from "@aws-sdk/client-s3";
import s3 from "../config/s3.js";

const upload = multer({ storage: multer.memoryStorage() });

const router = express.Router();

router.post("/signup", async(req, res)=>{
    try{
        const {name, email, password} = req.body;

        const userexist = await user.findOne({email});
        if(userexist) return res.status(400).json({message: "User already exists"});

        const hashedpassword = await bcrypt.hash(password,12);
        const newuser = await user.create({
            name,email,password:hashedpassword
        })

        res.status(201).json({message: "Account created successfully"});
    }
    catch(err){
        res.status(500).json({error: err.message});
    }
});

router.post("/login", async(req, res)=>{
    try{
        const {email, password} = req.body;

        const userexist = await user.findOne({email});
        if (!userexist || !(await bcrypt.compare(password, userexist.password))) {
            return res.status(401).json({ message: "Invalid email or password" });
        }

        const token = jwt.sign(
            {id: userexist._id},
            process.env.JWT_SECRET,
            {expiresIn: "24h"}
        )

        res.status(200).json({
            token,
            user: { id: userexist._id, name: userexist.name, email: userexist.email }
        });
    }
    catch(err){
        res.status(500).json({error: err.message});
    }
});


router.get("/profile", auth, async (req, res) => {
    try {
        const userData = await user.findById(req.user.id).select("-password");
        res.json(userData);
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
});

router.post("/update-photo", auth, upload.single("photo"), async (req, res) => {
    try {
        if (!req.file) return res.status(400).json({ message: "No image provided" });

        const fileName = `profile-pics/${req.user.id}-${Date.now()}.jpg`;
        
        await s3.send(new PutObjectCommand({
            Bucket: process.env.S3_BUCKET_NAME,
            Key: fileName,
            Body: req.file.buffer,
            ContentType: req.file.mimetype,
        }));

        const photoUrl = `https://${process.env.S3_BUCKET_NAME}.s3.${process.env.AWS_REGION}.amazonaws.com/${fileName}`;
        
        await user.findByIdAndUpdate(req.user.id, { profilePic: photoUrl });

        res.json({ message: "Success", url: photoUrl });
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
});


router.delete("/delete-account", auth, async (req, res) => {
    try {
        await user.findByIdAndDelete(req.user.id);
        res.status(200).json({ message: "Account and vault metadata deleted successfully" });
    } catch (err) {
        res.status(500).json({ error: "Failed to delete account" });
    }
});

export default router;