import useAsync, { Task } from './useAsync';
import IndexUseAsync, { Task as IndexTask } from './index';

describe('index.js', () => {
  describe('useAsync()', () => {
    it('should be exported correctly', () => {
      expect(useAsync).toEqual(IndexUseAsync);
    });
  });

  describe('Task', () => {
    it('should be exported correctly', () => {
      expect(Task).toEqual(IndexTask);
    });
  });
});
