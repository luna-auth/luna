# Luna

Luna is an auth library for Astro that abstracts away the complexity of handling authentication and sessions. It works alongside your database to provide an API that's easy to use, understand, and extend.

- Zero configuration needed - just works™
- Fully typed with TypeScript
- Built specifically for Astro
- SQLite support out of the box (more coming soon)

```typescript
import { Luna } from "@luna-auth/luna";

const luna = new Luna({
  database: "sqlite",
  providers: ["email"]
});

// Create a new session
const session = await luna.createSession(userId);

// Validate session
const user = await luna.validateSession(sessionId);
```

Luna is an open source library released under the MIT license.

## Resources

📚 [Documentation](https://docs.luna-auth.dev) (coming soon)

💬 [Join our Discord](https://discord.gg/luna-auth) (coming soon)

🚀 [Examples](https://github.com/luna-auth/examples) (coming soon)

📋 [Changelog](CHANGELOG.md)

## Installation

```bash
# npm
npm install @luna-auth/luna

# pnpm
pnpm add @luna-auth/luna

# yarn
yarn add @luna-auth/luna
```

## Features

- 🔒 Secure session management with httpOnly cookies
- 📦 SQLite support out of the box
- 🛡️ Argon2id password hashing
- 🚦 Type-safe APIs
- 🧩 Modular design

## Roadmap

- [ ] OAuth providers
- [ ] Magic links
- [ ] Role-based access control
- [ ] Multiple database support
- [ ] Admin dashboard
- [ ] UI components
- [ ] Custom authentication flows

## Contributing

This is an early-stage project. Feel free to open issues for feature requests or bug reports.

## License

MIT
