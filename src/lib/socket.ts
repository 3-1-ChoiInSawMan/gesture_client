const WS_URL = "wss://appointments-calculators-exclusively-energy.trycloudflare.com/cc";

type MessageHandler = (data: unknown) => void;
type StatusHandler = (connected: boolean) => void;

class SocketManager {
  private ws: WebSocket | null = null;
  private messageHandlers: Set<MessageHandler> = new Set();
  private statusHandlers: Set<StatusHandler> = new Set();
  private reconnectTimer: ReturnType<typeof setTimeout> | null = null;
  private shouldConnect = false;

  connect() {
    this.shouldConnect = true;
    this._open();
  }

  disconnect() {
    this.shouldConnect = false;
    if (this.reconnectTimer) {
      clearTimeout(this.reconnectTimer);
      this.reconnectTimer = null;
    }
    this.ws?.close();
    this.ws = null;
  }

  private _open() {
    if (
      this.ws &&
      (this.ws.readyState === WebSocket.CONNECTING ||
        this.ws.readyState === WebSocket.OPEN)
    )
      return;

    this.ws = new WebSocket(WS_URL);

    this.ws.onopen = () => {
      console.log("[Socket] Connected");
      this.statusHandlers.forEach((h) => h(true));
    };

    this.ws.onmessage = (e) => {
      console.log("[Socket] Received:", e.data);
      try {
        const data = JSON.parse(e.data);
        this.messageHandlers.forEach((h) => h(data));
      } catch {
        this.messageHandlers.forEach((h) => h(e.data));
      }
    };

    this.ws.onclose = () => {
      console.log("[Socket] Disconnected");
      this.statusHandlers.forEach((h) => h(false));
      if (this.shouldConnect) {
        this.reconnectTimer = setTimeout(() => this._open(), 3000);
      }
    };

    this.ws.onerror = (e) => {
      console.error("[Socket] Error:", e);
    };
  }

  send(data: object): boolean {
    if (this.ws?.readyState === WebSocket.OPEN) {
      this.ws.send(JSON.stringify(data));
      return true;
    }
    console.warn("[Socket] Cannot send — not connected");
    return false;
  }

  onMessage(handler: MessageHandler) {
    this.messageHandlers.add(handler);
    return () => this.messageHandlers.delete(handler);
  }

  onStatus(handler: StatusHandler) {
    this.statusHandlers.add(handler);
    return () => this.statusHandlers.delete(handler);
  }

  get isConnected() {
    return this.ws?.readyState === WebSocket.OPEN;
  }
}

export const chatSocket = new SocketManager();
