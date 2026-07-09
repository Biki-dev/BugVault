import fetch from 'node-fetch';
import { MemoryEntry, SemanticMatch } from './memoryTypes';

export class SupermemoryClient {
  constructor(private baseUrl: string) {}

  async addMemory(content: string, metadata: Record<string, string | number>): Promise<string> {
    const res = await fetch(`${this.baseUrl}/v1/memories`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ content, metadata })
    });

    if (!res.ok) {
      throw new Error(`Supermemory addMemory failed: ${res.status} ${res.statusText}`);
    }

    const data = (await res.json()) as { id: string };
    return data.id;
  }

  async search(query: string, limit = 5): Promise<SemanticMatch[]> {
    const res = await fetch(`${this.baseUrl}/v1/search`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ query, limit })
    });

    if (!res.ok) {
      throw new Error(`Supermemory search failed: ${res.status} ${res.statusText}`);
    }

    const data = (await res.json()) as {
      results: Array<{ id: string; score: number; content: string; metadata: Record<string, any> }>;
    };

    return data.results.map(r => ({
      memoryId: r.id,
      score: r.score,
      content: r.content,
      metadata: r.metadata
    }));
  }

  async updateMemory(id: string, content: string, metadata: Record<string, string | number>): Promise<void> {
    const res = await fetch(`${this.baseUrl}/v1/memories/${id}`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ content, metadata })
    });

    if (!res.ok) {
      throw new Error(`Supermemory updateMemory failed: ${res.status} ${res.statusText}`);
    }
  }

  async isAlive(): Promise<boolean> {
    try {
      const res = await fetch(`${this.baseUrl}/v1/health`, { method: 'GET' });
      return res.ok;
    } catch {
      return false;
    }
  }
}