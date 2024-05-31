import { DataAPIClient } from '@datastax/astra-db-ts';

// Creates the client with the `httpOptions` set to use the `fetch` client as Next.js's minification
// conflicts with the importing of our default http client (see http2-when-minified for more info)
// See `examples/http2-when-minified` for more information on how to use HTTP/2 with Next.js
const client = new DataAPIClient(process.env.ASTRA_DB_TOKEN!, {
  httpOptions: { client: 'fetch' },
});
const db = client.db(process.env.ASTRA_DB_ENDPOINT!);

// If `runtime` is set to `edge`, you could get away without needing to specify the specific
// client, as `astra-db-ts` would be able to infer that it should use `fetch` for you.
// e.g. `const client = new DataAPIClient(process.env.ASTRA_DB_TOKEN!);`
// export const runtime = 'edge';

// Simple example which (attempts to) list all the collections in the database
export async function GET(_: Request) {
  try {
    const collections = await db.listCollections();

    return new Response(JSON.stringify(collections), {
      headers: { 'Content-Type': 'application/json' },
    });
  } catch (error: any) {
    return new Response(JSON.stringify({ error: error.message }), {
      headers: { 'Content-Type': 'application/json' },
      status: 500,
    });
  }
}