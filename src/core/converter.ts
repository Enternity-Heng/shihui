import katex from 'katex';
import 'katex/contrib/mhchem';
import type { Conversion } from '../shared/types';

export const MAX_SOURCE = 4096;
export const symbols: Record<string, string> = {
  alpha:'α', beta:'β', gamma:'γ', delta:'δ', epsilon:'ϵ', varepsilon:'ε', zeta:'ζ', eta:'η', theta:'θ', vartheta:'ϑ',
  iota:'ι', kappa:'κ', varkappa:'ϰ', lambda:'λ', mu:'μ', nu:'ν', xi:'ξ', omicron:'ο', pi:'π', varpi:'ϖ', rho:'ρ', varrho:'ϱ',
  sigma:'σ', varsigma:'ς', tau:'τ', upsilon:'υ', phi:'ϕ', varphi:'φ', chi:'χ', psi:'ψ', omega:'ω',
  Gamma:'Γ', Delta:'Δ', Theta:'Θ', Lambda:'Λ', Xi:'Ξ', Pi:'Π', Sigma:'Σ', Upsilon:'Υ', Phi:'Φ', Psi:'Ψ', Omega:'Ω',
  infty:'∞', partial:'∂', nabla:'∇', ell:'ℓ', hbar:'ℏ', imath:'ı', jmath:'ȷ', Re:'ℜ', Im:'ℑ', aleph:'ℵ',
  times:'×', div:'÷', cdot:'⋅', pm:'±', mp:'∓', ast:'∗', star:'⋆', circ:'∘', bullet:'∙', oplus:'⊕', ominus:'⊖', otimes:'⊗', oslash:'⊘', odot:'⊙',
  le:'≤', leq:'≤', ge:'≥', geq:'≥', ne:'≠', neq:'≠', approx:'≈', sim:'∼', simeq:'≃', cong:'≅', equiv:'≡', propto:'∝', ll:'≪', gg:'≫',
  prec:'≺', succ:'≻', preceq:'⪯', succeq:'⪰', subset:'⊂', supset:'⊃', subseteq:'⊆', supseteq:'⊇', nsubseteq:'⊈', nsupseteq:'⊉',
  in:'∈', notin:'∉', ni:'∋', owns:'∋', cup:'∪', cap:'∩', setminus:'∖', emptyset:'∅', varnothing:'∅',
  forall:'∀', exists:'∃', nexists:'∄', neg:'¬', lnot:'¬', land:'∧', wedge:'∧', lor:'∨', vee:'∨', top:'⊤', bot:'⊥',
  to:'→', rightarrow:'→', leftarrow:'←', leftrightarrow:'↔', Rightarrow:'⇒', Leftarrow:'⇐', Leftrightarrow:'⇔', implies:'⇒', iff:'⟺',
  longrightarrow:'⟶', longleftarrow:'⟵', longleftrightarrow:'⟷', Longrightarrow:'⟹', Longleftarrow:'⟸', Longleftrightarrow:'⟺',
  mapsto:'↦', hookrightarrow:'↪', hookleftarrow:'↩', uparrow:'↑', downarrow:'↓', updownarrow:'↕', nearrow:'↗', searrow:'↘', nwarrow:'↖', swarrow:'↙',
  sum:'∑', prod:'∏', coprod:'∐', int:'∫', iint:'∬', iiint:'∭', oint:'∮', bigcup:'⋃', bigcap:'⋂', bigvee:'⋁', bigwedge:'⋀',
  angle:'∠', triangle:'△', square:'□', diamond:'⋄', parallel:'∥', nparallel:'∦', perp:'⊥', mid:'∣', nmid:'∤', vdash:'⊢', models:'⊨',
  ldots:'…', dots:'…', cdots:'⋯', vdots:'⋮', ddots:'⋱', prime:'′', backslash:'\\', lbrace:'{', rbrace:'}', lvert:'|', rvert:'|', lVert:'‖', rVert:'‖',
  langle:'⟨', rangle:'⟩', lceil:'⌈', rceil:'⌉', lfloor:'⌊', rfloor:'⌋', surd:'√', checkmark:'✓', degree:'°'
};
const supers = new Map(Array.from('0123456789+-=()in').map((c,i) => [c, Array.from('⁰¹²³⁴⁵⁶⁷⁸⁹⁺⁻⁼⁽⁾ⁱⁿ')[i]]));
const subs = new Map(Array.from('0123456789+-=()aehijklmnoprstuvx').map((c,i) => [c, Array.from('₀₁₂₃₄₅₆₇₈₉₊₋₌₍₎ₐₑₕᵢⱼₖₗₘₙₒₚᵣₛₜᵤᵥₓ')[i]]));

