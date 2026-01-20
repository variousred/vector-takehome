/**
 * Scale constants derived from capacity planning.
 * See /docs/architecture.md for full calculations.
 *
 * Key insight: 300K patients / 300s interval = 1,000 steady QPS
 * Without staggering: 300,000 QPS burst (catastrophic)
 * With staggering: 1,000 QPS steady (manageable)
 */

/**
 * Default scrape interval in seconds.
 * Derived from 5-minute freshness SLA requirement.
 */
export const SCRAPE_INTERVAL_SECONDS = 300;

/**
 * Default scrape interval in milliseconds.
 */
export const SCRAPE_INTERVAL_MS = 300_000;

/**
 * Default number of bins for task distribution.
 * At 300 bins (1 per second in a 5-min interval):
 * - 300K patients / 300 bins = 1,000 patients per bin
 * - Results in ~1,000 QPS steady state
 */
export const DEFAULT_BIN_COUNT = 300;

/**
 * Expected patients per bin at full scale.
 * Used for distribution variance testing.
 * 300K patients / 300 bins = 1,000 patients/bin
 */
export const EXPECTED_PATIENTS_PER_BIN_AT_SCALE = 1000;

/**
 * Maximum acceptable distribution variance for testing.
 * A 15% deviation from expected bin count is acceptable
 * given natural hash distribution variance.
 */
export const MAX_DISTRIBUTION_VARIANCE = 0.15;

/**
 * Target patients at scale.
 * Used for capacity planning and scale testing.
 */
export const TARGET_PATIENTS_AT_SCALE = 300_000;

/**
 * Daily transmission count at scale.
 * 300K patients × 288 cycles/day = 86.4M transmissions
 */
export const DAILY_TRANSMISSIONS_AT_SCALE = 86_400_000;

/**
 * Target alert rate (percentage of transmissions triggering alerts).
 * Industry baseline for chronic condition monitoring.
 */
export const TARGET_ALERT_RATE = 0.05;

/**
 * Expected alerts per second at scale.
 * 86.4M daily × 5% / 86400 seconds ≈ 50 alerts/sec
 */
export const EXPECTED_ALERTS_PER_SECOND = 50;
