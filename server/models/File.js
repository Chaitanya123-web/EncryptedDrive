import mongoose from "mongoose";

const fileSchema = new mongoose.Schema({
    user: {
        type: mongoose.Schema.Types.ObjectId,
        ref: "User"
    },
    originalName: {
        type: String,
        required: true
    },
    s3key: {
        type: String,
        required: true
    },
    mimeType: String,
    fileSize: Number,
    encryptionIV: {
        type: String,
        required: true
    },
    isDeleted:{
        type: Boolean,
        default: false
    },
    uploadedAt: {
        type: Date,
        default: Date.now
    }
},{
    timestamps: true
})

export default mongoose.model("File",fileSchema)