import { StdioServerTransport } from "@modelcontextprotocol/sdk/server/stdio.js";
import Elysia, { status, t } from "elysia";
import { z } from "zod";
import { getAccountTransactions, listAccounts } from "./mercury";
import {
	TransactionSchema,
	TransactionStatusSchema,
} from "./schemas/list-account-transactions";
import { mcp } from "elysia-mcp";
import { AccountSchema } from "./schemas/list-accounts";
import { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { SSETransport } from "./transport";
import { JSONRPCMessageSchema } from "@modelcontextprotocol/sdk/types.js";

function createServer() {
	const server = new McpServer({
		name: "mercury-mcp-server",
		version: "0.1.0",
	});

	server.registerTool(
		"get_account_transactions",
		{
			description: "Get the transactions for a given Mercury account.",
			inputSchema: {
				accountId: z.string().uuid().describe("The ID of the Mercury account."),
				status: TransactionStatusSchema.describe(
					"The status of the transactions.",
				).optional(),
				startDate: z
					.string()
					.date()
					.describe("The start date of the transactions.")
					.optional(),
				endDate: z
					.string()
					.date()
					.describe("The end date of the transactions.")
					.optional(),
			},
			outputSchema: {
				transactions: z.array(TransactionSchema),
			},
		},
		async ({ accountId, startDate, endDate, status }) => {
			const transactions = await getAccountTransactions(accountId, {
				startDate,
				endDate,
				status,
			});
			return {
				content: [{ type: "text", text: JSON.stringify(transactions) }],
				structuredContent: transactions,
			};
		},
	);

	server.registerTool(
		"list_accounts",
		{
			description: "List all Mercury accounts.",
			inputSchema: {
				includeArchived: z
					.boolean()
					.default(false)
					.describe(
						"Include archived accounts in the list. By default, archived accounts are not included.",
					),
			},
			outputSchema: {
				accounts: z.array(AccountSchema),
			},
		},
		async ({ includeArchived }) => {
			const accounts = await listAccounts(includeArchived);

			return {
				content: [{ type: "text", text: JSON.stringify(accounts) }],
				structuredContent: accounts,
			};
		},
	);

	return server;
}

async function runStdio() {
	const transport = new StdioServerTransport();
	const server = createServer();
	await server.connect(transport);

	console.error("Mercury MCP server running on stdio");
}

async function runHttp() {
	const requireAuthentication = new Elysia()
		.guard({
			headers: t.Object({
				authorization: t.String(),
			}),
		})
		.derive(async function handler({ headers }) {
			const bearer = headers.authorization.split(" ")[1];

			if (bearer !== process.env.MCP_API_KEY) {
				return status(401, {
					message: "Unauthorized",
				});
			}
		});

	const transports = new Map<string, SSETransport>();
	const server = createServer();

	new Elysia()
		.get("/healthz", () => status(200, { message: "OK" }))
		.use(requireAuthentication)
		.use(
			mcp({
				enableLogging: true,
				enableJsonResponse: true,
				mcpServer: server,
			}),
		)
		.get("/sse", async function* ({ set }) {
			// console.log("SSE connection requested");
			
			try {
			  set.headers['content-type'] = 'text/event-stream';
			  set.headers['cache-control'] = 'no-cache';
			  set.headers['connection'] = 'keep-alive';
			  
			  try {
				const transport = new SSETransport("/messages");
				transports.set(transport.sessionId, transport);
				
				await server.connect(transport);
				
				return new Response(transport.stream);
			  } catch (error) {
				const transportError = error as Error;
				console.error("Transport/connection error:", transportError);
				console.error(transportError.stack);
				
				return new Response(JSON.stringify({ 
				  error: "Transport error", 
				  message: transportError.message,
				  stack: transportError.stack
				}), {
				  status: 500,
				  headers: { 'content-type': 'application/json' }
				});
			  }
			} catch (error) {
			  const outerError = error as Error;
			  console.error("Outer error in SSE handler:", outerError);
			  console.error(outerError.stack);
			  
			  return new Response(JSON.stringify({ 
				error: "Server error", 
				message: outerError.message,
				stack: outerError.stack
			  }), {
				status: 500,
				headers: { 'content-type': 'application/json' }
			  });
			}
		  })
		// Handle messages
		.post("/messages", async ({ body, query: { sessionId }}) => {
		  try {
			const transport = transports.get(sessionId);
			if (!transport) {
			  return new Response(JSON.stringify({ error: "Invalid or missing session ID" }), {
				status: 400,
				headers: { 'Content-Type': 'application/json' }
			  });
			}
			
			return transport.handlePostMessage(body);
		  } catch (error) {
			console.error("Error handling message:", error);
			return new Response(JSON.stringify({ error: "Internal server error" }), {
			  status: 500,
			  headers: { 'Content-Type': 'application/json' }
			});
		  }
		}, {
			query: t.Object({
				sessionId: t.String(),
			}),
			body: JSONRPCMessageSchema
		})
		.listen(
			{
				port: process.env.PORT ?? 9236,
				idleTimeout: 255,
			},
			(server) =>
				console.info(`Server is running on ${server.hostname}:${server.port}`),
		);
}

// detect if we're running in stdio mode (docker run -i) or http mode
const isStdio = !process.stdin.isTTY && !process.env.FORCE_HTTP;

if (isStdio) {
	runStdio();
} else {
	runHttp();
}
