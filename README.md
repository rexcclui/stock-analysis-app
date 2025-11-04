This is a [Next.js](https://nextjs.org) project bootstrapped with [`create-next-app`](https://nextjs.org/docs/app/api-reference/cli/create-next-app).

## Features

### Page Load Tracking
This application tracks page loads from each IP address. Every time someone visits the main page (`/`), it's recorded. You can view real-time statistics about unique visitors and page load counts.

**Quick Access:**
- **View Statistics:** `GET /api/status` (returns HTML dashboard)
- **JSON Format:** `GET /api/status?format=json`

For detailed documentation, see [IP_TRACKING.md](./IP_TRACKING.md)

## Getting Started

### Repository branches

The active development branch in this repository is now `main`. If you previously looked for a branch named `work`, use `git checkout main` to access the latest changes.

First, run the development server:

```bash
npm run dev
# or
yarn dev
# or
pnpm dev
# or
bun dev
```

Open [http://localhost:3000](http://localhost:3000) with your browser to see the result.

You can start editing the page by modifying `app/page.tsx`. The page auto-updates as you edit the file.

This project uses [`next/font`](https://nextjs.org/docs/app/building-your-application/optimizing/fonts) to automatically optimize and load [Geist](https://vercel.com/font), a new font family for Vercel.

## Learn More

To learn more about Next.js, take a look at the following resources:

- [Next.js Documentation](https://nextjs.org/docs) - learn about Next.js features and API.
- [Learn Next.js](https://nextjs.org/learn) - an interactive Next.js tutorial.

You can check out [the Next.js GitHub repository](https://github.com/vercel/next.js) - your feedback and contributions are welcome!

## Deploy on Vercel

The easiest way to deploy your Next.js app is to use the [Vercel Platform](https://vercel.com/new?utm_medium=default-template&filter=next.js&utm_source=create-next-app&utm_campaign=create-next-app-readme) from the creators of Next.js.

Check out our [Next.js deployment documentation](https://nextjs.org/docs/app/building-your-application/deploying) for more details.

 1017  npx --registry=https://registry.npmjs.org/ create-next-app@latest stock-analysis-app\n
 1018  cd stock-analysis-app
 1020  npm install recharts lucide-react
 1021  # Create API routes directory\nmkdir -p app/api/stock\nmkdir -p app/api/competitors\nmkdir -p app/api/sentiment\nmkdir -p app/api/news
Your API key is: AG3895F5UBBMNL1D, stk100001@gmail.com at Alpha Vantage

ALPHA_VANTAGE_KEY=AG3895F5UBBMNL1D
FMP_KEY=zGcTWbE1JPSBQB43vW4NGgTow69y5ksM

https://newsapi.org/register/success
NEWS_API_KEY=1c950bd1047f42c684e6eef9dec2a299

git init
git add .
git remote add origin https://github.com/rexcclui/stock-analysis-app.git

git add -A && git commit -m "Clean dependencies and remove duplicate page.js" && git push

https://vercel.com/rexccluis-projects/stock-analysis-app-epkc


 rm -rf .next
 npm run build
 npm run dev