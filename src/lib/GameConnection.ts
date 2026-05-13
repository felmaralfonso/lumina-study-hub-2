import mqtt, { MqttClient } from 'mqtt';

type DataHandler = (data: any) => void;
type DisconnectHandler = () => void;

/**
 * A lightweight wrapper around MQTT pub/sub that mimics
 * a simple bidirectional connection (like PeerJS DataConnection).
 *
 * Uses a free public MQTT broker over WebSocket so it works
 * on GitHub Pages with zero backend. Each "room" is just a
 * pair of MQTT topics.
 */
export class GameConnection {
  private client: MqttClient;
  private sendTopic: string;
  private recvTopic: string;
  private handlers: DataHandler[] = [];
  private disconnectHandlers: DisconnectHandler[] = [];
  private _ready = false;
  private _onReady: (() => void)[] = [];
  private heartbeatInterval: any;
  private checkInterval: any;
  private lastSeen: number = 0;
  private destroyed = false;
  private _opponentConnected = false;
  private messageHandler: (topic: string, message: Buffer) => void;
  private beforeUnloadHandler: () => void;

  constructor(client: MqttClient, roomId: string, isHost: boolean) {
    this.client = client;

    // Host publishes on /h and subscribes to /j
    // Joiner publishes on /j and subscribes to /h
    const base = `lumina/game/${roomId}`;
    this.sendTopic = isHost ? `${base}/h` : `${base}/j`;
    this.recvTopic = isHost ? `${base}/j` : `${base}/h`;

    this.client.subscribe(this.recvTopic, { qos: 0 }, (err) => {
      if (!err) {
        this._ready = true;
        this._onReady.forEach(fn => fn());
        this._onReady = [];
      }
    });

    // Store reference so we can remove it on destroy
    this.messageHandler = (topic: string, message: Buffer) => {
      if (topic !== this.recvTopic || this.destroyed) return;
      this._opponentConnected = true;
      this.lastSeen = Date.now();
      try {
        const data = JSON.parse(message.toString());
        if (data.type === 'PING') return; // heartbeat only, don't forward
        if (data.type === 'LEAVE') {
          this.fireDisconnect();
          return;
        }
        this.handlers.forEach(h => h(data));
      } catch {
        // ignore malformed
      }
    };
    this.client.on('message', this.messageHandler);

    this.beforeUnloadHandler = () => {
      // Fire-and-forget LEAVE on tab close
      if (!this.destroyed) {
        try { this.client.publish(this.sendTopic, JSON.stringify({ type: 'LEAVE' }), { qos: 0 }); } catch {}
      }
    };
    window.addEventListener('beforeunload', this.beforeUnloadHandler);

    // Heartbeat every 5s
    this.heartbeatInterval = setInterval(() => {
      if (!this.destroyed) this.send({ type: 'PING' });
    }, 5000);

    // Check for timeout every 5s, but only fire after 45s of silence
    // and ONLY once the opponent has actually connected
    this.checkInterval = setInterval(() => {
      if (this._opponentConnected && !this.destroyed && Date.now() - this.lastSeen > 45000) {
        this.fireDisconnect();
      }
    }, 5000);
  }

  private fireDisconnect() {
    if (this.destroyed) return;
    this.destroyed = true; // prevent double-fire
    clearInterval(this.heartbeatInterval);
    clearInterval(this.checkInterval);
    this.disconnectHandlers.forEach(h => h());
    this.cleanup();
  }

  /** Register a handler */
  on(event: 'data' | 'disconnect', handler: Function) {
    if (event === 'data') this.handlers.push(handler as DataHandler);
    if (event === 'disconnect') this.disconnectHandlers.push(handler as DisconnectHandler);
  }

  /** Unregister a specific handler */
  off(event: 'data' | 'disconnect', handler: Function) {
    if (event === 'data') this.handlers = this.handlers.filter(h => h !== handler);
    if (event === 'disconnect') this.disconnectHandlers = this.disconnectHandlers.filter(h => h !== handler);
  }

  /** Remove all data handlers */
  removeAllListeners(event?: string) {
    if (!event || event === 'data') this.handlers = [];
    if (!event || event === 'disconnect') this.disconnectHandlers = [];
  }

  /** Send data to the other player */
  send(data: any) {
    if (!this.client.connected || this.destroyed) return;
    this.client.publish(this.sendTopic, JSON.stringify(data), { qos: 0 });
  }

  /** Wait until the subscription is confirmed */
  onReady(fn: () => void) {
    if (this._ready) fn();
    else this._onReady.push(fn);
  }

  private cleanup() {
    window.removeEventListener('beforeunload', this.beforeUnloadHandler);
    this.client.removeListener('message', this.messageHandler);
    this.client.unsubscribe(this.recvTopic);
    this.handlers = [];
    this.disconnectHandlers = [];
  }

  /** Clean up subscriptions — called when YOU leave */
  destroy() {
    if (this.destroyed) return;
    // Send LEAVE BEFORE setting destroyed flag, otherwise send() short-circuits
    this.client.publish(this.sendTopic, JSON.stringify({ type: 'LEAVE' }), { qos: 0 });
    this.destroyed = true;
    clearInterval(this.heartbeatInterval);
    clearInterval(this.checkInterval);
    this.cleanup();
  }
}
