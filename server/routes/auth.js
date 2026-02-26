import express from "express";
import bcrypt from "bcryptjs";
import jwt from "jsonwebtoken";
import user from "../models/User.js";

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

export default router;