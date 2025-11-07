import * as z from "zod";

export const KindSchema = z.enum([
	"debitCardTransaction",
	"internalTransfer",
	"other",
]);
export type Kind = z.infer<typeof KindSchema>;

export const TransactionStatusSchema = z.enum([
	"pending",
	"sent",
	"cancelled",
	"failed",
	"reversed",
	"blocked",
]);
export type TransactionStatus = z.infer<typeof TransactionStatusSchema>;

export const DebitCardInfoSchema = z.object({
	id: z.string(),
});
export type DebitCardInfo = z.infer<typeof DebitCardInfoSchema>;

export const MerchantSchema = z.object({
	categoryCode: z.string(),
	id: z.string(),
});
export type Merchant = z.infer<typeof MerchantSchema>;

export const DetailsSchema = z.object({
	debitCardInfo: DebitCardInfoSchema.optional(),
});
export type Details = z.infer<typeof DetailsSchema>;

export const TransactionSchema = z.object({
	id: z.string(),
	feeId: z.null(),
	amount: z.number(),
	createdAt: z.coerce.date(),
	postedAt: z.union([z.coerce.date(), z.null()]),
	estimatedDeliveryDate: z.coerce.date(),
	status: TransactionStatusSchema,
	note: z.null(),
	bankDescription: z.string(),
	externalMemo: z.union([z.null(), z.string()]),
	counterpartyId: z.string(),
	details: DetailsSchema,
	reasonForFailure: z.null(),
	failedAt: z.null(),
	dashboardLink: z.string(),
	counterpartyName: z.string(),
	counterpartyNickname: z.union([z.null(), z.string()]),
	kind: KindSchema,
	currencyExchangeInfo: z.null(),
	compliantWithReceiptPolicy: z.boolean(),
	hasGeneratedReceipt: z.boolean(),
	creditAccountPeriodId: z.null(),
	mercuryCategory: z.union([z.null(), z.string()]),
	generalLedgerCodeName: z.null(),
	attachments: z.array(z.any()),
	relatedTransactions: z.array(z.any()),
	categoryData: z.null(),
	checkNumber: z.null(),
	trackingNumber: z.union([z.null(), z.string()]),
	requestId: z.null(),
	accountId: z.string(),
	merchant: z.union([MerchantSchema, z.null()]),
});
export type Transaction = z.infer<typeof TransactionSchema>;

export const ListAccountTransactionsResponseSchema = z.object({
	total: z.number(),
	transactions: z.array(TransactionSchema),
});
export type ListAccountTransactionsResponse = z.infer<
	typeof ListAccountTransactionsResponseSchema
>;
