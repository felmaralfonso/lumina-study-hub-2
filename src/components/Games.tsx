import React, { useState, useEffect, useRef } from 'react';
import { createPortal } from 'react-dom';
import { motion, AnimatePresence } from 'motion/react';
import { Gamepad2Icon, UserPlusIcon, UsersIcon, CopyIcon, CheckIcon, ChevronLeftIcon, GlobeIcon, Loader2Icon, MessageCircleIcon, Edit2Icon, LogOutIcon } from 'lucide-react';
import mqtt from 'mqtt';
import { GameConnection } from '../lib/GameConnection';
import TicTacToe from './games/TicTacToe';
import Connect4 from './games/Connect4';
import { cn } from '../lib/utils';

type GameType = 'tictactoe' | 'connect4' | null;

interface LobbyRoom {
  id: string;
  game: GameType;
  hostName: string;
  lastSeen: number;
}

function GameChat({ connection, myName, opponentName }: { connection: GameConnection, myName: string, opponentName: string }) {
  const [messages, setMessages] = useState<{id: string, senderName: string, text: string, isMe: boolean}[]>([]);
  const [input, setInput] = useState('');
  const [isOpen, setIsOpen] = useState(false);
  const [hasUnread, setHasUnread] = useState(false);
  const messagesEndRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const handleData = (data: any) => {
      if (data.type === 'CHAT') {
        setMessages(prev => [...prev, { id: Math.random().toString(), senderName: opponentName, text: data.text, isMe: false }].slice(-50));
        if (!isOpen) setHasUnread(true);
      }
    };
    connection.on('data', handleData);
    return () => connection.off('data', handleData);
  }, [connection, isOpen, opponentName]);

  useEffect(() => {
    if (isOpen) {
      setHasUnread(false);
      messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
    }
  }, [messages, isOpen]);

  const sendMessage = (e: React.FormEvent) => {
    e.preventDefault();
    if (!input.trim()) return;
    connection.send({ type: 'CHAT', text: input });
    setMessages(prev => [...prev, { id: Math.random().toString(), senderName: myName, text: input, isMe: true }].slice(-50));
    setInput('');
  };

  return (
    <div className="absolute bottom-6 right-6 z-[100] flex flex-col items-end">
      {isOpen && (
        <div className="bg-white border border-black/10 rounded-2xl shadow-2xl w-80 mb-4 overflow-hidden flex flex-col h-96">
          <div className="bg-black/5 p-3 flex justify-between items-center border-b border-black/5">
            <span className="text-xs font-bold uppercase tracking-widest opacity-60">Game Chat</span>
            <button onClick={() => setIsOpen(false)} className="opacity-50 hover:opacity-100">×</button>
          </div>
          <div className="flex-1 overflow-y-auto p-4 space-y-3 bg-bg-primary">
            {messages.length === 0 && <p className="text-xs opacity-40 text-center italic mt-4">No messages yet. Say hi!</p>}
            {messages.map(m => (
              <div key={m.id} className={cn("max-w-[80%] rounded-xl px-3 py-2 text-sm", m.isMe ? "bg-accent-primary text-white self-end ml-auto" : "bg-black/5 text-text-primary mr-auto")}>
                {!m.isMe && <div className="text-[10px] font-bold opacity-50 mb-1">{m.senderName}</div>}
                {m.text}
              </div>
            ))}
            <div ref={messagesEndRef} />
          </div>
          <form onSubmit={sendMessage} className="p-3 bg-white border-t border-black/5 flex gap-2">
            <input 
              value={input} 
              onChange={e => setInput(e.target.value)} 
              placeholder="Type message..." 
              className="flex-1 bg-black/5 rounded-lg px-3 py-2 text-sm outline-none focus:ring-1 focus:ring-accent-primary"
            />
            <button type="submit" className="bg-accent-primary text-white px-3 py-2 rounded-lg text-xs font-bold uppercase">Send</button>
          </form>
        </div>
      )}
      {!isOpen && (
        <button onClick={() => setIsOpen(true)} className="bg-text-primary text-white w-12 h-12 rounded-full shadow-xl flex items-center justify-center hover:bg-accent-primary transition-colors relative">
          <MessageCircleIcon size={20} />
          {hasUnread && <div className="absolute -top-1 -right-1 w-4 h-4 bg-red-500 rounded-full border-2 border-bg-primary" />}
        </button>
      )}
    </div>
  );
}

