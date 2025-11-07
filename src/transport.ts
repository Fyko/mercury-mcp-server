// https://github.com/keithagroves/Elysia-mcp/blob/main/src/SSEElysiaTransport.ts
import type { Transport } from "@modelcontextprotocol/sdk/shared/transport.js";
import {
	JSONRPCMessageSchema,
	type JSONRPCMessage,
} from "@modelcontextprotocol/sdk/types.js";

export class SSETransport implements Transport {
	#sessionId: string = Bun.randomUUIDv7();
	#connected = false;
	#encoder = new TextEncoder();
	readonly stream: ReadableStream<Uint8Array>
	#controller!: ReadableStreamDefaultController<Uint8Array>;

	onclose?: () => void;
	onerror?: (error: Error) => void;
	onmessage?: (message: JSONRPCMessage) => void;

	constructor(
		private _endpoint: string,
	) {
		this.stream = new ReadableStream({
			start: (controller) => {
				this.#controller = controller;
			},
			cancel: () => this.onclose?.() ?? Promise.resolve(),
		});
	}

	async start(): Promise<void> {
		if (this.#connected) return;

		try {
			this.#connected = true;

			this._sendEvent(
				"endpoint",
				`${encodeURI(this._endpoint)}?sessionId=${this.#sessionId}`,
			);
		} catch (error) {
			console.error(
				`[Transport:${this.#sessionId}] Error starting transport:`,
				error,
			);
			this.#connected = false;
			this.onerror?.(error instanceof Error ? error : new Error(String(error)));
			throw error;
		}
	}

	private _sendEvent(event: string, data: string): void {
		if (!this.#connected) {
			console.error(
				`[Transport:${this.#sessionId}] Cannot send event, not connected`,
			);
			return;
		}

		try {
			this.#controller.enqueue(
				this.#encoder.encode(`event: ${event}\ndata: ${data}\n\n`),
			);
		} catch (error) {
			console.error(
				`[Transport:${this.#sessionId}] Error sending event:`,
				error,
			);
			this.#connected = false;
			this.onerror?.(error instanceof Error ? error : new Error(String(error)));
		}
	}

	async handlePostMessage(body: JSONRPCMessage): Promise<Response> {
		if (!this.#connected) {
			console.error(`[Transport:${this.#sessionId}] Not connected`);
			return new Response(
				JSON.stringify({ error: "SSE connection not established" }),
				{
					status: 500,
					headers: { "content-type": "application/json" },
				},
			);
		}

		try {
			this.onmessage?.(body);

			return new Response(JSON.stringify({ success: true }), {
				status: 202,
				headers: { "content-type": "application/json" },
			});
		} catch (error) {
			console.error(
				`[Transport:${this.#sessionId}] Error handling message:`,
				error,
			);
			return new Response(JSON.stringify({ error: String(error) }), {
				status: 400,
				headers: { "content-type": "application/json" },
			});
		}
	}

	async handleMessage(message: JSONRPCMessage): Promise<void> {
		let parsedMessage: JSONRPCMessage;
		try {
			parsedMessage = JSONRPCMessageSchema.parse(message);
		} catch (error) {
			console.error(
				`[Transport:${this.#sessionId}] Invalid message format:`,
				error,
			);
			this.onerror?.(error instanceof Error ? error : new Error(String(error)));
			throw error;
		}

		this.onmessage?.(parsedMessage);
	}

	async close(): Promise<void> {
		this.#connected = false;
		this.onclose?.();
	}

	async send(message: JSONRPCMessage): Promise<void> {
		if (!this.#connected) {
			console.error(`[Transport:${this.#sessionId}] Not connected`);
			throw new Error("Not connected");
		}

		this._sendEvent("message", JSON.stringify(message));
	}

	get sessionId(): string {
		return this.#sessionId;
	}
}
