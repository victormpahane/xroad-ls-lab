// Shared docx helpers for the lab documents (used by build-browser.js).
const fs = require('fs');
const path = require('path');
const {
  Document, Packer, Paragraph, TextRun, HeadingLevel, AlignmentType, Table, TableRow, TableCell,
  WidthType, BorderStyle, ShadingType, ImageRun, PageBreak, TableOfContents, Footer, Header,
  PageNumber, LevelFormat,
} = require('docx');

const W = 9026; // A4 width minus 1" margins, in DXA
const C = { navy: '1F3A5F', blue: '2B5F96', green: '2E7D55', orange: 'B5651D', gold: '7A6100', grey: '4A5563', red: 'B23A3A' };
const FONT = 'Calibri', MONO = 'Consolas';

// inline markup: **bold**, `code`
function runs(text, base = {}) {
  const out = [];
  for (const part of String(text).split(/(\*\*[^*]+\*\*|`[^`]+`)/)) {
    if (!part) continue;
    if (part.startsWith('**')) out.push(new TextRun({ ...base, text: part.slice(2, -2), bold: true }));
    else if (part.startsWith('`')) out.push(new TextRun({ ...base, text: part.slice(1, -1), font: MONO, size: 19, color: C.navy }));
    else out.push(new TextRun({ ...base, text: part }));
  }
  return out;
}

function newDoc() {
  const body = [];
  const fig = { n: 0 };
  let listId = 0;
  const border = { style: BorderStyle.SINGLE, size: 4, color: 'C9CFD8' };
  const borders = { top: border, bottom: border, left: border, right: border };
  const spacer = () => new Paragraph({ children: [], spacing: { after: 80 } });

  const k = {
    body,
    add: (...x) => body.push(...x.flat()),
    P: (t, opts = {}) => new Paragraph({ children: runs(t, opts.run || {}), spacing: { after: 120, line: 276 }, ...opts.para }),
    note: (t) => new Paragraph({ children: runs(t, { italics: true, color: C.grey, size: 18 }), spacing: { after: 120 } }),
    H1: (t, pageBreak = true) => new Paragraph({ heading: HeadingLevel.HEADING_1, children: [new TextRun(t)], pageBreakBefore: pageBreak }),
    H2: (t) => new Paragraph({ heading: HeadingLevel.HEADING_2, children: [new TextRun(t)] }),
    H3: (t) => new Paragraph({ heading: HeadingLevel.HEADING_3, children: [new TextRun(t)] }),
    bullets: (items) => items.map((t) => new Paragraph({ children: runs(t), numbering: { reference: 'bul', level: 0 }, spacing: { after: 60, line: 264 } })),
    steps: (items) => { const inst = ++listId; return items.map((t) => new Paragraph({ children: runs(t), numbering: { reference: 'num', level: 0, instance: inst }, spacing: { after: 70, line: 264 } })); },
    checks: (items) => items.map((t) => new Paragraph({ children: [new TextRun({ text: '☐  ', size: 24 }), ...runs(t)], spacing: { after: 60, line: 264 }, indent: { left: 360, hanging: 360 } })),
    code: (lines) => [].concat(lines).map((l, i, a) => new Paragraph({
      children: [new TextRun({ text: l === '' ? ' ' : l, font: MONO, size: 17 })],
      shading: { type: ShadingType.CLEAR, color: 'auto', fill: 'F3F5F8' },
      border: { left: { style: BorderStyle.SINGLE, size: 18, color: '9AA5B1', space: 6 } },
      spacing: { before: i === 0 ? 60 : 0, after: i === a.length - 1 ? 160 : 0, line: 240 }, indent: { left: 120, right: 60 }, keepLines: true,
      keepNext: i < a.length - 1, // keep a code block on one page
    })),
    table(head, rows, fr, noHead = false) {
      const widths = fr.map((f) => Math.round(f * W));
      widths[widths.length - 1] = W - widths.slice(0, -1).reduce((a, b) => a + b, 0);
      const cell = (t, i, isHead) => new TableCell({
        borders, width: { size: widths[i], type: WidthType.DXA },
        shading: isHead ? { type: ShadingType.CLEAR, color: 'auto', fill: 'E3EEF9' } : undefined,
        margins: { top: 60, bottom: 60, left: 100, right: 100 },
        children: String(t).split('\n').map((line) => new Paragraph({ children: runs(line, isHead ? { bold: true, color: C.navy } : {}), spacing: { after: 0, line: 252 } })),
      });
      return [new Table({
        width: { size: W, type: WidthType.DXA }, columnWidths: widths,
        rows: [...(noHead ? [] : [new TableRow({ tableHeader: true, cantSplit: true, children: head.map((h, i) => cell(h, i, true)) })]),
          ...rows.map((r) => new TableRow({ cantSplit: true, children: r.map((t, i) => cell(t, i, false)) }))],
      }), spacer()];
    },
    callout(kind, title, lines) {
      const CALLOUT = { why: ['Why', 'E3EEF9', C.blue], tip: ['Tip', 'E4F4EC', C.green], warn: ['Watch out', 'FBEFE2', C.orange],
        prob: ['If it goes wrong', 'FBE9E9', C.red], ok: ['', 'E4F4EC', C.green], see: ['You should now see', 'F1F3F6', C.navy],
        box: [null, 'F1F3F6', C.navy] };
      const [label, fill, col] = CALLOUT[kind];
      const b = { style: BorderStyle.SINGLE, size: 2, color: fill };
      return [new Table({
        width: { size: W, type: WidthType.DXA }, columnWidths: [W],
        rows: [new TableRow({ cantSplit: true, children: [new TableCell({
          width: { size: W, type: WidthType.DXA },
          borders: { top: b, bottom: b, right: b, left: { style: BorderStyle.SINGLE, size: 24, color: col } },
          shading: { type: ShadingType.CLEAR, color: 'auto', fill },
          margins: { top: 100, bottom: 100, left: 160, right: 160 },
          children: [
            new Paragraph({ children: [new TextRun({ text: label === null ? '' : label ? label + (title ? ': ' : '') : '✓ ', bold: true, color: col }), new TextRun({ text: title || '', bold: true })], spacing: { after: 60 } }),
            ...[].concat(lines).map((l) => new Paragraph({ children: runs(l), spacing: { after: 60, line: 264 } })),
          ] })] })],
      }), spacer()];
    },
    figure(name, caption, wPx, hPx) {
      const png = path.join(__dirname, 'img', name + '.png');
      const width = 600; // docx-js sizes images in px at 96 dpi: 600 px = 6.25 in
      fig.n++;
      return [
        new Paragraph({ alignment: AlignmentType.CENTER, keepNext: true, spacing: { before: 120, after: 60 },
          children: [new ImageRun({ type: 'png', data: fs.readFileSync(png), transformation: { width, height: Math.round(width * hPx / wPx) },
            altText: { title: caption, description: caption, name } })] }),
        new Paragraph({ alignment: AlignmentType.CENTER, spacing: { after: 200 },
          children: [new TextRun({ text: `Figure ${fig.n}. `, bold: true, size: 18, color: C.grey }), new TextRun({ text: caption, italics: true, size: 18, color: C.grey })] }),
      ];
    },
    pageBreak: () => new Paragraph({ children: [new PageBreak()] }),
    toc: () => [new Paragraph({ heading: HeadingLevel.HEADING_1, children: [new TextRun('Contents')] }),
      new TableOfContents('Contents', { hyperlink: true, headingStyleRange: '1-2' }),
      k.note('If the table above is empty: in Word right-click it → Update Field; in LibreOffice Tools → Update → Update All.')],
    figures: () => fig.n,
  };
  return k;
}

function save(k, out, { title, header, creator }) {
  const doc = new Document({
    creator, title, features: { updateFields: true },
    styles: {
      default: { document: { run: { font: FONT, size: 21 } } },
      paragraphStyles: [
        { id: 'Heading1', name: 'Heading 1', basedOn: 'Normal', next: 'Normal', quickFormat: true,
          run: { size: 34, bold: true, color: C.navy, font: FONT }, paragraph: { spacing: { before: 0, after: 200 }, outlineLevel: 0 } },
        { id: 'Heading2', name: 'Heading 2', basedOn: 'Normal', next: 'Normal', quickFormat: true,
          run: { size: 27, bold: true, color: C.blue, font: FONT }, paragraph: { spacing: { before: 280, after: 120 }, outlineLevel: 1, keepNext: true } },
        { id: 'Heading3', name: 'Heading 3', basedOn: 'Normal', next: 'Normal', quickFormat: true,
          run: { size: 23, bold: true, color: C.navy, font: FONT }, paragraph: { spacing: { before: 200, after: 80 }, outlineLevel: 2, keepNext: true } },
      ],
    },
    numbering: { config: [
      { reference: 'bul', levels: [{ level: 0, format: LevelFormat.BULLET, text: '•', alignment: AlignmentType.LEFT, style: { paragraph: { indent: { left: 540, hanging: 270 } } } }] },
      { reference: 'num', levels: [{ level: 0, format: LevelFormat.DECIMAL, text: '%1.', alignment: AlignmentType.LEFT, style: { paragraph: { indent: { left: 540, hanging: 300 } } } }] },
    ] },
    sections: [{
      properties: { page: { size: { width: 11906, height: 16838 }, margin: { top: 1440, right: 1440, bottom: 1300, left: 1440 } } },
      headers: { default: new Header({ children: [new Paragraph({ alignment: AlignmentType.RIGHT, children: [new TextRun({ text: header, size: 16, color: '8A94A3' })] })] }) },
      footers: { default: new Footer({ children: [new Paragraph({ alignment: AlignmentType.CENTER, children: [new TextRun({ children: ['Page ', PageNumber.CURRENT, ' of ', PageNumber.TOTAL_PAGES], size: 16, color: '8A94A3' })] })] }) },
      children: k.body,
    }],
  });
  return Packer.toBuffer(doc).then((b) => { fs.writeFileSync(out, b); console.log('wrote', out, b.length, 'bytes,', k.figures(), 'figures'); });
}

module.exports = { newDoc, save, runs, C, W, Paragraph, TextRun, BorderStyle };
