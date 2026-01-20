# Engineering Leadership Brief

## Vector Remote Care - Scalable Patient Data Ingestion

**Author:** Michael  
**Date:** January 2026

---

## Section 1: Technical Trade-offs

### Shortcuts Taken in This Implementation

| Shortcut | Rationale | Production Impact |
|----------|-----------|-------------------|
| **Mocked database** | Time-boxed exercise; demonstrates logic without persistence overhead | Need PostgreSQL + TimescaleDB integration |
| **No actual HTTP scraping** | Focus on scheduling logic (the differentiator), not HTTP mechanics | Add scraping service with error handling (single miss OK, alert on consecutive failures) |
| **In-memory task generation** | Sufficient for demonstrating algorithm | Production needs Kafka queue integration |
| **Simplified error handling** | Basic validation; no distributed tracing | Add OpenTelemetry, dead-letter queues |
| **Single-threaded execution** | Node.js crypto is synchronous; acceptable for demo | Consider worker threads for 300K+ scale |

### What I'd Build Differently: 2 Weeks vs. 6 Months

**2 Weeks (MVP):**
- Core scheduling logic ✓ (this implementation)
- Basic Kafka integration for task queuing
- Single-region deployment with basic monitoring
- Manual onboarding workflow
- Target: Prove the concept works at 100K scale

**6 Months (Production-Ready):**
- Full multi-region K8s deployment (east/west coast)
- Comprehensive observability (Prometheus, Grafana, Jaeger)
- Auto-scaling based on queue depth and QPS
- ML-based markup change detection for scraper resilience
- Self-service patient onboarding with validation
- Chaos engineering tests for failover scenarios
- HIPAA compliance audit and documentation
- Runbooks for on-call engineers

### Balancing Speed vs. Quality in Healthcare

Healthcare systems demand higher quality bars than typical software. My approach:

1. **Non-negotiable quality gates:**
   - Type safety (TypeScript strict mode)
   - Unit tests for deterministic logic
   - No silent failures - explicit error handling
   - Audit logging for compliance

2. **Where to accept trade-offs:**
   - UI polish can wait
   - Performance optimization after correctness
   - Advanced features (ML, multi-cloud) are phase 2

3. **Staged rollouts:**
   - Feature flags for new functionality
   - Canary deployments (5% → 25% → 100%)
   - Easy rollback capability
   - Shadow mode testing with production traffic

**Key principle:** "Fast to detect, fast to fix" > "Never break"

### Testing Philosophy for Patient Safety Systems

**Testing pyramid for clinical accuracy:**

```
                    /\
                   /  \  E2E Tests
                  /    \  (Few, expensive, critical paths)
                 /------\
                /        \  Integration Tests
               /          \  (Verify component interactions)
              /------------\
             /              \  Unit Tests
            /                \  (Fast, exhaustive, deterministic)
           /==================\
```

**Specific strategies for 95% sensitivity:**

1. **Property-based testing** for scheduling logic
   - "For any patient ID, offset is in [0, 299]"
   - "For any two cycles, gap is exactly 5 minutes"

2. **Chaos testing** for resilience
   - Simulate region failures
   - Test queue backlogs
   - Verify graceful degradation

3. **Continuous monitoring** as testing
   - Alert rate drift detection
   - Staleness SLA monitoring
   - False positive/negative tracking

4. **A/B testing for rule changes**
   - Shadow new rules against production
   - Statistical significance before full rollout

---

## Section 2: Team & Process

### Team Structure (4 Engineers: 1 Senior, 3 Mid-level)

Given the scale (86M daily transmissions, 1K QPS steady state), I'd structure the team around system boundaries:

| Engineer | Focus Area | Key Deliverables |
|----------|-----------|------------------|
| **Senior** (me) | Orchestrator architecture, system design | Airflow DAGs, Kafka topology, ADRs |
| **Mid-level A** | Scraper pods, HTTP layer | Node.js scrapers, error handling, consecutive failure tracking |
| **Mid-level B** | Alert classification, rules engine | Rule configuration, threshold tuning |
| **Mid-level C** | Observability, testing infrastructure | Prometheus metrics, Grafana dashboards, CI/CD |

**Initial sprint breakdown (2-week sprints):**

- Sprint 1: Core scheduling + basic scraping (Senior + Mid-A)
- Sprint 2: Storage + alert pipeline (Mid-B + Mid-C)
- Sprint 3: Observability + integration testing (all)
- Sprint 4: Multi-region + load testing (all)

### Code Quality Standards

1. **TypeScript strict mode** - No `any` types without justification
2. **80% code coverage minimum** - Focus on business logic, not boilerplate
3. **PR reviews required** - At least one approval, prefer two for critical paths
4. **Conventional commits** - Enables automated changelog generation
5. **Documentation as code** - ADRs for decisions, API docs from types

