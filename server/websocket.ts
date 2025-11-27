import { WebSocketServer, WebSocket } from 'ws';
import { IncomingMessage } from 'http';
import { parse } from 'url';

/**
 * WebSocket Server for Real-time Multiplayer Features
 * 
 * Handles:
 * - Real-time draft updates
 * - Live scoring updates
 * - League notifications
 */

const DRAFT_TIMING_ENABLED = process.env.DRAFT_TIMING_LOGS === "1";

function logDraftTiming(step: string, data?: Record<string, unknown>) {
  if (!DRAFT_TIMING_ENABLED) return;
  if (data) {
    console.log(`[DraftTiming] ${step}`, data);
  } else {
    console.log(`[DraftTiming] ${step}`);
  }
}

interface Client {
  ws: WebSocket;
  userId: number;
  leagueId?: number;
  teamId?: number;
}

interface DraftRoom {
  leagueId: number;
  clients: Set<Client>;
  currentPick: number;
  draftOrder: number[];
}

class WebSocketManager {
  private wss: WebSocketServer | null = null;
  private clients: Map<WebSocket, Client> = new Map();
  private draftRooms: Map<number, DraftRoom> = new Map();
  private leagueChannels: Map<number, Set<Client>> = new Map();
  // User-level channels for global notifications (e.g., opponent joined your challenge)
  private userChannels: Map<number, Set<Client>> = new Map();

  initialize(server: any) {
    this.wss = new WebSocketServer({ noServer: true });

    // Handle upgrade requests
    server.on('upgrade', (request: IncomingMessage, socket: any, head: Buffer) => {
      const { pathname } = parse(request.url || '');
      
      if (pathname === '/ws') {
        this.wss!.handleUpgrade(request, socket, head, (ws) => {
          this.wss!.emit('connection', ws, request);
        });
      } else {
        socket.destroy();
      }
    });

    this.wss.on('connection', (ws: WebSocket, request: IncomingMessage) => {
      console.log('[WebSocket] New connection');
      
      // Parse query parameters for authentication
      const { query } = parse(request.url || '', true);
      const userId = parseInt(query.userId as string);
      const leagueId = query.leagueId ? parseInt(query.leagueId as string) : undefined;
      const teamId = query.teamId ? parseInt(query.teamId as string) : undefined;

      if (!userId) {
        console.log('[WebSocket] Connection rejected: No userId provided');
        ws.close(1008, 'Authentication required');
        return;
      }

      const client: Client = { ws, userId, leagueId, teamId };
      this.clients.set(ws, client);

      // Always join user's personal channel for global notifications
      this.joinUserChannel(client);

      // Join league channel if leagueId is provided
      if (leagueId) {
        this.joinLeagueChannel(client, leagueId);
      }

      ws.on('message', (data: Buffer) => {
        try {
          const message = JSON.parse(data.toString());
          this.handleMessage(client, message);
        } catch (error) {
          console.error('[WebSocket] Error parsing message:', error);
        }
      });

      ws.on('close', () => {
        console.log('[WebSocket] Connection closed');
        this.handleDisconnect(client);
      });

      ws.on('error', (error) => {
        console.error('[WebSocket] Error:', error);
      });

      // Send connection confirmation
      this.sendToClient(client, {
        type: 'connected',
        userId,
        leagueId,
        teamId,
      });
    });

    console.log('[WebSocket] Server initialized');
  }

  private handleMessage(client: Client, message: any) {
    console.log('[WebSocket] Received message:', message.type);

    switch (message.type) {
      case 'join_draft':
        this.joinDraftRoom(client, message.leagueId);
        break;
      case 'leave_draft':
        this.leaveDraftRoom(client);
        break;
      case 'join_league':
        this.joinLeagueChannel(client, message.leagueId);
        break;
      case 'ping':
        this.sendToClient(client, { type: 'pong' });
        break;
      default:
        console.log('[WebSocket] Unknown message type:', message.type);
    }
  }

  private handleDisconnect(client: Client) {
    this.leaveDraftRoom(client);
    this.leaveLeagueChannel(client);
    this.leaveUserChannel(client);
    this.clients.delete(client.ws);
  }

