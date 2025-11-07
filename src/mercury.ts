import {
	ListAccountTransactionsResponseSchema,
	type TransactionStatus,
} from "./schemas/list-account-transactions";
import { ListAccountsResponseSchema } from "./schemas/list-accounts";

export async function listAccounts(includeArchived: boolean = false) {
	const response = await fetch("https://api.mercury.com/api/v1/accounts", {
		headers: {
			Authorization: `Bearer ${process.env.MERCURY_API_KEY}`,
		},
	});
	const unvalidated = await response.json();
	const validated = ListAccountsResponseSchema.parse(unvalidated);

	if (!includeArchived) {
		validated.accounts = validated.accounts.filter(
			(account) => account.status !== "archived",
		);
	}

	return validated;
}

export async function getAccountTransactions(
	accountId: string,
	{
		startDate,
		endDate,
		status,
	}: { startDate?: string; endDate?: string; status?: TransactionStatus },
) {
	const url = new URL(
		`https://api.mercury.com/api/v1/account/${accountId}/transactions`,
	);
	if (startDate) {
		url.searchParams.set("startDate", startDate);
	}
	if (endDate) {
		url.searchParams.set("endDate", endDate);
	}
	if (status) {
		url.searchParams.set("status", status);
	}

	const response = await fetch(url.toString(), {
		headers: {
			Authorization: `Bearer ${process.env.MERCURY_API_KEY}`,
		},
	});
	const unvalidated = await response.json();
	const validated = ListAccountTransactionsResponseSchema.parse(unvalidated);

	return validated;
}
