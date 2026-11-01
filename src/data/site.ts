// Site-wide settings that are not part of your profile.

export const site = {
  /**
   * GoatCounter site code: the "xyz" in https://xyz.goatcounter.com. Leave empty to turn counting off.
   * When set, production pages load GoatCounter's counter (no cookies), and the Notes page shows the
   * visitor map. The map's numbers are fetched at build time with the GOATCOUNTER_TOKEN secret
   * (see README → "Visitor map").
   */
  goatcounter: 'jeffeychou',
  /** First day counted; "All time" on the visitor map starts here. */
  statsSince: '2026-10-31',
};
