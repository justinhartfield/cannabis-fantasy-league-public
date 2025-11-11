import { Router } from 'express';
import { getDb } from '../db';
import { users } from '../../drizzle/schema';
import { eq } from 'drizzle-orm';
import { sdk } from '../_core/sdk';

const router = Router();

import { COOKIE_NAME, ONE_YEAR_MS } from '@shared/const';

/**
 * Mock Login Endpoint
 * For development/testing only
 */
router.post('/mock-login', async (req, res) => {
  try {
    const { username } = req.body;

    if (!username || typeof username !== 'string') {
      return res.status(400).json({ error: 'Username is required' });
    }

    const db = await getDb();
    if (!db) {
      return res.status(500).json({ error: 'Database not available' });
    }

    // Check if user exists
    let [user] = await db
      .select()
      .from(users)
      .where(eq(users.openId, username))
      .limit(1);

    // Create user if doesn't exist
    if (!user) {
      const [newUser] = await db
        .insert(users)
        .values({
          openId: username,
          name: username,
          email: `${username}@test.local`,
          loginMethod: 'mock',
        })
        .returning();

      user = newUser;
    }

    // Create session token using SDK
    const token = await sdk.createSessionToken(user.openId, {
      name: user.name || username,
      expiresInMs: 7 * 24 * 60 * 60 * 1000, // 7 days
    });

    // Set cookie
    res.cookie(COOKIE_NAME, token, {
      httpOnly: true,
      secure: process.env.NODE_ENV === 'production',
      sameSite: 'lax',
      maxAge: 7 * 24 * 60 * 60 * 1000, // 7 days
    });

    res.json({
      success: true,
      user: {
        id: user.id,
        openId: user.openId,
        name: user.name,
        email: user.email,
      },
    });
  } catch (error) {
    console.error('Mock login error:', error);
    res.status(500).json({ error: 'Login failed' });
  }
});

/**
 * Get Current User
 */
router.get('/me', async (req, res) => {
  try {
    const sessionCookie = req.cookies[COOKIE_NAME];

    if (!sessionCookie) {
      return res.json({ user: null });
    }

    const session = await sdk.verifySession(sessionCookie);

    if (!session) {
      return res.json({ user: null });
    }

    const db = await getDb();
    if (!db) {
      return res.status(500).json({ error: 'Database not available' });
    }

    const [user] = await db
      .select()
      .from(users)
      .where(eq(users.openId, session.openId))
      .limit(1);

    if (!user) {
      return res.json({ user: null });
    }

    res.json({
      user: {
        id: user.id,
        openId: user.openId,
        name: user.name,
        email: user.email,
      },
    });
  } catch (error) {
    console.error('Get user error:', error);
    res.json({ user: null });
  }
});

/**
 * Logout
 */
router.post('/logout', (req, res) => {
  res.clearCookie(COOKIE_NAME);
  res.json({ success: true });
});

export default router;