**Automated enforcement:**
```yaml
# Example CI pipeline checks
- lint: eslint with strict config
- typecheck: tsc --noEmit
- test: jest with coverage threshold
- security: npm audit, Snyk scan
- docs: verify README/ADR updates for new features
```

### One Key Process: Weekly Capacity Review

To maintain 95% sensitivity over time, I'd implement a **Weekly Capacity Review**:

**Meeting structure (30 min):**
1. **Dashboard review** (10 min)
   - Current QPS vs. 1K baseline
   - Storage growth vs. 86GB/day projection
   - Alert rate vs. 5% baseline
   - Staleness SLA compliance

2. **Anomaly discussion** (10 min)
   - Any drift in metrics?
   - New failure patterns?
   - Vendor changes detected?

3. **Action items** (10 min)
   - Scaling decisions
   - Rule adjustments
   - Technical debt prioritization

**Why this process:**
- Catches drift before it impacts patients
- Creates institutional knowledge of system behavior
- Provides forum for cross-team coordination
- Generates audit trail for compliance

### Maintaining 95% Sensitivity Over Time

1. **Continuous monitoring:**
   - Real-time sensitivity proxy metrics
   - Alert when alert rate deviates >2% from baseline
   - Weekly false positive/negative review with clinical team

2. **Controlled deployments:**
   - All rule changes go through A/B testing
   - Canary deployments for code changes
   - Automatic rollback on metric degradation

3. **Feedback loops:**
   - Clinical team can flag missed alerts
   - Automated correlation of outcomes to predictions
   - Monthly sensitivity audit with sample review

4. **Proactive maintenance:**
   - Quarterly load testing at 2x capacity
   - Annual chaos engineering exercises
   - Regular dependency updates with security review

---

## Section 3: Cross-functional Collaboration

### Working with Product

**Challenge:** Product may not understand why "just add a feature" takes 3 sprints.

**My approach:**

1. **Visual communication:**
   - Architecture diagrams in every planning meeting
   - "At 300K patients, we process 86M data points daily"
   - Show trade-offs: "Adding X increases storage by Y%, costs Z/month"

2. **Shared metrics dashboard:**
   - Product has read access to system metrics
   - They can see capacity constraints in real-time

3. **Regular syncs:**
   - Weekly 15-min sync on technical constraints
   - Bring options, not problems: "We can do A in 2 weeks or B in 6 weeks"

4. **Documentation:**
   - Maintain a "technical constraints" doc Product can reference
   - Update quarterly with capacity projections

### Working with Clinical Operations

**Challenge:** Engineers don't understand clinical workflows; clinicians don't understand system limitations.

**My approach:**

1. **Shadow sessions:**
   - Engineers spend time watching clinical staff use the system
   - Understand real workflow, not assumed workflow
   - Document pain points and opportunities

2. **Joint alert review:**
   - Monthly meeting to review sample alerts
   - Clinical team flags false positives/negatives
   - Engineering adjusts rules based on feedback

3. **Clear SLA communication:**
   - "Data is at most 5 minutes old"
   - "Alert delivery within 1 minute of detection"
   - "99.99% uptime target = 52 minutes/year max downtime"

4. **Feedback mechanisms:**
   - Easy way for clinicians to report issues
   - Slack channel for urgent concerns
   - Quarterly retrospective on system performance

### Working with Data Team

**Challenge:** Shared infrastructure, competing priorities, schema evolution.

**My approach:**

1. **Shared schema contracts:**
   - JSON Schema definitions for all data types
   - Versioned APIs with deprecation policy
   - Breaking changes require cross-team review

2. **Joint ownership model:**
   - Transmission pipeline owned jointly
   - Clear escalation path for incidents
   - Shared on-call rotation for critical components

3. **Coordination on infrastructure:**
   - Shared Kafka cluster with namespace separation
   - Coordinated TimescaleDB retention policies
   - Joint capacity planning for 158TB 5-year storage

4. **Regular sync meetings:**
   - Bi-weekly 30-min sync on pipeline health
   - Quarterly planning for infrastructure changes
   - Shared documentation of data flows

---

## Summary

This leadership brief demonstrates my approach to building and leading a team on a healthcare-critical system:

1. **Technical pragmatism** - Know when to take shortcuts and when to invest
2. **Data-driven decisions** - Use capacity planning to guide architecture
3. **Quality culture** - Build processes that maintain clinical accuracy over time
4. **Cross-functional empathy** - Translate technical constraints for different audiences

The Task Generator implementation shows the core technical approach; this brief shows how I'd scale it with a team.
