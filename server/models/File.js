import mongoose from "mongoose";
import { v4 as uuidv4 } from "uuid"; 

const fileSchema = new mongoose.Schema({
    user: { type: mongoose.Schema.Types.ObjectId, ref: "User" },
    originalName: { type: String, required: true },
    relativePath: { type: String, default: "" }, 
    s3key: {type: String, required: true },
    mimeType: String,
    fileSize: Number,
    encryptionIV: { type: String, required: true },
    isDeleted: { type: Boolean, default: false },
    uploadedAt: { type: Date, default: Date.now },

    visibility: { 
        type: String, 
        enum: ["private", "public"], 
        default: "private" 
    },
    shareId: { 
        type: String, 
        default: () => uuidv4().split('-')[0], 
        unique: true 
    },
    shareUsedAt: { type: Date, default: null }
}, { timestamps: true });

export default mongoose.model("File", fileSchema);