  // User Channel Management (for global notifications)
  private joinUserChannel(client: Client) {
    if (!this.userChannels.has(client.userId)) {
      this.userChannels.set(client.userId, new Set());
    }

    const channel = this.userChannels.get(client.userId)!;
    channel.add(client);

    console.log(`[WebSocket] Client joined user channel for userId ${client.userId}`);
  }

  private leaveUserChannel(client: Client) {
    const channel = this.userChannels.get(client.userId);
    if (channel) {
      channel.delete(client);

      // Clean up empty channels
      if (channel.size === 0) {
        this.userChannels.delete(client.userId);
      }
    }
  }

  /**
   * Send a message to a specific user across all their connected devices/tabs
   * Used for global notifications like "opponent joined your challenge"
   */
  notifyUser(userId: number, message: any) {
    const channel = this.userChannels.get(userId);
    if (!channel) {
      console.log(`[WebSocket] No active connections for user ${userId}`);
      return;
    }

    console.log(`[WebSocket] Notifying user ${userId} with message type: ${message.type}`);
    channel.forEach((client) => {
      if (client.ws.readyState === WebSocket.OPEN) {
        client.ws.send(JSON.stringify(message));
      }
    });
  }

  // Draft Room Management
  joinDraftRoom(client: Client, leagueId: number) {
    if (!this.draftRooms.has(leagueId)) {
      this.draftRooms.set(leagueId, {
        leagueId,
        clients: new Set(),
        currentPick: 1,
        draftOrder: [],
      });
    }

    const room = this.draftRooms.get(leagueId)!;
    room.clients.add(client);
    client.leagueId = leagueId;

    console.log(`[WebSocket] Client ${client.userId} joined draft room ${leagueId}`);

    // Send current draft state to the new client
    this.sendToClient(client, {
      type: 'draft_joined',
      leagueId,
      currentPick: room.currentPick,
      participantCount: room.clients.size,
    });

    // Notify other clients in the room
    this.broadcastToDraftRoom(leagueId, {
      type: 'participant_joined',
      userId: client.userId,
      participantCount: room.clients.size,
    }, client);
  }

  leaveDraftRoom(client: Client) {
    if (!client.leagueId) return;

    const room = this.draftRooms.get(client.leagueId);
    if (room) {
      room.clients.delete(client);
      
      console.log(`[WebSocket] Client ${client.userId} left draft room ${client.leagueId}`);

      // Notify other clients
      this.broadcastToDraftRoom(client.leagueId, {
        type: 'participant_left',
        userId: client.userId,
        participantCount: room.clients.size,
      });

      // Clean up empty rooms
      if (room.clients.size === 0) {
        this.draftRooms.delete(client.leagueId);
      }
    }
  }

  // League Channel Management
  joinLeagueChannel(client: Client, leagueId: number) {
    if (!this.leagueChannels.has(leagueId)) {
      this.leagueChannels.set(leagueId, new Set());
    }

    const channel = this.leagueChannels.get(leagueId)!;
    channel.add(client);
    client.leagueId = leagueId;

    console.log(`[WebSocket] Client ${client.userId} joined league channel ${leagueId}`);
  }

  leaveLeagueChannel(client: Client) {
    if (!client.leagueId) return;

    const channel = this.leagueChannels.get(client.leagueId);
    if (channel) {
      channel.delete(client);

      // Clean up empty channels
      if (channel.size === 0) {
        this.leagueChannels.delete(client.leagueId);
      }
    }
  }

  // Broadcasting Methods
  broadcastToDraftRoom(leagueId: number, message: any, exclude?: Client) {
    const room = this.draftRooms.get(leagueId);
    if (!room) return;

    room.clients.forEach((client) => {
      if (client !== exclude && client.ws.readyState === WebSocket.OPEN) {
        client.ws.send(JSON.stringify(message));
      }
    });
  }

