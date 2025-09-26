import bcrypt from "bcryptjs";
import jwt from "jsonwebtoken";
import User from "../auth.model";
import { handleSignup, handleLogin } from "../auth.service";

jest.mock("bcryptjs");
jest.mock("jsonwebtoken");
jest.mock("../auth.model");

describe("Auth Service", () => {
  afterEach(() => {
    jest.clearAllMocks();
  });

  describe("handleSignup", () => {
    it("should create a new user successfully", async () => {
      const req: any = {
        body: {
          username: "test",
          email: "test@test.com",
          password: "123456",
          role: "user",
        },
      };

      (User.findOne as jest.Mock).mockResolvedValue(null);
      (bcrypt.hash as jest.Mock).mockResolvedValue("hashedPassword");
      (User.create as jest.Mock).mockResolvedValue({
        ...req.body,
        password: "hashedPassword",
        _id: "userId",
      });

      const result = await handleSignup(req);
      expect(result.user.username).toBe("test");
      expect(User.create).toHaveBeenCalled();
      expect(bcrypt.hash).toHaveBeenCalledWith("123456", 10);
    });

    it("should throw error if user exists", async () => {
      const req: any = { body: { email: "test@test.com" } };
      (User.findOne as jest.Mock).mockResolvedValue({ email: "test@test.com" });

      await expect(handleSignup(req)).rejects.toThrow("User already exists");
    });
  });

  describe("handleLogin", () => {
    it("should login successfully and return token", async () => {
      const req: any = { body: { email: "test@test.com", password: "123456" } };

      const mockUser = {
        _id: "userId",
        username: "test",
        email: "test@test.com",
        password: "hashedPassword",
        role: "user",
      };
      (User.findOne as jest.Mock).mockResolvedValue(mockUser);
      (bcrypt.compare as jest.Mock).mockResolvedValue(true);
      (jwt.sign as jest.Mock).mockReturnValue("mockToken");

      const result = await handleLogin(req);
      expect(result.user.email).toBe("test@test.com");
      expect(result.token).toBe("mockToken");
      expect(bcrypt.compare).toHaveBeenCalledWith("123456", "hashedPassword");
      expect(jwt.sign).toHaveBeenCalled();
    });

    it("should throw error if user not found", async () => {
      const req: any = {
        body: { email: "notfound@test.com", password: "123" },
      };
      (User.findOne as jest.Mock).mockResolvedValue(null);

      await expect(handleLogin(req)).rejects.toThrow("Invalid credentials");
    });

    it("should throw error if password does not match", async () => {
      const req: any = { body: { email: "test@test.com", password: "wrong" } };
      (User.findOne as jest.Mock).mockResolvedValue({
        password: "hashedPassword",
      });
      (bcrypt.compare as jest.Mock).mockResolvedValue(false);

      await expect(handleLogin(req)).rejects.toThrow("Invalid credentials");
    });
  });
});
