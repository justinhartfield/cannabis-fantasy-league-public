# Clerk Authentication Setup

This application now uses [Clerk](https://clerk.com/) for authentication instead of the mock login system.

## Setup Instructions

### 1. Create a Clerk Account

1. Go to [https://clerk.com/](https://clerk.com/) and sign up for a free account
2. Create a new application in the Clerk Dashboard

### 2. Get Your API Keys

1. In your Clerk Dashboard, navigate to **API Keys** page: [https://dashboard.clerk.com/last-active?path=api-keys](https://dashboard.clerk.com/last-active?path=api-keys)
2. Copy your **Publishable Key** (starts with `pk_test_` or `pk_live_`)
3. Copy your **Secret Key** (starts with `sk_test_` or `sk_live_`)

### 3. Configure Environment Variables

Update the `.env.local` file in the project root with your actual Clerk keys:

```bash
# Frontend (Vite uses VITE_ prefix)
VITE_CLERK_PUBLISHABLE_KEY=pk_test_your_actual_publishable_key_here

# Backend
CLERK_SECRET_KEY=sk_test_your_actual_secret_key_here
```

**Important:** Never commit your actual API keys to version control. The `.env.local` file is already in `.gitignore`.

### 4. Configure Clerk Application Settings

In your Clerk Dashboard:

1. Go to **User & Authentication** → **Email, Phone, Username**
2. Enable the authentication methods you want (Email, Username, etc.)
3. Go to **Paths** and configure:
   - Sign-in URL: `/login`
   - Sign-up URL: `/sign-up`
   - After sign-in URL: `/`
   - After sign-up URL: `/`

### 5. Run the Application

```bash
# Install dependencies (if not already done)
pnpm install

# Start the development server
pnpm dev
```

## What Changed

### Frontend Changes

1. **main.tsx**: Wrapped the app with `<ClerkProvider>`
2. **DashboardLayout.tsx**: Replaced mock auth with Clerk's `useUser()` hook and `<UserButton>` component
3. **Login.tsx**: Replaced custom login form with Clerk's `<SignIn>` component
4. **useAuth.ts**: Updated to use Clerk's `useUser()` and `useClerk()` hooks

### Backend Changes

1. **authRouter.ts**: Removed mock login endpoint, updated to work with Clerk sessions
2. **context.ts**: Updated to extract Clerk session from request headers

### Middleware

The `middleware.ts` file was already configured correctly with `clerkMiddleware()` from `@clerk/nextjs/server`.

## Features

With Clerk, you now have:

- ✅ Secure authentication with industry-standard security
- ✅ Email/password authentication
- ✅ Social login (Google, GitHub, etc.) - can be enabled in Clerk Dashboard
- ✅ Multi-factor authentication (MFA) - can be enabled in Clerk Dashboard
- ✅ User profile management
- ✅ Session management
- ✅ Password reset functionality
- ✅ Email verification

## Development vs Production

- **Development**: Use test keys (starting with `pk_test_` and `sk_test_`)
- **Production**: Use live keys (starting with `pk_live_` and `sk_live_`)

Make sure to use different Clerk applications for development and production environments.

## Troubleshooting

### "Clerk: Publishable key not found"

Make sure you've set `VITE_CLERK_PUBLISHABLE_KEY` in `.env.local` and restarted the dev server.

### Users not authenticating on backend

The backend Clerk integration needs to be completed by:
1. Installing `@clerk/backend` package
2. Implementing JWT verification in `server/_core/context.ts`
3. Syncing Clerk users with your database

## Next Steps

To complete the backend integration:

```bash
# Install Clerk backend SDK
pnpm add @clerk/backend
```

Then update `server/_core/context.ts` to properly verify Clerk JWT tokens and sync users with your database.

## Resources

- [Clerk Documentation](https://clerk.com/docs)
- [Clerk Next.js Quickstart](https://clerk.com/docs/quickstarts/nextjs)
- [Clerk React SDK](https://clerk.com/docs/references/react/overview)
