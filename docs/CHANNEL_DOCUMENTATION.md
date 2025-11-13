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

### Visual Display

**On Chart (per channel):**
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

| Feature | Single Channel | Multi-Channel |
|---------|---------------|---------------|
| **Number of Channels** | 1 (manual) | 1-10 (automatic) |
| **stdMultiplier** | Fixed (user-selected) | Optimized per channel |
| **Lookback Period** | Fixed (user-selected) | Optimized per channel |
| **Channel Width** | Same σ throughout | Different σ per channel |
| **Detection** | Manual configuration | Automatic detection |
| **Coverage** | Entire visible range | Specific time periods |
| **Overlap** | N/A | 20% allowed between channels |
| **Quality Metrics** | No scoring | Scored and ranked |
| **Optimization Goal** | User preference | Max coverage + tight fit |
| **Best For** | Recent trend analysis | Multi-phase market analysis |
| **Computational Cost** | Low | Medium-High |
| **User Interaction** | Adjust parameters manually | Click "Find Channels" |

---

## Technical Implementation

### File Locations

**Core Calculation:**
- `/app/utils/chartCalculations.js`
  - `buildConfigurableTrendChannel()` - Single channel
  - `findMultipleChannels()` - Multi-channel detection

**UI Component:**
- `/app/components/PricePerformanceChart.js`
  - Trend channel rendering (lines 2826-2833)
  - Multi-channel rendering (lines 2835-2864, 3357-3576)
  - Volume zone coloring
  - Label placement

### Data Flow

#### Single Channel
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
