export default function NotesDisplay({ notes, className }) {
  if (!notes) return null;
  return (
    <div className={className}>
      {notes.split('\n').map((line, i) => {
        const match = line.match(/^([^:]+:)(.*)$/);
        return (
          <div key={i}>
            {match ? <><strong>{match[1]}</strong>{match[2]}</> : line}
          </div>
        );
      })}
    </div>
  );
}