  broadcastToLeague(leagueId: number, message: any, exclude?: Client) {
    try {
      const channel = this.leagueChannels.get(leagueId);
      const channelSize = channel?.size || 0;
      
      if (!channel || channelSize === 0) {
        console.log(`[WebSocket] No clients in league ${leagueId} for ${message.type} (channel exists: ${!!channel})`);
        return;
      }

      let sentCount = 0;
      let errorCount = 0;
      channel.forEach((client) => {
        try {
          if (client !== exclude && client.ws.readyState === WebSocket.OPEN) {
            client.ws.send(JSON.stringify(message));
            sentCount++;
          }
        } catch (sendError) {
          errorCount++;
          console.error(`[WebSocket] Error sending to client:`, sendError);
        }
      });
      console.log(`[WebSocket] Sent ${message.type} to ${sentCount}/${channelSize} clients in league ${leagueId}${errorCount > 0 ? ` (${errorCount} errors)` : ''}`);
    } catch (error) {
      console.error(`[WebSocket] broadcastToLeague error for league ${leagueId}:`, error);
    }
  }

  sendToClient(client: Client, message: any) {
    if (client.ws.readyState === WebSocket.OPEN) {
      client.ws.send(JSON.stringify(message));
    }
  }

  // Draft Events
  notifyPlayerPicked(leagueId: number, data: {
    teamId: number;
    teamName: string;
    assetType: string;
    assetId: number;
    assetName: string;
    pickNumber: number;
    imageUrl?: string | null;
  }) {
    logDraftTiming("ws:player_picked", {
      leagueId,
      ...data,
    });

    this.broadcastToDraftRoom(leagueId, {
      type: 'player_picked',
      ...data,
      timestamp: Date.now(),
    });
  }

  notifyNextPick(leagueId: number, data: {
    teamId: number;
    teamName: string;
    pickNumber: number;
    round: number;
  }) {
    const room = this.draftRooms.get(leagueId);
    if (room) {
      room.currentPick = data.pickNumber;
    }

    logDraftTiming("ws:next_pick", {
      leagueId,
      ...data,
    });

    this.broadcastToDraftRoom(leagueId, {
      type: 'next_pick',
      teamId: data.teamId,
      teamName: data.teamName,
      pickNumber: data.pickNumber,
      round: data.round,
      timestamp: Date.now(),
    });
  }

  notifyDraftComplete(leagueId: number) {
    this.broadcastToDraftRoom(leagueId, {
      type: 'draft_complete',
      timestamp: Date.now(),
    });
  }

  // Timer Events
  notifyTimerStart(leagueId: number, data: {
    pickNumber: number;
    teamId: number;
    timeLimit: number;
    startTime: number;
  }) {
    logDraftTiming("ws:timer_start", {
      leagueId,
      ...data,
    });

    this.broadcastToDraftRoom(leagueId, {
      type: 'timer_start',
      ...data,
      timestamp: Date.now(),
    });
  }

  notifyTimerTick(leagueId: number, data: {
    pickNumber: number;
    remaining: number;
  }) {
    this.broadcastToDraftRoom(leagueId, {
      type: 'timer_tick',
      ...data,
      timestamp: Date.now(),
    });
  }

  notifyTimerStop(leagueId: number) {
    this.broadcastToDraftRoom(leagueId, {
      type: 'timer_stop',
      timestamp: Date.now(),
    });
  }

  notifyTimerPause(leagueId: number, data: { remaining: number }) {
    this.broadcastToDraftRoom(leagueId, {
      type: 'timer_pause',
      ...data,
      timestamp: Date.now(),
    });
  }

  notifyTimerResume(leagueId: number, data: {
    pickNumber: number;
    remaining: number;
  }) {
    this.broadcastToDraftRoom(leagueId, {
      type: 'timer_resume',
      ...data,
      timestamp: Date.now(),
    });
  }

  notifyAutoPick(leagueId: number, data: {
    teamId: number;
    pickNumber: number;
    assetName?: string;
    teamName?: string;
  }) {
    this.broadcastToDraftRoom(leagueId, {
      type: 'auto_pick',
      ...data,
      timestamp: Date.now(),
    });
  }

