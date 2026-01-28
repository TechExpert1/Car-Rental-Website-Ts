import mongoose from "mongoose";
import bcrypt from "bcryptjs";
import User from "../src/modules/auth/auth.model";
import dotenv from "dotenv";

// Load environment variables
dotenv.config();

/**
 * Script to create an admin user
 * Usage: npm run create-admin
 */

const createAdminUser = async () => {
    try {
        // Connect to MongoDB
        const mongoUri = process.env.MONGO_DB_CONNECTION_STRING || "mongodb://localhost:27017/car-rental";
        await mongoose.connect(mongoUri);
        console.log("✅ Connected to MongoDB");

        // Admin user details
        const adminData = {
            email: "developer@yopmail.com",
            username: "developer",
            name: "Developer Admin",
            password: "Admin@123456", // Change this to a secure password
            role: "admin",
            accountStatus: "active",
            image: "https://via.placeholder.com/150/0000FF/FFFFFF?text=Developer+Admin",
        };

        // Check if admin already exists
        const existingAdmin = await User.findOne({ email: adminData.email });
        if (existingAdmin) {
            console.log("⚠️  Admin user already exists with email:", adminData.email);
            console.log("If you want to create a new admin, please change the email in the script.");
            process.exit(0);
        }

        // Hash password
        const hashedPassword = await bcrypt.hash(adminData.password, 10);

        // Create admin user
        const admin = await User.create({
            ...adminData,
            password: hashedPassword,
        });

        console.log("\n✅ Admin user created successfully!");
        console.log("\n📧 Login Credentials:");
        console.log("Email:", adminData.email);
        console.log("Password:", adminData.password);
        console.log("\n⚠️  IMPORTANT: Please change the password after first login!");
        console.log("\n👤 Admin User ID:", admin._id);

        process.exit(0);
    } catch (error: any) {
        console.error("❌ Error creating admin user:", error.message);
        process.exit(1);
    }
};

// Run the script
createAdminUser();
