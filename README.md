# Products frontend testing example

A Vue and TypeScript app that displays products from the [Week 10 Product API](https://github.com/tpdavison/cis3039-example-testing-svc). The examples show how to test reactive state, rendered output, and HTTP response handling with controlled dependencies, then test the real HTTP adapter against a running service.

## Set up the project

Clone `main` and open the repository in VS Code.

```bash
git clone --branch main https://github.com/tpdavison/cis3039-example-testing-app.git
```

With Docker running and the VS Code Dev Containers extension installed, select **Dev Containers: Reopen in Container** from the Command Palette. The [Dev Container configuration](.devcontainer/devcontainer.json) uses the course image `ghcr.io/tpdavison/devops-labs:2026-latest`. Outside the container, use Node.js 22.12 or later within the Node.js 22 release line and npm. Run the commands below from the relevant repository root.

```bash
npm ci
```

## Run the isolated tests

Once dependencies are installed, the isolated tests run without a backend, Azure credentials, or network access. The examples mark **Arrange**, **Act**, and **Assert** in each completed test.

| Command                 | What it does                                                             |
| ----------------------- | ------------------------------------------------------------------------ |
| `npm test`              | Runs the isolated tests once and returns an exit status suitable for CI. |
| `npm run test:watch`    | Reruns isolated tests as files change. Press **Ctrl+C** to exit.         |
| `npm run test:coverage` | Runs the isolated tests with V8 coverage.                                |

[The isolated Vitest configuration](vitest.config.ts) finds `src/**/*.test.ts` and uses jsdom for Vue rendering. The suite starts with **10 passing tests** and **3 student exercises** marked `it.todo`.

| Test file                                                              | What it demonstrates                                                                                                                                           | Student exercise                                                    |
| ---------------------------------------------------------------------- | -------------------------------------------------------------------------------------------------------------------------------------------------------------- | ------------------------------------------------------------------- |
| [use-products.test.ts](src/composables/use-products.test.ts)           | Check initial state, loading during a pending request, successful results, and a user-facing error. Inject a `ProductService` stub into a small Vue component. | Verify that a successful retry loads products and clears the error. |
| [Products.test.ts](src/views/Products.test.ts)                         | Mount the real view with its composable and a service stub. Check the empty state, descriptions, and display of ordinary, zero, and missing prices.            | Verify retry through the rendered UI.                               |
| [http-product-service.test.ts](src/infra/http-product-service.test.ts) | Inject a typed HTTP client. Check the request URL and headers, response decoding, and rejection of HTTP errors and invalid data.                               | Verify that duplicate product IDs are rejected.                     |
| [Integration test](tests/integration/http-product-service.test.ts)     | Use the production adapter and real HTTP to read both seed products from the separately running API.                                                           |                                                                     |

Open `coverage/index.html` after a coverage run. The report covers production TypeScript and Vue files under `src/`, including files the isolated suite never loads. The configuration excludes tests and type declarations. The example sets no minimum coverage percentage.

## Run the app with the Product API

Open the [Product service repository](https://github.com/tpdavison/cis3039-example-testing-svc) in a second VS Code window. Use its `main` branch and follow its setup to run `npm ci` and copy `local.settings.template.json` to `local.settings.json` if needed. The API uses in-memory storage, so a local run needs no Azure resources.

In the backend terminal, start the Functions host and allow the frontend browser origin in CORS.

```bash
npm start -- --cors http://localhost:5173
```

In the frontend terminal, start Vite.

```bash
npm run dev
```

Open [http://localhost:5173](http://localhost:5173) in your browser. The Vue app runs in the browser on your computer, so its requests to `localhost:7071` reach the backend through the host's local port. If VS Code has not forwarded the ports automatically, use the **Ports** view in each Dev Container window to forward frontend port `5173` and backend port `7071`.

A fresh backend shows **Seeded Widget** at **£12.99** and **Seeded Gadget** at **£25.99**. If the request fails, check `GET /api/products` in the browser's Network panel. Check the API URL, forwarded ports, and the exact origin allowed by CORS, then select **Retry**.

The app defaults to `http://localhost:7071/api/`. To change it, copy [`.env.example`](.env.example) to `.env.local` if needed, then set `VITE_API_BASE_URL` and restart Vite. Use the API base URL, including its `/api/` path. The adapter appends `products`. Vite embeds `VITE_*` values in the browser bundle at build time. Keep credentials out of those settings.

## Run the integration test against the Test API

The [integration configuration](vitest.integration.config.ts) runs `tests/integration/**/*.test.ts` separately in Node. Run it from your frontend workspace against the Week 10 backend deployed to Azure Test. If you already have a Test API URL, go straight to [Run the test](#run-the-test).

### Deploy the backend to Test

Use the backend repository's `main` branch. Run the deployment commands in Bash from the backend root. The course Dev Container includes the Azure CLI and Azure Functions Core Tools. Use an Azure subscription where you can create a dedicated Test resource group, Function App, and storage account.

Sign in, select your subscription, and set the names below. Replace `ab47` with your own short suffix of lowercase letters and digits so the Function App and storage account names are globally unique. Use a permitted region that supports Windows Consumption Functions.

```bash
az login
az account set --subscription 'YOUR_SUBSCRIPTION_ID'

suffix='YOUR_UID'
test_group="products-wk10-${suffix}-rg"
test_app="products-wk10-${suffix}-func"
test_storage="productswk10${suffix}store"
test_region='YOUR_PERMITTED_REGION'
```

Create the Test resource group and deploy the [backend's Bicep template](https://github.com/tpdavison/cis3039-example-testing-svc/blob/main/iac/main.bicep). Save the HTTPS URL printed by the deployment.

```bash
az group create --name "$test_group" --location "$test_region" --output none
az deployment group create \
  --resource-group "$test_group" \
  --template-file iac/main.bicep \
  --parameters functionAppName="$test_app" storageAccountName="$test_storage" \
  --query properties.outputs.functionAppUrl.value --output tsv
```

Build and publish the backend code from the same terminal.

```bash
npm ci
npm run build
func azure functionapp publish "$test_app"
```

### Run the test

In the frontend terminal, replace `YOUR_TEST_FUNCTION_HOST` with the hostname from the Test deployment. Use the HTTPS API base URL with `/api/` and the trailing slash. Vitest sends its request directly from Node, so the frontend can stay in your local workspace.

```bash
TEST_API_BASE_URL=https://YOUR_TEST_FUNCTION_HOST/api/ npm run test:integration
```

Expect one passing test. It calls `GET /api/products` through the real `HttpProductService` and checks both seeded records without relying on response order.

| ID      | Name          | Price in pence |
| ------- | ------------- | -------------: |
| `p-001` | Seeded Widget |         `1299` |
| `p-002` | Seeded Gadget |         `2599` |

If the test fails, check the Test URL and confirm that `GET /api/products` returns HTTP 200. Restart the Test Function App if earlier requests changed its in-memory seed data. This test checks the API contract as seen by Node. Run the app in a browser to check rendering and CORS.

When you finish with a deployment you created for this exercise, delete its dedicated Test resource group to avoid ongoing charges.

## Follow the code

[`Products.vue`](src/views/Products.vue) renders the state managed by [`useProducts`](src/composables/use-products.ts). The composable calls [`listProducts`](src/app/list-products.ts) through [`ProductService`](src/app/product-service.ts), the port that describes how the application gets products.

[The composition root](src/config/composition-root.ts) supplies [`HttpProductService`](src/infra/http-product-service.ts), the adapter that calls the API and validates its response. The composable and view tests provide a stub through [`PRODUCT_DEPS_KEY`](src/composables/products-key.ts). The integration test uses the real adapter across the frontend–backend boundary, with the service's seeded in-memory repository providing repeatable data.

## Build and deploy

`npm run type-check` checks application and test TypeScript. `npm run build` runs that check and creates the static site in `dist/`. The build needs only the installed dependencies. To preview it locally, run `npm run preview`, forward the preview port if needed, and allow the browser's preview origin in backend CORS.

If you already have a deployed Test API and want to host the frontend, use the course's Azure Storage static website setup. Build the app with the Test API's HTTPS base URL.

```bash
VITE_API_BASE_URL=https://YOUR_TEST_FUNCTION_HOST/api/ npm run build
```

1. Enable static website hosting in your Test storage account and set `index.html` as the index and error document.
2. Upload the contents of `dist/` to the `$web` container, preserving the `assets/` directory. See the [Azure Storage static website guide](https://learn.microsoft.com/en-us/azure/storage/blobs/storage-blob-static-website-how-to).
3. Add the static website's exact HTTPS origin to the backend Function App's CORS settings. Open the website URL and confirm the product list loads.
4. Remove any disposable Azure resources you created when you finish to avoid ongoing charges.

## Add Vitest to another Vue project

1. Check your project's Node and Vite versions. On a compatible Vue/Vite project, install the versions used here and keep the resulting lockfile.

   ```bash
   npm install --save-dev vitest@5.1.2 @vitest/coverage-v8@5.1.2 jsdom@27.4.0 @vue/test-utils@2.6.0
   ```

2. Adapt [the isolated configuration](vitest.config.ts) to use your Vue plugin and existing aliases. jsdom and Vue Test Utils support component mounting. Use [the separate Node configuration](vitest.integration.config.ts) for HTTP integration tests.
3. Add the test commands from [`package.json`](package.json) alongside your existing scripts. Keep your TypeScript settings, exclude test files from the app's TypeScript project, and type-check them through a project like [`tsconfig.test.json`](tsconfig.test.json). Keep generated coverage and build output out of Git.
4. Use the dependency seams and result types in your own app. A component can receive a stub through a prop or injection key. An adapter can accept an HTTP client so the same production code works in isolated tests and against a running service.

## Work in your own private copy

A local clone is enough to run the example and work on the exercises. If you want to push your work or practise CI, create an empty **private** GitHub repository with a name of your choice. Leave the README, licence, and `.gitignore` options unselected so you can push your local history.

Replace the placeholder URL with your private repository's HTTPS URL and check that both `origin` URLs point there. If you already have a private copy, continue using it.

```bash
git remote set-url origin https://github.com/YOUR_USERNAME/YOUR_PRIVATE_REPOSITORY.git
git remote -v
git branch --show-current
```

Once the remote is correct and the current branch is `main`, push your branch.

```bash
git push -u origin main
```
