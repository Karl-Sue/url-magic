import { useCallback } from "react";
import { API_BASE_URL } from "@/libs/constants";

interface QRCodeErrorResponse {
	detail?: string;
}

export function useQR() {
	const generateQr = useCallback(async (value: string, boxSize: number): Promise<string> => {
		const trimmed = value.trim();
		const url = new URL(trimmed.startsWith("http") ? trimmed : `https://${trimmed}`);
		const response = await fetch(`${API_BASE_URL}/qr`, {
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

		if (!response.ok) {
			let message = "Failed to generate QR code";
			try {
				const body = (await response.json()) as QRCodeErrorResponse;
				if (body.detail) message = body.detail;
			} catch {
				// The server may return an empty or non-JSON error response.
			}
			throw new Error(message);
		}

		const contentType = response.headers.get("content-type") ?? "";
		if (!contentType.startsWith("image/png")) {
			throw new Error("The server returned an invalid QR image");
		}

		return URL.createObjectURL(await response.blob());
	}, []);

	return { generateQr };
}
