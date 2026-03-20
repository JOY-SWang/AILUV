type Props = {
  term: string;
  results: string[];
  onTermChange: (term: string) => void;
};

export function LibraryPage({ term, results, onTermChange }: Props) {
  return (
    <>
      <section className="panel">
        <h2>Library</h2>
        <p>Input one word and retrieve similar words.</p>
        <input
          value={term}
          onChange={(e) => onTermChange(e.target.value)}
          placeholder="Type a word"
          className="library-input"
        />
      </section>
      <section className="panel">
        <h3>Results</h3>
        {results.length ? (
          <ul className="list">
            {results.map((word) => (
              <li key={word}>{word}</li>
            ))}
          </ul>
        ) : (
          <p>No result yet.</p>
        )}
      </section>
    </>
  );
}
