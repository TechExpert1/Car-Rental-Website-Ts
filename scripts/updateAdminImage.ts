import mongoose from "mongoose";
import User from "../src/modules/auth/auth.model";
import dotenv from "dotenv";

// Load environment variables
dotenv.config();

/**
 * Script to update admin profile image
 * Usage: ts-node scripts/updateAdminImage.ts
 */

const updateAdminImage = async () => {
    try {
        // Connect to MongoDB
        const mongoUri = process.env.MONGO_DB_CONNECTION_STRING || "mongodb://localhost:27017/car-rental";
        await mongoose.connect(mongoUri);
        console.log("✅ Connected to MongoDB");

        const adminEmail = "developer@yopmail.com";
        const newImageUrl = "https://ui-avatars.com/api/?name=Developer+Admin&background=007bff&color=fff&size=150"; // Professional avatar

        // Find the admin
        const admin = await User.findOne({ email: adminEmail, role: "admin" });

        if (!admin) {
            console.log(`❌ Admin with email ${adminEmail} not found`);
            process.exit(1);
        }

        // Update the image
        admin.image = newImageUrl;
        await admin.save();

        console.log(`✅ Profile image updated for admin ${adminEmail}`);
        console.log(`New image URL: ${newImageUrl}`);

        process.exit(0);
    } catch (error) {
        console.error("Error updating admin image:", error);
        process.exit(1);
    }
};

updateAdminImage();