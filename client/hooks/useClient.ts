"use client";

import { useEffect, useState } from "react";
import { API_BASE_URL, GUEST_FLAG_COOKIE } from "@/libs/constants";

interface ClientState {
	ready: boolean;
	error: Error | null;
}

function hasGuestSession(): boolean {
	return document.cookie
		.split(";")
		.some((cookie) => cookie.trim() === `${GUEST_FLAG_COOKIE}=true`);
}

export function useClient(): ClientState {
	const [state, setState] = useState<ClientState>({ ready: false, error: null });

	useEffect(() => {
		let active = true;

		async function initializeSession() {
			if (hasGuestSession()) {
				if (active) setState({ ready: true, error: null });
				return;
			}

			try {
				const response = await fetch(`${API_BASE_URL}/session/guest`, {
					credentials: "include",
				});

				if (!response.ok) {
					const error = new Error(
						response.status >= 500
							? "The server returned an internal error."
							: "Unable to initialize your guest session.",
					);
					(error as Error & { status?: number }).status = response.status;
					throw error;
				}

				if (active) setState({ ready: true, error: null });
			} catch (error) {
				if (active) {
					setState({
						ready: false,
						error: error instanceof Error ? error : new Error("Unable to reach the server."),
					});
				}
			}
		}

		void initializeSession();
		return () => {
			active = false;
		};
	}, []);

	return state;
}
