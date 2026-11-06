const RULEBOOK_URL = "https://github.com/mjn6862/blind-guides/blob/main/RULES.md";

export function RulebookLink() {
  return (
    <a className="link-button" href={RULEBOOK_URL} target="_blank" rel="noopener noreferrer">
      Full rulebook ↗
    </a>
  );
}
