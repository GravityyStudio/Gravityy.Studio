/** Spam trap: a clipped, hidden field humans never fill. Server treats any value as spam and silently succeeds. */
export default function Honeypot() {
  return (
    <div aria-hidden="true" className="sr-only">
      <label>
        Website
        <input type="text" name="website" tabIndex={-1} autoComplete="off" defaultValue="" />
      </label>
    </div>
  );
}
