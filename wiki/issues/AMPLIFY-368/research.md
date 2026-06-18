# Research: AMPLIFY-368

## Overview

Based on first-principle thinking, the core objective of **Zone 1 (The Input Matrix)** is to measure the efficiency of transforming constraints (Time and Capital) into output (UGC Assets) via an operational engine (Amplify). 

The fundamental equation of Zone 1 is:
**Inputs (Money + Time) $\rightarrow$ Processing (Amplify Pipeline) $\rightarrow$ Output (Creative Assets)**

Because the Amplify system currently fully controls this operational throughput (generation, editing, and verification), Zone 1 can be tracked with near 100% automation. Here is a structural breakdown of all necessary data points, incorporating both your suggestions and the existing system context, organized by first principles.

### Dimension 1: The Input Variables (Capital & Time)
Before measuring output, we must measure exactly what is being fed into the system.

**1. Total Content Spend (Capital Burn)**
*   **Definition:** The cumulative cost of running the pipeline over a given period.
*   **Relationship:** Directly composed of the **Breakdown of Model Costs** (e.g., Veo3 generation cost vs. ElevenLabs TTS cost vs. OpenAI script generation). 
*   **Insight:** Identifies which external API dependency is acting as the biggest financial drain.

**2. Generation Velocity (Time Burn)**
*   **Definition:** The average duration (`finished_at` minus `started_at` in the `JobDetail` entity) it takes for a template graph to execute from start to finish.
*   **Relationship:** Serves as the baseline for calculating **Resource Offset**.
*   **Resource Offset (The Human Benchmark):** By subtracting Generation Velocity from a hardcoded "Traditional Agency Time" baseline (e.g., 6 hours per video), you track the exact number of human hours saved by the automation engine.

### Dimension 2: The Output Variables (Throughput & Volume)
This measures the raw mechanical muscle of the Amplify system.

**3. Output Volume Velocity**
*   **Definition:** The total number of videos successfully generated over time ($t$).
*   **Relationship:** This is the numerator when determining if the Capital Burn is justified.

**4. Format Volume Velocity (Creative Diversity)**
*   **Definition:** The number of unique *Templates* (formats) tested and published over time.
*   **Relationship:** Since each Template automates a specific content format, a high Output Volume is useless if Format Volume is low (meaning you are just generating the same video over and over). This ensures the pipeline is producing *diverse* creative assets.

### Dimension 3: Unit Economics & Efficiency (The Ratios)
This is where Inputs and Outputs intersect to prove operational efficiency. 

**5. Cost Per Unique Asset (CPA - Generation)**
*   **Definition:** `Total Content Spend` $\div$ `Output Volume`.
*   **Relationship:** The absolute baseline metric. It answers: *"Is the cost to generate this AI video cheaper than paying a human creator to film it?"* 
*   *(Note: Factoring in "publication on X out of Y platforms" falls slightly into Zone 2, but the raw generation cost is firmly Zone 1).*

**6. Yield Efficiency (Cost vs. Format / Template)**
*   **Definition:** The average generation cost isolated by specific Templates over the last *n* generations. (bound by Time Frame instead)
*   **Relationship:** Some templates use 3 heavy video nodes; others use 1 video node and 1 audio node. This data point identifies which Formats are financially viable to run at high volumes and which are too "heavy."

avg cpa (1 x 3 + 2 x 9 )/ 10 = 2.1$ (yield efficiency of the format)
we know we're more likely produce variation them a full video, so we give this event 90% chance. what's left is to know the cost. because video gen model accounts for major percentage spent per run (about 99%) then we can account only for it's rate per second. Video shot is still a video on it's own so we will be able to combine different video gen models and still get the run cost approximation for format. For that we need to know shot model mapping and shot duration and shot run type mapping (variation or base part).

