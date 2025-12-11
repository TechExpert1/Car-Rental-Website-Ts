import Vehicle from "../modules/vehicle/vehicle.model";

/**
 * Auto-reactivate vehicles that have reached their deactivation end date
 */
export const autoReactivateVehicles = async (): Promise<void> => {
  try {
    const now = new Date();
    
    // Find all deactivated vehicles with an endDate that has passed
    const result = await Vehicle.updateMany(
      {
        status: "de-activated",
        deactivationEndDate: { $lte: now },
      },
      {
        $set: {
          status: "active",
          deactivationEndDate: null,
        },
      }
    );

    if (result.modifiedCount > 0) {
      console.log(`✅ Auto-reactivated ${result.modifiedCount} vehicle(s)`);
    }
  } catch (error) {
    console.error("❌ Error in auto-reactivate vehicles:", error);
  }
};
