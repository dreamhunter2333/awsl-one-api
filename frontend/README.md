# AWSL One API Frontend

Modern React + Vite + TypeScript frontend for AWSL One API management platform.

## Features

- Modern React 19 with TypeScript
- Vite for fast development and building
- Tailwind CSS for styling
- shadcn/ui components
- TanStack Query for data fetching
- Zustand for state management
- React Router for routing
- Full CRUD operations for channels, tokens, and pricing
- Dark mode support

## Development

```bash
# Install dependencies
pnpm install

# Start development server
pnpm dev

# Build for production
pnpm build

# Preview production build
pnpm preview
```

## Project Structure

```
src/
├── api/              # API client
├── components/       # React components
│   ├── layout/       # Layout components
│   └── ui/           # UI components (shadcn/ui)
├── lib/              # Utility functions
├── pages/            # Page components
├── store/            # Zustand stores
├── types/            # TypeScript types
├── App.tsx           # Main app component
├── main.tsx          # Entry point
└── index.css         # Global styles
```

## Environment Variables

No environment variables required. The frontend communicates with the backend API at the same domain.

## Features

- **Dashboard**: Overview and quick start guide
- **API Test**: Test API endpoints with custom requests
- **Channels**: Manage OpenAI, Azure OpenAI, and Claude channels
- **Tokens**: Create and manage API tokens with quota limits
- **Pricing**: Configure model pricing multipliers
- **Database**: Initialize database tables

## Building

```bash
pnpm build
```

The built files will be in the `dist` directory.
