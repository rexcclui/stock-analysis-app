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
// Updated to 10 bands (was 6) to support volume-quantile based channel zones
export const CHANNEL_BANDS = 10;

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
