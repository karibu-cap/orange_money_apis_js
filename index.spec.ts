import * as index from './index';

/**
 * In order to have more accurate code coverage report,
 * we need to import everything exported by the main entry point of the package.
 */
describe('All provided export', () => {
  it('should be defined', () => {
    expect(index).toBeDefined();
  });
});
