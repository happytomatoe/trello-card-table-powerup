/* global TrelloPowerUp */
import { parseTables } from './parse-table.js';
import { renderInline } from './inline.js';

const t = TrelloPowerUp.iframe();

function empty(message) {
  const p = document.createElement('p');
  p.className = 'empty';
  p.textContent = message;
  return p;
}

function tableNode({ header, rows }) {
  const table = document.createElement('table');
  table.className = 'desc-table';

  const head = table.createTHead().insertRow();
  for (const cell of header) {
    const th = document.createElement('th');
    th.appendChild(renderInline(cell));
    head.appendChild(th);
  }

  const body = table.createTBody();
  for (const row of rows) {
    const tr = body.insertRow();
    for (const cell of row) {
      const td = document.createElement('td');
      td.appendChild(renderInline(cell));
      tr.appendChild(td);
    }
  }

  return table;
}

function draw(tables) {
  const wrap = document.getElementById('wrap');
  if (!tables.length) {
    wrap.replaceChildren(empty('No markdown table in this card\u2019s description.'));
    return;
  }
  wrap.replaceChildren(...tables.map(tableNode));
}

t.render(function () {
  return t.card('desc').then(
    (card) => {
      draw(parseTables(card.desc || ''));
      return t.sizeTo('#wrap').done();
    },
    (err) => {
      document.getElementById('wrap').replaceChildren(empty('Could not read this card\u2019s description.'));
      console.error(err);
      return t.sizeTo('#wrap').done();
    },
  );
});
