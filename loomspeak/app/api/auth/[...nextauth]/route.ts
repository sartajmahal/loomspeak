import NextAuth from "next-auth";
import type { AuthOptions } from "next-auth";

export const authOptions: AuthOptions = {
  providers: [
    {
      id: "atlassian",
      name: "Atlassian",
      type: "oauth",
      wellKnown: "https://auth.atlassian.com/.well-known/openid-configuration",
      authorization: {
        params: {
          scope: "write:confluence-content read:confluence-space.summary write:confluence-space write:confluence-file read:confluence-props write:confluence-props manage:confluence-configuration read:confluence-content.all read:confluence-content.summary search:confluence read:confluence-content.permission read:confluence-user read:jira-work manage:jira-project manage:jira-configuration read:jira-user write:jira-work offline_access",
          prompt: "consent",
          audience: "api.atlassian.com",
        },
      },
      clientId: process.env.ATLASSIAN_CLIENT_ID,
      clientSecret: process.env.ATLASSIAN_CLIENT_SECRET,
      profile(profile) {
        return {
          id: profile.sub,
          name: profile.name,
          email: profile.email,
          image: profile.picture,
        };
      },
    },
  ],
  callbacks: {
    async jwt({ token, account }) {
      // Persist the OAuth access_token and refresh_token to the token right after signin
      if (account) {
        token.accessToken = account.access_token;
        token.refreshToken = account.refresh_token;
      }
      return token;
    },
    async session({ session, token }) {
      // Send properties to the client
      session.accessToken = token.accessToken;
      session.refreshToken = token.refreshToken;
      return session;
    },
  },
  pages: {
    signIn: "/",
  },
  session: {
    strategy: "jwt",
  },
};

const handler = NextAuth(authOptions);

export { handler as GET, handler as POST };