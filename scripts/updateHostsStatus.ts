import mongoose from "mongoose";
import User from "../src/modules/auth/auth.model";
import dotenv from "dotenv";

// Load environment variables
dotenv.config();

/**
 * Script to update all hosts' approval status to approved
 * Usage: npm run update-hosts-status
 */

const updateHostsStatus = async () => {
    try {
        // Connect to MongoDB
        const mongoUri = process.env.MONGO_DB_CONNECTION_STRING || "mongodb://localhost:27017/car-rental";
        await mongoose.connect(mongoUri);
        console.log("✅ Connected to MongoDB");

        // Find all users with role "host"
        const hosts = await User.find({ role: "host" });
        console.log(`📊 Found ${hosts.length} hosts in the database`);

        if (hosts.length === 0) {
            console.log("ℹ️  No hosts found to update");
            process.exit(0);
        }

        // Update all hosts' approval status to "approved"
        const result = await User.updateMany(
            { role: "host" },
            { $set: { hostApprovalStatus: "approved" } }
        );

        console.log(`✅ Successfully updated ${result.modifiedCount} hosts`);
        console.log(`ℹ️  Matched ${result.matchedCount} documents`);

        // Verify the update
        const updatedHosts = await User.find({ role: "host", hostApprovalStatus: "approved" });
        console.log(`✅ Verification: ${updatedHosts.length} hosts now have approved status`);

        process.exit(0);
    } catch (error: any) {
        console.error("❌ Error updating hosts status:", error.message);
        process.exit(1);
    }
};

// Run the script
updateHostsStatus();