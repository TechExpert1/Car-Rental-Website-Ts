import Notification from "../notification.model";
import {
  createNotification,
  handleGetNotifications,
  handleMarkAsRead,
  handleMarkAllAsRead,
  handleClearAll,
} from "../notification.service";

jest.mock("../notification.model");

describe("Notification Service", () => {
  afterEach(() => {
    jest.clearAllMocks();
  });

  it("should create a notification", async () => {
    (Notification.create as jest.Mock).mockResolvedValue({ _id: 'n1' });
    const result = await createNotification('user1', 'test', 'Title', 'Message');
    expect(Notification.create).toHaveBeenCalled();
    expect(result).toEqual({ _id: 'n1' });
  });
});
