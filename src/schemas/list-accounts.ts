import * as z from "zod";

export const KindSchema = z.enum(["checking", "savings"]);
export type Kind = z.infer<typeof KindSchema>;

export const LegalBusinessNameSchema = z.enum(["Carter Himmel"]);
export type LegalBusinessName = z.infer<typeof LegalBusinessNameSchema>;

export const StatusSchema = z.enum(["active", "archived"]);
export type Status = z.infer<typeof StatusSchema>;

export const TypeSchema = z.enum(["mercury"]);
export type Type = z.infer<typeof TypeSchema>;

export const AccountSchema = z.object({
	id: z.string(),
	accountNumber: z.string().transform(() => "[REDACTED]"),
	routingNumber: z.string().transform(() => "[REDACTED]"),
	name: z.string(),
	status: StatusSchema,
	type: TypeSchema,
	createdAt: z.coerce.date(),
	availableBalance: z.number(),
	currentBalance: z.number(),
	kind: KindSchema,
	legalBusinessName: LegalBusinessNameSchema,
	dashboardLink: z.string(),
	nickname: z.string().optional(),
});
export type Account = z.infer<typeof AccountSchema>;

export const ListAccountsResponseSchema = z.object({
	accounts: z.array(AccountSchema),
});
export type ListAccountsResponse = z.infer<typeof ListAccountsResponseSchema>;
