import GoogleProvider from "next-auth/providers/google";
import { SSMClient, GetParameterCommand } from "@aws-sdk/client-ssm";

const ssm = new SSMClient({
  region: process.env.AWS_REGION_ENV,
});

export const authOptions = {
  providers: [
    GoogleProvider({
      clientId: process.env.GOOGLE_CLIENT_ID,
      clientSecret: process.env.GOOGLE_CLIENT_SECRET,
    }),
  ],
  session: {
    strategy: "jwt",
  },

  callbacks: {
    async signIn({ user }) {
      try {
        if (!user?.email) return false;

        const response = await ssm.send(
          new GetParameterCommand({
            Name: "/kasm/allowedCreators",
            WithDecryption: true,
          })
        );

        const allowedCreators = JSON.parse(
          response.Parameter?.Value || "[]"
        );

        const matchedUser = allowedCreators.find(
          (u) => u.email === user.email
        );

        return !!matchedUser; // allow only if found
      } catch (error) {
        console.error("Error validating allowedCreators:", error);
        return false;
      }
    },

    async jwt({ token, user }) {
      if (user?.email) {
        const response = await ssm.send(
          new GetParameterCommand({
            Name: "/kasm/allowedCreators",
            WithDecryption: true,
          })
        );

        const allowedCreators = JSON.parse(
          response.Parameter?.Value || "[]"
        );

        const matchedUser = allowedCreators.find(
          (u) => u.email === user.email
        );

        token.email = user.email;
        token.isAdmin = matchedUser?.isAdmin || false;
      }

      return token;
    },

    async session({ session, token }) {
      if (session.user) {
        session.user.email = token.email ;
        session.user.isAdmin = token.isAdmin ;
      }

      return session;
    },
  },

  pages: {
    signIn: "/signin",
  },
};