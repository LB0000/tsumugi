import { Router } from 'express';
import { requireAuth } from '../lib/auth.js';
import { generateContent, generateEmailContent, type ContentType, type Platform, type EmailSegment, type EmailPurpose } from '../lib/gemini-text.js';
import { db } from '../db/index.js';
import { contents } from '../db/schema.js';
import { eq, desc, and, like } from 'drizzle-orm';
import { nanoid } from 'nanoid';

export const contentRouter = Router();

contentRouter.use(requireAuth);

const VALID_TYPES: ContentType[] = ['sns_post', 'ad_copy', 'blog_article'];
const VALID_PLATFORMS: Platform[] = ['instagram', 'twitter', 'tiktok', 'blog'];
const VALID_EMAIL_SEGMENTS: EmailSegment[] = ['new', 'active', 'lapsed', 'all'];
const VALID_EMAIL_PURPOSES: EmailPurpose[] = ['welcome', 'promotion', 'reactivation', 'newsletter'];
const MAX_TOPIC_LENGTH = 500;
const MAX_TITLE_LENGTH = 200;
const MAX_BODY_LENGTH = 50_000;

// AI generate content
contentRouter.post('/generate', async (req, res) => {
  try {
    const { type, platform, topic } = req.body as {
      type?: ContentType;
      platform?: Platform;
      topic?: string;
    };

    if (!type || !platform || !topic) {
      res.status(400).json({ error: 'type, platform, topic are required' });
      return;
    }

    if (!VALID_TYPES.includes(type)) {
      res.status(400).json({ error: `type must be one of: ${VALID_TYPES.join(', ')}` });
      return;
    }
    if (!VALID_PLATFORMS.includes(platform)) {
      res.status(400).json({ error: `platform must be one of: ${VALID_PLATFORMS.join(', ')}` });
      return;
    }
    if (topic.length > MAX_TOPIC_LENGTH) {
      res.status(400).json({ error: `topic must be ${MAX_TOPIC_LENGTH} characters or less` });
      return;
    }

    const body = await generateContent(type, platform, topic);
    res.json({ body });
  } catch (error) {
    console.error('Content generation error:', error);
    res.status(500).json({ error: 'コンテンツの生成に失敗しました' });
  }
});

// AI generate email content
contentRouter.post('/generate-email', async (req, res) => {
  try {
    const { segment, purpose, topic } = req.body as {
      segment?: EmailSegment;
      purpose?: EmailPurpose;
      topic?: string;
    };

    if (!segment || !purpose) {
      res.status(400).json({ error: 'segment and purpose are required' });
      return;
    }
    if (!VALID_EMAIL_SEGMENTS.includes(segment)) {
      res.status(400).json({ error: `segment must be one of: ${VALID_EMAIL_SEGMENTS.join(', ')}` });
      return;
    }
    if (!VALID_EMAIL_PURPOSES.includes(purpose)) {
      res.status(400).json({ error: `purpose must be one of: ${VALID_EMAIL_PURPOSES.join(', ')}` });
      return;
    }
    if (topic && topic.length > MAX_TOPIC_LENGTH) {
      res.status(400).json({ error: `topic must be ${MAX_TOPIC_LENGTH} characters or less` });
      return;
    }

    const result = await generateEmailContent(segment, purpose, topic || '');
    res.json(result);
  } catch (error) {
    console.error('Email content generation error:', error);
    res.status(500).json({ error: 'メールの生成に失敗しました' });
  }
});

// Create content (save as draft)
contentRouter.post('/', (req, res) => {
  try {
    const { type, platform, title, body, aiPrompt, tags } = req.body as {
      type: string;
      platform?: string;
      title: string;
      body: string;
      aiPrompt?: string;
      tags?: string[];
    };

    if (!type || !title || !body) {
      res.status(400).json({ error: 'type, title, body are required' });
      return;
    }
    if (!VALID_TYPES.includes(type as ContentType)) {
      res.status(400).json({ error: `type must be one of: ${VALID_TYPES.join(', ')}` });
      return;
    }
    if (platform && !VALID_PLATFORMS.includes(platform as Platform)) {
      res.status(400).json({ error: `platform must be one of: ${VALID_PLATFORMS.join(', ')}` });
      return;
    }
    if (title.length > MAX_TITLE_LENGTH || body.length > MAX_BODY_LENGTH) {
      res.status(400).json({ error: 'title or body exceeds maximum length' });
      return;
    }

    const now = new Date().toISOString();
    const id = nanoid();

    db.insert(contents).values({
      id,
      type,
      platform: platform || null,
      title,
      body,
      status: 'draft',
      aiPrompt: aiPrompt || null,
      tags: tags ? JSON.stringify(tags) : null,
      createdAt: now,
      updatedAt: now,
    }).run();

    const created = db.select().from(contents).where(eq(contents.id, id)).get();
    res.status(201).json(created);
  } catch (error) {
    console.error('Create content error:', error);
    res.status(500).json({ error: 'コンテンツの保存に失敗しました' });
  }
});