// A deliberately small grammar. Formatting, accents, fractions and unknown atoms
// must retain their full typeset structure instead of losing meaning.
class PlainParser {
  private i = 0;
  constructor(private source: string) {}
  parse(end = false): string | null {
    let output = '';
    while (this.i < this.source.length) {
      const c = this.source[this.i++];
      if (/\s/.test(c)) continue;
      if (c === '}') return end ? output : null;
      if (c === '{') {
        const group = this.parse(true);
        if (group === null) return null;
        output += group;
      } else if (c === '\\') {
        const rest = this.source.slice(this.i);
        const command = /^[a-zA-Z]+/.exec(rest)?.[0];
        if (command) {
          this.i += command.length;
          if (!(command in symbols)) return null;
          output += symbols[command];
        } else {
          const escaped = this.source[this.i++];
          if (!escaped || !'{}%&#$'.includes(escaped)) return null;
          output += escaped;
        }
      } else if (c === '^' || c === '_') {
        // Only scripts attached to one visible atom are unambiguous as text.
        if (!output || this.source[this.i - 2] === '}') return null;
        while (/\s/.test(this.source[this.i] ?? '') && this.i < this.source.length) this.i++;
        let script = '';
        if (this.source[this.i] === '{') {
          this.i++;
          const close = this.source.indexOf('}', this.i);
          if (close < 0) return null;
          script = this.source.slice(this.i, close);
          this.i = close + 1;
        } else script = this.source[this.i++] ?? '';
        const mapping = c === '^' ? supers : subs;
        if (!script || Array.from(script).some(ch => !mapping.has(ch))) return null;
        output += Array.from(script).map(ch => mapping.get(ch)).join('');
      } else if (/^[a-zA-Z0-9+\-=(),.;:/<>|!?\[\]]$/.test(c) || /[^\x00-\x7f]/.test(c)) {
        // Combining marks, invisible controls and unpaired surrogates are unsafe.
        const cp = this.source.codePointAt(this.i - 1)!;
        const ch = String.fromCodePoint(cp);
        if (/[\p{C}\p{M}]/u.test(ch)) return null;
        if (cp > 0xffff) this.i++;
        output += ch;
      } else return null;
    }
    return end ? null : output;
  }
}

export function normalizeSource(input: string): { source: string; incomplete: boolean } {
  const trimmed = input.trim();
  for (const [open, close] of [['$$','$$'], ['\\[','\\]'], ['\\(','\\)'], ['$','$']]) {
    if (trimmed.startsWith(open)) {
      if (trimmed.length < open.length + close.length || !trimmed.endsWith(close)) return {source: trimmed, incomplete:true};
      return {source: trimmed.slice(open.length, -close.length).trim(), incomplete:false};
    }
  }
  return {source:trimmed, incomplete:false};
}

export function convert(input: string): Conversion {
  if (input.length > MAX_SOURCE) return {kind:'error', message:'源码不能超过 4096 个 UTF-16 单元。'};
  const normalized = normalizeSource(input);
  if (normalized.incomplete) return {kind:'incomplete', message:'请补全公式两侧的定界符。'};
  const source = normalized.source;
  if (!source) return {kind:'empty', message:'输入 LaTeX，立即查看符号或公式。'};
  if (/[\u0000-\u0008\u000b\u000c\u000e-\u001f\u007f]/.test(source)) return {kind:'error', message:'源码含有不支持的控制字符。'};
  try {
    let denied = false;
    const html = katex.renderToString(source, {
      displayMode:true, throwOnError:true, maxExpand:1000, maxSize:20,
      strict:'warn', macros:{}, trust:() => { denied = true; return false; }, output:'html'
    });
    if (denied) return {kind:'error', message:'不支持外部链接、外部图片或 HTML 扩展命令。'};
    if (html.length > 2_000_000) return {kind:'error', message:'公式展开后的内容过大，请缩短公式。'};
    const text = new PlainParser(source).parse();
    return text ? {kind:'unicode', text, html, source} : {kind:'formula', html, source};
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error);
    const incomplete = /(?:Unexpected end|Expected.*(?:EOF|end of input)|at end of input)/i.test(message) || /\\$/.test(source);
    return {kind: incomplete ? 'incomplete' : 'error', message:message.replace(/^KaTeX parse error:\s*/, '')};
  }
}
