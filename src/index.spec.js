import useAsync from './useAsync';
import IndexUseAsync from './index';

describe('index.js', () => {
  describe('useAsync()', () => {
    it('should be exported correctly', () => {
      expect(useAsync).toEqual(IndexUseAsync);
    });
  });
});
