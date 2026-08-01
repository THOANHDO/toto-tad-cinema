const CONTROL_CHARACTERS = /[\u0000-\u001f\u007f]/;

/**
 * Accept only same-site absolute paths. Protocol-relative URLs, backslashes,
 * control characters, and external origins are rejected.
 */
export function getSafeNextPath(value: string | null | undefined): string | null {
  if (!value || !value.startsWith("/") || value.startsWith("//")) {
    return null;
  }

  if (value.includes("\\") || CONTROL_CHARACTERS.test(value)) {
    return null;
  }

  try {
    const baseUrl = new URL("https://private.invalid");
    const targetUrl = new URL(value, baseUrl);

    if (targetUrl.origin !== baseUrl.origin) {
      return null;
    }

    return `${targetUrl.pathname}${targetUrl.search}${targetUrl.hash}`;
  } catch {
    return null;
  }
}
