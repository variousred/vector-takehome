# Vector Remote Care - Task Generator

A scalable task scheduling system for patient data ingestion, designed to handle 300,000+ patients with consistent 5-minute data freshness guarantees.

## Scale at a Glance

| Metric | Value |
|--------|-------|
| Target patients | 300,000 |
| Steady QPS | 1,000/sec |
| Daily transmissions | 86.4M |
| Target SLA | 99.99% |

See [Architecture Doc](./docs/architecture.md) for full capacity planning.

## The Problem

Without intelligent scheduling, 300,000 patients scraped every 5 minutes creates a **thundering herd** problem:
- Naive approach: 300,000 requests burst every 5 minutes
- Our approach: **1,000 steady requests/second** using deterministic hashed offsets

## Quick Start

```bash
# Install dependencies
npm install

# Run tests
npm test

# Run tests with coverage
npm test:coverage

# Build
npm build
```

## Project Structure

```
├── docs/
│   ├── architecture.md    # System design, ADR, capacity planning
│   └── leadership.md      # Engineering leadership brief
├── src/
│   └── task-generator/    # Core implementation
│       ├── index.ts       # Public exports
│       ├── constants.ts   # Scale-derived constants
│       ├── types.ts       # TypeScript interfaces
│       ├── hasher.ts      # Deterministic offset calculation
│       └── TaskGenerator.ts
├── tests/
│   └── task-generator.test.ts
└── README.md
```

## Core Component: Task Generator

The Task Generator creates scraping tasks with **deterministic, evenly-distributed offsets** ensuring:

1. **No thundering herd**: 300K patients spread across 300 second-bins = ~1K patients/sec
2. **Deterministic scheduling**: Same patient always gets same offset (no 10-minute gaps)
3. **Graceful onboarding**: New patients automatically distributed without surge

### API Contract

```typescript
import { TaskGenerator, Patient, ScrapeTask } from './src/task-generator';

const generator = new TaskGenerator({
  intervalSeconds: 300,  // 5-minute cycles
});

// Generate tasks for a batch of patients
const tasks: ScrapeTask[] = generator.generateTasksForPatients(patients, cycleStart);

// Each task includes:
// - patientId: string
// - fireAt: Date (cycleStart + deterministic offset)
// - offsetSeconds: number (0-299, from SHA-256 hash)
// - status: 'pending' | 'in_progress' | 'completed' | 'failed'
```

### Design Decisions

1. **SHA-256 for offset calculation**: Cryptographic hash ensures uniform distribution across bins. Non-cryptographic hashes (like MurmurHash) could also work but SHA-256 is standard library.

2. **Fixed offsets, not random jitter**: Random delays per cycle could create 10-minute gaps. Fixed hash-based offsets guarantee consistent 5-minute intervals.

3. **Configurable interval**: While defaulting to 300s (5 min), the system supports different intervals for future flexibility.

## Key Assumptions

| Assumption | Rationale |
|------------|-----------|
| Scraping-based ingestion | No direct device APIs available |
| 5-minute freshness SLA | Standard for non-critical vitals monitoring |
| ~1KB transmission size | Typical JSON payload with vitals |
| 5% alert trigger rate | Industry baseline for anomaly detection |

## Documentation

- [Architecture Design Document](./docs/architecture.md) - Full system design with ADR
- [Engineering Leadership Brief](./docs/leadership.md) - Team structure, trade-offs, collaboration

## Testing Philosophy

Tests focus on **critical paths** for a healthcare system:

1. **Distribution evenness**: Verify patients spread uniformly (variance < 15%)
2. **Determinism**: Same patient → same offset, always
3. **No-gap guarantee**: Consecutive cycles maintain exact 5-min intervals
4. **Scale validation**: Test at realistic scale (1K, 300K patients)

## Tech Stack Justification

- **TypeScript**: Type safety critical for healthcare systems; catches errors at compile time
- **Jest**: Industry standard, excellent TypeScript support, built-in coverage
- **No external dependencies**: Core logic uses only Node.js crypto module; reduces attack surface for healthcare compliance
