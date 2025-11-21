import { useEffect, useRef, useState } from 'react';
import { useAuth } from '@/_core/hooks/useAuth';

type ChatMessage = {
  id: number;
  userId: number;
  userName: string;
  userAvatarUrl?: string | null;
  message: string;
  createdAt: string;
  isGiphy?: boolean; // inferred from content
};

export function useLeagueChat(leagueId: number) {
  const { user } = useAuth();
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const wsRef = useRef<WebSocket | null>(null);

  useEffect(() => {
    if (!user || !leagueId) return;

    // Connect to WS
    const protocol = window.location.protocol === 'https:' ? 'wss:' : 'ws:';
    const host = window.location.host;
    const wsUrl = `${protocol}//${host}/ws?userId=${user.id}&leagueId=${leagueId}`;

    const ws = new WebSocket(wsUrl);
    wsRef.current = ws;

    ws.onopen = () => {
      console.log('Connected to league chat');
      ws.send(JSON.stringify({ type: 'join_league', leagueId }));
    };

    ws.onmessage = (event) => {
      try {
        const data = JSON.parse(event.data);
        if (data.type === 'chat_message') {
          const newMsg: ChatMessage = {
            id: data.id,
            userId: data.userId,
            userName: data.userName,
            userAvatarUrl: data.userAvatarUrl,
            message: data.message,
            createdAt: data.createdAt,
          };
          setMessages((prev) => [newMsg, ...prev]);
        }
      } catch (e) {
        console.error('Error parsing WS message', e);
      }
    };

    return () => {
      ws.close();
    };
  }, [user, leagueId]);

  return { messages, setMessages };
}


