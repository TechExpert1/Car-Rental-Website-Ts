import { transporter } from "../config/nodemailer";

export interface EmailOptions {
  to: string;
  subject: string;
  html: string;
  text?: string;
}

/**
 * Send an email using nodemailer
 */
export const sendEmail = async (options: EmailOptions): Promise<void> => {
  try {
    const mailOptions = {
      from: process.env.EMAIL_USER,
      to: options.to,
      subject: options.subject,
      html: options.html,
      text: options.text,
    };

    const result = await transporter.sendMail(mailOptions);
    console.log("Email sent successfully:", result.messageId);
  } catch (error) {
    console.error("Email sending failed:", error);
    throw new Error("Failed to send email");
  }
};

/**
 * Send OTP email for password reset
 */
export const sendPasswordResetOTP = async (email: string, otp: string): Promise<void> => {
  const subject = "Password Reset OTP - Car Rental Admin";
  const html = `
    <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
      <h2 style="color: #333;">Password Reset Request</h2>
      <p>Hello Admin,</p>
      <p>You have requested to reset your password for the Car Rental Admin panel.</p>
      <p>Your one-time password (OTP) is:</p>
      <div style="background-color: #f4f4f4; padding: 20px; text-align: center; margin: 20px 0;">
        <h1 style="color: #007bff; font-size: 32px; margin: 0; letter-spacing: 5px;">${otp}</h1>
      </div>
      <p>This OTP will expire in 15 minutes.</p>
      <p>If you didn't request this password reset, please ignore this email.</p>
      <p>Best regards,<br>Car Rental Team</p>
    </div>
  `;

  const text = `
    Password Reset Request

    Hello Admin,

    You have requested to reset your password for the Car Rental Admin panel.

    Your one-time password (OTP) is: ${otp}

    This OTP will expire in 15 minutes.

    If you didn't request this password reset, please ignore this email.

    Best regards,
    Car Rental Team
  `;

  await sendEmail({
    to: email,
    subject,
    html,
    text,
  });
};