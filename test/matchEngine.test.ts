import { describe, it, expect, vi, beforeEach } from 'vitest';
import { MatchEngine } from '../src/memory/matchEngine';
import { BugEvent } from '../src/capture/bugEvent';

describe('MatchEngine', () => {
  let mockRepo: any;
  let mockSupermemory: any;

  beforeEach(() => {
    mockRepo = {
      findByFingerprint: vi.fn(),
      findByMemoryId: vi.fn(),
      incrementOccurrence: vi.fn(),
      create: vi.fn().mockReturnValue(1)
    };
    mockSupermemory = {
      isAlive: vi.fn().mockResolvedValue(true),
      search: vi.fn().mockResolvedValue([]),
      addMemory: vi.fn().mockResolvedValue('mem-123')
    };
  });

  const event: BugEvent = {
    source: 'terminal',
    rawText: 'TypeError: x is undefined at foo.js:10:5',
    timestamp: Date.now(),
    projectName: 'test-project',
    cwd: '/tmp/test-project'
  };

  it('returns repeated via fingerprint on exact match', async () => {
    mockRepo.findByFingerprint.mockReturnValue({ id: 42 });
    const engine = new MatchEngine(mockSupermemory, mockRepo, 0.82);

    const result = await engine.processBugEvent(event);

    expect(result).toEqual({ kind: 'repeated', via: 'fingerprint', bugId: 42 });
    expect(mockRepo.incrementOccurrence).toHaveBeenCalledWith(42);
  });

  it('returns repeated via semantic match above threshold', async () => {
    mockRepo.findByFingerprint.mockReturnValue(undefined);
    mockSupermemory.search.mockResolvedValue([{ memoryId: 'mem-1', score: 0.9, content: '', metadata: {} }]);
    mockRepo.findByMemoryId.mockReturnValue({ id: 7 });

    const engine = new MatchEngine(mockSupermemory, mockRepo, 0.82);
    const result = await engine.processBugEvent(event);

    expect(result).toEqual({ kind: 'repeated', via: 'semantic', bugId: 7, score: 0.9 });
  });

  it('returns new when nothing matches', async () => {
    mockRepo.findByFingerprint.mockReturnValue(undefined);
    mockSupermemory.search.mockResolvedValue([]);

    const engine = new MatchEngine(mockSupermemory, mockRepo, 0.82);
    const result = await engine.processBugEvent(event);

    expect(result).toEqual({ kind: 'new' });
    expect(mockRepo.create).toHaveBeenCalled();
  });
});