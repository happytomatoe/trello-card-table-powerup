const INLINE = /(\*\*[^*]+\*\*|\*[^*]+\*|`[^`]+`|\[[^\]]+\]\((https?:\/\/[^)\s]+)\))/g;

/**
 * Render the inline markdown a table cell can contain.
 *
 * Builds text nodes and elements — the description is untrusted input, so a
 * string is never assigned to innerHTML. Links are limited to http(s); any
 * other target stays literal text.
 *
 * @param {string} text
 * @returns {DocumentFragment}
 */
export function renderInline(text) {
  const frag = document.createDocumentFragment();
  let last = 0;
  let match;

  INLINE.lastIndex = 0;
  while ((match = INLINE.exec(text))) {
    if (match.index > last) {
      frag.appendChild(document.createTextNode(text.slice(last, match.index)));
    }

    const token = match[0];
    if (token.startsWith('**')) {
      const strong = document.createElement('strong');
      strong.textContent = token.slice(2, -2);
      frag.appendChild(strong);
    } else if (token.startsWith('`')) {
      const code = document.createElement('code');
      code.textContent = token.slice(1, -1);
      frag.appendChild(code);
    } else if (token.startsWith('*')) {
      const em = document.createElement('em');
      em.textContent = token.slice(1, -1);
      frag.appendChild(em);
    } else {
      const link = document.createElement('a');
      link.href = match[2];
      link.textContent = token.slice(1, token.indexOf(']'));
      frag.appendChild(link);
    }

    last = match.index + token.length;
  }

  if (last < text.length) {
    frag.appendChild(document.createTextNode(text.slice(last)));
  }
  return frag;
}
