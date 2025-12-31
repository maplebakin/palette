/**
 * @typedef {Object} Project
 * @property {number} schemaVersion
 * @property {string} projectName
 * @property {ProjectSettings} settings
 * @property {ProjectSection[]} sections
 */

/**
 * @typedef {Object} ProjectSettings
 * @property {number} neutralCap
 * @property {number} maxColors
 * @property {number} nearDupThreshold
 * @property {boolean} anchorsAlwaysKeep
 */

/**
 * @typedef {Object} ProjectSection
 * @property {string} id
 * @property {string} label
 * @property {'season' | 'people' | 'state'} kind
 * @property {string} baseHex
 * @property {'mono' | 'analogous' | 'complementary' | 'tertiary' | 'apocalypse'} mode
 * @property {boolean} locked
 * @property {Object.<string, string>} [tokens]
 * @property {Array<{name: string, hex: string}>} [colors]
 */
