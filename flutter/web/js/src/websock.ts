import * as message from "./message.js";
import * as rendezvous from "./rendezvous.js";
import * as globals from "./globals";

type Keys = "message" | "open" | "close" | "error";

export default class Websock {
  _websocket: WebSocket;
  _eventHandlers: { [key in Keys]: Function };
  _buf: (rendezvous.RendezvousMessage | message.Message)[];
  _status: any;
  _latency: number;
  _secretKey: [Uint8Array, number, number] | undefined;
  _uri: string;
  _isRendezvous: boolean;
  _pendingResolve: ((value: rendezvous.RendezvousMessage | message.Message) => void) | undefined;
  _pendingReject: ((reason: any) => void) | undefined;
  _pendingTimer: any;

  constructor(uri: string, isRendezvous: boolean = true) {
    this._eventHandlers = {
      message: (_: any) => {},
      open: () => {},
      close: () => {},
      error: () => {},
    };
    this._uri = uri;
    this._status = "";
    this._buf = [];
    this._websocket = new WebSocket(uri);
    this._websocket.onmessage = this._recv_message.bind(this);
    this._websocket.binaryType = "arraybuffer";
    this._latency = new Date().getTime();
    this._isRendezvous = isRendezvous;
  }

  latency(): number {
    return this._latency;
  }

  setSecretKey(key: Uint8Array) {
    this._secretKey = [key, 0, 0];
  }

  sendMessage(json: message.DeepPartial<message.Message>) {
    let data = message.Message.encode(
      message.Message.fromPartial(json)
    ).finish();
    let k = this._secretKey;
    if (k) {
      k[1] += 1;
      data = globals.encrypt(data, k[1], k[0]);
    }
    this._websocket.send(data);
  }

  sendRendezvous(data: rendezvous.DeepPartial<rendezvous.RendezvousMessage>) {
    this._websocket.send(
      rendezvous.RendezvousMessage.encode(
        rendezvous.RendezvousMessage.fromPartial(data)
      ).finish()
    );
  }

  parseMessage(data: Uint8Array) {
    return message.Message.decode(data);
  }

  parseRendezvous(data: Uint8Array) {
    return rendezvous.RendezvousMessage.decode(data);
  }

  // Event Handlers
  off(evt: Keys) {
    this._eventHandlers[evt] = () => {};
  }

  on(evt: Keys, handler: Function) {
    this._eventHandlers[evt] = handler;
  }

  async open(timeout: number = 12000): Promise<Websock> {
    return new Promise((resolve, reject) => {
      setTimeout(() => {
        if (this._status != "open") {
          reject(this._status || "Timeout");
        }
      }, timeout);
      this._websocket.onopen = () => {
        this._latency = new Date().getTime() - this._latency;
        this._status = "open";
        console.debug(">> WebSock.onopen");
        if (this._websocket?.protocol) {
          console.info(
            "Server choose sub-protocol: " + this._websocket.protocol
          );
        }

        this._eventHandlers.open();
        console.info("WebSock.onopen");
        resolve(this);
      };
      this._websocket.onclose = (e) => {
        if (this._status == "open") {
          // e.code 1000 means that the connection was closed normally.
          //
        }
        this._status = e;
        console.error("WebSock.onclose: ");
        console.error(e);
        this._settlePending(undefined, "Reset by the peer");
        this._eventHandlers.close(e);
        reject("Reset by the peer");
      };
      this._websocket.onerror = (e: any) => {
        if (!this._status) {
          reject("Failed to connect to " + (this._isRendezvous ? "rendezvous" : "relay") + " server");
          return;
        }
        this._status = e;
        console.error("WebSock.onerror: ")
        console.error(e);
        this._settlePending(undefined, e);
        this._eventHandlers.error(e);
      };
    });
  }

  async next(
    timeout = 12000
  ): Promise<rendezvous.RendezvousMessage | message.Message> {
    if (this._buf.length) {
      return this._buf.shift()!;
    }
    if (this._status != "open") {
      throw this._status;
    }
    return new Promise((resolve, reject) => {
      this._pendingResolve = resolve;
      this._pendingReject = reject;
      this._pendingTimer = setTimeout(() => {
        this._settlePending(undefined, "Timeout");
      }, timeout);
    });
  }

  _settlePending(
    value?: rendezvous.RendezvousMessage | message.Message,
    reason?: any
  ) {
    const resolve = this._pendingResolve;
    const reject = this._pendingReject;
    clearTimeout(this._pendingTimer);
    this._pendingResolve = undefined;
    this._pendingReject = undefined;
    this._pendingTimer = undefined;
    if (value !== undefined && resolve) {
      resolve(value);
    } else if (reason !== undefined && reject) {
      reject(reason);
    }
  }

  close() {
    this._status = "";
    this._settlePending(undefined, "Connection closed");
    if (this._websocket) {
      if (
        this._websocket.readyState === WebSocket.OPEN ||
        this._websocket.readyState === WebSocket.CONNECTING
      ) {
        console.info("Closing WebSocket connection");
        this._websocket.close();
      }

      this._websocket.onmessage = () => {};
    }
  }

  _recv_message(e: any) {
    if (e.data instanceof window.ArrayBuffer) {
      let bytes = new Uint8Array(e.data);
      const k = this._secretKey;
      if (k) {
        k[2] += 1;
        bytes = globals.decrypt(bytes, k[2], k[0]);
      }
      const msg = this._isRendezvous
        ? this.parseRendezvous(bytes)
        : this.parseMessage(bytes);
      if (this._pendingResolve) {
        this._settlePending(msg);
      } else {
        this._buf.push(msg);
      }
    }
    this._eventHandlers.message(e.data);
  }
}
