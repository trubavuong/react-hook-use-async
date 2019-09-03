import useAsync, { useAsyncOnDemand, Task } from './useAsync';
import IndexUseAsync, { useAsyncOnDemand as IndexUseAsyncOnDemand, Task as IndexTask } from './index';

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

  describe('Task', () => {
    it('should be exported correctly', () => {
      expect(Task).toEqual(IndexTask);
    });
  });
});
