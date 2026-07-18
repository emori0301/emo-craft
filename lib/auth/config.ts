import { betterAuth } from "better-auth";
import { prismaAdapter } from "better-auth/adapters/prisma";
import { env } from "@/env.mjs";
import { prisma } from "@/lib/prisma";

export const auth = betterAuth({
	baseURL: env.BETTER_AUTH_URL,
	secret: env.BETTER_AUTH_SECRET,
	trustedOrigins: [
		"http://localhost:3000",
		"http://127.0.0.1:3000",
		env.NEXT_PUBLIC_APP_URL,
	].filter(Boolean),
	database: prismaAdapter(prisma, {
		provider: "postgresql",
	}),
	emailAndPassword: {
		enabled: true,
		requireEmailVerification: false,
	},
	socialProviders:
		env.GOOGLE_CLIENT_ID && env.GOOGLE_CLIENT_SECRET
			? {
					google: {
						clientId: env.GOOGLE_CLIENT_ID,
						clientSecret: env.GOOGLE_CLIENT_SECRET,
					},
				}
			: {},
	account: {
		accountLinking: {
			enabled: true,
			trustedProviders: ["google"],
		},
	},
});

export type Session = typeof auth.$Infer.Session;
