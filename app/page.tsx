import Link from "next/link";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { PublicEmojis } from "@/components/home/public-emojis";

export default function Home() {
  return (
    <div className="container py-8 px-4">
      <section className="flex flex-col items-center justify-center space-y-6 py-16 sm:py-24">
        <div className="space-y-4 text-center max-w-2xl">
          <h1 className="text-4xl font-bold tracking-tight sm:text-5xl md:text-6xl">
            <span className="bg-gradient-to-r from-purple-600 via-pink-600 to-orange-500 bg-clip-text text-transparent">
              emoCraft
            </span>
          </h1>
          <p className="mx-auto text-base text-muted-foreground sm:text-lg md:text-xl">
            テキストやピクセルアートでカスタム絵文字を作成
          </p>
        </div>
        <div className="flex flex-col sm:flex-row gap-4">
          <Link href="/editor">
            <Button size="lg" className="text-base sm:text-lg px-8 py-6">
              はじめる
            </Button>
          </Link>
        </div>

        <PublicEmojis />
      </section>

      <section className="py-12 sm:py-16">
        <h2 className="text-2xl sm:text-3xl font-bold text-center mb-8 sm:mb-12">
          機能
        </h2>
        <div className="grid gap-6 sm:grid-cols-2 lg:grid-cols-3">
          <Card className="hover:shadow-lg transition-shadow">
            <CardHeader>
              <CardTitle className="text-xl">テキストエディタ</CardTitle>
              <CardDescription>
                フォントや色をカスタムしてテキストから絵文字を作成
              </CardDescription>
            </CardHeader>
          </Card>

          <Card className="hover:shadow-lg transition-shadow">
            <CardHeader>
              <CardTitle className="text-xl">ピクセルエディタ</CardTitle>
              <CardDescription>
                ピクセルアートを一から描いて絵文字を作成
              </CardDescription>
            </CardHeader>
          </Card>

          <Card className="hover:shadow-lg transition-shadow sm:col-span-2 lg:col-span-1">
            <CardHeader>
              <CardTitle className="text-xl">保存・管理</CardTitle>
              <CardDescription>
                作った絵文字を保存して管理
              </CardDescription>
            </CardHeader>
          </Card>
        </div>
      </section>
    </div>
  );
}
