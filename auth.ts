import NextAuth from 'next-auth';
import { authConfig } from './auth.config';
import Credentials from 'next-auth/providers/credentials';
import { z } from 'zod';
import email from 'next-auth/providers/email';
import { sql } from '@vercel/postgres';
import type { User } from '@/app/lib/definitions';
import bcrypt from 'bcrypt';
import { log } from 'console';


async function getUser(email: string): Promise<User | undefined> {
    try {
        const user = await sql<User>`SELECT * FROM users Where email = ${email}`;
        return user.rows[0];
    } catch (error) {
        console.error("Failed fetch user " + error);
        throw new Error("Failed fetch user");
    }

}


export const { auth, signIn, signOut } = NextAuth({
    ...authConfig,
    providers: [
        Credentials({
            async authorize(credentials: Partial<Record<string, unknown>>, req: Request): Promise<User | null> {
                try {
                log("\nCRERRRRRRRRRRR\n"+credentials.email+"\n"+credentials.password+"\n")
                const parsedCredentials = z
                    .object(
                        {
                            email: z.string().email(),
                            password: z.string().min(6),
                        }
                    )
                    .safeParse(credentials);
                if (parsedCredentials.success) {
                    const { email, password } = parsedCredentials.data;
                    const user = await getUser(email);
                    if (!user) {
                        return null;
                    }

                    const passwordMatch = await bcrypt.compare(password, user.password);
                    if (passwordMatch) {
                        return user;
                    }

                    log('Incalid credentials');
                    return null;
                }
            } catch (error) {
                log('Error in credentials');
                return null;
            }
            return null;
            },
        }),
    ],
});