right now we're only planning to launch. we might have target video per month count but we're not confident whether we can reach it or no. we don't have proven content formats so we will test different formats (don't know the amount either). once we find it we will allocate more budget towards successful content format (content format will take higher probability of occurence in video distribtuion so it will heavily influence the avg cpa, also a median value - it will get closer that cpa of the content format). with that in mind i don't know whether it's good idea or not if we converge all formats into one (essentially don't account for format velocity at any given moment in time) and take it's avg cpa. we know clients budget so we know production capacity or target amount of videos he can afford. but what is the current production capacity and vecoty? given 16 min full run and 8 min variation (16 + 8 x 9 ) / 10 = 8.8 minutes with 4 hours a day it's 27 videos a day. So it's too much of a budget right now that we can handle because with avg cpa being 1$ it's 27$ a day. 

right now i would like not to include and think about infra associated costs and handle them seperately.


**7. Entity Efficiency (Cost vs. Projects / Ambassadors)**
*   **Definition:** Since an Ambassador maps 1:1 to a Project, this metric tracks the generation cost grouped by Project.
*   **Relationship:** Identifies if producing UGC for Ambassador A is inherently more expensive than Ambassador B (perhaps Ambassador A's prompts require more expensive models or have higher failure rates).


**8. Failed Generation Overhead**
*   **Source:** `SUM(Job.total_cost)` where `Job.status = FAILED` + `SUM(NodeExecution.cost)` from failed nodes in otherwise-completed jobs.
*   **Why it matters:** Failed generations are capital burned with zero output. This metric quantifies the financial cost of pipeline unreliability. High values indicate either unstable model providers, poorly designed graph prompts, or systemic rate-limiting.
*   **Granularity:**
    *   Failed cost per template (which format architectures are structurally fragile?)
    *   Failure rate trend over time (is reliability improving or degrading?)

**9. Regeneration Rate (HITL Acceptance Quality)**
*   **Source:** `COUNT(ShotRegenerateRequest)` / `COUNT(ManualReviewTask)`.
*   **Formula:** Average number of regeneration cycles before a reviewer accepts a shot.
*   **Why it matters:** A high regeneration rate signals that the generative model (Veo) or the prompt design (Langfuse templates) is not producing acceptable output on the first attempt. Each re-roll costs money and time.
*   **Relationship:** Links capital efficiency (higher re-rolls = higher cost per asset) to prompt/model quality. If this metric is high, the root cause is almost always in the Langfuse prompt templates or the Veo parameter config, not in the execution infrastructure.

### Dimension 4: System Health Indicators (Reliability Layer)
These are diagnostic, not business KPIs — but they explain *why* the efficiency ratios look the way they do.

**10. Node Failure Rate By Class**
*   **Source:** `COUNT(NodeExecution where status=FAILED)` / `COUNT(NodeExecution)` grouped by `node_class`.
*   **Why it matters:** Identifies the structurally weakest point in the pipeline. If Veo nodes fail 15% of the time, every cost and throughput metric is burdened by that 15% overhead.

**11. Retry Frequency Per Node Class**
*   **Source:** Derivable from node execution duration vs. expected duration, or from logging instrumentation in `client.py`.
*   **Why it matters:** High retry counts indicate sustained rate-limiting or instability from a provider.

**12. Queue Depth & Wait Time**
*   **Source:** `PromptQueue` state — time between job submission and execution start.
*   **Why it matters:** The execution engine processes one prompt at a time. If queue depth grows, throughput degrades. This metric is the early warning signal for capacity ceiling.

### How These Data Points Relate Visually (The Dashboard View)

To build a unified view of Zone 1, these data points naturally group into visual cohorts:

1.  **The Master KPI:** **Cost Per Unique Asset (CPA)** sitting next to the **Resource Offset (Hours Saved)**. This instantly proves the value of the Amplify system to stakeholders.
2.  **The Volume Graph:** A dual-axis line chart tracking **Output Volume** (bar)
3.  **The Financial Breakdown:** A pie chart showing **Model Costs** (API rankings).
4.  **The Matrix Charts:** 
    *   **Cost vs. Formats (Templates):** A scatter plot identifying cheap/fast templates vs. expensive/slow ones.
    *   **Cost vs. Projects (Ambassadors):** A bar chart identifying which Ambassador pipelines are the most capital-efficient.

## Concepts

| Concept | Summary |
|---------|---------|
| [[concepts/capital-burn]] | Total Content Spend — cumulative API cost (Veo3/ElevenLabs/OpenAI); top diagnostic for spend spikes vs. output correlation |
| [[concepts/generation-velocity]] | Engine throughput (finished_at − started_at per job); anchored against an Agency Baseline to compute Resource Offset (human hours saved) |
| [[concepts/output-volume-velocity]] | Count of successfully verified videos per time window; divergence from Capital Burn is the primary failure signal; segmented per template |
| [[concepts/format-volume-velocity]] | Number of distinct active templates; tracks creative diversity and agility; low Format Diversity Ratio indicates a healthy, multi-variate testing lab |
| [[concepts/cpa]] | Cost Per Unique Asset (Generation); the ultimate unit economic (Capital Burn ÷ Output Volume); tracks Arbitrage Margin (%) against a human baseline |
| [[concepts/yield-efficiency]] | Average generation cost isolated per template (structural compute cost); calculated over a trailing 30-day window with a >10 generation threshold |
| [[concepts/entity-efficiency]] | Average generation cost isolated per Ambassador (persona compute cost); identifies inefficient digital clones for volume throttling |

## Open Questions

