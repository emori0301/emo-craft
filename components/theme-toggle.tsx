"use client";

import { Moon, Sun } from "lucide-react";
import { useTheme } from "next-themes";
import { useEffect, useState } from "react";
import { Button } from "@/components/ui/button";

export function ThemeToggle() {
	const { resolvedTheme, setTheme } = useTheme();
	// SSR とのハイドレーション不一致を避けるためマウント後に描画する
	const [mounted, setMounted] = useState(false);
	useEffect(() => setMounted(true), []);

	if (!mounted) {
		return <Button variant="ghost" size="sm" className="px-2 w-9" disabled />;
	}

	const isDark = resolvedTheme === "dark";
	return (
		<Button
			variant="ghost"
			size="sm"
			className="px-2"
			aria-label={isDark ? "ライトモードに切り替え" : "ダークモードに切り替え"}
			onClick={() => setTheme(isDark ? "light" : "dark")}
		>
			{isDark ? <Sun className="h-5 w-5" /> : <Moon className="h-5 w-5" />}
		</Button>
	);
}
