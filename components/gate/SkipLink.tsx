export default function SkipLink({ onSkip }: { onSkip: () => void }) {
  return (
    <button type="button" className="skip-link" onClick={onSkip}>
      Skip to CV <span aria-hidden>→</span>
    </button>
  );
}
