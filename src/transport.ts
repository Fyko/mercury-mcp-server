// https://github.com/keithagroves/Elysia-mcp/blob/main/src/SSEElysiaTransport.ts
import type { Transport } from "@modelcontextprotocol/sdk/shared/transport.js";
import {
	JSONRPCMessageSchema,
	type JSONRPCMessage,
} from "@modelcontextprotocol/sdk/types.js";

export class SSETransport implements Transport {
	readonly #sessionId = Bun.randomUUIDv7();
	readonly #encoder = new TextEncoder();
	readonly #endpoint: string;
	#connected = false;
	#controller!: ReadableStreamDefaultController<Uint8Array>;

	readonly stream: ReadableStream<Uint8Array>;

	onclose?: () => void;
	onerror?: (error: Error) => void;
	onmessage?: (message: JSONRPCMessage) => void;

	constructor(endpoint: string) {
		this.#endpoint = endpoint;
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

			this.#sendEvent(
				"endpoint",
				`${encodeURI(this.#endpoint)}?sessionId=${this.#sessionId}`,
			);
		} catch (error) {
			this.#connected = false;
			this.#logError("error starting transport", error);
			this.#handleError(error);
			throw error;
		}
	}

	#sendEvent(event: string, data: string): void {
		if (!this.#connected) {
			this.#logError("cannot send event, not connected");
			return;
		}

		try {
			this.#controller.enqueue(
				this.#encoder.encode(`event: ${event}\ndata: ${data}\n\n`),
			);
		} catch (error) {
			this.#connected = false;
			this.#logError("error sending event", error);
			this.#handleError(error);
		}
	}

	async handlePostMessage(body: JSONRPCMessage): Promise<Response> {
		if (!this.#connected) {
			this.#logError("not connected");
			return new Response(
				JSON.stringify({ error: "sse connection not established" }),
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
			this.#logError("error handling message", error);
			return new Response(JSON.stringify({ error: String(error) }), {
				status: 400,
				headers: { "content-type": "application/json" },
			});
		}
	}

	async handleMessage(message: JSONRPCMessage): Promise<void> {
		try {
			const parsedMessage = JSONRPCMessageSchema.parse(message);
			this.onmessage?.(parsedMessage);
		} catch (error) {
			this.#logError("invalid message format", error);
			this.#handleError(error);
			throw error;
		}
	}

	async close(): Promise<void> {
		this.#connected = false;
		this.onclose?.();
	}

	async [Symbol.asyncDispose](): Promise<void> {
		await this.close();
	}

	async send(message: JSONRPCMessage): Promise<void> {
		if (!this.#connected) {
			const error = new Error("not connected");
			this.#logError(error.message);
			throw error;
		}

		this.#sendEvent("message", JSON.stringify(message));
	}

	get sessionId(): string {
		return this.#sessionId;
	}

	#logError(message: string, error?: unknown): void {
		const prefix = `[transport:${this.#sessionId}]`;
		if (error) {
			console.error(prefix, message, error);
		} else {
			console.error(prefix, message);
		}
	}

	#handleError(error: unknown): void {
		this.onerror?.(error instanceof Error ? error : new Error(String(error)));
	}
}