  /**
   * Notify when auto-pick is enabled for a team (due to timer expiration)
   */
  notifyAutoPickEnabled(leagueId: number, data: {
    teamId: number;
    teamName: string;
    reason: 'timer_expired';
  }) {
    this.broadcastToDraftRoom(leagueId, {
      type: 'auto_pick_enabled',
      ...data,
      timestamp: Date.now(),
    });
  }

  /**
   * Notify when wishlist player is drafted (for auto-pick from queue feature)
   */
  notifyWishlistPlayerDrafted(leagueId: number, data: {
    assetType: string;
    assetId: number;
    assetName: string;
    draftedByTeamId: number;
    draftedByTeamName: string;
  }) {
    this.broadcastToDraftRoom(leagueId, {
      type: 'wishlist_player_drafted',
      ...data,
      timestamp: Date.now(),
    });
  }

  // Scoring Events
  notifyScoresUpdated(leagueId: number, data: {
    week: number;
    year: number;
    scores: Array<{ teamId: number; teamName: string; points: number }>;
  }) {
    this.broadcastToLeague(leagueId, {
      type: 'scores_updated',
      ...data,
      timestamp: Date.now(),
    });
  }

  // Challenge-specific Events
  notifyChallengeScoreUpdate(challengeId: number, data: {
    challengeId: number;
    year: number;
    week: number;
    statDate?: string;
    scores: Array<{ teamId: number; teamName: string; points: number }>;
    updateTime: string;
  }) {
    console.log(`[WebSocket] Broadcasting challenge_score_update to league ${challengeId}, scores:`, 
      data.scores.map(s => `${s.teamName}: ${s.points}`).join(', '));
    this.broadcastToLeague(challengeId, {
      type: 'challenge_score_update',
      ...data,
      timestamp: Date.now(),
    });
  }

  notifyChallengeFinalized(challengeId: number, data: {
    challengeId: number;
    year: number;
    week: number;
    statDate?: string;
    scores: Array<{ teamId: number; teamName: string; points: number }>;
    winner: {
      teamId: number;
      teamName: string;
      userId: number;
      points: number;
    };
    finalizedAt: string;
  }) {
    this.broadcastToLeague(challengeId, {
      type: 'challenge_finalized',
      ...data,
      timestamp: Date.now(),
    });
  }

  notifyChatMessage(leagueId: number, data: {
    id: number;
    userId: number;
    userName: string;
    userAvatarUrl?: string | null;
    message: string;
    createdAt: string;
  }) {
    this.broadcastToLeague(leagueId, {
        type: 'chat_message',
        ...data,
    });
  }

  /**
   * Notify when an individual scoring play happens (for battle animations)
   * This triggers attack effects in the BattleArena component
   */
  notifyScoringPlay(leagueId: number, data: {
    attackingTeamId: number;
    attackingTeamName: string;
    defendingTeamId: number;
    defendingTeamName: string;
    playerName: string;
    playerType: 'manufacturer' | 'cannabis_strain' | 'product' | 'pharmacy' | 'brand';
    pointsScored: number;
    attackerNewTotal: number;
    defenderTotal: number;
    imageUrl?: string | null;
    position?: string;
  }) {
    this.broadcastToLeague(leagueId, {
      type: 'scoring_play',
      ...data,
      timestamp: Date.now(),
    });
  }

  /**
   * Batch notify multiple scoring plays (for when scores are calculated)
   * Sends plays with staggered timestamps for sequential animation
   */
  notifyScoringPlaysBatch(leagueId: number, plays: Array<{
    attackingTeamId: number;
    attackingTeamName: string;
    defendingTeamId: number;
    defendingTeamName: string;
    playerName: string;
    playerType: 'manufacturer' | 'cannabis_strain' | 'product' | 'pharmacy' | 'brand';
    pointsScored: number;
    attackerNewTotal: number;
    defenderTotal: number;
    imageUrl?: string | null;
    position?: string;
  }>) {
    // Send plays with staggered delays for animation sequencing
    // 6 seconds between plays: 5 seconds for announcement display + 1 second buffer
    plays.forEach((play, index) => {
      setTimeout(() => {
        this.notifyScoringPlay(leagueId, play);
      }, index * 6000);
    });
  }
}

export const wsManager = new WebSocketManager();
