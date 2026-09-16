"use client";

import dynamic from "next/dynamic";

const DotLottieReact = dynamic(
	() => import("@lottiefiles/dotlottie-react").then((mod) => mod.DotLottieReact),
	{ ssr: false },
);

export default function Loading() {
	return (
		<main className="min-h-screen flex items-center justify-center p-6">
			<div className="text-center flex flex-col items-center">
				<div className="w-40 h-40 mb-4 flex items-center justify-center">
					<DotLottieReact src="/animations/loading.lottie" loop autoplay />
				</div>
				<p className="text">Loading URL Magic...</p>
			</div>
		</main>
	);
}
