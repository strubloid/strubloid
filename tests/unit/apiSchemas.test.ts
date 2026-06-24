import { describe, it, expect } from 'vitest';
import { z } from 'zod';

// Mirror the production SendMessage schema
const SendMessageSchema = z.object({
  chatId: z.string().optional(),
  projectId: z.string().optional(),
  message: z.string().min(1).max(10000),
  useAiBrain: z.boolean().optional().default(false),
  useRandomChats: z.boolean().optional().default(false),
});

// Mirror the production CreateChat schema
const CreateChatSchema = z.object({
  projectId: z.string().optional(),
  title: z.string().optional(),
});

// Mirror the production CreateProject schema
const CreateProjectSchema = z.object({
  name: z.string().min(1).max(100),
  description: z.string().optional(),
  color: z.string().regex(/^#[0-9a-fA-F]{6}$/).optional(),
});

// Mirror the production UpdateProject schema
const UpdateProjectSchema = z.object({
  name: z.string().min(1).max(100).optional(),
  description: z.string().optional(),
  color: z.string().regex(/^#[0-9a-fA-F]{6}$/).optional(),
});

// Mirror the production UpdateChat schema
const UpdateChatSchema = z.object({
  title: z.string().min(1).max(200).optional(),
  useAiBrain: z.boolean().optional(),
  useRandomChats: z.boolean().optional(),
});

describe('API request schemas', () => {
  describe('POST /api/chat/send', () => {
    it('accepts minimal valid payload', () => {
      const r = SendMessageSchema.safeParse({ message: 'hello' });
      expect(r.success).toBe(true);
      if (r.success) {
        expect(r.data.useAiBrain).toBe(false);
        expect(r.data.chatId).toBeUndefined();
      }
    });

    it('accepts declared fields', () => {
      const r = SendMessageSchema.safeParse({
        chatId: 'c1',
        projectId: 'p1',
        message: 'hi',
        useAiBrain: true,
        useRandomChats: true,
      });
      expect(r.success).toBe(true);
    });

    it('defaults useRandomChats to false', () => {
      const r = SendMessageSchema.safeParse({ message: 'hello' });
      expect(r.success).toBe(true);
      if (r.success) {
        expect(r.data.useRandomChats).toBe(false);
      }
    });

    it('rejects empty message', () => {
      const r = SendMessageSchema.safeParse({ message: '' });
      expect(r.success).toBe(false);
    });

    it('rejects oversize message', () => {
      const r = SendMessageSchema.safeParse({ message: 'x'.repeat(10_001) });
      expect(r.success).toBe(false);
    });

    it('rejects wrong types', () => {
      const r = SendMessageSchema.safeParse({ message: 123 });
      expect(r.success).toBe(false);
    });
  });

  describe('POST /api/chats', () => {
    it('accepts empty body (uses defaults)', () => {
      const r = CreateChatSchema.safeParse({});
      expect(r.success).toBe(true);
    });

    it('accepts optional projectId and title', () => {
      const r = CreateChatSchema.safeParse({ projectId: 'p1', title: 'X' });
      expect(r.success).toBe(true);
    });
  });

  describe('POST /api/projects', () => {
    it('requires name (min 1)', () => {
      const r = CreateProjectSchema.safeParse({ name: '' });
      expect(r.success).toBe(false);
    });

    it('rejects oversized name', () => {
      const r = CreateProjectSchema.safeParse({ name: 'x'.repeat(101) });
      expect(r.success).toBe(false);
    });

    it('accepts valid color hex', () => {
      const r = CreateProjectSchema.safeParse({ name: 'X', color: '#9ad933' });
      expect(r.success).toBe(true);
    });

    it('rejects malformed color', () => {
      const r = CreateProjectSchema.safeParse({ name: 'X', color: 'red' });
      expect(r.success).toBe(false);
      const r2 = CreateProjectSchema.safeParse({ name: 'X', color: '#abc' });
      expect(r2.success).toBe(false);
      const r3 = CreateProjectSchema.safeParse({ name: 'X', color: '#GGGGGG' });
      expect(r3.success).toBe(false);
    });
  });

  describe('PATCH /api/projects/[id]', () => {
    it('allows partial updates', () => {
      expect(UpdateProjectSchema.safeParse({ name: 'New' }).success).toBe(true);
      expect(UpdateProjectSchema.safeParse({ description: 'desc' }).success).toBe(true);
      expect(UpdateProjectSchema.safeParse({ color: '#000000' }).success).toBe(true);
      expect(UpdateProjectSchema.safeParse({}).success).toBe(true);
    });
  });

  describe('PATCH /api/chats/[id]', () => {
    it('accepts empty body (no-op)', () => {
      expect(UpdateChatSchema.safeParse({}).success).toBe(true);
    });

    it('accepts title alone', () => {
      expect(UpdateChatSchema.safeParse({ title: 'Renamed chat' }).success).toBe(true);
    });

    it('accepts useAiBrain alone', () => {
      expect(UpdateChatSchema.safeParse({ useAiBrain: true }).success).toBe(true);
    });

    it('accepts useRandomChats alone', () => {
      expect(UpdateChatSchema.safeParse({ useRandomChats: true }).success).toBe(true);
    });

    it('accepts both fields together', () => {
      const r = UpdateChatSchema.safeParse({ title: 'Hello', useAiBrain: false, useRandomChats: true });
      expect(r.success).toBe(true);
    });

    it('rejects wrong types for useRandomChats', () => {
      expect(UpdateChatSchema.safeParse({ useRandomChats: 'yes' }).success).toBe(false);
    });

    it('rejects empty title (min 1)', () => {
      expect(UpdateChatSchema.safeParse({ title: '' }).success).toBe(false);
    });

    it('rejects title over 200 chars', () => {
      expect(UpdateChatSchema.safeParse({ title: 'x'.repeat(201) }).success).toBe(false);
    });

    it('rejects wrong types', () => {
      expect(UpdateChatSchema.safeParse({ title: 123 }).success).toBe(false);
      expect(UpdateChatSchema.safeParse({ useAiBrain: 'yes' }).success).toBe(false);
    });
  });
});
