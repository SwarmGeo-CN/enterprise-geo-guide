export default function HomePage() {
  return (
    <main>
      <h1>SynSwarm Next.js Example</h1>
      <p>
        Human visitors see this page normally. AI crawlers receive a semantic JSON
        payload via edge middleware.
      </p>
      <p>
        Discovery document:{' '}
        <a href="/.well-known/synswarm.json">/.well-known/synswarm.json</a>
      </p>
    </main>
  );
}
