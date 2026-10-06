import { useCallback } from "react";
import { API_BASE_URL } from "@/libs/constants";
import { ApiError, NetworkError } from "@/libs/errors";

interface QRCodeErrorResponse {
	detail?: string;
}

export function useQR() {
	const generateQr = useCallback(async (value: string, boxSize: number): Promise<string> => {
		const trimmed = value.trim();
		const url = new URL(trimmed.startsWith("http") ? trimmed : `https://${trimmed}`);

		let response: Response;
		try {
			response = await fetch(`${API_BASE_URL}/qr`, {
				method: "POST",
				headers: {
					"Content-Type": "application/json",
					Accept: "image/png",
				},
				credentials: "include",
				body: JSON.stringify({
					url: url.href,
					box_size: boxSize,
				}),
			});
		} catch {
			throw new NetworkError("Unable to connect to the server — the API appears to be down.");
		}

		if (!response.ok) {
			if (response.status === 502 || response.status === 503 || response.status === 504) {
				throw new NetworkError("Unable to connect to the server — the API appears to be down.");
			}

			let message = "Failed to generate QR code";
			try {
				const body = (await response.json()) as QRCodeErrorResponse;
				if (body.detail) message = body.detail;
			} catch {
				message = response.statusText || `Server error (${response.status})`;
			}
			throw new ApiError(response.status, message);
		}

		const contentType = response.headers.get("content-type") ?? "";
		if (!contentType.startsWith("image/png")) {
			throw new Error("The server returned an invalid QR image");
		}

		return URL.createObjectURL(await response.blob());
	}, []);

	return { generateQr };
}
