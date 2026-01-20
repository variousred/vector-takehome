/**
 * Task Generator Module
 *
 * Provides deterministic, staggered task scheduling for patient data scraping.
 * Designed to handle 300K+ patients with consistent 5-minute freshness guarantees.
 *
 * @packageDocumentation
 */

// Main class
export { TaskGenerator } from './TaskGenerator';

// Types
export {
  Patient,
  PatientInput,
  ScrapeTask,
  TaskGeneratorConfig,
  TaskGenerationResult,
  RiskLevel,
  TaskStatus,
} from './types';

// Hasher utilities (for advanced usage)
export {
  computeOffset,
  computeFireTime,
  analyzeDistribution,
  isDistributionAcceptable,
} from './hasher';

// Constants (for reference and testing)
export {
  SCRAPE_INTERVAL_SECONDS,
  SCRAPE_INTERVAL_MS,
  DEFAULT_BIN_COUNT,
  EXPECTED_PATIENTS_PER_BIN_AT_SCALE,
  MAX_DISTRIBUTION_VARIANCE,
  TARGET_PATIENTS_AT_SCALE,
  DAILY_TRANSMISSIONS_AT_SCALE,
  TARGET_ALERT_RATE,
  EXPECTED_ALERTS_PER_SECOND,
} from './constants';
