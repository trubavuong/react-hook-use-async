import useAsync, { useAsyncOnDemand } from './useAsync';
import IndexUseAsync, { useAsyncOnDemand as IndexUseAsyncOnDemand } from './index';


describe('index.js', () => {
  describe('useAsync()', () => {
    it('should be exported correctly', () => {
      expect(useAsync).toEqual(IndexUseAsync);
    });
  });

  describe('useAsyncOnDemand()', () => {
    it('should be exported correctly', () => {
      expect(useAsyncOnDemand).toEqual(IndexUseAsyncOnDemand);
    });
  });
});
