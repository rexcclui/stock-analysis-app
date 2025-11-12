# Chart Utilities

This directory contains modular utility functions and constants for the PricePerformanceChart component.

## Files

### `chartCalculations.js`

Comprehensive collection of calculation functions for technical indicators, trend analysis, and chart visualizations.

**Key Functions:**
- Technical Indicators: RVI, VSPY, SMA, Moving Averages
- Regression Analysis: Linear regression, trend channels
- Channel Analysis: Standard deviation channels, touch alignment
- Volume Analysis: Volume profile, zone distribution, volume bars
- Color Mapping: RVI colors, VSPY colors, channel band colors
- Data Formatting: Date formatting, segmented data for colored lines

**Usage Example:**
```javascript
import { calculateRVI, getRviColor } from './chartCalculations';

const dataWithRVI = calculateRVI(priceData, '3M');
const color = getRviColor(dataWithRVI[0].rvi);
```

### `chartConstants.js`

Configuration constants for chart rendering and analysis.

**Exports:**
- `CHANNEL_BANDS` - Number of colored zones in channels (default: 6)
- `COLOR_MODES` - Available color mode options
- `DEFAULT_CONFIG` - Default configuration values for chart parameters

**Usage Example:**
```javascript
import { CHANNEL_BANDS, COLOR_MODES } from './chartConstants';

const mode = COLOR_MODES.RVI;
const bands = CHANNEL_BANDS;
```

## Design Principles

1. **Pure Functions**: No side effects, deterministic results
2. **Null Safety**: Graceful handling of edge cases
3. **Performance**: Optimized algorithms with minimal iterations
4. **Documentation**: Comprehensive JSDoc for all exports
5. **Modularity**: Easy to import individual functions as needed

## Documentation

For detailed refactoring documentation, see `/docs/CHART_REFACTORING.md`

## Testing

All utility functions are pure and can be unit tested independently:

```javascript
import { calculateSMA } from './chartCalculations';

const testData = [
  { price: 100, date: '2024-01-01' },
  { price: 105, date: '2024-01-02' },
  { price: 103, date: '2024-01-03' }
];

const result = calculateSMA(testData, 2);
// Verify SMA values in result
```

## Contributing

When adding new chart features:
1. Add calculation functions to `chartCalculations.js`
2. Add constants to `chartConstants.js`
3. Update JSDoc comments
4. Add usage examples to this README
