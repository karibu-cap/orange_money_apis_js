import type { Config } from 'jest';

/*
 * For a detailed explanation regarding each configuration property and type check, visit:
 * https://jestjs.io/docs/configuration
 */
const jestConfig: Config = {
  // An array of glob patterns indicating a set of files for which coverage information should be collected
  collectCoverageFrom: ['index.ts', 'src/**/*.{js,ts}', '!src/**/*.d.ts'],

  // The directory where Jest should output its coverage files
  coverageDirectory: 'coverage',

  // An array of directory names to be searched recursively up from the requiring module's location
  moduleDirectories: ['<rootDir>', 'node_modules'],

  // An alternative API to setting the NODE_PATH env variable,
  // modulePaths is an array of absolute paths to additional locations to search when resolving modules.
  modulePaths: ['<rootDir>/node_modules'],

  // An array of file extensions your modules use
  // Module file extensions for importing
  moduleFileExtensions: ['ts', 'js'],

  // Automatically reset mock state before every test
  resetMocks: true,

  // The test environment that will be used for testing
  testEnvironment: 'node',

  moduleNameMapper: {},

  // The glob patterns Jest uses to detect test files
  testMatch: ['<rootDir>/**/*.spec.{js,ts}'],

  preset: 'ts-jest',

  // Those file will not be transformed
  transformIgnorePatterns: [],

  // Indicates whether each individual test should be reported during the run
  verbose: true,
};

export default jestConfig;
