import { QueryClient } from '@tanstack/react-query';


export const queryClientInstance = new QueryClient({
	defaultOptions: {
		queries: {
			refetchOnWindowFocus: false,
			retry: 1,
			staleTime: 2 * 60 * 1000,   // data stays fresh for 2 minutes — no re-fetch on nav
			gcTime: 10 * 60 * 1000,      // keep in memory for 10 minutes
		},
	},
});