export default function Games() {
  const [username, setUsername] = useState(() => localStorage.getItem('lumina_username') || '');
  const [tempUsername, setTempUsername] = useState('');
  const [isEditingName, setIsEditingName] = useState(!localStorage.getItem('lumina_username'));
  const [opponentName, setOpponentName] = useState('Opponent');

  const [selectedGame, setSelectedGame] = useState<GameType>(null);
  const [mode, setMode] = useState<'menu' | 'host' | 'join' | 'playing'>('menu');
  const [roomId, setRoomId] = useState('');
  const [joinId, setJoinId] = useState('');
  const [connection, setConnection] = useState<GameConnection | null>(null);
  const [isHost, setIsHost] = useState(false);
  const [copied, setCopied] = useState(false);
  const [error, setError] = useState('');
  const [connecting, setConnecting] = useState(false);
  const [notification, setNotification] = useState<string | null>(null);
  const [isPrivateLobby, setIsPrivateLobby] = useState(false);
  
  // Matchmaking / Lobby State
  const [availableRooms, setAvailableRooms] = useState<Record<string, LobbyRoom>>({});
  const mqttClient = useRef<mqtt.MqttClient | null>(null);
  const gameConn = useRef<GameConnection | null>(null);
  const myRoomIdRef = useRef<string>('');

  const showNotification = (msg: string) => {
    setNotification(msg);
    setTimeout(() => setNotification(null), 4000);
  };

  // Initialize MQTT
  useEffect(() => {
    const client = mqtt.connect('wss://broker.emqx.io:8084/mqtt', {
      keepalive: 15,
      clean: true,
      reconnectPeriod: 1000,
      connectTimeout: 5000,
    });
    mqttClient.current = client;

    client.on('connect', () => {
      client.subscribe('lumina/lobby/#', { qos: 0 });
    });

    client.on('message', (topic, message) => {
      if (!topic.startsWith('lumina/lobby/')) return;
      try {
        const data = JSON.parse(message.toString());
        if (data.action === 'remove') {
          setAvailableRooms(prev => {
            const next = { ...prev };
            delete next[data.id];
            return next;
          });
          return;
        }
        if (data.id && data.game) {
          setAvailableRooms(prev => ({
            ...prev,
            [data.id]: { id: data.id, game: data.game, hostName: data.hostName || 'Anonymous', lastSeen: Date.now() }
          }));
        }
      } catch { /* ignore */ }
    });

    // Cleanup stale rooms
    const cleanupInterval = setInterval(() => {
      const now = Date.now();
      setAvailableRooms(prev => {
        const next = { ...prev };
        let changed = false;
        Object.keys(next).forEach(id => {
          if (now - next[id].lastSeen > 15000) {
            delete next[id];
            changed = true;
          }
        });
        return changed ? next : prev;
      });
    }, 5000);

    return () => {
      client.end();
      clearInterval(cleanupInterval);
    };
  }, []);

  // Broadcast presence when hosting
  useEffect(() => {
    let interval: any;
    if (mode === 'host' && roomId && selectedGame && mqttClient.current && !isPrivateLobby) {
      const broadcast = () => {
        mqttClient.current?.publish(`lumina/lobby/${roomId}`, JSON.stringify({
          id: roomId, game: selectedGame, hostName: username, timestamp: Date.now()
        }), { qos: 0 });
      };
      broadcast();
      interval = setInterval(broadcast, 2000);
    }
    return () => clearInterval(interval);
  }, [mode, roomId, selectedGame, username, isPrivateLobby]);

  const saveUsername = (e: React.FormEvent) => {
    e.preventDefault();
    if (!tempUsername.trim()) return;
    setUsername(tempUsername.trim());
    localStorage.setItem('lumina_username', tempUsername.trim());
    setIsEditingName(false);
  };

  const handleHost = (game: GameType) => {
    if (!game || !mqttClient.current) return;
    setSelectedGame(game);
    const newRoomId = Math.random().toString(36).substring(2, 6).toUpperCase();
    setRoomId(newRoomId);
    myRoomIdRef.current = newRoomId;
    setMode('host');
    setIsHost(true);
    setOpponentName('Opponent');

    const conn = new GameConnection(mqttClient.current, newRoomId, true);
    gameConn.current = conn;

    conn.on('disconnect', () => {
      showNotification('⚠️ The other player has left the game.');
      handleDisconnect();
    });

    // Listen for opponent joining
    conn.on('data', (data: any) => {
      if (data.type === 'JOIN') {
        const name = data.joinerName || 'Someone';
        setOpponentName(name);
        showNotification(`🎮 ${name} joined the game!`);
        mqttClient.current?.publish(`lumina/lobby/${newRoomId}`, JSON.stringify({ id: newRoomId, action: 'remove' }), { qos: 0 });
        conn.send({ type: 'INIT_GAME', game, hostName: username });
        setConnection(conn);
        setMode('playing');
      }
    });
  };

  const handleJoin = (idToJoin?: string) => {
    const targetId = (idToJoin || joinId).trim().toUpperCase();
    if (!targetId || !mqttClient.current) return;
    setMode('join');
    setIsHost(false);
    setError('');
    setConnecting(true);
    setOpponentName('Opponent');

    const conn = new GameConnection(mqttClient.current, targetId, false);
    gameConn.current = conn;

    conn.on('disconnect', () => {
      showNotification('⚠️ The other player has left the game.');
      handleDisconnect();
    });

    conn.on('data', (data: any) => {
      if (data.type === 'INIT_GAME') {
        setSelectedGame(data.game);
        if (data.hostName) setOpponentName(data.hostName);
        setConnection(conn);
        setConnecting(false);
        setMode('playing');
      }
    });

    // Tell the host we're here
    conn.onReady(() => {
      conn.send({ type: 'JOIN', joinerName: username });
      // Retry a few times in case of timing
      const retries = [500, 1500, 3000];
      retries.forEach(ms => setTimeout(() => {
        if (gameConn.current === conn) conn.send({ type: 'JOIN', joinerName: username });
      }, ms));
    });
  };

  const handleDisconnect = () => {
    // Remove from lobby if we were hosting
    if (myRoomIdRef.current && mqttClient.current) {
      mqttClient.current.publish(`lumina/lobby/${myRoomIdRef.current}`, JSON.stringify({ id: myRoomIdRef.current, action: 'remove' }), { qos: 0 });
    }
    gameConn.current?.destroy();
    gameConn.current = null;
    myRoomIdRef.current = '';
    setConnection(null);
    setMode('menu');
    setSelectedGame(null);
  };

  const copyRoomId = () => {
    navigator.clipboard.writeText(roomId);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const renderGame = () => {
    if (!connection || !selectedGame) return null;
    if (selectedGame === 'tictactoe') return <TicTacToe connection={connection} isHost={isHost} myName={username} opponentName={opponentName} />;
    if (selectedGame === 'connect4') return <Connect4 connection={connection} isHost={isHost} myName={username} opponentName={opponentName} />;
    return null;
  };

  // Filter out own room from lobby
  const rooms = Object.values(availableRooms).filter(r => r.id !== myRoomIdRef.current);

  const gameLabel = (g: GameType) => {
    if (g === 'tictactoe') return 'Tic-Tac-Toe';
    if (g === 'connect4') return 'Connect 4';
    return '';
  };

  return (
    <div className="p-12 flex-1 max-w-6xl mx-auto w-full relative overflow-y-auto">
      <div className="mb-16 text-left relative z-10 flex justify-between items-start">
        <div>
          <p className="text-[10px] font-bold uppercase tracking-[0.3em] opacity-50 mb-4">Module 04 / Recreation</p>
          <h1 className="text-5xl font-serif mb-6 leading-tight">Multiplayer Games.</h1>
          <p className="opacity-70 text-lg max-w-md italic font-serif leading-relaxed">Engage in real-time, peer-to-peer cognitive challenges.</p>
        </div>
        
        {username && !isEditingName && mode === 'menu' && (
          <div className="bg-black/5 border border-black/10 rounded-xl p-4 flex flex-col items-end">
            <p className="text-[10px] font-bold uppercase tracking-widest opacity-50 mb-1">Playing as</p>
            <div className="flex items-center gap-4">
              <span className="font-serif text-xl">{username}</span>
              <button onClick={() => { setTempUsername(username); setIsEditingName(true); }} className="text-accent-primary hover:opacity-70">
                <Edit2Icon size={16} />
              </button>
            </div>
          </div>
        )}
      </div>

      <AnimatePresence mode="wait">
        {isEditingName && (
          <motion.div 
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -20 }}
            key="username-setup"
            className="max-w-md mx-auto mt-20"
          >
            <div className="bg-white p-8 rounded-3xl shadow-2xl border border-[#E5E5E1] text-center">
              <h2 className="text-2xl font-serif mb-4">Choose your identity</h2>
              <p className="text-sm opacity-60 mb-8">This name will be visible to your opponents in the lobby and chat.</p>
              <form onSubmit={saveUsername} className="space-y-4">
                <input 
                  type="text" 
                  placeholder="Enter username" 
                  value={tempUsername}
                  onChange={e => setTempUsername(e.target.value)}
                  className="w-full bg-black/5 border border-black/10 focus:border-accent-primary rounded-xl p-4 outline-none transition-all text-center font-serif text-xl"
                  maxLength={16}
                  required
                />
                <button 
                  type="submit"
                  disabled={!tempUsername.trim()}
                  className="w-full bg-text-primary text-white py-4 text-xs font-bold uppercase tracking-[0.2em] hover:bg-accent-primary disabled:opacity-30 transition-all shadow-xl rounded-xl"
                >
                  Continue
                </button>
              </form>
            </div>
          </motion.div>
        )}

        {!isEditingName && mode === 'menu' && (
          <motion.div 
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -20 }}
            key="menu"
            className="space-y-12 pb-12"
          >
            {/* Global Lobby */}
            <section className="bg-black/5 p-8 border border-black/10 rounded-2xl">
              <div className="flex items-center justify-between mb-8">
                <div className="flex items-center gap-4">
                  <div className="w-10 h-10 bg-accent-primary/10 rounded-full flex items-center justify-center">
                    <GlobeIcon size={18} className="text-accent-primary" />
                  </div>
                  <div>
                    <h3 className="text-lg font-serif">Global Lobby</h3>
                    <p className="text-[10px] font-bold uppercase tracking-widest opacity-50">See who's currently queuing</p>
                  </div>
                </div>
                <div className="flex items-center gap-2">
                   <div className="w-2 h-2 rounded-full bg-green-500 animate-pulse" />
                   <span className="text-[10px] font-bold uppercase tracking-widest opacity-40">Live</span>
                </div>
              </div>

              {rooms.length === 0 ? (
                <div className="py-12 text-center border-2 border-dashed border-black/5 rounded-xl">
                  <p className="text-sm italic opacity-40">No active queues found. Why not host one?</p>
                </div>
              ) : (
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                  {rooms.map(room => (
                    <motion.div 
                      key={room.id}
                      initial={{ opacity: 0, scale: 0.95 }}
                      animate={{ opacity: 1, scale: 1 }}
                      className="bg-white p-4 rounded-xl shadow-sm border border-black/5 flex items-center justify-between group hover:border-accent-primary/30 transition-all"
                    >
                      <div className="flex items-center gap-3">
                        <div className="w-8 h-8 bg-black/5 rounded-lg flex items-center justify-center">
                          <Gamepad2Icon size={14} className="opacity-40" />
                        </div>
                        <div>
                          <p className="text-xs font-bold uppercase tracking-widest">{gameLabel(room.game)}</p>
                          <p className="text-[10px] opacity-40">Host: <span className="font-bold text-text-primary">{room.hostName}</span></p>
                        </div>
                      </div>
                      <button 
                        onClick={() => handleJoin(room.id)}
                        className="px-4 py-2 bg-text-primary text-white text-[10px] font-bold uppercase tracking-widest rounded-lg hover:bg-accent-primary transition-colors"
                      >
                        Join
                      </button>
                    </motion.div>
                  ))}
                </div>
              )}
            </section>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
              {/* Host */}
              <div className="bg-black/5 p-8 border border-black/10 rounded-2xl">
                <div className="flex items-center justify-between mb-8">
                  <div className="flex items-center gap-4">
                    <div className="w-12 h-12 bg-white rounded-full flex items-center justify-center shadow-sm">
                      <UserPlusIcon size={20} className="text-accent-primary" />
                    </div>
                    <div>
                      <h3 className="text-xl font-serif">Host a Game</h3>
                      <p className="text-[10px] font-bold uppercase tracking-widest opacity-50">Create Room</p>
                    </div>
                  </div>
                  <div className="flex items-center gap-2 bg-white px-3 py-2 rounded-xl shadow-sm border border-black/5">
                    <span className="text-[10px] font-bold uppercase tracking-widest opacity-50">Private</span>
                    <button 
                      onClick={() => setIsPrivateLobby(!isPrivateLobby)}
                      className={cn("w-8 h-4 rounded-full transition-colors relative", isPrivateLobby ? "bg-accent-primary" : "bg-black/20")}
                    >
                      <div className={cn("absolute top-0.5 left-0.5 w-3 h-3 bg-white rounded-full transition-transform", isPrivateLobby ? "translate-x-4" : "translate-x-0")} />
                    </button>
                  </div>
                </div>
                <div className="space-y-4">
                  {(['tictactoe', 'connect4'] as GameType[]).map(g => (
                    <button key={g} onClick={() => handleHost(g)} className="w-full flex items-center gap-4 p-4 bg-white rounded-xl hover:shadow-md transition-all group">
                      <Gamepad2Icon size={18} className="opacity-40 group-hover:text-accent-primary transition-colors" />
                      <span className="font-medium">{gameLabel(g)}</span>
                    </button>
                  ))}
                </div>
              </div>

              {/* Join */}
              <div className="bg-black/5 p-8 border border-black/10 rounded-2xl flex flex-col">
                <div className="flex items-center gap-4 mb-8">
                  <div className="w-12 h-12 bg-white rounded-full flex items-center justify-center shadow-sm">
                    <UsersIcon size={20} className="text-accent-primary" />
                  </div>
                  <div>
                    <h3 className="text-xl font-serif">Join Private</h3>
                    <p className="text-[10px] font-bold uppercase tracking-widest opacity-50">Enter Room Code</p>
                  </div>
                </div>
                <div className="flex-1 flex flex-col justify-center">
                  <input 
                    type="text" 
                    placeholder="CODE" 
                    value={joinId}
                    onChange={e => setJoinId(e.target.value)}
                    className="w-full bg-transparent border-b-2 border-black/10 focus:border-accent-primary rounded-none p-4 outline-none transition-all text-center text-4xl font-serif uppercase tracking-[0.2em] mb-8"
                    maxLength={4}
                  />
                  {error && <p className="text-red-500 text-xs font-bold uppercase tracking-widest text-center mb-4">{error}</p>}
                  <button 
                    onClick={() => handleJoin()}
                    disabled={joinId.length !== 4}
                    className="w-full bg-text-primary text-white py-4 text-xs font-bold uppercase tracking-[0.2em] hover:bg-accent-primary disabled:opacity-30 transition-all shadow-xl rounded-xl"
                  >
                    Connect
                  </button>
                </div>
              </div>
            </div>
          </motion.div>
        )}

        {mode === 'host' && (
          <motion.div 
            initial={{ opacity: 0, scale: 0.95 }}
            animate={{ opacity: 1, scale: 1 }}
            className="flex flex-col items-center justify-center py-20"
          >
            <div className="bg-white p-12 rounded-3xl shadow-2xl border border-[#E5E5E1] text-center relative overflow-hidden">
              <div className="absolute top-0 left-0 right-0 h-1 bg-accent-primary animate-pulse" />
              <p className="text-[10px] font-bold uppercase tracking-[0.3em] opacity-50 mb-8">
                {isPrivateLobby ? "Private Room — Only accessible via code" : "Queuing — Visible in Global Lobby"}
              </p>
              <h2 className="text-2xl font-serif mb-4">Share this code or wait for someone to join:</h2>
              <div className="flex items-center justify-center gap-6 mb-8">
                <div className="text-6xl font-bold tracking-[0.2em] text-text-primary">{roomId}</div>
                <button 
                  onClick={copyRoomId}
                  className="w-12 h-12 bg-[#F0F0EE] rounded-full flex items-center justify-center hover:bg-[#E5E5E1] transition-colors"
                >
                  {copied ? <CheckIcon size={20} className="text-green-500" /> : <CopyIcon size={20} className="text-[#6A6A64]" />}
                </button>
              </div>
              <p className="text-sm italic opacity-60 mb-8">
                {isPrivateLobby ? "Share the room code with your opponent. It will not appear in the Global Lobby." : "Your room is live in the Global Lobby. Others can see and join it automatically."}
              </p>
              <button 
                onClick={() => { handleDisconnect(); }}
                className="text-xs font-bold uppercase tracking-widest text-[#9A9A96] hover:text-red-500 transition-colors"
              >
                Cancel
              </button>
            </div>
          </motion.div>
        )}

        {mode === 'join' && (
          <motion.div 
            initial={{ opacity: 0, scale: 0.95 }}
            animate={{ opacity: 1, scale: 1 }}
            className="flex flex-col items-center justify-center py-32 space-y-8"
          >
            <Loader2Icon size={48} className="text-accent-primary animate-spin" />
            <p className="text-[10px] font-bold uppercase tracking-[0.3em] animate-pulse">
              Connecting to room...
            </p>
            <button 
              onClick={() => { gameConn.current?.destroy(); setMode('menu'); }}
              className="text-xs font-bold uppercase tracking-widest text-[#9A9A96] hover:text-red-500 transition-colors mt-8"
            >
              Cancel
            </button>
          </motion.div>
        )}

        {mode === 'playing' && (
          <motion.div 
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            className="w-full h-full relative pb-12"
          >
            <button 
              onClick={() => {
                if(confirm('Are you sure you want to leave the game?')) {
                  handleDisconnect();
                }
              }}
              className="absolute -top-6 right-0 z-50 flex items-center gap-2 px-4 py-2 bg-black/5 hover:bg-red-50 hover:text-red-500 rounded-lg text-xs font-bold uppercase tracking-widest transition-colors"
            >
              <LogOutIcon size={14} /> Leave Game
            </button>
            
            {renderGame()}

            {connection && <GameChat connection={connection} myName={username} opponentName={opponentName} />}
          </motion.div>
        )}
      </AnimatePresence>

      {notification && createPortal(
        <div className="fixed top-6 left-1/2 -translate-x-1/2 z-[9999] bg-text-primary text-white px-6 py-3 rounded-full shadow-2xl flex items-center gap-3 animate-pulse">
          <span className="text-sm font-bold uppercase tracking-widest">{notification}</span>
        </div>,
        document.body
      )}
    </div>
  );
}
