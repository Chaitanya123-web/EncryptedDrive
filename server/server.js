import express from "express";
import mongoose from "mongoose";
import cors from "cors";
import dotenv from "dotenv";
import authRoutes from "./routes/auth.js";
import fileRoutes from "./routes/fileRoutes.js";

dotenv.config();
const app = express();

app.use(cors({
    origin: "http://localhost:5173",
    credentials: true
}));

const dbURI = process.env.USE_CLOUD_DB === "true" 
    ? process.env.CLOUD_MONGO_URI 
    : process.env.LOCAL_MONGO_URI;

mongoose.connect(dbURI)
.then(()=> console.log(`MongoDB connected to ${process.env.USE_CLOUD_DB === "true" ? "Cloud" : "Local"}`))
.catch((err)=> console.log("Error connecting MongoDB",err));

app.use(express.json());

app.use("/api/auth", authRoutes);
app.use("/api/files", fileRoutes);

app.listen(3000, () => console.log("app is running"));