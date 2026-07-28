/* =====================================================================
   portal-media.js, shared media helpers for the portal LMS.
   Handles YouTube / Vimeo / Dropbox / Google Drive / direct files, and
   renders a lesson's body by its type. Used by learning.html (student)
   and authoring.html (admin preview).
   ===================================================================== */
window.PortalMedia = (function () {
  const esc = (s) => String(s == null ? "" : s).replace(/[&<>"']/g,
    c => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" }[c]));

  // --- URL detection ---------------------------------------------------
  function ytId(u) {
    const m = u.match(/(?:youtube\.com\/(?:watch\?v=|embed\/|shorts\/)|youtu\.be\/)([\w-]{6,})/);
    return m ? m[1] : null;
  }
  function vimeoId(u) {
    const m = u.match(/vimeo\.com\/(?:video\/)?(\d+)/);
    return m ? m[1] : null;
  }
  function driveId(u) {
    const m = u.match(/drive\.google\.com\/(?:file\/d\/|open\?id=)([\w-]+)/);
    return m ? m[1] : null;
  }

  // Convert a share link to a directly usable file URL (images/pdf/video).
  function direct(u) {
    if (!u) return u;
    u = u.trim();
    if (u.includes("dropbox.com")) {
      // new scl links: keep host, force raw=1; old /s/ links: use dl. host
      if (u.includes("/scl/")) {
        let x = u.replace(/[?&]dl=\d/, "");
        if (!/[?&]raw=1/.test(x)) x += (x.includes("?") ? "&" : "?") + "raw=1";
        return x;
      }
      return u.replace("www.dropbox.com", "dl.dropboxusercontent.com")
              .replace(/[?&]dl=\d/, "");
    }
    const d = driveId(u);
    if (d) return "https://drive.google.com/uc?export=download&id=" + d;
    return u;
  }

  // Embed src for players (returns null if not an embeddable video host).
  function videoEmbedSrc(u) {
    const y = ytId(u); if (y) return "https://www.youtube.com/embed/" + y;
    const v = vimeoId(u); if (v) return "https://player.vimeo.com/video/" + v;
    const d = driveId(u); if (d) return "https://drive.google.com/file/d/" + d + "/preview";
    return null;
  }
  function pdfEmbedSrc(u) {
    const d = driveId(u); if (d) return "https://drive.google.com/file/d/" + d + "/preview";
    return direct(u);
  }
  const isImageUrl = (u) => /\.(png|jpe?g|gif|webp|svg|avif)(\?|$)/i.test(u || "");

  // --- Blocks ----------------------------------------------------------
  function videoBlock(u) {
    const emb = videoEmbedSrc(u);
    if (emb) return `<div class="video-embed"><iframe src="${esc(emb)}" allowfullscreen loading="lazy"></iframe></div>`;
    return `<video controls preload="metadata" style="width:100%;border-radius:12px;background:#000" src="${esc(direct(u))}"></video>`;
  }
  function pdfBlock(u) {
    const d = pdfEmbedSrc(u);
    return `<div style="height:72vh;border:1px solid var(--line);border-radius:12px;overflow:hidden;background:#f5f8fc">
      <iframe src="${esc(d)}" style="width:100%;height:100%;border:0"></iframe></div>
      <p style="margin-top:10px"><a class="btn outline" href="${esc(direct(u))}" target="_blank" rel="noopener">Open / download PDF ↗</a></p>`;
  }
  function imageBlock(u) {
    return `<img src="${esc(direct(u))}" alt="" style="max-width:100%;border-radius:12px;border:1px solid var(--line)">`;
  }
  function downloadBlock(u, label) {
    return `<p><a class="btn" href="${esc(direct(u))}" target="_blank" rel="noopener" download>⬇ ${esc(label || "Download file")}</a></p>`;
  }
  function placeholder(kind, admin) {
    const hint = admin ? ", add it from the builder." : ", coming soon.";
    return `<div style="background:var(--navy-50);border:1px dashed var(--navy-100);border-radius:12px;padding:36px 20px;text-align:center;color:var(--navy);font-weight:600">${esc(kind)} not added yet${hint}</div>`;
  }

  // --- Full lesson render ---------------------------------------------
  // l: lesson row. opts.admin: boolean (affects placeholders only).
  function render(l, opts) {
    opts = opts || {};
    const t = (l.lesson_type || "text").toLowerCase();
    const v = l.video_url, f = l.file_url, ext = l.external_url, c = l.content;
    let h = "";

    if (t === "video") {
      h += v ? videoBlock(v) : placeholder("🎬 Video", opts.admin);
    } else if (t === "image") {
      const src = f || v;
      h += src ? imageBlock(src) : placeholder("🖼 Image", opts.admin);
    } else if (t === "pdf") {
      const src = f || ext;
      h += src ? pdfBlock(src) : placeholder("📄 PDF", opts.admin);
    } else if (t === "download") {
      const src = f || ext;
      h += src ? downloadBlock(src, l.title) : placeholder("⬇ File", opts.admin);
    } else if (t === "embed") {
      h += c ? `<div class="embed-wrap">${c}</div>` : placeholder("Embed", opts.admin);
    }
    // caption / instructions
    if (l.caption) h += `<p style="color:var(--muted);margin-top:12px">${esc(l.caption)}</p>`;
    // main text body (rendered as HTML for text/embed; admins author it)
    if (c && t !== "embed") h += `<div class="lesson-text" style="margin-top:14px">${c}</div>`;
    // supplementary file (e.g. a slide PDF attached to a video lesson)
    if (f && !["image", "pdf", "download"].includes(t)) h += `<div style="margin-top:16px">${downloadBlock(f, "Attached file")}</div>`;
    // external link (e.g. Thinkific)
    if (ext && t !== "pdf" && t !== "download")
      h += `<p style="margin-top:18px"><a class="btn outline" href="${esc(ext)}" target="_blank" rel="noopener">Open link ↗</a></p>`;
    if (!h) h = placeholder("Content", opts.admin);
    return h;
  }

  const TYPES = ["video", "image", "pdf", "text", "download", "embed", "quiz", "assignment", "survey", "multimedia", "live"];
  const BADGE = {
    video: ["🎬", "#e6f4f4", "#0c7373"], pdf: ["📄", "#fbf4e6", "#c8932f"],
    image: ["🖼", "#e6f4f4", "#0c7373"], download: ["⬇", "#fbf4e6", "#c8932f"],
    quiz: ["❓", "#eef3f9", "#143a66"], survey: ["🗳", "#eef3f9", "#143a66"],
    assignment: ["📝", "#e6f4f4", "#0c7373"], multimedia: ["🧩", "#eef3f9", "#143a66"],
    live: ["🔴", "#fdecec", "#8a1f1f"], text: ["📖", "#f5f8fc", "#54616e"],
    embed: ["🔗", "#f5f8fc", "#54616e"]
  };
  function badge(t) {
    if (!t) return "";
    const m = BADGE[t] || ["•", "#f5f8fc", "#54616e"];
    return `<span style="display:inline-block;font-size:11px;font-weight:600;padding:1px 8px;border-radius:999px;margin-right:8px;background:${m[1]};color:${m[2]}">${m[0]} ${esc(t)}</span>`;
  }

  return { esc, direct, videoEmbedSrc, isImageUrl, render, badge, TYPES };
})();
