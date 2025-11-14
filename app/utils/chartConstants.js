/**
 * Chart Constants
 *
 * This module contains constant values used throughout the chart components.
 *
 * @module chartConstants
 */

/**
 * Number of colored zones/bands between channel bounds
 * @constant {number}
 */
// Reduced to 5 bands for better performance in Multi Channel mode
// This reduces render components from 6000 to 3000 while maintaining smooth visuals
export const CHANNEL_BANDS = 5;

/**
 * Color mode options
 * @constant {Object}
 */
export const COLOR_MODES = {
  DEFAULT: 'default',
  RVI: 'rvi',
  VSPY: 'vspy',
  SMA: 'sma',
  VOLUME_BAR: 'volumeBar',
  CHANNEL: 'channel',
  TREND: 'trend'
};

/**
 * Default chart configuration
 * @constant {Object}
 */
export const DEFAULT_CONFIG = {
  smaPeriod: 20,
  channelLookback: 100,
  channelStdDevMultiplier: 2.0,
  channelProximityThreshold: 0.02,
  channelVolumeBins: 70,
  trendChannelLookback: 120,
  trendChannelStdMultiplier: 2,
  trendChannelInterceptShift: 0,
  trendChannelEndAt: 0
};
