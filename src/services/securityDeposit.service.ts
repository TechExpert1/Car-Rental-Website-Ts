import { IVehicle } from "../modules/vehicle/vehicle.model";

/**
 * Calculate security deposit based on vehicle value
 * Range: $300 - $1000 depending on car value
 */
export const calculateSecurityDeposit = (vehicle: IVehicle): number => {
  const dailyRent = vehicle.rent;

  // Estimate vehicle value based on daily rent
  // Assumption: Daily rent is approximately 1-2% of vehicle value
  const estimatedValue = dailyRent * 100; // Conservative estimate

  let securityDeposit = 300; // Minimum deposit

  if (estimatedValue < 15000) {
    securityDeposit = 300;
  } else if (estimatedValue >= 15000 && estimatedValue < 30000) {
    securityDeposit = 500;
  } else if (estimatedValue >= 30000 && estimatedValue < 50000) {
    securityDeposit = 750;
  } else {
    securityDeposit = 1000; // Maximum deposit for high-value vehicles
  }

  return securityDeposit;
};

/**
 * Release security deposit back to guest
 */
export const releaseSecurityDeposit = async (
  bookingId: string
): Promise<any> => {
  // This would integrate with Stripe to release the held security deposit
  // For now, this is a placeholder that would be called by admin/automated system
  return {
    success: true,
    message: "Security deposit released",
    bookingId,
  };
};

/**
 * Deduct from security deposit for damages/violations
 */
export const deductSecurityDeposit = async (
  bookingId: string,
  deductionAmount: number,
  reason: string
): Promise<any> => {
  if (deductionAmount <= 0) {
    throw new Error("Deduction amount must be greater than 0");
  }

  // This would integrate with Stripe to deduct from the held security deposit
  return {
    success: true,
    message: "Security deposit deducted",
    bookingId,
    deductionAmount,
    reason,
  };
};
