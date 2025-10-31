# FreezeMonkey POS

FreezeMonkey POS is a lightweight, touch-friendly point of sale interface built with Next.js and React. It focuses on a single-screen workflow for managing a catalog of products in small retail or hospitality environments.

## Features

- 🔒 **PIN Login** – Protect access to the register with a configurable PIN.
- 🧾 **Product Catalog** – Load products from a local JSON file on the server.
- ➕ **Add Products** – Create new items directly from the POS screen.
- ✏️ **Edit Products** – Update product details with one tap.
- 🗑️ **Delete Products** – Remove products and keep your catalog tidy.
- 💾 **Persistent Storage** – Changes are written back to `data/products.json`.
- 💸 **Price Formatting** – All prices render with two decimal places.
- 📱 **Touch Ready UI** – Large, high-contrast controls for tablet usage.

## Tech Stack

- **Framework**: Next.js 14 (App Router)
- **Language**: TypeScript
- **Styling**: Tailwind CSS
- **Data Storage**: JSON file persisted on the server filesystem

## Getting Started

1. Install dependencies:
   ```bash
   npm install
   ```
2. (Optional) Define a custom PIN by creating a `.env.local` file:
   ```env
   POS_LOGIN_PIN=2468
   ```
   If not provided, the app defaults to `1234`.
3. Start the development server:
   ```bash
   npm run dev
   ```
4. Visit [http://localhost:3000](http://localhost:3000) and sign in with your PIN.

## Data Persistence

- Product records live in `data/products.json`.
- Any add, edit, or delete action immediately updates this file.
- You can seed your own catalog by editing the JSON before starting the app.

## Project Structure

- `src/app/` – App Router pages and API routes.
- `src/lib/` – File persistence helpers.
- `data/products.json` – Product storage.

## Authentication

The `/login` screen validates PINs through the `/api/session` route. A successful login issues an HTTP-only cookie which gates all API access through middleware.

## Contributing

Pull requests and ideas are welcome! Feel free to open an issue or submit improvements.

## License

This project is open source and available under the [MIT License](LICENSE).
