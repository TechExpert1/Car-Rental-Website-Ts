import { Request, Response } from "express";
import * as authService from "../auth.service";
import { signup, login } from "../auth.controller";

jest.mock("../auth.service");

describe("Auth Controller", () => {
  let res: Partial<Response>;
  let jsonMock: jest.Mock;
  beforeEach(() => {
    jsonMock = jest.fn();
    res = { status: jest.fn(() => res) as any, json: jsonMock };
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  describe("signup", () => {
    it("should return 201 and user data", async () => {
      const req: Partial<Request> = { body: { username: "test" } };
      (authService.handleSignup as jest.Mock).mockResolvedValue({
        user: { username: "test" },
      });

      await signup(req as Request, res as Response);

      expect(res.status).toHaveBeenCalledWith(201);
      expect(jsonMock).toHaveBeenCalledWith({ user: { username: "test" } });
    });

    it("should return 422 if error occurs", async () => {
      const req: Partial<Request> = { body: {} };
      (authService.handleSignup as jest.Mock).mockRejectedValue(
        new Error("Signup failed")
      );

      await signup(req as Request, res as Response);

      expect(res.status).toHaveBeenCalledWith(422);
      expect(jsonMock).toHaveBeenCalledWith({ error: "Signup failed" });
    });
  });

  describe("login", () => {
    it("should return 200 and token", async () => {
      const req: Partial<Request> = { body: { email: "test@test.com" } };
      (authService.handleLogin as jest.Mock).mockResolvedValue({
        user: { email: "test@test.com" },
        token: "mockToken",
      });

      await login(req as Request, res as Response);

      expect(res.status).toHaveBeenCalledWith(200);
      expect(jsonMock).toHaveBeenCalledWith({
        user: { email: "test@test.com" },
        token: "mockToken",
      });
    });

    it("should return 422 if login fails", async () => {
      const req: Partial<Request> = { body: {} };
      (authService.handleLogin as jest.Mock).mockRejectedValue(
        new Error("Login failed")
      );

      await login(req as Request, res as Response);

      expect(res.status).toHaveBeenCalledWith(422);
      expect(jsonMock).toHaveBeenCalledWith({ error: "Login failed" });
    });
  });
});
