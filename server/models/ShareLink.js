import mongoose from "mongoose";

const shareLinkSchema = new mongoose.Schema({
    tokenHash: { type: String, required: true, unique: true },
    owner: { 
        type: mongoose.Schema.Types.ObjectId,
        ref: "User", required: true 
    },
    rootFile: {
        type: mongoose.Schema.Types.ObjectId, 
        ref: "File", required: true 
    },
    usedAt: { type: Date, default: null }
}, { timestamps: true });

export default mongoose.model("ShareLink", shareLinkSchema);
