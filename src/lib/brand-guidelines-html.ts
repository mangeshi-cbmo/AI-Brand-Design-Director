import { BrandGuidelines } from "@/types/brand";
import { GeneratedLogo } from "@/types/logo";
import { hexToRgb } from "@/config/brand-kit";

/*
 * Standalone brand guidelines document generator.
 *
 * Produces a fully self-contained HTML file (inline CSS, embedded logo
 * image) mirroring the fixed 6-section template. Used for both the
 * "Download HTML" action and the "Download PDF" action (the latter opens
 * the document in a new window and triggers the browser's print-to-PDF).
 */

function esc(text: string): string {
  return text
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;");
}

function slugify(name: string): string {
  return name.toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/^-|-$/g, "") || "brand";
}

export function buildGuidelinesHtml(
  guidelines: BrandGuidelines,
  logo: GeneratedLogo | null,
  options?: { autoPrint?: boolean }
): string {
  const g = guidelines;
  const brand = esc(g.brandName);
  const brandUpper = esc(g.brandName.toUpperCase());
  const headingFont = g.typography.heading.css;
  const bodyFont = g.typography.body.css;
  const mark = logo?.imageUrl
    ? `<img class="mark" src="${logo.imageUrl}" alt="${brand} mark" />`
    : "";
  const markSized = (px: number) =>
    logo?.imageUrl
      ? `<img src="${logo.imageUrl}" alt="${brand} mark" style="width:${px}px;height:${px}px;object-fit:contain;" />`
      : "";
  const date = new Date().toLocaleDateString([], { year: "numeric", month: "long", day: "numeric" });

  const swatches = g.colors
    .map(
      (c) => `
      <div class="swatch avoid-break">
        <div class="swatch-color" style="background:${esc(c.hex)}"></div>
        <div class="swatch-meta">
          <p class="swatch-name">${esc(c.name)}</p>
          <p class="mono dim">${esc(c.role)}</p>
          <p class="mono">${esc(c.hex.toUpperCase())}</p>
          <p class="mono dim">rgb(${hexToRgb(c.hex)})</p>
          <p class="swatch-usage">${esc(c.usage)}</p>
        </div>
      </div>`
    )
    .join("");

  const typeCards = (
    [
      ["Heading Typeface", g.typography.heading, 700],
      ["Body Typeface", g.typography.body, 400],
    ] as const
  )
    .map(
      ([label, face, weight]) => `
      <div class="card type-card avoid-break">
        <span class="type-aa" style="font-family:${esc(face.css)};font-weight:${weight}">Aa</span>
        <div>
          <p class="mono dim upper">${label}</p>
          <p class="type-family">${esc(face.family)}</p>
          <p class="mono dim">${esc(face.weight)} — ${esc(face.usage)}</p>
          <p class="type-sample" style="font-family:${esc(face.css)}">ABCDEFGHIJKLMNOPQRSTUVWXYZ<br/>abcdefghijklmnopqrstuvwxyz 0123456789</p>
        </div>
      </div>`
    )
    .join("");

  const rules = (items: readonly string[], mark: string, cls: string) =>
    items.map((r) => `<li class="${cls}"><span>${mark}</span>${esc(r)}</li>`).join("");

  return `<!DOCTYPE html>
<html lang="en">
<head>
<meta charset="utf-8" />
<meta name="viewport" content="width=device-width, initial-scale=1" />
<title>${brand} — Brand Guidelines</title>
<style>
  * { margin: 0; padding: 0; box-sizing: border-box; -webkit-print-color-adjust: exact; print-color-adjust: exact; }
  body { font-family: ${bodyFont}; color: #16181d; background: #ffffff; }
  .page { max-width: 820px; margin: 0 auto; padding: 56px 44px; }
  .mono { font-family: Consolas, 'Courier New', monospace; font-size: 10px; letter-spacing: 0.06em; }
  .dim { color: #8a8f98; }
  .upper { text-transform: uppercase; }
  .avoid-break { break-inside: avoid; }

  /* Cover */
  .cover { text-align: center; padding: 56px 24px; border: 1px solid #e6e8ec; border-radius: 18px; }
  .cover .mark { width: 110px; height: 110px; object-fit: contain; }
  .cover h1 { font-family: ${headingFont}; font-size: 34px; letter-spacing: 0.22em; text-transform: uppercase; margin-top: 22px; }
  .cover .slogan { font-style: italic; color: #5c626d; margin-top: 10px; font-size: 14px; }
  .cover .chips { margin-top: 18px; }
  .cover .chips span { display: inline-block; border: 1px solid #d9dce2; border-radius: 7px; padding: 4px 12px; margin: 0 4px; font-size: 10px; letter-spacing: 0.1em; text-transform: uppercase; color: #5c626d; }
  .cover .doc-label { margin-top: 26px; font-size: 10px; letter-spacing: 0.28em; text-transform: uppercase; color: #a1a6af; }

  /* Sections */
  .sec { margin-top: 46px; }
  .sec-head { display: flex; align-items: center; gap: 12px; margin-bottom: 18px; }
  .sec-head .num { font-family: Consolas, monospace; font-size: 11px; color: #a1a6af; }
  .sec-head h2 { font-size: 13px; letter-spacing: 0.2em; text-transform: uppercase; }
  .sec-head .line { flex: 1; height: 1px; background: linear-gradient(to right, #d9dce2, transparent); }

  .story { font-size: 14px; line-height: 1.75; color: #3a3f47; max-width: 640px; }
  .traits { margin-top: 16px; }
  .traits span { display: inline-block; border: 1px solid #e0e2e7; background: #f7f8f9; border-radius: 10px; padding: 6px 14px; margin: 0 6px 6px 0; font-size: 12px; }
  .traits b { font-family: Consolas, monospace; font-size: 9px; color: #a1a6af; font-weight: 400; margin-right: 7px; }

  .card { border: 1px solid #e6e8ec; border-radius: 14px; background: #fbfbfc; }

  /* Lockups */
  .lockups { display: grid; grid-template-columns: 1fr 1fr; gap: 12px; }
  .lockup { border-radius: 14px; display: flex; align-items: center; justify-content: center; gap: 20px; position: relative; min-height: 165px; break-inside: avoid; }
  .lockup.dark { background: #0d0e10; }
  .lockup.light { background: #fafafa; border: 1px solid #e6e8ec; }
  .lockup.full { grid-column: 1 / -1; }
  .lockup .name { font-family: ${headingFont}; font-weight: 700; letter-spacing: 0.2em; text-transform: uppercase; }
  .lockup.dark .name { color: #ffffff; }
  .lockup.light .name { color: #16181d; }
  .lockup .tag { position: absolute; bottom: 9px; left: 13px; font-family: Consolas, monospace; font-size: 8px; letter-spacing: 0.12em; text-transform: uppercase; }
  .lockup.dark .tag { color: #6b7078; }
  .lockup.light .tag { color: #a1a6af; }
  .lockup.stacked { flex-direction: column; gap: 14px; }
  .icon-tile { width: 84px; height: 84px; border: 1px solid #2a2c30; border-radius: 18px; display: flex; align-items: center; justify-content: center; }

  /* Clear space */
  .space-grid { display: grid; grid-template-columns: 1fr 1fr; gap: 12px; }
  .space-card { padding: 26px; display: flex; flex-direction: column; align-items: center; gap: 16px; }
  .dashed-box { border: 1px dashed #b4b9c1; border-radius: 10px; padding: 34px; position: relative; }
  .dashed-box i { position: absolute; font-family: Consolas, monospace; font-style: normal; font-size: 8px; color: #a1a6af; }
  .dashed-box i.t { top: 3px; left: 50%; transform: translateX(-50%); }
  .dashed-box i.b { bottom: 3px; left: 50%; transform: translateX(-50%); }
  .dashed-box i.l { left: 4px; top: 50%; transform: translateY(-50%); }
  .dashed-box i.r { right: 4px; top: 50%; transform: translateY(-50%); }
  .space-note { font-size: 11px; color: #5c626d; text-align: center; line-height: 1.6; max-width: 300px; }
  .min-sizes { display: flex; align-items: flex-end; gap: 26px; }
  .min-sizes figure { display: flex; flex-direction: column; align-items: center; gap: 6px; }
  .min-sizes figcaption { font-family: Consolas, monospace; font-size: 8px; color: #a1a6af; }

  /* Swatches */
  .palette { display: grid; grid-template-columns: repeat(5, 1fr); gap: 10px; }
  .swatch { border: 1px solid #e6e8ec; border-radius: 12px; overflow: hidden; background: #ffffff; }
  .swatch-color { height: 58px; border-bottom: 1px solid #e6e8ec; }
  .swatch-meta { padding: 10px; }
  .swatch-meta p { margin-top: 3px; }
  .swatch-name { font-size: 11px; font-weight: 600; }
  .swatch-usage { font-size: 9px; color: #5c626d; line-height: 1.45; }

  /* Typography */
  .type-grid { display: grid; grid-template-columns: 1fr 1fr; gap: 12px; }
  .type-card { padding: 22px; display: flex; gap: 18px; }
  .type-aa { font-size: 46px; line-height: 1; }
  .type-family { font-size: 14px; font-weight: 600; margin: 3px 0; }
  .type-sample { font-size: 11px; color: #3a3f47; margin-top: 9px; line-height: 1.6; }

  /* Usage rules */
  .usage-grid { display: grid; grid-template-columns: 1fr 1fr; gap: 12px; }
  .usage-col { border-radius: 14px; padding: 20px; break-inside: avoid; }
  .usage-col.do { border: 1px solid #b9e3cd; background: #f2fbf6; }
  .usage-col.dont { border: 1px solid #f2c4cd; background: #fdf3f5; }
  .usage-col h3 { font-family: Consolas, monospace; font-size: 10px; letter-spacing: 0.24em; text-transform: uppercase; margin-bottom: 12px; }
  .usage-col.do h3 { color: #0f7b4d; }
  .usage-col.dont h3 { color: #c2314d; }
  .usage-col ul { list-style: none; }
  .usage-col li { display: flex; gap: 10px; font-size: 12px; line-height: 1.55; color: #3a3f47; margin-bottom: 9px; }
  .usage-col li span { font-weight: 700; }
  .usage-col li.do span { color: #0f9d63; }
  .usage-col li.dont span { color: #e11d48; }

  footer { margin-top: 48px; padding-top: 16px; border-top: 1px solid #e6e8ec; display: flex; justify-content: space-between; font-family: Consolas, monospace; font-size: 9px; color: #a1a6af; letter-spacing: 0.08em; text-transform: uppercase; }

  @page { size: A4; margin: 12mm; }
  @media print {
    .page { padding: 12px 4px; max-width: none; }
    .sec { margin-top: 32px; }
  }
</style>
</head>
<body>
<div class="page">

  <div class="cover avoid-break">
    ${mark}
    <h1>${brandUpper}</h1>
    ${g.slogan ? `<p class="slogan">&ldquo;${esc(g.slogan)}&rdquo;</p>` : ""}
    <div class="chips">
      <span>${esc(g.industry)}</span>
      <span>${esc(g.style.replace(/-/g, " "))}</span>
    </div>
    <p class="doc-label">Brand Guidelines · Identity System</p>
  </div>

  <section class="sec">
    <div class="sec-head"><span class="num">01</span><h2>Brand Overview</h2><span class="line"></span></div>
    <p class="story">${esc(g.story)}</p>
    <div class="traits">
      ${g.personality.map((t, i) => `<span><b>0${i + 1}</b>${esc(t)}</span>`).join("")}
    </div>
  </section>

  <section class="sec">
    <div class="sec-head"><span class="num">02</span><h2>Logo Suite</h2><span class="line"></span></div>
    <div class="lockups">
      <div class="lockup dark full">
        ${markSized(64)}
        <span class="name" style="font-size:24px">${brandUpper}</span>
        <span class="tag">Primary Lockup · Horizontal · 3:1</span>
      </div>
      <div class="lockup dark stacked">
        ${markSized(60)}
        <span class="name" style="font-size:13px">${brandUpper}</span>
        <span class="tag">Stacked · 4:5</span>
      </div>
      <div class="lockup dark">
        <span class="icon-tile">${markSized(52)}</span>
        <span class="tag">Icon Only · App &amp; Favicon · 1:1</span>
      </div>
      <div class="lockup light full">
        ${markSized(54)}
        <span class="name" style="font-size:20px">${brandUpper}</span>
        <span class="tag">On Light Surfaces · 3:1</span>
      </div>
    </div>
  </section>

  <section class="sec">
    <div class="sec-head"><span class="num">03</span><h2>Clear Space &amp; Minimum Size</h2><span class="line"></span></div>
    <div class="space-grid">
      <div class="card space-card avoid-break">
        <div class="dashed-box">
          ${markSized(56)}
          <i class="t">&frac14;&times;</i><i class="b">&frac14;&times;</i><i class="l">&frac14;&times;</i><i class="r">&frac14;&times;</i>
        </div>
        <p class="space-note">Always keep clear space equal to one quarter of the mark's width (&frac14;&times;) free on all sides. No text or graphics may enter this zone.</p>
      </div>
      <div class="card space-card avoid-break">
        <div class="min-sizes">
          <figure>${markSized(56)}<figcaption>56 px</figcaption></figure>
          <figure>${markSized(32)}<figcaption>32 px</figcaption></figure>
        </div>
        <p class="space-note">Minimum reproduction size: 32&nbsp;px on screen, 12&nbsp;mm in print. Below this, use the icon-only variant.</p>
      </div>
    </div>
  </section>

  <section class="sec">
    <div class="sec-head"><span class="num">04</span><h2>Color Palette</h2><span class="line"></span></div>
    <div class="palette">${swatches}</div>
  </section>

  <section class="sec">
    <div class="sec-head"><span class="num">05</span><h2>Typography</h2><span class="line"></span></div>
    <div class="type-grid">${typeCards}</div>
  </section>

  <section class="sec">
    <div class="sec-head"><span class="num">06</span><h2>Usage Rules</h2><span class="line"></span></div>
    <div class="usage-grid">
      <div class="usage-col do"><h3>Do</h3><ul>${rules(g.dos, "&#10003;", "do")}</ul></div>
      <div class="usage-col dont"><h3>Don't</h3><ul>${rules(g.donts, "&#10007;", "dont")}</ul></div>
    </div>
  </section>

  <footer>
    <span>Generated by LogoForge AI · ${esc(date)}</span>
    <span>${brand} Identity System · Template v1</span>
  </footer>

</div>
${options?.autoPrint ? `<script>window.addEventListener("load",function(){setTimeout(function(){window.print();},400);});</script>` : ""}
</body>
</html>`;
}

/** Download the guidelines as a self-contained .html file */
export function downloadGuidelinesHtml(guidelines: BrandGuidelines, logo: GeneratedLogo | null) {
  const html = buildGuidelinesHtml(guidelines, logo);
  const blob = new Blob([html], { type: "text/html;charset=utf-8" });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = `${slugify(guidelines.brandName)}-brand-guidelines.html`;
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  URL.revokeObjectURL(url);
}

/** Open the print-ready document and trigger the browser's Save-as-PDF dialog */
export function downloadGuidelinesPdf(guidelines: BrandGuidelines, logo: GeneratedLogo | null) {
  const html = buildGuidelinesHtml(guidelines, logo, { autoPrint: true });
  const win = window.open("", "_blank");
  if (!win) {
    // Popup blocked — fall back to the HTML download
    downloadGuidelinesHtml(guidelines, logo);
    return;
  }
  win.document.open();
  win.document.write(html);
  win.document.close();
}
