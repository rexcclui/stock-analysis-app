# Channel Analysis Documentation

This document provides comprehensive information about the channel analysis features in the stock analysis application, covering both Single Channel Mode and Multi-Channel Mode.

---

## Table of Contents

1. [Single Channel Mode (Trend Channel)](#single-channel-mode-trend-channel)
2. [Multi-Channel Mode](#multi-channel-mode)
3. [Comparison Table](#comparison-table)
4. [Technical Implementation](#technical-implementation)

---

## Single Channel Mode (Trend Channel)

### Overview
Single Channel Mode creates a linear regression channel over a specified lookback period with configurable standard deviation bands.

### Parameters

| Parameter | Type | Default | Range | Description |
|-----------|------|---------|-------|-------------|
| `lookback` | Integer | Dynamic* | 10-500 | Number of data points to analyze |
| `stdMultiplier` | Float | 2.0 | 0.5-4.0 | Standard deviation multiplier (σ) |
| `interceptShift` | Float | 0 | Any | Vertical shift of the center line |
| `endAt` | Integer | 0 | 0-100 | Offset from end of data |
| `channelBands` | Integer | 6 | 1-10 | Number of intermediate bands |

*Dynamic based on chart period (3M, 6M, 1Y, etc.)

### Calculated Information

#### Core Metrics
- **Slope**: Linear regression slope (price change per time unit)
- **Intercept**: Y-intercept of regression line
- **Standard Deviation (stdDev)**: Measure of price volatility around the trend
- **Center Line**: `slope * x + intercept`
- **Upper Bound**: `centerLine + (stdMultiplier × stdDev)`
- **Lower Bound**: `centerLine - (stdMultiplier × stdDev)`

#### Channel Properties
```javascript
{
  trendLine: number,        // Center regression line
  trendUpper: number,       // Upper boundary
  trendLower: number,       // Lower boundary
  trendBand_1: number,      // Intermediate band 1
  trendBand_2: number,      // Intermediate band 2
  ...
  trendBand_n: number       // Intermediate band n
}
```

#### Intermediate Bands
The channel is divided into equal zones for volume distribution analysis:
```
Upper Bound (trendUpper)
  Band n
  Band n-1
  ...
  Band 2
  Band 1
Center Line (trendLine)
  Band 1
  Band 2
  ...
  Band n-1
  Band n
Lower Bound (trendLower)
```

### Visual Display

**On Chart:**
- Dashed center line (purple)
- Dashed upper boundary (red)
- Dashed lower boundary (green)
- Volume-based color zones (gradient from center to bounds)

**User Controls:**
- Lookback period slider
- Sigma (σ) multiplier slider
- Intercept shift adjustment
- End-at position

### Use Cases
1. **Single trend analysis** over recent history
2. **Support/resistance** level identification
3. **Breakout detection** when price exits channel
4. **Mean reversion** trading opportunities

---

## Find Optimal (Single Channel Optimization)

### Overview
The "Find Optimal" feature automatically determines the best parameters for a single trend channel by running a 2D optimization across lookback periods and endAt offsets, then finding the optimal standard deviation multiplier (σ).

### Optimization Algorithm

The optimization consists of two sequential phases:

#### Phase 1: Lookback & EndAt Optimization

**Objective:** Find the lookback period and endAt offset that maximize "crosses" (price touches to center line).

**Search Space:**
```javascript
lookback: [20, data.length]       // Minimum 20 points to full dataset
endAt:    [0, data.length / 5]    // From most recent to 20% offset
fixedStdMult: 0.5                 // Fixed σ for this phase
```

**Grid Search:**
- Samples ~50 values for each dimension (50×50 = 2,500 simulations)
- Uses adaptive increment calculation to balance coverage and performance

**Algorithm:**
```javascript
const runLookbackSimulation = async (data, label = 'Full') => {
  const minLookback = 20;
  const maxLookback = data.length;
  const maxEndAt = Math.floor(data.length / 5);

  // Calculate increments for ~50 samples per dimension
  const lookbackIncrement = Math.max(1, Math.floor((maxLookback - minLookback) / 49));
  const endAtIncrement = Math.max(1, Math.floor(maxEndAt / 49));

  let optimalLookback = minLookback;
  let optimalEndAt = 0;
  let maxCrosses = 0;

  // 2D grid search
  for (let endAt = 0; endAt <= maxEndAt; endAt += endAtIncrement) {
    for (let lookback = minLookback; lookback <= maxLookback - endAt; lookback += lookbackIncrement) {

      // Build channel with fixed σ = 0.5
      const dataWithChannel = buildConfigurableTrendChannel(
        data,
        lookback,
        0.5,  // Fixed stdMultiplier for lookback optimization
        { endAt }
      );

      // Count how many points are within ±1% of center line
      let crossCount = 0;
      const tolerance = 0.01;  // 1% tolerance

      dataWithChannel.forEach(point => {
        if (point.trendLine !== null && point.price) {
          const pricePercent = Math.abs(point.price - point.trendLine) / point.trendLine;
          if (pricePercent <= tolerance) {
            crossCount++;
          }
        }
      });

      // Track best configuration
      if (crossCount > maxCrosses) {
        maxCrosses = crossCount;
        optimalLookback = lookback;
        optimalEndAt = endAt;
      }
    }
  }

  return { optimalLookback, optimalEndAt, maxCrosses };
};
```

**Key Metrics:**
- **Crosses:** Number of price points within ±1% of center line
- **Goal:** Maximize center line touches (indicates price follows the trend)

**Example Output:**
```javascript
{
  optimalLookback: 87,      // Best lookback period
  optimalEndAt: 5,          // Best end offset
  maxCrosses: 23,           // Maximum crosses found
  crossPercentage: 26.4     // Percentage of data points
}
```

#### Phase 2: Delta (σ Multiplier) Optimization

**Objective:** Find the optimal standard deviation multiplier that ensures both upper and lower bounds are touched while maximizing coverage.

**Algorithm:**
Uses `computeTrendChannelTouchAlignment()` function which:

1. **Calculates Residuals:**
   - Computes price deviations from regression line
   - Identifies maximum and minimum residuals

2. **Determines Intercept Shift:**
   - Centers the channel so upper and lower bounds are equidistant from extremes
   - `interceptShift = (maxResidual + minResidual) / 2`

3. **Computes Optimal Delta:**
   - Finds the σ multiplier that exactly captures price extremes
   - `optimalDelta = extremeMagnitude / stdDev`

4. **Touch Validation (with SMA smoothing):**
   - Applies dynamic SMA based on chart period (1-30 periods)
   - Detects turning points in smoothed residuals
   - Validates touches occur at channel boundaries (first/last 8% of data)
   - Ensures both upper AND lower bounds are touched

**SMA Period Selection:**
```javascript
chartPeriod → SMA Period
'7D'  → 1   (no smoothing)
'1M'  → 3
'3M'  → 5
'6M'  → 10
'1Y'  → 14
'3Y'  → 20
'5Y'  → 30
```

**Touch Detection Logic:**
```javascript
const computeTrendChannelTouchAlignment = (data, lookback, endAt, chartPeriod) => {
  // 1. Calculate regression
  const { slope, intercept, stdDev } = calculateRegression(data, lookback);

  // 2. Find residual extremes
  const residuals = data.map((pt, i) => pt.price - (slope * i + intercept));
  const maxResidual = Math.max(...residuals);
  const minResidual = Math.min(...residuals);

  // 3. Center the channel
  const interceptShift = (maxResidual + minResidual) / 2;
  const adjustedResiduals = residuals.map(r => r - interceptShift);

  // 4. Calculate optimal delta
  const extremeMagnitude = Math.max(...adjustedResiduals.map(Math.abs));
  const optimalDelta = extremeMagnitude / stdDev;

  // 5. Apply SMA smoothing for touch detection
  const smaPeriod = getSmaPeriodForTouchDetection(chartPeriod);
  const smoothedResiduals = applySMA(adjustedResiduals, smaPeriod);

  // 6. Detect turning points (price reversals)
  const turningPoints = [];
  for (let i = 1; i < smoothedResiduals.length; i++) {
    const prev = smoothedResiduals[i - 1];
    const curr = smoothedResiduals[i];

    // Detect zero crossings or direction changes
    if ((prev < 0 && curr >= 0) || (prev > 0 && curr <= 0)) {
      turningPoints.push({ index: i, residual: adjustedResiduals[i] });
    }
  }

  // 7. Validate boundary touches
  const boundaryWindow = Math.floor(data.length * 0.08); // First/last 8%
  const tolerance = stdDev * 1e-6;

  let touchesUpper = false;
  let touchesLower = false;

  turningPoints.forEach(tp => {
    const isBoundary = tp.index < boundaryWindow ||
                      tp.index >= data.length - boundaryWindow;

    if (Math.abs(tp.residual - extremeMagnitude) <= tolerance && isBoundary) {
      touchesUpper = true;
    }
    if (Math.abs(tp.residual + extremeMagnitude) <= tolerance && isBoundary) {
      touchesLower = true;
    }
  });

  return {
    interceptShift,
    optimalDelta,
    touchesUpper,
    touchesLower,
    coverageCount,    // Points within bounds
    totalPoints: data.length
  };
};
```

**Example Output:**
```javascript
{
  optimalDelta: 2.347,          // Optimal σ multiplier
  interceptShift: 1.245,        // Vertical adjustment
  coverageCount: 85,            // Points within channel
  touchesUpper: true,           // Upper bound touched
  touchesLower: true,           // Lower bound touched
  coveragePercentage: 97.7      // Coverage %
}
```

#### Dual Dataset Analysis

The optimization runs on **two datasets** to provide both historical and recent context:

**Full Dataset:**
- Entire available data range
- Provides long-term trend perspective
- Results applied to channel parameters

**Recent Dataset (25%):**
- Last 25% of data points (minimum 20)
- Captures recent market behavior
- Displayed for comparison but not applied

**Output Structure:**
```javascript
{
  // Full dataset results (applied)
  optimalLookback: 87,
  optimalEndAt: 5,
  optimalDelta: 2.347,
  optimalInterceptShift: 1.245,
  maxCrosses: 23,
  maxCoverageCount: 85,
  touchesUpper: true,
  touchesLower: true,
  crossPercentage: 26.4,
  coveragePercentage: 97.7,

  // Recent dataset results (reference only)
  recent: {
    optimalLookback: 43,
    optimalEndAt: 2,
    optimalDelta: 1.892,
    optimalInterceptShift: 0.567,
    maxCrosses: 8,
    maxCoverageCount: 21,
    touchesUpper: true,
    touchesLower: false,
    crossPercentage: 36.4,
    coveragePercentage: 95.5
  }
}
```

### Performance Characteristics

**Time Complexity:**
```
Phase 1: O(L × E × N)
where:
  L = lookback samples (~50)
  E = endAt samples (~50)
  N = data points per channel

Phase 2: O(N × S)
where:
  N = data points
  S = SMA period (1-30)

Total: O(2,500 × N + N × S) ≈ O(2,500 × N)
For 252 data points: ~630,000 operations
```

**Execution Time:**
- Typically 1-3 seconds for 250 data points
- Progress logged every 20 iterations and 500ms
- Non-blocking (uses setTimeout for UI updates)

**Grid Optimization:**
- Adaptive sampling reduces from full grid (20,000+ combinations)
- Target: ~2,500 simulations (50×50 grid)
- Includes edge case testing for exact max values

### Use Cases

1. **Initial Setup:** Find optimal parameters when first analyzing a stock
2. **Period Changes:** Recalibrate when switching chart periods (1M → 6M)
3. **Market Regime Shifts:** Re-optimize after significant market changes
4. **Comparison Analysis:** Compare full vs recent trends for divergence detection

### UI Integration

**Button:** "Find Optimal" (single channel mode only)

**During Optimization:**
- Shows loading state with progress updates
- Logs intermediate results to console
- UI remains responsive (non-blocking execution)

**After Completion:**
- Automatically applies optimal parameters to channel
- Updates sliders to show optimized values
- Displays simulation results panel with metrics

---

## Multi-Channel Mode

### Overview
Multi-Channel Mode automatically detects and displays multiple optimal regression channels across different time periods, each with its own optimized parameters.

### Parameters

| Parameter | Type | Default | Range | Description |
|-----------|------|---------|-------|-------------|
| `minRatio` | Float | 0.05 | 0.01-0.25 | Minimum channel size (% of total data) |
| `maxRatio` | Float | 0.50 | 0.25-0.75 | Maximum channel size (% of total data) |
| `stdMultiplier` | Float | 2.0 | 0.5-4.0 | Starting value for optimization |
| `chartPeriod` | String | '3M' | — | Time period for context |

### Calculated Information Per Channel

#### Identification Metrics
```javascript
{
  startIdx: number,         // Start index in dataset
  endIdx: number,           // End index in dataset
  lookback: number,         // Number of data points in channel
}
```

#### Regression Metrics
```javascript
{
  slope: number,            // Linear regression slope
  intercept: number,        // Linear regression intercept
  stdDev: number,           // Standard deviation (unique per channel)
  stdMultiplier: number,    // OPTIMIZED multiplier (1.0σ - 4.0σ)
}
```

#### Quality Metrics
```javascript
{
  coverage: number,         // % of points within channel bounds (0-1)
  centerProximity: number,  // % of points near center line (0.7-1.0)
  touchesUpper: boolean,    // Price touched upper boundary
  touchesLower: boolean,    // Price touched lower boundary
  score: number,            // Overall channel quality score
}
```

#### Channel Data Points
```javascript
{
  data: [                   // Array of channel points
    {
      ...originalPoint,     // Original price data
      channelUpper: number, // Upper boundary value
      channelCenter: number,// Center line value
      channelLower: number, // Lower boundary value
      channelBand_1: number,// Intermediate band 1
      channelBand_2: number,// Intermediate band 2
      ...
      channelBand_9: number // Intermediate band 9 (10 bands total)
    }
  ]
}
```

### Optimization Algorithm

#### Step 1: Find Channel Candidates
For each potential channel range:
1. Try different lookback periods (minPoints to maxPoints)
2. Try different starting positions
3. Calculate linear regression for each combination

#### Step 2: Optimize stdMultiplier
For each channel candidate, test multipliers from 1.0σ to 4.0σ in 0.5σ steps:

**Scoring Formula:**
```javascript
multiplierScore = coverage × touchBonus × relativeFit × lengthBonus × centerBonus × widthPenalty

where:
  coverage        = pointsInChannel / totalPoints
  touchBonus      = 1.5 (both bounds) | 1.2 (one bound) | 1.0 (neither)
  relativeFit     = 1 / (1 + stdDev / intercept)
  lengthBonus     = log(channelLength) / log(totalPoints)
  centerBonus     = centerProximity (0.7-1.0)
  widthPenalty    = 1 / (1 + testMultiplier / 4.0)
```

**Selection Criteria:**
- Coverage: High percentage of points within bounds
- Touch Bonus: Price tests channel boundaries
- Relative Fit: Good regression quality
- Length Bonus: Longer channels preferred
- Center Bonus: Tight clustering around trend
- Width Penalty: Prefers tighter channels

#### Step 3: Filter Channels
Reject channels if:
- Less than 10 data points
- More than 50% overlap with existing channels
- Less than 70% center proximity
- Score below 0.15 threshold
- Standard deviation is zero

#### Step 4: Select Best Channels
- Sort by score
- Mark used indices (80% of channel, allow 20% overlap)
- Repeat until no more valid channels found (max 10 channels)

---

### Detailed Algorithm Implementation

This section provides a detailed walkthrough of the `findMultipleChannels()` function implementation.

#### Initialization Phase

```javascript
// Define search boundaries based on user parameters
const totalPoints = data.length;
const minPoints = Math.max(10, Math.floor(totalPoints * minRatio));  // e.g., 5% of data
const maxPoints = Math.floor(totalPoints * maxRatio);                // e.g., 50% of data

const channels = [];           // Store found channels
const usedIndices = new Set(); // Track used data points
```

**Purpose:** Establish the search space constraints and initialize tracking structures.

#### Core Loop: Iterative Channel Detection

```javascript
const maxChannels = 10; // Hard limit to prevent over-fitting
let remainingRanges = [{ start: 0, end: totalPoints - 1 }];

for (let iteration = 0; iteration < maxChannels && remainingRanges.length > 0; iteration++) {
  // Find best channel across all remaining ranges
  let bestChannel = null;
  let bestRangeIdx = -1;

  remainingRanges.forEach((range, idx) => {
    const channel = findBestChannelInRange(range.start, range.end);
    if (channel && (!bestChannel || channel.score > bestChannel.score)) {
      bestChannel = channel;
      bestRangeIdx = idx;
    }
  });

  // Stop if channel quality too low
  if (!bestChannel || bestChannel.score < 0.15) break;

  channels.push(bestChannel);

  // Mark indices as used (with overlap buffer)
  const overlapBuffer = Math.floor(bestChannel.lookback * 0.2);
  for (let i = bestChannel.startIdx + overlapBuffer;
       i <= bestChannel.endIdx - overlapBuffer; i++) {
    usedIndices.add(i);
  }

  // Split remaining ranges around the used channel
  // ... (see Range Splitting below)
}
```

**Key Concepts:**
- **Iterative Discovery:** Finds best channel, marks it as used, then searches remaining segments
- **Quality Threshold:** Score must be ≥0.15 to be included
- **Overlap Management:** 20% buffer on each end allows adjacent channels to share boundary data

#### Finding Best Channel in Range

```javascript
const findBestChannelInRange = (startIdx, endIdx) => {
  const rangeLength = endIdx - startIdx + 1;
  if (rangeLength < minPoints) return null;

  let bestChannel = null;
  let bestScore = -Infinity;

  // 1. Try different lookback periods
  const minLookback = Math.min(minPoints, rangeLength);
  const maxLookback = Math.min(maxPoints, rangeLength);
  const lookbackStep = Math.max(1, Math.floor((maxLookback - minLookback) / 20));

  for (let lookback = minLookback; lookback <= maxLookback; lookback += lookbackStep) {

    // 2. Try different positions within range
    const maxStartPos = Math.max(0, endIdx - lookback + 1);
    const posStep = Math.max(1, Math.floor((maxStartPos - startIdx) / 10));

    for (let pos = startIdx; pos <= maxStartPos; pos += posStep) {
      const channelEnd = Math.min(pos + lookback, endIdx + 1);
      const slice = data.slice(pos, channelEnd);

      if (slice.length < minPoints) continue;

      // 3. Check overlap with existing channels
      const usedCount = slice.filter((_, idx) => usedIndices.has(pos + idx)).length;
      if (usedCount > slice.length * 0.5) continue; // Skip if >50% already used

      // 4. Calculate linear regression
      const { slope, intercept, stdDev } = calculateRegression(slice);
      if (stdDev === 0) continue;

      // 5. Optimize stdMultiplier for this specific channel
      const { bestMultiplier, bestMultiplierData } = optimizeMultiplier(
        slice, slope, intercept, stdDev
      );

      if (!bestMultiplierData) continue;

      // 6. Update best channel if this is better
      if (bestMultiplierData.score > bestScore) {
        bestScore = bestMultiplierData.score;
        bestChannel = createChannelObject(
          pos, channelEnd, slice, slope, intercept, stdDev,
          bestMultiplier, bestMultiplierData
        );
      }
    }
  }

  return bestChannel;
};
```

**Search Strategy:**
- **Lookback Sampling:** Tests ~20 different lookback periods
- **Position Sampling:** Tests ~10 different starting positions
- **Total Combinations:** Up to 200 candidate configurations per range

#### stdMultiplier Optimization

This is the **core innovation** - finding the optimal σ multiplier for each channel:

```javascript
const optimizeMultiplier = (slice, slope, intercept, stdDev) => {
  let bestMultiplier = 2.0; // Default fallback
  let bestMultiplierScore = -Infinity;
  let bestMultiplierData = null;

  // Test multipliers from 1.0σ to 4.0σ in 0.5σ increments
  for (let testMultiplier = 1.0; testMultiplier <= 4.0; testMultiplier += 0.5) {

    // Calculate channel bounds with this multiplier
    const upper = slice.map((_, i) => slope * i + intercept + testMultiplier * stdDev);
    const lower = slice.map((_, i) => slope * i + intercept - testMultiplier * stdDev);

    // Calculate quality metrics
    let pointsInChannel = 0;
    let pointsNearCenter = 0;
    let touchesUpper = false;
    let touchesLower = false;
    const tolerance = stdDev * 0.1;

    slice.forEach((pt, i) => {
      const price = pt.price || 0;
      const center = slope * i + intercept;

      // Coverage check
      if (price >= lower[i] - tolerance && price <= upper[i] + tolerance) {
        pointsInChannel++;
      }

      // Touch detection
      if (Math.abs(price - upper[i]) <= tolerance) touchesUpper = true;
      if (Math.abs(price - lower[i]) <= tolerance) touchesLower = true;

      // Center proximity check (±20% of center value)
      const centerTolerance = Math.abs(center) * 0.20;
      if (Math.abs(price - center) <= centerTolerance) {
        pointsNearCenter++;
      }
    });

    const coverage = pointsInChannel / slice.length;
    const centerProximity = pointsNearCenter / slice.length;

    // CRITICAL FILTER: Reject if prices don't cluster around center
    if (centerProximity < 0.70) continue;

    // Calculate composite score
    const touchBonus = (touchesUpper && touchesLower) ? 1.5 :
                       (touchesUpper || touchesLower) ? 1.2 : 1.0;
    const relativeFit = 1 / (1 + stdDev / (intercept || 1));
    const lengthBonus = Math.log(slice.length) / Math.log(totalPoints);
    const centerBonus = centerProximity;
    const widthPenalty = 1 / (1 + testMultiplier / 4.0);

    const multiplierScore = coverage * touchBonus * relativeFit *
                           lengthBonus * centerBonus * widthPenalty;

    // Track best multiplier
    if (multiplierScore > bestMultiplierScore) {
      bestMultiplierScore = multiplierScore;
      bestMultiplier = testMultiplier;
      bestMultiplierData = {
        coverage,
        centerProximity,
        touchesUpper,
        touchesLower,
        score: multiplierScore
      };
    }
  }

  return { bestMultiplier, bestMultiplierData };
};
```

**Scoring Component Details:**

| Component | Formula | Range | Purpose |
|-----------|---------|-------|---------|
| **coverage** | `pointsInChannel / n` | 0-1 | Measures % of points within bounds |
| **touchBonus** | `1.5` (both), `1.2` (one), `1.0` (none) | 1.0-1.5 | Rewards price testing boundaries |
| **relativeFit** | `1 / (1 + stdDev / intercept)` | 0-1 | Penalizes high volatility relative to price |
| **lengthBonus** | `log(n) / log(total)` | 0-1 | Prefers longer channels (logarithmic) |
| **centerBonus** | `centerProximity` | 0.7-1.0 | Rewards tight clustering around trend |
| **widthPenalty** | `1 / (1 + multiplier / 4.0)` | 0.5-1.0 | Penalizes excessively wide channels |

**Example Scores:**
- Tight channel (1.5σ) with 95% coverage, touches both: **~0.45**
- Wide channel (3.5σ) with 90% coverage, touches one: **~0.25**
- Very tight channel (1.0σ) with 70% coverage: **~0.20**

#### Range Splitting Logic

After finding a channel, split the remaining range:

```javascript
// Update remaining ranges by removing the used segment
const range = remainingRanges[bestRangeIdx];
const newRanges = [];

// Add range BEFORE channel if large enough
const beforeSize = bestChannel.startIdx - range.start;
if (beforeSize >= minPoints * 0.8) { // 80% threshold for flexibility
  newRanges.push({ start: range.start, end: bestChannel.startIdx - 1 });
}

// Add range AFTER channel if large enough
const afterSize = range.end - bestChannel.endIdx;
if (afterSize >= minPoints * 0.8) {
  newRanges.push({ start: bestChannel.endIdx + 1, end: range.end });
}

// Replace the used range with new sub-ranges
remainingRanges.splice(bestRangeIdx, 1, ...newRanges);
```

**Visual Example:**
```
Initial:     [================================] (range 0-100)
After Ch1:   [=====]  [CHANNEL1]  [==========] (splits into 0-19, 50-100)
After Ch2:   [=====]  [CHANNEL1]  [CH2] [===] (further subdivision)
```

#### Channel Data Generation

For each detected channel, create intermediate bands:

```javascript
const BANDS = 10; // 10 bands for volume distribution analysis
const channelRange = bestMultiplier * stdDev * 2;

data: slice.map((pt, i) => {
  const center = slope * i + intercept;
  const upper = center + bestMultiplier * stdDev;
  const lower = center - bestMultiplier * stdDev;

  // Generate 9 intermediate bands between lower and upper
  const bands = {};
  for (let b = 1; b < BANDS; b++) {
    const ratio = b / BANDS; // 0.1, 0.2, 0.3, ..., 0.9
    bands[`channelBand_${b}`] = lower + ratio * channelRange;
  }

  return {
    ...pt,                    // Original data point
    channelUpper: upper,      // Upper boundary
    channelCenter: center,    // Center regression line
    channelLower: lower,      // Lower boundary
    ...bands                  // channelBand_1 through channelBand_9
  };
})
```

**Band Structure:**
```
channelUpper     (100%)
channelBand_9    (90%)
channelBand_8    (80%)
...
channelBand_2    (20%)
channelBand_1    (10%)
channelLower     (0%)
```

These bands enable volume distribution analysis - measuring what % of volume occurred in each zone.

#### Final Output Structure

```javascript
return [
  {
    // Position information
    startIdx: 0,              // Starting index in original data
    endIdx: 45,               // Ending index in original data
    lookback: 46,             // Number of points in channel

    // Regression parameters
    slope: 0.125,             // Linear regression slope
    intercept: 98.5,          // Y-intercept
    stdDev: 2.34,             // Standard deviation of residuals
    stdMultiplier: 1.5,       // OPTIMIZED multiplier (not user input!)

    // Quality metrics
    coverage: 0.95,           // 95% of points within bounds
    centerProximity: 0.87,    // 87% of points near center
    touchesUpper: true,       // Price tested upper bound
    touchesLower: true,       // Price tested lower bound
    score: 0.42,              // Composite quality score

    // Channel data points with bounds and bands
    data: [/* 46 points with channelUpper, channelCenter, channelLower, bands */]
  },
  // ... more channels
];
```

---

### Algorithm Complexity Analysis

**Time Complexity:**
```
O(R × L × P × M × N)

where:
  R = number of remaining ranges (≤ 10 iterations)
  L = lookback samples (~20)
  P = position samples (~10)
  M = multiplier tests (8 tests: 1.0σ, 1.5σ, ..., 4.0σ)
  N = data points in channel (minPoints to maxPoints)

Worst case: O(10 × 20 × 10 × 8 × N) ≈ O(16,000 × N)
For 1000 data points: ~16 million operations
```

**Space Complexity:**
```
O(C × N)

where:
  C = number of channels found (≤ 10)
  N = average points per channel

Each channel stores: slope, intercept, stdDev, stdMultiplier, + full data array with bands
```

**Optimization Strategies:**
- Sampling instead of exhaustive search (lookbackStep, posStep)
- Early termination (score < 0.15, centerProximity < 0.70)
- Overlap checking to skip redundant calculations
- Non-blocking execution (setTimeout in UI layer)

---

### Common Edge Cases

#### Case 1: Not Enough Data
```javascript
if (rangeLength < minPoints) return null;
```
**Result:** No channel returned for this range.

#### Case 2: Zero Standard Deviation
```javascript
if (stdDev === 0) continue;
```
**Result:** Skip this channel candidate (all prices identical).

#### Case 3: High Overlap with Existing Channels
```javascript
const usedCount = slice.filter((_, idx) => usedIndices.has(pos + idx)).length;
if (usedCount > slice.length * 0.5) continue;
```
**Result:** Skip if >50% of points already used by another channel.

#### Case 4: Poor Center Clustering
```javascript
if (centerProximity < 0.70) continue;
```
**Result:** Reject multiplier configurations where prices don't cluster around trend (prevents overfitting to outliers).

#### Case 5: No Valid Channels Found
```javascript
if (!bestChannel || bestChannel.score < 0.15) break;
```
**Result:** Stop iteration and return channels found so far (may be empty array).

---

### Comparison: Single vs Multi-Channel Calculation

#### Single Channel (`buildConfigurableTrendChannel`)
```javascript
// User specifies ALL parameters
const result = buildConfigurableTrendChannel(
  data,
  lookback: 90,        // User-selected
  stdMult: 2.0,        // User-selected
  { interceptShift, endAt }
);

// Returns: One channel with fixed σ across entire lookback period
```

#### Multi-Channel (`findMultipleChannels`)
```javascript
// Only constraints specified, algorithm finds optimal channels
const result = findMultipleChannels(
  data,
  minRatio: 0.05,      // Constraint: min 5% of data
  maxRatio: 0.5,       // Constraint: max 50% of data
  stdMultiplier: 2.0   // Hint: starting value for optimization
);

// Returns: Multiple channels, each with OPTIMIZED σ (1.0σ - 4.0σ)
//          Different periods automatically detected
```

**Key Difference:** `stdMultiplier` is **optimized per channel** in multi-mode, not fixed!

---

### Visual Display
- Unique color scheme (5 color combinations cycle)
- Upper boundary (dashed line)
- Center line (dashed line)
- Lower boundary (dashed line)
- Optimized σ label at channel end (e.g., "±1.5σ", "±2.5σ")
- Volume-based color zones (10 bands)
- Volume percentage labels on zones

**Colors:**
```javascript
Channel 1: Red upper, Purple center, Green lower
Channel 2: Amber upper, Blue center, Cyan lower
Channel 3: Pink upper, Purple center, Teal lower
Channel 4: Red-600 upper, Violet-600 center, Emerald-600 lower
Channel 5: Orange-600 upper, Blue-600 center, Cyan-600 lower
```

**User Controls:**
- Min ratio slider (minimum channel size)
- Max ratio slider (maximum channel size)
- Starting σ multiplier slider
- "Find Channels" button

### Output Example

```javascript
[
  {
    startIdx: 0,
    endIdx: 45,
    lookback: 46,
    slope: 0.125,
    intercept: 98.5,
    stdDev: 2.34,
    stdMultiplier: 1.5,    // Optimized to 1.5σ
    coverage: 0.95,
    centerProximity: 0.87,
    touchesUpper: true,
    touchesLower: true,
    score: 0.42,
    data: [...]
  },
  {
    startIdx: 50,
    endIdx: 120,
    lookback: 71,
    slope: -0.08,
    intercept: 105.2,
    stdDev: 5.67,
    stdMultiplier: 3.0,    // Optimized to 3.0σ
    coverage: 0.91,
    centerProximity: 0.76,
    touchesUpper: true,
    touchesLower: false,
    score: 0.38,
    data: [...]
  }
]
```

### Use Cases
1. **Multi-period trend analysis** (identify distinct market phases)
2. **Volatility comparison** across different periods
3. **Channel breakout detection** across multiple timeframes
4. **Adaptive support/resistance** levels
5. **Market regime identification** (trending vs ranging)

---

## Comparison Table

| Feature | Single Channel | Find Optimal | Multi-Channel |
|---------|---------------|--------------|---------------|
| **Number of Channels** | 1 (manual) | 1 (optimized) | 1-10 (automatic) |
| **stdMultiplier** | Fixed (user-selected) | Optimized (2D search) | Optimized per channel |
| **Lookback Period** | Fixed (user-selected) | Optimized (2D search) | Optimized per channel |
| **EndAt Offset** | Fixed (user-selected) | Optimized (2D search) | N/A |
| **Intercept Shift** | Manual adjustment | Auto-calculated | N/A |
| **Channel Width** | Same σ throughout | Optimized σ | Different σ per channel |
| **Detection** | Manual configuration | 2D grid search + touch alignment | Iterative best-fit search |
| **Coverage** | Entire visible range | Entire visible range | Specific time periods |
| **Overlap** | N/A | N/A | 20% allowed between channels |
| **Quality Metrics** | No scoring | Crosses + coverage | Scored and ranked |
| **Optimization Goal** | User preference | Max crosses + boundary touches | Max coverage + tight fit |
| **Touch Validation** | Visual only | SMA-smoothed turning points | Tolerance-based detection |
| **Dataset Analysis** | Current view | Full + Recent (25%) | Full dataset only |
| **Best For** | Quick manual analysis | Single optimal trend | Multi-phase market analysis |
| **Computational Cost** | Very Low | Medium (~2,500 sims) | Medium-High (~16,000 × N ops) |
| **Execution Time** | Instant | 1-3 seconds | 2-5 seconds |
| **User Interaction** | Adjust sliders manually | Click "Find Optimal" | Click "Find Channels" |

---

## Technical Implementation

### File Locations

**Core Calculation:**
- `/app/utils/chartCalculations.js`
  - `buildConfigurableTrendChannel()` - Single channel calculation
  - `computeTrendChannelTouchAlignment()` - Find Optimal delta/touch detection
  - `getSmaPeriodForTouchDetection()` - SMA period selection
  - `findMultipleChannels()` - Multi-channel detection

**UI Component:**
- `/app/components/PricePerformanceChart.js`
  - `runLookbackSimulation()` - Find Optimal Phase 1 (lines 843-965)
  - `runDeltaSimulation()` - Find Optimal Phase 2 (lines 969-1006)
  - Trend channel rendering (lines 2826-2833)
  - Multi-channel rendering (lines 2835-2864, 3357-3576)
  - Volume zone coloring
  - Label placement

### Data Flow

#### Single Channel (Manual)
```
User adjusts parameters
  ↓
buildConfigurableTrendChannel(data, lookback, stdMult, options)
  ↓
Calculate regression (slope, intercept, stdDev)
  ↓
Apply to data points
  ↓
Render on chart with bands
```

#### Find Optimal (Single Channel Optimization)
```
User clicks "Find Optimal"
  ↓
Phase 1: Lookback & EndAt Optimization
  ├─ Grid search: 50×50 = 2,500 simulations
  ├─ For each (lookback, endAt) combination:
  │   ├─ Build channel with fixed σ = 0.5
  │   └─ Count crosses (price within ±1% of center)
  └─ Select (lookback, endAt) with max crosses
  ↓
Phase 2: Delta (σ) Optimization
  ├─ computeTrendChannelTouchAlignment()
  ├─ Calculate residuals and extremes
  ├─ Determine intercept shift (center channel)
  ├─ Compute optimal delta (σ multiplier)
  ├─ Apply SMA smoothing (period based on chart range)
  ├─ Detect turning points in residuals
  └─ Validate boundary touches (first/last 8%)
  ↓
Run on both Full and Recent (25%) datasets
  ↓
Apply optimal parameters to sliders
  ↓
Render optimized channel on chart
```

#### Multi-Channel
```
User clicks "Find Channels"
  ↓
findMultipleChannels(data, minRatio, maxRatio, stdMultiplier, chartPeriod)
  ↓
For each range:
  - Try different lookbacks
  - Test multipliers 1.0σ - 4.0σ
  - Score each configuration
  - Select best multiplier
  ↓
Filter and rank channels
  ↓
Map channel data to points
  ↓
Render multiple channels with unique colors and σ labels
```

### Performance Considerations

**Single Channel:**
- O(n) where n = data points
- Runs on every parameter change
- Minimal computational cost

**Multi-Channel:**
- O(n² × m) where n = data points, m = multiplier tests
- Runs on "Find Channels" button click
- Uses setTimeout for non-blocking execution
- Limits to 10 channels maximum

### Key Algorithms

#### Linear Regression
```javascript
slope = (n × ΣXY - ΣX × ΣY) / (n × ΣX² - (ΣX)²)
intercept = (ΣY - slope × ΣX) / n
```

#### Standard Deviation
```javascript
residuals = prices - (slope × x + intercept)
variance = Σ(residuals²) / n
stdDev = √variance
```

#### Channel Bounds
```javascript
upper = centerLine + (stdMultiplier × stdDev)
lower = centerLine - (stdMultiplier × stdDev)
channelWidth = stdMultiplier × stdDev × 2
```

#### Center Proximity Test
```javascript
centerTolerance = |centerLine| × 0.20  // 20% of center value
isNearCenter = |price - centerLine| ≤ centerTolerance
centerProximity = countNearCenter / totalPoints
valid = centerProximity ≥ 0.70  // Must be ≥70%
```

---

## Future Enhancements

### Potential Improvements

1. **Machine Learning Integration**
   - Neural network-based channel detection
   - Adaptive scoring based on historical performance

2. **Advanced Metrics**
   - Sharpe ratio per channel
   - Maximum drawdown within channel
   - Break-out success rate

3. **Interactive Features**
   - Manual channel adjustment
   - Per-channel σ override
   - Channel merging/splitting

4. **Export Capabilities**
   - Export channel parameters as JSON
   - Import saved channel configurations
   - Share channel setups

5. **Alerts**
   - Price approaching channel bounds
   - Channel breakout notifications
   - New channel detection alerts

---

## References

### Statistical Concepts
- **Linear Regression**: Least squares method for trend line fitting
- **Standard Deviation**: Measure of data dispersion around mean
- **Confidence Intervals**: σ multipliers represent statistical confidence levels
  - 1σ ≈ 68.3% confidence
  - 2σ ≈ 95.4% confidence
  - 3σ ≈ 99.7% confidence

### Trading Concepts
- **Regression Channels**: Price containment within statistical bounds
- **Mean Reversion**: Tendency for prices to return to trend line
- **Breakouts**: Price movement beyond channel bounds
- **Support/Resistance**: Channel bounds as dynamic S/R levels

---

## Version History

- **v1.0** (2025-01) - Initial single channel implementation
- **v2.0** (2025-11) - Added multi-channel mode with auto-optimization
- **v2.1** (2025-11) - Per-channel stdMultiplier optimization (1.0σ-4.0σ)
- **v2.2** (2025-11) - Simplified sigma label display

---

## Support

For issues or questions:
- GitHub Issues: [stock-analysis-app/issues](https://github.com/rexcclui/stock-analysis-app/issues)
- Code Location: `/app/utils/chartCalculations.js`
- Component: `/app/components/PricePerformanceChart.js`
