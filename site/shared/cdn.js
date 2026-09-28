// Pinned CDN reference to the library, shared by the documentation build and the designer.
// A published npm version never changes, so a page that loads an exact version keeps the
// behavior it was written for. The integrity hash (Subresource Integrity) makes the browser
// refuse a file that differs from the one published.

/** jsDelivr URL of the classic script for an exact version. */
export const cdnUrl = (/** @type {string} */ version) =>
  `https://cdn.jsdelivr.net/npm/bus-diagram@${version}/dist/bus-diagram.js`;

/** `<script>` tag for an exact version, with its integrity hash when known. */
export const cdnTag = (
  /** @type {string} */ version,
  /** @type {string | undefined} */ integrity,
) =>
  `<script src="${cdnUrl(version)}"${integrity ? ` integrity="${integrity}" crossorigin="anonymous"` : ""}></script>`;
