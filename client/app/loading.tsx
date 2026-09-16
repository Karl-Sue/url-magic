"use client";

import dynamic from "next/dynamic";

const DotLottieReact = dynamic(
	() => import("@lottiefiles/dotlottie-react").then((mod) => mod.DotLottieReact),
	{ ssr: false },
);

export default function Loading() {
	return (
		<main style={{ minHeight: "100vh", display: "flex", flexDirection: "column", background: "#ffffff" }}>
			<header className="page-top wordmark">
				<h1 className="heading">Url Magic</h1>
				<span className="tagline">less url, more life</span>
			</header>

			<section style={{ flex: 1, display: "flex", alignItems: "center", justifyContent: "center", padding: "48px 24px" }}>
				<div style={{ width: "min(100%, 420px)", textAlign: "center" }}>
					<div style={{ borderTop: "1px solid #111111", borderBottom: "1px solid #e8e8e8", padding: "38px 24px 32px" }}>
						<div style={{ width: "168px", height: "168px", margin: "0 auto 24px", display: "flex", alignItems: "center", justifyContent: "center" }}>
							<DotLottieReact src="/animations/loading.lottie" loop autoplay />
						</div>
						<p className="heading" style={{ fontSize: "20px" }}>Getting things ready</p>
						<p className="subtext" style={{ marginTop: "8px" }}>A moment while we connect the pieces.</p>
					</div>

					<div style={{ display: "flex", alignItems: "center", gap: "12px", marginTop: "18px", textAlign: "left" }}>
						<span aria-hidden="true" style={{ width: "7px", height: "7px", background: "#111111", flexShrink: 0 }} />
						<span className="tagline">connecting to url magic</span>
					</div>
				</div>
			</section>
		</main>
	);
}
