#!/usr/bin/env bash

set -e

mkdir -p src/{routes,plugins,middleware,modules/{invoices,summary},domain,utils} docs

# Create empty files
touch src/app.ts
touch index.ts
touch src/routes/index.ts
touch src/plugins/appwrite.ts
touch src/plugins/requireAppwriteAuth.ts
touch src/middleware/error.ts
touch src/middleware/validate.ts
touch src/modules/invoices/invoices.routes.ts
touch src/modules/invoices/invoices.schema.ts
touch src/modules/invoices/invoices.service.ts
touch src/modules/summary/summary.routes.ts
touch src/modules/summary/summary.service.ts
touch src/domain/invoice.types.ts
touch src/domain/vat.ts
touch src/utils/pagination.ts
touch README.md
touch .env.example

echo "structure created"