// List contents
contentRouter.get('/', (req, res) => {
  try {
    const { status, type, search } = req.query as {
      status?: string;
      type?: string;
      search?: string;
    };

    const conditions = [];
    if (status) conditions.push(eq(contents.status, status));
    if (type) conditions.push(eq(contents.type, type));
    if (search) conditions.push(like(contents.title, `%${search}%`));

    const where = conditions.length > 0 ? and(...conditions) : undefined;

    const results = db
      .select()
      .from(contents)
      .where(where)
      .orderBy(desc(contents.updatedAt))
      .all();

    res.json(results);
  } catch (error) {
    console.error('List contents error:', error);
    res.status(500).json({ error: 'コンテンツの取得に失敗しました' });
  }
});

// Get single content
contentRouter.get('/:id', (req, res) => {
  const item = db.select().from(contents).where(eq(contents.id, req.params.id)).get();
  if (!item) {
    res.status(404).json({ error: 'コンテンツが見つかりません' });
    return;
  }
  res.json(item);
});

// Update content
contentRouter.put('/:id', (req, res) => {
  try {
    const existing = db.select().from(contents).where(eq(contents.id, req.params.id)).get();
    if (!existing) {
      res.status(404).json({ error: 'コンテンツが見つかりません' });
      return;
    }

    const { title, body, platform, tags } = req.body as {
      title?: string;
      body?: string;
      platform?: string;
      tags?: string[];
    };

    if (platform !== undefined && !VALID_PLATFORMS.includes(platform as Platform)) {
      res.status(400).json({ error: `platform must be one of: ${VALID_PLATFORMS.join(', ')}` });
      return;
    }
    if (title !== undefined && title.length > MAX_TITLE_LENGTH) {
      res.status(400).json({ error: `title must be ${MAX_TITLE_LENGTH} characters or less` });
      return;
    }
    if (body !== undefined && body.length > MAX_BODY_LENGTH) {
      res.status(400).json({ error: `body must be ${MAX_BODY_LENGTH} characters or less` });
      return;
    }

    db.update(contents)
      .set({
        ...(title !== undefined && { title }),
        ...(body !== undefined && { body }),
        ...(platform !== undefined && { platform }),
        ...(tags !== undefined && { tags: JSON.stringify(tags) }),
        updatedAt: new Date().toISOString(),
      })
      .where(eq(contents.id, req.params.id))
      .run();

    const updated = db.select().from(contents).where(eq(contents.id, req.params.id)).get();
    res.json(updated);
  } catch (error) {
    console.error('Update content error:', error);
    res.status(500).json({ error: 'コンテンツの更新に失敗しました' });
  }
});

// Delete content
contentRouter.delete('/:id', (req, res) => {
  const existing = db.select().from(contents).where(eq(contents.id, req.params.id)).get();
  if (!existing) {
    res.status(404).json({ error: 'コンテンツが見つかりません' });
    return;
  }
  db.delete(contents).where(eq(contents.id, req.params.id)).run();
  res.json({ success: true });
});

// Publish content
contentRouter.post('/:id/publish', (req, res) => {
  const existing = db.select().from(contents).where(eq(contents.id, req.params.id)).get();
  if (!existing) {
    res.status(404).json({ error: 'コンテンツが見つかりません' });
    return;
  }
  const now = new Date().toISOString();
  db.update(contents)
    .set({ status: 'published', publishedAt: now, updatedAt: now })
    .where(eq(contents.id, req.params.id))
    .run();

  const updated = db.select().from(contents).where(eq(contents.id, req.params.id)).get();
  res.json(updated);
});

// Archive content
contentRouter.post('/:id/archive', (req, res) => {
  const existing = db.select().from(contents).where(eq(contents.id, req.params.id)).get();
  if (!existing) {
    res.status(404).json({ error: 'コンテンツが見つかりません' });
    return;
  }
  db.update(contents)
    .set({ status: 'archived', updatedAt: new Date().toISOString() })
    .where(eq(contents.id, req.params.id))
    .run();

  const updated = db.select().from(contents).where(eq(contents.id, req.params.id)).get();
  res.json(updated);
});
