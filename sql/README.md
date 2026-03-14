**SQL Folder**

This folder is now cleaned and based on your old database structure.

Use these files:

1. `00-full-schema.sql`
   One file with the full schema and backfill queries.

2. `01-core-auth-commerce.sql`
   Users, auth, products, variants, cart, orders, payments.

3. `02-chat-social.sql`
   Order chat, reactions, presence, followers.

4. `03-video-learning.sql`
   Video courses, lessons, plans, purchases, subscriptions, favorites, course cart.

5. `04-tools-and-licenses.sql`
   Tool variants, tool device access, tool licenses, activations, license audit, failed attempts.

6. `05-defaults-and-sync.sql`
   Seed categories, defaults, mode sync, payment sync, course access sync, promotion combos.

7. `06-user-api-keys.sql`
   Per-user encrypted API key storage.

Recommended:

- If you want everything at once, run `00-full-schema.sql`.
- If you want step by step, run:
  1. `01-core-auth-commerce.sql`
  2. `02-chat-social.sql`
  3. `03-video-learning.sql`
  4. `04-tools-and-licenses.sql`
  5. `05-defaults-and-sync.sql`
  6. `06-user-api-keys.sql`

Important:

- The old messy dated SQL files were removed from this folder.
- The new files were rewritten around your old database structure.
- If you already have production data, do not run the `DROP DATABASE` lines in `01-core-auth-commerce.sql`.
