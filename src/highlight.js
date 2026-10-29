// Tiny syntax highlighter. Returns an array of lines, each line is an HTML string.

const C_WORDS =
  'auto break case char const continue default do double else enum extern float for goto if int long register return short signed sizeof static struct switch typedef union unsigned void volatile while';

const KEYWORDS = {
  C: C_WORDS,
  'C++':
    C_WORDS +
    ' class namespace template typename public private protected new delete using bool true false nullptr virtual try catch throw this cout cin endl std string vector',
  Java:
    'abstract boolean break byte case catch char class continue default do double else enum extends final finally float for if implements import instanceof int interface long new null package private protected public return short static super switch this throw throws try void while true false String',
  Python:
    'and as assert break class continue def del elif else except False finally for from global if import in is lambda None nonlocal not or pass raise return True try while with yield print self',
  JavaScript:
    'async await break case catch class const continue default delete do else export extends finally for function if import in instanceof let new null of return super switch this throw try typeof undefined var void while yield true false',
  SQL: 'select from where insert into values update set delete create table alter drop join inner left right outer on group by order having limit and or not null primary key foreign references distinct as count sum avg min max like in between union case when then else end int varchar',
};

const esc = (s) => s.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;');

function buildRegex(lang) {
  const cLike = ['C', 'C++', 'Java', 'JavaScript'].includes(lang);
  const comment =
    lang === 'Python'
      ? '#[^\\n]*'
      : lang === 'SQL'
      ? '--[^\\n]*|\\/\\*[\\s\\S]*?\\*\\/'
      : cLike
      ? '\\/\\*[\\s\\S]*?\\*\\/|\\/\\/[^\\n]*'
      : '(?!)';
  const pre = lang === 'C' || lang === 'C++' ? '^[ \\t]*#[^\\n]*' : '(?!)';
  // groups: 1 comment, 2 preprocessor, 3 string, 4 number, 5 word, 6 anything else
  return new RegExp(
    `(${comment})|(${pre})|("(?:\\\\.|[^"\\\\\\n])*"|'(?:\\\\.|[^'\\\\\\n])*'|\`(?:\\\\.|[^\`\\\\])*\`)|(\\b\\d+(?:\\.\\d+)?\\b)|([A-Za-z_][A-Za-z0-9_]*)|([\\s\\S])`,
    'gm'
  );
}

export function highlightLines(code, lang) {
  const words = new Set((KEYWORDS[lang] || '').split(' ').filter(Boolean));
  const ci = lang === 'SQL';
  const re = buildRegex(lang);
  const tokens = []; // {cls, text}
  let m;
  while ((m = re.exec(code))) {
    if (m[0] === '') {
      re.lastIndex++;
      continue;
    }
    let cls = '';
    if (m[1]) cls = 'c-com';
    else if (m[2]) cls = 'c-pre';
    else if (m[3]) cls = 'c-str';
    else if (m[4]) cls = 'c-num';
    else if (m[5]) {
      const w = ci ? m[5].toLowerCase() : m[5];
      if (words.has(w)) cls = 'c-kw';
      else if (code[re.lastIndex] === '(' || /^\s*\(/.test(code.slice(re.lastIndex, re.lastIndex + 8))) cls = 'c-fn';
    }
    tokens.push({ cls, text: m[0] });
  }

  const lines = [''];
  for (const t of tokens) {
    const parts = t.text.split('\n');
    parts.forEach((part, i) => {
      if (i > 0) lines.push('');
      if (part) lines[lines.length - 1] += t.cls ? `<span class="${t.cls}">${esc(part)}</span>` : esc(part);
    });
  }
  return lines;
}
