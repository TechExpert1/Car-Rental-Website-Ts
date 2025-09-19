import { Request } from "express";
import { transporter } from "../../config/nodemailer";
import CustomerSupport from "./customerSupport.model";

export const handleCustomerSupportEmail = async (req: Request) => {
  try {
    const { name, email, message } = req.body;

    if (!name || !email || !message) {
      throw new Error("Name, email, and message are required");
    }

    const savedInquiry = await CustomerSupport.create({ name, email, message });

    const mailOptions = {
      from: email,
      to: process.env.EMAIL_USER,
      subject: `💬 Support Inquiry from ${name}`,
      html: `
        <div style="font-family: Arial, sans-serif; background:#f9f9f9; padding:20px;">
          <div style="max-width:600px; margin:auto; background:#fff; padding:20px; border-radius:8px;">
            <h2 style="color:#2976BA;">📩 New Support Message</h2>
            <p><strong>Name:</strong> ${name}</p>
            <p><strong>Email:</strong> ${email}</p>
            <p><strong>Message:</strong></p>
            <p style="background:#f1f1f1; padding:15px; border-radius:5px;">${message}</p>
          </div>
        </div>
      `,
    };

    await transporter.sendMail(mailOptions);

    return {
      success: true,
      message: "Support inquiry sent successfully",
      data: savedInquiry,
    };
  } catch (error: any) {
    console.error("Error in handleCustomerSupportEmail:", error);
    return {
      success: false,
      message: error.message || "Failed to send support inquiry",
    };
  }
};
