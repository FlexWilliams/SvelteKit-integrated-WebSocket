import type { IncomingMessage } from 'http';
import { nanoid } from 'nanoid';
import type { Duplex } from 'stream';
import { parse } from 'url';
import type { Server, WebSocket as WebSocketBase } from 'ws';
import { WebSocketServer } from 'ws';

export const GlobalThisWSS = Symbol.for('sveltekit.wss');

export interface ExtendedWebSocket extends WebSocketBase {
	socketId: string;
	// userId: string;
}

// You can define server-wide functions or class instances here
// export interface ExtendedServer extends Server<ExtendedWebSocket> {};

export type ExtendedWebSocketServer = Server<ExtendedWebSocket>;

export type ExtendedGlobal = typeof globalThis & {
	[GlobalThisWSS]: ExtendedWebSocketServer;
};

export const onHttpServerUpgrade = (req: IncomingMessage, sock: Duplex, head: Buffer) => {
	// TODO: upgrade to URL(req.url) when the URL API can support relative urls
	// See: https://github.com/nodejs/node/issues/12682
	const pathname = req.url ? parse(req.url).pathname : null;
	if (pathname !== '/websocket') return;

	const wss = (globalThis as ExtendedGlobal)[GlobalThisWSS];

	wss.handleUpgrade(req, sock, head, (ws) => {
		console.log('[handleUpgrade] creating new connecttion');
		wss.emit('connection', ws, req);
	});
};

export const createWSSGlobalInstance = () => {
	const wss = new WebSocketServer({ noServer: true }) as ExtendedWebSocketServer;

	(globalThis as ExtendedGlobal)[GlobalThisWSS] = wss;

	wss.on('connection', (ws) => {
		ws.socketId = nanoid();
		console.log(`[wss:global] client connected (${ws.socketId})`);

		ws.on('close', () => {
			console.log(`[wss:global] client disconnected (${ws.socketId})`);
		});
	});

	return wss;
};
