# Luna

Luna is an auth starter kit for Astro that abstracts away the complexity of handling authentication and sessions. It works alongside SQLite to provide a complete authentication solution that's easy to use, understand, and extend.

- Zero configuration needed - just works™
- Fully typed with TypeScript
- Built specifically for Astro
- SQLite + Drizzle ORM included

## Quick Start

```bash
# Create new project
npm create astro@latest -- --template luna-auth/luna

# Install dependencies
npm install

# Start dev server
npm run dev
```

## Features

- 🔒 Secure session management with httpOnly cookies
- 📦 SQLite + Drizzle ORM setup
- 🛡️ Argon2id password hashing
- 🚦 Type-safe APIs
- 🧩 Ready to use auth components
- 📝 Email/Password authentication
- 🔑 Session management
- 🎨 Basic styling included

## Project Structure

```
/
├── src/
│   ├── actions/        # Auth actions (login, register, etc.)
│   ├── components/     # Auth components
│   ├── db/            # Database setup & schema
│   ├── lib/           # Auth utilities
│   └── pages/         # Example pages
├── drizzle/           # Database migrations
└── package.json       # Project config
```

## Customization

You can customize Luna by:
- Modifying the database schema
- Styling the components
- Adding new auth flows
- Extending the user model

## Roadmap

- [ ] OAuth providers
- [ ] Magic links
- [ ] Role-based access control
- [ ] Multiple database support
- [ ] Admin dashboard
- [ ] UI themes
- [ ] Custom authentication flows

## Contributing

This is an early-stage project. Feel free to open issues for feature requests or bug reports.

## License

MIT
